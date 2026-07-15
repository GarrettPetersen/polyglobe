import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_VISUAL_MAX_OFFSET_PX,
  cityBankPreferenceVector,
  cityVisualPlacementCandidates,
  selectCityVisualOffset
} from "./cityVisualPlacement.js";

test("city placement samples the center and staggered half-hex directions", () => {
  const candidates = cityVisualPlacementCandidates();
  assert.deepEqual(candidates[0], { x: 0, y: 0 });
  assert.ok(candidates.some(({ x, y }) => x === CITY_VISUAL_MAX_OFFSET_PX && y === 0));
  assert.ok(candidates.some(({ x, y }) => x === -CITY_VISUAL_MAX_OFFSET_PX && y === 0));
  assert.ok(candidates.some(({ x, y }) => x === 0 && y === -CITY_VISUAL_MAX_OFFSET_PX));
  assert.equal(new Set(candidates.map(({ x, y }) => `${x},${y}`)).size, candidates.length);
});

test("river overlap dominates the small cost of moving a city", () => {
  const offset = selectCityVisualOffset(({ x }) => ({
    riverOverlapPixels: x <= 0 ? 1 : 0,
    centerOnOpenWater: false
  }));
  assert.ok(offset.x > 0);
});

test("cities stay centered when shifting cannot uncover river", () => {
  const offset = selectCityVisualOffset(() => ({
    riverOverlapPixels: 0,
    centerOnOpenWater: false
  }));
  assert.deepEqual(offset, { x: 0, y: 0 });
});

test("manual bank preferences break otherwise equal placement ties", () => {
  const east = cityBankPreferenceVector({ city: "Cairo", country: "Egypt" });
  const offset = selectCityVisualOffset(() => ({
    riverOverlapPixels: 0,
    centerOnOpenWater: false
  }), east);
  assert.deepEqual(offset, { x: 4, y: 0 });
});

test("moving a city center into open water is strongly discouraged", () => {
  const offset = selectCityVisualOffset(({ x, y }) => ({
    riverOverlapPixels: x === 0 && y === 0 ? 2 : 0,
    centerOnOpenWater: x !== 0 || y !== 0
  }));
  assert.deepEqual(offset, { x: 0, y: 0 });
});
