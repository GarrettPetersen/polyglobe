import assert from "node:assert/strict";
import test from "node:test";

import { pixelTextOrigin, snapPointToTransformedPixelGrid } from "./pixelText.js";

test("pixel text origins always land on whole logical canvas pixels", () => {
  for (const align of ["left", "center", "right"]) {
    const origin = pixelTextOrigin({ x: 123.75, y: 47.4, width: 31, align });
    assert.equal(Number.isInteger(origin.x), true);
    assert.equal(Number.isInteger(origin.y), true);
  }
});

test("pixel text alignment is applied before snapping to the canvas grid", () => {
  assert.deepEqual(pixelTextOrigin({ x: 20.4, y: 8.6, width: 7, align: "left" }), { x: 20, y: 9 });
  assert.deepEqual(pixelTextOrigin({ x: 20.4, y: 8.6, width: 7, align: "center" }), { x: 17, y: 9 });
  assert.deepEqual(pixelTextOrigin({ x: 20.4, y: 8.6, width: 7, align: "right" }), { x: 13, y: 9 });
});

test("text origins snap in canvas space through fractional translations", () => {
  const transform = { a: 1, b: 0, c: 0, d: 1, e: 0.35, f: -0.6 };
  const origin = snapPointToTransformedPixelGrid({ x: 17, y: 9 }, transform);
  assert.equal(Number.isInteger(origin.x + transform.e), true);
  assert.equal(Number.isInteger(origin.y + transform.f), true);
});

test("text origins snap in canvas space through right-angle rotation", () => {
  const transform = { a: 0, b: -1, c: 1, d: 0, e: 31.4, f: 12.2 };
  const origin = snapPointToTransformedPixelGrid({ x: 4, y: 7 }, transform);
  const canvasX = transform.a * origin.x + transform.c * origin.y + transform.e;
  const canvasY = transform.b * origin.x + transform.d * origin.y + transform.f;
  assert.ok(Math.abs(canvasX - Math.round(canvasX)) < 1e-9);
  assert.ok(Math.abs(canvasY - Math.round(canvasY)) < 1e-9);
});
