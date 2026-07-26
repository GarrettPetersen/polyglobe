import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { RIVER_BASIN_ID } from "./riverBasins.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

const SUBDIVISIONS = 7;
const repoRoot = new URL("../../../", import.meta.url);

test("named Mekong basin follows river topology without crossing into the Yangtze", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  earth.tiles = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const topology = buildWorldNavigationTopology({
    graph,
    earthRows: earth.tiles,
    earthCache: earth,
    subdivisions: SUBDIVISIONS
  });

  assert.equal(topology.riverBasinIds[93216], RIVER_BASIN_ID.MEKONG);
  assert.equal(topology.riverBasinIds[92179], RIVER_BASIN_ID.MEKONG);
  assert.equal(topology.riverBasinIds[92926], RIVER_BASIN_ID.MEKONG);
  assert.equal(topology.riverBasinIds[92180], RIVER_BASIN_ID.NONE);
  assert.equal(topology.riverBasinIds[61636], RIVER_BASIN_ID.NONE);
});
