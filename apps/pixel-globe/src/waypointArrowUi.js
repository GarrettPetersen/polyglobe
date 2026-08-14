const WAYPOINT_TRACK_CACHE_LIMIT = 24;
const waypointTrackCache = new Map();

export function waypointArrowEdgePoint({
  direction,
  screenWidth,
  screenHeight,
  margin,
  maxY = screenHeight - margin,
  reservedRects = [],
  clearance = 0
}) {
  assertPositive(screenWidth, "screen width");
  assertPositive(screenHeight, "screen height");
  assertNonNegative(margin, "edge margin");
  assertNonNegative(clearance, "reserved clearance");
  if (!Array.isArray(reservedRects)) throw new Error("Waypoint reserved rectangles must be an array");
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
  const initialPoint = {
    x: Math.round(centerX + dir.x * distance),
    y: Math.round(centerY + dir.y * distance)
  };
  if (reservedRects.length === 0) return initialPoint;
  const inflatedRects = reservedRects.map((rect, index) => inflateReservedRect(rect, clearance, index));
  const track = waypointPerimeterTrack({
    minX,
    maxX,
    minY,
    maxY: boundedMaxY,
    inflatedRects
  });
  const trackPoint = track.get(pointKey(initialPoint));
  if (!trackPoint) {
    throw new Error(`Waypoint perimeter track has no point for ${initialPoint.x},${initialPoint.y}`);
  }
  return trackPoint;
}

export function waypointPointOverlapsReservedRects(point, reservedRects, clearance = 0) {
  assertPoint(point, "reserved point");
  assertNonNegative(clearance, "reserved clearance");
  if (!Array.isArray(reservedRects)) throw new Error("Waypoint reserved rectangles must be an array");
  return pointOverlapsRects(
    point,
    reservedRects.map((rect, index) => inflateReservedRect(rect, clearance, index))
  );
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

function inflateReservedRect(rect, clearance, index) {
  if (
    !Number.isFinite(rect?.x) ||
    !Number.isFinite(rect?.y) ||
    !Number.isFinite(rect?.w) ||
    !Number.isFinite(rect?.h) ||
    rect.w < 0 ||
    rect.h < 0
  ) {
    throw new Error(`Waypoint reserved rectangle ${index} is malformed`);
  }
  return {
    x: rect.x - clearance,
    y: rect.y - clearance,
    w: rect.w + clearance * 2,
    h: rect.h + clearance * 2
  };
}

function pointOverlapsRects(point, rects) {
  return rects.some((rect) => (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  ));
}

function waypointPerimeterTrack({ minX, maxX, minY, maxY, inflatedRects }) {
  const key = [
    minX,
    maxX,
    minY,
    maxY,
    ...inflatedRects.flatMap((rect) => [rect.x, rect.y, rect.w, rect.h])
  ].join("|");
  const cached = waypointTrackCache.get(key);
  if (cached) return cached;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const cellCount = width * height;
  const blocked = new Uint8Array(cellCount);
  for (const rect of inflatedRects) {
    const firstX = Math.max(0, Math.ceil(rect.x) - minX);
    const lastX = Math.min(width - 1, Math.floor(rect.x + rect.w) - minX);
    const firstY = Math.max(0, Math.ceil(rect.y) - minY);
    const lastY = Math.min(height - 1, Math.floor(rect.y + rect.h) - minY);
    if (lastX < firstX || lastY < firstY) continue;
    for (let localY = firstY; localY <= lastY; localY += 1) {
      blocked.fill(1, localY * width + firstX, localY * width + lastX + 1);
    }
  }

  const centerX = Math.round((minX + maxX) / 2) - minX;
  const centerY = Math.round((minY + maxY) / 2) - minY;
  const centerIndex = centerY * width + centerX;
  if (blocked[centerIndex] === 1) {
    throw new Error("Waypoint UI blocks the center of the navigable viewport");
  }
  const boundary = waypointTrackBoundary({
    blocked,
    width,
    height,
    inflatedRects,
    minX,
    minY
  });
  const basePoints = rectanglePerimeterPoints({ minX, maxX, minY, maxY });
  const baseSafe = basePoints.map((point) => blocked[localPointIndex(point, minX, minY, width)] === 0);
  const firstSafeIndex = baseSafe.indexOf(true);
  if (firstSafeIndex < 0) throw new Error("Waypoint UI occupies the complete viewport perimeter");

  const mappedPoints = Array(basePoints.length);
  mappedPoints[firstSafeIndex] = basePoints[firstSafeIndex];
  let traversed = 1;
  let index = (firstSafeIndex + 1) % basePoints.length;
  while (traversed < basePoints.length) {
    if (baseSafe[index]) {
      mappedPoints[index] = basePoints[index];
      index = (index + 1) % basePoints.length;
      traversed += 1;
      continue;
    }
    const runIndices = [];
    while (traversed < basePoints.length && !baseSafe[index]) {
      runIndices.push(index);
      index = (index + 1) % basePoints.length;
      traversed += 1;
    }
    const previousIndex = (runIndices[0] - 1 + basePoints.length) % basePoints.length;
    const nextIndex = index;
    const detour = shortestWaypointBoundaryPath({
      boundary,
      width,
      height,
      startIndex: localPointIndex(basePoints[previousIndex], minX, minY, width),
      endIndex: localPointIndex(basePoints[nextIndex], minX, minY, width)
    });
    for (let runOffset = 0; runOffset < runIndices.length; runOffset += 1) {
      const pathIndex = Math.round(
        (runOffset + 1) / (runIndices.length + 1) * (detour.length - 1)
      );
      mappedPoints[runIndices[runOffset]] = globalPointForIndex(
        detour[pathIndex],
        minX,
        minY,
        width
      );
    }
  }

  const track = new Map(basePoints.map((point, baseIndex) => [
    pointKey(point),
    Object.freeze(mappedPoints[baseIndex])
  ]));
  waypointTrackCache.set(key, track);
  while (waypointTrackCache.size > WAYPOINT_TRACK_CACHE_LIMIT) {
    waypointTrackCache.delete(waypointTrackCache.keys().next().value);
  }
  return track;
}

function waypointTrackBoundary({ blocked, width, height, inflatedRects, minX, minY }) {
  const boundary = new Uint8Array(blocked.length);
  for (let x = 0; x < width; x += 1) {
    if (blocked[x] === 0) boundary[x] = 1;
    const bottom = (height - 1) * width + x;
    if (blocked[bottom] === 0) boundary[bottom] = 1;
  }
  for (let y = 1; y + 1 < height; y += 1) {
    const left = y * width;
    const right = left + width - 1;
    if (blocked[left] === 0) boundary[left] = 1;
    if (blocked[right] === 0) boundary[right] = 1;
  }
  for (const rect of inflatedRects) {
    const firstX = Math.max(0, Math.ceil(rect.x) - minX - 1);
    const lastX = Math.min(width - 1, Math.floor(rect.x + rect.w) - minX + 1);
    const firstY = Math.max(0, Math.ceil(rect.y) - minY - 1);
    const lastY = Math.min(height - 1, Math.floor(rect.y + rect.h) - minY + 1);
    for (let y = firstY; y <= lastY; y += 1) {
      for (let x = firstX; x <= lastX; x += 1) {
        const index = y * width + x;
        if (blocked[index] === 1) continue;
        if (
          (x > 0 && blocked[index - 1] === 1) ||
          (x + 1 < width && blocked[index + 1] === 1) ||
          (y > 0 && blocked[index - width] === 1) ||
          (y + 1 < height && blocked[index + width] === 1)
        ) boundary[index] = 1;
      }
    }
  }
  return boundary;
}

function shortestWaypointBoundaryPath({ boundary, width, height, startIndex, endIndex }) {
  if (boundary[startIndex] !== 1 || boundary[endIndex] !== 1) {
    throw new Error("Waypoint detour anchors must lie on the safe viewport boundary");
  }
  const parents = new Int32Array(boundary.length);
  parents.fill(-2);
  const queue = new Int32Array(boundary.length);
  let head = 0;
  let tail = 0;
  parents[startIndex] = -1;
  queue[tail++] = startIndex;
  while (head < tail && parents[endIndex] === -2) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (
          (dx === 0 && dy === 0) || x + dx < 0 || x + dx >= width ||
          y + dy < 0 || y + dy >= height
        ) continue;
        const neighbor = index + dy * width + dx;
        if (boundary[neighbor] !== 1 || parents[neighbor] !== -2) continue;
        parents[neighbor] = index;
        queue[tail++] = neighbor;
      }
    }
  }
  if (parents[endIndex] === -2) {
    throw new Error("Waypoint UI leaves no continuous perimeter detour");
  }
  const reversed = [];
  for (let index = endIndex; index >= 0; index = parents[index]) reversed.push(index);
  return reversed.reverse();
}

function rectanglePerimeterPoints({ minX, maxX, minY, maxY }) {
  const points = [];
  for (let x = minX; x <= maxX; x += 1) points.push({ x, y: minY });
  for (let y = minY + 1; y <= maxY; y += 1) points.push({ x: maxX, y });
  for (let x = maxX - 1; x >= minX; x -= 1) points.push({ x, y: maxY });
  for (let y = maxY - 1; y > minY; y -= 1) points.push({ x: minX, y });
  return points;
}

function localPointIndex(point, minX, minY, width) {
  return (point.y - minY) * width + point.x - minX;
}

function globalPointForIndex(index, minX, minY, width) {
  return {
    x: minX + index % width,
    y: minY + Math.floor(index / width)
  };
}

function pointKey(point) {
  return `${point.x},${point.y}`;
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
