import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  addPortNavigationWaypoint,
  clearPortNavigationWaypointsAt,
  createGameState,
  migrateGameState,
  portNavigationReasonLabel,
  removeOptionalNavigationWaypoint
} from "./gameState.js";

test("optional port waypoints persist independently until removed or reached", () => {
  const state = createGameState({ cargoCapacity: 10 });

  assert.deepEqual(addPortNavigationWaypoint(state, {
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  }), {
    id: "port:42",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  });
  addPortNavigationWaypoint(state, {
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP"
  });
  assert.equal(clearPortNavigationWaypointsAt(state, 41), false);
  assert.equal(removeOptionalNavigationWaypoint(state, "port:81"), true);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, [{
    id: "port:42",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  }]);
  assert.equal(clearPortNavigationWaypointsAt(state, 42), true);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, []);
});

test("version 18 voyages gain an empty optional waypoint list during migration", () => {
  const saved = createGameState({ cargoCapacity: 10 });
  saved.version = 18;
  delete saved.memory.navigation.optionalWaypoints;

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.memory.navigation.optionalWaypoints, []);
});

test("version 19 singular headings migrate into removable optional waypoints", () => {
  const saved = createGameState({ cargoCapacity: 10 });
  saved.version = 19;
  delete saved.memory.navigation.optionalWaypoints;
  saved.memory.navigation.portHeading = {
    destinationTileId: 42,
    destinationName: "Porto"
  };

  const restored = migrateGameState(saved, null);

  assert.deepEqual(restored.memory.navigation.optionalWaypoints, [{
    id: "port:42",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  }]);
  assert.equal("portHeading" in restored.memory.navigation, false);
});

test("an already-migrated shipyard heading has a useful player-facing reason", () => {
  assert.equal(portNavigationReasonLabel("PLAYER HEADING"), "NEW SHIP FOR SALE");
  assert.equal(portNavigationReasonLabel("SHIPYARD RUMOUR"), "NEW SHIP FOR SALE");
  assert.equal(portNavigationReasonLabel("TRADE PRICE TIP"), "TRADE PRICE TIP");
});
