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
  let uncachedFrames = 0;

  function setEntries(entries) {
    if (!Array.isArray(entries)) throw new Error("Cached scene renderer requires render entries");
    const reusableStaticBatches = plan.filter(({ kind }) => kind === "static-batch");
    const kindCounts = {};
    let staticEntries = 0;
    let dynamicEntries = 0;
    let staticBatchIndex = 0;
    const nextPlan = [];
    let pendingStaticEntries = [];

    const flushStaticBatch = () => {
      if (pendingStaticEntries.length === 0) return;
      const reusable = reusableStaticBatches[staticBatchIndex] || null;
      nextPlan.push({
        kind: "static-batch",
        id: `static-batch-${staticBatchIndex++}`,
        entries: Object.freeze(pendingStaticEntries),
        surface: reusable?.surface || null,
        context: reusable?.context || null,
        cacheKey: null,
        pending: null,
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
    uncachedFrames = 0;
    workload = Object.freeze({
      entries: entries.length,
      staticEntries,
      dynamicEntries,
      staticBatches: staticBatchIndex,
      kinds: Object.freeze(kindCounts)
    });
  }

  function renderFrame({ timeMs, width, height, staticCacheKey, useStaticCache = true }) {
    requireFiniteTime(timeMs);
    requireDimension(width, "width");
    requireDimension(height, "height");
    if (typeof useStaticCache !== "boolean") {
      throw new Error("Cached scene renderer requires an explicit cache-use boolean");
    }
    if (
      (typeof staticCacheKey !== "string" && typeof staticCacheKey !== "function") ||
      staticCacheKey === ""
    ) {
      throw new Error("Cached scene renderer requires a non-empty static cache key");
    }
    const staticCacheKeyForBatch = typeof staticCacheKey === "function"
      ? staticCacheKey
      : () => staticCacheKey;

    if (!useStaticCache) {
      uncachedFrames++;
      for (const item of plan) {
        if (item.kind === "dynamic-entry") drawEntry(item.entry, timeMs, displayContext);
        else for (const entry of item.entries) drawEntry(entry, timeMs, displayContext);
      }
      return;
    }

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

  function prepareStaticCache({
    timeMs,
    width,
    height,
    staticCacheKey,
    budgetMs,
    now = () => performance.now()
  }) {
    requireFiniteTime(timeMs);
    requireDimension(width, "width");
    requireDimension(height, "height");
    if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
      throw new Error(`Cached scene renderer received invalid preparation budget: ${budgetMs}`);
    }
    requireFunction(now, "preparation clock");
    if (
      (typeof staticCacheKey !== "string" && typeof staticCacheKey !== "function") ||
      staticCacheKey === ""
    ) {
      throw new Error("Cached scene renderer requires a non-empty static cache key");
    }
    const staticCacheKeyForBatch = typeof staticCacheKey === "function"
      ? staticCacheKey
      : () => staticCacheKey;
    const startedAtMs = now();
    if (!Number.isFinite(startedAtMs)) {
      throw new Error(`Cached scene renderer preparation clock is invalid: ${startedAtMs}`);
    }
    for (const item of plan) {
      if (item.kind !== "static-batch") continue;
      const batchCacheKey = staticCacheKeyForBatch(item.entries);
      if (typeof batchCacheKey !== "string" || batchCacheKey === "") {
        throw new Error("Cached scene renderer requires a non-empty static cache key");
      }
      if (!prepareStaticBatch(item, width, height, batchCacheKey, timeMs, {
        deadlineMs: startedAtMs + budgetMs,
        now
      })) return false;
    }
    return true;
  }

  function prepareStaticBatch(batch, width, height, cacheKey, timeMs, preparation = null) {
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
      if (!preparation) {
        staticCacheHits++;
        batch.cacheHits++;
      }
      return true;
    }
    const pendingMatches = !dimensionsChanged && batch.pending?.cacheKey === cacheKey &&
      batch.pending.width === width && batch.pending.height === height;
    if (!pendingMatches) {
      batch.surface.width = width;
      batch.surface.height = height;
      batch.context.imageSmoothingEnabled = false;
      batch.context.clearRect(0, 0, width, height);
      batch.pending = { cacheKey, width, height, nextEntryIndex: 0 };
    }
    do {
      const entry = batch.entries[batch.pending.nextEntryIndex++];
      drawEntry(entry, timeMs, batch.context);
    } while (
      batch.pending.nextEntryIndex < batch.entries.length &&
      (!preparation || preparationNow(preparation) < preparation.deadlineMs)
    );
    if (batch.pending.nextEntryIndex < batch.entries.length) return false;
    batch.pending = null;
    batch.cacheKey = cacheKey;
    staticCacheBuilds++;
    batch.cacheBuilds++;
    return true;
  }

  function invalidateStaticCache() {
    for (const item of plan) {
      if (item.kind === "static-batch") {
        item.cacheKey = null;
        item.pending = null;
      }
    }
  }

  function stats() {
    return Object.freeze({
      ...workload,
      staticCacheBuilds,
      staticCacheHits,
      uncachedFrames,
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
    prepareStaticCache,
    renderFrame,
    setEntries,
    stats
  });
}

function preparationNow(preparation) {
  const nowMs = preparation.now();
  if (!Number.isFinite(nowMs)) {
    throw new Error(`Cached scene renderer preparation clock is invalid: ${nowMs}`);
  }
  return nowMs;
}

function emptyWorkload() {
  return Object.freeze({
    entries: 0,
    staticEntries: 0,
    dynamicEntries: 0,
    staticBatches: 0,
    uncachedFrames: 0,
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
