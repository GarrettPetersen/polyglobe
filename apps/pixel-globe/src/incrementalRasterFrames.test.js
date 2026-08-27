import assert from "node:assert/strict";
import test from "node:test";

import {
  createIncrementalRasterFrameCache,
  requestIncrementalRasterFrame
} from "./incrementalRasterFrames.js";

test("large raster frames build incrementally and reuse the nearest completed frame", () => {
  const emptyFrame = { frameIndex: -1 };
  const cache = createIncrementalRasterFrameCache({ frameCount: 4, emptyFrame });
  let clockMs = 0;
  const request = (frameIndex) => requestIncrementalRasterFrame(cache, frameIndex, {
    budgetMs: 2,
    createBuild: (index) => ({ index, remaining: 5 }),
    advanceBuild: (build) => {
      build.remaining -= 1;
      clockMs += 1;
      return build.remaining === 0;
    },
    completeBuild: (build) => ({ frameIndex: build.index }),
    now: () => clockMs
  });

  assert.equal(request(0), emptyFrame);
  assert.equal(request(1), emptyFrame);
  assert.deepEqual(request(1), { frameIndex: 0 });
  assert.deepEqual(request(2), { frameIndex: 0 });
  assert.deepEqual(request(2), { frameIndex: 0 });
  assert.deepEqual(request(2), { frameIndex: 2 });
});

test("completed incremental frames are returned without rebuilding them", () => {
  const cache = createIncrementalRasterFrameCache({
    frameCount: 2,
    emptyFrame: { frameIndex: -1 }
  });
  let builds = 0;
  const options = {
    budgetMs: 1,
    createBuild: (index) => {
      builds += 1;
      return { index };
    },
    advanceBuild: () => true,
    completeBuild: (build) => ({ frameIndex: build.index }),
    now: () => 0
  };

  assert.deepEqual(requestIncrementalRasterFrame(cache, 0, options), { frameIndex: 0 });
  assert.deepEqual(requestIncrementalRasterFrame(cache, 0, options), { frameIndex: 0 });
  assert.equal(builds, 2, "the idle budget should warm the remaining animation frame");
  assert.equal(cache.frames.size, 2);
});

test("expensive shared frame setup is charged to the incremental budget", () => {
  const emptyFrame = { frameIndex: -1 };
  const cache = createIncrementalRasterFrameCache({ frameCount: 2, emptyFrame });
  let clockMs = 0;
  let advances = 0;
  const options = {
    budgetMs: 2,
    createBuild: (index) => {
      clockMs += 3;
      return { index };
    },
    advanceBuild: () => {
      advances += 1;
      return true;
    },
    completeBuild: (build) => ({ frameIndex: build.index }),
    now: () => clockMs
  };

  assert.equal(requestIncrementalRasterFrame(cache, 0, options), emptyFrame);
  assert.equal(advances, 0, "setup exhausted the frame budget before raster work began");
  assert.deepEqual(requestIncrementalRasterFrame(cache, 0, options), { frameIndex: 0 });
  assert.equal(advances, 1);
});
