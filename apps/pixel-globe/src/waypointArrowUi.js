export function waypointArrowEdgePoint({
  direction,
  screenWidth,
  screenHeight,
  margin,
  maxY = screenHeight - margin
}) {
  assertPositive(screenWidth, "screen width");
  assertPositive(screenHeight, "screen height");
  assertNonNegative(margin, "edge margin");
  const dir = normalizeDirection(direction);
  const minX = margin;
  const maxX = screenWidth - margin;
  const minY = margin;
  const boundedMaxY = Math.min(screenHeight - margin, maxY);
  if (maxX < minX || boundedMaxY < minY) {
    throw new Error("Waypoint arrow viewport has no drawable area");
  }

  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;
  const candidates = [];
  if (Math.abs(dir.x) > 1e-6) {
    candidates.push(((dir.x > 0 ? maxX : minX) - centerX) / dir.x);
  }
  if (Math.abs(dir.y) > 1e-6) {
    candidates.push(((dir.y > 0 ? boundedMaxY : minY) - centerY) / dir.y);
  }
  const positive = candidates.filter((value) => value > 0);
  if (positive.length === 0) throw new Error("Waypoint arrow direction does not reach the viewport edge");
  const distance = Math.min(...positive);
  return {
    x: Math.round(centerX + dir.x * distance),
    y: Math.round(centerY + dir.y * distance)
  };
}

export function waypointArrowGeometry({
  point,
  direction,
  size,
  width,
  hitPadding = 4
}) {
  assertPoint(point, "arrow point");
  assertPositive(size, "arrow size");
  assertPositive(width, "arrow width");
  assertNonNegative(hitPadding, "arrow hit padding");
  const dir = normalizeDirection(direction);
  const perpendicular = { x: -dir.y, y: dir.x };
  const tip = {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
  const base = {
    x: Math.round(tip.x - dir.x * size),
    y: Math.round(tip.y - dir.y * size)
  };
  const left = {
    x: Math.round(base.x + perpendicular.x * width),
    y: Math.round(base.y + perpendicular.y * width)
  };
  const right = {
    x: Math.round(base.x - perpendicular.x * width),
    y: Math.round(base.y - perpendicular.y * width)
  };
  const minX = Math.min(tip.x, left.x, right.x) - hitPadding;
  const minY = Math.min(tip.y, left.y, right.y) - hitPadding;
  const maxX = Math.max(tip.x, left.x, right.x) + hitPadding;
  const maxY = Math.max(tip.y, left.y, right.y) + hitPadding;
  return {
    tip,
    base,
    left,
    right,
    hitRect: {
      x: minX,
      y: minY,
      w: maxX - minX + 1,
      h: maxY - minY + 1
    }
  };
}

export function waypointArrowMaxY({
  screenHeight,
  margin,
  controlRects,
  gap
}) {
  assertPositive(screenHeight, "screen height");
  assertNonNegative(margin, "edge margin");
  assertNonNegative(gap, "control gap");
  if (!Array.isArray(controlRects)) throw new Error("Waypoint control rectangles must be an array");
  let maxY = screenHeight - margin;
  for (const rect of controlRects) {
    if (!Number.isFinite(rect?.y)) {
      throw new Error("Waypoint control rectangle requires a finite top edge");
    }
    maxY = Math.min(maxY, Math.round(rect.y - gap));
  }
  return Math.max(margin, maxY);
}

export function formatWaypointLabel(name, distanceKm) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Waypoint label requires a destination name");
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error(`Waypoint label requires a non-negative distance: ${distanceKm}`);
  }
  const rounding = distanceKm >= 1000 ? 100 : distanceKm >= 100 ? 10 : 1;
  const roundedDistance = Math.round(distanceKm / rounding) * rounding;
  return `${name.trim()}, ${roundedDistance.toLocaleString("en-US")} km`;
}

function normalizeDirection(direction) {
  assertPoint(direction, "arrow direction");
  const length = Math.hypot(direction.x, direction.y);
  if (length <= 1e-9) throw new Error("Waypoint arrow direction cannot be zero");
  return {
    x: direction.x / length,
    y: direction.y / length
  };
}

function assertPoint(point, label) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    throw new Error(`Waypoint ${label} requires finite coordinates`);
  }
}

function assertPositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Waypoint ${label} must be positive: ${value}`);
  }
}

function assertNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Waypoint ${label} must be non-negative: ${value}`);
  }
}
