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
  assert.ok(initial.length > 0);
  assert.ok(initial.every((pixel) => Number.isInteger(pixel.x) && Number.isInteger(pixel.y)));

  advanceCannonSmokeBursts([burst], 0.2);
  advanceCannonSmokeBursts([burst], 0.1);
  const expanded = cannonSmokePixels(burst);
  assert.ok(expanded.some((pixel) => pixel.size === 2));
  assert.ok(expanded.some((pixel) => pixel.x > CANNONBALL.startX + 1));
  assert.ok(expanded.some((pixel) => pixel.y < CANNONBALL.startY));
});

test("cannon smoke persists independently and expires at a fixed time", () => {
  const burst = createCannonSmokeBurst(CANNONBALL);
  assert.equal(advanceCannonSmokeBursts([burst], 0.25).length, 1);
  assert.equal(advanceCannonSmokeBursts([burst], 0.25).length, 1);
  assert.equal(advanceCannonSmokeBursts([burst], CANNON_SMOKE_TTL_SECONDS - 0.5).length, 0);
});

test("arrow projectiles cannot create cannon smoke", () => {
  assert.throws(
    () => createCannonSmokeBurst({ ...CANNONBALL, kind: "arrow" }),
    /requires a cannon projectile/
  );
});
