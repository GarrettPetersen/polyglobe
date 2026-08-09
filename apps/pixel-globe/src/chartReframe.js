export const NORTH_UP_POLE_TANGENT_EPSILON = 1e-6;
export const CHART_REFRAME_ROTATION_THRESHOLD_DEG = 1.5;
export const CHART_REFRAME_RMS_DISTORTION_THRESHOLD_PX = 1.5;
export const CHART_REFRAME_MAX_DISTORTION_THRESHOLD_PX = 4;
export const NORTH_UP_REBUILD_MAX_ROTATION_DEG = 0.75;
export const NORTH_UP_REBUILD_MAX_RMS_ERROR_PX = 0.75;
export const NORTH_UP_REBUILD_MAX_ERROR_PX = 1.5;

export function exactNorthUpLayoutPosition({
  projected,
  viewX,
  viewY,
  viewportWidth,
  viewportHeight
}) {
  if (!projected || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
    throw new Error("Exact north-up layout position requires a projected point");
  }
  if (!Number.isFinite(viewX) || !Number.isFinite(viewY)) {
    throw new Error("Exact north-up layout position requires a finite view");
  }
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
      !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Exact north-up layout position requires a positive viewport");
  }
  return {
    x: Math.round(viewX + projected.x - Math.round(viewportWidth / 2)),
    y: Math.round(viewY + projected.y - Math.round(viewportHeight / 2))
  };
}

export function createExactNorthUpRepairPlan({
  tileIds,
  retainedPositions,
  projectTile,
  viewX,
  viewY,
  viewportWidth,
  viewportHeight,
  excludedTileId = null
}) {
  if (!(tileIds instanceof Set) || !(retainedPositions instanceof Map)) {
    throw new Error("Exact north-up repair planning requires retained tiles");
  }
  if (typeof projectTile !== "function") {
    throw new Error("Exact north-up repair planning requires a projection function");
  }
  const plan = new Map();
  for (const id of tileIds) {
    if (!retainedPositions.has(id) || id === excludedTileId) continue;
    const projected = projectTile(id);
    if (!projected) continue;
    plan.set(id, Object.freeze(exactNorthUpLayoutPosition({
      projected,
      viewX,
      viewY,
      viewportWidth,
      viewportHeight
    })));
  }
  return plan;
}

export function interpolateChartRepairPlan({
  positions,
  targetsById,
  tileIds,
  maximumStepPx = 1
}) {
  if (!(positions instanceof Map) || !(targetsById instanceof Map) || !(tileIds instanceof Set)) {
    throw new Error("Chart repair interpolation requires position and target maps plus tile ids");
  }
  if (!Number.isInteger(maximumStepPx) || maximumStepPx <= 0) {
    throw new Error(`Chart repair interpolation has invalid pixel step: ${maximumStepPx}`);
  }
  const nextPositions = new Map();
  const completedTileIds = new Set();
  for (const id of tileIds) {
    const position = positions.get(id);
    const target = targetsById.get(id);
    if (!position || !target) continue;
    for (const [label, value] of Object.entries({
      positionX: position.x,
      positionY: position.y,
      targetX: target.x,
      targetY: target.y
    })) {
      if (!Number.isFinite(value)) {
        throw new Error(`Chart repair interpolation has invalid ${label} for tile ${id}`);
      }
    }
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    if (dx === 0 && dy === 0) {
      completedTileIds.add(id);
      continue;
    }
    const next = Object.freeze({
      x: position.x + Math.sign(dx) * Math.min(Math.abs(dx), maximumStepPx),
      y: position.y + Math.sign(dy) * Math.min(Math.abs(dy), maximumStepPx)
    });
    nextPositions.set(id, next);
    if (next.x === target.x && next.y === target.y) completedTileIds.add(id);
  }
  return { nextPositions, completedTileIds };
}

export function constrainChartRepairToTopology({
  positions,
  proposedPositions,
  referencePositions,
  neighborsById,
  surfaceMaskById,
  landSlackPx = 3,
  waterSlackPx = 6
}) {
  if (!(positions instanceof Map) || !(proposedPositions instanceof Map) ||
      !(referencePositions instanceof Map)) {
    throw new Error("Topology-constrained chart repair requires position maps");
  }
  if (!Array.isArray(neighborsById) || !(surfaceMaskById instanceof Uint8Array)) {
    throw new Error("Topology-constrained chart repair requires chart topology");
  }
  for (const [label, value] of Object.entries({ landSlackPx, waterSlackPx })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Topology-constrained chart repair has invalid ${label}: ${value}`);
    }
  }
  if (proposedPositions.size === 0) return new Map();

  const candidate = new Map(
    [...proposedPositions].filter(([id]) => positions.has(id))
  );
  for (let iteration = 0; iteration < 16; iteration++) {
    const violations = chartRepairTopologyViolations({
      positions,
      candidate,
      referencePositions,
      neighborsById,
      surfaceMaskById,
      landSlackPx,
      waterSlackPx
    });
    if (violations.size === 0) return candidate;
    let changed = false;
    for (const id of violations) {
      const current = positions.get(id);
      const proposed = candidate.get(id);
      if (!current || !proposed) continue;
      const reduced = {
        x: Math.round((current.x + proposed.x) / 2),
        y: Math.round((current.y + proposed.y) / 2)
      };
      if (reduced.x === current.x && reduced.y === current.y) candidate.delete(id);
      else candidate.set(id, reduced);
      changed = true;
    }
    if (!changed) break;
  }
  // A covered group may have incompatible fixed boundaries. Never return an
  // unresolved move: repeated repair ticks would otherwise accumulate a tear.
  while (candidate.size > 0) {
    const violations = chartRepairTopologyViolations({
      positions,
      candidate,
      referencePositions,
      neighborsById,
      surfaceMaskById,
      landSlackPx,
      waterSlackPx
    });
    if (violations.size === 0) break;
    for (const id of violations) candidate.delete(id);
  }
  return candidate;
}

function chartRepairTopologyViolations({
  positions,
  candidate,
  referencePositions,
  neighborsById,
  surfaceMaskById,
  landSlackPx,
  waterSlackPx
}) {
  const violations = new Set();
  for (const id of candidate.keys()) {
    const reference = referencePositions.get(id);
    if (!reference || !Array.isArray(neighborsById[id])) continue;
    for (const neighborId of neighborsById[id]) {
      if (neighborId < id && candidate.has(neighborId)) continue;
      const current = positions.get(id);
      const currentNeighbor = positions.get(neighborId);
      const referenceNeighbor = referencePositions.get(neighborId);
      if (!current || !currentNeighbor || !referenceNeighbor) continue;
      const next = candidate.get(id) ?? current;
      const nextNeighbor = candidate.get(neighborId) ?? currentNeighbor;
      const currentError = chartEdgeVectorError(
        current,
        currentNeighbor,
        reference,
        referenceNeighbor
      );
      const nextError = chartEdgeVectorError(
        next,
        nextNeighbor,
        reference,
        referenceNeighbor
      );
      const waterEdge = surfaceMaskById[id] === 1 && surfaceMaskById[neighborId] === 1;
      const allowedError = waterEdge ? waterSlackPx : landSlackPx;
      if (currentError <= allowedError + 1e-9) {
        if (nextError > allowedError + 1e-9) {
          violations.add(id);
          if (candidate.has(neighborId)) violations.add(neighborId);
        }
      } else if (nextError > currentError + 1e-9) {
        violations.add(id);
        if (candidate.has(neighborId)) violations.add(neighborId);
      }
    }
  }
  return violations;
}

function chartEdgeVectorError(a, b, referenceA, referenceB) {
  return Math.hypot(
    (b.x - a.x) - (referenceB.x - referenceA.x),
    (b.y - a.y) - (referenceB.y - referenceA.y)
  );
}

export function retainPositionLockedProjectedTiles({
  projectedTiles,
  positionLocks,
  projectTile,
  fallbackProjection
}) {
  if (!Array.isArray(projectedTiles) || !(positionLocks instanceof Map)) {
    throw new Error("Position-locked chart projection requires tiles and position locks");
  }
  if (typeof projectTile !== "function" || typeof fallbackProjection !== "function") {
    throw new Error("Position-locked chart projection requires projection functions");
  }
  const retained = projectedTiles.slice();
  const retainedIds = new Set(retained.map((tile) => tile.id));
  for (const [id, position] of positionLocks.entries()) {
    if (retainedIds.has(id)) continue;
    const projected = projectTile(id) ?? fallbackProjection(position);
    if (!projected || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
      throw new Error(`Position-locked chart tile ${id} has no finite projection`);
    }
    retained.push({ id, x: projected.x, y: projected.y });
    retainedIds.add(id);
  }
  return retained;
}

export function selectRepresentativeChartDriftCalls(calls, viewport) {
  if (!Array.isArray(calls)) throw new Error("Chart drift calls must be an array");
  const { viewX, viewY, halfWidth, halfHeight } = viewport || {};
  for (const [key, value] of Object.entries({ viewX, viewY, halfWidth, halfHeight })) {
    if (!Number.isFinite(value) || ((key === "halfWidth" || key === "halfHeight") && value <= 0)) {
      throw new Error(`Chart drift viewport has invalid ${key}`);
    }
  }

  const extrema = [
    { score: -Infinity, call: null },
    { score: -Infinity, call: null },
    { score: -Infinity, call: null },
    { score: -Infinity, call: null }
  ];
  for (const call of calls) {
    if (!Number.isInteger(call?.id) || !Number.isFinite(call.x) || !Number.isFinite(call.y)) {
      throw new Error("Chart drift call requires a tile id and finite position");
    }
    const localX = call.x - viewX;
    const localY = call.y - viewY;
    if (Math.abs(localX) > halfWidth || Math.abs(localY) > halfHeight) continue;
    const scores = [localX, -localX, localY, -localY];
    for (let index = 0; index < extrema.length; index++) {
      if (scores[index] > extrema[index].score) {
        extrema[index] = { score: scores[index], call };
      }
    }
  }

  const selected = [];
  const selectedIds = new Set();
  for (const { call } of extrema) {
    if (!call || selectedIds.has(call.id)) continue;
    selectedIds.add(call.id);
    selected.push(call);
  }
  return selected;
}

export function captureChartReframePosition(position, subject = "vessel") {
  const validated = validatedUnitVector(position, `${subject} chart reframe position`);
  return Object.freeze({
    subject,
    position: Object.freeze(validated.slice())
  });
}

export function assertChartReframePositionPreserved(captured, position) {
  if (
    !captured ||
    typeof captured.subject !== "string" ||
    captured.subject.length === 0 ||
    !Array.isArray(captured.position)
  ) {
    throw new Error("Chart reframe requires a captured global position");
  }
  const validated = validatedUnitVector(position, `${captured.subject} reframed position`);
  if (validated.some((value, index) => Math.abs(value - captured.position[index]) > 1e-12)) {
    throw new Error(`Chart reframe changed ${captured.subject}'s global position`);
  }
}

export function createExactNorthUpLayout(projectedTiles, viewportWidth, viewportHeight) {
  if (!Array.isArray(projectedTiles) || projectedTiles.length === 0) {
    throw new Error("Exact north-up layout requires projected tiles");
  }
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
      !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Exact north-up layout requires a positive viewport");
  }
  const positions = new Map();
  for (const tile of projectedTiles) {
    if (!Number.isInteger(tile?.id) || !Number.isFinite(tile.x) || !Number.isFinite(tile.y)) {
      throw new Error("Exact north-up layout received an invalid projected tile");
    }
    positions.set(tile.id, exactNorthUpLayoutPosition({
      projected: tile,
      viewX: 0,
      viewY: 0,
      viewportWidth,
      viewportHeight
    }));
  }
  return { viewX: 0, viewY: 0, positions };
}

export function northUpProjectionIsStable(position) {
  const normalized = validatedUnitVector(position, "north-up camera position");
  return Math.hypot(normalized[0], normalized[2]) >= NORTH_UP_POLE_TANGENT_EPSILON;
}

export function measureChartNorthUpDrift(samples) {
  if (!Array.isArray(samples)) throw new Error("Chart drift samples must be an array");
  if (samples.length === 0) return emptyChartDrift();

  let weightedSin = 0;
  let weightedCos = 0;
  let angleWeight = 0;
  const validated = samples.map((sample, index) => {
    const values = ["localX", "localY", "northX", "northY"];
    for (const key of values) {
      if (!Number.isFinite(sample?.[key])) {
        throw new Error(`Chart drift sample ${index} has invalid ${key}`);
      }
    }
    const localRadius = Math.hypot(sample.localX, sample.localY);
    const northRadius = Math.hypot(sample.northX, sample.northY);
    if (localRadius >= 1 && northRadius >= 1) {
      const localAngle = Math.atan2(sample.localY, sample.localX);
      const northAngle = Math.atan2(sample.northY, sample.northX);
      const delta = normalizeAngle(localAngle - northAngle);
      const weight = Math.min(localRadius, northRadius, 160);
      weightedSin += Math.sin(delta) * weight;
      weightedCos += Math.cos(delta) * weight;
      angleWeight += weight;
    }
    return sample;
  });

  const rotationRad = angleWeight > 0 ? Math.atan2(weightedSin, weightedCos) : 0;
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  let squaredDistortion = 0;
  let maxDistortionPx = 0;
  let worstDistortionSampleIndex = -1;
  for (let index = 0; index < validated.length; index++) {
    const sample = validated[index];
    const expectedX = sample.northX * cos - sample.northY * sin;
    const expectedY = sample.northX * sin + sample.northY * cos;
    const distortion = Math.hypot(sample.localX - expectedX, sample.localY - expectedY);
    squaredDistortion += distortion * distortion;
    if (distortion > Math.max(maxDistortionPx, 1e-9)) {
      maxDistortionPx = distortion;
      worstDistortionSampleIndex = index;
    }
  }

  const metrics = Object.freeze({
    sampleCount: validated.length,
    rotationDeg: rotationRad * 180 / Math.PI,
    rmsDistortionPx: Math.sqrt(squaredDistortion / validated.length),
    maxDistortionPx,
    worstDistortionSampleIndex
  });
  return Object.freeze({
    ...metrics,
    needsReframe: chartNorthUpDriftExceedsThreshold(metrics)
  });
}

export function chartNorthUpDriftExceedsThreshold(metrics) {
  validateChartDriftMetrics(metrics);
  return Math.abs(metrics.rotationDeg) >= CHART_REFRAME_ROTATION_THRESHOLD_DEG ||
    metrics.rmsDistortionPx >= CHART_REFRAME_RMS_DISTORTION_THRESHOLD_PX ||
    metrics.maxDistortionPx >= CHART_REFRAME_MAX_DISTORTION_THRESHOLD_PX;
}

export function chartReframeCandidateIsNorthUp(candidate) {
  validateChartDriftMetrics(candidate);
  return candidate.sampleCount > 0 &&
    Math.abs(candidate.rotationDeg) <= NORTH_UP_REBUILD_MAX_ROTATION_DEG &&
    candidate.rmsDistortionPx <= NORTH_UP_REBUILD_MAX_RMS_ERROR_PX &&
    candidate.maxDistortionPx <= NORTH_UP_REBUILD_MAX_ERROR_PX;
}

function validateChartDriftMetrics(metrics) {
  if (!metrics || !Number.isInteger(metrics.sampleCount) || metrics.sampleCount < 0) {
    throw new Error("Chart drift metrics require a non-negative sample count");
  }
  for (const key of ["rotationDeg", "rmsDistortionPx", "maxDistortionPx"]) {
    if (!Number.isFinite(metrics[key]) || (metrics[key] < 0 && key !== "rotationDeg")) {
      throw new Error(`Chart drift metrics have invalid ${key}`);
    }
  }
}

function emptyChartDrift() {
  return Object.freeze({
    sampleCount: 0,
    rotationDeg: 0,
    rmsDistortionPx: 0,
    maxDistortionPx: 0,
    worstDistortionSampleIndex: -1,
    needsReframe: false
  });
}

function validatedUnitVector(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((entry) => !Number.isFinite(entry))) {
    throw new Error(`${label} must be a finite 3D vector`);
  }
  const length = Math.hypot(...value);
  if (length < 1e-12) throw new Error(`${label} cannot be zero`);
  return value.map((entry) => entry / length);
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
