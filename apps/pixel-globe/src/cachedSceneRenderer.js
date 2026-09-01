export function createCachedSceneRenderer({
  displayContext,
  createSurface,
  drawEntry,
  isStaticEntry,
  staticContextAttributes = (_entries) => undefined
}) {
  requireFunction(createSurface, "surface factory");
  requireFunction(drawEntry, "entry renderer");
  requireFunction(isStaticEntry, "static-entry predicate");
  requireFunction(staticContextAttributes, "static-context attribute resolver");
  requireContext(displayContext, "display context");

  let plan = Object.freeze([]);
  let workload = emptyWorkload();
  let staticCacheBuilds = 0;
  let staticCacheHits = 0;

  function setEntries(entries) {
    if (!Array.isArray(entries)) throw new Error("Cached scene renderer requires render entries");
    const kindCounts = {};
    let staticEntries = 0;
    let dynamicEntries = 0;
    let staticBatchIndex = 0;
    const nextPlan = [];
    let pendingStaticEntries = [];

    const flushStaticBatch = () => {
      if (pendingStaticEntries.length === 0) return;
      nextPlan.push({
        kind: "static-batch",
        id: `static-batch-${staticBatchIndex++}`,
        entries: Object.freeze(pendingStaticEntries),
        surface: null,
        context: null,
        cacheKey: null,
        cacheBuilds: 0,
        cacheHits: 0
      });
      pendingStaticEntries = [];
    };

    for (const entry of entries) {
      if (!entry || typeof entry.kind !== "string" || entry.kind === "") {
        throw new Error("Cached scene renderer received an invalid render entry");
      }
      kindCounts[entry.kind] = (kindCounts[entry.kind] || 0) + 1;
      if (isStaticEntry(entry)) {
        staticEntries++;
        pendingStaticEntries.push(entry);
      } else {
        dynamicEntries++;
        flushStaticBatch();
        nextPlan.push({ kind: "dynamic-entry", entry });
      }
    }
    flushStaticBatch();
    plan = Object.freeze(nextPlan);
    staticCacheBuilds = 0;
    staticCacheHits = 0;
    workload = Object.freeze({
      entries: entries.length,
      staticEntries,
      dynamicEntries,
      staticBatches: staticBatchIndex,
      kinds: Object.freeze(kindCounts)
    });
  }

  function renderFrame({ timeMs, width, height, staticCacheKey }) {
    requireFiniteTime(timeMs);
    requireDimension(width, "width");
    requireDimension(height, "height");
    if (
      (typeof staticCacheKey !== "string" && typeof staticCacheKey !== "function") ||
      staticCacheKey === ""
    ) {
      throw new Error("Cached scene renderer requires a non-empty static cache key");
    }
    const staticCacheKeyForBatch = typeof staticCacheKey === "function"
      ? staticCacheKey
      : () => staticCacheKey;

    for (const item of plan) {
      if (item.kind === "dynamic-entry") {
        drawEntry(item.entry, timeMs, displayContext);
        continue;
      }
      const batchCacheKey = staticCacheKeyForBatch(item.entries);
      if (typeof batchCacheKey !== "string" || batchCacheKey === "") {
        throw new Error("Cached scene renderer requires a non-empty static cache key");
      }
      prepareStaticBatch(item, width, height, batchCacheKey, timeMs);
      displayContext.drawImage(item.surface, 0, 0);
    }
  }

  function prepareStaticBatch(batch, width, height, cacheKey, timeMs) {
    if (!batch.surface) {
      batch.surface = createSurface(width, height);
      if (!batch.surface || typeof batch.surface.getContext !== "function") {
        throw new Error(`Cached scene renderer could not create ${batch.id}`);
      }
      const contextAttributes = staticContextAttributes(batch.entries);
      if (
        contextAttributes !== undefined &&
        (!contextAttributes || typeof contextAttributes !== "object" || Array.isArray(contextAttributes))
      ) {
        throw new Error(`Cached scene renderer received invalid ${batch.id} context attributes`);
      }
      batch.context = batch.surface.getContext("2d", contextAttributes);
      requireContext(batch.context, `${batch.id} context`);
    }
    const dimensionsChanged = batch.surface.width !== width || batch.surface.height !== height;
    if (!dimensionsChanged && batch.cacheKey === cacheKey) {
      staticCacheHits++;
      batch.cacheHits++;
      return;
    }
    if (dimensionsChanged) {
      batch.surface.width = width;
      batch.surface.height = height;
    }
    batch.context.imageSmoothingEnabled = false;
    batch.context.clearRect(0, 0, width, height);
    for (const entry of batch.entries) drawEntry(entry, timeMs, batch.context);
    batch.cacheKey = cacheKey;
    staticCacheBuilds++;
    batch.cacheBuilds++;
  }

  function invalidateStaticCache() {
    for (const item of plan) {
      if (item.kind === "static-batch") item.cacheKey = null;
    }
  }

  function stats() {
    return Object.freeze({
      ...workload,
      staticCacheBuilds,
      staticCacheHits,
      staticBatchStats: Object.freeze(plan
        .filter((item) => item.kind === "static-batch")
        .map((batch) => Object.freeze({
          id: batch.id,
          entries: batch.entries.length,
          kinds: Object.freeze(batch.entries.map((entry) => entry.kind)),
          cacheBuilds: batch.cacheBuilds,
          cacheHits: batch.cacheHits
        })))
    });
  }

  return Object.freeze({
    invalidateStaticCache,
    renderFrame,
    setEntries,
    stats
  });
}

function emptyWorkload() {
  return Object.freeze({
    entries: 0,
    staticEntries: 0,
    dynamicEntries: 0,
    staticBatches: 0,
    kinds: Object.freeze({})
  });
}

function requireContext(context, label) {
  if (!context || typeof context.drawImage !== "function") {
    throw new Error(`Cached scene renderer requires a ${label}`);
  }
}

function requireFunction(value, label) {
  if (typeof value !== "function") throw new Error(`Cached scene renderer requires a ${label}`);
}

function requireDimension(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Cached scene renderer received invalid ${label}: ${value}`);
  }
}

function requireFiniteTime(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Cached scene renderer received invalid frame time: ${value}`);
  }
}
