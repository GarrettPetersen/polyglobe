function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

const MAX_ELASTIC_FRAME_CORRECTION_PX = 6;
const MAX_OPEN_OCEAN_ROTATION_CORRECTION_RAD = 16 * Math.PI / 180;

function registeredProjectionFrame(positions, projectedById, anchorId, registrationIds) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Local layout anchor position for tile ${anchorId}`);
  assertFinitePoint(anchorProjected, `Projected anchor position for tile ${anchorId}`);

  let dotSum = 0;
  let crossSum = 0;
  let support = 0;
  for (const [id, position] of positions.entries()) {
    if (id === anchorId) continue;
    if (registrationIds && !registrationIds.has(id)) continue;
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
    x: roundPixel(frame.anchorPosition.x + x * frame.cos - y * frame.sin),
    y: roundPixel(frame.anchorPosition.y + x * frame.sin + y * frame.cos)
  };
}

function roundPixel(value) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function boundaryFittedFrame({
  positions,
  projectedById,
  pending,
  neighborsById,
  protectionById,
  rotation,
  fallbackFrame,
  elasticBoundariesOnly = false
}) {
  const pendingSet = new Set(pending);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let translationX = 0;
  let translationY = 0;
  let totalWeight = 0;
  for (const id of pending) {
    for (const neighborId of neighborsById[id]) {
      const neighborPosition = positions.get(neighborId);
      const neighborProjected = projectedById.get(neighborId);
      if (pendingSet.has(neighborId) || !neighborPosition || !neighborProjected) continue;
      const boundaryProtection = Math.max(protectionById[id], protectionById[neighborId]);
      if (elasticBoundariesOnly && boundaryProtection !== 0) continue;
      const protection = boundaryProtection / 255;
      const weight = 1 + protection * 63;
      const rotatedX = neighborProjected.x * cos - neighborProjected.y * sin;
      const rotatedY = neighborProjected.x * sin + neighborProjected.y * cos;
      translationX += (neighborPosition.x - rotatedX) * weight;
      translationY += (neighborPosition.y - rotatedY) * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) return fallbackFrame;
  return {
    anchorPosition: {
      x: translationX / totalWeight,
      y: translationY / totalWeight
    },
    anchorProjected: { x: 0, y: 0 },
    cos,
    sin
  };
}

function admissionPointBetweenFrames(
  projected,
  registeredFrame,
  translatedFrame,
  protection,
  resetElasticTilesNorthUp
) {
  const registered = registeredPoint(projected, registeredFrame);
  const translated = registeredPoint(projected, translatedFrame);
  if (resetElasticTilesNorthUp && protection === 0) return translated;
  const correctionX = translated.x - registered.x;
  const correctionY = translated.y - registered.y;
  const correctionLength = Math.hypot(correctionX, correctionY);
  const correctionLimit = MAX_ELASTIC_FRAME_CORRECTION_PX * (1 - protection / 255);
  if (correctionLength <= correctionLimit) return translated;
  if (correctionLimit <= 0 || correctionLength <= 1e-9) return registered;
  const scale = correctionLimit / correctionLength;
  return {
    x: roundPixel(registered.x + correctionX * scale),
    y: roundPixel(registered.y + correctionY * scale)
  };
}

export function admitProjectedTiles({
  positions,
  projectedById,
  pendingIds,
  anchorId,
  neighborsById,
  protectionById,
  registrationIds = null,
  resetElasticTilesNorthUp = false
}) {
  if (!(positions instanceof Map)) throw new Error("Local layout admission requires a positions map");
  if (!(projectedById instanceof Map)) throw new Error("Local layout admission requires a projected-position map");
  if (!Array.isArray(neighborsById) || neighborsById.length === 0) {
    throw new Error("Local layout admission requires tile neighbors");
  }
  if (!(protectionById instanceof Uint8Array) || protectionById.length !== neighborsById.length) {
    throw new Error("Local layout admission requires complete chart protection");
  }
  if (registrationIds !== null && !(registrationIds instanceof Set)) {
    throw new Error("Local layout admission registration ids must be a set");
  }
  if (typeof resetElasticTilesNorthUp !== "boolean") {
    throw new Error("Local layout north-up reset flag must be boolean");
  }
  const pending = [...pendingIds];
  if (new Set(pending).size !== pending.length) {
    throw new Error("Local layout admission received duplicate pending tiles");
  }
  const retainedFrame = registeredProjectionFrame(
    positions,
    projectedById,
    anchorId,
    registrationIds
  );
  const boundaryArgs = {
    positions,
    projectedById,
    pending,
    neighborsById,
    protectionById
  };
  const registeredRotation = Math.atan2(retainedFrame.sin, retainedFrame.cos);
  const registeredFrame = boundaryFittedFrame({
    ...boundaryArgs,
    rotation: registeredRotation,
    fallbackFrame: retainedFrame
  });
  const correctionRotation = resetElasticTilesNorthUp
    ? registeredRotation - clampMagnitude(
      registeredRotation,
      MAX_OPEN_OCEAN_ROTATION_CORRECTION_RAD
    )
    : 0;
  const translatedFrame = boundaryFittedFrame({
    ...boundaryArgs,
    rotation: correctionRotation,
    fallbackFrame: retainedFrame,
    elasticBoundariesOnly: resetElasticTilesNorthUp
  });
  let admitted = 0;
  for (const id of pending) {
    if (positions.has(id)) throw new Error(`Pending local layout tile ${id} already has a position`);
    if (!Array.isArray(neighborsById[id])) {
      throw new Error(`Local layout admission is missing neighbors for tile ${id}`);
    }
    const projected = projectedById.get(id);
    assertFinitePoint(projected, `Projected position for pending tile ${id}`);
    positions.set(
      id,
      admissionPointBetweenFrames(
        projected,
        registeredFrame,
        translatedFrame,
        protectionById[id],
        resetElasticTilesNorthUp
      )
    );
    admitted++;
  }

  return admitted;
}

function clampMagnitude(value, maximumMagnitude) {
  return Math.max(-maximumMagnitude, Math.min(maximumMagnitude, value));
}

export function viewportContainsOnlyElasticTiles({
  projectedTiles,
  protectionById,
  viewportWidth,
  viewportHeight,
  tileVisualRadius
}) {
  const ids = projectedViewportTileIds({
    projectedTiles,
    protectionById,
    viewportWidth,
    viewportHeight,
    tileVisualRadius
  });
  if (ids.size === 0) return false;
  for (const id of ids) {
    if (protectionById[id] !== 0) return false;
  }
  return true;
}

export function projectedViewportTileIds({
  projectedTiles,
  protectionById,
  viewportWidth,
  viewportHeight,
  tileVisualRadius
}) {
  if (!Array.isArray(projectedTiles)) {
    throw new Error("Elastic viewport detection requires projected tiles");
  }
  if (!(protectionById instanceof Uint8Array)) {
    throw new Error("Elastic viewport detection requires chart protection");
  }
  for (const [label, value] of [
    ["width", viewportWidth],
    ["height", viewportHeight],
    ["tile visual radius", tileVisualRadius]
  ]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Elastic viewport ${label} must be positive`);
    }
  }

  const ids = new Set();
  for (const tile of projectedTiles) {
    assertFinitePoint(tile, `Projected viewport tile ${tile?.id}`);
    if (!Number.isInteger(tile.id) || tile.id < 0 || tile.id >= protectionById.length) {
      throw new Error(`Projected viewport tile has invalid id: ${tile.id}`);
    }
    if (!projectedTileOverlapsViewport(
      tile,
      viewportWidth,
      viewportHeight,
      tileVisualRadius
    )) continue;
    ids.add(tile.id);
  }
  return ids;
}

export function retainLocalLayoutAnchor({
  positions,
  anchorId,
  viewX,
  viewY
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Local layout anchor retention requires a positions map");
  }
  if (!Number.isInteger(anchorId) || anchorId < 0) {
    throw new Error(`Local layout anchor retention requires a tile id: ${anchorId}`);
  }
  assertFinitePoint({ x: viewX, y: viewY }, "Local layout view position");
  if (positions.has(anchorId)) return false;
  positions.set(anchorId, {
    x: roundPixel(viewX),
    y: roundPixel(viewY)
  });
  return true;
}

export function discardOffscreenElasticLayoutTiles({
  positions,
  projectedTiles,
  protectionById,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  anchorId
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Elastic north-up reset requires a positions map");
  }
  if (!Number.isInteger(anchorId) || !positions.has(anchorId)) {
    throw new Error(`Elastic north-up reset requires a retained anchor: ${anchorId}`);
  }
  // Validate every projected tile before mutating the retained layout.
  projectedViewportTileIds({
    projectedTiles,
    protectionById,
    viewportWidth,
    viewportHeight,
    tileVisualRadius
  });

  let discarded = 0;
  for (const tile of projectedTiles) {
    if (
      tile.id === anchorId ||
      protectionById[tile.id] !== 0 ||
      projectedTileOverlapsViewport(tile, viewportWidth, viewportHeight, tileVisualRadius)
    ) {
      continue;
    }
    if (positions.delete(tile.id)) discarded++;
  }
  return discarded;
}

function projectedTileOverlapsViewport(tile, viewportWidth, viewportHeight, tileVisualRadius) {
  return !(
    tile.x + tileVisualRadius < 0 ||
    tile.x - tileVisualRadius > viewportWidth ||
    tile.y + tileVisualRadius < 0 ||
    tile.y - tileVisualRadius > viewportHeight
  );
}
