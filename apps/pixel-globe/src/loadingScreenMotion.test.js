import assert from "node:assert/strict";
import test from "node:test";

import {
  LOADING_CAPSULE_HEIGHT,
  LOADING_CAPSULE_HORIZON_Y,
  LOADING_CAPSULE_WIDTH,
  loadingLayerMotion,
  loadingScreenCoverCrop,
  loadingScreenForegroundLayout,
  loadingScreenRenderSize,
  loadingWaveAmplitude,
  loadingWaveOffset
} from "./loadingScreenMotion.js";

test("loading screen cover crop fills landscape and portrait viewports without stretching", () => {
  const landscape = loadingScreenCoverCrop(1920, 1080);
  assert.equal(landscape.width, LOADING_CAPSULE_WIDTH);
  assert.ok(landscape.height < LOADING_CAPSULE_HEIGHT);
  assert.equal(landscape.x, 0);

  const portrait = loadingScreenCoverCrop(900, 1600);
  assert.equal(portrait.height, LOADING_CAPSULE_HEIGHT);
  assert.ok(portrait.width < LOADING_CAPSULE_WIDTH);
  assert.equal(portrait.y, 0);
});

test("loading foreground fits narrow screens while remaining anchored to the covered horizon", () => {
  const viewportWidth = 390;
  const viewportHeight = 844;
  const crop = loadingScreenCoverCrop(viewportWidth, viewportHeight);
  const foreground = loadingScreenForegroundLayout(viewportWidth, viewportHeight);
  const coveredHorizonY =
    (LOADING_CAPSULE_HORIZON_Y - crop.y) *
    viewportHeight /
    crop.height;

  assert.equal(foreground.x, 0);
  assert.equal(foreground.width, viewportWidth);
  assert.ok(foreground.y > 0);
  assert.ok(foreground.y + foreground.height < viewportHeight);
  assert.equal(foreground.horizonY, coveredHorizonY);
  assert.equal(
    foreground.y +
      LOADING_CAPSULE_HORIZON_Y * foreground.width / LOADING_CAPSULE_WIDTH,
    foreground.horizonY
  );
});

test("loading foreground retains the existing cover alignment on landscape screens", () => {
  const viewportWidth = 1920;
  const viewportHeight = 1080;
  const crop = loadingScreenCoverCrop(viewportWidth, viewportHeight);
  const foreground = loadingScreenForegroundLayout(viewportWidth, viewportHeight);
  const scale = viewportWidth / LOADING_CAPSULE_WIDTH;

  assert.equal(crop.x, 0);
  assert.equal(foreground.x, 0);
  assert.ok(Math.abs(foreground.y + crop.y * scale) < 1e-9);
  assert.equal(foreground.width, viewportWidth);
  assert.equal(foreground.height, LOADING_CAPSULE_HEIGHT * scale);
});

test("loading screen renders at the full viewport resolution", () => {
  const native = loadingScreenRenderSize(960, 540);
  assert.deepEqual(native, { width: 960, height: 540 });
  const fourK = loadingScreenRenderSize(3840, 2160);
  assert.deepEqual(fourK, { width: 3840, height: 2160 });
});

test("ocean ripple amplitude grows toward the foreground with continuous motion", () => {
  assert.equal(loadingWaveAmplitude(LOADING_CAPSULE_HORIZON_Y - 1), 0);
  const horizonAmplitude = loadingWaveAmplitude(LOADING_CAPSULE_HORIZON_Y);
  const middleAmplitude = loadingWaveAmplitude((LOADING_CAPSULE_HORIZON_Y + LOADING_CAPSULE_HEIGHT) / 2);
  const foregroundAmplitude = loadingWaveAmplitude(LOADING_CAPSULE_HEIGHT - 1);
  assert.ok(horizonAmplitude < middleAmplitude);
  assert.ok(middleAmplitude < foregroundAmplitude);
  for (const row of [LOADING_CAPSULE_HORIZON_Y, 500, LOADING_CAPSULE_HEIGHT - 1]) {
    assert.ok(Number.isFinite(loadingWaveOffset(row, 1234)));
    assert.ok(Math.abs(loadingWaveOffset(row, 1234)) <= loadingWaveAmplitude(row));
  }
  assert.notEqual(loadingWaveOffset(500, 1234), loadingWaveOffset(500, 1235));
});

test("title layers fly in once while the ship keeps a bounded bob", () => {
  const opening = loadingLayerMotion(0);
  assert.ok(opening.upperTextY < 0);
  assert.ok(opening.lowerTextY > 0);
  const settled = loadingLayerMotion(1400);
  assert.equal(settled.upperTextY, 0);
  assert.equal(settled.lowerTextY, 0);
  assert.ok(Math.abs(settled.shipY) <= 2.5);
  assert.deepEqual(loadingLayerMotion(500, true), { upperTextY: 0, lowerTextY: 0, shipY: 0 });
});
