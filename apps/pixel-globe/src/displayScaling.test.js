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
  for (const value of [layout.width, layout.height, layout.left, layout.top]) {
    assert.ok(Math.abs(value * dpr - Math.round(value * dpr)) < 1e-9);
  }
});

test("canvas display scaling rejects invalid geometry", () => {
  assert.throws(() => canvasDisplayLayout({
    viewportWidth: 0,
    viewportHeight: 720,
    canvasWidth: 455,
    canvasHeight: 256
  }), /Invalid viewportWidth/);
});
