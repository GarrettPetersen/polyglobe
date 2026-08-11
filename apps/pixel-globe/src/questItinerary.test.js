import assert from "node:assert/strict";
import test from "node:test";

import {
  completeOpenQuestItineraryStop,
  createOpenQuestItinerary,
  questDestinationStops,
  questHasDestination
} from "./questItinerary.js";

const STOPS = Object.freeze([
  Object.freeze({ tileId: 1, name: "Arsenal" }),
  Object.freeze({ tileId: 2, name: "North Battery" }),
  Object.freeze({ tileId: 3, name: "South Battery" }),
  Object.freeze({ tileId: 4, name: "River Battery" })
]);

test("an opening stop unlocks every remaining itinerary stop", () => {
  const quest = {
    destinationTileId: STOPS[0].tileId,
    destinationName: STOPS[0].name,
    openItinerary: createOpenQuestItinerary(STOPS, { openingStopTileId: STOPS[0].tileId })
  };

  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [1]);
  completeOpenQuestItineraryStop(quest, 1);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2, 3, 4]);
  assert.equal(questHasDestination(quest, 3), true);

  completeOpenQuestItineraryStop(quest, 3);
  assert.deepEqual(questDestinationStops(quest).map((stop) => stop.tileId), [2, 4]);
  completeOpenQuestItineraryStop(quest, 4);
  const final = completeOpenQuestItineraryStop(quest, 2);
  assert.equal(final.final, true);
  assert.deepEqual(questDestinationStops(quest), []);
});

test("an open itinerary rejects unavailable and duplicate stops", () => {
  const quest = {
    destinationTileId: STOPS[0].tileId,
    destinationName: STOPS[0].name,
    openItinerary: createOpenQuestItinerary(STOPS, { openingStopTileId: STOPS[0].tileId })
  };
  assert.throws(() => completeOpenQuestItineraryStop(quest, 2), /not currently available/i);
  completeOpenQuestItineraryStop(quest, 1);
  completeOpenQuestItineraryStop(quest, 2);
  assert.throws(() => completeOpenQuestItineraryStop(quest, 2), /not currently available/i);
});
