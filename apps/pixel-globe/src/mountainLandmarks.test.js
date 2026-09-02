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
import {
  AUTHORED_MOUNTAIN_REPORT_IDS,
  explorerReportDialogueForDiscovery,
  validateExplorerReportDialogueCatalog
} from "./explorerDiscoveryDialogue.js";

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
  const fuji = registry.famous.find((mountain) => mountain.id === "mountain-mount-fuji");
  assert.ok(fuji);
  assert.equal(fuji.elevationM, 3776);
  assert.ok(registry.peakTileIds.has(fuji.tileId));
  const matterhorn = registry.famous.find((mountain) => mountain.id === "mountain-matterhorn");
  assert.ok(matterhorn);
  assert.ok(matterhorn.legacyDiscoveryIds.includes("mountain-40279-matterhorn"));
  const mountOlympus = registry.all.find(
    (mountain) => mountain.id === "mountain-mount-olympus-n40p08325-e22p35012"
  );
  assert.ok(mountOlympus);
  assert.ok(mountOlympus.legacyDiscoveryIds.includes("mountain-24808-mount-olympus"));
  assert.equal(registry.famous.some((mountain) => mountain.displayName === "Cero Raya"), false);
  assert.deepEqual(
    new Set(AUTHORED_MOUNTAIN_REPORT_IDS),
    new Set(registry.famous.map((mountain) => mountain.id))
  );
  const discoveries = registry.famous.map((mountain) => ({ ...mountain, kind: "mountain" }));
  assert.equal(validateExplorerReportDialogueCatalog(discoveries), registry.famous.length);
  const fujiReport = explorerReportDialogueForDiscovery({ ...fuji, kind: "mountain" });
  assert.match(fujiReport.player, /near-perfect cone/i);
  assert.match(fujiReport.patron, /painters/i);
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

test("live discovery state accepts canonical ids only", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const legacyEtna = {
    id: "mountain-161762-mount-etna",
    kind: "mountain",
    displayName: "Mount Etna",
    detail: "3,322 m"
  };

  assert.throws(
    () => recordDiscovery(state, legacyEtna),
    /canonical discovery id, not tile-derived legacy id/
  );
  assert.throws(
    () => hasDiscovery(state, legacyEtna.id),
    /canonical discovery id, not tile-derived legacy id/
  );
  assert.deepEqual(state.memory.discoveries, {});
  assert.deepEqual(state.memory.discoveryOrder, []);
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

test("earlier wandering cannot cancel a tight Antarctic circumnavigation", () => {
  const state = createGameState({ cargoCapacity: 20 });
  assert.equal(updateCircumnavigationProgress(state, longitudeOnParallel(-82, 40)), false);
  assert.equal(updateCircumnavigationProgress(state, longitudeOnParallel(-82, 0)), false);

  let completed = false;
  const sampleCount = 137;
  for (let index = 1; index <= sampleCount; index++) {
    completed = updateCircumnavigationProgress(
      state,
      longitudeOnParallel(-82, index * 360 / sampleCount)
    );
  }

  assert.equal(completed, true);
  assert.ok(Math.abs(state.memory.navigation.cumulativeLongitudeDeg - 320) < 1e-9);
  assert.ok(
    state.memory.navigation.maximumCumulativeLongitudeDeg -
      state.memory.navigation.minimumCumulativeLongitudeDeg >= 360 - 1e-6
  );
});

function longitudeOnParallel(latitudeDeg, longitudeDeg) {
  const latitudeRad = latitudeDeg * Math.PI / 180;
  const longitudeRad = longitudeDeg * Math.PI / 180;
  const direction = [
    Math.cos(latitudeRad) * Math.cos(longitudeRad),
    Math.sin(latitudeRad),
    -Math.cos(latitudeRad) * Math.sin(longitudeRad)
  ];
  return Math.atan2(-direction[2], direction[0]) * 180 / Math.PI;
}
