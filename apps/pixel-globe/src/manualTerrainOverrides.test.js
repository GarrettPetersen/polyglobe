import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS,
  MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS,
  applyManualTerrainOverrides,
  assertManualShallowWaterReachesOcean
} from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

const SUBDIVISIONS = 7;
const GULF_OF_KHAMBHAT_TILE_ID = 38891;
const GULF_OF_KHAMBHAT_OUTLET_TILE_ID = 38903;
const ITALY_SALENTO_TILE_ID = 98761;
const ITALY_ADJOINING_LAND_TILE_ID = 98762;
const repoRoot = new URL("../../../", import.meta.url);

test("Italy's Salento heel is restored as connected Mediterranean land", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);

  assert.deepEqual(
    MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS[SUBDIVISIONS]
      .find((override) => override.tileId === ITALY_SALENTO_TILE_ID),
    {
    tileId: ITALY_SALENTO_TILE_ID,
    sourceTerrain: "beach",
    terrainType: "mediterranean_hot",
    elevation: -0.03629907425729602,
    landmassId: 57
    }
  );
  assert.equal(earth.tiles[ITALY_SALENTO_TILE_ID].t, "beach");
  assert.deepEqual(correctedRows[ITALY_SALENTO_TILE_ID], {
    id: ITALY_SALENTO_TILE_ID,
    t: "mediterranean_hot",
    e: -0.03629907425729602,
    m: 57
  });
  assert.equal(isWaterSurfaceRow(correctedRows[ITALY_SALENTO_TILE_ID]), false);
  assert.equal(graph.neighbors[ITALY_SALENTO_TILE_ID].includes(ITALY_ADJOINING_LAND_TILE_ID), true);
  assert.equal(correctedRows[ITALY_ADJOINING_LAND_TILE_ID].m, 57);
  assert.ok(Math.abs(graph.latDeg[ITALY_SALENTO_TILE_ID] - 40.586) < 0.01);
  assert.ok(Math.abs(graph.lonDeg[ITALY_SALENTO_TILE_ID] - 17.61) < 0.01);
});

test("missing small islands are restored as distinct dockable landforms", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const islandOverrides = MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS[SUBDIVISIONS]
    .filter((override) => override.landmassId >= 1270);

  assert.deepEqual(
    islandOverrides.map((override) => override.tileId).sort((a, b) => a - b),
    [
      16050, 34610, 39426, 67709, 85318, 89746, 90267, 90803,
      91677, 91681, 91683, 91735, 91800, 98751, 124671, 136831,
      141773, 142904, 143938, 161303, 161924
    ]
  );
  assert.equal(
    new Set(islandOverrides.map((override) => override.landmassId)).size,
    islandOverrides.length
  );

  for (const override of islandOverrides) {
    assert.equal(earth.tiles[override.tileId].t, override.sourceTerrain);
    assert.equal(correctedRows[override.tileId].t, override.terrainType);
    assert.equal(correctedRows[override.tileId].m, override.landmassId);
    assert.equal(isWaterSurfaceRow(correctedRows[override.tileId]), false);
    assert.ok(
      graph.neighbors[override.tileId]
        .some((neighborId) => isWaterSurfaceRow(correctedRows[neighborId])),
      `restored island ${override.tileId} must remain dockable`
    );
  }
});

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
  const allOverrideTiles = [
    ...MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS[SUBDIVISIONS]
  ];
  const isolated = new Uint8Array(Math.max(...allOverrideTiles) + 1);
  assert.throws(
    () => assertManualShallowWaterReachesOcean(isolated, SUBDIVISIONS),
    /tile 38891 is isolated from the ocean/
  );

  for (const tileId of allOverrideTiles) isolated[tileId] = 1;
  assert.doesNotThrow(() => assertManualShallowWaterReachesOcean(isolated, SUBDIVISIONS));
});
