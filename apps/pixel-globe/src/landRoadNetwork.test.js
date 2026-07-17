import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildGeodesicGraph } from "./geodesic.js";
import { parseLandRoadNetwork } from "./landRoadNetwork.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { roadTileIsPassable } from "./roadTerrain.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

const srcRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = join(srcRoot, "..");
const repoRoot = join(srcRoot, "../../..");
const roadPath = join(appRoot, "public/assets/data/land-roads.json");
const earthPath = join(repoRoot, "examples/globe-demo/public/earth-globe-cache-7.json");

test("baked land roads use adjacent, passable land tiles and connect Aleppo westward", async () => {
  const [roadSource, earthSource] = await Promise.all([
    readFile(roadPath, "utf8"),
    readFile(earthPath, "utf8")
  ]);
  const roadData = JSON.parse(roadSource);
  const earth = JSON.parse(earthSource);
  const graph = buildGeodesicGraph(earth.subdivisions);
  const earthRows = applyManualTerrainOverrides(earth.tiles, earth.subdivisions);
  const navigation = buildWorldNavigationTopology({
    graph,
    earthRows,
    earthCache: earth,
    subdivisions: earth.subdivisions
  });
  const roads = parseLandRoadNetwork(roadData, {
    subdivisions: earth.subdivisions,
    earthCacheVersion: String(earth.version)
  });
  const namedPeaks = new Set((earth.peaks || []).map((entry) => entry[0]));

  assert.ok(roads.routes.length >= 250);
  for (const route of roads.routes) {
    for (let index = 1; index < route.tileIds.length; index++) {
      const a = route.tileIds[index - 1];
      const b = route.tileIds[index];
      assert.ok(graph.neighbors[a].includes(b), `${route.id} skips from ${a} to ${b}`);
    }
    for (const tileId of route.tileIds.slice(1, -1)) {
      assert.equal(roadTileIsPassable(earthRows[tileId], {
        namedPeak: namedPeaks.has(tileId),
        hasRiver: (navigation.riverMasks[tileId] || 0) !== 0
      }), true, `${route.id} crosses blocked tile ${tileId}`);
    }
  }

  const aleppo = roads.cities.find((city) => city.name === "Aleppo");
  assert.ok(aleppo, "Aleppo road city");
  const aleppoNeighbors = roads.neighborRoutesByCityTileId.get(aleppo.tileId).map((route) => {
    const otherTileId = route.fromTileId === aleppo.tileId ? route.toTileId : route.fromTileId;
    return roads.cityByTileId.get(otherTileId).name;
  });
  assert.ok(aleppoNeighbors.includes("Antioch"), aleppoNeighbors.join(", "));
});
