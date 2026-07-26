import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildFreshWaterSurfaceMask,
  shipCanRefillFreshWater
} from "./freshWaterAccess.js";
import { buildGeodesicGraph } from "./geodesic.js";
import { MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS } from "./manualRiverHexChains.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";

const SALTWATER_PASSAGES = MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS[7];
const repoRoot = new URL("../../../", import.meta.url);

test("rivers and freshwater lakes refill casks", () => {
  assert.equal(refill("river", 12345), true);
  assert.equal(refill("openWater", 12345), false);
  assert.equal(refill("lake", 12345), true);
});

test("saltwater straits represented as river channels do not refill", () => {
  for (const tileId of SALTWATER_PASSAGES) {
    assert.equal(refill("river", tileId), false, `saltwater passage tile ${tileId}`);
  }
});

test("Mediterranean and Black Sea lake terrain remains saltwater", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const earthRows = applyManualTerrainOverrides(earth.tiles, 7);
  const graph = buildGeodesicGraph(7);
  const freshwater = buildFreshWaterSurfaceMask({
    graph,
    earthRows,
    saltwaterPassageTileIds: SALTWATER_PASSAGES
  });

  const saltwaterLakeTiles = [
    [161646, "Mediterranean Sea"],
    [98606, "Black Sea"],
    [34593, "Caribbean Sea"]
  ];
  for (const [tileId, label] of saltwaterLakeTiles) {
    assert.equal(earthRows[tileId].t, "lake", `${label} terrain fixture changed`);
    assert.equal(freshwater[tileId], 0, `${label} must remain saltwater`);
    assert.equal(refill("lake", tileId, false, Boolean(freshwater[tileId])), false);
  }

  const freshwaterLakeTiles = [
    [49959, "Lake Huron"],
    [124424, "Lake Victoria"]
  ];
  for (const [tileId, label] of freshwaterLakeTiles) {
    assert.equal(earthRows[tileId].t, "lake", `${label} terrain fixture changed`);
    assert.equal(freshwater[tileId], 1, `${label} must remain freshwater`);
    assert.equal(refill("lake", tileId, false, Boolean(freshwater[tileId])), true);
  }
});

test("frozen rivers do not refill", () => {
  assert.equal(refill("river", 12345, true), false);
  assert.equal(refill("lake", 12345, true), false);
});

function refill(
  navigationKind,
  waterTileId,
  frozen = false,
  freshwaterSurface = navigationKind === "lake"
) {
  return shipCanRefillFreshWater({
    navigationKind,
    waterTileId,
    frozen,
    freshwaterSurface,
    saltwaterPassageTileIds: SALTWATER_PASSAGES
  });
}
