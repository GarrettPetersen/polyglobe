import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXETER_CANAL_MATERIALS, EXETER_CANAL_STAGE_MINUTES, createExeterCanalMemory } from "../../src/exeterCanal.js";
import { decodeGeodesicGraphBake } from "../../src/geodesicBake.js";

export async function exerciseExeterCanalSaveRoundTrips(page, serializedFixture, browserErrors) {
  const bytes = readFileSync(new URL("../../../../examples/globe-demo/public/geodesic-graph-8.bin", import.meta.url));
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 8);
  // Restore the earlier stage last as well: no completed canal may leak into a
  // different voyage loaded in the same page.
  for (const stage of [0, 1, 2, 3, 0]) {
    const save = JSON.parse(serializedFixture);
    const state = save.payload.gameState;
    state.memory.quests.exeterCanal = stage === 0 ? createExeterCanalMemory() : {
      version: 1, accepted: true,
      startedMinute: Math.floor(save.payload.worldClock.currentMinute) - stage * EXETER_CANAL_STAGE_MINUTES
    };
    if (stage > 0) {
      for (const material of EXETER_CANAL_MATERIALS) state.memory.quests.cargoDeliveries[material.requirementId] = material.quantity;
    }
    const tileId = stage >= 2 ? 644452 : stage === 1 ? 644453 : 644451;
    const lat = graph.latDeg[tileId] * Math.PI / 180;
    const lon = graph.lonDeg[tileId] * Math.PI / 180;
    save.payload.playerShip.tileId = tileId;
    save.payload.playerShip.position = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
    save.payload.playerShip.heading = [-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)];
    save.payload.playerShip.velocity = [0, 0, 0];
    // Derived markets and NPCs must be built from the restored active port set.
    delete save.payload.economy;
    delete save.payload.npcRoutes;
    let serialized = JSON.stringify(save);
    for (let pass = 0; pass < 2; pass++) {
      await page.evaluate((text) => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(text), serialized);
      const result = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectExeterCanal());
      assert.deepEqual(browserErrors, [], `Canal stage ${stage}`);
      assert.equal(result.stage, stage);
      assert.equal(result.exeterActive, stage === 3);
      assert.equal(result.exeterIndexed, stage === 3);
      assert.equal(result.npcPortActive, stage === 3);
      assert.equal(result.shipNavigable, true);
      assert.equal(result.shipTileId, tileId, "Canal restore displaced the ship");
      assert.equal(result.sceneCityId, stage === 3 ? "exeter|united kingdom" : "topsham|united kingdom");
      assert.equal(result.nodeId, stage === 3 ? "market" : "exeter-canal");
      assert.ok(result.serialized);
      serialized = result.serialized;
    }
    process.stdout.write(`  Exeter canal stage ${stage}: two rendered scene/save/load round trips passed.\n`);
  }
}
