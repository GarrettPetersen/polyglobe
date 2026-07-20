import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  ENEMY_FACTION_START_REPUTATION,
  FACTION_SAFE_PASSAGE_DAYS,
  GAME_STATE_VERSION,
  HOME_FACTION_START_REPUTATION,
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  PORT_DISGUISE_LOCK_DAYS,
  FACTION_SAFE_PASSAGE_REFUSAL_DAYS,
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
  factionSafePassageStatus,
  factionSafePassageRefusalStatus,
  factionSafePassageToll,
  grantLetterOfMarque,
  hasLetterOfMarqueFrom,
  hasPrivateeringAuthorityAgainst,
  letterOfMarqueStatus,
  migrateGameState,
  mingTradeOpenToFaction,
  pirateHideoutsVisibleToPlayer,
  playerShipIsWarship,
  portEntryStatus,
  purchaseFactionSafePassage,
  refuseFactionSafePassage,
  recordAttackAgainstFaction,
  recordPiracyAgainstFaction,
  validateGameState
} from "./gameState.js";
import { WORLD_DIPLOMACY_VERSION, makeDiplomaticPeace } from "./worldDiplomacy.js";
import { shipStatsForSlug } from "./shipStats.js";

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

test("version 8 game states migrate diplomacy and ship classification without losing the voyage", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 8;
  delete saved.relations.diplomacy;
  delete saved.relations.safePassageUntilMinute;
  delete saved.ship.mass;
  delete saved.ship.navalWeaponKind;

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(mingTradeOpenToFaction(restored, "joseon"), true);
  assert.equal(mingTradeOpenToFaction(restored, "england"), false);
  assert.ok(restored.relations.diplomacy);
  assert.deepEqual(restored.relations.safePassageUntilMinute, {});
  assert.equal(restored.ship.mass, stats.mass);
  assert.equal(restored.ship.navalWeaponKind, stats.navalWeaponKind);
  assert.equal(diplomacyBetweenForState(restored, "england", "france"), "war");
});

test("version 8 game states retain version 1 diplomacy history during migration", () => {
  const stats = shipStatsForSlug("brigantine");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 8;
  saved.relations.diplomacy.version = 1;
  delete saved.relations.diplomacy.contacts;
  delete saved.relations.safePassageUntilMinute;
  delete saved.ship.mass;
  delete saved.ship.navalWeaponKind;
  const before = JSON.parse(JSON.stringify(saved.relations.diplomacy));

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.relations.diplomacy.version, WORLD_DIPLOMACY_VERSION);
  const { contacts, ...withoutContacts } = restored.relations.diplomacy;
  assert.deepEqual({ ...withoutContacts, version: 1 }, before);
});

test("version 9 game states preserve passage and gain diplomatic contacts", () => {
  const stats = shipStatsForSlug("brigantine");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 9;
  saved.relations.safePassageUntilMinute.ottoman = 2000;
  saved.relations.diplomacy.version = 2;
  delete saved.relations.diplomacy.contacts;

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.relations.safePassageUntilMinute.ottoman, 2000);
  assert.deepEqual(restored.relations.diplomacy.contacts, {});
});

test("version 10 game states gain the initial Joseon Ming trade agreement", () => {
  const stats = shipStatsForSlug("brigantine");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 10;
  delete saved.relations.mingOpenTradeFactionIds;

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.relations.mingOpenTradeFactionIds, ["joseon"]);
});

test("version 11 voyages gain empty persistent port conquest state", () => {
  const legacy = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  legacy.version = 11;
  delete legacy.memory.conquest;
  const restored = migrateGameState(legacy, null);
  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.memory.conquest, {
    portFactionOverrides: {},
    collapsedFactionIds: [],
    events: []
  });
});

test("version 12 voyages gain empty persistent safe-passage refusals", () => {
  const legacy = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  legacy.version = 12;
  delete legacy.relations.safePassageRefusalUntilMinute;

  const restored = migrateGameState(legacy, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.relations.safePassageRefusalUntilMinute, {});
});

test("version 21 voyages retire Aztec faction references into Spanish Mexico", () => {
  const saved = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  saved.version = 21;
  saved.relations.factionReputation.aztec = 12;
  saved.relations.safePassageUntilMinute.aztec = 5000;
  saved.relations.lettersOfMarque.aztec = { factionId: "aztec", simMinute: null };
  saved.relations.diplomacy.version = 3;
  saved.relations.diplomacy.contacts["aztec|spain"] = {
    firstContactMinute: 100,
    lastContactMinute: 200,
    portCalls: 2
  };
  saved.memory.conquest.portFactionOverrides["city-99"] = "aztec";
  saved.memory.conquest.collapsedFactionIds.push("aztec");

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.relations.safePassageUntilMinute.spain, 5000);
  assert.equal(restored.memory.conquest.portFactionOverrides["city-99"], "spain");
  assert.deepEqual(restored.memory.conquest.collapsedFactionIds, []);
  assert.equal(JSON.stringify(restored).includes("aztec"), false);
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
  assert.equal(diplomacyBetweenForState(state, "england", "france"), "hostile");
  assert.equal(portEntryStatus(state, CALAIS, 200 * 24 * 60).allowed, false);

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

test("civilian tolls grant one month of empire-wide safe passage", () => {
  const habsburgPlayer = { ...PLAYER, nationalityId: "habsburg" };
  const fishingBarque = shipStatsForSlug("fishing-lugger");
  const state = createGameState({
    cargoCapacity: fishingBarque.cargoCapacity,
    playerCharacter: habsburgPlayer,
    shipStats: fishingBarque
  });
  const istanbul = port(8, "Istanbul", "Turkey", "mediterranean", 180000, "ottoman");
  const alexandria = port(9, "Alexandria", "Egypt", "islamic-desert", 80000, "ottoman");
  const toll = factionSafePassageToll(state);

  assert.equal(playerShipIsWarship(state), false);
  assert.equal(portEntryStatus(state, istanbul, 100).hostileByStance, true);
  const passage = purchaseFactionSafePassage(state, istanbul, 100);
  assert.equal(passage.toll, toll);
  assert.equal(state.doubloons, 360 - toll);
  assert.equal(portEntryStatus(state, istanbul, 101).allowed, true);
  assert.equal(portEntryStatus(state, alexandria, 101).safePassage, true);
  assert.equal(passage.days, FACTION_SAFE_PASSAGE_DAYS);
  assert.equal(factionSafePassageStatus(state, "ottoman", 101).daysRemaining, 30);
  assert.equal(portEntryStatus(state, alexandria, passage.untilMinute).allowed, false);
});

test("refusing a civilian toll suppresses that faction for two days", () => {
  const habsburgPlayer = { ...PLAYER, nationalityId: "habsburg" };
  const fishingBarque = shipStatsForSlug("fishing-lugger");
  const state = createGameState({
    cargoCapacity: fishingBarque.cargoCapacity,
    playerCharacter: habsburgPlayer,
    shipStats: fishingBarque
  });
  const startMinute = 100;

  const refusal = refuseFactionSafePassage(state, "ottoman", startMinute);

  assert.equal(refusal.days, FACTION_SAFE_PASSAGE_REFUSAL_DAYS);
  assert.equal(factionSafePassageRefusalStatus(state, "ottoman", startMinute + 1).active, true);
  assert.equal(factionSafePassageRefusalStatus(state, "ottoman", startMinute + 1).daysRemaining, 2);
  assert.equal(factionSafePassageRefusalStatus(state, "france", startMinute + 1).active, false);
  assert.equal(factionSafePassageRefusalStatus(state, "ottoman", refusal.untilMinute).active, false);
});

test("armed warships cannot buy civilian safe passage", () => {
  const habsburgPlayer = { ...PLAYER, nationalityId: "habsburg" };
  const brigantine = shipStatsForSlug("brigantine");
  const state = createGameState({
    cargoCapacity: brigantine.cargoCapacity,
    playerCharacter: habsburgPlayer,
    shipStats: brigantine
  });
  state.ship.cannons = 8;
  const istanbul = port(8, "Istanbul", "Turkey", "mediterranean", 180000, "ottoman");

  assert.equal(playerShipIsWarship(state), true);
  assert.throws(() => factionSafePassageToll(state), /Warships cannot purchase/);
  assert.throws(() => purchaseFactionSafePassage(state, istanbul, 100), /Warships cannot purchase/);
});

function port(tileId, city, country, cityType, population, factionId) {
  return { tileId, city, displayCity: city, country, cityType, population, factionId, lat: 0, lon: 0 };
}
