export const RIVER_GATEWAY_SEARCH_RADIUS_PX = 34;
export const RIVER_GATEWAY_SAMPLE_STEP_PX = 2;
export const RIVER_GATEWAY_SAMPLE_DIRECTIONS = 32;
export const RIVER_GATEWAY_MIN_FORWARD_DOT = 0.05;

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
