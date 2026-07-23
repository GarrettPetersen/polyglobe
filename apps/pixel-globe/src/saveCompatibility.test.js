import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { GAME_STATE_VERSION } from "./gameState.js";
import {
  LOCAL_SAVE_STORAGE_KEY,
  LOCAL_SAVE_VERSION,
  readLocalSave
} from "./localSave.js";
import { migrateSavedVoyageCore } from "./saveCompatibility.js";

const FIXTURE_DIRECTORY = new URL("./test-fixtures/saves/", import.meta.url);
const FIXTURE_FILES = readdirSync(FIXTURE_DIRECTORY)
  .filter((name) => name.endsWith(".json"))
  .sort();

assert.ok(FIXTURE_FILES.length > 0, "Save compatibility suite requires at least one frozen fixture");

for (const fixtureName of FIXTURE_FILES) {
  test(`released save remains compatible: ${fixtureName}`, () => {
    const serialized = readFileSync(new URL(fixtureName, FIXTURE_DIRECTORY), "utf8");
    const storage = memoryStorage(serialized);
    const loaded = readLocalSave({ storage });

    assert.equal(loaded.status, "ready", loaded.error?.message);
    assert.equal(loaded.save.version, LOCAL_SAVE_VERSION);

    const payload = loaded.save.payload;
    const expected = compatibilityFacts(payload);
    const restored = migrateSavedVoyageCore(payload);

    assert.equal(restored.gameState.version, GAME_STATE_VERSION);
    assert.deepEqual(compatibilityFacts({
      ...payload,
      gameState: restored.gameState,
      playerShip: restored.savedShip
    }), expected);
    assert.equal(restored.shipStats.slug, expected.shipTypeSlug);
    assert.equal(restored.shipStats.cargoCapacity, restored.gameState.ship.baseCargoCapacity);
    assert.equal(typeof restored.gameState.voyageSeed, "string");
    assert.ok(restored.gameState.voyageSeed.length > 0);

    const repeated = migrateSavedVoyageCore({
      ...payload,
      gameState: structuredClone(restored.gameState),
      playerShip: structuredClone(restored.savedShip)
    });
    assert.deepEqual(repeated.gameState, restored.gameState);
    assert.deepEqual(repeated.savedShip, restored.savedShip);
  });
}

function compatibilityFacts(payload) {
  const state = payload.gameState;
  return {
    playerId: state.playerCharacter.id,
    playerName: state.playerCharacter.name,
    playerNationalityId: state.playerCharacter.nationalityId,
    homePortTileId: state.playerCharacter.homePortTileId,
    doubloons: state.doubloons,
    activePlaySeconds: state.activePlaySeconds,
    campaignGoalType: state.memory.campaignGoal?.type || null,
    campaignGoalStatus: state.memory.campaignGoal?.status || null,
    campaignDebtBalance: state.memory.campaignGoal?.debtBalance || null,
    optionalWaypoints: structuredClone(state.memory.navigation.optionalWaypoints),
    shipTypeSlug: payload.playerShip.typeSlug,
    shipFactionId: payload.playerShip.factionId,
    shipTileId: payload.playerShip.tileId,
    shipHitPoints: payload.playerShip.hitPoints,
    shipMaxHitPoints: payload.playerShip.maxHitPoints,
    currentMinute: payload.worldClock.currentMinute,
    voyageStartMinute: payload.worldClock.voyageStartMinute,
    anchored: payload.anchored
  };
}

function memoryStorage(serialized) {
  return {
    getItem(key) {
      return key === LOCAL_SAVE_STORAGE_KEY ? serialized : null;
    },
    setItem() {
      throw new Error("Compatibility fixture storage is read-only");
    },
    removeItem() {
      throw new Error("Compatibility fixture storage is read-only");
    }
  };
}
