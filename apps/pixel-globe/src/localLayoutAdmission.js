function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

function registeredProjectionFrame(positions, projectedById, anchorId) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Local layout anchor position for tile ${anchorId}`);
  assertFinitePoint(anchorProjected, `Projected anchor position for tile ${anchorId}`);

  let dotSum = 0;
  let crossSum = 0;
  let support = 0;
  for (const [id, position] of positions.entries()) {
    if (id === anchorId) continue;
    const projected = projectedById.get(id);
    if (!projected) continue;
    assertFinitePoint(position, `Local layout position for tile ${id}`);
    assertFinitePoint(projected, `Projected position for retained tile ${id}`);

    const projectedX = projected.x - anchorProjected.x;
    const projectedY = projected.y - anchorProjected.y;
    const layoutX = position.x - anchorPosition.x;
    const layoutY = position.y - anchorPosition.y;
    const projectedLength = Math.hypot(projectedX, projectedY);
    const layoutLength = Math.hypot(layoutX, layoutY);
    if (projectedLength < 1 || layoutLength < 1) continue;

    // A chart rebuilt farther east or west has a differently rotated tangent
    // frame, especially near the poles. Fit that rotation without allowing the
    // retained map to scale or shear.
    const weight = 1 / Math.max(16, projectedLength);
    dotSum += (projectedX * layoutX + projectedY * layoutY) * weight;
    crossSum += (projectedX * layoutY - projectedY * layoutX) * weight;
    support++;
  }

  const rotationMagnitude = Math.hypot(dotSum, crossSum);
  return {
    anchorPosition,
    anchorProjected,
    cos: support > 0 && rotationMagnitude > 1e-9 ? dotSum / rotationMagnitude : 1,
    sin: support > 0 && rotationMagnitude > 1e-9 ? crossSum / rotationMagnitude : 0
  };
}

function registeredPoint(projected, frame) {
  const x = projected.x - frame.anchorProjected.x;
  const y = projected.y - frame.anchorProjected.y;
  return {
    x: Math.round(frame.anchorPosition.x + x * frame.cos - y * frame.sin),
    y: Math.round(frame.anchorPosition.y + x * frame.sin + y * frame.cos)
  };
}

export function admitProjectedTiles({
  positions,
  projectedById,
  pendingIds,
  anchorId
}) {
  if (!(positions instanceof Map)) throw new Error("Local layout admission requires a positions map");
  if (!(projectedById instanceof Map)) throw new Error("Local layout admission requires a projected-position map");
  const frame = registeredProjectionFrame(positions, projectedById, anchorId);

  let admitted = 0;
  for (const id of pendingIds) {
    if (positions.has(id)) throw new Error(`Pending local layout tile ${id} already has a position`);
    const projected = projectedById.get(id);
    assertFinitePoint(projected, `Projected position for pending tile ${id}`);
    positions.set(id, registeredPoint(projected, frame));
    admitted++;
  }

  return admitted;
}
