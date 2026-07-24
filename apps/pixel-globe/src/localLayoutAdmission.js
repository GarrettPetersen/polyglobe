function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

export function admitProjectedTiles({
  positions,
  projectedById,
  pendingIds,
  anchorId
}) {
  if (!(positions instanceof Map)) throw new Error("Local layout admission requires a positions map");
  if (!(projectedById instanceof Map)) throw new Error("Local layout admission requires a projected-position map");
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Local layout anchor position for tile ${anchorId}`);
  assertFinitePoint(anchorProjected, `Projected anchor position for tile ${anchorId}`);

  let admitted = 0;
  for (const id of pendingIds) {
    if (positions.has(id)) throw new Error(`Pending local layout tile ${id} already has a position`);
    const projected = projectedById.get(id);
    assertFinitePoint(projected, `Projected position for pending tile ${id}`);
    positions.set(id, {
      x: Math.round(anchorPosition.x + projected.x - anchorProjected.x),
      y: Math.round(anchorPosition.y + projected.y - anchorProjected.y)
    });
    admitted++;
  }

  return admitted;
}
