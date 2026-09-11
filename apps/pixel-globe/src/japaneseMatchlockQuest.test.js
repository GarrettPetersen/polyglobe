import { colonizationTargetForCity } from "./colonialCities.js";
import { assignColonizationQuest, colonizationQuestView, completeColonizationFetchStage,
  beginColonizationExpedition, grantColonizationApproval, landColonists, establishColony,
  prepareNextColonizationExpedition, advanceColonizationQuest } from "./colonizationQuest.js";
import assert from "node:assert/strict";
import test from "node:test";

import { migrateGameState } from "./gameState.js";
import { createPlayerTestGameState as createGameState } from "./test-fixtures/createTestGameState.js";
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

const KYOTO = Object.freeze({ cityId: "kyoto|japan", tileId: 20, city: "Kyoto", country: "Japan" });
const OSAKA = Object.freeze({ cityId: "osaka|japan", tileId: 21, city: "Osaka", country: "Japan" });

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
  state.memory.colonization.targetCityId = "nagasaki|japan";
  state.memory.colonization.targetCity = "Nagasaki";
  state.memory.colonization.targetCountry = "Japan";
}


test("teppo remains available after a completed Nagasaki expedition enters settlement history", () => {
  const state = createGameState({ cargoCapacity: 50 });
  assignColonizationQuest(state.memory.colonization, {
    target: {...colonizationTargetForCity({cityId:"nagasaki|japan"}),tileId:777},
    origin: {cityId:"lisbon|portugal",tileId:21,city:"Lisbon",country:"Portugal",factionId:"portugal",lat:38.72,lon:-9.14},
    approvalPort: {...KYOTO,factionId:"japan"}
  });
  for(const stage of colonizationQuestView(state).history.fetchStages) completeColonizationFetchStage(state.memory.colonization,stage.id);
  beginColonizationExpedition(state.memory.colonization);
  grantColonizationApproval(state.memory.colonization,{approvalCargoDelivered:true});
  landColonists(state.memory.colonization,1000);
  const abandoned=structuredClone(state.memory.colonization);
  advanceColonizationQuest(abandoned,abandoned.resupplyDeadlineMinute+1,{awayFromColony:true});
  establishColony(state.memory.colonization,1100);
  assert.equal(prepareNextColonizationExpedition(state),true);
  const restored = migrateGameState(structuredClone(state),null);
  assert.ok(maybeSpawnJapaneseMatchlockQuest(restored, KYOTO, {spawnChance:1, simMinute:20*365*1440}));
  const failed = createGameState({ cargoCapacity:50 });
  failed.memory.colonization.pastSettlements.push(abandoned);
  assert.equal(maybeSpawnJapaneseMatchlockQuest(failed,KYOTO,{spawnChance:1}),null);
});
