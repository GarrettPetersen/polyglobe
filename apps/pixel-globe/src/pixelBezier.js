// River curves span only a few logical pixels. Eight cached segments keep the
// closest-point error sub-pixel while avoiding twenty projections per ship
// probe on every navigation step.
const QUADRATIC_BEZIER_PROBE_SEGMENTS = 8;
const quadraticBezierGeometryCache = new WeakMap();

export function quadraticBezierPoint(path, t) {
  assertQuadraticBezierPath(path);
  assertBezierT(t);
  return uncheckedQuadraticBezierPoint(path, t);
}

export function quadraticBezierTangent(path, t) {
  assertQuadraticBezierPath(path);
  assertBezierT(t);
  return uncheckedQuadraticBezierTangent(path, t);
}

function uncheckedQuadraticBezierTangent(path, t) {
  const dx = 2 * (1 - t) * (path.cx - path.x0) + 2 * t * (path.x1 - path.cx);
  const dy = 2 * (1 - t) * (path.cy - path.y0) + 2 * t * (path.y1 - path.cy);
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) throw new Error("Cannot resolve a zero-length Bezier tangent");
  return { x: dx / length, y: dy / length };
}

export function forEachPixelOnBezier(path, visit) {
  if (typeof visit !== "function") throw new Error("Pixel Bezier requires a visitor");
  const geometry = quadraticBezierGeometry(path);
  const steps = Math.max(10, Math.ceil(geometry.length * 1.6));
  const seen = new Set();
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const point = uncheckedQuadraticBezierPoint(path, t);
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    visit(x, y, t);
  }
}

export function forEachTwoPixelBezierPoint(path, visit) {
  if (typeof visit !== "function") throw new Error("Two-pixel Bezier requires a visitor");
  const seen = new Set();
  const add = (x, y) => {
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    visit(x, y);
  };
  forEachPixelOnBezier(path, (x, y, t) => {
    add(x, y);
    const tangent = uncheckedQuadraticBezierTangent(path, t);
    if (Math.abs(tangent.x) >= Math.abs(tangent.y)) {
      add(x, y + (tangent.x >= 0 ? 1 : -1));
    } else {
      add(x + (tangent.y >= 0 ? -1 : 1), y);
    }
  });
}

export function bezierPathLength(path) {
  return quadraticBezierGeometry(path).length;
}

export function closestPointOnQuadraticBezier(path, px, py) {
  if (!Number.isFinite(px) || !Number.isFinite(py)) {
    throw new Error(`Bezier probe requires a finite point: ${px},${py}`);
  }
  const geometry = quadraticBezierGeometry(path);
  let best = null;
  for (let index = 0; index < geometry.segmentCount; index++) {
    const pointOffset = index * 2;
    const nextOffset = pointOffset + 2;
    const closest = closestPointOnSegment(
      px,
      py,
      geometry.points[pointOffset],
      geometry.points[pointOffset + 1],
      geometry.points[nextOffset],
      geometry.points[nextOffset + 1]
    );
    if (best && closest.distance >= best.distance) continue;
    const dx = geometry.points[nextOffset] - geometry.points[pointOffset];
    const dy = geometry.points[nextOffset + 1] - geometry.points[pointOffset + 1];
    const length = Math.hypot(dx, dy);
    best = {
      x: closest.x,
      y: closest.y,
      distance: closest.distance,
      pathT: (index + closest.t) / geometry.segmentCount,
      tangent: length > 1e-8 ? { x: dx / length, y: dy / length } : null
    };
  }
  if (!best?.tangent) throw new Error("Cannot resolve closest point on a zero-length Bezier path");
  return best;
}

function quadraticBezierGeometry(path) {
  const cached = path && typeof path === "object"
    ? quadraticBezierGeometryCache.get(path)
    : null;
  if (cached) {
    assertCachedBezierPathUnchanged(path, cached);
    return cached;
  }
  assertQuadraticBezierPath(path);

  const points = new Float64Array((QUADRATIC_BEZIER_PROBE_SEGMENTS + 1) * 2);
  let length = 0;
  let previous = uncheckedQuadraticBezierPoint(path, 0);
  points[0] = previous.x;
  points[1] = previous.y;
  for (let index = 1; index <= QUADRATIC_BEZIER_PROBE_SEGMENTS; index++) {
    const point = uncheckedQuadraticBezierPoint(path, index / QUADRATIC_BEZIER_PROBE_SEGMENTS);
    const offset = index * 2;
    points[offset] = point.x;
    points[offset + 1] = point.y;
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  if (length <= 1e-6) throw new Error("Quadratic Bezier path has no length");
  const geometry = Object.freeze({
    x0: path.x0,
    y0: path.y0,
    cx: path.cx,
    cy: path.cy,
    x1: path.x1,
    y1: path.y1,
    points,
    length,
    segmentCount: QUADRATIC_BEZIER_PROBE_SEGMENTS
  });
  quadraticBezierGeometryCache.set(path, geometry);
  return geometry;
}

function assertCachedBezierPathUnchanged(path, geometry) {
  if (
    path.x0 !== geometry.x0 ||
    path.y0 !== geometry.y0 ||
    path.cx !== geometry.cx ||
    path.cy !== geometry.cy ||
    path.x1 !== geometry.x1 ||
    path.y1 !== geometry.y1
  ) {
    throw new Error("Quadratic Bezier path was mutated after its geometry was cached");
  }
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy;
  if (denominator <= 1e-12) {
    return { x: ax, y: ay, t: 0, distance: Math.hypot(px - ax, py - ay) };
  }
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / denominator, 0, 1);
  const x = ax + dx * t;
  const y = ay + dy * t;
  return { x, y, t, distance: Math.hypot(px - x, py - y) };
}

function uncheckedQuadraticBezierPoint(path, t) {
  const omt = 1 - t;
  return {
    x: omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1,
    y: omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1
  };
}

function assertQuadraticBezierPath(path) {
  if (
    !path ||
    !Number.isFinite(path.x0) ||
    !Number.isFinite(path.y0) ||
    !Number.isFinite(path.cx) ||
    !Number.isFinite(path.cy) ||
    !Number.isFinite(path.x1) ||
    !Number.isFinite(path.y1)
  ) {
    throw new Error("Quadratic Bezier path requires finite endpoints and control point");
  }
  if (Math.hypot(path.x1 - path.x0, path.y1 - path.y0) < 1e-6) {
    throw new Error("Quadratic Bezier path requires distinct endpoints");
  }
}

function assertBezierT(t) {
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error(`Invalid Bezier position: ${t}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
