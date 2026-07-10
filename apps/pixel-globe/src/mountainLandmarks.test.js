import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import { createGameState, discoverLandmark, hasDiscoveredLandmark } from "./gameState.js";
import { buildMountainLandmarks } from "./mountainLandmarks.js";

const repoRoot = new URL("../../../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, repoRoot), "utf8"));
}

test("full named mountain data aligns with cached peak tiles", async () => {
  const [mountains, earth] = await Promise.all([
    readJson("examples/globe-demo/public/mountains.json"),
    readJson("examples/globe-demo/public/earth-globe-cache-7.json")
  ]);
  const graph = buildGeodesicGraph(7);
  const registry = buildMountainLandmarks(mountains, graph, createDirectionIndex(graph), earth.peaks);

  assert.equal(registry.all.length, 692);
  assert.equal(registry.peakTileIds.size, earth.peaks.length);
  const fuji = registry.famous.find((mountain) => mountain.displayName === "Mount Fuji");
  assert.ok(fuji);
  assert.equal(fuji.elevationM, 3776);
  assert.ok(registry.peakTileIds.has(fuji.tileId));
  assert.equal(registry.famous.some((mountain) => mountain.displayName === "Cero Raya"), false);
});

test("landmark discoveries are recorded only once", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const fuji = { id: "mountain-fuji", displayName: "Mount Fuji", elevationM: 3776 };

  assert.equal(hasDiscoveredLandmark(state, fuji.id), false);
  assert.equal(discoverLandmark(state, fuji), true);
  assert.equal(discoverLandmark(state, fuji), false);
  assert.equal(hasDiscoveredLandmark(state, fuji.id), true);
  assert.deepEqual(state.memory.discoveredLandmarks[fuji.id], {
    name: "Mount Fuji",
    elevationM: 3776
  });
});
