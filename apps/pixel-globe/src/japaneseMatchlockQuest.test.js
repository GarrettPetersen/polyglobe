import assert from "node:assert/strict";
import test from "node:test";

import { createGameState, migrateGameState } from "./gameState.js";
import {
  JAPANESE_MATCHLOCK_FETCH_STAGES,
  JAPANESE_MATCHLOCK_STAGE_ACTIVE,
  JAPANESE_MATCHLOCK_STAGE_COMPLETED,
  assertJapaneseMatchlockDelivery,
  completeJapaneseMatchlockFetchStage,
  japaneseMatchlockIndustryCompleted,
  japaneseMatchlockOfferShouldApproach,
  japaneseMatchlockQuestState,
  markJapaneseMatchlockOfferSeen,
  maybeSpawnJapaneseMatchlockQuest,
  validateJapaneseMatchlockQuestMemory
} from "./japaneseMatchlockQuest.js";

const KYOTO = Object.freeze({ tileId: 20, city: "Kyoto", country: "Japan" });
const OSAKA = Object.freeze({ tileId: 21, city: "Osaka", country: "Japan" });

test("the Japanese matchlock workshop unlocks only after the Nagasaki quest succeeds", () => {
  const state = createGameState({ cargoCapacity: 50 });
  assert.equal(maybeSpawnJapaneseMatchlockQuest(state, KYOTO, { spawnChance: 1 }), null);
  establishNagasaki(state);
  assert.equal(maybeSpawnJapaneseMatchlockQuest(state, OSAKA, { spawnChance: 1 }), null);

  const quest = maybeSpawnJapaneseMatchlockQuest(state, KYOTO, {
    spawnChance: 1,
    simMinute: 7 * 24 * 60
  });
  assert.equal(quest.stage, JAPANESE_MATCHLOCK_STAGE_ACTIVE);
  assert.equal(quest.fetchStage.goodId, "matchlocks");
  assert.equal(japaneseMatchlockOfferShouldApproach(state, KYOTO), true);
  markJapaneseMatchlockOfferSeen(state);
  assert.equal(japaneseMatchlockOfferShouldApproach(state, KYOTO), false);
  assert.deepEqual(maybeSpawnJapaneseMatchlockQuest(state, KYOTO), japaneseMatchlockQuestState(state, KYOTO));
});

test("four material deliveries complete a validated persistent Japanese industry quest", () => {
  const state = createGameState({ cargoCapacity: 50 });
  establishNagasaki(state);
  maybeSpawnJapaneseMatchlockQuest(state, KYOTO, { spawnChance: 1, simMinute: 0 });

  for (const stage of JAPANESE_MATCHLOCK_FETCH_STAGES) {
    state.cargo[stage.goodId] = stage.quantity;
    assert.equal(assertJapaneseMatchlockDelivery(state, KYOTO, stage.id), stage);
    completeJapaneseMatchlockFetchStage(state, KYOTO, stage.id, 500);
  }

  const quest = japaneseMatchlockQuestState(state, KYOTO);
  assert.equal(quest.stage, JAPANESE_MATCHLOCK_STAGE_COMPLETED);
  assert.equal(quest.completed, true);
  assert.equal(japaneseMatchlockIndustryCompleted(state), true);
  assert.equal(validateJapaneseMatchlockQuestMemory(state.memory.quests.japaneseMatchlocks),
    state.memory.quests.japaneseMatchlocks);
});

test("version 20 saves migrate with a locked Japanese matchlock quest", () => {
  const legacy = structuredClone(createGameState({ cargoCapacity: 50 }));
  legacy.version = 20;
  delete legacy.memory.quests.japaneseMatchlocks;

  const migrated = migrateGameState(legacy, null);
  assert.equal(migrated.memory.quests.japaneseMatchlocks.stage, "locked");
  assert.equal(migrated.memory.quests.japaneseMatchlocks.workshopTileId, null);
});

function establishNagasaki(state) {
  state.memory.colonization.stage = "established";
  state.memory.colonization.targetCity = "Nagasaki";
  state.memory.colonization.targetCountry = "Japan";
}
