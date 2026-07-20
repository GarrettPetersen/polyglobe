const MIN_RIVER_EDGE_LENGTH = 1e-6;

export function projectedRiverEdgeDirection({
  surfaceDelta = null,
  layoutDelta = null,
  globeDelta = null,
  tileId,
  edge
}) {
  for (const [label, delta] of [
    ["surface", surfaceDelta],
    ["layout", layoutDelta],
    ["globe", globeDelta]
  ]) {
    if (!delta) continue;
    if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
      throw new Error(`River edge ${edge} on tile ${tileId} has an invalid ${label} projection`);
    }
    const length = Math.hypot(delta.x, delta.y);
    if (length >= MIN_RIVER_EDGE_LENGTH) {
      return { x: delta.x / length, y: delta.y / length };
    }
  }

  throw new Error(`Could not project river edge ${edge} on tile ${tileId}`);
}
