import { readLocalSave } from "../../src/localSave.js";
import { decodeGeodesicGraphBake } from "../../src/geodesicBake.js";
import { applyManualTerrainOverrides } from "../../src/manualTerrainOverrides.js";
import { buildWorldNavigationTopology } from "../../src/worldNavigationTopology.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COLONIZATION_TARGETS } from "../../src/colonialCities.js";
import { COLONY_SEASONAL_ACCESS } from "../../src/colonySeasonalAccessData.js";
import { colonizationHistoryForTarget } from "../../src/colonizationHistory.js";
import { createColonizationQuestMemory, assignColonizationQuest, completeColonizationFetchStage,
  beginColonizationExpedition, landColonists } from "../../src/colonizationQuest.js";

export async function exerciseSeasonalColonyDialogues(page, serializedFixture, browserErrors) {
  const { cities } = JSON.parse(readFileSync(new URL("../../city-visualizer/data/cities.json", import.meta.url), "utf8"));
  const bytes = readFileSync(new URL("../../../../examples/globe-demo/public/geodesic-graph-8.bin", import.meta.url));
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 8);
  const earthCache = JSON.parse(readFileSync(new URL("../../../../examples/globe-demo/public/earth-globe-cache-8.json", import.meta.url), "utf8"));
  const earthRows = applyManualTerrainOverrides(earthCache.tiles, 8);
  const navigation = buildWorldNavigationTopology({ graph, earthRows, earthCache, subdivisions: 8 });
  function moveVoyage(serialized, cityId) {
    const city = cities.find(city => city.cityId === cityId);
    const tileId = [city.tileId, ...graph.neighbors[city.tileId]].find(tile => navigation.reachableNavigationMask[tile] === 1);
    assert.ok(Number.isInteger(tileId), `Missing colony scenario shore: ${cityId}`);
    const decoded = readLocalSave({ storage: { getItem: () => serialized } });
    assert.equal(decoded.status, "ready", decoded.error?.message);
    const save = decoded.save;
    const lat = graph.latDeg[tileId] * Math.PI / 180, lon = graph.lonDeg[tileId] * Math.PI / 180;
    Object.assign(save.payload.playerShip, { tileId, velocity: [0, 0, 0],
      position: [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)],
      heading: [-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)] });
    return JSON.stringify({ ...save, encoding: "json" });
  }
  const origin = cities.find(city => city.cityId === "bordeaux|france");
  // Every currently icebound site plus a warm control. These are setup seams;
  // the browser executes the production restore, port entry and rendering paths.
  const targets = [...Object.entries(COLONY_SEASONAL_ACCESS)
    .filter(([, access]) => access.blockedDays.length > 0).map(([cityId]) => cityId), "port royal|canada"];
  assert.ok(targets.length > 1, "Seasonal browser regression requires an icebound colony");
  for (const cityId of targets) {
    const target = COLONIZATION_TARGETS.find(city => city.cityId === cityId);
    const placement = cities.find(city => city.cityId === cityId);
    const expectedWarning = COLONY_SEASONAL_ACCESS[cityId].blockedDays.length > 0;
    for (const stage of ["ready", "awaiting-resupply"]) {
      const save = JSON.parse(serializedFixture);
      const memory = createColonizationQuestMemory();
      assignColonizationQuest(memory, { target: { ...target, tileId: placement.tileId }, origin });
      for (const fetch of colonizationHistoryForTarget(target).fetchStages) completeColonizationFetchStage(memory, fetch.id);
      if (stage === "awaiting-resupply") {
        beginColonizationExpedition(memory);
        landColonists(memory, Math.floor(save.payload.worldClock.currentMinute));
      }
      save.payload.gameState.memory.colonization = memory;
      let serialized = JSON.stringify(save);
      for (let pass = 0; pass < 2; pass++) {
        const locations = stage === "ready" ? [origin.cityId] : [cityId, origin.cityId];
        for (const location of locations) {
          await page.evaluate(text => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(text), moveVoyage(serialized, location));
          const result = await page.evaluate(id => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectColonizationDialogue(id), location);
          assert.equal(result.nodeId, "colonization");
          assert.equal(result.sceneCityId, location, "Quest dialogue must have the matching city scene");
          assert.equal(/ice closes the passage/.test(result.text), expectedWarning, `${cityId} ${stage}: ${result.text}`);
          assert.ok(result.serialized, "Colony dialogue did not persist a voyage");
          assert.deepEqual(browserErrors, [], `${cityId} ${stage}`);
          serialized = result.serialized;
        }
      }
      process.stdout.write(`  ${cityId} ${stage}: seasonal warning ${expectedWarning ? "present" : "absent"}, city scene rendered before and after reload.\n`);
    }
  }
}
