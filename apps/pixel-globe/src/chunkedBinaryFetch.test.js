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
