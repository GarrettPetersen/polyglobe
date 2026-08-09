import assert from "node:assert/strict";
import test from "node:test";

import { chartVisualRepairBurden } from "./chartVisualRepairBurden.js";

test("chart repair burden treats subtle swell corrections as cheaper than obscuring weather", () => {
  const swells = chartVisualRepairBurden({ swellRepairPasses: 10 });
  const cloud = chartVisualRepairBurden({
    cloudBanksStarted: 1,
    partialCloudBanksStarted: 0
  });
  const fog = chartVisualRepairBurden({
    closingFogsStarted: 1,
    heatHazesStarted: 0,
    maximumFogDepthRatio: 0.75
  });
  const haze = chartVisualRepairBurden({ heatHazesStarted: 1 });

  assert.ok(swells.burdenScore < cloud.burdenScore);
  assert.ok(haze.burdenScore < cloud.burdenScore);
  assert.ok(cloud.burdenScore < fog.burdenScore);
});

test("chart repair burden rejects impossible cloud statistics", () => {
  assert.throws(() => chartVisualRepairBurden({
    cloudBanksStarted: 1,
    partialCloudBanksStarted: 2
  }), /cannot exceed/);
});
