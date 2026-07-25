export function resolveDrawnSurfaceNavigation({
  candidates,
  x,
  y,
  maxDistancePx,
  isWaterTile,
  isUsableWaterTile,
  isTileOpaqueAtPoint
}) {
  if (!Array.isArray(candidates)) throw new Error("Drawn navigation requires surface candidates");
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid drawn navigation point: ${x},${y}`);
  }
  if (!Number.isFinite(maxDistancePx) || maxDistancePx <= 0) {
    throw new Error(`Invalid drawn navigation search radius: ${maxDistancePx}`);
  }
  for (const predicate of [isWaterTile, isUsableWaterTile, isTileOpaqueAtPoint]) {
    if (typeof predicate !== "function") throw new Error("Drawn navigation requires surface predicates");
  }

  let topmostOpaque = null;
  let nearestWater = null;
  let nearestWaterDistance2 = maxDistancePx * maxDistancePx;
  for (const entry of candidates) {
    if (entry?.kind !== "tile") continue;
    validateTileEntry(entry);
    const tileId = entry.call.id;
    if (isTileOpaqueAtPoint(entry.call, x, y) &&
        (!topmostOpaque || entry.drawOrder > topmostOpaque.drawOrder)) {
      topmostOpaque = entry;
    }
    if (!isWaterTile(tileId)) continue;
    const dx = entry.call.drawSurfaceX - x;
    const dy = entry.call.drawSurfaceY - y;
    const distance2 = dx * dx + dy * dy;
    if (distance2 >= nearestWaterDistance2) continue;
    nearestWater = entry;
    nearestWaterDistance2 = distance2;
  }

  const surface = topmostOpaque || nearestWater;
  if (!surface) return null;
  const tileId = surface.call.id;
  return Object.freeze({
    tileId,
    water: isWaterTile(tileId) && isUsableWaterTile(tileId),
    source: topmostOpaque ? "opaque-sprite" : "connector-gap"
  });
}

export function drawnNavigationTransitionAllowed(fromKind, toKind, fallbackAllowed) {
  if (typeof fallbackAllowed !== "function") {
    throw new Error("Drawn navigation transition requires a fallback");
  }
  if (fromKind === "river" || toKind === "river") return true;
  if (fromKind === "openWater" && toKind === "openWater") return true;
  return Boolean(fallbackAllowed());
}

function validateTileEntry(entry) {
  if (!Number.isInteger(entry.drawOrder) || entry.drawOrder < 0) {
    throw new Error(`Drawn navigation tile has invalid draw order: ${entry.drawOrder}`);
  }
  if (!Number.isInteger(entry.call?.id) || entry.call.id < 0 ||
      !Number.isFinite(entry.call.drawSurfaceX) ||
      !Number.isFinite(entry.call.drawSurfaceY)) {
    throw new Error("Drawn navigation received an invalid tile call");
  }
}
