import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { RIVER_BASIN_ID } from "./riverBasins.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

const SUBDIVISIONS = 7;
const repoRoot = new URL("../../../", import.meta.url);
let productionTopologyPromise;

test("named Mekong basin follows river topology without crossing into the Yangtze", async () => {
  const topology = await buildProductionTopology();

  assert.equal(topology.riverBasinIds[93216], RIVER_BASIN_ID.MEKONG);
  assert.equal(topology.riverBasinIds[92179], RIVER_BASIN_ID.MEKONG);
  assert.equal(topology.riverBasinIds[92926], RIVER_BASIN_ID.MEKONG);
  assert.notEqual(topology.riverBasinIds[92180], RIVER_BASIN_ID.MEKONG);
  assert.equal(topology.riverBasinIds[61636], RIVER_BASIN_ID.EAST_CHINA_NETWORK);
});

test("narrowly distributed river fish have stable watershed anchors", async () => {
  const topology = await buildProductionTopology();
  const anchors = [
    [138275, RIVER_BASIN_ID.AMAZON],
    [150752, RIVER_BASIN_ID.MURRAY_DARLING],
    [61636, RIVER_BASIN_ID.EAST_CHINA_NETWORK],
    [15074, RIVER_BASIN_ID.AMUR],
    [61752, RIVER_BASIN_ID.PEARL],
    [161056, RIVER_BASIN_ID.RHINE],
    [24784, RIVER_BASIN_ID.DANUBE_BLACK_SEA_NETWORK],
    [24872, RIVER_BASIN_ID.VOLGA_CASPIAN_NETWORK],
    [98242, RIVER_BASIN_ID.ELBE_ODER_NETWORK],
    [98230, RIVER_BASIN_ID.VISTULA_BALTIC_NETWORK],
    [138903, RIVER_BASIN_ID.ORINOCO],
    [106954, RIVER_BASIN_ID.PARANA],
    [97492, RIVER_BASIN_ID.INDUS],
    [155083, RIVER_BASIN_ID.GANGES_BRAHMAPUTRA],
    [93194, RIVER_BASIN_ID.IRRAWADDY]
  ];

  for (const [tileId, basinId] of anchors) {
    assert.equal(topology.riverBasinIds[tileId], basinId);
  }
});

async function buildProductionTopology() {
  productionTopologyPromise ??= (async () => {
    const earth = JSON.parse(await readFile(
      new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
      "utf8"
    ));
    earth.tiles = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
    const graph = buildGeodesicGraph(SUBDIVISIONS);
    return buildWorldNavigationTopology({
      graph,
      earthRows: earth.tiles,
      earthCache: earth,
      subdivisions: SUBDIVISIONS
    });
  })();
  return productionTopologyPromise;
}
