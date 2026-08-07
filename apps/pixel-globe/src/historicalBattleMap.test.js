import assert from "node:assert/strict";
import test from "node:test";

import { historicalBattleScenarioById, LEPANTO_SCENARIO_ID } from "./historicalBattleScenarios.js";
import {
  createHistoricalBattleMap,
  historicalBattleMapPolygons,
  historicalBattleMapWaterAt
} from "./historicalBattleMap.js";

test("the authored Lepanto field has a broad navigable gulf and solid shores", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const centerX = map.width / 2;
  const centerY = map.height / 2;

  assert.equal(historicalBattleMapWaterAt(map, centerX, centerY, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, centerX, 30), false);
  assert.equal(historicalBattleMapWaterAt(map, centerX, map.height - 38), false);
  assert.equal(historicalBattleMapWaterAt(map, 280, 713), false);
  assert.equal(historicalBattleMapWaterAt(map, -1, centerY), false);
  assert.equal(historicalBattleMapPolygons(map).length, 2);
  assert.ok(map.cells.length > 10_000);
});

test("authored shore clearance rejects ships that only have their center in water", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const centerX = map.width / 2;
  let firstWaterY = 0;
  while (!historicalBattleMapWaterAt(map, centerX, firstWaterY)) firstWaterY += 1;

  assert.equal(historicalBattleMapWaterAt(map, centerX, firstWaterY), true);
  assert.equal(historicalBattleMapWaterAt(map, centerX, firstWaterY, 8), false);
  assert.equal(historicalBattleMapWaterAt(map, centerX, firstWaterY + 12, 8), true);
});
