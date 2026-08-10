import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy } from "./economy.js";
import {
  ENEMY_FACTION_START_REPUTATION,
  FACTION_SAFE_PASSAGE_DAYS,
  FRIENDLY_FIRE_REPUTATION_PENALTY,
  GAME_STATE_VERSION,
  HOME_FACTION_START_REPUTATION,
  HOSTILE_PORT_REPUTATION_THRESHOLD,
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  PORT_DISGUISE_LOCK_DAYS,
  FACTION_SAFE_PASSAGE_REFUSAL_DAYS,
  PIRACY_ALLY_REPUTATION_PENALTY,
  PIRACY_FRIENDLY_REPUTATION_PENALTY,
  PIRACY_HOME_ENEMY_REPUTATION_PENALTY,
  PIRACY_HOME_REPUTATION_PENALTY,
  PIRATE_HIDEOUT_REPUTATION_REQUIRED,
  PIRATE_REPUTATION_GAIN_PER_PIRACY,
  PIRATE_START_REPUTATION,
  SELF_DEFENSE_REPUTATION_PENALTY,
  SHIP_MERCY_REPUTATION_GAIN,
  SHIP_ATTACK_REPUTATION_PENALTY,
  TRADE_PASS_REPUTATION_REQUIRED,
  TRADE_REPUTATION_GAIN,
  adjustFactionReputation,
  attemptPortDisguise,
  buyGood,
  createPortEntryStatusContext,
  createGameState,
  diplomacyBetweenForState,
  factionReputation,
  factionSafePassageStatus,
  factionSafePassageRefusalStatus,
  factionSafePassageToll,
  grantLetterOfMarque,
  hasLetterOfMarqueFrom,
  hasPersonalTradePass,
  hasPrivateeringAuthorityAgainst,
  issuePersonalTradePass,
  letterOfMarqueStatus,
  migrateGameState,
  sovereignTradeOpenToFaction,
  pirateHideoutsVisibleToPlayer,
  playerPortDisguiseSuccessChance,
  playerPortAttackStatus,
  playerShipIsWarship,
  prepareProactiveLetterOfMarque,
  recordFriendlyFireAgainstFaction,
  reconcileFactionReputationAfterPlayerVassalage,
  playerTradeAccess,
  playerTradeTerms,
  personalTradePassStatus,
  portEntryStatus,
  purchaseFactionSafePassage,
  refuseFactionSafePassage,
  recordAttackAgainstFaction,
  recordPiracyAgainstFaction,
  recordSelfDefenseAgainstFaction,
  recordShipMercyForFaction,
  validateGameState
} from "./gameState.js";
import {
  WORLD_DIPLOMACY_VERSION,
  declareDiplomaticWar,
  establishDiplomaticSuzerainty,
  makeFactionPeaceWithAllEnemies,
  makeDiplomaticPeace
} from "./worldDiplomacy.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  JOSEON_TRADE_POLICY_ID,
  MING_TRADE_POLICY_ID,
  SPANISH_INDIES_TRADE_POLICY_ID
} from "./sovereignTradeAccess.js";
import { HOSPITALLER_MALTA_STAGE_LOCKED } from "./hospitallerMaltaQuest.js";
import { ENGLISH_LONGBOWS_ITEM_ID } from "./portableWeapons.js";

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

test("port attacks distinguish conquest commissions, wartime capture, privateering, and piracy", () => {
  const wartime = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  assert.deepEqual(
    pickAttackStatus(playerPortAttackStatus(wartime, CALAIS)),
    { commissioned: false, ownNationAtWar: true, privateeringAuthority: false, piracy: false,
      mode: "conquest", captureFactionId: "england" }
  );

  const friendly = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const lisbon = port(3, "Lisbon", "Portugal", "mediterranean", 65000, "portugal");
  assert.deepEqual(
    pickAttackStatus(playerPortAttackStatus(friendly, lisbon)),
    { commissioned: false, ownNationAtWar: false, privateeringAuthority: false, piracy: true,
      mode: "raid", captureFactionId: null }
  );

  const commissioned = createGameState({
    cargoCapacity: 10,
    playerCharacter: { ...PLAYER, nationalityId: "ming" }
  });
  const rhodes = port(4, "Rhodes", "Rhodes", "mediterranean", 18000, "hospitallers");
  commissioned.memory.quests.active = {
    id: "capture-rhodes",
    kind: "capture-port",
    stage: "capture",
    targetTileId: rhodes.tileId,
    originFactionId: "ottoman"
  };
  assert.deepEqual(
    pickAttackStatus(playerPortAttackStatus(commissioned, rhodes)),
    { commissioned: true, ownNationAtWar: false, privateeringAuthority: false, piracy: false,
      mode: "conquest", captureFactionId: "ottoman" }
  );

  const privateer = createGameState({
    cargoCapacity: 10,
    playerCharacter: { ...PLAYER, nationalityId: "ming" }
  });
  privateer.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  assert.deepEqual(
    pickAttackStatus(playerPortAttackStatus(privateer, rhodes)),
    { commissioned: false, ownNationAtWar: false, privateeringAuthority: true, piracy: false,
      mode: "raid", captureFactionId: null }
  );

  assert.deepEqual(
    pickAttackStatus(playerPortAttackStatus(wartime, LONDON)),
    { commissioned: false, ownNationAtWar: false, privateeringAuthority: false, piracy: true,
      mode: "raid", captureFactionId: null }
  );
});

test("new voyages combine national standing, ruler faith, piety, and a seeded personal impression", () => {
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: { ...PLAYER, religionId: "roman-catholic" },
    voyageSeed: "religious-reputation"
  });
  const repeated = createGameState({
    cargoCapacity: 10,
    playerCharacter: { ...PLAYER, religionId: "roman-catholic" },
    voyageSeed: "religious-reputation"
  });
  assert.deepEqual(state.relations.factionReputation, repeated.relations.factionReputation);
  assert.equal(factionReputation(state, "england"), HOME_FACTION_START_REPUTATION);
  assert.ok(factionReputation(state, "spain") > factionReputation(state, "japan"));
  assert.ok(factionReputation(state, "ottoman") < factionReputation(state, "japan"));
});

test("version 45 voyages gain papal politics without recalculating established reputations", () => {
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: 10,
    playerCharacter: { ...PLAYER, religionId: "roman-catholic" },
    voyageSeed: "papal-migration"
  })));
  saved.version = 45;
  saved.relations.factionReputation.france = 37;
  delete saved.relations.papacy;
  const restored = migrateGameState(saved, null);
  assert.equal(restored.relations.factionReputation.france, 37);
  assert.equal(restored.relations.papacy.version, 3);
});

test("port entry evaluation context can be reused across an armed-port combat tick", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const simMinute = 100;
  const context = createPortEntryStatusContext(state, simMinute);

  assert.deepEqual(
    portEntryStatus(state, CALAIS, simMinute, context),
    portEntryStatus(state, CALAIS, simMinute)
  );
  assert.throws(
    () => portEntryStatus(state, CALAIS, simMinute + 1, context),
    /does not match/
  );
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
  delete saved.inventory.items[ENGLISH_LONGBOWS_ITEM_ID];

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(sovereignTradeOpenToFaction(restored, MING_TRADE_POLICY_ID, "joseon"), true);
  assert.equal(sovereignTradeOpenToFaction(restored, MING_TRADE_POLICY_ID, "england"), false);
  assert.ok(restored.relations.diplomacy);
  assert.deepEqual(restored.relations.safePassageUntilMinute, {});
  assert.equal(restored.ship.mass, stats.mass);
  assert.equal(restored.ship.navalWeaponKind, stats.navalWeaponKind);
  assert.equal(restored.inventory.items[ENGLISH_LONGBOWS_ITEM_ID], 1);
  assert.equal(diplomacyBetweenForState(restored, "england", "france"), "war");
});

test("version 42 game states gain persistent foreign-settlement expulsion memory", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 42;
  delete saved.relations.foreignSettlementExpulsions;

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.relations.foreignSettlementExpulsions, {
    version: 1,
    revision: 0,
    byId: {}
  });
});

test("version 48 game states gain neutral Swedish reputation without changing existing standings", () => {
  const stats = shipStatsForSlug("fishing-lugger");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 48;
  delete saved.relations.factionReputation.sweden;
  saved.relations.factionReputation.england = 37;
  saved.relations.factionReputation["denmark-norway"] = -12;

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.relations.factionReputation.sweden, 0);
  assert.equal(restored.relations.factionReputation.england, 37);
  assert.equal(restored.relations.factionReputation["denmark-norway"], -12);
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
  const { contacts, overrides, ...withoutContacts } = restored.relations.diplomacy;
  assert.deepEqual(overrides, {
    "ainu|japan": "neutral",
    "ainu|kakizaki": "neutral",
    "ando|japan": "neutral",
    "ando|kakizaki": "neutral",
    "hejaz|ottoman": "neutral",
    "hosokawa|japan": "neutral",
    "hosokawa|ouchi": "neutral",
    "japan|kakizaki": "neutral",
    "japan|nagao": "neutral",
    "japan|ouchi": "neutral",
    "japan|ryukyu": "neutral",
    "japan|shimazu": "neutral",
    "japan|shoni": "neutral",
    "japan|so": "neutral",
    "joseon|so": "neutral",
    "ming|ryukyu": "neutral",
    "ottoman|ragusa": "neutral",
    "ottoman|wallachia": "neutral",
    "ouchi|shoni": "neutral"
  });
  const { overrides: _legacyOverrides, ...beforeWithoutOverrides } = before;
  assert.deepEqual({ ...withoutContacts, version: 1 }, beforeWithoutOverrides);
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

test("version 10 game states gain the historically licensed trade defaults", () => {
  const stats = shipStatsForSlug("brigantine");
  const saved = JSON.parse(JSON.stringify(createGameState({
    cargoCapacity: stats.cargoCapacity,
    startMinute: 500,
    playerCharacter: PLAYER,
    shipStats: stats
  })));
  saved.version = 10;
  delete saved.relations.tradeAccessGrants;
  delete saved.relations.mingOpenTradeFactionIds;

  const restored = migrateGameState(saved, stats);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.relations.tradeAccessGrants[MING_TRADE_POLICY_ID], ["joseon", "ryukyu"]);
  assert.deepEqual(restored.relations.tradeAccessGrants[JOSEON_TRADE_POLICY_ID], ["japan", "ming"]);
  assert.deepEqual(restored.relations.tradeAccessGrants[SPANISH_INDIES_TRADE_POLICY_ID], []);
});

test("version 43 voyages gain empty personal trade papers without losing their save", () => {
  const saved = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  saved.version = 43;
  delete saved.relations.personalTradePasses;

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.relations.personalTradePasses, {});
});

test("version 11 voyages gain empty persistent port conquest state", () => {
  const legacy = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  legacy.version = 11;
  delete legacy.memory.conquest;
  const restored = migrateGameState(legacy, null);
  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.deepEqual(restored.memory.conquest, {
    portFactionOverrides: {},
    factionCapitalOverrides: {},
    collapsedFactionIds: [],
    treaties: [],
    events: []
  });
});

test("version 54 Hospitaller voyages gain the Malta quest without changing nationality", () => {
  const saved = createGameState({
    cargoCapacity: 20,
    playerCharacter: { ...PLAYER, nationalityId: "hospitallers" }
  });
  saved.version = 54;
  delete saved.memory.quests.hospitallerMalta;

  const restored = migrateGameState(saved, null);

  assert.equal(restored.playerCharacter.nationalityId, "hospitallers");
  assert.equal(restored.memory.quests.hospitallerMalta.stage, HOSPITALLER_MALTA_STAGE_LOCKED);
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

test("older voyages gain neutral standing with newly added sovereigns", () => {
  const saved = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  saved.version = 40;
  delete saved.relations.factionReputation.ternate;
  delete saved.relations.factionReputation.tidore;
  delete saved.relations.factionReputation.hospitallers;
  saved.relations.safePassageRefusalUntilMinute.portugal = 12345;
  delete saved.relations.tradeAccessGrants;
  saved.relations.mingOpenTradeFactionIds = ["joseon", "england"];

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.relations.factionReputation.ternate, 0);
  assert.equal(restored.relations.factionReputation.tidore, 0);
  assert.equal(restored.relations.factionReputation.hospitallers, 0);
  assert.equal(restored.relations.safePassageRefusalUntilMinute.portugal, 12345);
  assert.deepEqual(
    restored.relations.tradeAccessGrants[MING_TRADE_POLICY_ID],
    ["england", "joseon", "ryukyu"]
  );
  validateGameState(restored);
});

test("older voyages preserve conquest while introducing compatible politics", () => {
  const saved = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  saved.version = 61;
  saved.relations.diplomacy.version = 5;
  saved.relations.diplomacy.overrides["england|france"] = "friendly";
  saved.memory.conquest.collapsedFactionIds.push("ottoman");
  saved.memory.conquest.portFactionOverrides["saved-conquest-port"] = "portugal";

  const restored = migrateGameState(saved, null);

  assert.equal(restored.relations.diplomacy.overrides["england|france"], "friendly");
  assert.equal(restored.relations.diplomacy.overrides["ottoman|wallachia"], "neutral");
  assert.equal(restored.memory.conquest.portFactionOverrides["saved-conquest-port"], "portugal");
  assert.equal(restored.memory.conquest.collapsedFactionIds.includes("ottoman"), true);
  assert.equal(restored.relations.diplomacy.suzerainties.byVassalId.wallachia, undefined);
  assert.equal(restored.relations.diplomacy.suzerainties.byVassalId.crimea, undefined);
  assert.equal(restored.relations.diplomacy.suzerainties.byVassalId.ryukyu.suzerainFactionId, "ming");
  for (const factionId of ["wallachia", "moldavia", "ragusa", "hejaz", "ryukyu", "ainu"]) {
    assert.equal(restored.relations.factionReputation[factionId], 0);
  }
  validateGameState(restored);
});

test("version 47 voyages from before Rhodes recover without losing their save", () => {
  const saved = createGameState({ cargoCapacity: 20, playerCharacter: PLAYER });
  saved.version = 47;
  delete saved.relations.factionReputation.hospitallers;
  saved.doubloons = 43210;
  saved.memory.navigation.cumulativeLongitudeDeg = 187.5;

  const restored = migrateGameState(saved, null);

  assert.equal(restored.version, GAME_STATE_VERSION);
  assert.equal(restored.relations.factionReputation.hospitallers, 0);
  assert.equal(restored.doubloons, 43210);
  assert.equal(restored.memory.navigation.cumulativeLongitudeDeg, 187.5);
  assert.equal(restored.memory.navigation.minimumCumulativeLongitudeDeg, 0);
  assert.equal(restored.memory.navigation.maximumCumulativeLongitudeDeg, 187.5);
  validateGameState(restored);
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

  assert.equal(
    factionReputation(state, "france"),
    Math.min(frenchBefore + SHIP_ATTACK_REPUTATION_PENALTY, HOSTILE_PORT_REPUTATION_THRESHOLD)
  );
  assert.equal(factionReputation(state, "england"), englishBefore);
  assert.equal(factionReputation(state, "pirate"), pirateBefore);
});

test("a first deliberate attack makes a neutral victim treat the captain as an outlaw", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  assert.equal(diplomacyBetweenForState(state, "england", "ming"), "neutral");

  recordAttackAgainstFaction(state, "ming");

  assert.equal(factionReputation(state, "ming"), HOSTILE_PORT_REPUTATION_THRESHOLD);
  assert.equal(portEntryStatus(state, {
    tileId: 88,
    city: "Guangzhou",
    displayCity: "Guangzhou",
    country: "China",
    factionId: "ming"
  }, 0).hostileByStanding, true);
});

test("piracy hurts the victim, its partners, and the captain's crown without global omniscience", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const englishBefore = factionReputation(state, "england");
  const frenchBefore = factionReputation(state, "france");
  const scottishBefore = factionReputation(state, "scotland");
  const genoeseBefore = factionReputation(state, "genoa");
  const spanishBefore = factionReputation(state, "spain");
  const mingBefore = factionReputation(state, "ming");
  const pirateBefore = factionReputation(state, "pirate");

  recordPiracyAgainstFaction(state, "france");

  assert.equal(
    factionReputation(state, "england"),
    englishBefore + PIRACY_HOME_ENEMY_REPUTATION_PENALTY
  );
  assert.equal(
    factionReputation(state, "france"),
    Math.min(frenchBefore + SHIP_ATTACK_REPUTATION_PENALTY, HOSTILE_PORT_REPUTATION_THRESHOLD)
  );
  assert.equal(
    factionReputation(state, "scotland"),
    scottishBefore + PIRACY_ALLY_REPUTATION_PENALTY
  );
  assert.equal(
    factionReputation(state, "genoa"),
    genoeseBefore + PIRACY_FRIENDLY_REPUTATION_PENALTY
  );
  assert.equal(factionReputation(state, "spain"), spanishBefore);
  assert.equal(factionReputation(state, "ming"), mingBefore);
  assert.equal(factionReputation(state, "pirate"), pirateBefore + PIRATE_REPUTATION_GAIN_PER_PIRACY);

  const pirateAfterPiracy = factionReputation(state, "pirate");
  recordPiracyAgainstFaction(state, "pirate");
  assert.equal(factionReputation(state, "pirate"), pirateAfterPiracy);
});

test("a captain's own sovereign objects strongly to piracy against an unrelated neutral power", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const englishBefore = factionReputation(state, "england");

  recordPiracyAgainstFaction(state, "ming");

  assert.equal(
    factionReputation(state, "england"),
    englishBefore + PIRACY_HOME_REPUTATION_PENALTY
  );
});

test("piracy against a vassal also alienates its foreign-policy principal", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const portugalBefore = factionReputation(state, "portugal");

  recordPiracyAgainstFaction(state, "hormuz");

  assert.equal(
    factionReputation(state, "portugal"),
    portugalBefore + PIRACY_ALLY_REPUTATION_PENALTY
  );
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

  assert.equal(
    factionReputation(state, "france"),
    Math.min(frenchBefore + SHIP_ATTACK_REPUTATION_PENALTY, HOSTILE_PORT_REPUTATION_THRESHOLD)
  );
  assert.equal(
    factionReputation(state, "england"),
    englishBefore + PIRACY_HOME_ENEMY_REPUTATION_PENALTY
  );
});

test("friendly fire causes a small local penalty without revoking diplomatic papers", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const before = factionReputation(state, "france");
  state.relations.safePassageUntilMinute.france = 2_000;
  state.relations.lettersOfMarque.france = {
    factionId: "france",
    simMinute: 10
  };

  const result = recordFriendlyFireAgainstFaction(state, "france");

  assert.equal(result.delta, FRIENDLY_FIRE_REPUTATION_PENALTY);
  assert.equal(result.after, before + FRIENDLY_FIRE_REPUTATION_PENALTY);
  assert.equal(factionSafePassageStatus(state, "france", 100).active, true);
  assert.equal(hasLetterOfMarqueFrom(state, "france"), true);
  assert.equal(state.memory.decisions["reputation.friendly-fire.france"], 1);
  assert.equal(state.memory.decisions["reputation.attack.france"], undefined);
  assert.equal(state.memory.decisions["reputation.piracy.france"], undefined);
});

test("self-defense causes only a token local penalty without revoking diplomatic papers", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const before = factionReputation(state, "france");
  state.relations.safePassageUntilMinute.france = 2_000;
  state.relations.lettersOfMarque.france = {
    factionId: "france",
    simMinute: 10
  };

  const result = recordSelfDefenseAgainstFaction(state, "france");

  assert.equal(result.delta, SELF_DEFENSE_REPUTATION_PENALTY);
  assert.equal(result.after, before + SELF_DEFENSE_REPUTATION_PENALTY);
  assert.equal(factionSafePassageStatus(state, "france", 100).active, true);
  assert.equal(hasLetterOfMarqueFrom(state, "france"), true);
  assert.equal(state.memory.decisions["reputation.self-defense.france"], 1);
  assert.equal(state.memory.decisions["reputation.attack.france"], undefined);
  assert.equal(state.memory.decisions["reputation.piracy.france"], undefined);
});

test("releasing a surrendered ship earns mercy standing even with pirates", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const frenchBefore = factionReputation(state, "france");
  const pirateBefore = factionReputation(state, "pirate");

  const french = recordShipMercyForFaction(state, "france");
  const pirate = recordShipMercyForFaction(state, "pirate");

  assert.equal(french.delta, SHIP_MERCY_REPUTATION_GAIN);
  assert.equal(french.after, frenchBefore + SHIP_MERCY_REPUTATION_GAIN);
  assert.equal(pirate.delta, SHIP_MERCY_REPUTATION_GAIN);
  assert.equal(pirate.after, pirateBefore + SHIP_MERCY_REPUTATION_GAIN);
  assert.equal(state.memory.decisions["reputation.ship-mercy.france"], 1);
  assert.equal(state.memory.decisions["reputation.ship-mercy.pirate"], 1);

  let furtherReleases = 0;
  while (!pirateHideoutsVisibleToPlayer(state) && furtherReleases < 100) {
    recordShipMercyForFaction(state, "pirate");
    furtherReleases += 1;
  }
  assert.ok(furtherReleases > 0);
  assert.ok(furtherReleases < 100);
  assert.equal(pirateHideoutsVisibleToPlayer(state), true);
});

test("letters of marque require capital standing and ship strength", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const longship = shipStatsForSlug("viking-longship");
  assert.equal(LETTER_OF_MARQUE_POWER_REQUIRED, longship.hitPoints + longship.cannons);
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

test("a qualified captain receives one proactive marque offer only while the issuer is at war", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  adjustFactionReputation(state, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);

  const offer = prepareProactiveLetterOfMarque(
    state,
    LONDON_CAPITAL,
    LETTER_OF_MARQUE_POWER_REQUIRED
  );
  assert.equal(offer.factionId, "england");
  assert.equal(offer.primaryEnemyFactionId, "france");
  assert.deepEqual(offer.enemyFactionIds, ["france"]);
  assert.equal(
    prepareProactiveLetterOfMarque(state, LONDON_CAPITAL, LETTER_OF_MARQUE_POWER_REQUIRED),
    null
  );

  const ottoman = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  adjustFactionReputation(
    ottoman,
    "ottoman",
    LETTER_OF_MARQUE_REPUTATION_REQUIRED - factionReputation(ottoman, "ottoman")
  );
  const ottomanOffer = prepareProactiveLetterOfMarque(ottoman, {
    ...port(3, "Istanbul", "Turkey", "mediterranean", 400000, "ottoman"),
    isFactionCapital: true,
    capitalOfFactionId: "ottoman"
  }, LETTER_OF_MARQUE_POWER_REQUIRED);
  assert.ok(ottomanOffer.enemyFactionIds.length > 1);
  for (const enemyFactionId of ["portugal", "hungary", "hospitallers", "safavid"]) {
    assert.ok(ottomanOffer.enemyFactionIds.includes(enemyFactionId));
  }

  const newConflict = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  adjustFactionReputation(newConflict, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  declareDiplomaticWar(
    newConflict.relations.diplomacy,
    "england",
    "morocco",
    200 * 24 * 60
  );
  const newConflictOffer = prepareProactiveLetterOfMarque(
    newConflict,
    LONDON_CAPITAL,
    LETTER_OF_MARQUE_POWER_REQUIRED
  );
  assert.equal(newConflictOffer.primaryEnemyFactionId, "morocco");
  assert.ok(newConflictOffer.enemyFactionIds.includes("france"));
  assert.ok(newConflictOffer.enemyFactionIds.includes("morocco"));

  const peaceful = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  adjustFactionReputation(peaceful, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  makeFactionPeaceWithAllEnemies(
    peaceful.relations.diplomacy,
    "england",
    200 * 24 * 60
  );
  assert.equal(
    prepareProactiveLetterOfMarque(
      peaceful,
      LONDON_CAPITAL,
      LETTER_OF_MARQUE_POWER_REQUIRED
    ),
    null
  );
});

test("attacking the power that issued a letter of marque revokes it", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  adjustFactionReputation(state, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  grantLetterOfMarque(state, LONDON_CAPITAL, LETTER_OF_MARQUE_POWER_REQUIRED);

  recordAttackAgainstFaction(state, "england");

  assert.equal(hasLetterOfMarqueFrom(state, "england"), false);
  assert.equal(state.memory.decisions["letter-of-marque.revoked.england"], 1);
});

test("trusted captains can obtain a personal Indies licencia without opening national trade", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  const seville = {
    ...port(3, "Seville", "Spain", "mediterranean", 70000, "spain"),
    isFactionCapital: true,
    capitalOfFactionId: "spain"
  };
  const havana = {
    ...port(4, "Havana", "Cuba", "mesoamerican", 35000, "spain"),
    lat: 23.11,
    lon: -82.37
  };
  let status = personalTradePassStatus(
    state,
    seville,
    SPANISH_INDIES_TRADE_POLICY_ID,
    120
  );
  assert.equal(status.available, true);
  assert.equal(status.eligible, false);
  assert.ok(status.missing.some((item) => item.startsWith("standing")));

  adjustFactionReputation(state, "spain", TRADE_PASS_REPUTATION_REQUIRED);
  status = issuePersonalTradePass(
    state,
    seville,
    SPANISH_INDIES_TRADE_POLICY_ID,
    { simMinute: 120 }
  );

  assert.equal(status.grantedNow, true);
  assert.equal(hasPersonalTradePass(state, SPANISH_INDIES_TRADE_POLICY_ID), true);
  assert.equal(
    sovereignTradeOpenToFaction(state, SPANISH_INDIES_TRADE_POLICY_ID, "england"),
    false
  );
  const access = playerTradeAccess(state, havana, { simMinute: 120 });
  assert.equal(access.allowed, true);
  assert.equal(access.personalTradePass, true);
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

test("a vassal begrudgingly admits captains protected by its suzerain", () => {
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: { ...PLAYER, nationalityId: "tidore" }
  });
  const rhodes = port(23, "Rhodes", "Rhodes", "mediterranean", 18000, "hospitallers");
  establishDiplomaticSuzerainty(state.relations.diplomacy, {
    vassalFactionId: "hospitallers",
    suzerainFactionId: "ottoman",
    simMinute: 100,
    source: "capital-peace-treaty"
  });
  state.relations.factionReputation.hospitallers = -100;
  state.relations.factionReputation.ottoman = 25;

  const status = portEntryStatus(state, rhodes, 101);

  assert.equal(status.allowed, true);
  assert.equal(status.hostileLocalStanding, true);
  assert.equal(status.hostileByStanding, false);
  assert.equal(status.suzerainFactionId, "ottoman");
  assert.equal(status.suzerainProtectsEntry, true);
});

test("a captain who forces vassalage is no longer personally barred by the defeated state", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  state.relations.factionReputation.hospitallers = -100;

  assert.equal(reconcileFactionReputationAfterPlayerVassalage(state, "hospitallers"), 0);
  assert.equal(state.relations.factionReputation.hospitallers, 0);
  assert.equal(reconcileFactionReputationAfterPlayerVassalage(state, "england"), HOME_FACTION_START_REPUTATION);
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

test("a master of disguise improves hostile-port entry without guaranteeing it", () => {
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: {
      ...PLAYER,
      skillIds: ["master-of-disguise"]
    }
  });
  assert.equal(playerPortDisguiseSuccessChance(state), 0.75);
  const succeeded = attemptPortDisguise(state, CALAIS, 500, 0.7);
  assert.equal(succeeded.success, true);
  assert.equal(succeeded.successChance, 0.75);
});

test("a master negotiator receives the skill-adjusted prices used by markets", () => {
  const ordinaryState = createGameState({
    cargoCapacity: 10,
    playerCharacter: {
      ...PLAYER,
      skillIds: ["able-seaman"]
    }
  });
  const state = createGameState({
    cargoCapacity: 10,
    playerCharacter: {
      ...PLAYER,
      skillIds: ["master-negotiator"]
    }
  });
  const ordinaryTerms = playerTradeTerms(ordinaryState, CALAIS, "wine");
  const terms = playerTradeTerms(state, CALAIS, "wine");
  assert.equal(terms.purchaseBargainMultiplier, 0.97);
  assert.equal(terms.saleBargainMultiplier, 1.03);
  assert.ok(Math.abs(terms.purchaseMultiplier / ordinaryTerms.purchaseMultiplier - 0.97) < 1e-12);
  assert.ok(Math.abs(terms.saleMultiplier / ordinaryTerms.saleMultiplier - 1.03) < 1e-12);
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

test("attacking a faction immediately revokes its purchased safe passage", () => {
  const habsburgPlayer = { ...PLAYER, nationalityId: "habsburg" };
  const fishingBarque = shipStatsForSlug("fishing-lugger");
  const state = createGameState({
    cargoCapacity: fishingBarque.cargoCapacity,
    playerCharacter: habsburgPlayer,
    shipStats: fishingBarque
  });
  const istanbul = port(8, "Istanbul", "Turkey", "mediterranean", 180000, "ottoman");
  purchaseFactionSafePassage(state, istanbul, 100);
  assert.equal(factionSafePassageStatus(state, "ottoman", 101).active, true);

  recordAttackAgainstFaction(state, "ottoman");

  assert.equal(factionSafePassageStatus(state, "ottoman", 101).active, false);
  assert.equal(portEntryStatus(state, istanbul, 101).hostile, true);
  assert.equal(state.memory.decisions["safe-passage.revoked.attack.ottoman"], 1);
});

test("paid safe passage remains valid if personal standing later becomes hostile", () => {
  const habsburgPlayer = { ...PLAYER, nationalityId: "habsburg" };
  const fishingBarque = shipStatsForSlug("fishing-lugger");
  const state = createGameState({
    cargoCapacity: fishingBarque.cargoCapacity,
    playerCharacter: habsburgPlayer,
    shipStats: fishingBarque
  });
  const istanbul = port(8, "Istanbul", "Turkey", "mediterranean", 180000, "ottoman");
  const passage = purchaseFactionSafePassage(state, istanbul, 100);
  state.relations.factionReputation.ottoman = HOSTILE_PORT_REPUTATION_THRESHOLD;
  const duringPassage = portEntryStatus(state, istanbul, 101);
  assert.equal(duringPassage.safePassage, true);
  assert.equal(duringPassage.hostileByStanding, true);
  assert.equal(duringPassage.canPurchaseSafePassage, false);
  assert.equal(duringPassage.hostile, false);
  assert.equal(duringPassage.allowed, true);

  const afterPassage = portEntryStatus(state, istanbul, passage.untilMinute);
  assert.equal(afterPassage.safePassage, false);
  assert.equal(afterPassage.hostile, true);
  assert.equal(afterPassage.allowed, false);
});

test("a faction refuses to sell safe passage to a captain it personally hates", () => {
  const habsburgPlayer = { ...PLAYER, nationalityId: "habsburg" };
  const fishingBarque = shipStatsForSlug("fishing-lugger");
  const state = createGameState({
    cargoCapacity: fishingBarque.cargoCapacity,
    playerCharacter: habsburgPlayer,
    shipStats: fishingBarque
  });
  const istanbul = port(8, "Istanbul", "Turkey", "mediterranean", 180000, "ottoman");
  state.relations.factionReputation.ottoman = HOSTILE_PORT_REPUTATION_THRESHOLD;

  const status = portEntryStatus(state, istanbul, 100);
  assert.equal(status.hostileByStanding, true);
  assert.equal(status.canPurchaseSafePassage, false);
  assert.throws(
    () => purchaseFactionSafePassage(state, istanbul, 100),
    /refuses to sell safe passage to a hated captain/
  );
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

function pickAttackStatus(status) {
  return {
    commissioned: status.commissioned,
    ownNationAtWar: status.ownNationAtWar,
    privateeringAuthority: status.privateeringAuthority,
    piracy: status.piracy,
    mode: status.mode,
    captureFactionId: status.captureFactionId
  };
}
