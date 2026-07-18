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
  assertQuadraticBezierPath(path);
  if (typeof visit !== "function") throw new Error("Pixel Bezier requires a visitor");
  const steps = Math.max(10, Math.ceil(uncheckedBezierPathLength(path) * 1.6));
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
  assertQuadraticBezierPath(path);
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
  assertQuadraticBezierPath(path);
  return uncheckedBezierPathLength(path);
}

function uncheckedBezierPathLength(path) {
  let length = 0;
  let previous = uncheckedQuadraticBezierPoint(path, 0);
  for (let index = 1; index <= 12; index++) {
    const point = uncheckedQuadraticBezierPoint(path, index / 12);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return length;
}

function uncheckedQuadraticBezierPoint(path, t) {
  const omt = 1 - t;
  return {
    x: omt * omt * path.x0 + 2 * omt * t * path.cx + t * t * path.x1,
    y: omt * omt * path.y0 + 2 * omt * t * path.cy + t * t * path.y1
  };
}

function assertQuadraticBezierPath(path) {
  if (!path || ["x0", "y0", "cx", "cy", "x1", "y1"].some((key) => !Number.isFinite(path[key]))) {
    throw new Error("Quadratic Bezier path requires finite endpoints and control point");
  }
  if (Math.hypot(path.x1 - path.x0, path.y1 - path.y0) < 1e-6) {
    throw new Error("Quadratic Bezier path requires distinct endpoints");
  }
}

function assertBezierT(t) {
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error(`Invalid Bezier position: ${t}`);
}
