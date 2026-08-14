import {
  exactNorthUpLayoutPosition,
  planChartSettlementTowardTargets
} from "./chartReframe.js";

function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

export const MAX_ELASTIC_FRAME_CORRECTION_PX = 29;
export const MAX_PROTECTED_ADMISSION_SLACK_PX = 3;
const MAX_ELASTIC_ROTATION_CORRECTION_RAD = Math.PI;
const MIN_ELASTIC_CORRECTION_TILES = 3;
// Two independently admitted endpoints may each use the protected slack;
// integer raster placement supplies the remaining two-pixel tolerance.
const MAX_PROTECTED_STITCH_ERROR_PX = MAX_PROTECTED_ADMISSION_SLACK_PX * 2 + 2.1;

export function chartAdmissionCorrectionPolicy({
  support,
  protectionById,
  elasticityMaskById,
  continuityMaskById,
  viewportWidth,
  viewportHeight,
  waterContinuityClass = 1
}) {
  if (
    !support ||
    !(support.viewportTileIds instanceof Set) ||
    !(support.elasticTileIds instanceof Set) ||
    typeof support.correctionActive !== "boolean"
  ) {
    throw new Error("Chart admission correction policy requires elastic viewport support");
  }
  for (const [label, value] of Object.entries({ viewportWidth, viewportHeight })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Chart admission correction policy has invalid ${label}: ${value}`);
    }
  }
  if (!(protectionById instanceof Uint8Array)) {
    throw new Error("Chart admission correction policy requires tile protection");
  }
  if (!(elasticityMaskById instanceof Uint8Array)) {
    throw new Error("Chart admission correction policy requires an elasticity mask");
  }
  if (!(continuityMaskById instanceof Uint8Array)) {
    throw new Error("Chart admission correction policy requires a continuity mask");
  }
  if (!Number.isInteger(waterContinuityClass) || waterContinuityClass <= 0) {
    throw new Error(
      `Chart admission correction policy has invalid water class: ${waterContinuityClass}`
    );
  }
  const fullyElasticWater = support.viewportTileIds.size > 0 &&
    [...support.viewportTileIds].every((id) => (
      protectionById[id] === 0 &&
      elasticityMaskById[id] !== 0 &&
      continuityMaskById[id] === waterContinuityClass
    ));
  return Object.freeze({
    registrationIds: support.correctionActive
      ? support.elasticTileIds
      : support.viewportTileIds,
    correctElasticTilesNorthUp: support.correctionActive,
    maxElasticCorrectionPx: support.correctionActive
      ? fullyElasticWater
        ? Math.hypot(viewportWidth, viewportHeight)
        : MAX_ELASTIC_FRAME_CORRECTION_PX
      : 0,
    fullyElasticWater
  });
}

export function chartAdmissionTileMayMove({
  newlyAdmitted = false,
  concealed = false,
  overlapsAuthoritativeViewport
}) {
  for (const [label, value] of Object.entries({
    newlyAdmitted,
    concealed,
    overlapsAuthoritativeViewport
  })) {
    if (typeof value !== "boolean") {
      throw new Error(`Chart admission ${label} must be boolean`);
    }
  }
  return newlyAdmitted || concealed || !overlapsAuthoritativeViewport;
}

export class ProtectedChartStitchError extends Error {
  constructor({ tileId, neighborId, maximumErrorPx, actualErrorPx }) {
    super(
      `Protected chart edge ${tileId}:${neighborId} cannot be stitched ` +
        `within ${maximumErrorPx.toFixed(2)}px (error ${actualErrorPx.toFixed(2)}px)`
    );
    this.name = this.constructor.name;
    this.tileId = tileId;
    this.neighborId = neighborId;
    this.maximumErrorPx = maximumErrorPx;
    this.actualErrorPx = actualErrorPx;
  }
}

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
  maxProtectedCorrectionPx,
  maxContinuityCorrectionPx
) {
  const registered = registeredPoint(projected, registeredFrame);
  const translated = registeredPoint(projected, translatedFrame);
  const correctionX = translated.x - registered.x;
  const correctionY = translated.y - registered.y;
  const correctionLength = Math.hypot(correctionX, correctionY);
  const elasticity = 1 - protection / 255;
  const preventiveProtectedSlack = protection > 0 ? maxProtectedCorrectionPx : 0;
  const correctionLimit = Math.min(
    Math.max(
      maxElasticCorrectionPx * elasticity ** 4,
      preventiveProtectedSlack
    ),
    maxContinuityCorrectionPx
  );
  if (correctionLength <= correctionLimit) return translated;
  if (correctionLimit <= 0 || correctionLength <= 1e-9) return registered;
  if (protection > 0 || Number.isFinite(maxContinuityCorrectionPx)) {
    return pixelPointTowardWithinDistance(registered, translated, correctionLimit);
  }
  const scale = correctionLimit / correctionLength;
  return {
    x: roundPixel(registered.x + correctionX * scale),
    y: roundPixel(registered.y + correctionY * scale)
  };
}

function directlyProtectedAdmissionPoints({
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
  liveViewportAdmissionIds
}) {
  const pendingDirectIds = new Set(pending.filter((id) => protectionById[id] === 255));
  if (pendingDirectIds.size === 0) return new Map();
  if (maxProtectedCorrectionPx === 0) {
    return rigidProtectedAdmissionPoints({
      positions,
      projectedById,
      pendingDirectIds,
      neighborsById,
      protectionById,
      directProtectionComponentById,
      targetFrame
    });
  }

  const livePendingIds = liveViewportAdmissionIds === null
    ? pendingDirectIds
    : new Set([...pendingDirectIds].filter((id) => liveViewportAdmissionIds.has(id)));
  const hiddenPendingIds = new Set(
    [...pendingDirectIds].filter((id) => !livePendingIds.has(id))
  );
  const components = [livePendingIds, hiddenPendingIds].flatMap((ids) => (
    ids.size === 0
      ? []
      : pendingDirectComponentsByAdjacency({ neighborsById, pendingDirectIds: ids })
  ));
  const workingPositions = new Map(positions);
  const pointByPendingId = new Map();
  for (const pendingComponentIds of components) {
    validatePendingDirectComponent({
      pendingComponentIds,
      directProtectionComponentById
    });
    const retainedIds = protectedRetainedComponentIds({
      positions: workingPositions,
      projectedById,
      pendingIds: pendingComponentIds,
      neighborsById,
      protectionById,
      rigidRegistrationIds
    });
    const entersLiveViewport = livePendingIds.has(pendingComponentIds[0]);
    let componentFrame = targetFrame;
    if (entersLiveViewport && retainedIds.length === 1) {
      const retainedId = retainedIds[0];
      componentFrame = {
        anchorPosition: workingPositions.get(retainedId),
        anchorProjected: projectedById.get(retainedId),
        cos: fallbackFrame.cos,
        sin: fallbackFrame.sin
      };
    } else if (entersLiveViewport && retainedIds.length > 1) {
      componentFrame = registeredProjectionFrame(
        workingPositions,
        projectedById,
        retainedIds[0],
        new Set(retainedIds)
      );
    }
    if (retainedIds.length > 0) {
      componentFrame = boundaryFittedFrame({
        positions: workingPositions,
        projectedById,
        pending: pendingComponentIds,
        neighborsById,
        protectionById,
        rotation: entersLiveViewport
          ? Math.atan2(componentFrame.sin, componentFrame.cos)
          : Math.atan2(targetFrame.sin, targetFrame.cos),
        fallbackFrame: componentFrame,
        directProtectedBoundariesOnly: true
      });
    }
    const componentRotation = Math.atan2(componentFrame.sin, componentFrame.cos);
    const targetRotation = Math.atan2(targetFrame.sin, targetFrame.cos);
    const rotationCorrection = clampMagnitude(
      normalizeRadians(targetRotation - componentRotation),
      protectedRotationCorrectionLimit({
        pendingComponentIds,
        projectedById,
        neighborsById,
        protectionById,
        maximumEdgeShiftPx: maxProtectedCorrectionPx
      })
    );
    if (Math.abs(rotationCorrection) > 1e-9) {
      componentFrame = boundaryFittedFrame({
        positions: workingPositions,
        projectedById,
        pending: pendingComponentIds,
        neighborsById,
        protectionById,
        rotation: componentRotation + rotationCorrection,
        fallbackFrame: componentFrame,
        directProtectedBoundariesOnly: retainedIds.length > 0
      });
    }
    const componentPoints = new Map();
    for (const id of pendingComponentIds) {
      const projected = projectedById.get(id);
      assertFinitePoint(projected, `Projected protected tile ${id}`);
      componentPoints.set(id, registeredPoint(projected, componentFrame));
    }
    relaxProtectedComponentEdges({
      componentPoints,
      pendingComponentIds,
      positions: workingPositions,
      projectedById,
      neighborsById,
      protectionById,
      targetFrame: componentFrame,
      maximumEdgeErrorPx: maxProtectedCorrectionPx
    });
    for (const [id, point] of componentPoints) {
      pointByPendingId.set(id, point);
      workingPositions.set(id, point);
    }
  }
  return pointByPendingId;
}

function rigidProtectedAdmissionPoints({
  positions,
  projectedById,
  pendingDirectIds,
  neighborsById,
  protectionById,
  directProtectionComponentById,
  targetFrame
}) {
  const components = pendingDirectComponentsByAdjacency({
    neighborsById,
    pendingDirectIds
  });
  const workingPositions = new Map(positions);
  const pointByPendingId = new Map();
  for (const pendingComponentIds of components) {
    validatePendingDirectComponent({
      pendingComponentIds,
      directProtectionComponentById
    });
    const orderedIds = protectedAdmissionOrder({
      pendingComponentIds,
      workingPositions,
      neighborsById,
      protectionById
    });
    for (const id of orderedIds) {
      const projected = projectedById.get(id);
      assertFinitePoint(projected, `Projected protected tile ${id}`);
      const immediateNeighborIds = neighborsById[id].filter((neighborId) => (
        protectionById[neighborId] === 255 &&
        workingPositions.has(neighborId) &&
        projectedById.has(neighborId)
      ));
      const adjacencyFrame = protectedAdjacencyFrame({
        id,
        immediateNeighborIds,
        workingPositions,
        projectedById,
        neighborsById,
        protectionById,
        fallbackFrame: targetFrame
      });
      const point = registeredPoint(projected, adjacencyFrame);
      pointByPendingId.set(id, point);
      workingPositions.set(id, point);
    }
  }
  return pointByPendingId;
}

function protectedAdmissionOrder({
  pendingComponentIds,
  workingPositions,
  neighborsById,
  protectionById
}) {
  const pendingSet = new Set(pendingComponentIds);
  const queued = new Set();
  const queue = [];
  for (const id of pendingComponentIds) {
    if (!neighborsById[id].some((neighborId) => (
      !pendingSet.has(neighborId) &&
      protectionById[neighborId] === 255 &&
      workingPositions.has(neighborId)
    ))) continue;
    queued.add(id);
    queue.push(id);
  }
  if (queue.length === 0) {
    queued.add(pendingComponentIds[0]);
    queue.push(pendingComponentIds[0]);
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const neighborId of neighborsById[id]) {
      if (!pendingSet.has(neighborId) || queued.has(neighborId)) continue;
      queued.add(neighborId);
      queue.push(neighborId);
    }
  }
  if (queue.length !== pendingComponentIds.length) {
    throw new Error("Protected pending component could not be traversed by adjacency");
  }
  return queue;
}

function protectedAdjacencyFrame({
  id,
  immediateNeighborIds,
  workingPositions,
  projectedById,
  neighborsById,
  protectionById,
  fallbackFrame
}) {
  if (immediateNeighborIds.length === 0) return fallbackFrame;
  const supportIds = new Set(immediateNeighborIds);
  if (supportIds.size === 1) {
    const neighborId = immediateNeighborIds[0];
    for (const supportId of neighborsById[neighborId]) {
      if (
        supportId === id ||
        protectionById[supportId] !== 255 ||
        !workingPositions.has(supportId) ||
        !projectedById.has(supportId)
      ) continue;
      supportIds.add(supportId);
    }
  }
  if (supportIds.size === 1) {
    const neighborId = immediateNeighborIds[0];
    return {
      anchorPosition: workingPositions.get(neighborId),
      anchorProjected: projectedById.get(neighborId),
      cos: fallbackFrame.cos,
      sin: fallbackFrame.sin
    };
  }
  return registeredProjectionFrame(
    workingPositions,
    projectedById,
    immediateNeighborIds[0],
    supportIds
  );
}

function protectedRotationCorrectionLimit({
  pendingComponentIds,
  projectedById,
  neighborsById,
  protectionById,
  maximumEdgeShiftPx
}) {
  if (maximumEdgeShiftPx <= 0) return 0;
  let maximumEdgeLength = 0;
  const pendingSet = new Set(pendingComponentIds);
  for (const id of pendingComponentIds) {
    for (const neighborId of neighborsById[id]) {
      if (
        protectionById[neighborId] !== 255 ||
        !projectedById.has(neighborId) ||
        (pendingSet.has(neighborId) && neighborId < id)
      ) continue;
      maximumEdgeLength = Math.max(maximumEdgeLength, Math.hypot(
        projectedById.get(id).x - projectedById.get(neighborId).x,
        projectedById.get(id).y - projectedById.get(neighborId).y
      ));
    }
  }
  if (maximumEdgeLength <= 1e-9) return 0;
  return 2 * Math.asin(Math.min(1, maximumEdgeShiftPx / (2 * maximumEdgeLength)));
}

function normalizeRadians(value) {
  let normalized = value;
  while (normalized <= -Math.PI) normalized += Math.PI * 2;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  return normalized;
}

function relaxProtectedComponentEdges({
  componentPoints,
  pendingComponentIds,
  positions,
  projectedById,
  neighborsById,
  protectionById,
  targetFrame,
  maximumEdgeErrorPx
}) {
  const pendingSet = new Set(pendingComponentIds);
  const edgeConstraints = [];
  for (const id of pendingComponentIds) {
    for (const neighborId of neighborsById[id]) {
      if (
        protectionById[neighborId] !== 255 ||
        !projectedById.has(neighborId) ||
        (!pendingSet.has(neighborId) && !positions.has(neighborId)) ||
        (pendingSet.has(neighborId) && neighborId < id)
      ) continue;
      const projectedDx = projectedById.get(id).x - projectedById.get(neighborId).x;
      const projectedDy = projectedById.get(id).y - projectedById.get(neighborId).y;
      edgeConstraints.push({
        id,
        neighborId,
        neighborIsPending: pendingSet.has(neighborId),
        expectedDistance: Math.hypot(projectedDx, projectedDy),
        expectedDx: projectedDx * targetFrame.cos - projectedDy * targetFrame.sin,
        expectedDy: projectedDx * targetFrame.sin + projectedDy * targetFrame.cos
      });
    }
  }
  if (edgeConstraints.length === 0) return;
  // Keep a little headroom for integer-pixel rounding and for components
  // constrained by more than one retained coastline boundary.
  const allowedError = Math.max(0, maximumEdgeErrorPx - 1);
  for (let iteration = 0; iteration < 96; iteration++) {
    let maximumViolation = 0;
    const reverse = iteration % 2 === 1;
    for (let edgeIndex = 0; edgeIndex < edgeConstraints.length; edgeIndex++) {
      const constraint = edgeConstraints[
        reverse ? edgeConstraints.length - edgeIndex - 1 : edgeIndex
      ];
      const point = componentPoints.get(constraint.id);
      const neighbor = constraint.neighborIsPending
        ? componentPoints.get(constraint.neighborId)
        : positions.get(constraint.neighborId);
      const errorX = point.x - neighbor.x - constraint.expectedDx;
      const errorY = point.y - neighbor.y - constraint.expectedDy;
      const error = Math.hypot(errorX, errorY);
      const violation = error - allowedError;
      if (violation <= 0) continue;
      maximumViolation = Math.max(maximumViolation, violation);
      const correctionScale = violation / error;
      const moveScale = constraint.neighborIsPending ? 0.5 : 1;
      point.x -= errorX * correctionScale * moveScale;
      point.y -= errorY * correctionScale * moveScale;
      if (constraint.neighborIsPending) {
        neighbor.x += errorX * correctionScale * moveScale;
        neighbor.y += errorY * correctionScale * moveScale;
      }
    }
    if (maximumViolation < 0.05) break;
  }
  for (const [id, point] of componentPoints) {
    componentPoints.set(id, {
      x: roundPixel(point.x),
      y: roundPixel(point.y)
    });
  }
  for (const constraint of edgeConstraints) {
    const point = componentPoints.get(constraint.id);
    const neighbor = constraint.neighborIsPending
      ? componentPoints.get(constraint.neighborId)
      : positions.get(constraint.neighborId);
    const error = Math.abs(
      Math.hypot(point.x - neighbor.x, point.y - neighbor.y) - constraint.expectedDistance
    );
    if (error > MAX_PROTECTED_STITCH_ERROR_PX) {
      throw new ProtectedChartStitchError({
        tileId: constraint.id,
        neighborId: constraint.neighborId,
        maximumErrorPx: MAX_PROTECTED_STITCH_ERROR_PX,
        actualErrorPx: error
      });
    }
  }
}

function gradedContinuityCorrectionLimits({
  pendingIds,
  positions,
  neighborsById,
  continuityMaskById,
  liveViewportAdmissionIds,
  perEdgeLimitPx,
  perClassLimitPx
}) {
  if (continuityMaskById === null) return null;
  const pendingSet = new Set(pendingIds);
  const distanceById = new Map();
  const queue = [];
  for (const id of pendingIds) {
    if (continuityMaskById[id] === 0) continue;
    const touchesRetainedContinuousTile = neighborsById[id].some((neighborId) => (
      !pendingSet.has(neighborId) &&
      continuityMaskById[neighborId] === continuityMaskById[id] &&
      positions.has(neighborId)
    ));
    if (!touchesRetainedContinuousTile && !liveViewportAdmissionIds?.has(id)) continue;
    distanceById.set(id, 0);
    queue.push(id);
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    const nextDistance = distanceById.get(id) + 1;
    for (const neighborId of neighborsById[id]) {
      if (
        !pendingSet.has(neighborId) ||
        continuityMaskById[neighborId] !== continuityMaskById[id] ||
        distanceById.has(neighborId)
      ) continue;
      distanceById.set(neighborId, nextDistance);
      queue.push(neighborId);
    }
  }
  return new Map(pendingIds.map((id) => [
    id,
    continuityMaskById[id] === 0
      ? Number.POSITIVE_INFINITY
      : liveViewportAdmissionIds?.has(id)
      ? 0
      : distanceById.has(id)
      ? continuityCorrectionLimitForId({
          id,
          continuityMaskById,
          defaultLimitPx: perEdgeLimitPx,
          perClassLimitPx
        }) * (distanceById.get(id) + 1)
      : Number.POSITIVE_INFINITY
  ]));
}

function continuityCorrectionLimitForId({
  id,
  continuityMaskById,
  defaultLimitPx,
  perClassLimitPx
}) {
  if (continuityMaskById === null || perClassLimitPx === null) return defaultLimitPx;
  return perClassLimitPx.get(continuityMaskById[id]) ?? defaultLimitPx;
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
        protectionById[neighborId] === 0 ||
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
  continuityMaskById = null,
  maxContinuityCorrectionPx = 0,
  continuityCorrectionLimitsByClass = null,
  protectedCorrectionViewportIds = null,
  liveViewportAdmissionIds = null,
  recoverProtectedStitchError = null
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
    continuityMaskById !== null &&
    (!(continuityMaskById instanceof Uint8Array) ||
      continuityMaskById.length !== neighborsById.length)
  ) {
    throw new Error("Local layout continuity mask must cover every tile");
  }
  if (!Number.isFinite(maxContinuityCorrectionPx) || maxContinuityCorrectionPx < 0) {
    throw new Error(
      `Local layout continuity correction limit must be non-negative: ${maxContinuityCorrectionPx}`
    );
  }
  if (continuityCorrectionLimitsByClass !== null) {
    if (!(continuityCorrectionLimitsByClass instanceof Map)) {
      throw new Error("Local layout continuity correction class limits must be a map");
    }
    for (const [classId, limitPx] of continuityCorrectionLimitsByClass) {
      if (!Number.isInteger(classId) || classId <= 0 || classId > 255) {
        throw new Error(`Local layout continuity class must be in 1..255: ${classId}`);
      }
      if (!Number.isFinite(limitPx) || limitPx < 0) {
        throw new Error(
          `Local layout continuity class ${classId} has invalid correction limit: ${limitPx}`
        );
      }
    }
  }
  if (
    protectedCorrectionViewportIds !== null &&
    !(protectedCorrectionViewportIds instanceof Set)
  ) {
    throw new Error("Protected local layout correction viewport ids must be a set");
  }
  if (liveViewportAdmissionIds !== null && !(liveViewportAdmissionIds instanceof Set)) {
    throw new Error("Live viewport admission ids must be a set");
  }
  if (
    recoverProtectedStitchError !== null &&
    typeof recoverProtectedStitchError !== "function"
  ) {
    throw new Error("Protected chart stitch recovery must be a function");
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
  const protectedAdmissionArgs = {
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
    liveViewportAdmissionIds
  };
  let protectedPointById;
  try {
    protectedPointById = directlyProtectedAdmissionPoints(protectedAdmissionArgs);
  } catch (error) {
    if (
      !(error instanceof ProtectedChartStitchError) ||
      !recoverProtectedStitchError ||
      recoverProtectedStitchError(error) !== true
    ) {
      throw error;
    }
    // The failed solve only touched temporary component positions. Re-admit
    // protected geometry in the retained frame, without the preventative
    // north-up nudge that made this protected boundary over-constrained.
    protectedPointById = directlyProtectedAdmissionPoints({
      ...protectedAdmissionArgs,
      maxProtectedCorrectionPx: 0
    });
  }
  const continuityCorrectionLimitById = gradedContinuityCorrectionLimits({
    pendingIds: pending,
    positions,
    neighborsById,
    continuityMaskById,
    liveViewportAdmissionIds,
    perEdgeLimitPx: maxContinuityCorrectionPx,
    perClassLimitPx: continuityCorrectionLimitsByClass
  });
  const continuityPositions = new Map(positions);
  // A pending tile can be encountered before an adjacent protected tile in
  // projection order. Seed the solved protected points up front so admission
  // never compresses same-surface neighbors merely because of array order.
  for (const [id, point] of protectedPointById) {
    continuityPositions.set(id, point);
  }
  let admitted = 0;
  for (const id of pending) {
    if (positions.has(id)) throw new Error(`Pending local layout tile ${id} already has a position`);
    if (!Array.isArray(neighborsById[id])) {
      throw new Error(`Local layout admission is missing neighbors for tile ${id}`);
    }
    const projected = projectedById.get(id);
    assertFinitePoint(projected, `Projected position for pending tile ${id}`);
    const protectedPoint = protectedPointById.get(id);
    const continuityCorrectionLimitPx = continuityCorrectionLimitForId({
      id,
      continuityMaskById,
      defaultLimitPx: maxContinuityCorrectionPx,
      perClassLimitPx: continuityCorrectionLimitsByClass
    });
    const framePoint = protectedPoint ?? admissionPointBetweenFrames(
      projected,
      registeredFrame,
      translatedFrame,
      protectionById[id],
      maxElasticCorrectionPx,
      protectedCorrectionViewportIds === null || protectedCorrectionViewportIds.has(id)
        ? maxProtectedCorrectionPx
        : Number.POSITIVE_INFINITY,
      continuityCorrectionLimitById?.get(id) ?? Number.POSITIVE_INFINITY
    );
    const point = protectedPoint ?? continuityAnchoredAdmissionPoint({
      id,
      framePoint,
      continuityPositions,
      projectedById,
      neighborsById,
      protectionById,
      continuityMaskById,
      registeredFrame,
      maximumSlackPx: continuityCorrectionLimitPx
    });
    positions.set(id, point);
    continuityPositions.set(id, point);
    admitted++;
  }
  reconcilePendingContinuityEdges({
    positions,
    projectedById,
    pendingIds: pending,
    neighborsById,
    protectionById,
    continuityMaskById,
    registeredFrame,
    defaultMaximumSlackPx: maxContinuityCorrectionPx,
    maximumSlackPxByClass: continuityCorrectionLimitsByClass
  });
  settlePendingContinuityEdgeLengths({
    positions,
    projectedById,
    pendingIds: pending,
    neighborsById,
    continuityMaskById,
    defaultMaximumSlackPx: maxContinuityCorrectionPx,
    maximumSlackPxByClass: continuityCorrectionLimitsByClass
  });

  return admitted;
}

function settlePendingContinuityEdgeLengths({
  positions,
  projectedById,
  pendingIds,
  neighborsById,
  continuityMaskById,
  defaultMaximumSlackPx,
  maximumSlackPxByClass
}) {
  if (continuityMaskById === null || pendingIds.length === 0) return;
  const pendingSet = new Set(pendingIds.filter((id) => continuityMaskById[id] !== 0));
  if (pendingSet.size === 0) return;
  const topologyIds = new Set(pendingSet);
  for (const id of pendingSet) {
    for (const neighborId of neighborsById[id]) {
      if (positions.has(neighborId) && projectedById.has(neighborId)) {
        topologyIds.add(neighborId);
      }
    }
  }
  const referencePositions = new Map(
    [...topologyIds].map((id) => [id, projectedById.get(id)])
  );
  const targetsById = new Map(
    [...pendingSet].map((id) => [id, positions.get(id)])
  );
  const waterSlackPx = maximumSlackPxByClass?.get(1) ?? defaultMaximumSlackPx;
  const landSlackPx = maximumSlackPxByClass?.get(2) ?? defaultMaximumSlackPx;
  const settlement = planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds: pendingSet,
    maximumStepPx: Number.POSITIVE_INFINITY,
    referencePositions,
    neighborsById,
    surfaceMaskById: continuityMaskById,
    landSlackPx,
    waterSlackPx
  });
  for (const [id, position] of settlement.settledPositions) positions.set(id, position);
}

function reconcilePendingContinuityEdges({
  positions,
  projectedById,
  pendingIds,
  neighborsById,
  protectionById,
  continuityMaskById,
  registeredFrame,
  defaultMaximumSlackPx,
  maximumSlackPxByClass
}) {
  if (
    continuityMaskById === null ||
    (defaultMaximumSlackPx <= 0 && maximumSlackPxByClass === null)
  ) return;
  // Pending order is a projection detail, not topology. A final pass lets a
  // tile admitted before one of its neighbours use the complete new boundary
  // without moving any geography that was already on screen.
  for (let iteration = 0; iteration < 3; iteration++) {
    let changed = false;
    for (const id of pendingIds) {
      if (protectionById[id] === 255 || continuityMaskById[id] === 0) continue;
      const current = positions.get(id);
      const maximumSlackPx = continuityCorrectionLimitForId({
        id,
        continuityMaskById,
        defaultLimitPx: defaultMaximumSlackPx,
        perClassLimitPx: maximumSlackPxByClass
      });
      if (maximumSlackPx <= 0) continue;
      const reconciled = continuityAnchoredAdmissionPoint({
        id,
        framePoint: current,
        continuityPositions: positions,
        projectedById,
        neighborsById,
        protectionById,
        continuityMaskById,
        registeredFrame,
        maximumSlackPx
      });
      if (reconciled.x === current.x && reconciled.y === current.y) continue;
      positions.set(id, reconciled);
      changed = true;
    }
    if (!changed) break;
  }
}

function continuityAnchoredAdmissionPoint({
  id,
  framePoint,
  continuityPositions,
  projectedById,
  neighborsById,
  protectionById,
  continuityMaskById,
  registeredFrame,
  maximumSlackPx
}) {
  if (continuityMaskById === null || continuityMaskById[id] === 0) return framePoint;
  const neighborIds = neighborsById[id].filter((neighborId) => (
    continuityMaskById[neighborId] === continuityMaskById[id] &&
    continuityPositions.has(neighborId) &&
    projectedById.has(neighborId)
  ));
  if (neighborIds.length === 0) return framePoint;
  let best = null;
  for (const anchorId of neighborIds) {
    const adjacencyPoint = registeredPoint(projectedById.get(id), {
      anchorPosition: continuityPositions.get(anchorId),
      anchorProjected: projectedById.get(anchorId),
      cos: registeredFrame.cos,
      sin: registeredFrame.sin
    });
    const candidate = pixelPointTowardWithinDistance(
      adjacencyPoint,
      framePoint,
      maximumSlackPx
    );
    const maximumEdgeError = neighborIds.reduce((largest, neighborId) => {
      const neighbor = continuityPositions.get(neighborId);
      const projectedNeighbor = projectedById.get(neighborId);
      const visualDistance = Math.hypot(candidate.x - neighbor.x, candidate.y - neighbor.y);
      const projectedDistance = Math.hypot(
        projectedById.get(id).x - projectedNeighbor.x,
        projectedById.get(id).y - projectedNeighbor.y
      );
      return Math.max(largest, Math.abs(visualDistance - projectedDistance));
    }, 0);
    const targetDistance = Math.hypot(candidate.x - framePoint.x, candidate.y - framePoint.y);
    if (
      best === null ||
      maximumEdgeError < best.maximumEdgeError - 1e-9 ||
      (Math.abs(maximumEdgeError - best.maximumEdgeError) <= 1e-9 &&
        protectionById[anchorId] > best.anchorProtection) ||
      (Math.abs(maximumEdgeError - best.maximumEdgeError) <= 1e-9 &&
        protectionById[anchorId] === best.anchorProtection &&
        targetDistance < best.targetDistance)
    ) {
      best = {
        point: candidate,
        maximumEdgeError,
        anchorProtection: protectionById[anchorId],
        targetDistance
      };
    }
  }
  return best.point;
}

function clampMagnitude(value, maximumMagnitude) {
  return Math.max(-maximumMagnitude, Math.min(maximumMagnitude, value));
}

export function viewportElasticCorrectionSupport({
  projectedTiles,
  protectionById,
  elasticityMaskById = null,
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
  if (
    elasticityMaskById !== null &&
    (!(elasticityMaskById instanceof Uint8Array) ||
      elasticityMaskById.length !== protectionById.length)
  ) {
    throw new Error("Elastic viewport mask must cover every protected tile");
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
    if (
      !ids.has(tile.id) ||
      protectionById[tile.id] !== 0 ||
      elasticityMaskById && elasticityMaskById[tile.id] === 0
    ) continue;
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

export function resolveLocalLayoutAnchor({
  positions,
  projectedById,
  preferredAnchorId,
  viewX,
  viewY
}) {
  if (!(positions instanceof Map)) {
    throw new Error("Local layout anchor resolution requires a positions map");
  }
  if (!(projectedById instanceof Map)) {
    throw new Error("Local layout anchor resolution requires projected positions");
  }
  if (!Number.isInteger(preferredAnchorId) || preferredAnchorId < 0) {
    throw new Error(`Local layout preferred anchor is invalid: ${preferredAnchorId}`);
  }
  assertFinitePoint({ x: viewX, y: viewY }, "Local layout anchor view position");
  if (positions.has(preferredAnchorId)) return preferredAnchorId;

  let nearestId = null;
  let nearestDistance = Infinity;
  for (const [id, position] of positions.entries()) {
    if (!projectedById.has(id)) continue;
    const distance = Math.hypot(position.x - viewX, position.y - viewY);
    if (distance >= nearestDistance) continue;
    nearestId = id;
    nearestDistance = distance;
  }
  if (nearestId !== null) return nearestId;

  retainLocalLayoutAnchor({
    positions,
    anchorId: preferredAnchorId,
    viewX,
    viewY
  });
  return preferredAnchorId;
}

export function planVisibleElasticTilesWithinMotion({
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
  assertFinitePoint(positions.get(anchorId), `Motion-hidden chart anchor position ${anchorId}`);
  assertFinitePoint(
    projectedById.get(anchorId),
    `Motion-hidden chart projected anchor ${anchorId}`
  );

  const proposedPositions = new Map();
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

    const target = exactNorthUpLayoutPosition({
      projected,
      viewX,
      viewY,
      viewportWidth,
      viewportHeight
    });
    const shift = motionHiddenShift({
      desiredX: target.x - position.x,
      desiredY: target.y - position.y,
      presentedX: currentOffset.x - previousOffset.x,
      presentedY: currentOffset.y - previousOffset.y,
      maximumStepPx
    });
    const shiftX = shift.x;
    const shiftY = shift.y;
    if (shiftX === 0 && shiftY === 0) continue;
    proposedPositions.set(id, {
      x: position.x + shiftX,
      y: position.y + shiftY
    });
  }
  return proposedPositions;
}

function motionHiddenShift({
  desiredX,
  desiredY,
  presentedX,
  presentedY,
  maximumStepPx
}) {
  const desiredDistance = Math.hypot(desiredX, desiredY);
  const presentedDistance = Math.hypot(presentedX, presentedY);
  if (desiredDistance < 0.5 || presentedDistance < 0.5) return { x: 0, y: 0 };

  // A moving swell is visual cover for a small settlement in any direction.
  // Requiring its instantaneous axis to oppose the correction can strand a
  // rotated chart indefinitely when the wind remains steady.
  const motionBudget = Math.min(
    Math.floor(maximumStepPx),
    Math.max(1, Math.round(presentedDistance))
  );
  return pixelPointTowardWithinDistance(
    { x: 0, y: 0 },
    { x: desiredX, y: desiredY },
    motionBudget
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
