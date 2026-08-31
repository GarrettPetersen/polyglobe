import assert from "node:assert/strict";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  PORT_NAVIGATION_REASON_QUEST_CARGO,
  PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
  addPortNavigationWaypoint,
  clearPortNavigationWaypointsAt,
  createGameState,
  migrateGameState,
  portNavigationReasonLabel,
  reconcileQuestPortTiles,
  removeOptionalNavigationWaypoint
} from "./gameState.js";
import { SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS } from "./subdivisionSevenPortMigration.js";

test("quest cargo waypoints remain distinct per required good", () => {
  const state = createGameState({ cargoCapacity: 10 });
  addPortNavigationWaypoint(state, {
    destinationCityId: "porto|portugal",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: PORT_NAVIGATION_REASON_QUEST_CARGO,
    questCargoGoodId: "wool"
  });
  addPortNavigationWaypoint(state, {
    destinationCityId: "porto|portugal",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: PORT_NAVIGATION_REASON_QUEST_CARGO,
    questCargoGoodId: "grain"
  });

  assert.deepEqual(state.memory.navigation.optionalWaypoints.map((waypoint) => waypoint.id), [
    "port:porto|portugal:quest-cargo:wool",
    "port:porto|portugal:quest-cargo:grain"
  ]);
  assert.throws(() => addPortNavigationWaypoint(state, {
    destinationCityId: "porto|portugal",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: PORT_NAVIGATION_REASON_QUEST_CARGO
  }), /require a trade good id/);
});

test("optional port waypoints persist independently until removed or reached", () => {
  const state = createGameState({ cargoCapacity: 10 });

  assert.deepEqual(addPortNavigationWaypoint(state, {
    destinationCityId: "porto|portugal",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  }), {
    id: "port:porto|portugal",
    destinationCityId: "porto|portugal",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  });
  addPortNavigationWaypoint(state, {
    destinationCityId: "london|united kingdom",
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP",
    tradeGoodId: "cloves"
  });
  assert.equal(clearPortNavigationWaypointsAt(state, "lisbon|portugal"), false);
  assert.equal(removeOptionalNavigationWaypoint(
    state,
    "port:london|united kingdom:trade-price:cloves"
  ), true);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, [{
    id: "port:porto|portugal",
    destinationCityId: "porto|portugal",
    destinationTileId: 42,
    destinationName: "Porto",
    reason: "NEW SHIP FOR SALE"
  }]);
  assert.equal(clearPortNavigationWaypointsAt(state, "porto|portugal"), true);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, []);
});

test("trade price waypoints remain distinct and name their goods", () => {
  const state = createGameState({ cargoCapacity: 10 });
  addPortNavigationWaypoint(state, {
    destinationCityId: "london|united kingdom",
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP",
    tradeGoodId: "cloves"
  });
  addPortNavigationWaypoint(state, {
    destinationCityId: "london|united kingdom",
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP",
    tradeGoodId: "tea"
  });

  assert.deepEqual(state.memory.navigation.optionalWaypoints.map((waypoint) => waypoint.id), [
    "port:london|united kingdom:trade-price:cloves",
    "port:london|united kingdom:trade-price:tea"
  ]);
  assert.throws(() => addPortNavigationWaypoint(state, {
    destinationCityId: "london|united kingdom",
    destinationTileId: 81,
    destinationName: "London",
    reason: "TRADE PRICE TIP"
  }), /require a trade good id/);
});

test("shipyard supply waypoints stay distinct and name their construction material", () => {
  const state = createGameState({ cargoCapacity: 10 });
  const waypoint = addPortNavigationWaypoint(state, {
    destinationCityId: "exeter|united kingdom",
    destinationTileId: 81,
    destinationName: "Exeter",
    reason: PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY,
    shipyardMaterialGoodId: "timber"
  });

  assert.equal(waypoint.id, "port:exeter|united kingdom:shipyard-supply:timber");
  assert.equal(
    portNavigationReasonLabel(waypoint.reason, waypoint.shipyardMaterialGoodId),
    "Shipyard supply: Timber"
  );
  assert.throws(() => addPortNavigationWaypoint(state, {
    destinationCityId: "exeter|united kingdom",
    destinationTileId: 81,
    destinationName: "Exeter",
    reason: PORT_NAVIGATION_REASON_SHIPYARD_SUPPLY
  }), /require a trade good id/);
});

test("saved optional waypoints follow a port moved onto its real island", () => {
  const state = createGameState({ cargoCapacity: 20 });
  addPortNavigationWaypoint(state, {
    destinationCityId: "tarawa village|kiribati",
    destinationTileId: 21837,
    destinationName: "Tarawa Village",
    reason: "NEW SHIP FOR SALE"
  });

  const updates = reconcileQuestPortTiles(state, [{
    tileId: 270430,
    cityId: "tarawa village|kiribati",
    city: "Tarawa Village",
    displayCity: "Tarawa Village",
    country: "Kiribati"
  }], { legacyPortTileIds: SUBDIVISION_SEVEN_TO_EIGHT_PORT_TILE_IDS });

  assert.equal(updates, 1);
  assert.deepEqual(state.memory.navigation.optionalWaypoints, [{
    id: "port:tarawa village|kiribati",
    destinationCityId: "tarawa village|kiribati",
    destinationTileId: 270430,
    destinationName: "Tarawa Village",
    reason: "NEW SHIP FOR SALE"
  }]);
});

test("version 18 voyages gain an empty optional waypoint list during migration", () => {
  const saved = createGameState({ cargoCapacity: 10 });
  saved.version = 18;
  delete saved.memory.navigation.optionalWaypoints;

  const restored = migrateGameState(saved, null, {
    legacyCityIdForPortReference: ({ tileId }) => {
      assert.equal(tileId, 42);
      return "porto|portugal";
    }
  });

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

  const restored = migrateGameState(saved, null, {
    legacyCityIdForPortReference: ({ tileId }) => {
      assert.equal(tileId, 42);
      return "porto|portugal";
    }
  });

  assert.deepEqual(restored.memory.navigation.optionalWaypoints, [{
    id: "port:porto|portugal",
    destinationCityId: "porto|portugal",
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
