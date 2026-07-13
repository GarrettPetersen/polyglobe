import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  ENEMY_FACTION_START_REPUTATION,
  HOME_FACTION_START_REPUTATION,
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  PORT_DISGUISE_LOCK_DAYS,
  PIRATE_HIDEOUT_REPUTATION_REQUIRED,
  PIRATE_REPUTATION_GAIN_PER_PIRACY,
  PIRACY_REPUTATION_PENALTY,
  PIRATE_START_REPUTATION,
  SHIP_ATTACK_REPUTATION_PENALTY,
  TRADE_REPUTATION_GAIN,
  adjustFactionReputation,
  attemptPortDisguise,
  buyGood,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
  grantLetterOfMarque,
  hasLetterOfMarqueFrom,
  hasPrivateeringAuthorityAgainst,
  letterOfMarqueStatus,
  pirateHideoutsVisibleToPlayer,
  portEntryStatus,
  recordAttackAgainstFaction,
  recordPiracyAgainstFaction,
  validateGameState
} from "./gameState.js";
import { makeDiplomaticPeace } from "./worldDiplomacy.js";

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
const CALAIS = port(2, "Calais", "France", "northern-european", 18000, "france");

test("player reputation starts from nationality, wars, and pirates", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });

  assert.equal(factionReputation(state, "england"), HOME_FACTION_START_REPUTATION);
  assert.equal(factionReputation(state, "france"), ENEMY_FACTION_START_REPUTATION);
  assert.equal(factionReputation(state, "spain"), 0);
  assert.equal(factionReputation(state, "pirate"), PIRATE_START_REPUTATION);
});

test("older local game states gain diplomacy without losing the voyage", () => {
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: 10,
    startMinute: 500,
    playerCharacter: PLAYER
  })));
  delete saved.relations.diplomacy;

  const restored = validateGameState(saved);

  assert.ok(restored.relations.diplomacy);
  assert.equal(diplomacyBetweenForState(restored, "england", "france"), "war");
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
  assert.equal(factionReputation(state, "pirate"), pirateBefore + PIRATE_REPUTATION_GAIN_PER_PIRACY);

  const pirateAfterPiracy = factionReputation(state, "pirate");
  recordPiracyAgainstFaction(state, "pirate");
  assert.equal(factionReputation(state, "pirate"), pirateAfterPiracy);
});

test("sustained piracy eventually reveals the pirate hideout network", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  assert.equal(pirateHideoutsVisibleToPlayer(state), false);

  const requiredGain = PIRATE_HIDEOUT_REPUTATION_REQUIRED - PIRATE_START_REPUTATION;
  const actsRequired = Math.ceil(requiredGain / PIRATE_REPUTATION_GAIN_PER_PIRACY);
  for (let index = 0; index < actsRequired; index++) recordPiracyAgainstFaction(state, "france");

  assert.equal(pirateHideoutsVisibleToPlayer(state), true);
  assert.ok(factionReputation(state, "pirate") >= PIRATE_HIDEOUT_REPUTATION_REQUIRED);
  const pirateCove = {
    tileId: 44,
    city: "Dover",
    displayCity: "Dover",
    portAlias: "Black Gull Cove",
    country: "United Kingdom",
    factionId: "pirate",
    isPirateHideout: true
  };
  assert.equal(portEntryStatus(state, pirateCove, 100).allowed, true);
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

  makeDiplomaticPeace(state.relations.diplomacy, "england", "france", 200 * 24 * 60);
  assert.equal(hasPrivateeringAuthorityAgainst(state, "france"), false);
});

test("war and deeply hostile standing bar entry while other ports remain open", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const seville = port(3, "Seville", "Spain", "mediterranean", 70000, "spain");

  const enemyStatus = portEntryStatus(state, CALAIS, 100);
  assert.equal(enemyStatus.allowed, false);
  assert.equal(enemyStatus.hostileByWar, true);
  assert.equal(enemyStatus.canAttemptDisguise, true);
  assert.equal(portEntryStatus(state, seville, 100).allowed, true);

  makeDiplomaticPeace(state.relations.diplomacy, "england", "france", 200 * 24 * 60);
  assert.equal(diplomacyBetweenForState(state, "england", "france"), "neutral");
  assert.equal(portEntryStatus(state, CALAIS, 200 * 24 * 60).allowed, true);

  adjustFactionReputation(state, "england", -83);
  const outlawAtHome = portEntryStatus(state, LONDON, 100);
  assert.equal(outlawAtHome.allowed, false);
  assert.equal(outlawAtHome.hostileByStanding, true);
});

test("failed port disguises impose a fixed fourteen-day lock", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const startMinute = 500;

  const failed = attemptPortDisguise(state, CALAIS, startMinute, 0.99);
  assert.equal(failed.attempted, true);
  assert.equal(failed.success, false);
  assert.equal(failed.lockDaysRemaining, PORT_DISGUISE_LOCK_DAYS);

  const locked = portEntryStatus(state, CALAIS, startMinute + 60);
  assert.equal(locked.locked, true);
  assert.equal(locked.canAttemptDisguise, false);
  assert.equal(attemptPortDisguise(state, CALAIS, startMinute + 60, 0).attempted, false);

  const expiryMinute = startMinute + PORT_DISGUISE_LOCK_DAYS * 24 * 60;
  assert.equal(portEntryStatus(state, CALAIS, expiryMinute).locked, false);
  const succeeded = attemptPortDisguise(state, CALAIS, expiryMinute, 0);
  assert.equal(succeeded.attempted, true);
  assert.equal(succeeded.success, true);
});

function port(tileId, city, country, cityType, population, factionId) {
  return { tileId, city, displayCity: city, country, cityType, population, factionId, lat: 0, lon: 0 };
}
