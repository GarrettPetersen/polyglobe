import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";

import { fetchChunkedBinary, fetchChunkedJson } from "./chunkedBinaryFetch.js";

test("chunked binary fetch starts every chunk concurrently and assembles manifest order", async () => {
  const requests = [];
  const pendingChunks = new Map();
  const fetchAsset = async (resource) => {
    requests.push(resource);
    if (resource === "shared/weather.bin.chunks.json") {
      return jsonResponse({
        byteLength: 6,
        chunks: [
          chunkSpec("weather.part-0.bin", [1, 2]),
          chunkSpec("weather.part-1.bin", [3, 4, 5]),
          chunkSpec("weather.part-2.bin", [6])
        ]
      });
    }
    return new Promise((resolve) => pendingChunks.set(resource, resolve));
  };

  const resultPromise = fetchChunkedBinary("shared/weather.bin", "weather", {
    fetchAsset,
    baseUrl: "https://example.test/game/"
  });
  await nextTurn();

  const chunkUrls = [
    "https://example.test/game/shared/weather.part-0.bin",
    "https://example.test/game/shared/weather.part-1.bin",
    "https://example.test/game/shared/weather.part-2.bin"
  ];
  assert.deepEqual(requests, ["shared/weather.bin.chunks.json", ...chunkUrls]);

  pendingChunks.get(chunkUrls[2])(binaryResponse([6]));
  pendingChunks.get(chunkUrls[0])(binaryResponse([1, 2]));
  pendingChunks.get(chunkUrls[1])(binaryResponse([3, 4, 5]));

  const result = new Uint8Array(await resultPromise);
  assert.deepEqual([...result], [1, 2, 3, 4, 5, 6]);
});

test("chunked binary fetch inserts the manifest suffix before a version query", async () => {
  const requests = [];
  const fetchAsset = async (resource) => {
    requests.push(resource);
    if (resource === "shared/weather.bin.chunks.json?v=snow-1") {
      return jsonResponse({
        byteLength: 2,
        chunks: [chunkSpec("weather.bin.part000", [7, 8])]
      });
    }
    return binaryResponse([7, 8]);
  };

  const result = await fetchChunkedBinary("shared/weather.bin?v=snow-1", "weather", {
    fetchAsset,
    baseUrl: "https://example.test/game/"
  });

  assert.deepEqual([...new Uint8Array(result)], [7, 8]);
  assert.deepEqual(requests, [
    "shared/weather.bin.chunks.json?v=snow-1",
    "https://example.test/game/shared/weather.bin.part000?v=snow-1"
  ]);
});

test("chunked binary fetch bounds concurrent downloads", async () => {
  const pendingChunks = [];
  const thirdRequest = Promise.withResolvers();
  const fourthRequest = Promise.withResolvers();
  let requestCount = 0;
  let active = 0;
  let peakActive = 0;
  const fetchAsset = async (resource) => {
    if (resource === "asset.bin.chunks.json") {
      return jsonResponse({
        byteLength: 4,
        chunks: Array.from({ length: 4 }, (_, index) => chunkSpec(`asset.part-${index}.bin`, [1]))
      });
    }
    active++;
    requestCount++;
    peakActive = Math.max(peakActive, active);
    return new Promise((resolve) => {
      pendingChunks.push(() => {
        active--;
        resolve(binaryResponse([1]));
      });
      if (requestCount === 3) thirdRequest.resolve();
      if (requestCount === 4) fourthRequest.resolve();
    });
  };

  const resultPromise = fetchChunkedBinary("asset.bin", "asset", {
    fetchAsset,
    baseUrl: "https://example.test/",
    chunkConcurrency: 2
  });
  await nextTurn();
  assert.equal(pendingChunks.length, 2);
  pendingChunks.shift()();
  await thirdRequest.promise;
  assert.equal(pendingChunks.length, 2);
  pendingChunks.shift()();
  await fourthRequest.promise;
  pendingChunks.shift()();
  pendingChunks.shift()();

  await resultPromise;
  assert.equal(peakActive, 2);
});

test("chunked binary fetch retries a truncated successful response", async () => {
  const requests = [];
  const fetchAsset = async (resource) => {
    requests.push(resource);
    if (resource === "asset.bin.chunks.json") {
      return jsonResponse({
        byteLength: 3,
        chunks: [chunkSpec("asset.part-0.bin", [1, 2, 3])]
      });
    }
    return binaryResponse(requests.length === 2 ? [1, 2] : [1, 2, 3]);
  };

  const result = await fetchChunkedBinary("asset.bin", "asset", {
    fetchAsset,
    baseUrl: "https://example.test/",
    chunkRetryDelayMs: 0,
    sleep: async () => {}
  });

  assert.deepEqual([...new Uint8Array(result)], [1, 2, 3]);
  assert.deepEqual(requests, [
    "asset.bin.chunks.json",
    "https://example.test/asset.part-0.bin",
    "https://example.test/asset.part-0.bin?chunk_retry=1"
  ]);
});

test("chunked binary fetch retries a response whose body stream cannot be read", async () => {
  const requests = [];
  const fetchAsset = async (resource) => {
    requests.push(resource);
    if (resource === "asset.bin.chunks.json") {
      return jsonResponse({
        byteLength: 3,
        chunks: [chunkSpec("asset.part-0.bin", [1, 2, 3])]
      });
    }
    if (requests.length < 4) {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => { throw new TypeError("network stream closed"); }
      };
    }
    return binaryResponse([1, 2, 3]);
  };

  const result = await fetchChunkedBinary("asset.bin", "asset", {
    fetchAsset,
    baseUrl: "https://example.test/",
    chunkRetryDelayMs: 0,
    sleep: async () => {}
  });

  assert.deepEqual([...new Uint8Array(result)], [1, 2, 3]);
  assert.deepEqual(requests, [
    "asset.bin.chunks.json",
    "https://example.test/asset.part-0.bin",
    "https://example.test/asset.part-0.bin?chunk_retry=1",
    "https://example.test/asset.part-0.bin?chunk_retry=2"
  ]);
});

test("chunked binary fetch reports persistent truncation after bounded retries", async () => {
  const fetchAsset = async (resource) => {
    if (resource === "asset.bin.chunks.json") {
      return jsonResponse({
        byteLength: 3,
        chunks: [chunkSpec("asset.part-0.bin", [1, 2, 3])]
      });
    }
    return binaryResponse([1]);
  };

  await assert.rejects(
    fetchChunkedBinary("asset.bin", "asset", {
      fetchAsset,
      baseUrl: "https://example.test/",
      chunkAttempts: 2,
      chunkRetryDelayMs: 0,
      sleep: async () => {}
    }),
    /Malformed asset chunk 0 after 2 attempts: expected 3 bytes, got 1/
  );
});

test("chunked binary fetch rejects inconsistent manifest totals before downloading chunks", async () => {
  const requests = [];
  const fetchAsset = async (resource) => {
    requests.push(resource);
    return jsonResponse({
      byteLength: 5,
      chunks: [
        chunkSpec("asset.part-0.bin", [1, 2]),
        chunkSpec("asset.part-1.bin", [3, 4])
      ]
    });
  };

  await assert.rejects(
    fetchChunkedBinary("asset.bin", "asset", {
      fetchAsset,
      baseUrl: "https://example.test/"
    }),
    /chunk bytes total 4, expected 5/
  );
  assert.deepEqual(requests, ["asset.bin.chunks.json"]);
});

test("chunked binary fetch returns null when no JSON manifest is deployed", async () => {
  const missing = await fetchChunkedBinary("asset.bin", "asset", {
    fetchAsset: async () => new Response("", { status: 404 }),
    baseUrl: "https://example.test/"
  });
  assert.equal(missing, null);

  const htmlFallback = await fetchChunkedBinary("asset.bin", "asset", {
    fetchAsset: async () => new Response("<html></html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    }),
    baseUrl: "https://example.test/"
  });
  assert.equal(htmlFallback, null);
});

test("chunked JSON fetch reconstructs and parses a UTF-8 asset", async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ subdivisions: 8, sea: "Océano" }));
  const split = 21;
  const fetchAsset = async (resource) => {
    if (resource === "shared/earth.json.chunks.json") {
      return jsonResponse({
        byteLength: encoded.byteLength,
        chunks: [
          chunkSpec("earth.json.part000", encoded.subarray(0, split)),
          chunkSpec("earth.json.part001", encoded.subarray(split))
        ]
      });
    }
    if (resource.endsWith("earth.json.part000")) return binaryResponse(encoded.subarray(0, split));
    if (resource.endsWith("earth.json.part001")) return binaryResponse(encoded.subarray(split));
    throw new Error(`Unexpected chunked JSON request: ${resource}`);
  };

  const value = await fetchChunkedJson("shared/earth.json", "Earth cache", {
    fetchAsset,
    baseUrl: "https://example.test/game/"
  });

  assert.deepEqual(value, { subdivisions: 8, sea: "Océano" });
});

test("chunked JSON fetch reports invalid reconstructed JSON with its asset label", async () => {
  await assert.rejects(
    fetchChunkedJson("shared/earth.json", "Earth cache", {
      fetchAsset: async (resource) => resource.endsWith(".chunks.json")
        ? jsonResponse({ byteLength: 6, chunks: [chunkSpec("earth.part000", new TextEncoder().encode("<html>"))] })
        : binaryResponse(new TextEncoder().encode("<html>")),
      baseUrl: "https://example.test/game/"
    }),
    /Malformed Earth cache chunked JSON/
  );
});

function jsonResponse(value) {
  return new Response(JSON.stringify({ version: 1, ...value }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function chunkSpec(path, bytes) {
  return { path, byteLength: bytes.length, sha256: createHash("sha256").update(Uint8Array.from(bytes)).digest("hex") };
}

function binaryResponse(bytes) {
  return new Response(Uint8Array.from(bytes), { status: 200 });
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("chunk integrity retries same-length corruption before JSON parsing, including valid but wrong JSON", async () => {
  const bytes = new TextEncoder().encode('{"e":-0}');
  for (const damaged of ['{"e":er}', '{"e":10}']) {
    const requests = [];
    const result = await fetchChunkedJson("earth.json", "Earth cache", {
      baseUrl: "https://example.test/",
      sleep: async () => {},
      fetchAsset: async resource => {
        requests.push(resource);
        if (resource.endsWith(".chunks.json")) return jsonResponse({
          byteLength: bytes.length, chunks: [chunkSpec("earth.part000", bytes)]
        });
        return binaryResponse(requests.length === 2 ? new TextEncoder().encode(damaged) : bytes);
      }
    });
    assert.equal(result.e, -0);
    assert.equal(requests.length, 3);
    assert.match(requests[2], /chunk_retry=1/);
  }
});

test("chunk integrity rejects persistent same-length corruption after bounded attempts", async () => {
  let attempts = 0;
  await assert.rejects(fetchChunkedBinary("asset.bin", "asset", {
    baseUrl: "https://example.test/", chunkAttempts: 2, sleep: async () => {},
    fetchAsset: async resource => {
      if (resource.endsWith(".chunks.json")) return jsonResponse({
        byteLength: 3, chunks: [chunkSpec("asset.part000", [1, 2, 3])]
      });
      attempts++;
      return binaryResponse([1, 2, 4]);
    }
  }), /after 2 attempts: SHA-256 mismatch/);
  assert.equal(attempts, 2);
});

test("chunk integrity rejects missing or malformed hashes before downloading", async () => {
  for (const sha256 of [undefined, "", "abcd", "g".repeat(64)]) {
    let requests = 0;
    await assert.rejects(fetchChunkedBinary("asset.bin", "asset", {
      baseUrl: "https://example.test/",
      fetchAsset: async () => {
        requests++;
        return jsonResponse({ byteLength: 1, chunks: [{ path: "asset.part000", byteLength: 1, sha256 }] });
      }
    }), /Malformed asset chunk manifest entry 0/);
    assert.equal(requests, 1);
  }
});

test("chunk integrity rejects unversioned manifests instead of silently skipping verification", async () => {
  await assert.rejects(fetchChunkedBinary("asset.bin", "asset", {
    baseUrl: "https://example.test/",
    fetchAsset: async () => jsonResponse({ version: undefined, byteLength: 1, chunks: [chunkSpec("asset.part000", [1])] })
  }), /unsupported version/);
});
