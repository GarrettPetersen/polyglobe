export const SURFACE_ICE_TRANSITION_DURATION_MS = 1800;
export const SURFACE_ICE_TRANSITION_STAGE_COUNT = 8;

export function createSurfaceIceTransition({
  startedAtMs,
  fromSeaMask,
  fromFreshwaterMask,
  toSeaMask,
  toFreshwaterMask,
  durationMs = SURFACE_ICE_TRANSITION_DURATION_MS
}) {
  assertFiniteNonnegative(startedAtMs, "surface ice transition start");
  assertFinitePositive(durationMs, "surface ice transition duration");
  const tileCount = assertMatchingMasks({
    fromSeaMask,
    fromFreshwaterMask,
    toSeaMask,
    toFreshwaterMask
  });
  return Object.freeze({
    startedAtMs,
    durationMs,
    tileCount,
    fromSeaMask,
    fromFreshwaterMask,
    toSeaMask,
    toFreshwaterMask
  });
}

export function surfaceIceTransitionProgress(transition, nowMs) {
  assertTransition(transition);
  assertFiniteNonnegative(nowMs, "surface ice transition time");
  return clamp((nowMs - transition.startedAtMs) / transition.durationMs, 0, 1);
}

export function surfaceIceTransitionStage(transition, nowMs) {
  const progress = surfaceIceTransitionProgress(transition, nowMs);
  return Math.min(
    SURFACE_ICE_TRANSITION_STAGE_COUNT,
    Math.floor(progress * (SURFACE_ICE_TRANSITION_STAGE_COUNT + 1))
  );
}

export function surfaceIceTransitionIsComplete(transition, nowMs) {
  return surfaceIceTransitionProgress(transition, nowMs) >= 1;
}

export function surfaceIceStateForTile({
  transition = null,
  seaMask,
  freshwaterMask,
  tileId,
  nowMs
}) {
  const tileCount = assertMatchingMasks({ seaMask, freshwaterMask });
  assertTileId(tileId, tileCount);
  const toIce = maskHasIce(seaMask, freshwaterMask, tileId);
  if (!transition) {
    return Object.freeze({
      fromIce: toIce,
      toIce,
      transitioning: false,
      progress: 1,
      stageIndex: SURFACE_ICE_TRANSITION_STAGE_COUNT,
      blocked: toIce
    });
  }
  assertTransition(transition);
  if (transition.tileCount !== tileCount) {
    throw new Error(
      `Surface ice transition tile count changed: ${transition.tileCount} -> ${tileCount}`
    );
  }
  const fromIce = maskHasIce(
    transition.fromSeaMask,
    transition.fromFreshwaterMask,
    tileId
  );
  const progress = surfaceIceTransitionProgress(transition, nowMs);
  const transitioning = fromIce !== toIce && progress < 1;
  return Object.freeze({
    fromIce,
    toIce,
    transitioning,
    progress,
    stageIndex: surfaceIceTransitionStage(transition, nowMs),
    blocked: progress < 1 ? fromIce : toIce
  });
}

export function surfaceIceTransitionEntrapsTile(transition, tileId) {
  assertTransition(transition);
  assertTileId(tileId, transition.tileCount);
  return !maskHasIce(
    transition.fromSeaMask,
    transition.fromFreshwaterMask,
    tileId
  ) && maskHasIce(
    transition.toSeaMask,
    transition.toFreshwaterMask,
    tileId
  );
}

export function surfaceIceTransitionCueForTiles({
  transition,
  tileIds,
  focusTileId = null
}) {
  assertTransition(transition);
  if (!tileIds || typeof tileIds[Symbol.iterator] !== "function") {
    throw new Error("Surface ice transition cue requires iterable tile ids");
  }
  if (focusTileId !== null) {
    assertTileId(focusTileId, transition.tileCount);
    const focusKind = surfaceIceTransitionKindForTile(transition, focusTileId);
    if (focusKind) return focusKind;
  }

  let freezingCount = 0;
  let thawingCount = 0;
  for (const tileId of tileIds) {
    assertTileId(tileId, transition.tileCount);
    const kind = surfaceIceTransitionKindForTile(transition, tileId);
    if (kind === "freezing") freezingCount++;
    else if (kind === "thawing") thawingCount++;
  }
  if (freezingCount === 0 && thawingCount === 0) return null;
  return freezingCount >= thawingCount ? "freezing" : "thawing";
}

export function surfaceIceTransitionPixel({
  variant,
  x,
  y,
  size,
  stageIndex
}) {
  if (!Number.isInteger(variant)) throw new Error(`Invalid surface ice particle variant: ${variant}`);
  if (!Number.isInteger(size) || size <= 0) throw new Error(`Invalid surface ice particle size: ${size}`);
  if (!Number.isInteger(x) || x < 0 || x >= size || !Number.isInteger(y) || y < 0 || y >= size) {
    throw new Error(`Invalid surface ice particle coordinate: ${x},${y} in ${size}`);
  }
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > SURFACE_ICE_TRANSITION_STAGE_COUNT) {
    throw new Error(`Invalid surface ice transition stage: ${stageIndex}`);
  }
  if (stageIndex === 0) return Object.freeze({ target: false, settled: false, x, y });
  if (stageIndex === SURFACE_ICE_TRANSITION_STAGE_COUNT) {
    return Object.freeze({ target: true, settled: true, x, y });
  }

  const coverage = stageIndex / SURFACE_ICE_TRANSITION_STAGE_COUNT;
  const seed = iceHash(
    variant ^ Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b)
  );
  const center = (size - 1) / 2;
  const distance = Math.hypot(x - center, y - center) / (size * Math.SQRT1_2);
  const rank = clamp(((seed & 0xffff) / 0xffff) * 0.82 + distance * 0.18, 0, 1);
  if (rank <= coverage) return Object.freeze({ target: true, settled: true, x, y });
  if (rank > coverage + 0.1) return Object.freeze({ target: false, settled: false, x, y });

  const dx = x - center;
  const dy = y - center;
  const length = Math.hypot(dx, dy) || 1;
  const drift = 1 + ((seed >>> 18) & 1);
  return Object.freeze({
    target: true,
    settled: false,
    x: clamp(Math.round(x + dx / length * drift), 0, size - 1),
    y: clamp(Math.round(y + dy / length * drift), 0, size - 1)
  });
}

function maskHasIce(seaMask, freshwaterMask, tileId) {
  return Boolean(seaMask[tileId] || freshwaterMask[tileId]);
}

function surfaceIceTransitionKindForTile(transition, tileId) {
  const fromIce = maskHasIce(
    transition.fromSeaMask,
    transition.fromFreshwaterMask,
    tileId
  );
  const toIce = maskHasIce(
    transition.toSeaMask,
    transition.toFreshwaterMask,
    tileId
  );
  if (fromIce === toIce) return null;
  return toIce ? "freezing" : "thawing";
}

function assertTransition(transition) {
  if (!transition || typeof transition !== "object") {
    throw new Error("Surface ice transition state is required");
  }
  assertFiniteNonnegative(transition.startedAtMs, "surface ice transition start");
  assertFinitePositive(transition.durationMs, "surface ice transition duration");
  const tileCount = assertMatchingMasks({
    fromSeaMask: transition.fromSeaMask,
    fromFreshwaterMask: transition.fromFreshwaterMask,
    toSeaMask: transition.toSeaMask,
    toFreshwaterMask: transition.toFreshwaterMask
  });
  if (transition.tileCount !== tileCount) {
    throw new Error(`Invalid surface ice transition tile count: ${transition.tileCount}`);
  }
}

function assertMatchingMasks(masks) {
  const entries = Object.entries(masks);
  if (entries.length === 0) throw new Error("Surface ice transition requires masks");
  let tileCount = null;
  for (const [label, mask] of entries) {
    if (!(mask instanceof Uint8Array)) {
      throw new Error(`Surface ice transition ${label} must be a Uint8Array`);
    }
    if (tileCount === null) tileCount = mask.length;
    else if (mask.length !== tileCount) {
      throw new Error(`Surface ice transition mask length mismatch: ${mask.length} != ${tileCount}`);
    }
  }
  if (!Number.isInteger(tileCount) || tileCount <= 0) {
    throw new Error(`Invalid surface ice transition tile count: ${tileCount}`);
  }
  return tileCount;
}

function assertTileId(tileId, tileCount) {
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= tileCount) {
    throw new Error(`Invalid surface ice transition tile: ${tileId}`);
  }
}

function assertFiniteNonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function assertFinitePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${label}: ${value}`);
}

function iceHash(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
