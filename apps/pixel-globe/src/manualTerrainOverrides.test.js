import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS,
  applyManualTerrainOverrides,
  assertManualShallowWaterReachesOcean
} from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

const SUBDIVISIONS = 7;
const GULF_OF_KHAMBHAT_TILE_ID = 38891;
const GULF_OF_KHAMBHAT_OUTLET_TILE_ID = 38903;
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
    [GULF_OF_KHAMBHAT_TILE_ID, GULF_OF_KHAMBHAT_OUTLET_TILE_ID]
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

test("Cambay's corrected bay has a continuous water route to the Arabian Sea", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const visited = new Set([GULF_OF_KHAMBHAT_TILE_ID]);
  const queue = [GULF_OF_KHAMBHAT_TILE_ID];
  let oceanTileId = null;

  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    if (correctedRows[tileId].t === "water") {
      oceanTileId = tileId;
      break;
    }
    for (const neighborId of graph.neighbors[tileId]) {
      if (visited.has(neighborId) || !isWaterSurfaceRow(correctedRows[neighborId])) continue;
      visited.add(neighborId);
      queue.push(neighborId);
    }
  }

  assert.notEqual(oceanTileId, null, "Cambay must not be an isolated shallow-water pocket");
  assert.equal(visited.has(GULF_OF_KHAMBHAT_OUTLET_TILE_ID), true);
});

test("manual shallow-water validation rejects an isolated harbor", () => {
  const isolated = new Uint8Array(GULF_OF_KHAMBHAT_OUTLET_TILE_ID + 1);
  assert.throws(
    () => assertManualShallowWaterReachesOcean(isolated, SUBDIVISIONS),
    /tile 38891 is isolated from the ocean/
  );

  isolated[GULF_OF_KHAMBHAT_TILE_ID] = 1;
  isolated[GULF_OF_KHAMBHAT_OUTLET_TILE_ID] = 1;
  assert.doesNotThrow(() => assertManualShallowWaterReachesOcean(isolated, SUBDIVISIONS));
});
