import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS,
  applyManualTerrainOverrides
} from "./manualTerrainOverrides.js";

const SUBDIVISIONS = 7;
const GULF_OF_KHAMBHAT_TILE_ID = 38891;
const repoRoot = new URL("../../../", import.meta.url);

test("Cambay's Gulf of Khambhat hex is corrected to shallow navigable water", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);

  assert.deepEqual(
    MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[SUBDIVISIONS],
    [GULF_OF_KHAMBHAT_TILE_ID]
  );
  assert.equal(earth.tiles[GULF_OF_KHAMBHAT_TILE_ID].t, "hot_steppe");
  assert.deepEqual(correctedRows[GULF_OF_KHAMBHAT_TILE_ID], {
    id: GULF_OF_KHAMBHAT_TILE_ID,
    t: "beach",
    e: -0.20500000000000002,
    o: 1
  });
  assert.equal(correctedRows[38890], earth.tiles[38890]);
  assert.ok(Math.abs(graph.latDeg[GULF_OF_KHAMBHAT_TILE_ID] - 22.2082) < 0.01);
  assert.ok(Math.abs(graph.lonDeg[GULF_OF_KHAMBHAT_TILE_ID] - 72.5391) < 0.01);
});
