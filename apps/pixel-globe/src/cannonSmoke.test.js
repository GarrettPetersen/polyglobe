import assert from "node:assert/strict";
import test from "node:test";

import {
  CANNON_SMOKE_LAYER_BEHIND,
  CANNON_SMOKE_LAYER_FRONT,
  CANNON_SMOKE_TTL_SECONDS,
  advanceCannonSmokeBursts,
  cannonSmokePixels,
  createCannonSmokeBurst
} from "./cannonSmoke.js";

const CANNONBALL = Object.freeze({
  kind: "cannon",
  startX: 20,
  startY: 30,
  targetX: 70,
  targetY: 30,
  seed: 1234
});

test("cannon smoke starts at the muzzle and expands on the pixel grid", () => {
  const burst = createCannonSmokeBurst(CANNONBALL);
  const initial = cannonSmokePixels(burst);
  assert.equal(initial.length, 6);
  assert.ok(initial.every((pixel) => (
    Number.isInteger(pixel.x)
    && Number.isInteger(pixel.y)
    && Number.isInteger(pixel.size)
    && pixel.size >= 3
    && pixel.alpha >= 0.78
  )));

  advanceCannonSmokeBursts([burst], 0.2);
  advanceCannonSmokeBursts([burst], 0.1);
  const expanded = cannonSmokePixels(burst);
  assert.equal(expanded.length, 30);
  assert.ok(expanded.some((pixel) => pixel.size >= 5));
  assert.ok(Math.max(...expanded.map((pixel) => pixel.x + pixel.size)) - Math.min(...expanded.map((pixel) => pixel.x)) >= 12);
  assert.ok(Math.max(...expanded.map((pixel) => pixel.y + pixel.size)) - Math.min(...expanded.map((pixel) => pixel.y)) >= 12);
});

test("cannon smoke lingers long enough for successive broadsides to overlap", () => {
  const burst = createCannonSmokeBurst(CANNONBALL);
  let bursts = advanceCannonSmokeBursts([burst], 0.25);
  for (let elapsed = 0.25; elapsed < 1.5; elapsed += 0.25) {
    bursts = advanceCannonSmokeBursts(bursts, 0.25);
  }
  assert.equal(bursts.length, 1);
  assert.ok(cannonSmokePixels(bursts[0]).length >= 24);
});

test("cannon smoke draws on the same side of its emitter as the firing muzzle", () => {
  const nearSide = createCannonSmokeBurst({
    ...CANNONBALL,
    startY: 36,
    smokeOcclusionY: 30
  });
  const farSide = createCannonSmokeBurst({
    ...CANNONBALL,
    startY: 24,
    smokeOcclusionY: 30
  });
  const shoreward = createCannonSmokeBurst({
    ...CANNONBALL,
    targetY: 10
  });

  assert.equal(nearSide.drawLayer, CANNON_SMOKE_LAYER_FRONT);
  assert.equal(farSide.drawLayer, CANNON_SMOKE_LAYER_BEHIND);
  assert.equal(shoreward.drawLayer, CANNON_SMOKE_LAYER_BEHIND);
});

test("cannon smoke persists independently and expires at a fixed time", () => {
  const burst = createCannonSmokeBurst(CANNONBALL);
  let bursts = [burst];
  for (let elapsed = 0; elapsed < CANNON_SMOKE_TTL_SECONDS; elapsed += 0.25) {
    bursts = advanceCannonSmokeBursts(bursts, Math.min(0.25, CANNON_SMOKE_TTL_SECONDS - elapsed));
  }
  assert.equal(bursts.length, 0);
});

test("arrow projectiles cannot create cannon smoke", () => {
  assert.throws(
    () => createCannonSmokeBurst({ ...CANNONBALL, kind: "arrow" }),
    /requires a cannon projectile/
  );
});
