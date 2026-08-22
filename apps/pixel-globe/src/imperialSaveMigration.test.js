import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GAME_STATE_VERSION,
  createGameState,
  migrateGameState,
  validateGameState
} from "./gameState.js";
import { imperialEstateForFaction } from "./imperialEstates.js";
import { createPoliticsView } from "./politics.js";
import { shipStatsForSlug } from "./shipStats.js";

test("a new voyage starts with independent Imperial constitutional state", () => {
  const state = createGameState({ cargoCapacity: 20 });
  validateGameState(state);
  assert.equal(state.version, GAME_STATE_VERSION);
  assert.equal(state.relations.imperial.emperorFactionId, "habsburg");
  assert.equal(Object.keys(state.relations.imperial.electors).length, 7);
  assert.equal(state.relations.factionReputation.augsburg, 0);
  assert.equal(imperialEstateForFaction("augsburg").factionId, "augsburg");
  assert.equal(createPoliticsView(state).imperial.authority, 46);
});

test("version 81 voyages gain the Empire without inheriting Habsburg player history", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("./test-fixtures/save-schemas/canonical-states-v81.json", import.meta.url),
    "utf8"
  ));
  const saved = structuredClone(fixture.states[0].state);
  saved.relations.factionReputation.habsburg = 37;
  const migrated = migrateGameState(saved, shipStatsForSlug(saved.ship.slug));
  validateGameState(migrated);
  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.equal(migrated.relations.factionReputation.habsburg, 37);
  assert.equal(migrated.relations.factionReputation.augsburg, 0);
  assert.equal(migrated.relations.imperial.emperorFactionId, "habsburg");
  assert.equal(migrated.relations.imperial.authority, 46);
  assert.equal(createPoliticsView(migrated).cards.find(
    (card) => card.faction.id === "augsburg"
  ).imperialMembership.badge, "I");
});
