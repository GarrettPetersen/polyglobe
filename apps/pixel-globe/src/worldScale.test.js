import assert from "node:assert/strict";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  WORLD_GAME_TIME_SCALE,
  WORLD_GLOBE_SUBDIVISIONS,
  WORLD_KINEMATIC_SCALE,
  WORLD_PIXELS_PER_RADIAN,
  WORLD_RENDER_SCALE,
  WORLD_RUNTIME_WEATHER_SUBDIVISIONS,
  WORLD_SHIP_SCREEN_SPEED_SCALE,
  buildFineToCoarseTileMapping,
  expandCoarseTileMask,
  geodesicTileCount
} from "./worldScale.js";

test("the larger globe balances screen speed, longer days, and longer voyages", () => {
  assert.equal(WORLD_GLOBE_SUBDIVISIONS, 8);
  assert.equal(WORLD_RUNTIME_WEATHER_SUBDIVISIONS, 7);
  assert.equal(WORLD_RENDER_SCALE, 2.5);
  assert.equal(WORLD_PIXELS_PER_RADIAN, 6125);
  assert.equal(WORLD_KINEMATIC_SCALE, 0.48);
  assert.equal(WORLD_RENDER_SCALE * WORLD_KINEMATIC_SCALE, WORLD_SHIP_SCREEN_SPEED_SCALE);
  assert.equal(86400 / WORLD_GAME_TIME_SCALE, 32);
  const inGameVoyageDurationRatio = WORLD_GAME_TIME_SCALE / 3600 / WORLD_KINEMATIC_SCALE;
  assert.ok(inGameVoyageDurationRatio > 1.56 && inGameVoyageDurationRatio < 1.57);
});

test("adjacent subdivision levels map every fine weather cell to a coarse parent", () => {
  const graph = buildGeodesicGraph(4);
  const coarseSubdivisions = 3;
  const coarseTileCount = geodesicTileCount(coarseSubdivisions);
  const mapping = buildFineToCoarseTileMapping(graph, coarseSubdivisions);
  assert.equal(mapping.length, graph.tileCount);
  for (let tileId = 0; tileId < coarseTileCount; tileId++) assert.equal(mapping[tileId], tileId);
  for (let tileId = coarseTileCount; tileId < graph.tileCount; tileId++) {
    assert.ok(mapping[tileId] < coarseTileCount);
    assert.ok(graph.neighbors[tileId].includes(mapping[tileId]));
  }

  const coarseMask = Uint8Array.from({ length: coarseTileCount }, (_, tileId) => tileId & 0xff);
  const fineMask = new Uint8Array(graph.tileCount);
  expandCoarseTileMask(coarseMask, mapping, fineMask);
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    assert.equal(fineMask[tileId], coarseMask[mapping[tileId]]);
  }
});

test("coarser discrete weather maps every fine tile to its nearest climate cell", () => {
  const graph = buildGeodesicGraph(4);
  const mapping = buildFineToCoarseTileMapping(graph, 2);
  const coarseTileCount = geodesicTileCount(2);
  assert.equal(mapping.length, graph.tileCount);
  for (let tileId = 0; tileId < coarseTileCount; tileId++) assert.equal(mapping[tileId], tileId);
  for (const coarseTileId of mapping) assert.ok(coarseTileId < coarseTileCount);
});
