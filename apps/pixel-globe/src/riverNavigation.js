export const RIVER_GATEWAY_SEARCH_RADIUS_PX = 34;
export const RIVER_GATEWAY_SAMPLE_STEP_PX = 2;
export const RIVER_GATEWAY_SAMPLE_DIRECTIONS = 32;
export const RIVER_GATEWAY_MIN_FORWARD_DOT = Math.cos(Math.PI / 3);
export const SHIP_HAUL_HOLD_DELAY_SECONDS = 0.18;
export const SHIP_HAUL_RAMP_SECONDS = 0.5;
export const COASTAL_HAUL_MOTION_SCALE = 0.24;

export function heldShipHaulStrength(
  heldSeconds,
  holdDelaySeconds = SHIP_HAUL_HOLD_DELAY_SECONDS,
  rampSeconds = SHIP_HAUL_RAMP_SECONDS
) {
  if (!Number.isFinite(heldSeconds) || heldSeconds < 0) {
    throw new Error("Ship haul duration must be a finite non-negative number");
  }
  if (!Number.isFinite(holdDelaySeconds) || holdDelaySeconds < 0) {
    throw new Error("Ship haul delay must be a finite non-negative number");
  }
  if (!Number.isFinite(rampSeconds) || rampSeconds <= 0) {
    throw new Error("Ship haul ramp must be a finite positive number");
  }
  return smoothstep((heldSeconds - holdDelaySeconds) / rampSeconds);
}

export function shipHaulMotionScale({ inRiver, nearShore }) {
  if (inRiver) return 1;
  if (nearShore) return COASTAL_HAUL_MOTION_SCALE;
  return 0;
}

export function findRiverGatewayDirection({
  x,
  y,
  currentKind,
  desiredDirection,
  sampleKindAt,
  searchRadiusPx = RIVER_GATEWAY_SEARCH_RADIUS_PX,
  sampleStepPx = RIVER_GATEWAY_SAMPLE_STEP_PX,
  sampleDirections = RIVER_GATEWAY_SAMPLE_DIRECTIONS,
  minForwardDot = RIVER_GATEWAY_MIN_FORWARD_DOT
}) {
  if (currentKind !== "openWater" && currentKind !== "river") return null;
  if (typeof sampleKindAt !== "function") throw new Error("River gateway search requires a navigation sampler");
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("River gateway search requires a finite origin");
  const desired = normalize2(desiredDirection);
  if (!desired) return null;
  const targetKind = currentKind === "river" ? "openWater" : "river";
  let best = null;

  for (let radius = sampleStepPx; radius <= searchRadiusPx; radius += sampleStepPx) {
    for (let index = 0; index < sampleDirections; index++) {
      const angle = index / sampleDirections * Math.PI * 2;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const alignment = dot2(direction, desired);
      if (alignment < minForwardDot) continue;
      const targetX = x + direction.x * radius;
      const targetY = y + direction.y * radius;
      if (sampleKindAt(targetX, targetY) !== targetKind) continue;
      const lateral = Math.abs(cross2(direction, desired));
      const score = alignment * 3 - radius / searchRadiusPx * 0.35 - lateral * 0.2;
      if (best && score <= best.score) continue;
      best = {
        x: direction.x,
        y: direction.y,
        targetX,
        targetY,
        targetKind,
        distance: radius,
        alignment,
        score
      };
    }
  }
  return best;
}

export function blendRiverNavigationDirections(from, to, amount) {
  const a = normalize2(from);
  const b = normalize2(to);
  if (!a || !b) return a || b;
  const t = clamp(amount, 0, 1);
  return normalize2({
    x: a.x * (1 - t) + b.x * t,
    y: a.y * (1 - t) + b.y * t
  });
}

export function chooseRiverChannelDirection({ x, y, desiredDirection, headingDirection, endpoints }) {
  const desired = normalize2(desiredDirection);
  const heading = normalize2(headingDirection) || desired;
  if (!desired || !Array.isArray(endpoints) || endpoints.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;

  for (const endpoint of endpoints) {
    if (!endpoint || !Number.isFinite(endpoint.x) || !Number.isFinite(endpoint.y)) continue;
    const dx = endpoint.x - x;
    const dy = endpoint.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1) continue;
    const candidate = { x: dx / distance, y: dy / distance };
    const routeAlignment = dot2(candidate, desired);
    const headingAlignment = heading ? dot2(candidate, heading) : routeAlignment;
    const score = routeAlignment * 2 + headingAlignment * 0.45 - distance * 0.002;
    if (score <= bestScore) continue;
    best = candidate;
    bestScore = score;
  }
  return best;
}

export function steerAlongRiverCenterline({
  desiredDirection,
  headingDirection,
  tangent,
  outwardNormal,
  centerlineDistance,
  channelDirection = null
}) {
  const desired = normalize2(desiredDirection);
  const heading = normalize2(headingDirection) || desired;
  const axis = normalize2(tangent);
  if (!desired || !axis) return normalize2(channelDirection) || desired;

  const reverseAxis = { x: -axis.x, y: -axis.y };
  const forwardScore = dot2(axis, desired) * 2 + dot2(axis, heading) * 0.55;
  const reverseScore = dot2(reverseAxis, desired) * 2 + dot2(reverseAxis, heading) * 0.55;
  let direction = reverseScore > forwardScore ? reverseAxis : axis;

  const channel = normalize2(channelDirection);
  if (channel) direction = blendRiverNavigationDirections(direction, channel, 0.38);

  const normal = normalize2(outwardNormal);
  if (normal && Number.isFinite(centerlineDistance)) {
    const bankPressure = clamp((centerlineDistance - 0.4) / 2.8, 0, 0.82);
    if (bankPressure > 0) {
      direction = blendRiverNavigationDirections(direction, { x: -normal.x, y: -normal.y }, bankPressure);
    }
  }
  return direction;
}

export function advanceRiverCenterline(path, pathT, distancePx, directionSign) {
  validateRiverPath(path);
  if (!Number.isFinite(pathT)) throw new Error(`Invalid river path position: ${pathT}`);
  if (!Number.isFinite(distancePx) || distancePx < 0) {
    throw new Error(`Invalid river rail distance: ${distancePx}`);
  }
  if (directionSign !== 1 && directionSign !== -1) {
    throw new Error(`Invalid river rail direction: ${directionSign}`);
  }

  const pathLength = approximateRiverPathLength(path);
  const nextT = clamp(pathT + directionSign * distancePx / pathLength, 0, 1);
  const point = pointOnRiverPath(path, nextT);
  return {
    ...point,
    pathT: nextT,
    reachedEnd: directionSign > 0 ? nextT >= 1 : nextT <= 0
  };
}

export function selectRiverRailPath({
  probes,
  desiredDirection,
  activePathKey = null,
  activeDirectionSign = 0,
  excludedPathKey = null
}) {
  if (!Array.isArray(probes)) throw new Error("River rail selection requires centerline probes");
  const desired = normalize2(desiredDirection);
  if (!desired) return null;

  if (activePathKey !== null) {
    if (typeof activePathKey !== "string" || activePathKey.length === 0) {
      throw new Error("River rail active path key must be a non-empty string");
    }
    if (activeDirectionSign !== 1 && activeDirectionSign !== -1) {
      throw new Error(`Invalid active river rail direction: ${activeDirectionSign}`);
    }
    const activeProbe = nearestProbeForPath(probes, activePathKey);
    if (activeProbe) {
      return { probe: activeProbe, directionSign: activeDirectionSign };
    }
  }

  let best = null;
  for (const probe of probes) {
    validateRiverRailProbe(probe);
    if (probe.pathKey === excludedPathKey) continue;
    if (!best || riverRailProbeIsBetter(probe, best, desired)) best = probe;
  }
  if (!best) return null;
  return {
    probe: best,
    directionSign: dot2(best.tangent, desired) >= 0 ? 1 : -1
  };
}

function nearestProbeForPath(probes, pathKey) {
  let best = null;
  for (const probe of probes) {
    validateRiverRailProbe(probe);
    if (probe.pathKey !== pathKey) continue;
    if (!best || probe.centerlineDistance < best.centerlineDistance) best = probe;
  }
  return best;
}

function validateRiverRailProbe(probe) {
  if (!probe || typeof probe.pathKey !== "string" || probe.pathKey.length === 0) {
    throw new Error("River rail probe requires a path key");
  }
  if (!Number.isFinite(probe.centerlineDistance)) {
    throw new Error(`River rail probe ${probe.pathKey} requires a finite centerline distance`);
  }
  if (!normalize2(probe.tangent)) {
    throw new Error(`River rail probe ${probe.pathKey} requires a finite tangent`);
  }
}

function riverRailProbeIsBetter(candidate, current, desired) {
  const distanceDifference = candidate.centerlineDistance - current.centerlineDistance;
  if (distanceDifference < -0.75) return true;
  if (distanceDifference > 0.75) return false;
  const candidateAlignment = Math.abs(dot2(candidate.tangent, desired));
  const currentAlignment = Math.abs(dot2(current.tangent, desired));
  if (candidateAlignment !== currentAlignment) return candidateAlignment > currentAlignment;
  return candidate.centerlineDistance < current.centerlineDistance;
}

function validateRiverPath(path) {
  if (!path || !["x0", "y0", "cx", "cy", "x1", "y1"].every((key) => Number.isFinite(path[key]))) {
    throw new Error("River rail requires a finite Bezier path");
  }
}

function approximateRiverPathLength(path) {
  let length = 0;
  let previous = pointOnRiverPath(path, 0);
  for (let index = 1; index <= 20; index++) {
    const point = pointOnRiverPath(path, index / 20);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  if (length <= 1e-6) throw new Error("River rail path has no length");
  return length;
}

function pointOnRiverPath(path, t) {
  const omt = 1 - t;
  return {
    x: omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1,
    y: omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1
  };
}

function normalize2(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  const length = Math.hypot(value.x, value.y);
  if (length <= 1e-8) return null;
  return { x: value.x / length, y: value.y / length };
}

function dot2(a, b) {
  return a.x * b.x + a.y * b.y;
}

function cross2(a, b) {
  return a.x * b.y - a.y * b.x;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}
