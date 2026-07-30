import assert from "node:assert/strict";
import test from "node:test";

import { fetchChunkedBinary } from "./chunkedBinaryFetch.js";

test("chunked binary fetch starts every chunk concurrently and assembles manifest order", async () => {
  const requests = [];
  const pendingChunks = new Map();
  const fetchAsset = async (resource) => {
    requests.push(resource);
    if (resource === "shared/weather.bin.chunks.json") {
      return jsonResponse({
        byteLength: 6,
        chunks: [
          { path: "weather.part-0.bin", byteLength: 2 },
          { path: "weather.part-1.bin", byteLength: 3 },
          { path: "weather.part-2.bin", byteLength: 1 }
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

test("chunked binary fetch bounds concurrent downloads", async () => {
  const pendingChunks = [];
  let active = 0;
  let peakActive = 0;
  const fetchAsset = async (resource) => {
    if (resource === "asset.bin.chunks.json") {
      return jsonResponse({
        byteLength: 4,
        chunks: Array.from({ length: 4 }, (_, index) => ({
          path: `asset.part-${index}.bin`,
          byteLength: 1
        }))
      });
    }
    active++;
    peakActive = Math.max(peakActive, active);
    return new Promise((resolve) => pendingChunks.push(() => {
      active--;
      resolve(binaryResponse([pendingChunks.length]));
    }));
  };

  const resultPromise = fetchChunkedBinary("asset.bin", "asset", {
    fetchAsset,
    baseUrl: "https://example.test/",
    chunkConcurrency: 2
  });
  await nextTurn();
  assert.equal(pendingChunks.length, 2);
  pendingChunks.shift()();
  await nextTurn();
  assert.equal(pendingChunks.length, 2);
  pendingChunks.shift()();
  await nextTurn();
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
        chunks: [{ path: "asset.part-0.bin", byteLength: 3 }]
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

test("chunked binary fetch reports persistent truncation after bounded retries", async () => {
  const fetchAsset = async (resource) => {
    if (resource === "asset.bin.chunks.json") {
      return jsonResponse({
        byteLength: 3,
        chunks: [{ path: "asset.part-0.bin", byteLength: 3 }]
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
        { path: "asset.part-0.bin", byteLength: 2 },
        { path: "asset.part-1.bin", byteLength: 2 }
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

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function binaryResponse(bytes) {
  return new Response(Uint8Array.from(bytes), { status: 200 });
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}
