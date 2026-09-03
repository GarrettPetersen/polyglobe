import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  reconcileQuestPortTiles,
  validateGameState
} from "./gameState.js";
import { COURT_ACTION_KINDS } from "./courtPolitics.js";
import { IMPERIAL_HISTORY_EVENT_KINDS } from "./imperialConstitution.js";
import {
  LOCAL_SAVE_STORAGE_KEY,
  readLocalSave
} from "./localSave.js";
import {
  migrateSavedVoyageCore,
  recoverSavedVoyageWorldClock,
  savedVoyageWorldTopology
} from "./saveCompatibility.js";
import { PAPAL_RECORDED_ACTION_KINDS } from "./papalPolitics.js";
import { PORT_CONQUEST_EVENT_KINDS } from "./portConquest.js";
import {
  SUZERAINTY_EVENT_KINDS,
  SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
  SUZERAINTY_KIND_PERSONAL_UNION,
  SUZERAINTY_KIND_TRIBUTARY,
  SUZERAINTY_KIND_VASSAL
} from "./suzerainty.js";
import { DENSE_SAVE_PORT_CATALOG } from "./test-fixtures/createDenseSaveCompatibilityFixture.js";
import { testCrewMigrationOptions } from "./test-fixtures/crewTestFixtures.js";
import { TRADE_EMBARGO_EVENT_KINDS } from "./tradeEmbargoes.js";
import { WORLD_DIPLOMACY_EVENT_KINDS } from "./worldDiplomacy.js";

const FIXTURE_DIRECTORY = new URL("./test-fixtures/saves/", import.meta.url);
const FIXTURE_FILES = readdirSync(FIXTURE_DIRECTORY)
  .filter((name) => name.endsWith(".json"))
  .sort();
const CURRENT_DENSE_FIXTURE = `dense-local-save-v2-game-state-v${GAME_STATE_VERSION}.json`;

assert.ok(FIXTURE_FILES.length > 0, "Save compatibility suite requires at least one frozen fixture");
assert.ok(
  FIXTURE_FILES.includes(CURRENT_DENSE_FIXTURE),
  `Game-state version ${GAME_STATE_VERSION} requires a frozen dense local-save fixture`
);

for (const fixtureName of FIXTURE_FILES) {
  test(`released save migrates through the persistence boundary: ${fixtureName}`, () => {
    const serialized = readFileSync(new URL(fixtureName, FIXTURE_DIRECTORY), "utf8");
    const storedVersion = JSON.parse(serialized).version;
    const storage = memoryStorage(serialized);
    const loaded = readLocalSave({ storage });

    assert.equal(loaded.status, "ready", loaded.error?.message);
    assert.equal(loaded.save.version, storedVersion);

    const payload = loaded.save.payload;
    const originalPayload = structuredClone(payload);
    const expected = compatibilityFacts(payload);
    const restored = migrateSavedVoyageCore(payload, {
      ...testCrewMigrationOptions(),
      legacyCityIdForPortReference: ({ tileId }) => {
        const cityId = new Map([
          [4242, "lisbon|portugal"],
          [5151, "porto|portugal"]
        ]).get(tileId);
        assert.ok(cityId, `Unexpected legacy city tile: ${tileId}`);
        return cityId;
      }
    });
    assert.deepEqual(payload, originalPayload);

    assert.equal(restored.gameState.version, GAME_STATE_VERSION);
    if (fixtureName.startsWith("dense-local-save-")) {
      if (payload.gameState.version === GAME_STATE_VERSION) {
        assertDenseEventKindCoverage(payload.gameState);
      }
      reconcileQuestPortTiles(restored.gameState, DENSE_SAVE_PORT_CATALOG);
      validateGameState(restored.gameState);
    }
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

test("released saves migrate from the subdivision-seven world without mutation", () => {
  const payload = { gameState: { divergentHistory: true } };
  const original = structuredClone(payload);
  assert.deepEqual(savedVoyageWorldTopology(payload, 8), {
    savedSubdivisions: 7,
    currentSubdivisions: 8,
    changed: true
  });
  assert.deepEqual(payload, original);
  assert.deepEqual(savedVoyageWorldTopology({ ...payload, worldSubdivisions: 8 }, 8), {
    savedSubdivisions: 8,
    currentSubdivisions: 8,
    changed: false
  });
  assert.throws(
    () => savedVoyageWorldTopology({ worldSubdivisions: 9 }, 8),
    /cannot load/
  );
});

function assertDenseEventKindCoverage(state) {
  assertExactKinds(state.memory.conquest.events, PORT_CONQUEST_EVENT_KINDS, "conquest events");
  assertExactKinds(
    state.relations.diplomacy.history,
    WORLD_DIPLOMACY_EVENT_KINDS,
    "diplomacy events"
  );
  assertExactKinds(
    state.relations.diplomacy.suzerainties.history,
    SUZERAINTY_EVENT_KINDS,
    "suzerainty events"
  );
  assert.deepEqual(
    new Set(state.relations.diplomacy.suzerainties.history.map((event) => event.relationshipKind)),
    new Set([
      SUZERAINTY_KIND_VASSAL,
      SUZERAINTY_KIND_AUTONOMOUS_VASSAL,
      SUZERAINTY_KIND_TRIBUTARY,
      SUZERAINTY_KIND_PERSONAL_UNION
    ])
  );
  assertExactKinds(
    state.relations.tradeEmbargoes.history,
    TRADE_EMBARGO_EVENT_KINDS,
    "trade embargo events"
  );
  assertExactKinds(
    state.relations.imperial.history,
    IMPERIAL_HISTORY_EVENT_KINDS,
    "Imperial events"
  );
  assertExactKinds(state.relations.courts.history, COURT_ACTION_KINDS, "court events");
  assertExactKinds(state.relations.papacy.history, PAPAL_RECORDED_ACTION_KINDS, "Papal events");
}

function assertExactKinds(records, expectedKinds, label) {
  assert.deepEqual(
    new Set(records.map((record) => record.kind)),
    new Set(expectedKinds),
    `Dense save does not cover every registered ${label}`
  );
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
    optionalWaypoints: state.memory.navigation.optionalWaypoints.map((waypoint) => ({
      destinationTileId: waypoint.destinationTileId,
      destinationName: waypoint.destinationName,
      reason: waypoint.reason
    })),
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
