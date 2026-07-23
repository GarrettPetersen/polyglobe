import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";
import {
  GREAT_BARRIER_REEF_DISCOVERY_ID,
  buildWorldDiscoveries
} from "./discoveries.js";
import {
  GREAT_BARRIER_REEF_ALPHA,
  GREAT_BARRIER_REEF_SPRITE_KEYS,
  buildGreatBarrierReef,
  distanceToReefRouteKm
} from "./greatBarrierReef.js";

const SUBDIVISIONS = 7;
const PIXELS_PER_RADIAN = 2450;
const repoRoot = new URL("../../../", import.meta.url);

test("the Great Barrier Reef forms a deterministic navigable coral field off northeast Australia", async () => {
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
  const discoveries = buildWorldDiscoveries(graph, createDirectionIndex(graph), {
    landMask: Uint8Array.from(earth.tiles, (row) => isWaterSurfaceRow(row) ? 0 : 1),
    cityTileIds: [],
    riverMasks: topology.riverMasks,
    riverToWaterMasks: topology.riverToWaterMasks,
    navigationMask: topology.reachableNavigationMask,
    pixelsPerRadian: PIXELS_PER_RADIAN
  });
  const discovery = discoveries.find((entry) => entry.id === GREAT_BARRIER_REEF_DISCOVERY_ID);
  const reef = buildGreatBarrierReef({
    graph,
    navigationMask: topology.reachableNavigationMask,
    discoveryTileId: discovery.spriteTileId
  });
  const repeated = buildGreatBarrierReef({
    graph,
    navigationMask: topology.reachableNavigationMask,
    discoveryTileId: discovery.spriteTileId
  });

  assert.deepEqual(repeated, reef);
  assert.ok(reef.length >= 35, `expected a substantial reef field, received ${reef.length} corals`);
  assert.ok(reef.length <= 120, `reef field is too dense: ${reef.length} corals`);
  assert.ok(reef.every((coral) => topology.reachableNavigationMask[coral.tileId] === 1));
  assert.deepEqual(new Set(reef.map((coral) => coral.spriteKey)), new Set(GREAT_BARRIER_REEF_SPRITE_KEYS));
  assert.deepEqual(
    reef.filter((coral) => coral.discoveryAnchor),
    [{
      tileId: discovery.spriteTileId,
      spriteKey: "coral_01",
      seed: reef.find((coral) => coral.discoveryAnchor).seed,
      discoveryAnchor: true
    }]
  );
  assert.equal(GREAT_BARRIER_REEF_ALPHA, 0.44);
});

test("the reef corridor follows Queensland rather than filling the Coral Sea", () => {
  assert.ok(distanceToReefRouteKm(-18.4, 147.2) < 1);
  assert.ok(distanceToReefRouteKm(-16.9, 146.2) < 20);
  assert.ok(distanceToReefRouteKm(-22.7, 151.1) < 1);
  assert.ok(distanceToReefRouteKm(-20, 155) > 500);
  assert.ok(distanceToReefRouteKm(-30, 153) > 500);
});
