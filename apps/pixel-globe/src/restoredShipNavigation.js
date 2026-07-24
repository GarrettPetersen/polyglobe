export function restoredShipPlacementPlan({
  savedTileId,
  positionTileId,
  frozen,
  polarOutOfBounds = false,
  nearestOpenWaterTileId
}) {
  assertTileId(savedTileId, "saved ship");
  assertTileId(positionTileId, "saved position");
  if (typeof frozen !== "boolean") throw new Error("Restored ship ice state must be boolean");
  if (typeof polarOutOfBounds !== "boolean") {
    throw new Error("Restored ship polar navigation state must be boolean");
  }

  if (frozen || polarOutOfBounds) {
    assertTileId(nearestOpenWaterTileId, "nearest open-water");
    return Object.freeze({
      tileId: nearestOpenWaterTileId,
      recenter: true,
      stop: true,
      reason: polarOutOfBounds ? "polar navigation limit" : "surface ice"
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

export function findNearestRestoredShipPlacement(maxRadiusPx, evaluate) {
  if (!Number.isInteger(maxRadiusPx) || maxRadiusPx < 0) {
    throw new Error(`Invalid restored ship recovery radius: ${maxRadiusPx}`);
  }
  if (typeof evaluate !== "function") {
    throw new Error("Restored ship recovery requires a candidate evaluator");
  }

  const maxDistanceSquared = maxRadiusPx * maxRadiusPx;
  for (let distanceSquared = 0; distanceSquared <= maxDistanceSquared; distanceSquared++) {
    for (let y = -maxRadiusPx; y <= maxRadiusPx; y++) {
      for (let x = -maxRadiusPx; x <= maxRadiusPx; x++) {
        if (x * x + y * y !== distanceSquared) continue;
        const candidate = evaluate(x, y);
        if (candidate !== null && candidate !== undefined) {
          return Object.freeze({ x, y, candidate });
        }
      }
    }
  }
  return null;
}

function assertTileId(tileId, label) {
  if (!Number.isInteger(tileId) || tileId < 0) {
    throw new Error(`Invalid ${label} tile: ${tileId}`);
  }
}
