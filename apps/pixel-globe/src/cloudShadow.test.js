import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOUD_RECEIVER_ELEVATED,
  CLOUD_RECEIVER_LAND,
  CLOUD_RECEIVER_OCEAN,
  cloudLifecycleAlpha,
  cloudShadowOffset
} from "./cloudShadow.js";

test("clouds fade in, remain fully opaque, and fade out", () => {
  assert.equal(cloudLifecycleAlpha(0), 0);
  assert.ok(cloudLifecycleAlpha(0.1) > 0);
  assert.ok(cloudLifecycleAlpha(0.1) < 1);
  assert.equal(cloudLifecycleAlpha(0.22), 1);
  assert.equal(cloudLifecycleAlpha(0.5), 1);
  assert.equal(cloudLifecycleAlpha(0.78), 1);
  assert.ok(cloudLifecycleAlpha(0.9) > 0);
  assert.ok(cloudLifecycleAlpha(0.9) < 1);
  assert.equal(cloudLifecycleAlpha(1), 0);
});

test("higher receivers meet the same cloud shadow closer to its source", () => {
  const input = {
    sunAltitude: 0.35,
    awayFromSun: { x: 1, y: 0 }
  };
  const ocean = cloudShadowOffset({ ...input, receiverTier: CLOUD_RECEIVER_OCEAN });
  const land = cloudShadowOffset({ ...input, receiverTier: CLOUD_RECEIVER_LAND });
  const elevated = cloudShadowOffset({ ...input, receiverTier: CLOUD_RECEIVER_ELEVATED });

  assert.ok(ocean.distance > land.distance);
  assert.ok(land.distance > elevated.distance);
  assert.equal(ocean.y, 0);
  assert.equal(land.y, -2);
  assert.equal(elevated.y, -7);
});

test("cloud shadow projection changes continuously instead of selecting direction bins", () => {
  const before = cloudShadowOffset({
    sunAltitude: 0.42,
    awayFromSun: { x: Math.cos(0.2), y: Math.sin(0.2) },
    receiverTier: CLOUD_RECEIVER_OCEAN
  });
  const after = cloudShadowOffset({
    sunAltitude: 0.421,
    awayFromSun: { x: Math.cos(0.201), y: Math.sin(0.201) },
    receiverTier: CLOUD_RECEIVER_OCEAN
  });
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 0.2);
  assert.notDeepEqual(after, before);
});

test("cloud shadow projection rejects malformed receiver geometry", () => {
  assert.throws(() => cloudShadowOffset({
    sunAltitude: 0.4,
    awayFromSun: { x: 0, y: 0 },
    receiverTier: CLOUD_RECEIVER_OCEAN
  }), /cannot be zero/);
  assert.throws(() => cloudShadowOffset({
    sunAltitude: 0.4,
    awayFromSun: { x: 1, y: 0 },
    receiverTier: 3
  }), /receiver tier/);
  assert.throws(() => cloudLifecycleAlpha(NaN), /finite/);
});
