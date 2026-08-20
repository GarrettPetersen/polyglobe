import assert from "node:assert/strict";
import test from "node:test";

import {
  SEASONAL_SNOW_COVER_VISIBLE_THRESHOLD,
  SNOW_GROUND_DEPTH_VISIBLE_THRESHOLD,
  snowGroundShouldBeVisible
} from "../../dist/climate/discreteWeatherYearBake.js";

test("seasonal cold cover makes winter snow broad rather than precipitation-speckled", () => {
  assert.equal(
    snowGroundShouldBeVisible(0, SEASONAL_SNOW_COVER_VISIBLE_THRESHOLD, true),
    true
  );
  assert.equal(
    snowGroundShouldBeVisible(0, SEASONAL_SNOW_COVER_VISIBLE_THRESHOLD, false),
    false
  );
});

test("accumulated snowfall remains visible independently of the seasonal floor", () => {
  assert.equal(
    snowGroundShouldBeVisible(SNOW_GROUND_DEPTH_VISIBLE_THRESHOLD + 0.01, 0, false),
    true
  );
  assert.equal(
    snowGroundShouldBeVisible(SNOW_GROUND_DEPTH_VISIBLE_THRESHOLD, 0, true),
    false
  );
});

test("snow visibility rejects invalid model inputs", () => {
  assert.throws(() => snowGroundShouldBeVisible(-0.1, 0, true), /snow depth/);
  assert.throws(() => snowGroundShouldBeVisible(0, 1.1, true), /seasonal snow cover/);
});
