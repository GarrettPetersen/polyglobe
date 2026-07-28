const NPC_OBSTACLE_AVOIDANCE_ANGLES_RAD = Object.freeze([
  15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90,
  105, -105, 120, -120, 135, -135, 150, -150, 165, -165, 180
].map((degrees) => degrees * Math.PI / 180));

export function chooseNpcEscapeDirection({
  desiredDirection,
  currentDirection,
  candidateDirections,
  clearDistanceFor,
  preferredSide = 0
}) {
  const desired = normalize2(desiredDirection);
  const current = normalize2(currentDirection) || desired;
  if (!desired) throw new Error("NPC escape navigation requires a desired direction");
  if (!Array.isArray(candidateDirections) || candidateDirections.length === 0) {
    throw new Error("NPC escape navigation requires candidate directions");
  }
  if (typeof clearDistanceFor !== "function") {
    throw new Error("NPC escape navigation requires a clearance probe");
  }

  let best = null;
  for (const value of candidateDirections) {
    const direction = normalize2(value);
    if (!direction) continue;
    const clearDistance = clearDistanceFor(direction);
    if (!Number.isFinite(clearDistance) || clearDistance <= 0) continue;
    const routeAlignment = dot2(direction, desired);
    const continuity = current ? dot2(direction, current) : routeAlignment;
    const side = turnSide(desired, direction);
    const sideCommitment = preferredSide !== 0 && side === Math.sign(preferredSide) ? 1.25 : 0;
    const score = clearDistance + routeAlignment * 4 + continuity * 1.5 + sideCommitment;
    if (best && score <= best.score) continue;
    best = { direction, clearDistance, routeAlignment, side, score };
  }
  return best;
}

export function chooseNpcObstacleAvoidanceDirection({
  desiredDirection,
  currentDirection,
  clearDistanceFor,
  preferredSide = 0
}) {
  const desired = normalize2(desiredDirection);
  if (!desired) throw new Error("NPC obstacle navigation requires a desired direction");
  return chooseNpcEscapeDirection({
    desiredDirection: desired,
    currentDirection,
    candidateDirections: NPC_OBSTACLE_AVOIDANCE_ANGLES_RAD.map((angle) => rotate2(desired, angle)),
    clearDistanceFor,
    preferredSide
  });
}

export function chooseNpcSailingDirection({
  desiredDirection,
  windFlowDirection,
  stallAngleRad,
  currentDirection,
  preferredTackSide = 0,
  tackMarginRad = 8 * Math.PI / 180
}) {
  const desired = normalize2(desiredDirection);
  const windFlow = normalize2(windFlowDirection);
  const current = normalize2(currentDirection) || desired;
  if (!desired) throw new Error("NPC sailing navigation requires a desired direction");
  if (!windFlow) throw new Error("NPC sailing navigation requires a wind flow direction");
  if (!Number.isFinite(stallAngleRad) || stallAngleRad < 0) {
    throw new Error("NPC sailing navigation requires a valid stall angle");
  }

  const upwind = { x: -windFlow.x, y: -windFlow.y };
  const angleFromUpwind = Math.acos(clamp(dot2(desired, upwind), -1, 1));
  const safeAngle = Math.min(Math.PI, stallAngleRad + Math.max(0, tackMarginRad));
  if (angleFromUpwind > safeAngle) {
    return { direction: desired, tackSide: 0, tacking: false, angleFromUpwind };
  }

  const tackCandidates = [-1, 1].map((side) => ({
    side,
    direction: rotate2(upwind, safeAngle * side)
  }));
  const requestedSide = Math.sign(preferredTackSide);
  const committed = tackCandidates.find((candidate) => candidate.side === requestedSide);
  if (committed) {
    return {
      direction: committed.direction,
      tackSide: committed.side,
      tacking: true,
      angleFromUpwind
    };
  }

  let best = null;
  for (const candidate of tackCandidates) {
    const routeAlignment = dot2(candidate.direction, desired);
    const continuity = current ? dot2(candidate.direction, current) : routeAlignment;
    const score = routeAlignment * 4 + continuity * 1.25;
    if (best && score <= best.score) continue;
    best = { ...candidate, routeAlignment, score };
  }
  return {
    direction: best.direction,
    tackSide: best.side,
    tacking: true,
    angleFromUpwind
  };
}

export function findNpcVisualPlacement({
  origin,
  preferredPoints = [],
  searchRadiusPx,
  radialStepPx,
  angleCount,
  evaluate,
  accept = () => true,
  includeOrigin = true
}) {
  validatePoint(origin, "origin");
  if (!Array.isArray(preferredPoints)) {
    throw new Error("NPC visual placement requires preferred points");
  }
  for (const point of preferredPoints) validatePoint(point, "preferred point");
  if (!Number.isFinite(searchRadiusPx) || searchRadiusPx < 0) {
    throw new Error(`Invalid NPC visual placement radius: ${searchRadiusPx}`);
  }
  if (!Number.isFinite(radialStepPx) || radialStepPx <= 0) {
    throw new Error(`Invalid NPC visual placement step: ${radialStepPx}`);
  }
  if (!Number.isInteger(angleCount) || angleCount <= 0) {
    throw new Error(`Invalid NPC visual placement angle count: ${angleCount}`);
  }
  if (typeof evaluate !== "function" || typeof accept !== "function") {
    throw new Error("NPC visual placement requires candidate predicates");
  }

  const evaluatePoint = (point) => {
    const candidate = evaluate(point.x, point.y);
    return candidate && accept(candidate) ? candidate : null;
  };
  if (includeOrigin) {
    const direct = evaluatePoint(origin);
    if (direct) return direct;
  }
  for (const point of preferredPoints) {
    const preferred = evaluatePoint(point);
    if (preferred) return preferred;
  }
  for (let radius = radialStepPx; radius <= searchRadiusPx; radius += radialStepPx) {
    for (let index = 0; index < angleCount; index++) {
      const angle = index / angleCount * Math.PI * 2;
      const candidate = evaluatePoint({
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius
      });
      if (candidate) return candidate;
    }
  }
  return null;
}

function normalize2(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  const length = Math.hypot(value.x, value.y);
  if (length <= 1e-8) return null;
  return { x: value.x / length, y: value.y / length };
}

function validatePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`NPC visual placement has an invalid ${label}`);
  }
}

function dot2(a, b) {
  return a.x * b.x + a.y * b.y;
}

function rotate2(direction, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: direction.x * c - direction.y * s,
    y: direction.x * s + direction.y * c
  };
}

function turnSide(from, to) {
  const cross = from.x * to.y - from.y * to.x;
  if (Math.abs(cross) <= 1e-8) return 0;
  return Math.sign(cross);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
