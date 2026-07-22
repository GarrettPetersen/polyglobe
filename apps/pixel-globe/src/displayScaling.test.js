import assert from "node:assert/strict";
import test from "node:test";
import { canvasDisplayLayout } from "./displayScaling.js";

test("windowed canvas continuously fills the available display", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 1920,
    viewportHeight: 1080,
    canvasWidth: 455,
    canvasHeight: 256
  });

  assert.equal(layout.scale, 1080 / 256);
  assert.equal(layout.width, 1919.53125);
  assert.equal(layout.height, 1080);
  assert.equal(layout.left, 0.234375);
  assert.equal(layout.top, 0);
});

test("responsive logical geometry leaves less than one CSS pixel unused", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 1100,
    viewportHeight: 700,
    canvasWidth: 428,
    canvasHeight: 272
  });

  assert.equal(layout.width, 1100);
  assert.ok(700 - layout.height < 1);
  assert.equal(layout.left, 0);
  assert.ok(layout.top > 0 && layout.top < 0.5);
});

test("a canvas larger than the viewport scales down instead of overflowing", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 390,
    viewportHeight: 700,
    canvasWidth: 455,
    canvasHeight: 256
  });

  assert.ok(layout.scale < 1);
  assert.ok(layout.width <= 390);
  assert.ok(layout.height <= 700);
});

test("portrait layouts use the same continuous scaling policy", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 390,
    viewportHeight: 700,
    canvasWidth: 256,
    canvasHeight: 459
  });

  assert.equal(layout.scale, 390 / 256);
  assert.equal(layout.width, 390);
  assert.ok(700 - layout.height < 1);
});

test("a 32:9 canvas continuously fills an ultrawide monitor", () => {
  const layout = canvasDisplayLayout({
    viewportWidth: 5120,
    viewportHeight: 1440,
    canvasWidth: 910,
    canvasHeight: 256
  });

  assert.equal(layout.scale, 1440 / 256);
  assert.equal(layout.width, 5118.75);
  assert.equal(layout.height, 1440);
  assert.equal(layout.left, 0.625);
  assert.equal(layout.top, 0);
});

test("canvas display scaling rejects invalid geometry", () => {
  assert.throws(() => canvasDisplayLayout({
    viewportWidth: 0,
    viewportHeight: 720,
    canvasWidth: 455,
    canvasHeight: 256
  }), /Invalid viewportWidth/);
});
