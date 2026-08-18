import assert from "node:assert/strict";
import test from "node:test";

import { navalProjectileSeed, navalProjectileUnit } from "./navalProjectileRandom.js";

test("naval projectile random units remain in the half-open unit interval", () => {
  let maximum = 0;
  for (let seed = 0; seed < 100_000; seed++) {
    const value = navalProjectileUnit(seed, seed % 7);
    assert.ok(value >= 0);
    assert.ok(value < 1);
    maximum = Math.max(maximum, value);
  }
  assert.ok(maximum > 0.999);
});

test("naval projectile seeds remain deterministic", () => {
  const origin = { x: 123.25, y: -71.5 };
  assert.equal(
    navalProjectileSeed(19, 3, 0x51a7b04d, origin),
    navalProjectileSeed(19, 3, 0x51a7b04d, origin)
  );
});
