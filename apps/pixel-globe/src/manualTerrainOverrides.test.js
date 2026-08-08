import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS,
  MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS,
  MANUAL_SHALLOW_WATER_TILE_IDS_BY_SUBDIVISIONS,
  applyManualTerrainOverrides,
  assertManualShallowWaterReachesOcean
} from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

const SUBDIVISIONS = 7;
const GULF_OF_KHAMBHAT_TILE_ID = 38891;
const GULF_OF_KHAMBHAT_OUTLET_TILE_ID = 38903;
const COOK_STRAIT_TILE_ID = 88775;
const MOZAMBIQUE_ISLAND_TILE_ID = 125893;
const MOZAMBIQUE_CHANNEL_TILE_IDS = Object.freeze([31618, 125890, 125896]);
const LAKE_MALAWI_GAP_TILE_IDS = Object.freeze([124778, 7886, 31571]);
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
      5632, 15782, 16050, 16921, 21751, 22330, 22362, 22375,
      22966, 34387, 34610, 39426, 67580, 67709, 67971, 68532,
      84770, 85318, 86665, 89294, 89494, 89746, 89845, 90267,
      90803, 91677, 91681, 91683, 91735, 91800, 98751, 106244,
      124671, 125893, 136831, 141773, 142904, 143441, 143707, 143938,
      144889, 147600, 161303, 161924
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
    [
      GULF_OF_KHAMBHAT_TILE_ID,
      GULF_OF_KHAMBHAT_OUTLET_TILE_ID,
      COOK_STRAIT_TILE_ID,
      ...MOZAMBIQUE_CHANNEL_TILE_IDS
    ]
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

test("Cook Strait separates New Zealand's North and South Islands", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);

  assert.equal(earth.tiles[COOK_STRAIT_TILE_ID].t, "oceanic");
  assert.equal(earth.tiles[COOK_STRAIT_TILE_ID].m, 1120);
  assert.deepEqual(correctedRows[COOK_STRAIT_TILE_ID], {
    id: COOK_STRAIT_TILE_ID,
    t: "beach",
    e: -0.20500000000000002,
    o: 1
  });
  assert.equal(isWaterSurfaceRow(correctedRows[COOK_STRAIT_TILE_ID]), true);
  assert.ok(Math.abs(graph.latDeg[COOK_STRAIT_TILE_ID] - -41.333) < 0.01);
  assert.ok(Math.abs(graph.lonDeg[COOK_STRAIT_TILE_ID] - 174.191) < 0.01);

  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const landmassId = correctedRows[tileId].m;
    if (landmassId !== 1110 && landmassId !== 1120) continue;
    for (const neighborId of graph.neighbors[tileId]) {
      const neighborLandmassId = correctedRows[neighborId].m;
      assert.notEqual(
        neighborLandmassId,
        landmassId === 1110 ? 1120 : 1110,
        `New Zealand islands still touch at ${tileId}:${neighborId}`
      );
    }
  }
});

test("Lake Malawi terrain gaps are restored as one continuous lake", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const lakeCenterline = [
    31333, 124778, 7886, 124560, 124561,
    124564, 31274, 125693, 31571, 125695
  ];

  assert.deepEqual(
    MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS[SUBDIVISIONS]
      .map((override) => override.tileId),
    LAKE_MALAWI_GAP_TILE_IDS
  );
  for (const tileId of LAKE_MALAWI_GAP_TILE_IDS) {
    assert.equal(correctedRows[tileId].t, "lake");
    assert.equal(correctedRows[tileId].l, 11);
    assert.equal(correctedRows[tileId].m, undefined);
    assert.equal(correctedRows[tileId].h, undefined);
  }
  for (let index = 0; index < lakeCenterline.length - 1; index++) {
    const tileId = lakeCenterline[index];
    const nextTileId = lakeCenterline[index + 1];
    assert.equal(correctedRows[tileId].t, "lake");
    assert.equal(
      graph.neighbors[tileId].includes(nextTileId),
      true,
      `Lake Malawi centerline breaks between ${tileId} and ${nextTileId}`
    );
  }
});

test("Mozambique is a distinct island surrounded by navigable coastal water", async () => {
  const earth = JSON.parse(await readFile(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const correctedRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const graph = buildGeodesicGraph(SUBDIVISIONS);

  assert.equal(correctedRows[MOZAMBIQUE_ISLAND_TILE_ID].m, 1313);
  assert.equal(isWaterSurfaceRow(correctedRows[MOZAMBIQUE_ISLAND_TILE_ID]), false);
  assert.deepEqual(
    graph.neighbors[MOZAMBIQUE_ISLAND_TILE_ID].sort((a, b) => a - b),
    [31618, 31620, 125890, 125891, 125892, 125896]
  );
  for (const neighborId of graph.neighbors[MOZAMBIQUE_ISLAND_TILE_ID]) {
    assert.equal(
      isWaterSurfaceRow(correctedRows[neighborId]),
      true,
      `Mozambique neighbor ${neighborId} must be navigable water`
    );
  }
  for (const tileId of MOZAMBIQUE_CHANNEL_TILE_IDS) {
    assert.equal(earth.tiles[tileId].m, 57);
    assert.equal(correctedRows[tileId].t, "beach");
    assert.equal(correctedRows[tileId].o, 1);
  }
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
