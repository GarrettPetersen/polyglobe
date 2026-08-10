import assert from "node:assert/strict";
import test from "node:test";

import {
  StaticAssetNetworkError,
  fetchStaticAsset,
  isTransientStaticAssetError
} from "./staticAssetFetch.js";

function response(status) {
  return {
    ok: status >= 200 && status < 300,
    status
  };
}

test("static asset fetch retries transient network failures", async () => {
  let calls = 0;
  const loaded = await fetchStaticAsset("/weather.bin.chunks.json", {
    label: "weather chunk manifest",
    fetchImpl: async () => {
      calls++;
      if (calls === 1) throw new TypeError("Failed to fetch");
      return response(200);
    },
    retryDelayMs: 0
  });

  assert.equal(loaded.status, 200);
  assert.equal(calls, 2);
});

test("static asset fetch preserves an intentional 404 without retrying", async () => {
  let calls = 0;
  const loaded = await fetchStaticAsset("/weather.bin.chunks.json", {
    label: "weather chunk manifest",
    fetchImpl: async () => {
      calls++;
      return response(404);
    },
    retryDelayMs: 0
  });

  assert.equal(loaded.status, 404);
  assert.equal(calls, 1);
});

test("static asset fetch retries temporary HTTP failures", async () => {
  let calls = 0;
  const loaded = await fetchStaticAsset("/weather.bin", {
    label: "weather bake",
    fetchImpl: async () => {
      calls++;
      return response(calls < 3 ? 503 : 200);
    },
    retryDelayMs: 0
  });

  assert.equal(loaded.status, 200);
  assert.equal(calls, 3);
});

test("static asset fetch reports the failed asset after exhausting retries", async () => {
  await assert.rejects(
    fetchStaticAsset("/weather.bin.chunks.json", {
      label: "globe runtime bake chunk manifest",
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
      attempts: 2,
      retryDelayMs: 0
    }),
    /Failed to load globe runtime bake chunk manifest after 2 attempts: Failed to fetch/
  );
});

test("exhausted network and server failures remain identifiable through wrapped causes", async () => {
  const networkError = await fetchStaticAsset("/ship.bin", {
    label: "ship bundle",
    fetchImpl: async () => { throw new TypeError("Failed to fetch"); },
    attempts: 1,
    retryDelayMs: 0
  }).catch((error) => error);
  assert.ok(networkError instanceof StaticAssetNetworkError);
  assert.equal(isTransientStaticAssetError(new Error("wrapped", { cause: networkError })), true);

  const serverError = await fetchStaticAsset("/ship.bin", {
    label: "ship bundle",
    fetchImpl: async () => response(503),
    attempts: 1,
    retryDelayMs: 0
  }).catch((error) => error);
  assert.ok(serverError instanceof StaticAssetNetworkError);
  assert.equal(serverError.status, 503);
});
