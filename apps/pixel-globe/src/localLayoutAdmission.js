function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

export const MAX_ELASTIC_FRAME_CORRECTION_PX = 29;
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
  elasticBoundariesOnly = false,
  directProtectedBoundariesOnly = false
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
      if (
        directProtectedBoundariesOnly &&
        (protectionById[id] !== 255 || protectionById[neighborId] !== 255)
      ) continue;
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
  maxElasticCorrectionPx
) {
  const registered = registeredPoint(projected, registeredFrame);
  const translated = registeredPoint(projected, translatedFrame);
  const correctionX = translated.x - registered.x;
  const correctionY = translated.y - registered.y;
  const correctionLength = Math.hypot(correctionX, correctionY);
  const elasticity = 1 - protection / 255;
  const correctionLimit = maxElasticCorrectionPx * elasticity ** 4;
  if (correctionLength <= correctionLimit) return translated;
  if (correctionLimit <= 0 || correctionLength <= 1e-9) return registered;
  const scale = correctionLimit / correctionLength;
  return {
    x: roundPixel(registered.x + correctionX * scale),
    y: roundPixel(registered.y + correctionY * scale)
  };
}

function directlyProtectedAdmissionFrames({
  positions,
  projectedById,
  pending,
  neighborsById,
  protectionById,
  directProtectionComponentById,
  rigidRegistrationIds,
  fallbackFrame
}) {
  const pendingDirectIds = new Set(pending.filter((id) => protectionById[id] === 255));
  if (pendingDirectIds.size === 0) return new Map();

  const components = directProtectionComponentById
    ? projectedDirectComponentsByGlobalId({
      projectedById,
      protectionById,
      directProtectionComponentById,
      pendingDirectIds
    })
    : projectedDirectComponentsByAdjacency({
      projectedById,
      neighborsById,
      protectionById,
      pendingDirectIds
    });
  const frameByPendingId = new Map();
  for (const componentIds of components) {
    const retainedIds = componentIds.filter((id) => (
      positions.has(id) && (!rigidRegistrationIds || rigidRegistrationIds.has(id))
    ));
    const pendingComponentIds = componentIds.filter((id) => pendingDirectIds.has(id));
    let componentFrame = fallbackFrame;
    if (retainedIds.length === 1) {
      const retainedId = retainedIds[0];
      componentFrame = {
        anchorPosition: positions.get(retainedId),
        anchorProjected: projectedById.get(retainedId),
        cos: fallbackFrame.cos,
        sin: fallbackFrame.sin
      };
    } else if (retainedIds.length > 1) {
      componentFrame = registeredProjectionFrame(
        positions,
        projectedById,
        retainedIds[0],
        new Set(retainedIds)
      );
    }
    if (retainedIds.length > 0) {
      componentFrame = boundaryFittedFrame({
        positions,
        projectedById,
        pending: pendingComponentIds,
        neighborsById,
        protectionById,
        rotation: Math.atan2(componentFrame.sin, componentFrame.cos),
        fallbackFrame: componentFrame,
        directProtectedBoundariesOnly: true
      });
    }

    for (const id of pendingComponentIds) {
      if (pendingDirectIds.has(id)) frameByPendingId.set(id, componentFrame);
    }
  }
  return frameByPendingId;
}

function projectedDirectComponentsByGlobalId({
  projectedById,
  protectionById,
  directProtectionComponentById,
  pendingDirectIds
}) {
  const components = new Map();
  for (const id of projectedById.keys()) {
    if (protectionById[id] !== 255) continue;
    const componentId = directProtectionComponentById[id];
    if (!Number.isInteger(componentId) || componentId < 0) {
      throw new Error(`Directly protected tile ${id} has no global component`);
    }
    if (!components.has(componentId)) components.set(componentId, []);
    components.get(componentId).push(id);
  }
  return [...components.values()].filter((ids) => ids.some((id) => pendingDirectIds.has(id)));
}

function projectedDirectComponentsByAdjacency({
  projectedById,
  neighborsById,
  protectionById,
  pendingDirectIds
}) {
  const components = [];
  const visited = new Set();
  for (const startId of pendingDirectIds) {
    if (visited.has(startId)) continue;
    const componentIds = [];
    const queue = [startId];
    visited.add(startId);
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head];
      componentIds.push(id);
      for (const neighborId of neighborsById[id]) {
        if (
          visited.has(neighborId) ||
          protectionById[neighborId] !== 255 ||
          !projectedById.has(neighborId)
        ) continue;
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
    components.push(componentIds);
  }
  return components;
}

export function admitProjectedTiles({
  positions,
  projectedById,
  pendingIds,
  anchorId,
  neighborsById,
  protectionById,
  directProtectionComponentById = null,
  registrationIds = null,
  rigidRegistrationIds = registrationIds,
  correctElasticTilesNorthUp = false,
  maxElasticCorrectionPx = MAX_ELASTIC_FRAME_CORRECTION_PX
}) {
  if (!(positions instanceof Map)) throw new Error("Local layout admission requires a positions map");
  if (!(projectedById instanceof Map)) throw new Error("Local layout admission requires a projected-position map");
  if (!Array.isArray(neighborsById) || neighborsById.length === 0) {
    throw new Error("Local layout admission requires tile neighbors");
  }
  if (!(protectionById instanceof Uint8Array) || protectionById.length !== neighborsById.length) {
    throw new Error("Local layout admission requires complete chart protection");
  }
  if (
    directProtectionComponentById !== null &&
    (!(directProtectionComponentById instanceof Int32Array) ||
      directProtectionComponentById.length !== neighborsById.length)
  ) {
    throw new Error("Local layout admission requires complete direct-protection components");
  }
  if (registrationIds !== null && !(registrationIds instanceof Set)) {
    throw new Error("Local layout admission registration ids must be a set");
  }
  if (rigidRegistrationIds !== null && !(rigidRegistrationIds instanceof Set)) {
    throw new Error("Rigid local layout registration ids must be a set");
  }
  if (typeof correctElasticTilesNorthUp !== "boolean") {
    throw new Error("Local layout north-up correction flag must be boolean");
  }
  if (!Number.isFinite(maxElasticCorrectionPx) || maxElasticCorrectionPx < 0) {
    throw new Error(`Local layout correction limit must be non-negative: ${maxElasticCorrectionPx}`);
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
  const protectedFrameById = directlyProtectedAdmissionFrames({
    positions,
    projectedById,
    pending,
    neighborsById,
    protectionById,
    directProtectionComponentById,
    rigidRegistrationIds,
    fallbackFrame: registeredFrame
  });
  let admitted = 0;
  for (const id of pending) {
    if (positions.has(id)) throw new Error(`Pending local layout tile ${id} already has a position`);
    if (!Array.isArray(neighborsById[id])) {
      throw new Error(`Local layout admission is missing neighbors for tile ${id}`);
    }
    const projected = projectedById.get(id);
    assertFinitePoint(projected, `Projected position for pending tile ${id}`);
    const protectedFrame = protectedFrameById.get(id);
    positions.set(
      id,
      protectedFrame
        ? registeredPoint(projected, protectedFrame)
        : admissionPointBetweenFrames(
          projected,
          registeredFrame,
          translatedFrame,
          protectionById[id],
          maxElasticCorrectionPx
        )
    );
    admitted++;
  }

  return admitted;
}

export function settleElasticLayoutTowardProjection({
  positions,
  projectedTiles,
  protectionById,
  anchorId,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  maximumStepPx
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Elastic layout settlement requires a positions map");
  }
  if (!Array.isArray(projectedTiles)) {
    throw new Error("Elastic layout settlement requires projected tiles");
  }
  if (!(protectionById instanceof Uint8Array)) {
    throw new Error("Elastic layout settlement requires chart protection");
  }
  if (!Number.isInteger(anchorId) || !positions.has(anchorId)) {
    throw new Error(`Elastic layout settlement requires a retained anchor: ${anchorId}`);
  }
  if (!Number.isFinite(maximumStepPx) || maximumStepPx < 0) {
    throw new Error(`Elastic layout settlement step must be non-negative: ${maximumStepPx}`);
  }
  const viewportIds = projectedViewportTileIds({
    projectedTiles,
    protectionById,
    viewportWidth,
    viewportHeight,
    tileVisualRadius
  });
  if (maximumStepPx === 0) return 0;

  const projectedById = new Map(projectedTiles.map((tile) => [tile.id, tile]));
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Elastic layout anchor position for tile ${anchorId}`);
  assertFinitePoint(anchorProjected, `Elastic layout projected anchor for tile ${anchorId}`);

  let settled = 0;
  for (const id of viewportIds) {
    if (id === anchorId || protectionById[id] !== 0) continue;
    const position = positions.get(id);
    if (!position) continue;
    const projected = projectedById.get(id);
    assertFinitePoint(position, `Elastic layout position for tile ${id}`);
    assertFinitePoint(projected, `Elastic layout projection for tile ${id}`);
    const targetX = anchorPosition.x + projected.x - anchorProjected.x;
    const targetY = anchorPosition.y + projected.y - anchorProjected.y;
    const dx = targetX - position.x;
    const dy = targetY - position.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.5) continue;
    const scale = Math.min(1, maximumStepPx / distance);
    const next = {
      x: roundPixel(position.x + dx * scale),
      y: roundPixel(position.y + dy * scale)
    };
    if (next.x === position.x && next.y === position.y) continue;
    positions.set(id, next);
    settled++;
  }
  return settled;
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

export function refreshOffscreenLayoutTiles({
  positions,
  projectedTiles,
  protectionById,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  anchorId
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Offscreen chart refresh requires a positions map");
  }
  if (!Number.isInteger(anchorId) || !positions.has(anchorId)) {
    throw new Error(`Offscreen chart refresh requires a retained anchor: ${anchorId}`);
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
