import assert from "node:assert/strict";
import test from "node:test";

import {
  bezierPathLength,
  closestPointOnQuadraticBezier,
  forEachPixelOnBezier,
  forEachTwoPixelBezierPoint,
  quadraticBezierPoint,
  quadraticBezierTangent
} from "./pixelBezier.js";

const CURVED_PATH = Object.freeze({
  x0: 2,
  y0: 2,
  cx: 8,
  cy: 10,
  x1: 14,
  y1: 2
});

test("roads and rivers sample a true quadratic Bezier curve", () => {
  assert.deepEqual(quadraticBezierPoint(CURVED_PATH, 0), { x: 2, y: 2 });
  assert.deepEqual(quadraticBezierPoint(CURVED_PATH, 0.5), { x: 8, y: 6 });
  assert.deepEqual(quadraticBezierPoint(CURVED_PATH, 1), { x: 14, y: 2 });

  const pixels = [];
  forEachPixelOnBezier(CURVED_PATH, (x, y) => pixels.push({ x, y }));
  assert.ok(pixels.some(({ y }) => y >= 6), "curve never leaves its straight endpoint chord");
  assert.deepEqual(pixels[0], { x: 2, y: 2 });
  assert.deepEqual(pixels.at(-1), { x: 14, y: 2 });
});

test("a two-pixel Bezier stroke stays contiguous and wider than its centerline", () => {
  const centerline = new Set();
  const stroke = new Set();
  forEachPixelOnBezier(CURVED_PATH, (x, y) => centerline.add(`${x},${y}`));
  forEachTwoPixelBezierPoint(CURVED_PATH, (x, y) => stroke.add(`${x},${y}`));

  for (const point of centerline) assert.equal(stroke.has(point), true, point);
  assert.ok(stroke.size >= centerline.size * 1.6, `${stroke.size} pixels for ${centerline.size} center pixels`);
  for (const point of stroke) {
    const [x, y] = point.split(",").map(Number);
    assert.ok([...centerline].some((candidate) => {
      const [cx, cy] = candidate.split(",").map(Number);
      return Math.abs(x - cx) + Math.abs(y - cy) <= 1;
    }), `stroke pixel ${point} is detached`);
  }
});

test("Bezier probes reuse stable sampled geometry for length and nearest points", () => {
  const length = bezierPathLength(CURVED_PATH);
  const closest = closestPointOnQuadraticBezier(CURVED_PATH, 8, 8);

  assert.ok(length > 12);
  assert.ok(length < 18);
  assert.ok(Math.abs(closest.x - 8) < 0.01);
  assert.ok(Math.abs(closest.y - 6) < 0.01);
  assert.ok(Math.abs(closest.distance - 2) < 0.01);
  assert.ok(Math.abs(closest.pathT - 0.5) < 0.01);
  assert.ok(Math.abs(Math.hypot(closest.tangent.x, closest.tangent.y) - 1) < 1e-9);
});

test("cached Bezier geometry rejects in-place path mutation", () => {
  const path = { x0: 0, y0: 0, cx: 5, cy: 3, x1: 10, y1: 0 };
  bezierPathLength(path);
  path.cx = 6;
  assert.throws(() => bezierPathLength(path), /mutated after its geometry was cached/);
});

test("Bezier geometry rejects malformed paths and positions", () => {
  assert.throws(() => quadraticBezierPoint(null, 0), /finite endpoints/);
  assert.throws(
    () => quadraticBezierPoint({ x0: 0, y0: 0, cx: 1, cy: 1, x1: 0, y1: 0 }, 0.5),
    /distinct endpoints/
  );
  assert.throws(() => closestPointOnQuadraticBezier(CURVED_PATH, NaN, 2), /finite point/);
  assert.throws(() => quadraticBezierTangent(CURVED_PATH, 2), /Invalid Bezier position/);
});
