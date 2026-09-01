import assert from "node:assert/strict";
import test from "node:test";
import { createCachedSceneRenderer } from "./cachedSceneRenderer.js";

test("cached scene renderer rebuilds static runs only when their cache key changes", () => {
  const displayDraws = [];
  const entryDraws = [];
  const surfaces = [];
  const renderer = createCachedSceneRenderer({
    displayContext: fakeContext("display", displayDraws),
    createSurface: (width, height) => {
      const surface = {
        width,
        height,
        context: fakeContext(`surface-${surfaces.length}`, entryDraws),
        getContext(kind) {
          assert.equal(kind, "2d");
          return this.context;
        }
      };
      surfaces.push(surface);
      return surface;
    },
    drawEntry: (entry, timeMs, context) => {
      entryDraws.push(`${context.id}:${entry.id}:${timeMs}`);
    },
    isStaticEntry: (entry) => entry.static
  });
  renderer.setEntries([
    { id: "sky", kind: "layer", static: true },
    { id: "mountains", kind: "layer", static: true },
    { id: "cloud", kind: "cloud", static: false },
    { id: "quay", kind: "layer", static: true }
  ]);

  renderer.renderFrame({ timeMs: 10, width: 455, height: 256, staticCacheKey: "view-a" });
  renderer.renderFrame({ timeMs: 20, width: 455, height: 256, staticCacheKey: "view-a" });
  renderer.renderFrame({ timeMs: 30, width: 455, height: 256, staticCacheKey: "view-b" });

  assert.equal(surfaces.length, 2);
  assert.deepEqual(entryDraws, [
    "surface-0:sky:10",
    "surface-0:mountains:10",
    "display:cloud:10",
    "surface-1:quay:10",
    "display:cloud:20",
    "surface-0:sky:30",
    "surface-0:mountains:30",
    "display:cloud:30",
    "surface-1:quay:30"
  ]);
  assert.equal(displayDraws.length, 6);
  assert.deepEqual(renderer.stats(), {
    entries: 4,
    staticEntries: 3,
    dynamicEntries: 1,
    staticBatches: 2,
    kinds: { layer: 3, cloud: 1 },
    staticCacheBuilds: 4,
    staticCacheHits: 2,
    staticBatchStats: [
      {
        id: "static-batch-0",
        entries: 2,
        kinds: ["layer", "layer"],
        cacheBuilds: 2,
        cacheHits: 1
      },
      {
        id: "static-batch-1",
        entries: 1,
        kinds: ["layer"],
        cacheBuilds: 2,
        cacheHits: 1
      }
    ]
  });
});

test("cached scene renderer fails loudly on malformed frame contracts", () => {
  const renderer = createCachedSceneRenderer({
    displayContext: fakeContext("display", []),
    createSurface: () => ({
      width: 1,
      height: 1,
      getContext: () => fakeContext("surface", [])
    }),
    drawEntry: () => {},
    isStaticEntry: () => false
  });
  assert.throws(() => renderer.setEntries([{}]), /invalid render entry/);
  renderer.setEntries([]);
  assert.throws(
    () => renderer.renderFrame({ timeMs: 0, width: 0, height: 1, staticCacheKey: "view" }),
    /invalid width/
  );
  assert.throws(
    () => renderer.renderFrame({ timeMs: 0, width: 1, height: 1, staticCacheKey: "" }),
    /non-empty static cache key/
  );
});

function fakeContext(id, drawCalls) {
  return {
    id,
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage(...args) {
      drawCalls.push({ id, args });
    }
  };
}
