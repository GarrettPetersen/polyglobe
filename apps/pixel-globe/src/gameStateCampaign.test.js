import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE,
  FAMILY_DEBT_PRINCIPAL,
  createCampaignGoal
} from "./campaignGoals.js";
import {
  GAME_STATE_VERSION,
  createGameState,
  migrateGameState,
  settleCampaignGoalAtHome,
  updateCartographyMemory,
  validateGameState
} from "./gameState.js";
import { shipMinimumCrew } from "./shipLoadouts.js";
import { shipStatsForSlug } from "./shipStats.js";
import { TREASURE_MAP_PIECE_COUNT } from "./treasureCampaign.js";

const PLAYER = Object.freeze({
  id: "player-campaign-test",
  name: "Anne Test",
  givenName: "Anne",
  gender: "female",
  nameCulture: "english",
  nationalityId: "england",
  homePortCityId: "london|united kingdom",
  homePortTileId: 12,
  homePortName: "London",
  expressions: ["neutral"]
});
const HOME = Object.freeze({
  tileId: 12,
  cityId: "london|united kingdom",
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

test("voyage seeds persist and legacy saves gain a stable seed", () => {
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: PLAYER,
    startMinute: 321,
    voyageSeed: "test-voyage-seed"
  });
  assert.equal(state.voyageSeed, "test-voyage-seed");
  validateGameState(state);

  const legacy = structuredClone(state);
  legacy.version = 37;
  delete legacy.voyageSeed;
  const restored = migrateGameState(legacy, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(typeof restored.voyageSeed, "string");
  assert.ok(restored.voyageSeed.length > 0);
  assert.equal(
    migrateGameState(structuredClone(legacy), null).voyageSeed,
    restored.voyageSeed
  );
});

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

test("white-whale captains begin with a harpoon and complete only after returning home", () => {
  const state = createGameState({
    cargoCapacity: 20,
    playerCharacter: PLAYER,
    campaignGoalType: CAMPAIGN_GOAL_WHITE_WHALE
  });
  assert.equal(state.memory.campaignGoal.type, CAMPAIGN_GOAL_WHITE_WHALE);
  assert.equal(state.inventory.whaleHarpoonId, "ash-shaft-harpoon");
  state.memory.campaignGoal.whiteWhaleKilled = true;
  state.memory.campaignGoal.whiteWhaleKilledMinute = 100;

  const result = settleCampaignGoalAtHome(state, HOME, { currentMinute: 120 });
  assert.equal(result.completed, true);
  assert.equal(state.memory.campaignGoal.status, "complete");
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

test("legacy treasure pirate hideouts gain canonical city ids before validation", () => {
  const legacy = createGameState({
    cargoCapacity: 20,
    playerCharacter: PLAYER,
    campaignGoalType: CAMPAIGN_GOAL_TREASURE
  });
  legacy.version = 90;
  delete legacy.playerCharacter.homePortCityId;
  delete legacy.memory.campaignGoal.homePortCityId;
  legacy.memory.campaignGoal.mapPirates = Array.from(
    { length: TREASURE_MAP_PIECE_COUNT },
    (_, index) => ({
      id: `treasure-pirate-${String(index + 1).padStart(2, "0")}`,
      shipId: `treasure-map-pirate-${String(index + 1).padStart(2, "0")}`,
      hideoutTileId: 100 + index,
      shipSlug: "sloop",
      captainId: null,
      captainName: null
    })
  );

  const restored = migrateGameState(legacy, null, {
    legacyCityIdForPortReference: ({ tileId }) => tileId === HOME.tileId
      ? HOME.cityId
      : `treasure-port-${tileId}|test`
  });

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.playerCharacter.homePortCityId, HOME.cityId);
  assert.deepEqual(
    restored.memory.campaignGoal.mapPirates.map((pirate) => pirate.hideoutCityId),
    Array.from(
      { length: TREASURE_MAP_PIECE_COUNT },
      (_, index) => `treasure-port-${100 + index}|test`
    )
  );
  validateGameState(restored);
});

test("version 23 saves gain per-voyage achievement progress", () => {
  const legacy = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  legacy.version = 23;
  delete legacy.memory.achievements;

  const restored = migrateGameState(legacy, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.memory.achievements, {
    version: 2,
    soldSpiceGoodIds: [],
    foundedCityIds: [],
    sailedShipSlugs: [],
    grossDoubloonsEarned: 0,
    whiteWhaleKilled: false,
    arrivedInPortDrunk: false,
    married: false,
    defeatedShipCount: 0,
    whalesKilled: 0,
    survivedLightningStrike: false
  });
});

test("version 31 saves migrate voyage achievement counters", () => {
  const legacy = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  legacy.version = 31;
  legacy.memory.achievements = {
    version: 1,
    soldSpiceGoodIds: [],
    foundedCityIds: [],
    sailedShipSlugs: [],
    grossDoubloonsEarned: 0,
    whiteWhaleKilled: true,
    arrivedInPortDrunk: false
  };

  const restored = migrateGameState(legacy, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.memory.achievements.version, 2);
  assert.equal(restored.memory.achievements.whalesKilled, 1);
  assert.equal(restored.memory.achievements.married, false);
});

test("version 24 custom loadouts migrate one-crew targets to the hull minimum", () => {
  const stats = shipStatsForSlug("brigantine");
  const legacy = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: PLAYER,
    shipStats: stats
  });
  legacy.version = 24;
  legacy.ship.crew = 1;
  legacy.ship.loadoutId = "custom";
  legacy.ship.loadoutTargets = {
    id: "custom",
    crew: 1,
    cannons: 3,
    foodUnits: 4,
    waterUnits: 5
  };

  const restored = migrateGameState(legacy, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.ship.loadoutTargets.crew, shipMinimumCrew(stats));
  assert.equal(restored.ship.crew, 1);
  assert.ok(restored.ship.loadoutTargets.totalSpace <= stats.cargoCapacity);

  const malformed = structuredClone(restored);
  malformed.ship.loadoutTargets.crew = 1;
  assert.throws(() => validateGameState(malformed), /crew must be/);
});

test("cartography snapshots validate and persist their packed mask", () => {
  const state = createGameState({ cargoCapacity: 20 });
  updateCartographyMemory(state, "AQI=", 2);
  assert.deepEqual(state.memory.cartography, { seenTilesBase64: "AQI=", seenTileCount: 2 });
});
