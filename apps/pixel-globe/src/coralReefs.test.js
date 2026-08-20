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
  CORAL_REEF_ALPHA,
  CORAL_REEF_SPRITE_KEYS,
  COSMETIC_CORAL_REEF_FIELD_IDS,
  GREAT_BARRIER_REEF_FIELD_ID,
  buildCoralReefFields,
  coralReefGeometryCacheKey,
  coralReefWaterMaskSpans,
  distanceToCoralReefFieldKm
} from "./coralReefs.js";

const SUBDIVISIONS = 7;
const PIXELS_PER_RADIAN = 2450;
const repoRoot = new URL("../../../", import.meta.url);

test("named coral reef fields form deterministic navigable decorations", async () => {
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
  const options = {
    graph,
    navigationMask: topology.reachableNavigationMask,
    discoveryAnchorsByFieldId: new Map([
      [GREAT_BARRIER_REEF_FIELD_ID, discovery.spriteTileId]
    ])
  };
  const reefs = buildCoralReefFields(options);
  const repeated = buildCoralReefFields(options);
  const expectedFieldIds = new Set([
    GREAT_BARRIER_REEF_FIELD_ID,
    ...COSMETIC_CORAL_REEF_FIELD_IDS
  ]);
  const fieldCounts = countBy(reefs, (coral) => coral.reefId);
  const greatBarrierReef = reefs.filter((coral) => coral.reefId === GREAT_BARRIER_REEF_FIELD_ID);

  assert.deepEqual(repeated, reefs);
  assert.deepEqual(new Set(reefs.map((coral) => coral.reefId)), expectedFieldIds);
  assert.ok(reefs.every((coral) => topology.reachableNavigationMask[coral.tileId] === 1));
  for (const fieldId of expectedFieldIds) {
    assert.ok(fieldCounts.get(fieldId) >= 8, `${fieldId} placed too few corals: ${fieldCounts.get(fieldId)}`);
  }
  assert.ok(greatBarrierReef.length >= 35, `Great Barrier Reef is too sparse: ${greatBarrierReef.length}`);
  assert.ok(greatBarrierReef.length <= 120, `Great Barrier Reef is too dense: ${greatBarrierReef.length}`);
  assert.deepEqual(
    new Set(greatBarrierReef.map((coral) => coral.spriteKey)),
    new Set(CORAL_REEF_SPRITE_KEYS)
  );
  assert.equal(
    reefs.filter((coral) => coral.discoveryAnchor).length,
    1,
    "cosmetic reefs must not become discoveries"
  );
  assert.equal(
    reefs.find((coral) => coral.discoveryAnchor)?.tileId,
    discovery.spriteTileId
  );
  assert.equal(CORAL_REEF_ALPHA, 0.44);
});

test("reef corridors stay near their real-world reef systems", () => {
  const nearAndFar = [
    [GREAT_BARRIER_REEF_FIELD_ID, [-18.4, 147.2], [-20, 155]],
    ["red-sea-reef-belt", [22.3, 37.0], [22.3, 30.0]],
    ["mesoamerican-reef", [18.3, -87.7], [18.3, -80.0]],
    ["maldives-lakshadweep-reef-chain", [6.2, 73.2], [6.2, 80.0]],
    ["new-caledonian-barrier-reef", [-22.0, 164.5], [-22.0, 175.0]],
    ["florida-reef-tract", [24.9, -80.7], [24.9, -72.0]],
    ["great-sea-reef-fiji", [-16.1, 178.8], [-16.1, 165.0]]
  ];
  for (const [fieldId, near, far] of nearAndFar) {
    assert.ok(distanceToCoralReefFieldKm(fieldId, ...near) < 1, `${fieldId} misses its route`);
    assert.ok(distanceToCoralReefFieldKm(fieldId, ...far) > 500, `${fieldId} spreads too far`);
  }
});

test("reef sprite masks keep only water pixels and exclude beach connectors", () => {
  const spans = coralReefWaterMaskSpans({
    originX: 10,
    originY: 20,
    width: 5,
    height: 2,
    isWater: (x) => x >= 11,
    isBeach: (x, y) => x === 13 && y === 20
  });

  assert.deepEqual(spans, [
    { x: 1, y: 0, width: 2 },
    { x: 4, y: 0, width: 1 },
    { x: 1, y: 1, width: 4 }
  ]);
});

test("reef sprite masks reject incomplete geometry and predicates", () => {
  assert.throws(
    () => coralReefWaterMaskSpans({
      originX: 0.5,
      originY: 0,
      width: 5,
      height: 2,
      isWater: () => true,
      isBeach: () => false
    }),
    /integer origin/
  );
  assert.throws(
    () => coralReefWaterMaskSpans({
      originX: 0,
      originY: 0,
      width: 0,
      height: 2,
      isWater: () => true,
      isBeach: () => false
    }),
    /positive integer dimensions/
  );
  assert.throws(
    () => coralReefWaterMaskSpans({
      originX: 0,
      originY: 0,
      width: 5,
      height: 2,
      isWater: () => true
    }),
    /water and beach predicates/
  );
});

test("reef geometry cache keys survive chart translation and change with local deformation", () => {
  const nearbyTileIds = [5, 7];
  const original = new Map([
    [5, { x: 10, y: 10 }],
    [6, { x: 20, y: 20 }],
    [7, { x: 30, y: 10 }]
  ]);
  const translated = new Map(
    [...original].map(([id, point]) => [id, { x: point.x + 100, y: point.y - 40 }])
  );
  const deformed = new Map(original);
  deformed.set(7, { x: 31, y: 10 });
  const keyFor = (positions) => coralReefGeometryCacheKey({
    tileId: 6,
    nearbyTileIds,
    positionForTile: (id) => positions.get(id) || null
  });

  assert.equal(keyFor(translated), keyFor(original));
  assert.notEqual(keyFor(deformed), keyFor(original));
});

function countBy(values, keyForValue) {
  const counts = new Map();
  for (const value of values) {
    const key = keyForValue(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
