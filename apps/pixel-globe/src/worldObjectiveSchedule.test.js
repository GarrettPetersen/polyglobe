import assert from "node:assert/strict";
import test from "node:test";
import { SHIP_STATS } from "./shipStats.js";
import {
  WORLD_OBJECTIVE_SCAN_INTERVAL_MS,
  worldObjectiveScanIsDue
} from "./worldObjectiveSchedule.js";

const PRODUCTION_PIXELS_PER_RADIAN = 2450;
const SMALLEST_DISCOVERY_RADIUS_PX = 48;

test("world-objective scans are limited to ten per second", () => {
  assert.equal(WORLD_OBJECTIVE_SCAN_INTERVAL_MS, 100);
  assert.equal(worldObjectiveScanIsDue(null, 1_000), true);
  assert.equal(worldObjectiveScanIsDue(1_000, 1_099), false);
  assert.equal(worldObjectiveScanIsDue(1_000, 1_100), true);
});

test("the fastest hull cannot skip the smallest discovery radius between scans", () => {
  const fastestTopSpeedRad = Math.max(...SHIP_STATS.map((ship) => ship.topSpeedRad));
  const maximumTravelPx = fastestTopSpeedRad * PRODUCTION_PIXELS_PER_RADIAN *
    WORLD_OBJECTIVE_SCAN_INTERVAL_MS / 1000;
  assert.ok(maximumTravelPx < SMALLEST_DISCOVERY_RADIUS_PX / 4, maximumTravelPx);
});

test("world-objective scans reject malformed and backward clocks", () => {
  assert.throws(() => worldObjectiveScanIsDue(-1, 100), /previous world-objective/);
  assert.throws(() => worldObjectiveScanIsDue(null, Number.NaN), /current world-objective/);
  assert.throws(() => worldObjectiveScanIsDue(200, 199), /moved backward/);
});
