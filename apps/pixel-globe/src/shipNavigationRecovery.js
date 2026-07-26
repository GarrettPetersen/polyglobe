export function restoredShipPlacementPlan({
  savedTileId,
  positionTileId,
  frozen,
  nearestOpenWaterTileId
}) {
  assertTileId(savedTileId, "saved ship");
  assertTileId(positionTileId, "saved position");
  if (typeof frozen !== "boolean") throw new Error("Restored ship ice state must be boolean");

  if (frozen) {
    assertTileId(nearestOpenWaterTileId, "nearest open-water");
    return Object.freeze({
      tileId: nearestOpenWaterTileId,
      recenter: true,
      stop: true,
      reason: "surface ice"
    });
  }

  if (positionTileId !== savedTileId) {
    return Object.freeze({
      tileId: savedTileId,
      recenter: true,
      stop: true,
      reason: "tile-boundary mismatch"
    });
  }

  return Object.freeze({
    tileId: savedTileId,
    recenter: false,
    stop: false,
    reason: null
  });
}

const placementOffsetCache = new Map();

export function findNearestShipPlacement(maxRadiusPx, evaluate, minimumRadiusPx = 0) {
  if (!Number.isInteger(maxRadiusPx) || maxRadiusPx < 0) {
    throw new Error(`Invalid ship recovery radius: ${maxRadiusPx}`);
  }
  if (!Number.isInteger(minimumRadiusPx) || minimumRadiusPx < 0 || minimumRadiusPx > maxRadiusPx) {
    throw new Error(`Invalid minimum ship recovery radius: ${minimumRadiusPx}`);
  }
  if (typeof evaluate !== "function") {
    throw new Error("Ship recovery requires a candidate evaluator");
  }

  const minimumDistanceSquared = minimumRadiusPx * minimumRadiusPx;
  for (const offset of shipPlacementOffsets(maxRadiusPx)) {
    if (offset.distanceSquared < minimumDistanceSquared) continue;
    const candidate = evaluate(offset.x, offset.y);
    if (candidate !== null && candidate !== undefined) {
      return Object.freeze({ x: offset.x, y: offset.y, candidate });
    }
  }
  return null;
}

export function createPlayerShipRecoveryState() {
  return { blockedSeconds: 0 };
}

export function updatePlayerShipRecoveryState(state, {
  dt,
  steering,
  collided,
  movedPx,
  triggerSeconds,
  movementThresholdPx
}) {
  if (!state || !Number.isFinite(state.blockedSeconds) || state.blockedSeconds < 0) {
    throw new Error("Invalid player ship recovery state");
  }
  assertNonnegativeFinite(dt, "dt");
  assertNonnegativeFinite(movedPx, "movedPx");
  assertNonnegativeFinite(triggerSeconds, "triggerSeconds");
  assertNonnegativeFinite(movementThresholdPx, "movementThresholdPx");
  if (typeof steering !== "boolean" || typeof collided !== "boolean") {
    throw new Error("Player ship recovery requires steering and collision flags");
  }

  if (!steering || !collided || movedPx >= movementThresholdPx) {
    state.blockedSeconds = 0;
    return false;
  }
  state.blockedSeconds += dt;
  if (state.blockedSeconds < triggerSeconds) return false;
  state.blockedSeconds = 0;
  return true;
}

function assertNonnegativeFinite(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid player ship recovery ${label}: ${value}`);
  }
}

function shipPlacementOffsets(maxRadiusPx) {
  const cached = placementOffsetCache.get(maxRadiusPx);
  if (cached) return cached;
  const maxDistanceSquared = maxRadiusPx * maxRadiusPx;
  const offsets = [];
  for (let y = -maxRadiusPx; y <= maxRadiusPx; y++) {
    for (let x = -maxRadiusPx; x <= maxRadiusPx; x++) {
      const distanceSquared = x * x + y * y;
      if (distanceSquared > maxDistanceSquared) continue;
      offsets.push({ x, y, distanceSquared });
    }
  }
  offsets.sort((a, b) => (
    a.distanceSquared - b.distanceSquared ||
    Math.abs(a.y) - Math.abs(b.y) ||
    a.y - b.y ||
    a.x - b.x
  ));
  const result = Object.freeze(offsets.map(Object.freeze));
  placementOffsetCache.set(maxRadiusPx, result);
  return result;
}

function assertTileId(tileId, label) {
  if (!Number.isInteger(tileId) || tileId < 0) {
    throw new Error(`Invalid ${label} tile: ${tileId}`);
  }
}
