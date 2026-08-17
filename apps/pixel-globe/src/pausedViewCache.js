export function createPausedViewCache(label) {
  if (typeof label !== "string" || label.trim() === "") {
    throw new Error("Paused view cache requires a label");
  }
  return {
    label: label.trim(),
    source: null,
    value: null
  };
}

export function capturePausedView(cache, source, build) {
  validateCache(cache);
  if (source === null || source === undefined) {
    throw new Error(`${cache.label} paused view requires a source`);
  }
  if (typeof build !== "function") {
    throw new Error(`${cache.label} paused view requires a builder`);
  }
  const value = build();
  if (value === null || value === undefined) {
    throw new Error(`${cache.label} paused view builder returned no value`);
  }
  cache.source = source;
  cache.value = value;
  return value;
}

export function currentPausedView(cache, source) {
  validateCache(cache);
  if (cache.source !== source || cache.value === null) {
    throw new Error(`${cache.label} paused view is stale or missing`);
  }
  return cache.value;
}

export function cachedPausedView(cache, source, build) {
  validateCache(cache);
  if (cache.source === source && cache.value !== null) return cache.value;
  return capturePausedView(cache, source, build);
}

export function clearPausedView(cache) {
  validateCache(cache);
  cache.source = null;
  cache.value = null;
}

function validateCache(cache) {
  if (!cache || typeof cache !== "object" || typeof cache.label !== "string") {
    throw new Error("Invalid paused view cache");
  }
}
