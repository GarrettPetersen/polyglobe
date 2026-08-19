import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { GAME_STATE_VERSION } from "./gameState.js";
import {
  LOCAL_SAVE_STORAGE_KEY,
  readLocalSave
} from "./localSave.js";
import {
  migrateSavedVoyageCore,
  recoverSavedVoyageWorldClock
} from "./saveCompatibility.js";

const FIXTURE_DIRECTORY = new URL("./test-fixtures/saves/", import.meta.url);
const FIXTURE_FILES = readdirSync(FIXTURE_DIRECTORY)
  .filter((name) => name.endsWith(".json"))
  .sort();

assert.ok(FIXTURE_FILES.length > 0, "Save compatibility suite requires at least one frozen fixture");

for (const fixtureName of FIXTURE_FILES) {
  test(`released save remains compatible: ${fixtureName}`, () => {
    const serialized = readFileSync(new URL(fixtureName, FIXTURE_DIRECTORY), "utf8");
    const storedVersion = JSON.parse(serialized).version;
    const storage = memoryStorage(serialized);
    const loaded = readLocalSave({ storage });

    assert.equal(loaded.status, "ready", loaded.error?.message);
    assert.equal(loaded.save.version, storedVersion);

    const payload = loaded.save.payload;
    const originalPayload = structuredClone(payload);
    const expected = compatibilityFacts(payload);
    const restored = migrateSavedVoyageCore(payload);
    assert.deepEqual(payload, originalPayload);

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

test("a debt checkpoint ahead of a stale saved clock advances the restored voyage", () => {
  const payload = {
    worldClock: {
      currentMinute: 113877.6,
      voyageStartMinute: 100000
    }
  };
  const gameState = {
    memory: {
      campaignGoal: {
        type: "family-debt",
        lastAccruedMinute: 113924.238384
      }
    }
  };
  const recovered = recoverSavedVoyageWorldClock(payload, gameState);
  assert.equal(recovered.currentMinute, 113924.238384);
  assert.equal(recovered.voyageStartMinute, 100000);
  assert.ok(Math.abs(recovered.recoveredDebtClockMinutes - 46.638384) < 1e-9);
});

test("ordinary saves retain their exact world clock", () => {
  const payload = {
    worldClock: {
      currentMinute: 1200,
      voyageStartMinute: 1000
    }
  };
  assert.deepEqual(recoverSavedVoyageWorldClock(payload, {
    memory: { campaignGoal: { type: "explorer" } }
  }), {
    currentMinute: 1200,
    voyageStartMinute: 1000,
    recoveredDebtClockMinutes: 0
  });
});

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
