import assert from "node:assert/strict";
import test from "node:test";

import { FACTIONS, NEUTRAL_FACTION_ID } from "./factions.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  adjustFactionReputation,
  createGameState,
  grantLetterOfMarque,
  recordPiracyAgainstFaction,
  recordTradeWithFaction
} from "./gameState.js";
import {
  createPoliticsView,
  playerStandingForReputation,
  politicalPowers,
  politicsRowsPage
} from "./politics.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

test("politics view covers every non-neutral power including pirates", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const expectedIds = FACTIONS
    .filter((faction) => faction.id !== NEUTRAL_FACTION_ID)
    .map((faction) => faction.id);

  assert.deepEqual(view.powers.map((faction) => faction.id), expectedIds);
  assert.equal(view.rows.length, expectedIds.length);
  assert.ok(view.rows.every((row) => row.stances.length === expectedIds.length));
});

test("politics matrix reports diplomacy and player standing", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  recordTradeWithFaction(state, "england");
  recordPiracyAgainstFaction(state, "france");
  const view = createPoliticsView(state);
  const england = view.rows.find((row) => row.faction.id === "england");
  const france = view.rows.find((row) => row.faction.id === "france");
  const pirate = view.rows.find((row) => row.faction.id === "pirate");

  assert.equal(england.stances.find((stance) => stance.factionId === "france").relation, "war");
  assert.equal(england.player.label, "Warm");
  assert.equal(france.player.label, "Angry");
  assert.equal(pirate.player.label, "Hostile");
});

test("politics view marks factions that granted letters of marque", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const london = {
    tileId: 1,
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england"
  };
  adjustFactionReputation(state, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  grantLetterOfMarque(state, london, LETTER_OF_MARQUE_POWER_REQUIRED);
  const view = createPoliticsView(state);

  assert.equal(view.rows.find((row) => row.faction.id === "england").player.hasLetterOfMarque, true);
  assert.equal(view.rows.find((row) => row.faction.id === "france").player.hasLetterOfMarque, false);
});

test("politics rows wrap across pages", () => {
  const state = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  const view = createPoliticsView(state);
  const first = politicsRowsPage(view, 0, 12);
  const wrapped = politicsRowsPage(view, first.pageCount, 12);

  assert.equal(first.rows.length, 12);
  assert.equal(wrapped.page, 0);
});

test("political power codes are compact for matrix headers", () => {
  assert.ok(politicalPowers().every((faction) => faction.code.length <= 2));
  assert.equal(politicalPowers().find((faction) => faction.id === "pirate").code, "PX");
});

test("player standing labels summarize reputation ranges", () => {
  assert.equal(playerStandingForReputation(0).label, "Neutral");
  assert.equal(playerStandingForReputation(8).label, "Warm");
  assert.equal(playerStandingForReputation(-8).label, "Cold");
  assert.equal(playerStandingForReputation(-100).label, "Hostile");
});
