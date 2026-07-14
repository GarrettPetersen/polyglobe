import assert from "node:assert/strict";
import test from "node:test";

import {
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
  assert.equal(initial.length, 4);
  assert.ok(initial.every((pixel) => (
    Number.isInteger(pixel.x)
    && Number.isInteger(pixel.y)
    && Number.isInteger(pixel.size)
    && pixel.size >= 2
    && pixel.alpha >= 0.72
  )));

  advanceCannonSmokeBursts([burst], 0.2);
  advanceCannonSmokeBursts([burst], 0.1);
  const expanded = cannonSmokePixels(burst);
  assert.equal(expanded.length, 20);
  assert.ok(expanded.some((pixel) => pixel.size === 4));
  assert.ok(Math.max(...expanded.map((pixel) => pixel.x + pixel.size)) - Math.min(...expanded.map((pixel) => pixel.x)) >= 9);
  assert.ok(Math.max(...expanded.map((pixel) => pixel.y + pixel.size)) - Math.min(...expanded.map((pixel) => pixel.y)) >= 9);
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
