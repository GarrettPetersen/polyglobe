import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLakeBattleMapWaterMask,
  createLakeBattleMap,
  lakeBattleMapSpawnPoint,
  lakeBattleMapWaterAt,
  nearestLakeBattleCell
} from "./lakeBattleMap.js";
import {
  TERRAIN_WEATHER_MODE_STATIC,
  terrainRowUsesWorldWeather
} from "./terrainWeatherPolicy.js";

test("the battle lake is a deterministic connected hex terrain field", () => {
  const a = createLakeBattleMap(455, 256, 1234);
  const b = createLakeBattleMap(455, 256, 1234);

  assert.deepEqual(a.cells.map(cellSummary), b.cells.map(cellSummary));
  assert.ok(a.cells.every((cell) => cell.neighbors.length >= 2 && cell.neighbors.length <= 6));
  assert.ok(a.cells.some((cell) => cell.terrain.t === "forest"));
  assert.ok(a.cells.some((cell) => cell.terrain.t === "beach"));
  assert.ok(a.cells.some((cell) => cell.terrain.t === "lake"));
  assert.ok(a.cells.some((cell) => cell.terrain.t === "water" && cell.terrain.waterDepthBand >= 2));
  assert.ok(a.cells.every((cell) => cell.terrain.weatherMode === TERRAIN_WEATHER_MODE_STATIC));
  assert.ok(a.cells.every((cell) => terrainRowUsesWorldWeather(cell.terrain) === false));
});

test("battle collision follows the nearest drawn terrain cell", () => {
  const map = createLakeBattleMap(455, 256);
  for (const cell of map.cells) {
    if (cell.x < 0 || cell.x >= map.width || cell.y < 0 || cell.y >= map.height) continue;
    assert.equal(lakeBattleMapWaterAt(map, cell.x, cell.y), cell.water, `cell ${cell.id}`);
    assert.equal(nearestLakeBattleCell(map, cell.x, cell.y).id, cell.id);
  }
});

test("both ships spawn in clear navigable water", () => {
  const map = createLakeBattleMap(455, 256);
  const player = lakeBattleMapSpawnPoint(map, "player", 8);
  const enemy = lakeBattleMapSpawnPoint(map, "enemy", 8);

  assert.equal(lakeBattleMapWaterAt(map, player.x, player.y, 8), true);
  assert.equal(lakeBattleMapWaterAt(map, enemy.x, enemy.y, 8), true);
  assert.ok(Math.hypot(enemy.x - player.x, enemy.y - player.y) > 100);
});

test("the cached water mask exactly follows map collision", () => {
  const map = createLakeBattleMap(256, 455);
  const mask = buildLakeBattleMapWaterMask(map);
  assert.equal(mask.length, map.width * map.height);
  for (const point of [[0, 0], [128, 227], [64, 300], [220, 100]]) {
    const [x, y] = point;
    assert.equal(mask[y * map.width + x], lakeBattleMapWaterAt(map, x + 0.5, y + 0.5) ? 1 : 0);
  }
});

function cellSummary(cell) {
  return [cell.id, cell.x, cell.y, cell.water, cell.shoreDistance, cell.terrain.t, cell.terrain.waterDepthBand];
}
