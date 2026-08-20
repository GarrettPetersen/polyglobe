import assert from "node:assert/strict";
import test from "node:test";
import {
  STREAMED_IMAGE_RETRY_DELAYS_MS,
  loadImageWithRetry
} from "./assetImageLoader.js";

test("streamed images retain a longer retry window than startup assets", () => {
  assert.deepEqual(STREAMED_IMAGE_RETRY_DELAYS_MS, [250, 750, 1500, 3000, 6000]);
});

test("image loading retries a temporary failure with a fresh request", async () => {
  const requestedSources = [];
  const beforeRetryAttempts = [];
  const image = await loadImageWithRetry({
    src: "assets/vehicles/carrack.png?v=1",
    label: "vehicle image: carrack",
    createImage: createFakeImageFactory({ failures: 1, requestedSources }),
    retryDelaysMs: [250, 1000],
    beforeRetry: async ({ attempt }) => beforeRetryAttempts.push(attempt),
    sleep: async () => {}
  });

  assert.equal(image.loaded, true);
  assert.deepEqual(beforeRetryAttempts, [1]);
  assert.deepEqual(requestedSources, [
    "assets/vehicles/carrack.png?v=1",
    "assets/vehicles/carrack.png?v=1&retry=1"
  ]);
});

test("image loading reports a persistent failure only after all retries", async () => {
  const requestedSources = [];
  await assert.rejects(
    loadImageWithRetry({
      src: "/missing.png",
      label: "missing image",
      createImage: createFakeImageFactory({ failures: Infinity, requestedSources }),
      retryDelaysMs: [0, 0],
      sleep: async () => {}
    }),
    /Failed to load missing image after 3 attempts/
  );
  assert.deepEqual(requestedSources, [
    "/missing.png",
    "/missing.png?retry=1",
    "/missing.png?retry=2"
  ]);
});

function createFakeImageFactory({ failures, requestedSources }) {
  let attempts = 0;
  return () => {
    const image = { loaded: false, onload: null, onerror: null };
    Object.defineProperty(image, "src", {
      set(value) {
        requestedSources.push(value);
        attempts += 1;
        queueMicrotask(() => {
          if (attempts <= failures) image.onerror?.();
          else {
            image.loaded = true;
            image.onload?.();
          }
        });
      }
    });
    return image;
  };
}
