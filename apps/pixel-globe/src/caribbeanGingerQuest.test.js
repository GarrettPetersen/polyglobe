import assert from "node:assert/strict";
import test from "node:test";

import { createGameState, migrateGameState } from "./gameState.js";
import {
  CARIBBEAN_GINGER_FETCH_STAGE,
  CARIBBEAN_GINGER_STAGE_ACTIVE,
  CARIBBEAN_GINGER_STAGE_COMPLETED,
  assertCaribbeanGingerDelivery,
  caribbeanGingerIndustryCompleted,
  caribbeanGingerOfferShouldApproach,
  caribbeanGingerQuestPort,
  caribbeanGingerQuestState,
  completeCaribbeanGingerQuest,
  markCaribbeanGingerOfferSeen,
  maybeSpawnCaribbeanGingerQuest,
  validateCaribbeanGingerQuestMemory
} from "./caribbeanGingerQuest.js";

const HAVANA = Object.freeze({ tileId: 20, city: "Havana", country: "Cuba" });
const SANTO_DOMINGO = Object.freeze({
  tileId: 21,
  city: "Santo Domingo",
  country: "Dominican Republic"
});
const PANAMA = Object.freeze({ tileId: 22, city: "Panama City", country: "Panama" });

test("a deterministic Caribbean port can offer the ginger cultivation quest", () => {
  const state = createGameState({ cargoCapacity: 50 });
  assert.equal(maybeSpawnCaribbeanGingerQuest(state, PANAMA, { spawnChance: 1 }), null);

  const quest = maybeSpawnCaribbeanGingerQuest(state, HAVANA, {
    spawnChance: 1,
    simMinute: 7 * 24 * 60
  });
  assert.equal(quest.stage, CARIBBEAN_GINGER_STAGE_ACTIVE);
  assert.equal(quest.fetchStage, CARIBBEAN_GINGER_FETCH_STAGE);
  assert.equal(caribbeanGingerOfferShouldApproach(state, HAVANA), true);
  markCaribbeanGingerOfferSeen(state);
  assert.equal(caribbeanGingerOfferShouldApproach(state, HAVANA), false);
  assert.equal(maybeSpawnCaribbeanGingerQuest(state, SANTO_DOMINGO, { spawnChance: 1 }), null);
  assert.equal(caribbeanGingerQuestPort(state, [SANTO_DOMINGO, HAVANA]), HAVANA);
});

test("delivering ginger establishes one validated persistent Caribbean industry", () => {
  const state = createGameState({ cargoCapacity: 50 });
  maybeSpawnCaribbeanGingerQuest(state, SANTO_DOMINGO, { spawnChance: 1, simMinute: 0 });
  state.cargo.ginger = CARIBBEAN_GINGER_FETCH_STAGE.quantity;

  assert.equal(assertCaribbeanGingerDelivery(state, SANTO_DOMINGO), CARIBBEAN_GINGER_FETCH_STAGE);
  const quest = completeCaribbeanGingerQuest(state, SANTO_DOMINGO, 500);
  assert.equal(quest.stage, CARIBBEAN_GINGER_STAGE_COMPLETED);
  assert.equal(quest.completed, true);
  assert.equal(caribbeanGingerIndustryCompleted(state), true);
  assert.equal(validateCaribbeanGingerQuestMemory(state.memory.quests.caribbeanGinger),
    state.memory.quests.caribbeanGinger);
  assert.equal(caribbeanGingerQuestState(state, HAVANA), null);
});

test("version 22 saves migrate with a locked Caribbean ginger quest", () => {
  const legacy = structuredClone(createGameState({ cargoCapacity: 50 }));
  legacy.version = 22;
  delete legacy.memory.quests.caribbeanGinger;

  const migrated = migrateGameState(legacy, null);
  assert.equal(migrated.memory.quests.caribbeanGinger.stage, "locked");
  assert.equal(migrated.memory.quests.caribbeanGinger.cultivationTileId, null);
});
