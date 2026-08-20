import assert from "node:assert/strict";
import test from "node:test";

import {
  LANDMARK_DISCOVERY_BOB_PERIOD_MS,
  LANDMARK_DISCOVERY_ICON_ID,
  createLandmarkDiscoveryCollectionEffect,
  discoveryHasLandmarkIndicator,
  landmarkDiscoveryIndicatorRect
} from "./landmarkDiscoveryIndicator.js";
import { itemAcquisitionEffectFrame } from "./itemAcquisitionEffect.js";

test("physical discoveries receive eye indicators but voyage feats do not", () => {
  assert.equal(discoveryHasLandmarkIndicator({ kind: "mountain" }), true);
  assert.equal(discoveryHasLandmarkIndicator({ kind: "landmark" }), true);
  assert.equal(discoveryHasLandmarkIndicator({ kind: "legend" }), true);
  assert.equal(discoveryHasLandmarkIndicator({ kind: "achievement" }), false);
});

test("landmark eye stays on the pixel grid while gently bobbing above its tile", () => {
  const start = landmarkDiscoveryIndicatorRect({
    discoveryId: "landmark-stonehenge",
    centerX: 100,
    centerY: 80,
    landmarkHalfSize: 32,
    nowMs: 0
  });
  const later = landmarkDiscoveryIndicatorRect({
    discoveryId: "landmark-stonehenge",
    centerX: 100,
    centerY: 80,
    landmarkHalfSize: 32,
    nowMs: LANDMARK_DISCOVERY_BOB_PERIOD_MS / 4
  });

  assert.deepEqual({ x: start.x, w: start.w, h: start.h }, { x: 92, w: 16, h: 16 });
  assert.ok(Number.isInteger(start.y));
  assert.ok(Number.isInteger(later.y));
  assert.notEqual(later.y, start.y);
  assert.ok(Math.abs(later.y - start.y) <= 3);
});

test("reduced motion keeps the eye fixed", () => {
  const rectAt = (nowMs) => landmarkDiscoveryIndicatorRect({
    discoveryId: "landmark-petra",
    centerX: 50,
    centerY: 60,
    landmarkHalfSize: 32,
    nowMs,
    reducedMotion: true
  });
  assert.deepEqual(rectAt(0), rectAt(LANDMARK_DISCOVERY_BOB_PERIOD_MS / 3));
});

test("discovery collection flies the eye to the requested HUD target", () => {
  const effect = createLandmarkDiscoveryCollectionEffect({
    startRect: { x: 90, y: 20, w: 16, h: 16 },
    startedAtMs: 1000,
    targetX: 6,
    targetY: 6,
    arrivalSoundId: "discovery-success"
  });

  assert.equal(effect.iconId, LANDMARK_DISCOVERY_ICON_ID);
  assert.equal(effect.arrivalSoundId, "discovery-success");
  assert.deepEqual(itemAcquisitionEffectFrame(effect, 1700), {
    complete: true,
    x: 6,
    y: 6
  });
});
