import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cityHasPortAccess } from "./cityPortAccess.js";
import { buildGeodesicGraph } from "./geodesic.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import {
  WEATHER_DAYS,
  decodePixelRuntimeWeatherBakeFile,
  fillIceMaskForDay
} from "./weather.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

const SUBDIVISIONS = 7;
const PERMANENT_POLAR_CAP_LATITUDE = 74;
const KHOLMOGORY_CITY_TILE_ID = 55603;
const OB_GULF_TILE_ID = 59279;
const INLAND_OB_RIVER_TILE_ID = 239;
const BARENTS_APPROACH_TILE_ID = 13837;
const BAFFIN_APPROACH_TILE_ID = 52416;
const BEAUFORT_APPROACH_TILE_ID = 48551;
const BERING_STRAIT_TILE_ID = 47585;
const NORTH_POLE_TILE_ID = 15;
const SOUTH_POLE_TILE_ID = 35;
const repoRoot = new URL("../../../", import.meta.url);

let fixturePromise;

test("the permanent polar cap blocks both poles without sealing western Arctic ports", async () => {
  const { earthRows, graph, topology } = await arcticFixture();
  let northernmostNavigableLatitude = -90;
  let southernmostNavigableLatitude = 90;

  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!topology.reachableNavigationMask[tileId]) continue;
    northernmostNavigableLatitude = Math.max(northernmostNavigableLatitude, graph.latDeg[tileId]);
    southernmostNavigableLatitude = Math.min(southernmostNavigableLatitude, graph.latDeg[tileId]);
  }

  assert.ok(northernmostNavigableLatitude < PERMANENT_POLAR_CAP_LATITUDE);
  assert.ok(southernmostNavigableLatitude > -PERMANENT_POLAR_CAP_LATITUDE);
  assert.equal(earthRows[NORTH_POLE_TILE_ID].t, "ice");
  assert.equal(earthRows[SOUTH_POLE_TILE_ID].t, "ice_cap");
  assert.equal(topology.reachableNavigationMask[NORTH_POLE_TILE_ID], 0);
  assert.equal(topology.reachableNavigationMask[SOUTH_POLE_TILE_ID], 0);

  assert.equal(
    cityHasPortAccess({
      graph,
      earthRows,
      reachableNavigationMask: topology.reachableNavigationMask,
      riverMasks: topology.riverMasks,
      tileId: KHOLMOGORY_CITY_TILE_ID
    }),
    true,
    "Kholmogory must remain accessible from the seasonally open White Sea"
  );
  assert.equal(topology.reachableNavigationMask[OB_GULF_TILE_ID], 1);
  assert.notEqual(topology.riverMasks[INLAND_OB_RIVER_TILE_ID], 0);
  assert.equal(
    topology.reachableNavigationMask[INLAND_OB_RIVER_TILE_ID],
    1,
    "opening the Ob estuary must connect its inland river navigation"
  );
});

test("weather opens the western Russian Arctic in summer and refreezes it in winter", async () => {
  const { earthRows, graph, runtimeWeather } = await arcticFixture();
  const iceMask = new Uint8Array(graph.tileCount);
  const openDays = [];

  for (let day = 0; day < WEATHER_DAYS; day++) {
    fillIceMaskForDay(runtimeWeather.seaIceCycle, day, iceMask);
    if (waterRouteExists({
      graph,
      earthRows,
      iceMask,
      startTileId: BARENTS_APPROACH_TILE_ID,
      targetTileId: OB_GULF_TILE_ID,
      minimumLatitude: 60
    })) openDays.push(day);
  }

  assert.deepEqual(
    [openDays[0], openDays.at(-1), openDays.length],
    [161, 269, 109],
    "the Ob approach should open only during the late-spring-to-autumn thaw"
  );
});

test("the 1522 ice cap does not create a Northwest Passage or full Northern Sea Route", async () => {
  const { earthRows, graph, runtimeWeather } = await arcticFixture();
  const iceMask = new Uint8Array(graph.tileCount);

  for (let day = 0; day < WEATHER_DAYS; day++) {
    fillIceMaskForDay(runtimeWeather.seaIceCycle, day, iceMask);
    assert.equal(
      waterRouteExists({
        graph,
        earthRows,
        iceMask,
        startTileId: BAFFIN_APPROACH_TILE_ID,
        targetTileId: BEAUFORT_APPROACH_TILE_ID,
        minimumLatitude: 60
      }),
      false,
      `Northwest Passage unexpectedly opened on weather day ${day}`
    );
    assert.equal(
      waterRouteExists({
        graph,
        earthRows,
        iceMask,
        startTileId: BARENTS_APPROACH_TILE_ID,
        targetTileId: BERING_STRAIT_TILE_ID,
        minimumLatitude: 60
      }),
      false,
      `full Northern Sea Route unexpectedly opened on weather day ${day}`
    );
  }
});

async function arcticFixture() {
  fixturePromise ||= loadArcticFixture();
  return fixturePromise;
}

async function loadArcticFixture() {
  const [earthSource, runtimeWeatherSource] = await Promise.all([
    readFile(new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot), "utf8"),
    readFile(new URL("examples/globe-demo/public/globe-runtime-bake-7.bin", repoRoot))
  ]);
  const earth = JSON.parse(earthSource);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const earthRows = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const runtimeWeatherBuffer = runtimeWeatherSource.buffer.slice(
    runtimeWeatherSource.byteOffset,
    runtimeWeatherSource.byteOffset + runtimeWeatherSource.byteLength
  );
  const runtimeWeather = decodePixelRuntimeWeatherBakeFile(
    runtimeWeatherBuffer,
    earth.version,
    SUBDIVISIONS,
    earth.tileCount
  );
  const topology = buildWorldNavigationTopology({
    graph,
    earthRows,
    earthCache: earth,
    subdivisions: SUBDIVISIONS
  });
  return { earthRows, graph, runtimeWeather, topology };
}

function waterRouteExists({
  graph,
  earthRows,
  iceMask,
  startTileId,
  targetTileId,
  minimumLatitude
}) {
  if (!isWaterSurfaceRow(earthRows[startTileId]) || iceMask[startTileId]) return false;
  const visited = new Uint8Array(graph.tileCount);
  const queue = new Uint32Array(graph.tileCount);
  let head = 0;
  let tail = 0;
  visited[startTileId] = 1;
  queue[tail++] = startTileId;

  while (head < tail) {
    const tileId = queue[head++];
    if (tileId === targetTileId) return true;
    for (const neighborId of graph.neighbors[tileId]) {
      if (
        visited[neighborId] ||
        graph.latDeg[neighborId] < minimumLatitude ||
        !isWaterSurfaceRow(earthRows[neighborId]) ||
        iceMask[neighborId]
      ) continue;
      visited[neighborId] = 1;
      queue[tail++] = neighborId;
    }
  }
  return false;
}
