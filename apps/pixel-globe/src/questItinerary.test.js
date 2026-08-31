import assert from "node:assert/strict";
import test from "node:test";

import {
  QUEST_ITINERARY_OPEN,
  QUEST_ITINERARY_ORDERED,
  completeQuestItineraryStop,
  createQuestItinerary,
  migrateQuestItinerary,
  questDestinationStops,
  questHasDestination
} from "./questItinerary.js";
import { GAME_STATE_VERSION, createGameState, migrateGameState } from "./gameState.js";

const STOPS = Object.freeze([
  Object.freeze({ cityId: "arsenal|test", tileId: 1, name: "Arsenal" }),
  Object.freeze({ cityId: "north-battery|test", tileId: 2, name: "North Battery" }),
  Object.freeze({ cityId: "south-battery|test", tileId: 3, name: "South Battery" }),
  Object.freeze({ cityId: "river-battery|test", tileId: 4, name: "River Battery" })
]);

test("an opening stop unlocks every remaining open itinerary stop", () => {
  const quest = {
    destinationTileId: STOPS[0].tileId,
    destinationCityId: STOPS[0].cityId,
    destinationName: STOPS[0].name,
    itinerary: createQuestItinerary(STOPS, {
      mode: QUEST_ITINERARY_OPEN,
      openingStopCityId: STOPS[0].cityId
    })
  };

  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [1]);
  completeQuestItineraryStop(quest, STOPS[0].cityId);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2, 3, 4]);
  assert.equal(questHasDestination(quest, STOPS[2].cityId), true);

  completeQuestItineraryStop(quest, STOPS[2].cityId);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2, 4]);
  completeQuestItineraryStop(quest, STOPS[3].cityId);
  const final = completeQuestItineraryStop(quest, STOPS[1].cityId);
  assert.equal(final.final, true);
  assert.deepEqual(questDestinationStops(quest), []);
});

test("an ordered itinerary only exposes and completes its next stop", () => {
  const quest = {
    destinationTileId: STOPS[0].tileId,
    destinationCityId: STOPS[0].cityId,
    destinationName: STOPS[0].name,
    itinerary: createQuestItinerary(STOPS, { mode: QUEST_ITINERARY_ORDERED })
  };

  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [1]);
  assert.throws(() => completeQuestItineraryStop(quest, STOPS[1].cityId), /not currently available/i);
  completeQuestItineraryStop(quest, STOPS[0].cityId);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2]);
  assert.equal(questHasDestination(quest, STOPS[2].cityId), false);
});

test("a version 1 open itinerary migrates without losing progress", () => {
  const quest = {
    destinationTileId: STOPS[1].tileId,
    destinationName: STOPS[1].name,
    openItinerary: {
      version: 1,
      openingStopTileId: STOPS[0].tileId,
      stops: STOPS.map((stop) => ({ ...stop })),
      completedTileIds: [STOPS[0].tileId, STOPS[2].tileId]
    }
  };

  migrateQuestItinerary(quest);
  assert.equal(quest.openItinerary, undefined);
  assert.equal(quest.itinerary.mode, QUEST_ITINERARY_OPEN);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2, 4]);
});

test("a legacy religious itinerary migrates as an ordered route", () => {
  const quest = {
    destinationTileId: STOPS[1].tileId,
    destinationName: STOPS[1].name,
    religiousItinerary: STOPS.map((stop) => ({ ...stop })),
    religiousDeliveryLegIndex: 1,
    religiousAuthorityAppliedLegCount: 1
  };

  migrateQuestItinerary(quest);
  assert.equal(quest.religiousItinerary, undefined);
  assert.equal(quest.itinerary.mode, QUEST_ITINERARY_ORDERED);
  assert.deepEqual(quest.itinerary.completedTileIds, [1]);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2]);
});

test("version 66 voyages migrate every saved quest route", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.version = 66;
  state.memory.quests.passengerActive = {
    id: "legacy-testament",
    kind: "passenger",
    destinationTileId: 2,
    destinationName: "North Battery",
    religiousItinerary: STOPS.map((stop) => ({ ...stop })),
    religiousDeliveryLegIndex: 1,
    religiousAuthorityAppliedLegCount: 1
  };
  state.memory.quests.passengerOffers.legacy = {
    id: "legacy-artillery",
    kind: "passenger",
    destinationTileId: 2,
    destinationName: "North Battery",
    openItinerary: {
      version: 1,
      openingStopTileId: 1,
      stops: STOPS.map((stop) => ({ ...stop })),
      completedTileIds: [1]
    }
  };

  const migrated = migrateGameState(state, null);
  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.equal(migrated.memory.quests.passengerActive.itinerary.mode, QUEST_ITINERARY_ORDERED);
  assert.equal(migrated.memory.quests.passengerOffers.legacy.itinerary.mode, QUEST_ITINERARY_OPEN);
  assert.equal(migrated.memory.quests.passengerActive.religiousItinerary, undefined);
  assert.equal(migrated.memory.quests.passengerOffers.legacy.openItinerary, undefined);
});
