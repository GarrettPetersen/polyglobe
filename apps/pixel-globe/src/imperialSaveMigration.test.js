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
  assert.equal(state.relations.imperial.emperorFactionId, "burgundian-netherlands");
  assert.equal(Object.keys(state.relations.imperial.electors).length, 7);
  assert.equal(state.relations.factionReputation.augsburg, 0);
  assert.equal(state.relations.factionReputation.metz, 0);
  assert.equal(imperialEstateForFaction("augsburg").factionId, "augsburg");
  assert.equal(imperialEstateForFaction("metz").circleIds[0], "upper-rhenish");
  assert.equal(createPoliticsView(state).imperial.authority, 46);
});

test("version 84 voyages gain Metz, Florence, and Kazan without rewriting existing history", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("./test-fixtures/save-schemas/canonical-states-v84.json", import.meta.url),
    "utf8"
  ));
  const saved = structuredClone(fixture.states[0].state);
  saved.relations.imperial.authority = 31;
  saved.relations.imperial.religiousBlocByFactionId.worms = "lutheran";
  saved.relations.diplomacy.overrides["france|worms"] = "hostile";

  const migrated = migrateGameState(saved, shipStatsForSlug(saved.ship.slug));

  validateGameState(migrated);
  assert.equal(migrated.version, GAME_STATE_VERSION);
  assert.equal(migrated.relations.factionReputation.metz, 0);
  assert.equal(migrated.relations.factionReputation.florence, 0);
  assert.equal(migrated.relations.factionReputation.kazan, 0);
  assert.equal(migrated.relations.imperial.authority, 31);
  assert.equal(migrated.relations.imperial.religiousBlocByFactionId.worms, "lutheran");
  assert.equal(migrated.relations.imperial.religiousBlocByFactionId.metz, "catholic");
  assert.equal(migrated.relations.imperial.cityReligions["metz|france"], "roman-catholic");
  assert.equal(migrated.relations.diplomacy.overrides["france|worms"], "hostile");
  assert.equal(migrated.relations.diplomacy.overrides["france|metz"], undefined);
  assert.equal(migrated.relations.diplomacy.overrides["florence|papal-states"], "neutral");
  assert.equal(migrated.relations.diplomacy.overrides["crimea|kazan"], "neutral");
  assert.equal(migrated.relations.diplomacy.overrides["kazan|muscovy"], "neutral");
});

test("version 81 voyages gain the Empire and preserve formerly combined player standing", () => {
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
  assert.equal(migrated.relations.factionReputation["burgundian-netherlands"], 37);
  assert.equal(migrated.relations.factionReputation.augsburg, 0);
  assert.equal(migrated.relations.imperial.emperorFactionId, "burgundian-netherlands");
  assert.equal(migrated.relations.imperial.authority, 46);
  assert.equal(createPoliticsView(migrated).cards.find(
    (card) => card.faction.id === "augsburg"
  ).imperialMembership.badge, "I");
});

test("version 83 voyages split composite standing, warrants, authority, and dynastic policy", () => {
  const fixture = JSON.parse(readFileSync(
    new URL("./test-fixtures/save-schemas/canonical-states-v83.json", import.meta.url),
    "utf8"
  ));
  const saved = structuredClone(fixture.states[0].state);
  saved.relations.factionReputation.habsburg = 41;
  saved.relations.lettersOfMarque.habsburg = { factionId: "habsburg", simMinute: 20 };
  saved.relations.safePassageUntilMinute.habsburg = 500;
  saved.relations.authority.scores.habsburg = 67;

  const migrated = migrateGameState(saved, shipStatsForSlug(saved.ship.slug));

  assert.equal(migrated.relations.factionReputation.habsburg, 41);
  assert.equal(migrated.relations.factionReputation["burgundian-netherlands"], 41);
  assert.deepEqual(migrated.relations.lettersOfMarque["burgundian-netherlands"], {
    factionId: "burgundian-netherlands",
    simMinute: 20
  });
  assert.equal(migrated.relations.safePassageUntilMinute["burgundian-netherlands"], 500);
  assert.equal(migrated.relations.authority.scores["burgundian-netherlands"], 67);
  assert.equal(migrated.relations.imperial.emperorFactionId, "burgundian-netherlands");
  assert.equal(migrated.relations.diplomacy.suzerainties.byVassalId.spain, undefined);
  assert.equal(
    migrated.relations.diplomacy.suzerainties.byVassalId["burgundian-netherlands"]
      .suzerainFactionId,
    "spain"
  );
});
