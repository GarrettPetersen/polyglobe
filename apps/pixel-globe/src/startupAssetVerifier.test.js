import assert from "node:assert/strict";
import test from "node:test";

import { verifyRemoteStartupAssets } from "../tools/startupAssetVerifier.mjs";

test("deployment verification reconstructs the startup Earth cache through its chunk manifest", async () => {
  const earth = JSON.stringify({
    subdivisions: 0,
    tileCount: 12,
    tiles: Array.from({ length: 12 }, (_, tileId) => ({ tileId }))
  });
  const bytes = new TextEncoder().encode(earth);
  const split = Math.floor(bytes.length / 2);
  const fetchAsset = async (resource) => {
    const url = new URL(resource);
    if (url.pathname.endsWith("earth-globe-cache-0.json.chunks.json")) {
      return jsonResponse({
        byteLength: bytes.length,
        chunks: [
          { path: "earth-globe-cache-0.json.part000", byteLength: split },
          { path: "earth-globe-cache-0.json.part001", byteLength: bytes.length - split }
        ]
      });
    }
    if (url.pathname.endsWith("part000")) return binaryResponse(bytes.subarray(0, split));
    if (url.pathname.endsWith("part001")) return binaryResponse(bytes.subarray(split));
    throw new Error(`Unexpected startup asset request: ${resource}`);
  };

  assert.deepEqual(
    await verifyRemoteStartupAssets({
      baseUrl: "https://example.test/game/",
      subdivisions: 0,
      fetchAsset
    }),
    { earthTileCount: 12 }
  );
});

test("deployment verification rejects an HTML fallback where a startup manifest must exist", async () => {
  await assert.rejects(
    verifyRemoteStartupAssets({
      baseUrl: "https://example.test/game/",
      subdivisions: 8,
      fetchAsset: async () => new Response("<!doctype html>", {
        status: 200,
        headers: { "content-type": "text/html" }
      })
    }),
    /has no JSON chunk manifest/
  );
});

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function binaryResponse(bytes) {
  return new Response(bytes, { status: 200 });
}
