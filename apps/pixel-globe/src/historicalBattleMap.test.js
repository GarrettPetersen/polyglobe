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

  assert.equal(historicalBattleMapWaterAt(map, 1536, 864, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, 1536, 30), false);
  assert.equal(historicalBattleMapWaterAt(map, 1536, 1690), false);
  assert.equal(historicalBattleMapWaterAt(map, 210, 535), false);
  assert.equal(historicalBattleMapWaterAt(map, -1, 864), false);
  assert.equal(historicalBattleMapPolygons(map).length, 2);
  assert.ok(map.cells.length > 10_000);
});

test("authored shore clearance rejects ships that only have their center in water", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  let firstWaterY = 0;
  while (!historicalBattleMapWaterAt(map, 1536, firstWaterY)) firstWaterY += 1;

  assert.equal(historicalBattleMapWaterAt(map, 1536, firstWaterY), true);
  assert.equal(historicalBattleMapWaterAt(map, 1536, firstWaterY, 8), false);
  assert.equal(historicalBattleMapWaterAt(map, 1536, firstWaterY + 12, 8), true);
});
