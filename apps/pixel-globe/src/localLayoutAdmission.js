function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

const MAX_ELASTIC_FRAME_CORRECTION_PX = 6;
const MAX_ELASTIC_ROTATION_CORRECTION_RAD = 16 * Math.PI / 180;
const MIN_ELASTIC_CORRECTION_TILES = 3;

function registeredProjectionFrame(positions, projectedById, anchorId, registrationIds) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Local layout anchor position for tile ${anchorId}`);
  assertFinitePoint(anchorProjected, `Projected anchor position for tile ${anchorId}`);

  const samples = [];
  let projectedCenterX = 0;
  let projectedCenterY = 0;
  let layoutCenterX = 0;
  let layoutCenterY = 0;
  for (const [id, position] of positions.entries()) {
    if (registrationIds && !registrationIds.has(id)) continue;
    const projected = projectedById.get(id);
    if (!projected) continue;
    assertFinitePoint(position, `Local layout position for tile ${id}`);
    assertFinitePoint(projected, `Projected position for retained tile ${id}`);
    samples.push({ position, projected });
    projectedCenterX += projected.x;
    projectedCenterY += projected.y;
    layoutCenterX += position.x;
    layoutCenterY += position.y;
  }

  let dotSum = 0;
  let crossSum = 0;
  if (samples.length > 0) {
    projectedCenterX /= samples.length;
    projectedCenterY /= samples.length;
    layoutCenterX /= samples.length;
    layoutCenterY /= samples.length;
  }
  for (const { position, projected } of samples) {
    const projectedX = projected.x - projectedCenterX;
    const projectedY = projected.y - projectedCenterY;
    const layoutX = position.x - layoutCenterX;
    const layoutY = position.y - layoutCenterY;
    const projectedLength = Math.hypot(projectedX, projectedY);
    const layoutLength = Math.hypot(layoutX, layoutY);
    if (projectedLength < 1 || layoutLength < 1) continue;

    // Fit rotation around the registration set's own center. A protected
    // island can anchor the player's local position without making elastic
    // ocean stretch around it look like chart rotation.
    const weight = 1 / Math.max(16, projectedLength);
    dotSum += (projectedX * layoutX + projectedY * layoutY) * weight;
    crossSum += (projectedX * layoutY - projectedY * layoutX) * weight;
  }

  const rotationMagnitude = Math.hypot(dotSum, crossSum);
  return {
    anchorPosition,
    anchorProjected,
    cos: samples.length > 1 && rotationMagnitude > 1e-9 ? dotSum / rotationMagnitude : 1,
    sin: samples.length > 1 && rotationMagnitude > 1e-9 ? crossSum / rotationMagnitude : 0
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
  correctElasticTilesNorthUp
) {
  const registered = registeredPoint(projected, registeredFrame);
  const translated = registeredPoint(projected, translatedFrame);
  if (correctElasticTilesNorthUp && protection === 0) return translated;
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
  correctElasticTilesNorthUp = false
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
  if (typeof correctElasticTilesNorthUp !== "boolean") {
    throw new Error("Local layout north-up correction flag must be boolean");
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
  const correctionRotation = correctElasticTilesNorthUp
    ? registeredRotation - clampMagnitude(
      registeredRotation,
      MAX_ELASTIC_ROTATION_CORRECTION_RAD
    )
    : 0;
  const translatedFrame = boundaryFittedFrame({
    ...boundaryArgs,
    rotation: correctionRotation,
    fallbackFrame: retainedFrame,
    elasticBoundariesOnly: correctElasticTilesNorthUp
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
        correctElasticTilesNorthUp
      )
    );
    admitted++;
  }

  return admitted;
}

function clampMagnitude(value, maximumMagnitude) {
  return Math.max(-maximumMagnitude, Math.min(maximumMagnitude, value));
}

export function viewportElasticCorrectionSupport({
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
  const elasticTileIds = new Set();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const tile of projectedTiles) {
    if (!ids.has(tile.id) || protectionById[tile.id] !== 0) continue;
    elasticTileIds.add(tile.id);
    minX = Math.min(minX, tile.x);
    minY = Math.min(minY, tile.y);
    maxX = Math.max(maxX, tile.x);
    maxY = Math.max(maxY, tile.y);
  }
  const elasticSpan = elasticTileIds.size > 0
    ? Math.hypot(maxX - minX, maxY - minY)
    : 0;
  return {
    viewportTileIds: ids,
    elasticTileIds,
    correctionActive: elasticTileIds.size >= MIN_ELASTIC_CORRECTION_TILES &&
      elasticSpan >= tileVisualRadius * 2
  };
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

export function refreshOffscreenElasticLayoutTiles({
  positions,
  projectedTiles,
  protectionById,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  anchorId
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Elastic north-up correction requires a positions map");
  }
  if (!Number.isInteger(anchorId) || !positions.has(anchorId)) {
    throw new Error(`Elastic north-up correction requires a retained anchor: ${anchorId}`);
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
