import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_DEFENSE_MAX_SPAWN_DISTANCE_PX,
  COLONIZATION_DEFENSE_MIN_SPAWN_DISTANCE_PX,
  colonizationDefensePresence,
  colonizationDefenseSpawnNeedsRepair,
  colonizationDefenseSpawnTileIds
} from "./colonizationDefenseSpawns.js";
import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

const SUBDIVISIONS = 7;
const PIXELS_PER_RADIAN = 2450;
const repoRoot = new URL("../../../", import.meta.url);
let worldFixturePromise = null;

test("Jamestown defense canoes spawn on nearby navigable water", async () => {
  const { graph, directionIndex, navigation } = await worldFixture();
  const jamestown = colonizationTargetForCity({
    city: "Jamestown",
    country: "United States of America"
  });
  const targetTileId = findNearestTileId(
    graph,
    directionIndex,
    latLonToDirection(jamestown.lat, jamestown.lon)
  );
  const tileIds = colonizationDefenseSpawnTileIds({
    graph,
    navigationMask: navigation.reachableNavigationMask,
    targetTileId,
    count: 4,
    pixelsPerRadian: PIXELS_PER_RADIAN,
    seed: 19
  });

  assert.equal(targetTileId, 73682);
  assert.equal(new Set(tileIds).size, 4);
  for (const tileId of tileIds) {
    assert.equal(navigation.reachableNavigationMask[tileId], 1);
    const distancePx = arcDistance(centerVector(graph, targetTileId), centerVector(graph, tileId)) *
      PIXELS_PER_RADIAN;
    assert.ok(
      distancePx >= COLONIZATION_DEFENSE_MIN_SPAWN_DISTANCE_PX &&
        distancePx <= COLONIZATION_DEFENSE_MAX_SPAWN_DISTANCE_PX,
      `spawn ${tileId} is ${distancePx}px away`
    );
    assert.equal(colonizationDefenseSpawnNeedsRepair({
      graph,
      directionIndex,
      navigationMask: navigation.reachableNavigationMask,
      routeVector: centerVector(graph, tileId),
      targetTileId,
      pixelsPerRadian: PIXELS_PER_RADIAN
    }), false);
  }

  assert.equal(colonizationDefenseSpawnNeedsRepair({
    graph,
    directionIndex,
    navigationMask: navigation.reachableNavigationMask,
    routeVector: centerVector(graph, 73666),
    targetTileId,
    pixelsPerRadian: PIXELS_PER_RADIAN
  }), true, "an old canoe stranded inland must be respawned");
  assert.equal(colonizationDefenseSpawnNeedsRepair({
    graph,
    directionIndex,
    navigationMask: navigation.reachableNavigationMask,
    routeVector: [Number.NaN, 0, 0],
    targetTileId,
    pixelsPerRadian: PIXELS_PER_RADIAN
  }), true, "a corrupt old canoe position must be respawned");
});

test("Ville-Marie defense canoes spawn together on its navigable river approach", async () => {
  const { graph, directionIndex, navigation } = await worldFixture();
  const villeMarie = colonizationTargetForCity({ city: "Ville-Marie", country: "Canada" });
  const targetTileId = findNearestTileId(
    graph,
    directionIndex,
    latLonToDirection(villeMarie.lat, villeMarie.lon)
  );
  const tileIds = colonizationDefenseSpawnTileIds({
    graph,
    navigationMask: navigation.reachableNavigationMask,
    targetTileId,
    count: 3,
    pixelsPerRadian: PIXELS_PER_RADIAN,
    seed: 29
  });

  assert.equal(targetTileId, 74313);
  assert.equal(new Set(tileIds).size, 3);
  for (const tileId of tileIds) {
    assert.equal(navigation.reachableNavigationMask[tileId], 1);
    const distancePx = arcDistance(centerVector(graph, targetTileId), centerVector(graph, tileId)) *
      PIXELS_PER_RADIAN;
    assert.ok(
      distancePx >= COLONIZATION_DEFENSE_MIN_SPAWN_DISTANCE_PX &&
        distancePx <= COLONIZATION_DEFENSE_MAX_SPAWN_DISTANCE_PX,
      `Ville-Marie spawn ${tileId} is ${distancePx}px away`
    );
  }
});

test("colony defense presence distinguishes defeated, missing, and visible canoes", () => {
  const presence = colonizationDefensePresence({
    shipIds: ["canoe-1", "canoe-2", "canoe-3"],
    defeatedShipIds: ["canoe-1"],
    strategicShipIds: ["canoe-1", "canoe-2"],
    visibleShipIds: ["canoe-2"]
  });

  assert.deepEqual(presence.remainingShipIds, ["canoe-2", "canoe-3"]);
  assert.deepEqual(presence.missingStrategicShipIds, ["canoe-3"]);
  assert.deepEqual(presence.missingVisibleShipIds, ["canoe-3"]);
  assert.throws(() => colonizationDefensePresence({
    shipIds: ["canoe-1"],
    defeatedShipIds: ["unknown"],
    strategicShipIds: [],
    visibleShipIds: []
  }), /Unknown defeated colony-defense ship/);
});

function worldFixture() {
  if (!worldFixturePromise) {
    worldFixturePromise = (async () => {
      const graph = buildGeodesicGraph(SUBDIVISIONS);
      const directionIndex = createDirectionIndex(graph);
      const earth = JSON.parse(await readFile(
        new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
        "utf8"
      ));
      earth.tiles = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
      const navigation = buildWorldNavigationTopology({
        graph,
        earthRows: earth.tiles,
        earthCache: earth,
        subdivisions: SUBDIVISIONS
      });
      return { graph, directionIndex, navigation };
    })();
  }
  return worldFixturePromise;
}

function centerVector(graph, tileId) {
  const offset = tileId * 3;
  return [graph.centers[offset], graph.centers[offset + 1], graph.centers[offset + 2]];
}

function arcDistance(a, b) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
