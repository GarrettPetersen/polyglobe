export function chooseNpcEscapeDirection({
  desiredDirection,
  currentDirection,
  candidateDirections,
  clearDistanceFor
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
    const score = clearDistance + routeAlignment * 4 + continuity * 1.5;
    if (best && score <= best.score) continue;
    best = { direction, clearDistance, routeAlignment, score };
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
