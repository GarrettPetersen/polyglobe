export function createIncrementalRasterFrameCache({ frameCount, emptyFrame }) {
  if (!Number.isInteger(frameCount) || frameCount <= 0 || !emptyFrame) {
    throw new Error("Incremental raster frame cache requires frames and an empty frame");
  }
  return {
    frameCount,
    emptyFrame,
    frames: new Map(),
    pending: null
  };
}

export function requestIncrementalRasterFrame(cache, frameIndex, {
  budgetMs,
  createBuild,
  advanceBuild,
  completeBuild,
  now = () => performance.now()
}) {
  validateRequest(cache, frameIndex, budgetMs, createBuild, advanceBuild, completeBuild, now);
  const startedAtMs = now();
  if (!cache.pending && cache.frames.size < cache.frameCount) {
    const buildFrameIndex = cache.frames.has(frameIndex)
      ? firstMissingFrameIndex(cache, frameIndex)
      : frameIndex;
    cache.pending = {
      frameIndex: buildFrameIndex,
      build: createBuild(buildFrameIndex)
    };
  }

  if (cache.pending && now() - startedAtMs < budgetMs) {
    let complete = false;
    do {
      complete = advanceBuild(cache.pending.build);
    } while (!complete && now() - startedAtMs < budgetMs);
    if (complete) {
      const pending = cache.pending;
      cache.frames.set(
        pending.frameIndex,
        completeBuild(pending.build, pending.frameIndex)
      );
      cache.pending = null;
    }
  }

  return cache.frames.get(frameIndex) ||
    nearestCompletedFrame(cache, frameIndex) ||
    cache.emptyFrame;
}

function firstMissingFrameIndex(cache, startFrameIndex) {
  for (let offset = 1; offset <= cache.frameCount; offset++) {
    const frameIndex = (startFrameIndex + offset) % cache.frameCount;
    if (!cache.frames.has(frameIndex)) return frameIndex;
  }
  throw new Error("Incremental raster frame cache has no missing frame");
}

function nearestCompletedFrame(cache, targetFrameIndex) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const [frameIndex, frame] of cache.frames) {
    const directDistance = Math.abs(frameIndex - targetFrameIndex);
    const distance = Math.min(directDistance, cache.frameCount - directDistance);
    if (distance >= nearestDistance) continue;
    nearest = frame;
    nearestDistance = distance;
  }
  return nearest;
}

function validateRequest(
  cache,
  frameIndex,
  budgetMs,
  createBuild,
  advanceBuild,
  completeBuild,
  now
) {
  if (!cache || !(cache.frames instanceof Map) || !Number.isInteger(cache.frameCount)) {
    throw new Error("Incremental raster frame request requires a frame cache");
  }
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= cache.frameCount) {
    throw new Error(`Incremental raster frame index is invalid: ${frameIndex}`);
  }
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new Error(`Incremental raster frame budget is invalid: ${budgetMs}`);
  }
  if ([createBuild, advanceBuild, completeBuild, now].some((value) => typeof value !== "function")) {
    throw new Error("Incremental raster frame request requires build callbacks");
  }
}
