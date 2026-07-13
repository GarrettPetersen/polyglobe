import assert from "node:assert/strict";
import test from "node:test";
import { canvasDisplayLayout } from "./displayScaling.js";

test("windowed canvas scaling stays on an integer pixel multiple", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 1100,
    viewportHeight: 700,
    canvasWidth: 455,
    canvasHeight: 256,
    devicePixelRatio: 2,
    fitScreen: false
  });

  assert.equal(layout.scale, 2);
  assert.equal(layout.physicalScale, 4);
  assert.equal(layout.width, 910);
  assert.equal(layout.height, 512);
});

test("fullscreen fit scaling snaps the canvas box to physical pixels", () => {
  const dpr = 1.5;
  const layout = canvasDisplayLayout({
    viewportWidth: 1280,
    viewportHeight: 720,
    canvasWidth: 455,
    canvasHeight: 256,
    devicePixelRatio: dpr,
    fitScreen: true
  });

  assert.ok(layout.scale > 2 && layout.scale < 3);
  assert.equal(Number.isInteger(layout.scale * dpr), true);
  assert.equal(layout.physicalScale, layout.scale * dpr);
  for (const value of [layout.width, layout.height, layout.left, layout.top]) {
    assert.ok(Math.abs(value * dpr - Math.round(value * dpr)) < 1e-9);
  }
});

test("a canvas larger than the viewport scales down instead of overflowing", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 390,
    viewportHeight: 700,
    canvasWidth: 455,
    canvasHeight: 256,
    devicePixelRatio: 3,
    fitScreen: false
  });

  assert.ok(layout.scale < 1);
  assert.equal(Number.isInteger(layout.scale * 3), true);
  assert.ok(layout.width <= 390);
  assert.ok(layout.height <= 700);
});

test("a high-DPR portrait phone uses an integer physical pixel scale", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 390,
    viewportHeight: 700,
    canvasWidth: 256,
    canvasHeight: 455,
    devicePixelRatio: 3,
    fitScreen: true
  });

  assert.equal(layout.physicalScale, 4);
  assert.equal(layout.scale, 4 / 3);
  assert.equal(layout.width * 3, 256 * 4);
  assert.equal(layout.height * 3, 455 * 4);
});

test("canvas display scaling rejects invalid geometry", () => {
  assert.throws(() => canvasDisplayLayout({
    viewportWidth: 0,
    viewportHeight: 720,
    canvasWidth: 455,
    canvasHeight: 256
  }), /Invalid viewportWidth/);
});
