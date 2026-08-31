import assert from "node:assert/strict";
import test from "node:test";

import { historicalBattleScenarioById, LEPANTO_SCENARIO_ID } from "./historicalBattleScenarios.js";
import {
  createHistoricalBattleMap,
  historicalBattleMapEscapeAt,
  historicalBattleMapPointForLonLat,
  historicalBattleMapPolygons,
  historicalBattleMapWaterAt,
  historicalBattleMinimapLandMask,
  historicalBattleTerrainWindowMap
} from "./historicalBattleMap.js";
import {
  assertStaticTerrainCells,
  TERRAIN_WEATHER_MODE_STATIC,
  terrainRowUsesWorldWeather
} from "./terrainWeatherPolicy.js";

test("the Lepanto field is a ship-scale crop of the historical battle water", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const leagueWater = historicalBattleMapPointForLonLat(map, 21.15, 38.23);
  const ottomanWater = historicalBattleMapPointForLonLat(map, 21.19, 38.23);
  const cephalonia = historicalBattleMapPointForLonLat(map, 20.55, 38.20);
  const echinades = historicalBattleMapPointForLonLat(map, 21.38, 38.20);
  const mainland = historicalBattleMapPointForLonLat(map, 21.50, 38.10);

  assert.equal(historicalBattleMapWaterAt(map, leagueWater.x, leagueWater.y, 20), true);
  assert.equal(historicalBattleMapWaterAt(map, ottomanWater.x, ottomanWater.y, 20), true);
  assert.ok(cephalonia.x < 0, "Cephalonia should be west of the tactical map");
  assert.equal(historicalBattleMapWaterAt(map, echinades.x, echinades.y), false);
  assert.equal(historicalBattleMapWaterAt(map, mainland.x, mainland.y), false);
  assert.equal(historicalBattleMapWaterAt(map, -1, map.height / 2), false);
  assert.ok(historicalBattleMapPolygons(map).length >= 3);
  assert.ok(map.width >= 48_000);
  assert.ok(map.height >= 43_000);
  assert.equal(map.cells, undefined, "the full 48k map must not allocate every terrain tile");
});

test("Ottoman ships escape east into the Gulf of Patras", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const beforeLine = historicalBattleMapPointForLonLat(map, 21.50, 38.25);
  const beyondLine = historicalBattleMapPointForLonLat(map, 21.54, 38.25);

  assert.equal(historicalBattleMapEscapeAt(map, "ottoman-empire", beforeLine.x, beforeLine.y), false);
  assert.equal(historicalBattleMapEscapeAt(map, "ottoman-empire", beyondLine.x, beyondLine.y), true);
  assert.equal(historicalBattleMapEscapeAt(map, "holy-league", beyondLine.x, beyondLine.y), false);
});

test("authored shore clearance rejects ships that only have their center in water", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const coast = historicalBattleMapPointForLonLat(map, 21.38, 38.20);
  const terrainWindow = historicalBattleTerrainWindowMap(map, {
    minX: coast.x - 500,
    minY: coast.y - 500,
    maxX: coast.x + 500,
    maxY: coast.y + 500
  });
  const coastalWater = terrainWindow.cells.find((cell) => cell.water && cell.shoreDistance === 1);
  const openWater = terrainWindow.cells.find((cell) => cell.water && cell.shoreDistance >= 4);

  assert.ok(coastalWater);
  assert.ok(openWater);
  assert.equal(historicalBattleMapWaterAt(map, coastalWater.x, coastalWater.y), true);
  assert.equal(historicalBattleMapWaterAt(map, coastalWater.x, coastalWater.y, 12), false);
  assert.equal(historicalBattleMapWaterAt(map, openWater.x, openWater.y, 8), true);
});

test("historical battle terrain cannot query weather with arena-local tile ids", () => {
  const map = createHistoricalBattleMap(historicalBattleScenarioById(LEPANTO_SCENARIO_ID).map);
  const center = historicalBattleMapPointForLonLat(map, 21.2, 38.23);
  const terrainWindow = historicalBattleTerrainWindowMap(map, {
    minX: center.x - 500,
    minY: center.y - 500,
    maxX: center.x + 500,
    maxY: center.y + 500
  });

  assertStaticTerrainCells(terrainWindow.cells, "Historical battle terrain");
  assert.ok(terrainWindow.cells.every((cell) => (
    cell.terrain.weatherMode === TERRAIN_WEATHER_MODE_STATIC &&
    terrainRowUsesWorldWeather(cell.terrain) === false
  )));
});

test("the Lepanto minimap distinguishes the battle water from islands and mainland", () => {
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

  assert.equal(maskAt(21.15, 38.23), 0, "Holy League deployment should read as water");
  assert.equal(maskAt(21.19, 38.23), 0, "Ottoman deployment should read as water");
  assert.equal(maskAt(21.38, 38.20), 1, "Echinades should read as land");
  assert.equal(maskAt(21.50, 38.10), 1, "mainland should read as land");
});
