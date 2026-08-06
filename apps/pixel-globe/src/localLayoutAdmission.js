function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

export const MAX_ELASTIC_FRAME_CORRECTION_PX = 29;
export const MAX_PROTECTED_ADMISSION_SLACK_PX = 2;
const MAX_ELASTIC_ROTATION_CORRECTION_RAD = Math.PI;
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
  const point = unroundedRegisteredPoint(projected, frame);
  return {
    x: roundPixel(point.x),
    y: roundPixel(point.y)
  };
}

function unroundedRegisteredPoint(projected, frame) {
  const x = projected.x - frame.anchorProjected.x;
  const y = projected.y - frame.anchorProjected.y;
  return {
    x: frame.anchorPosition.x + x * frame.cos - y * frame.sin,
    y: frame.anchorPosition.y + x * frame.sin + y * frame.cos
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
  maxElasticCorrectionPx,
  maxProtectedCorrectionPx
) {
  const registered = registeredPoint(projected, registeredFrame);
  const translated = registeredPoint(projected, translatedFrame);
  const correctionX = translated.x - registered.x;
  const correctionY = translated.y - registered.y;
  const correctionLength = Math.hypot(correctionX, correctionY);
  const elasticity = 1 - protection / 255;
  const preventiveProtectedSlack = protection > 0 ? maxProtectedCorrectionPx : 0;
  const correctionLimit = Math.max(
    maxElasticCorrectionPx * elasticity ** 4,
    preventiveProtectedSlack
  );
  if (correctionLength <= correctionLimit) return translated;
  if (correctionLimit <= 0 || correctionLength <= 1e-9) return registered;
  if (protection > 0) {
    return pixelPointTowardWithinDistance(registered, translated, correctionLimit);
  }
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
  fallbackFrame,
  targetFrame,
  maxProtectedCorrectionPx,
  protectedCorrectionViewportIds
}) {
  const pendingDirectIds = new Set(pending.filter((id) => protectionById[id] === 255));
  if (pendingDirectIds.size === 0) return new Map();

  const components = pendingDirectComponentsByAdjacency({
    neighborsById,
    pendingDirectIds
  });
  const frameByPendingId = new Map();
  for (const pendingComponentIds of components) {
    const globalComponentId = validatePendingDirectComponent({
      pendingComponentIds,
      directProtectionComponentById
    });
    const retainedIds = protectedRetainedComponentIds({
      positions,
      projectedById,
      pendingIds: pendingComponentIds,
      neighborsById,
      protectionById,
      rigidRegistrationIds
    });
    if (retainedIds.length === 0) {
      retainedIds.push(...visibleGlobalProtectionComponentIds({
        positions,
        projectedById,
        rigidRegistrationIds,
        directProtectionComponentById,
        globalComponentId
      }));
      if (retainedIds.length === 0) {
        for (const id of pendingComponentIds) frameByPendingId.set(id, targetFrame);
        continue;
      }
    }
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
    const correctionLimitById = gradedProtectedCorrectionLimits({
      pendingIds: pendingComponentIds,
      positions,
      projectedById,
      neighborsById,
      protectionById,
      protectedCorrectionViewportIds,
      visibleLimitPx: maxProtectedCorrectionPx
    });
    for (const id of pendingComponentIds) {
      const projected = projectedById.get(id);
      assertFinitePoint(projected, `Projected protected tile ${id}`);
      const source = registeredPoint(projected, componentFrame);
      const target = registeredPoint(projected, targetFrame);
      const corrected = pixelPointTowardWithinDistance(
        source,
        target,
        correctionLimitById.get(id)
      );
      frameByPendingId.set(id, {
        anchorPosition: corrected,
        anchorProjected: projected,
        cos: 1,
        sin: 0
      });
    }
  }
  return frameByPendingId;
}

function gradedProtectedCorrectionLimits({
  pendingIds,
  positions,
  projectedById,
  neighborsById,
  protectionById,
  protectedCorrectionViewportIds,
  visibleLimitPx
}) {
  if (protectedCorrectionViewportIds === null) {
    return new Map(pendingIds.map((id) => [id, visibleLimitPx]));
  }
  const pendingSet = new Set(pendingIds);
  const distanceById = new Map();
  const queue = [];
  for (const id of pendingIds) {
    const touchesRetainedProtectedTile = neighborsById[id].some((neighborId) => (
      !pendingSet.has(neighborId) &&
      protectionById[neighborId] === 255 &&
      positions.has(neighborId) &&
      projectedById.has(neighborId)
    ));
    if (!protectedCorrectionViewportIds.has(id) && !touchesRetainedProtectedTile) continue;
    distanceById.set(id, 0);
    queue.push(id);
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    const nextDistance = distanceById.get(id) + 1;
    for (const neighborId of neighborsById[id]) {
      if (!pendingSet.has(neighborId) || distanceById.has(neighborId)) continue;
      distanceById.set(neighborId, nextDistance);
      queue.push(neighborId);
    }
  }
  return new Map(pendingIds.map((id) => [
    id,
    distanceById.has(id)
      ? visibleLimitPx * (distanceById.get(id) + 1)
      : Number.POSITIVE_INFINITY
  ]));
}

function pixelPointTowardWithinDistance(origin, target, maximumDistance) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= maximumDistance) return target;
  if (maximumDistance < 1) return origin;

  const radius = Math.floor(maximumDistance);
  let best = origin;
  let bestTargetDistance = distance;
  for (let offsetY = -radius; offsetY <= radius; offsetY++) {
    for (let offsetX = -radius; offsetX <= radius; offsetX++) {
      if (Math.hypot(offsetX, offsetY) > maximumDistance) continue;
      const candidate = {
        x: origin.x + offsetX,
        y: origin.y + offsetY
      };
      const targetDistance = Math.hypot(
        target.x - candidate.x,
        target.y - candidate.y
      );
      if (targetDistance >= bestTargetDistance) continue;
      best = candidate;
      bestTargetDistance = targetDistance;
    }
  }
  return best;
}

function pendingDirectComponentsByAdjacency({ neighborsById, pendingDirectIds }) {
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
        if (visited.has(neighborId) || !pendingDirectIds.has(neighborId)) continue;
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
    components.push(componentIds);
  }
  return components;
}

function validatePendingDirectComponent({
  pendingComponentIds,
  directProtectionComponentById
}) {
  if (!directProtectionComponentById) return null;
  const expectedComponentId = directProtectionComponentById[pendingComponentIds[0]];
  if (!Number.isInteger(expectedComponentId) || expectedComponentId < 0) {
    throw new Error(`Directly protected tile ${pendingComponentIds[0]} has no global component`);
  }
  for (const id of pendingComponentIds) {
    if (directProtectionComponentById[id] !== expectedComponentId) {
      throw new Error(`Pending protected component crosses global components at tile ${id}`);
    }
  }
  return expectedComponentId;
}

function protectedRetainedComponentIds({
  positions,
  projectedById,
  pendingIds,
  neighborsById,
  protectionById,
  rigidRegistrationIds
}) {
  const pendingSet = new Set(pendingIds);
  const retainedIds = new Set();
  const queue = [];
  for (const pendingId of pendingIds) {
    for (const neighborId of neighborsById[pendingId]) {
      if (
        pendingSet.has(neighborId) ||
        protectionById[neighborId] !== 255 ||
        !positions.has(neighborId) ||
        !projectedById.has(neighborId) ||
        (rigidRegistrationIds && !rigidRegistrationIds.has(neighborId))
      ) continue;
      retainedIds.add(neighborId);
      queue.push(neighborId);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const neighborId of neighborsById[id]) {
      if (
        retainedIds.has(neighborId) ||
        pendingSet.has(neighborId) ||
        protectionById[neighborId] !== 255 ||
        !positions.has(neighborId) ||
        !projectedById.has(neighborId) ||
        (rigidRegistrationIds && !rigidRegistrationIds.has(neighborId))
      ) continue;
      retainedIds.add(neighborId);
      queue.push(neighborId);
    }
  }
  return [...retainedIds];
}

function visibleGlobalProtectionComponentIds({
  positions,
  projectedById,
  rigidRegistrationIds,
  directProtectionComponentById,
  globalComponentId
}) {
  if (!directProtectionComponentById || globalComponentId === null) return [];
  const ids = [];
  for (const id of positions.keys()) {
    if (
      directProtectionComponentById[id] === globalComponentId &&
      projectedById.has(id) &&
      (!rigidRegistrationIds || rigidRegistrationIds.has(id))
    ) ids.push(id);
  }
  return ids;
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
  maxElasticCorrectionPx = MAX_ELASTIC_FRAME_CORRECTION_PX,
  maxProtectedCorrectionPx = 0,
  protectedCorrectionViewportIds = null,
  rigidAdmissionIds = null
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
  if (!Number.isFinite(maxProtectedCorrectionPx) || maxProtectedCorrectionPx < 0) {
    throw new Error(`Protected local layout correction limit must be non-negative: ${maxProtectedCorrectionPx}`);
  }
  if (
    protectedCorrectionViewportIds !== null &&
    !(protectedCorrectionViewportIds instanceof Set)
  ) {
    throw new Error("Protected local layout correction viewport ids must be a set");
  }
  if (rigidAdmissionIds !== null && !(rigidAdmissionIds instanceof Set)) {
    throw new Error("Rigid local layout admission ids must be a set");
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
  const translatedFallbackFrame = {
    anchorPosition: retainedFrame.anchorPosition,
    anchorProjected: retainedFrame.anchorProjected,
    cos: Math.cos(correctionRotation),
    sin: Math.sin(correctionRotation)
  };
  const translatedFrame = boundaryFittedFrame({
    ...boundaryArgs,
    rotation: correctionRotation,
    fallbackFrame: translatedFallbackFrame,
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
    fallbackFrame: registeredFrame,
    targetFrame: translatedFrame,
    maxProtectedCorrectionPx,
    protectedCorrectionViewportIds
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
      rigidAdmissionIds?.has(id) && protectionById[id] === 0
        ? registeredPoint(projected, registeredFrame)
        : protectedFrame
        ? registeredPoint(projected, protectedFrame)
        : admissionPointBetweenFrames(
          projected,
          registeredFrame,
          translatedFrame,
          protectionById[id],
          maxElasticCorrectionPx,
          protectedCorrectionViewportIds === null || protectedCorrectionViewportIds.has(id)
            ? maxProtectedCorrectionPx
            : Number.POSITIVE_INFINITY
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
  tileVisualRadius,
  authoritativePositions = null,
  viewX = viewportWidth / 2,
  viewY = viewportHeight / 2
}) {
  if (authoritativePositions !== null && !(authoritativePositions instanceof Map)) {
    throw new Error("Elastic viewport authoritative positions must be a map");
  }
  assertFinitePoint({ x: viewX, y: viewY }, "Elastic viewport view position");
  const viewportTiles = projectedTiles.map((tile) => {
    const position = authoritativePositions?.get(tile.id);
    if (!position) return tile;
    assertFinitePoint(position, `Authoritative viewport tile ${tile.id}`);
    return {
      id: tile.id,
      x: position.x + viewportWidth / 2 - viewX,
      y: position.y + viewportHeight / 2 - viewY
    };
  });
  const ids = projectedViewportTileIds({
    projectedTiles: viewportTiles,
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
  for (const tile of viewportTiles) {
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

export function settleVisibleElasticTilesWithinMotion({
  positions,
  projectedById,
  protectionById,
  movableTileIds,
  previousOffsetsById,
  currentOffsetsById,
  anchorId,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  viewX,
  viewY,
  maximumStepPx
}) {
  if (!(positions instanceof Map) || !(projectedById instanceof Map)) {
    throw new Error("Motion-hidden chart settlement requires position maps");
  }
  if (!(protectionById instanceof Uint8Array) || !(movableTileIds instanceof Set)) {
    throw new Error("Motion-hidden chart settlement requires protection and movable tile ids");
  }
  if (!(previousOffsetsById instanceof Map) || !(currentOffsetsById instanceof Map)) {
    throw new Error("Motion-hidden chart settlement requires presented offset maps");
  }
  if (!Number.isInteger(anchorId) || !positions.has(anchorId)) {
    throw new Error(`Motion-hidden chart settlement requires a retained anchor: ${anchorId}`);
  }
  for (const [label, value] of [
    ["viewport width", viewportWidth],
    ["viewport height", viewportHeight],
    ["tile visual radius", tileVisualRadius],
    ["maximum step", maximumStepPx]
  ]) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Motion-hidden chart settlement ${label} must be positive: ${value}`);
    }
  }
  assertFinitePoint({ x: viewX, y: viewY }, "Motion-hidden chart view position");
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Motion-hidden chart anchor position ${anchorId}`);
  assertFinitePoint(anchorProjected, `Motion-hidden chart projected anchor ${anchorId}`);

  let settled = 0;
  for (const id of movableTileIds) {
    if (id === anchorId || protectionById[id] !== 0) continue;
    const position = positions.get(id);
    const projected = projectedById.get(id);
    if (!position || !projected) continue;
    const previousOffset = previousOffsetsById.get(id);
    const currentOffset = currentOffsetsById.get(id);
    assertFinitePoint(position, `Motion-hidden chart position ${id}`);
    assertFinitePoint(projected, `Motion-hidden chart projection ${id}`);
    assertFinitePoint(previousOffset, `Motion-hidden chart previous offset ${id}`);
    assertFinitePoint(currentOffset, `Motion-hidden chart current offset ${id}`);
    const priorScreenPosition = {
      x: position.x + viewportWidth / 2 - viewX + previousOffset.x,
      y: position.y + viewportHeight / 2 - viewY + previousOffset.y
    };
    if (!projectedTileOverlapsViewport(
      priorScreenPosition,
      viewportWidth,
      viewportHeight,
      tileVisualRadius
    )) continue;

    const targetX = anchorPosition.x + projected.x - anchorProjected.x;
    const targetY = anchorPosition.y + projected.y - anchorProjected.y;
    const shiftX = motionHiddenAxisShift(
      targetX - position.x,
      currentOffset.x - previousOffset.x,
      maximumStepPx
    );
    const shiftY = motionHiddenAxisShift(
      targetY - position.y,
      currentOffset.y - previousOffset.y,
      maximumStepPx
    );
    if (shiftX === 0 && shiftY === 0) continue;
    positions.set(id, {
      x: position.x + shiftX,
      y: position.y + shiftY
    });
    settled++;
  }
  return settled;
}

function motionHiddenAxisShift(desiredShift, presentedMotion, maximumStepPx) {
  if (
    Math.abs(desiredShift) < 0.5 ||
    presentedMotion === 0 ||
    Math.sign(desiredShift) === Math.sign(presentedMotion)
  ) {
    return 0;
  }
  return Math.sign(desiredShift) * Math.min(
    Math.round(Math.abs(desiredShift)),
    Math.abs(presentedMotion),
    Math.floor(maximumStepPx)
  );
}

export function refreshOffscreenLayoutTiles({
  positions,
  projectedTiles,
  protectionById,
  viewportWidth,
  viewportHeight,
  tileVisualRadius,
  anchorId,
  viewX = viewportWidth / 2,
  viewY = viewportHeight / 2
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Offscreen chart refresh requires a positions map");
  }
  if (!Number.isInteger(anchorId) || !positions.has(anchorId)) {
    throw new Error(`Offscreen chart refresh requires a retained anchor: ${anchorId}`);
  }
  assertFinitePoint({ x: viewX, y: viewY }, "Offscreen chart view position");
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
    const drawnPosition = positions.get(tile.id);
    const screenPosition = drawnPosition ? {
      x: drawnPosition.x + viewportWidth / 2 - viewX,
      y: drawnPosition.y + viewportHeight / 2 - viewY
    } : null;
    if (
      tile.id === anchorId ||
      (screenPosition && projectedTileOverlapsViewport(
        screenPosition,
        viewportWidth,
        viewportHeight,
        tileVisualRadius
      ))
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
