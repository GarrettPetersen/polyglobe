import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  ENEMY_FACTION_START_REPUTATION,
  HOME_FACTION_START_REPUTATION,
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  PIRACY_REPUTATION_PENALTY,
  PIRATE_START_REPUTATION,
  SHIP_ATTACK_REPUTATION_PENALTY,
  TRADE_REPUTATION_GAIN,
  adjustFactionReputation,
  buyGood,
  createGameState,
  factionReputation,
  grantLetterOfMarque,
  hasLetterOfMarqueFrom,
  hasPrivateeringAuthorityAgainst,
  letterOfMarqueStatus,
  recordAttackAgainstFaction,
  recordPiracyAgainstFaction
} from "./gameState.js";

const PLAYER = {
  name: "Joan Alden",
  nationalityId: "england",
  expressions: ["neutral", "happy"]
};

const LONDON = port(1, "London", "United Kingdom", "northern-european", 80000, "england");
const LONDON_CAPITAL = {
  ...LONDON,
  isFactionCapital: true,
  capitalOfFactionId: "england"
};

test("player reputation starts from nationality, wars, and pirates", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });

  assert.equal(factionReputation(state, "england"), HOME_FACTION_START_REPUTATION);
  assert.equal(factionReputation(state, "france"), ENEMY_FACTION_START_REPUTATION);
  assert.equal(factionReputation(state, "spain"), 0);
  assert.equal(factionReputation(state, "pirate"), PIRATE_START_REPUTATION);
});

test("successful trade gives only a tiny faction reputation gain", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const before = factionReputation(state, "england");

  buyGood(state, economy, LONDON, "wool", 1, { simMinute: 100 });

  assert.equal(factionReputation(state, "england"), before + TRADE_REPUTATION_GAIN);
});

test("failed trade does not change faction reputation", () => {
  const economy = createWorldEconomy({ ports: [LONDON], startMinute: 0 });
  const state = createGameState({ cargoCapacity: 1, playerCharacter: PLAYER });
  const before = factionReputation(state, "england");

  assert.throws(
    () => buyGood(state, economy, LONDON, "wool", 99, { simMinute: 100 }),
    /Not enough/
  );

  assert.equal(factionReputation(state, "england"), before);
});

test("attacking a nation's ships makes that faction hate the player", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const frenchBefore = factionReputation(state, "france");
  const englishBefore = factionReputation(state, "england");
  const pirateBefore = factionReputation(state, "pirate");

  recordAttackAgainstFaction(state, "france");

  assert.equal(factionReputation(state, "france"), frenchBefore + SHIP_ATTACK_REPUTATION_PENALTY);
  assert.equal(factionReputation(state, "england"), englishBefore);
  assert.equal(factionReputation(state, "pirate"), pirateBefore);
});

test("piracy badly hurts the victim faction and lightly hurts other powers", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const englishBefore = factionReputation(state, "england");
  const frenchBefore = factionReputation(state, "france");
  const spanishBefore = factionReputation(state, "spain");
  const pirateBefore = factionReputation(state, "pirate");

  recordPiracyAgainstFaction(state, "france");

  assert.equal(factionReputation(state, "england"), englishBefore + PIRACY_REPUTATION_PENALTY);
  assert.equal(factionReputation(state, "france"), frenchBefore + SHIP_ATTACK_REPUTATION_PENALTY);
  assert.equal(factionReputation(state, "spain"), spanishBefore + PIRACY_REPUTATION_PENALTY);
  assert.equal(factionReputation(state, "pirate"), pirateBefore);

  recordPiracyAgainstFaction(state, "pirate");
  assert.equal(factionReputation(state, "pirate"), pirateBefore);
});

test("piracy notoriety can be recorded without double-counting the attacked victim", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const englishBefore = factionReputation(state, "england");
  const frenchBefore = factionReputation(state, "france");

  recordAttackAgainstFaction(state, "france");
  recordPiracyAgainstFaction(state, "france", { includeVictim: false });

  assert.equal(factionReputation(state, "france"), frenchBefore + SHIP_ATTACK_REPUTATION_PENALTY);
  assert.equal(factionReputation(state, "england"), englishBefore + PIRACY_REPUTATION_PENALTY);
});

test("letters of marque require capital standing and ship strength", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  let status = letterOfMarqueStatus(state, LONDON_CAPITAL, LETTER_OF_MARQUE_POWER_REQUIRED);
  assert.equal(status.available, true);
  assert.equal(status.eligible, false);
  assert.ok(status.missing.some((item) => item.startsWith("standing")));

  adjustFactionReputation(state, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  status = letterOfMarqueStatus(state, LONDON_CAPITAL, LETTER_OF_MARQUE_POWER_REQUIRED - 1);
  assert.equal(status.eligible, false);
  assert.ok(status.missing.some((item) => item.startsWith("ship strength")));

  status = grantLetterOfMarque(state, LONDON_CAPITAL, LETTER_OF_MARQUE_POWER_REQUIRED, { simMinute: 120 });
  assert.equal(status.grantedNow, true);
  assert.equal(hasLetterOfMarqueFrom(state, "england"), true);
});

test("a letter of marque authorizes privateering against the issuer's war enemies", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  adjustFactionReputation(state, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  grantLetterOfMarque(state, LONDON_CAPITAL, LETTER_OF_MARQUE_POWER_REQUIRED);

  assert.equal(hasPrivateeringAuthorityAgainst(state, "france"), true);
  assert.equal(hasPrivateeringAuthorityAgainst(state, "spain"), false);
  assert.equal(hasPrivateeringAuthorityAgainst(state, "pirate"), false);
});

function port(tileId, city, country, cityType, population, factionId) {
  return { tileId, city, displayCity: city, country, cityType, population, factionId, lat: 0, lon: 0 };
}
