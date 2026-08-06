import assert from "node:assert/strict";
import test from "node:test";

import {
  HULL_SPLINTER_TTL_SECONDS,
  advanceHullSplinterBursts,
  createHullSplinterBurst,
  hullSplinterPixels
} from "./hullSplinters.js";

const PROJECTILE = Object.freeze({
  kind: "cannon",
  startX: 10,
  startY: 20,
  targetX: 50,
  targetY: 20,
  seed: 811,
  damage: 1.5
});

test("cannon hull damage throws a pixel-snapped splinter burst", () => {
  const burst = createHullSplinterBurst(PROJECTILE, { x: 42, y: 20 });
  advanceHullSplinterBursts([burst], 0.2);
  const pixels = hullSplinterPixels(burst);
  assert.ok(pixels.length >= 8);
  assert.ok(pixels.every((pixel) => Number.isInteger(pixel.x) && Number.isInteger(pixel.y)));
  assert.ok(pixels.some((pixel) => pixel.x > 42));
  assert.ok(pixels.some((pixel) => pixel.y < 20));
});

test("arrow impacts make fewer splinters than cannon impacts", () => {
  const cannon = createHullSplinterBurst(PROJECTILE, { x: 42, y: 20 });
  const arrow = createHullSplinterBurst({ ...PROJECTILE, kind: "arrow", damage: 0.5 }, { x: 42, y: 20 });
  assert.ok(hullSplinterPixels(cannon).length > hullSplinterPixels(arrow).length);
});

test("incendiary arrow impacts retain their fire state and read more strongly", () => {
  const ordinary = createHullSplinterBurst(
    { ...PROJECTILE, kind: "arrow", damage: 0.5 },
    { x: 42, y: 20 }
  );
  const incendiary = createHullSplinterBurst(
    { ...PROJECTILE, kind: "arrow", damage: 0.5, incendiary: true },
    { x: 42, y: 20 }
  );
  assert.equal(incendiary.incendiary, true);
  assert.ok(hullSplinterPixels(incendiary).length > hullSplinterPixels(ordinary).length);
});

test("hull splinters persist briefly and then expire", () => {
  const burst = createHullSplinterBurst(PROJECTILE, { x: 42, y: 20 });
  assert.equal(advanceHullSplinterBursts([burst], 0.2).length, 1);
  assert.equal(advanceHullSplinterBursts([burst], 0.2).length, 1);
  assert.equal(advanceHullSplinterBursts([burst], HULL_SPLINTER_TTL_SECONDS - 0.4).length, 0);
});
