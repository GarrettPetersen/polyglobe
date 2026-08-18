import assert from "node:assert/strict";
import test from "node:test";

import { historicalBattleScenarioById, LEPANTO_SCENARIO_ID } from "./historicalBattleScenarios.js";
import {
  createHistoricalBattleMap,
  historicalBattleMapEscapeAt,
  historicalBattleMapPointForLonLat,
  historicalBattleMapPolygons,
  historicalBattleMapWaterAt,
  historicalBattleMinimapLandMask
} from "./historicalBattleMap.js";

test("the real Lepanto field has a broad navigable gulf, islands, and solid shores", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const ionianSea = historicalBattleMapPointForLonLat(map, 20.15, 38.20);
  const gulfOfPatras = historicalBattleMapPointForLonLat(map, 21.10, 38.20);
  const cephalonia = historicalBattleMapPointForLonLat(map, 20.55, 38.20);
  const peloponnese = historicalBattleMapPointForLonLat(map, 21.70, 37.85);
  const corinthianGulf = historicalBattleMapPointForLonLat(map, 22.75, 38.05);
  const corinthIsthmus = historicalBattleMapPointForLonLat(map, 23.00, 37.93);

  assert.equal(historicalBattleMapWaterAt(map, ionianSea.x, ionianSea.y, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, gulfOfPatras.x, gulfOfPatras.y, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, cephalonia.x, cephalonia.y), false);
  assert.equal(historicalBattleMapWaterAt(map, peloponnese.x, peloponnese.y), false);
  assert.equal(historicalBattleMapWaterAt(map, corinthianGulf.x, corinthianGulf.y), true);
  assert.equal(historicalBattleMapWaterAt(map, corinthIsthmus.x, corinthIsthmus.y), false);
  assert.equal(historicalBattleMapWaterAt(map, -1, map.height / 2), false);
  assert.ok(historicalBattleMapPolygons(map).length >= 8);
  assert.ok(map.cells.length > 170_000);
  assert.ok(map.width >= 11_000);
  assert.ok(map.height >= 7_000);
});

test("Ottoman ships escape toward Lepanto rather than through the Corinth isthmus", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const beforeLine = historicalBattleMapPointForLonLat(map, 21.70, 38.30);
  const beyondLine = historicalBattleMapPointForLonLat(map, 21.74, 38.30);

  assert.equal(historicalBattleMapEscapeAt(map, "ottoman-empire", beforeLine.x, beforeLine.y), false);
  assert.equal(historicalBattleMapEscapeAt(map, "ottoman-empire", beyondLine.x, beyondLine.y), true);
  assert.equal(historicalBattleMapEscapeAt(map, "holy-league", beyondLine.x, beyondLine.y), false);
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

test("the Lepanto minimap distinguishes the gulf from its islands and mainland", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const width = 192;
  const height = 148;
  const landMask = historicalBattleMinimapLandMask(map, width, height);
  const maskAt = (longitudeDeg, latitudeDeg) => {
    const point = historicalBattleMapPointForLonLat(map, longitudeDeg, latitudeDeg);
    const x = Math.min(width - 1, Math.floor(point.x / map.width * width));
    const y = Math.min(height - 1, Math.floor(point.y / map.height * height));
    return landMask[x + y * width];
  };

  assert.equal(maskAt(20.15, 38.20), 0, "Ionian Sea should read as water");
  assert.equal(maskAt(21.10, 38.20), 0, "Gulf of Patras should read as water");
  assert.equal(maskAt(20.55, 38.20), 1, "Cephalonia should read as land");
  assert.equal(maskAt(21.70, 37.85), 1, "Peloponnese should read as land");
  assert.equal(maskAt(23.00, 37.93), 1, "Corinth isthmus should read as land");
});
