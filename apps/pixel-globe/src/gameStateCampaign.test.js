import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  FAMILY_DEBT_PRINCIPAL,
  createCampaignGoal
} from "./campaignGoals.js";
import {
  GAME_STATE_VERSION,
  createGameState,
  migrateGameState,
  settleCampaignGoalAtHome,
  updateCartographyMemory
} from "./gameState.js";

const PLAYER = Object.freeze({
  id: "player-campaign-test",
  name: "Anne Test",
  givenName: "Anne",
  gender: "female",
  nameCulture: "english",
  nationalityId: "england",
  homePortTileId: 12,
  homePortName: "London",
  expressions: ["neutral"]
});
const HOME = Object.freeze({
  tileId: 12,
  city: "London",
  country: "United Kingdom",
  factionId: "england",
  lat: 51.5074,
  lon: -0.1278
});
const WONDERS = Object.freeze([
  Object.freeze({ id: "wonder-a", kind: "landmark", displayName: "Wonder A", lat: HOME.lat, lon: HOME.lon }),
  Object.freeze({ id: "circumnavigation", kind: "achievement", displayName: "Around the world" })
]);

test("home-port patron settlement pays once and records campaign income", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.campaignGoal = createCampaignGoal({
    playerCharacter: PLAYER,
    type: CAMPAIGN_GOAL_EXPLORER
  });
  state.memory.discoveries["wonder-a"] = { id: "wonder-a", displayName: "Wonder A", kind: "landmark", detail: "" };
  state.memory.discoveryOrder.push("wonder-a");

  const first = settleCampaignGoalAtHome(state, HOME, {
    currentMinute: 100,
    wonderCatalog: WONDERS
  });
  const second = settleCampaignGoalAtHome(state, HOME, {
    currentMinute: 100,
    wonderCatalog: WONDERS
  });

  assert.equal(first.reward, 100);
  assert.equal(second.reward, 0);
  assert.equal(state.doubloons, 460);
  assert.equal(state.accounts.ledger.at(-1).kind, "campaign");
});

test("home-port creditor settlement leaves the protected purse and records payment", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  state.memory.campaignGoal = createCampaignGoal({
    playerCharacter: PLAYER,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  state.doubloons = FAMILY_DEBT_PRINCIPAL + 100;

  const result = settleCampaignGoalAtHome(state, HOME, {
    currentMinute: 0
  });

  assert.equal(result.completed, true);
  assert.equal(state.doubloons, 100);
  assert.equal(state.accounts.ledger.at(-1).amount, -FAMILY_DEBT_PRINCIPAL);
});

test("version 14 saves gain colony quest and cargo reservation state", () => {
  const legacy = createGameState({ cargoCapacity: 20, startMinute: 500, playerCharacter: PLAYER });
  legacy.version = 14;
  delete legacy.memory.colonization;
  delete legacy.memory.cargoReservations;

  const restored = migrateGameState(legacy, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.memory.colonization.stage, "fetch");
  assert.deepEqual(restored.memory.cargoReservations, {});
});

test("cartography snapshots validate and persist their packed mask", () => {
  const state = createGameState({ cargoCapacity: 20 });
  updateCartographyMemory(state, "AQI=", 2);
  assert.deepEqual(state.memory.cartography, { seenTilesBase64: "AQI=", seenTileCount: 2 });
});
