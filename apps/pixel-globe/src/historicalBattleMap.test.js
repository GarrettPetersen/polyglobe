import assert from "node:assert/strict";
import test from "node:test";

import { historicalBattleScenarioById, LEPANTO_SCENARIO_ID } from "./historicalBattleScenarios.js";
import {
  createHistoricalBattleMap,
  historicalBattleMapPointForLonLat,
  historicalBattleMapPolygons,
  historicalBattleMapWaterAt
} from "./historicalBattleMap.js";

test("the real Lepanto field has a broad navigable gulf, islands, and solid shores", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const ionianSea = historicalBattleMapPointForLonLat(map, 20.15, 38.20);
  const gulfOfPatras = historicalBattleMapPointForLonLat(map, 21.10, 38.20);
  const cephalonia = historicalBattleMapPointForLonLat(map, 20.55, 38.20);
  const peloponnese = historicalBattleMapPointForLonLat(map, 21.70, 37.85);

  assert.equal(historicalBattleMapWaterAt(map, ionianSea.x, ionianSea.y, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, gulfOfPatras.x, gulfOfPatras.y, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, cephalonia.x, cephalonia.y), false);
  assert.equal(historicalBattleMapWaterAt(map, peloponnese.x, peloponnese.y), false);
  assert.equal(historicalBattleMapWaterAt(map, -1, map.height / 2), false);
  assert.ok(historicalBattleMapPolygons(map).length >= 8);
  assert.ok(map.cells.length > 90_000);
  assert.ok(map.width >= 7_000);
  assert.ok(map.height >= 5_000);
});

test("authored shore clearance rejects ships that only have their center in water", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const coastalWater = map.cells.find((cell) => cell.water && cell.shoreDistance === 1);
  const openWater = map.cells.find((cell) => cell.water && cell.shoreDistance >= 4);

  assert.ok(coastalWater);
  assert.ok(openWater);
  assert.equal(historicalBattleMapWaterAt(map, coastalWater.x, coastalWater.y), true);
  assert.equal(historicalBattleMapWaterAt(map, coastalWater.x, coastalWater.y, 12), false);
  assert.equal(historicalBattleMapWaterAt(map, openWater.x, openWater.y, 8), true);
});
