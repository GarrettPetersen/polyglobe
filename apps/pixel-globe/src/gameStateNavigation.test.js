import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  PORT_NAVIGATION_REASON_QUEST_CARGO,
  addPortNavigationWaypoint,
  clearPortNavigationWaypointsAt,
  createGameState,
  migrateGameState,
  portNavigationReasonLabel,
  reconcileQuestPortTiles,
  removeOptionalNavigationWaypoint
} from "./gameState.js";

test("quest cargo waypoints remain distinct per required good", () => {
  const state = createGameState({ cargoCapacity: 10 });
  addPortNavigationWaypoint(state, {
    destinationTileId: 42,
    destinationName: "Porto",
    reason: PORT_NAVIGATION_REASON_QUEST_CARGO,
    questCargoGoodId: "wool"
  });
  addPortNavigationWaypoint(state, {
    destinationTileId: 42,
    destinationName: "Porto",
    reason: PORT_NAVIGATION_REASON_QUEST_CARGO,
    questCargoGoodId: "grain"
  });

  assert.deepEqual(state.memory.navigation.optionalWaypoints.map((waypoint) => waypoint.id), [
    "port:42:quest-cargo:wool",
    "port:42:quest-cargo:grain"
  ]);
  assert.throws(() => addPortNavigationWaypoint(state, {
    destinationTileId: 42,
    destinationName: "Porto",
    reason: PORT_NAVIGATION_REASON_QUEST_CARGO
  }), /require a trade good id/);
});

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
    reason: "TRADE PRICE TIP",
    tradeGoodId: "cloves"
  });
  assert.equal(clearPortNavigationWaypointsAt(state, 41), false);
  assert.equal(removeOptionalNavigationWaypoint(state, "port:81:trade-price:cloves"), true);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, [{
    id: "port:42",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  }]);
  assert.equal(clearPortNavigationWaypointsAt(state, 42), true);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, []);
});

test("trade price waypoints remain distinct and name their goods", () => {
  const state = createGameState({ cargoCapacity: 10 });
  addPortNavigationWaypoint(state, {
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP",
    tradeGoodId: "cloves"
  });
  addPortNavigationWaypoint(state, {
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP",
    tradeGoodId: "tea"
  });

  assert.deepEqual(state.memory.navigation.optionalWaypoints.map((waypoint) => waypoint.id), [
    "port:81:trade-price:cloves",
    "port:81:trade-price:tea"
  ]);
  assert.throws(() => addPortNavigationWaypoint(state, {
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP"
  }), /require a trade good id/);
});

test("saved optional waypoints follow a port moved onto its real island", () => {
  const state = createGameState({ cargoCapacity: 20 });
  addPortNavigationWaypoint(state, {
    destinationTileId: 21837,
    destinationName: "Tarawa Village",
    reason: "NEW SHIP FOR SALE"
  });

  const updates = reconcileQuestPortTiles(state, [{
    tileId: 67709,
    city: "Tarawa Village",
    displayCity: "Tarawa Village",
    country: "Kiribati"
  }]);

  assert.equal(updates, 1);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, [{
    id: "port:67709",
    destinationTileId: 67709,
    destinationName: "Tarawa Village",
    reason: "NEW SHIP FOR SALE"
  }]);
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
  assert.equal(portNavigationReasonLabel("TRADE PRICE TIP", "cloves"), "Price tip: Cloves");
  assert.equal(portNavigationReasonLabel("QUEST CARGO SOURCE", "wool"), "Quest cargo: Wool");
});
