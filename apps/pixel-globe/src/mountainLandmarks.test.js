import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildGeodesicGraph, createDirectionIndex } from "./geodesic.js";
import {
  createGameState,
  discoveredEntries,
  hasDiscovery,
  recordDiscovery,
  updateCircumnavigationProgress
} from "./gameState.js";
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
  const fuji = {
    id: "mountain-fuji",
    kind: "mountain",
    displayName: "Mount Fuji",
    detail: "3,776 m"
  };

  assert.equal(hasDiscovery(state, fuji.id), false);
  assert.equal(recordDiscovery(state, fuji), true);
  assert.equal(recordDiscovery(state, fuji), false);
  assert.equal(hasDiscovery(state, fuji.id), true);
  assert.deepEqual(discoveredEntries(state), [fuji]);
});

test("circumnavigation progress unwraps the international date line", () => {
  const state = createGameState({ cargoCapacity: 20 });
  assert.equal(updateCircumnavigationProgress(state, 170), false);
  assert.equal(updateCircumnavigationProgress(state, -170), false);
  assert.equal(state.memory.navigation.cumulativeLongitudeDeg, 20);
  assert.equal(updateCircumnavigationProgress(state, -10), false);
  assert.equal(updateCircumnavigationProgress(state, 150), false);
  assert.equal(updateCircumnavigationProgress(state, -170), true);
});
