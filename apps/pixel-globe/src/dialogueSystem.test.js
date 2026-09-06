import { grantPersonalTradePass } from "./sovereignTradeAccess.js";
import assert from "node:assert/strict";
import test from "node:test";

import {
  QUEST_CARGO_HINT_DECLINE_COOLDOWN_MINUTES,
  bestPurchasedTradeRoute,
  bestQuestCargoSource,
  beginShipHandoverDialogue,
  createPassengerDialogueSession,
  createPortArrivalDialogueSession,
  createPortDialogueSession,
  deliveryMissionShouldOpenOnArrival,
  dialogueBackOptionIndex,
  createShoreBatteryDialogueSession,
  createShipDialogueSession,
  passengerDialogueView,
  personalHostilityDialogue,
  portMarketTransactionSessionOpen,
  portDialogueView,
  prepareDamageSurrenderDialogue,
  prepareSurrenderPrizeDialogue,
  restorePortDialogueCityIdentity,
  returnPortDialogueToCity,
  selectPassengerDialogueOption,
  setPortCustomLoadoutValue,
  selectPortDialogueAction,
  selectPortDialogueOption,
  selectShoreBatteryDialogueOption,
  selectShipDialogueOption,
  shoreBatteryDialogueView,
  shipDialogueView,
  worldPriceIndicator
} from "./dialogueSystem.js";
import {
  FRESH_WATER_GOOD_ID,
  GINGER_GOOD_ID,
  GUNPOWDER_GOOD_ID,
  HARDTACK_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  createWorldEconomy as createCanonicalWorldEconomy,
  fundWorldEconomyShipyard,
  portMarket,
  quotePortPurchase
} from "./economy.js";
import { dialogueOptionIconId } from "./gameIcons.js";
import {
  createCrewRecruitmentOffer,
  crewRecruitmentOfferAt
} from "./crewMembers.js";
import { HAJJ_PILGRIMAGE_PERK_ITEM_ID, perkItemById } from "./perkItems.js";
import {
  CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID,
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  ONBOARDING_DELIVERY_COUNT,
  TRADE_PASS_REPUTATION_REQUIRED,
  acceptQuest,
  addPortNavigationWaypoint,
  adjustFactionReputation,
  attemptPortDisguise,
  cargoFree,
  cargoHoldStatus,
  cargoUsed,
  capturePortMissionOfferForCity,
  deliverQuestCargoRequirement,
  deliveryOfferForCity,
  diplomacyBetweenForState,
  factionReputation,
  hasLetterOfMarqueFrom,
  hasPersonalTradePass,
  playerPortAttackStatus,
  playerTradeTerms,
  portMemory,
  portEntryStatus,
  papalAuthorityForState,
  prepareProactiveLetterOfMarque,
  purchasePerkItem,
  questStateForCity,
  reconcileCharacterForPapalAuthority,
  restockShipLoadoutAtPort,
  resolveCatholicBibleInspection,
  visitPort
} from "./gameState.js";
import { createPlayerTestGameState as createGameState } from "./test-fixtures/createTestGameState.js";
import {
  initializeTestProvisionalShipLoadout as initializeProvisionalShipLoadout,
  setTestCrewCount,
  setTestCrewExperienceStars
} from "./test-fixtures/crewTestFixtures.js";
import {
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";
import { diplomacyPairKey } from "./worldDiplomacy.js";
import { shipStatsForSlug } from "./shipStats.js";
import { createShipComparisonView } from "./shipInfo.js";
import { generateShipyardListing, shipyardAtPort } from "./shipyards.js";
import {
  SHIPYARD_INVESTMENT_MATERIALS,
  beginShipyardInvestment
} from "./shipyardInvestment.js";
import { QUEST_ITINERARY_ORDERED, createQuestItinerary } from "./questItinerary.js";
import { gameMinuteForDate } from "./rulers.js";
import { IMPERIAL_CITY_REFERENCES } from "./imperialEstates.js";
import { MING_TRADE_POLICY_ID } from "./sovereignTradeAccess.js";
import {
  PORTUGUESE_CROWN_SPICE_POLICY_ID,
  WARTIME_TRADE_RESTRICTION_ID
} from "./tradePolicy.js";
import {
  VIKING_LONGSHIP_FETCH_STAGES,
  VIKING_LONGSHIP_PORT_CITY,
  acceptVikingLongshipReward,
  deliverVikingLongshipQuestCargo,
  markVikingLongshipPurchased,
  maybeSpawnVikingLongshipQuest,
  vikingLongshipQuestState
} from "./vikingLongshipQuest.js";
import { colonizationTargetForCity } from "./colonialCities.js";
import {
  expelHostileForeignSettlements,
  withForeignSettlements1522
} from "./foreignSettlements.js";
import {
  advanceColonizationQuest,
  assignColonizationQuest,
  beginColonizationExpedition,
  colonizationQuestView,
  completeColonizationFetchStage,
  establishColony,
  grantColonizationApproval,
  landColonists
} from "./colonizationQuest.js";

function createWorldEconomy(options) {
  const canonicalByTileId = new Map();
  const canonicalize = (port) => {
    if (typeof port?.cityId === "string" && port.cityId !== "") return port;
    if (!Number.isInteger(port?.tileId)) throw new Error("Test economy port needs a tile id");
    let canonical = canonicalByTileId.get(port.tileId);
    if (!canonical) {
      port.cityId = `test-city:${port.tileId}`;
      canonical = port;
      canonicalByTileId.set(port.tileId, canonical);
    }
    return canonical;
  };
  return createCanonicalWorldEconomy({
    ...options,
    ports: options.ports.map(canonicalize),
    ...(options.shipyardPorts ? { shipyardPorts: options.shipyardPorts.map(canonicalize) } : {})
  });
}
import {
  JAPANESE_MATCHLOCK_COMPLETION_REWARD,
  JAPANESE_MATCHLOCK_FETCH_STAGES,
  maybeSpawnJapaneseMatchlockQuest
} from "./japaneseMatchlockQuest.js";
import {
  CARIBBEAN_GINGER_COMPLETION_REWARD,
  CARIBBEAN_GINGER_FETCH_STAGE,
  maybeSpawnCaribbeanGingerQuest
} from "./caribbeanGingerQuest.js";
import {
  CONQUISTADOR_FETCH_STAGES,
  CONQUISTADOR_STAGE_CAMPAIGN,
  CONQUISTADOR_STAGE_CAPTURE,
  CONQUISTADOR_STAGE_COMPLETE,
  CONQUISTADOR_STAGE_REWARD_READY,
  recordConquistadorAssaultFailure
} from "./conquistadorQuest.js";
import {
  CHEF_QUEST_REWARD,
  completeChefBanquet,
  prepareChefBanquet,
  serveChefBanquet,
  maybeSpawnChefQuest,
  recruitChef
} from "./chefQuest.js";
import {
  NAMED_CREW_ROLE_CHEF,
  NAMED_CREW_ROLE_HISTORIAN,
  addNamedCrewMember
} from "./namedCrew.js";

test("a port dialogue fallback retains the admitted port's visit memory identity", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const admittedPort = { cityId: "cordoba|spain", tileId: 17, portId: "dock-17", city: "Cordoba" };
  visitPort(state, admittedPort, 0);
  const session = createPortDialogueSession(admittedPort, { admittedToPort: true });
  const fallbackCity = restorePortDialogueCityIdentity(session, {
    cityId: admittedPort.cityId,
    tileId: 99,
    city: "Renamed Cordoba"
  });

  assert.equal(fallbackCity.portId, admittedPort.cityId);
  assert.equal(portMemory(state, fallbackCity).visits, 1);
});

test("hailing an NPC ship identifies the captain by name", () => {
  const ship = { id: "mediterranean-4", label: "Xebec", character: { name: "Marco Doria" } };
  const session = createShipDialogueSession(ship);
  const view = shipDialogueView(session, ship);

  assert.equal(session.kind, "ship");
  assert.equal(view.speaker, "Marco Doria, merchant captain");
  assert.equal(view.topic, "VESSEL: XEBEC");
  assert.equal(view.text, "Fair winds, captain. Running in ballast.");
  assert.deepEqual(view.options.map((option) => option.label), ["Demand surrender", "Leave"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 1), { closed: true, action: null });
});

test("ship hails preview whether an attack is legal under a letter of marque", () => {
  const authorizedShip = {
    id: "french-prize",
    label: "Caravel",
    character: { name: "Claude Martin" },
    playerAttackIsPiracy: false,
    privateeringIssuerAdjective: "Spanish"
  };
  const authorized = shipDialogueView(createShipDialogueSession(authorizedShip), authorizedShip);
  assert.equal(authorized.feedback, "Your Spanish letter of marque makes this attack legal.");
  assert.equal(authorized.feedbackTone, "success");

  const unlicensedShip = {
    id: "illegal-prize",
    label: "Caravel",
    character: { name: "Claude Martin" },
    playerAttackIsPiracy: true,
    privateeringIssuerAdjective: null
  };
  const unlicensed = shipDialogueView(createShipDialogueSession(unlicensedShip), unlicensedShip);
  assert.equal(unlicensed.feedback, "Without a letter of marque, this attack would be illegal piracy.");
  assert.equal(unlicensed.feedbackTone, "danger");
});

test("a commissioned captain can cite an NPC ship's exact trade violation as a lawful demand", () => {
  const violation = {
    id: "trade-embargo:embargo-4",
    regimeKind: "trade-embargo",
    orderId: "embargo-4",
    authorityKind: "national",
    issuerFactionId: "hospitallers",
    targetFactionId: "ottoman",
    enforcingFactionId: "hospitallers",
    regimeLabel: "the Hospitaller embargo against Ottoman trade",
    issuerAdjective: "Hospitaller",
    cargo: { carpets: 3 },
    cargoQuantity: 3
  };
  const ship = {
    id: "ottoman-smuggler",
    label: "Dhow",
    roleLabel: "Merchant",
    faction: { adjective: "Ottoman" },
    character: { name: "Kemal Celebi" },
    playerAttackIsPiracy: true,
    privateeringIssuerAdjective: null,
    tradeRestrictionViolation: violation,
    willOfferSurrender: true
  };
  const session = createShipDialogueSession(ship);
  const view = shipDialogueView(session, ship);

  assert.equal(
    view.options[0].label,
    "You are in violation of the Hospitaller embargo against Ottoman trade"
  );
  assert.equal(view.options[0].detail, "Legal surrender demand");
  assert.equal(view.options.some((entry) => entry.label === "Demand surrender"), false);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), {
    closed: false,
    action: { type: "begin-player-trade-enforcement", violation }
  });
  assert.equal(session.tradeRestrictionEnforcementActive, true);
  assert.equal(session.nodeId, "surrender-offer");
});

test("hailing a hostile pirate offers combat without friendly gossip", () => {
  const ship = {
    id: "pirate-felucca",
    label: "Felucca",
    roleLabel: "Pirate",
    faction: { adjective: "Pirate" },
    character: { name: "Anne Flint" },
    playerAttackIsPiracy: false
  };
  const session = createShipDialogueSession(ship, {
    hostileHail: true,
    rumorText: null
  });
  const view = shipDialogueView(session, ship);

  assert.equal(view.expressionId, "angry");
  assert.equal(view.text, "Heave to. Your cargo or your life.");
  assert.deepEqual(view.options.map((entry) => entry.label), ["Attack", "Leave"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), {
    closed: true,
    action: { type: "attack" }
  });
});

test("a scripted rival-delegation hail delivers its challenge without offering combat", () => {
  const ship = {
    id: "ouchi-delegation",
    label: "Sekibune",
    roleLabel: "Warship",
    faction: { adjective: "Ouchi" },
    character: { name: "Mori Takamasa" }
  };
  const session = createShipDialogueSession(ship, {
    scriptedHail: { text: "Ningbo will receive our tally first. Keep clear." }
  });
  const view = shipDialogueView(session, ship);

  assert.equal(view.expressionId, "angry");
  assert.equal(view.text, "Ningbo will receive our tally first. Keep clear.");
  assert.deepEqual(view.options.map((option) => option.label), ["Hold your course"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), { closed: true, action: null });
});

test("two Zoroastrian captains recognize one another when they hail", () => {
  const ship = {
    id: "hormuz-merchant",
    label: "Dhow",
    character: {
      id: "captain-ardashir",
      name: "Ardashir Yazdi",
      religionId: "zoroastrianism"
    }
  };
  const session = createShipDialogueSession(ship, {
    listenerReligionId: "zoroastrianism"
  });
  const view = shipDialogueView(session, ship);

  assert.match(view.text, /^Hamazor bem/);
  assert.match(view.text, /Running in ballast/);
});

test("a white-whale rumor is delivered through an ordinary ship hail", () => {
  const ship = { id: "malacca-merchant", label: "Dhow", character: { name: "Hamid Rahman" } };
  const session = createShipDialogueSession(ship, {
    rumorText: "A pale spout was sighted southeast of here."
  });
  const view = shipDialogueView(session, ship);

  assert.equal(view.text, "A pale spout was sighted southeast of here.");
  assert.deepEqual(view.options.map((option) => option.label), ["Thank the captain"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), { closed: true, action: null });
});

test("Portuguese patrols present explicit cartaz enforcement choices", () => {
  const ship = {
    id: "portuguese-patrol-4",
    label: "Portuguese Carrack",
    roleLabel: "Warship",
    faction: { adjective: "Portuguese" },
    character: { name: "Ines Vaz" }
  };
  const session = createShipDialogueSession(ship, {
    cartazInspection: {
      fine: 420,
      canAffordFine: true,
      controlledCargo: { pepper: 2 },
      controlledCargoQuantity: 2
    }
  });
  const view = shipDialogueView(session, ship);

  assert.match(view.text, /Estado da India/);
  assert.match(view.text, /too late to buy a license/);
  assert.deepEqual(view.options.map((entry) => entry.label), [
    "Pay fine  420 db",
    "Surrender controlled cargo",
    "Run for it"
  ]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 2), {
    closed: true,
    action: { type: "attack", cartazEvasion: true }
  });
});

test("government patrols can enforce illicit trade restrictions at sea", () => {
  const ship = {
    id: "ming-patrol-4",
    label: "Ming War Junk",
    roleLabel: "Warship",
    faction: { adjective: "Ming" },
    character: { name: "Liang Chen" }
  };
  const session = createShipDialogueSession(ship, {
    illicitTradeInspection: {
      incidentId: "illicit-trade-1",
      originName: "Guangzhou",
      fine: 270,
      cargoQuantity: 3,
      canAffordFine: true
    }
  });
  const view = shipDialogueView(session, ship);

  assert.match(view.text, /Customs officers at Guangzhou traced illicit trade/);
  assert.deepEqual(view.options.map((entry) => entry.label), [
    "Pay fine  270 db",
    "Surrender illicit cargo",
    "Run for it"
  ]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 2), {
    closed: true,
    action: { type: "evade-illicit-trade-inspection" }
  });
});

test("embargo patrols name the sovereign order and offer seizure, fine, or flight", () => {
  const ship = {
    id: "hospitaller-patrol-2",
    label: "Galley",
    roleLabel: "Warship",
    faction: { adjective: "Hospitaller" },
    character: { name: "Fra Marco de Villiers" }
  };
  const session = createShipDialogueSession(ship, {
    tradeEmbargoInspection: {
      incidentId: "trade-embargo-1",
      issuerName: "the Order of Saint John",
      targetName: "the Ottoman domains",
      scopeLabel: "all merchandise",
      fine: 310,
      cargoQuantity: 2,
      canAffordFine: true
    }
  });
  const view = shipDialogueView(session, ship);

  assert.match(view.text, /By order of the Order of Saint John/);
  assert.match(view.text, /all merchandise from the Ottoman domains/);
  assert.deepEqual(view.options.map((entry) => entry.label), [
    "Pay fine  310 db",
    "Surrender embargoed cargo",
    "Run for it"
  ]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 2), {
    closed: true,
    action: { type: "evade-trade-embargo-inspection" }
  });
});

test("a non-enemy ship offers emergency provisions once the player is depleted", () => {
  const ship = {
    id: "relief-ship",
    label: "Caravel",
    character: { name: "Marco Doria" },
    canOfferEmergencyAid: true
  };
  const session = createShipDialogueSession(ship);
  const view = shipDialogueView(session, ship);

  assert.equal(view.options[0].label, "Ask for provisions");
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), {
    closed: false,
    action: { type: "receive-aid" }
  });
  session.aidMessage = "Take these stores with our compliments. Food +3, water +3.";
  const thanks = shipDialogueView(session, { ...ship, canOfferEmergencyAid: false });
  assert.equal(thanks.expressionId, "happy");
  assert.deepEqual(thanks.options.map((entry) => entry.label), ["Thank the captain"]);
});

test("hostile shore batteries hail before opening fire", () => {
  const city = {
    cityId: "alexandria|egypt",
    tileId: 17,
    portId: "city-17",
    city: "Alexandria",
    factionId: "ottoman",
    character: { name: "Kemal Reis" }
  };
  const session = createShoreBatteryDialogueSession(city, {
    relation: "war",
    playerWarship: true,
    passageOffered: false
  });
  const view = shoreBatteryDialogueView(session, city);
  assert.equal(session.kind, "shore-battery");
  assert.equal(view.speaker, "Kemal Reis, Alexandria");
  assert.match(view.text, /Sultan Suleiman I/);
  assert.match(view.text, /fired upon/);
  assert.deepEqual(selectShoreBatteryDialogueOption(session, city, 0), { closed: true, action: null });
});

test("shore battery speakers use the period city display name", () => {
  const city = {
    cityId: "feodosia|russian federation",
    tileId: 17,
    portId: "city-17",
    city: "Feodosia",
    displayCity: "Kefe",
    factionId: "ottoman",
    character: { name: "Kemal Reis" }
  };
  const session = createShoreBatteryDialogueSession(city, {
    relation: "war",
    playerWarship: true,
    passageOffered: false
  });

  assert.equal(shoreBatteryDialogueView(session, city).speaker, "Kemal Reis, Kefe");
});

test("hostile shore batteries sell civilian passage for the whole empire", () => {
  const city = {
    cityId: "alexandria|egypt",
    tileId: 17,
    portId: "city-17",
    city: "Alexandria",
    factionId: "ottoman",
    character: { name: "Kemal Reis" }
  };
  const session = createShoreBatteryDialogueSession(city, {
    relation: "hostile",
    playerWarship: false,
    passageOffered: true,
    toll: 55,
    canAffordToll: true
  });
  const view = shoreBatteryDialogueView(session, city);
  assert.match(view.text, /one month of safe passage/);
  assert.deepEqual(view.options.map((entry) => entry.label), ["Pay 55 db", "Turn away"]);
  assert.deepEqual(
    selectShoreBatteryDialogueOption(session, city, 0),
    { closed: true, action: { type: "purchase-safe-passage" } }
  );
  assert.deepEqual(
    selectShoreBatteryDialogueOption(session, city, 1),
    { closed: true, action: { type: "refuse-safe-passage" } }
  );
});

test("shore batteries do not quote passage that the faction will refuse", () => {
  const city = {
    cityId: "alexandria|egypt",
    tileId: 17,
    portId: "city-17",
    city: "Alexandria",
    factionId: "ottoman",
    character: { name: "Kemal Reis" }
  };
  const session = createShoreBatteryDialogueSession(city, {
    relation: "war",
    playerWarship: false,
    passageOffered: false
  });
  const view = shoreBatteryDialogueView(session, city);

  assert.match(view.text, /at war with your flag/);
  assert.deepEqual(view.options.map((entry) => entry.label), ["To arms"]);
  assert.ok(view.options.every((entry) => entry.action.type !== "purchase-safe-passage"));
});

test("personal hostility challenges blame the captain rather than a war between flags", () => {
  assert.equal(
    personalHostilityDialogue("Kingdom of France"),
    "Your flag is not our quarrel, captain. You are. Kingdom of France has declared you an outlaw. Heave to!"
  );
  assert.equal(
    personalHostilityDialogue("Kingdom of France", { defensive: true }),
    "Peace may hold between our flags, but your name is cursed in Kingdom of France. Keep away, or we will defend ourselves!"
  );
  assert.throws(() => personalHostilityDialogue(""), /requires a faction name/);
});

test("disabled shore battery passage offers stay open without crashing", () => {
  const city = {
    cityId: "alexandria|egypt",
    tileId: 17,
    portId: "city-17",
    city: "Alexandria",
    factionId: "ottoman",
    character: { name: "Kemal Reis" }
  };
  const session = createShoreBatteryDialogueSession(city, {
    relation: "hostile",
    playerWarship: false,
    passageOffered: true,
    toll: 55,
    canAffordToll: false
  });

  assert.deepEqual(selectShoreBatteryDialogueOption(session, city, 0), {
    closed: false,
    action: null,
    feedback: "Not enough doubloons."
  });
});

test("merchant captains report their destination and visible cargo", () => {
  const ship = {
    id: "indian-ocean-7",
    label: "Dhow",
    character: { name: "Yusuf al-Masri" },
    destinationName: "Hormuz",
    cargo: { pepper: 18, cotton: 9 }
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);
  assert.equal(view.text, "Fair winds, captain. Bound for Hormuz. We carry Pepper x18 and Cotton x9.");
});

test("ship cargo manifests describe edible goods as commercial trade lots", () => {
  const ship = {
    id: "provision-tender-1",
    label: "Dhow",
    character: { name: "Yusuf al-Masri" },
    cargo: { fish: 4, grain: 3 }
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);

  assert.match(view.text, /Fish x4 and Grain x3/);
  assert.doesNotMatch(view.text, /RATIONS/);
});

test("ship cargo manifests reject fractional NPC trade lots", () => {
  const ship = {
    id: "malformed-provision-tender",
    label: "Dhow",
    character: { name: "Yusuf al-Masri" },
    cargo: { fish: 0.5 }
  };

  assert.throws(
    () => shipDialogueView(createShipDialogueSession(ship), ship),
    /NPC ship cargo must use whole trade lots/
  );
});

test("merchant captains report when they are anchored for a storm", () => {
  const ship = {
    id: "atlantic-coast-2",
    label: "Caravel",
    character: { name: "Beatriz Lopes" },
    stormStatus: "We are anchored until the storm passes."
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);
  assert.equal(
    view.text,
    "Fair winds, captain. We are anchored until the storm passes. Running in ballast."
  );
  assert.equal(view.expressionId, "concerned");
});

test("fishermen identify the net fitted to their ship", () => {
  const fisher = {
    id: "north-sea-fisher-2",
    label: "Fishing lugger",
    roleLabel: "Fisherman",
    fishingNetLabel: "Weighted cast net",
    character: { name: "Pieter Vos" }
  };
  const session = createShipDialogueSession(fisher);
  const view = shipDialogueView(session, fisher);

  assert.match(view.text, /work a weighted cast net/i);
});

test("whalers identify their profession and blubber cargo", () => {
  const whaler = {
    id: "north-atlantic-whalers-1",
    label: "Fishing lugger",
    roleLabel: "Whaler",
    cargo: { "whale-blubber": 12 },
    character: { name: "Martin Etxeberria" }
  };
  const view = shipDialogueView(createShipDialogueSession(whaler), whaler);

  assert.match(view.speaker, /whaler captain$/i);
  assert.match(view.text, /Whale Blubber x12/);
  assert.match(view.text, /hunt whales with hand harpoons/i);
});

test("warship and pirate captains identify their role and allegiance", () => {
  const warship = {
    id: "warship",
    label: "Portuguese Carrack",
    roleLabel: "Warship",
    faction: { adjective: "Portuguese" },
    character: { name: "Ines Vaz" }
  };
  const warView = shipDialogueView(createShipDialogueSession(warship), warship);
  assert.equal(warView.speaker, "Ines Vaz, Portuguese warship captain");
  assert.match(warView.text, /^Keep clear\. We are on patrol\./);
  assert.equal(warView.expressionId, "attentive");

  const pirate = {
    id: "pirate",
    label: "Pirate Brig",
    roleLabel: "Pirate",
    faction: { adjective: "Pirate" },
    character: { name: "Anne Flint" }
  };
  const pirateView = shipDialogueView(createShipDialogueSession(pirate), pirate);
  assert.equal(pirateView.speaker, "Anne Flint, pirate captain");
  assert.match(pirateView.text, /^Heave to/);
  assert.equal(pirateView.expressionId, "stern");

  const treasureView = shipDialogueView(createShipDialogueSession(pirate, {
    pirateTreasureName: "Israel Flint"
  }), pirate);
  assert.match(treasureView.text, /Captain Israel Flint's treasure is aboard/i);
  assert.match(treasureView.text, /take the hoard/i);
});

test("an attacking captain hails with a reason before combat", () => {
  const attacker = {
    id: "portuguese-warship",
    label: "Portuguese Carrack",
    roleLabel: "Warship",
    faction: { adjective: "Portuguese" },
    character: { name: "Ines Vaz" }
  };
  const session = createShipDialogueSession(attacker, {
    attackReason: "You sail under outlaw colors. Strike them, or we open fire!"
  });
  const view = shipDialogueView(session, attacker);

  assert.equal(view.expressionId, "angry");
  assert.equal(view.topic, "VESSEL: PORTUGUESE CARRACK");
  assert.equal(view.text, "You sail under outlaw colors. Strike them, or we open fire!");
  assert.deepEqual(view.options.map((option) => option.label), ["To arms"]);
});

test("a combat challenge is withdrawn if its attacker surrenders during the hail", () => {
  const attacker = {
    id: "pirate-challenger",
    label: "Pirate Brig",
    roleLabel: "Pirate",
    faction: { adjective: "Pirate" },
    character: { name: "Anne Flint" },
    combatGrace: true,
    inCombatWithPlayer: false
  };
  const session = createShipDialogueSession(attacker, {
    attackReason: "Your cargo and coin are ours. Heave to, or we open fire!"
  });
  const view = shipDialogueView(session, attacker);

  assert.equal(view.expressionId, "afraid");
  assert.match(view.text, /colors are struck/i);
  assert.match(view.text, /fight is over/i);
  assert.deepEqual(view.options.map((option) => option.label), ["Leave"]);
  assert.doesNotMatch(view.text, /cargo and coin are ours/i);
});

test("a combat challenge cannot remain actionable after its engagement ends", () => {
  const attacker = {
    id: "warship-challenger",
    label: "Portuguese Carrack",
    roleLabel: "Warship",
    faction: { adjective: "Portuguese" },
    character: { name: "Ines Vaz" },
    combatGrace: false,
    inCombatWithPlayer: false
  };
  const session = createShipDialogueSession(attacker, {
    attackReason: "Strike your colors, or we open fire!"
  });
  const view = shipDialogueView(session, attacker);

  assert.match(view.text, /challenge has ended/i);
  assert.deepEqual(view.options.map((option) => option.label), ["Leave"]);
  assert.doesNotMatch(view.text, /strike your colors/i);
});

test("an outmatched ship offers surrender and the player may refuse it", () => {
  const ship = {
    id: "outmatched",
    slug: "small-cog",
    hitPoints: 7,
    maxHitPoints: 7,
    roleLabel: "Merchant",
    faction: { adjective: "Spanish" },
    character: { name: "Teresa de la Vega" },
    willOfferSurrender: true
  };
  const session = createShipDialogueSession(ship);

  assert.deepEqual(selectShipDialogueOption(session, ship, 0), { closed: false, action: null });
  const offer = shipDialogueView(session, ship);
  assert.equal(offer.expressionId, "afraid");
  assert.deepEqual(offer.options.map((option) => option.label), ["Accept surrender", "Refuse and attack"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 1), {
    closed: true,
    action: { type: "attack" }
  });

  const acceptingSession = createShipDialogueSession(ship);
  selectShipDialogueOption(acceptingSession, ship, 0);
  assert.deepEqual(selectShipDialogueOption(acceptingSession, ship, 0), {
    closed: false,
    action: { type: "surrender" }
  });
  const resolving = shipDialogueView(acceptingSession, ship);
  assert.match(resolving.text, /colors are struck/i);
  assert.deepEqual(resolving.options.map((option) => option.label), ["Review the prize"]);
  assert.equal(resolving.options[0].disabled, true);
  ship.combatGrace = true;
  prepareSurrenderPrizeDialogue(acceptingSession, ship, {
    slug: "fishing-lugger",
    hitPoints: 3,
    maxHitPoints: 4,
    cargoUsed: 8
  }, {
    specie: 75,
    cargo: { cinnamon: 3 },
    remainingCargo: { cinnamon: 5 }
  });
  const struckColors = shipDialogueView(acceptingSession, ship);
  assert.equal(struckColors.speaker, "Teresa de la Vega, Spanish merchant captain");
  assert.equal(struckColors.expressionId, "afraid");
  assert.match(struckColors.text, /colors are struck/);
  assert.deepEqual(struckColors.options.map((option) => option.label), ["Review the prize"]);
  assert.deepEqual(selectShipDialogueOption(acceptingSession, ship, 0), {
    closed: false,
    action: null
  });

  const prize = shipDialogueView(acceptingSession, ship);
  assert.equal(prize.presentation.kind, "ship-capture");
  assert.equal(prize.presentation.candidateShipSlug, "small-cog");
  assert.equal(prize.presentation.candidateHitPoints, prize.presentation.candidateMaxHitPoints);
  assert.equal(prize.presentation.currentShipSlug, "fishing-lugger");
  assert.match(prize.text, /75 doubloons and Cinnamon x3/);
  assert.match(prize.text, /Cinnamon x5 remains aboard/);
  assert.deepEqual(prize.options.map((option) => option.label), [
    "Take Small Cog",
    "Keep Fishing Barque"
  ]);
  assert.equal(prize.options[1].detail, "LEAVE PRIZE AND REMAINING CARGO");

  assert.deepEqual(selectShipDialogueOption(acceptingSession, ship, 0), {
    closed: false,
    action: null
  });
  const confirmation = shipDialogueView(acceptingSession, ship);
  assert.match(confirmation.text, /repaired to full hull strength/);
  assert.match(confirmation.text, /permanently replace your current Fishing Barque/);
  assert.match(confirmation.text, /Cinnamon x5 still aboard/);
  assert.equal(confirmation.options[0].detail, "CURRENT SHIP WILL BE REPLACED");
  assert.deepEqual(selectShipDialogueOption(acceptingSession, ship, 0), {
    closed: false,
    action: { type: "capture-surrendered-ship" }
  });
  assert.equal(acceptingSession.nodeId, "capture-loading");
});

test("a damage-induced surrender can be accepted or mercifully released", () => {
  const ship = {
    id: "damaged-merchant",
    slug: "small-cog",
    hitPoints: 1,
    maxHitPoints: 7,
    roleLabel: "Merchant",
    faction: { adjective: "French" },
    character: { name: "Jeanne Martin" },
    combatGrace: true,
    playerAttackIsPiracy: true
  };
  const accidental = prepareDamageSurrenderDialogue(null, ship, { cause: "accidental" });
  const choice = shipDialogueView(accidental, ship);

  assert.match(choice.text, /unintended/i);
  assert.equal(choice.feedback, "Taking this vessel as a prize would be piracy.");
  assert.equal(choice.feedbackTone, "danger");
  assert.deepEqual(choice.options.map((entry) => entry.label), [
    "Accept surrender",
    "Apologize and release"
  ]);
  assert.deepEqual(selectShipDialogueOption(accidental, ship, 1), {
    closed: true,
    action: { type: "release-damage-surrender" }
  });

  const exploit = prepareDamageSurrenderDialogue(null, ship, { cause: "accidental" });
  assert.deepEqual(selectShipDialogueOption(exploit, ship, 0), { closed: false, action: null });
  assert.equal(exploit.nodeId, "piracy-warning");
  assert.deepEqual(selectShipDialogueOption(exploit, ship, 1), {
    closed: false,
    action: { type: "accept-damage-surrender" }
  });

  const defensive = prepareDamageSurrenderDialogue(null, ship, { cause: "self-defense" });
  const defensiveChoice = shipDialogueView(defensive, ship);
  assert.equal(defensiveChoice.feedback, "This vessel attacked you. Taking it as a prize is lawful.");
  assert.equal(defensiveChoice.feedbackTone, "success");
  assert.deepEqual(defensiveChoice.options.map((entry) => entry.label), [
    "Accept surrender",
    "Show mercy and release"
  ]);
  assert.deepEqual(selectShipDialogueOption(defensive, ship, 0), {
    closed: false,
    action: { type: "accept-damage-surrender" }
  });
});

test("a letter of marque identifies a lawful surrendered prize", () => {
  const ship = {
    id: "french-privateer-prize",
    slug: "small-cog",
    hitPoints: 1,
    maxHitPoints: 7,
    roleLabel: "Merchant",
    faction: { adjective: "French" },
    character: { name: "Jeanne Martin" },
    combatGrace: true,
    playerAttackIsPiracy: false,
    privateeringIssuerAdjective: "Spanish"
  };
  const session = prepareDamageSurrenderDialogue(null, ship, { cause: "deliberate" });
  const choice = shipDialogueView(session, ship);

  assert.equal(choice.feedback, "Your Spanish letter of marque makes this a lawful prize.");
  assert.equal(choice.feedbackTone, "success");
});

test("a surrendered prize cannot replace the player with a hold that is too small", () => {
  const ship = {
    id: "small-prize",
    slug: "dhow",
    hitPoints: 3,
    maxHitPoints: 3,
    combatGrace: true,
    character: { name: "Salim Reis" }
  };
  const session = prepareSurrenderPrizeDialogue(null, ship, {
    slug: "small-cog",
    hitPoints: 7,
    maxHitPoints: 7,
    cargoUsed: 34 / 3
  });
  const surrender = shipDialogueView(session, ship);
  assert.equal(surrender.speaker, "Salim Reis, merchant captain");
  assert.deepEqual(surrender.options.map((option) => option.label), ["Review the prize"]);
  selectShipDialogueOption(session, ship, 0);
  const view = shipDialogueView(session, ship);

  assert.equal(view.options[0].disabled, true);
  assert.match(view.options[0].disabledReason, /11 units of cargo/);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), {
    closed: false,
    action: null
  });
  assert.match(session.feedback, /11 units of cargo/);
});

test("a surrender prize accepts fractional cargo use from daily provisions", () => {
  const ship = {
    id: "fractional-prize",
    slug: "small-cog",
    hitPoints: 7,
    maxHitPoints: 7,
    combatGrace: true,
    character: { name: "Ines de Castro" }
  };
  const session = prepareSurrenderPrizeDialogue(null, ship, {
    slug: "galleon",
    hitPoints: 36,
    maxHitPoints: 36,
    cargoUsed: 116 / 3
  });

  assert.equal(session.prize.cargoUsed, 116 / 3);
  selectShipDialogueOption(session, ship, 0);
  assert.equal(shipDialogueView(session, ship).options[0].disabled, false);
});

test("a protected surrendered ship cannot be threatened again", () => {
  const ship = {
    id: "protected",
    label: "Caravel",
    character: { name: "Marco Doria" },
    combatGrace: true
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);
  assert.deepEqual(view.options.map((option) => option.label), ["Leave"]);
});

test("piracy warning lets the player back out before a hostile demand", () => {
  const ship = {
    id: "merchant",
    label: "Caravel",
    roleLabel: "Merchant",
    faction: { adjective: "French" },
    character: { name: "Claude Martin" },
    willOfferSurrender: false,
    playerAttackIsPiracy: true
  };
  const backingOutSession = createShipDialogueSession(ship);

  assert.deepEqual(selectShipDialogueOption(backingOutSession, ship, 0), {
    closed: false,
    action: null
  });
  const warning = shipDialogueView(backingOutSession, ship);
  assert.equal(warning.expressionId, "angry");
  assert.equal(warning.text, "Without a letter of marque, this is an act of piracy.");
  assert.equal(warning.bodyTone, "danger");
  assert.deepEqual(warning.options.map((option) => option.label), [
    "Back down",
    "Demand surrender anyway"
  ]);
  assert.deepEqual(selectShipDialogueOption(backingOutSession, ship, 0), {
    closed: true,
    action: null
  });

  const confirmingSession = createShipDialogueSession(ship);
  selectShipDialogueOption(confirmingSession, ship, 0);
  assert.deepEqual(selectShipDialogueOption(confirmingSession, ship, 1), {
    closed: false,
    action: null
  });
  assert.deepEqual(shipDialogueView(confirmingSession, ship).options.map((option) => option.label), [
    "Attack",
    "Back down"
  ]);
  assert.deepEqual(selectShipDialogueOption(confirmingSession, ship, 0), {
    closed: true,
    action: { type: "attack" }
  });
});

test("a capable ship defies the threat but can still be attacked", () => {
  const ship = {
    id: "capable",
    label: "Portuguese Carrack",
    roleLabel: "Warship",
    faction: { adjective: "Portuguese" },
    character: { name: "Ines Vaz" },
    willOfferSurrender: false
  };
  const session = createShipDialogueSession(ship);

  selectShipDialogueOption(session, ship, 0);
  const defiance = shipDialogueView(session, ship);
  assert.equal(defiance.expressionId, "angry");
  assert.deepEqual(defiance.options.map((option) => option.label), ["Attack", "Back down"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), {
    closed: true,
    action: { type: "attack" }
  });
});

test("ship dialogue rejects a different NPC ship", () => {
  const session = createShipDialogueSession({ id: "ship-a" });
  assert.throws(
    () => shipDialogueView(session, { id: "ship-b", label: "Caravel" }),
    /does not match/
  );
});

test("captured ports greet the player under their current sovereign", () => {
  const ceuta = {
    tileId: 102,
    cityId: "ceuta|morocco",
    city: "Ceuta",
    displayCity: "Ceuta",
    country: "Morocco",
    cityType: "mediterranean",
    population: 12000,
    foundingFactionId: "portugal",
    factionId: "ottoman",
    character: { name: "Diogo Mendes", role: "harbour-master", personalityId: "vigilant" }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: [ceuta], startMinute: 0 });
  const greeting = portDialogueView(
    createPortDialogueSession(ceuta),
    ceuta,
    gameState,
    economy,
    [ceuta],
    {}
  );

  assert.match(greeting.text, /The Ottoman Empire now rules Ceuta/);

  ceuta.factionId = "portugal";
  const unchangedGreeting = portDialogueView(
    createPortDialogueSession(ceuta),
    ceuta,
    gameState,
    economy,
    [ceuta],
    {}
  );
  assert.doesNotMatch(unchangedGreeting.text, /now rules Ceuta/);
});

test("port arrivals present one greeting when recognition and sovereignty news coincide", () => {
  const york = {
    tileId: 103,
    cityId: "york|england",
    city: "York",
    displayCity: "York",
    country: "England",
    cityType: "northern-european",
    population: 15000,
    foundingFactionId: "england",
    factionId: "france",
    character: { name: "Jane Barrelet", role: "harbour-master", personalityId: "enterprising" }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.memory.conquest.treaties.push({
    id: "treaty-england",
    capitalPortId: york.cityId,
    loserFactionId: "england",
    winnerFactionId: "france",
    term: "vassalage",
    annexedFactionId: null,
    concessionCityIds: [],
    concessionCityNames: [],
    concessionPortIds: [],
    papalActionTargetFactionId: null,
    simMinute: 0,
    source: "player"
  });
  const economy = createWorldEconomy({ ports: [york], startMinute: 0 });
  const greeting = portDialogueView(
    createPortDialogueSession(york),
    york,
    gameState,
    economy,
    [york],
    { localHour: 13, playerStanding: 20 }
  );

  assert.match(greeting.text, /treaty|peace/i);
  assert.doesNotMatch(greeting.text, /now rules York|Good afternoon|good name/i);
});

test("port dialogue exposes live market specie, stock, and prices", () => {
  const city = {
    factionId: "portugal",
    tileId: 1,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city);

  const context = { nearbyShips: { pirates: 1 } };
  const greeting = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(greeting.speaker, "Fernao da Cunha, harbour master of Lisbon");
  assert.match(greeting.text, /Pirates/);
  assert.equal(greeting.expressionId, "afraid");
  assert.deepEqual(greeting.options.map((option) => option.label), ["Continue"]);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(root.speaker, "Fernao da Cunha, harbour master of Lisbon");
  assert.match(root.text, /Market specie: \d+ db/);
  const waitIndex = root.options.findIndex((option) => option.action.type === "wait-in-port");
  assert.ok(waitIndex >= 0);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], waitIndex, context),
    { closed: true, action: { type: "wait-in-port" } }
  );
  session.nodeId = "root";
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  const market = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(market.text, /Market specie: \d+ db/);
  assert.equal(market.feedbackLineReserve, 2);
  assert.equal(market.optionHeight, 30);
  assert.ok(market.options.some((option) => /\d+ db/.test(option.label)));
  assert.ok(market.options.some((option) => /WORLD/.test(option.detail || "")));
  assert.ok(market.options.some((option) => /SPACE [1-4]/.test(option.detail || "")));
  assert.ok(market.options.some((option) => /STOCK \d+/.test(option.detail || "")));
  assert.ok(market.options.every((option) => option.action.goodId !== HARDTACK_GOOD_ID));
  assert.ok(market.options.every((option) => option.action.goodId !== FRESH_WATER_GOOD_ID));
  const buyIndex = market.options.findIndex((option) => (
    option.action.type === "buy" &&
    !option.disabled &&
    option.action.goodId !== HARDTACK_GOOD_ID &&
    option.action.goodId !== FRESH_WATER_GOOD_ID
  ));
  assert.ok(buyIndex >= 0);
  const purchase = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    buyIndex,
    { simMinute: 115200 }
  );
  assert.equal(purchase.marketPurchase.good.id, market.options[buyIndex].action.goodId);
  assert.equal(purchase.marketPurchase.quantity, 1);
  assert.equal(portDialogueView(session, city, gameState, economy, [city]).expressionId, "pleased");
  selectPortDialogueOption(session, city, gameState, economy, [city], 1, { simMinute: 115201 });
  assert.equal(session.marketMode, "sell");
  const sell = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(sell.options.every((option) => option.action.goodId !== HARDTACK_GOOD_ID));
  assert.ok(sell.options.every((option) => option.action.goodId !== FRESH_WATER_GOOD_ID));
  assert.equal(sell.feedbackLineReserve, 2);
  assert.equal(sell.optionHeight, 30);
  assert.equal(sell.options.at(-2).label, "Back to city");
  assert.equal(sell.options.at(-2).placement, "port-exit");
  assert.equal(sell.options.at(-1).label, "Undo all trades");
  assert.equal(sell.options.at(-1).placement, "port-exit");
  assert.equal(sell.options.at(-1).disabled, false);
  assert.ok(sell.options.some((option) => /P\/L [+-]\d+ db/.test(option.detail || "")));
  assert.ok(sell.options.some((option) => /WORLD/.test(option.detail || "")));

  const provisionsOnlyState = createGameState({ cargoCapacity: 20 });
  const provisionsOnlySession = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  const provisionsOnlySell = portDialogueView(
    provisionsOnlySession,
    city,
    provisionsOnlyState,
    economy,
    [city]
  );
  assert.deepEqual(provisionsOnlySell.options.map((option) => option.label), [
    "Buy",
    "Sell",
    "No cargo to sell",
    "Back to city",
    "Undo all trades"
  ]);
});

test("a Polynesian arrival is greeted by the island chief", () => {
  const city = {
    tileId: 93,
    cityId: "tarawa village|neutral",
    city: "Tarawa Village",
    displayCity: "Tarawa Village",
    country: "Neutral",
    cityType: "polynesian",
    settlementType: "village",
    factionId: "neutral",
    population: 1200,
    lat: 1.329,
    lon: 172.979,
    character: { name: "Te Rongo", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const greeting = portDialogueView(
    createPortDialogueSession(city),
    city,
    gameState,
    economy,
    [city]
  );
  assert.equal(greeting.speaker, "Te Rongo, island chief of Tarawa Village");
  assert.match(greeting.text, /beach|canoe|reef|shore|village/i);
  assert.doesNotMatch(greeting.text, /Good (morning|afternoon|evening)|credit|customs house/i);
});

test("the garrison commander reports the current fighting strength in character", () => {
  const city = {
    factionId: "england",
    tileId: 2,
    cityId: "bristol|england",
    city: "Bristol",
    displayCity: "Bristol",
    country: "England",
    cityType: "mediterranean",
    settlementType: "city",
    population: 25_000,
    character: { name: "Thomas Ward", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city);
  session.nodeId = "root";
  const root = portDialogueView(session, city, gameState, economy, [city]);
  const garrisonIndex = root.options.findIndex(({ action }) => action.nodeId === "garrison");
  assert.ok(garrisonIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], garrisonIndex);
  city.character = {
    name: "William Hales",
    role: "garrison-commander",
    personalityId: "stern"
  };
  const report = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(report.speaker, "William Hales, garrison commander of Bristol");
  assert.match(report.text, /^I have 10 fighting men on the rolls\./);
  assert.deepEqual(report.options.map(({ label }) => label), ["Back to city"]);
});

test("a factor explains customs once and repeats the explanation only after the rate changes", () => {
  const city = {
    tileId: 91,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  const session = createPortDialogueSession(city, { initialNodeId: "root" });
  const first = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(first.text, /favored 5% customs rate/i);

  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  session.nodeId = "root";
  const repeated = portDialogueView(session, city, gameState, economy, [city]);
  assert.doesNotMatch(repeated.text, /customs rate/i);

  adjustFactionReputation(gameState, "portugal", 100);
  const changed = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(changed.text, /favored 2% customs rate/i);
});

test("a port lists independent passenger and scripted travel offers together", () => {
  const city = {
    tileId: 190,
    cityId: "hamburg|germany",
    city: "Hamburg",
    displayCity: "Hamburg",
    country: "Germany",
    cityType: "northern-european",
    population: 35000,
    factionId: "denmark-norway",
    character: { name: "Johann Adler", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, { initialNodeId: "root" });

  const view = portDialogueView(session, city, gameState, economy, [city], {
    passengerOffers: [
      { id: "testament", passengerName: "Lutheran Bookseller" },
      { id: "ordinary", passengerName: "Ordinary Passenger" }
    ]
  });

  assert.ok(view.options.some(({ label }) => label === "Speak with Lutheran Bookseller"));
  assert.ok(view.options.some(({ label }) => label === "Speak with Ordinary Passenger"));
});

test("a foreign settlement is explained by the factor and supplies its resident customs privilege", () => {
  const city = withForeignSettlements1522({
    tileId: 92,
    cityId: "ternate|indonesia",
    city: "Ternate",
    displayCity: "Ternate",
    country: "Indonesia",
    cityType: "southeast-asian",
    population: 12000,
    factionId: "ternate",
    character: { name: "Hamza Darwis", role: "harbour-master", personalityId: "vigilant" }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joao Carvalho",
      nationalityId: "portugal",
      expressions: ["neutral", "happy"]
    }
  });

  const greetingSession = createPortDialogueSession(city);
  const greeting = portDialogueView(greetingSession, city, gameState, economy, [city]);
  assert.match(greeting.text, /Portuguese masons are raising a fort and factory/i);

  const rootSession = createPortDialogueSession(city, { initialNodeId: "root" });
  const root = portDialogueView(rootSession, city, gameState, economy, [city]);
  assert.match(root.text, /enters Portuguese cargo under its own privileges/i);
  assert.equal(playerTradeTerms(gameState, city, "cloves").customsRate, 0);
  const factory = root.options.findIndex(({ action }) => action.nodeId === "foreign-settlements");
  assert.ok(factory >= 0);
  selectPortDialogueOption(rootSession, city, gameState, economy, [city], factory);
  const account = portDialogueView(rootSession, city, gameState, economy, [city]);
  assert.match(account.text, /Portuguese masons are raising a fort and factory/i);
  selectPortDialogueOption(rootSession, city, gameState, economy, [city], 0);
  assert.equal(rootSession.nodeId, "root");

  expelHostileForeignSettlements({
    memory: gameState.relations.foreignSettlementExpulsions,
    ports: [city],
    relationBetween: () => "hostile",
    simMinute: 100
  });
  const expelledSession = createPortDialogueSession(city);
  const expelledGreeting = portDialogueView(
    expelledSession,
    city,
    gameState,
    economy,
    [city]
  );
  assert.match(expelledGreeting.text, /fort and factory has been closed/i);
  assert.match(expelledGreeting.text, /Portuguese residents expelled/i);
  assert.doesNotMatch(expelledGreeting.text, /Portuguese masons are raising/i);
  assert.equal(playerTradeTerms(gameState, city, "cloves").customsRate, 0.1);
});

test("Colombo offers cartaz papers before opening its official cinnamon market", () => {
  const city = withForeignSettlements1522({
    tileId: 155810,
    cityId: "colombo|sri lanka",
    city: "Colombo",
    displayCity: "Colombo",
    country: "Sri Lanka",
    cityType: "south-asian",
    population: 12000,
    factionId: "neutral",
    character: { name: "Dinesh Jayawardena", role: "harbour-master", personalityId: "shrewd" }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  const context = { simMinute: 100, random: () => 0.1, shipStats: shipStatsForSlug("brigantine") };
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });

  let view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(view.options.some((entry) => entry.label === "Portuguese cartaz"));
  const buyGoodsIndex = view.options.findIndex((entry) => entry.label === "Market");
  selectPortDialogueOption(session, city, gameState, economy, [city], buyGoodsIndex, context);

  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(session.nodeId, "portuguese-cartaz-market-offer");
  assert.match(view.text, /will not deal in Crown spices without a valid cartaz/);
  assert.match(view.text, /cinnamon/);
  const declineIndex = view.options.findIndex((entry) => entry.label === "Not now");
  selectPortDialogueOption(session, city, gameState, economy, [city], declineIndex, context);

  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(view.options.some((entry) => entry.label === "Seek illicit market"));
  const ordinaryIndex = view.options.findIndex((entry) => entry.label === "Browse ordinary goods");
  selectPortDialogueOption(session, city, gameState, economy, [city], ordinaryIndex, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const cinnamon = view.options.find((entry) => entry.action.goodId === "cinnamon");
  assert.equal(cinnamon.disabled, true);
  assert.match(cinnamon.disabledReason, /valid Portuguese cartaz/);
  const ordinary = view.options.find((entry) => entry.action.type === "buy" &&
    entry.action.goodId !== "cinnamon" && !entry.disabled);
  assert.ok(ordinary);

  const licensedSession = createPortDialogueSession(city, {
    initialNodeId: "root",
    admittedToPort: true
  });
  view = portDialogueView(licensedSession, city, gameState, economy, [city], context);
  selectPortDialogueOption(
    licensedSession,
    city,
    gameState,
    economy,
    [city],
    view.options.findIndex((entry) => entry.label === "Market"),
    context
  );
  view = portDialogueView(licensedSession, city, gameState, economy, [city], context);
  const cartazIndex = view.options.findIndex((entry) => entry.label.startsWith("Buy cartaz"));
  const cartazResult = selectPortDialogueOption(
    licensedSession,
    city,
    gameState,
    economy,
    [city],
    cartazIndex,
    context
  );
  assert.equal(cartazResult.cartazPurchase.valid, true);
  assert.equal(licensedSession.nodeId, "market");
  view = portDialogueView(licensedSession, city, gameState, economy, [city], context);
  assert.equal(view.options.find((entry) => (
    entry.action.type === "buy" && entry.action.goodId === "cinnamon"
  )).disabled, false);
});

test("buying a Portuguese cartaz does not remove the option to attack its issuing port", () => {
  const city = {
    tileId: 155900,
    cityId: "goa|india",
    city: "Goa",
    displayCity: "Goa",
    country: "India",
    cityType: "south-asian",
    population: 75_000,
    factionId: "portugal",
    character: { name: "Afonso de Melo", role: "garrison-commander" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = {
    simMinute: 100,
    shipStats: stats,
    portAttackStatus: playerPortAttackStatus(gameState, city)
  };

  let view = portDialogueView(session, city, gameState, economy, [city], context);
  const cartazIndex = view.options.findIndex(({ action }) => action.nodeId === "portuguese-cartaz");
  selectPortDialogueOption(session, city, gameState, economy, [city], cartazIndex, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchaseIndex = view.options.findIndex(({ action }) => action.type === "purchase-portuguese-cartaz");
  selectPortDialogueOption(session, city, gameState, economy, [city], purchaseIndex, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const backIndex = view.options.findIndex(({ action }) => action.nodeId === "root");
  selectPortDialogueOption(session, city, gameState, economy, [city], backIndex, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);

  assert.ok(view.options.some(({ action }) => action.nodeId === "city-attack"));
  assert.ok(view.options.some(({ label }) => label === "Portuguese cartaz: valid"));
});

test("Colombo offers costly cartaz papers to hostile captains and a clear refusal during war", () => {
  const city = withForeignSettlements1522({
    tileId: 155810,
    cityId: "colombo|sri lanka",
    city: "Colombo",
    displayCity: "Colombo",
    country: "Sri Lanka",
    cityType: "south-asian",
    population: 12000,
    factionId: "neutral",
    character: { name: "Dinesh Jayawardena", role: "harbour-master", personalityId: "shrewd" }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    doubloons: 1000,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  const context = { simMinute: 100, random: () => 0.1, shipStats: shipStatsForSlug("brigantine") };
  const pairKey = diplomacyPairKey("england", "portugal");
  gameState.relations.diplomacy.overrides[pairKey] = DIPLOMACY_HOSTILE;

  let session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  let view = portDialogueView(session, city, gameState, economy, [city], context);
  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    view.options.findIndex((entry) => entry.label === "Market"),
    context
  );
  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(view.options.some((entry) => entry.label.startsWith("Buy cartaz")));
  assert.ok(view.options.some((entry) => entry.label === "Not now"));

  gameState.relations.diplomacy.overrides[pairKey] = DIPLOMACY_WAR;
  session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  view = portDialogueView(session, city, gameState, economy, [city], context);
  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    view.options.findIndex((entry) => entry.label === "Market"),
    context
  );
  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.doesNotMatch(view.text, /I can issue your vessel papers/);
  assert.ok(view.options.some((entry) => entry.label === "Seek illicit market"));
  assert.ok(view.options.some((entry) => entry.label === "Browse ordinary goods"));
  assert.equal(view.options.some((entry) => entry.label === "Not now"), false);
});

test("Colombo smugglers sell cinnamon under the existing illicit-trade enforcement policy", () => {
  const city = withForeignSettlements1522({
    tileId: 155810,
    cityId: "colombo|sri lanka",
    city: "Colombo",
    displayCity: "Colombo",
    country: "Sri Lanka",
    cityType: "south-asian",
    population: 12000,
    factionId: "neutral",
    character: { name: "Dinesh Jayawardena", role: "harbour-master", personalityId: "shrewd" }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  const context = { simMinute: 100, random: () => 0.1, shipStats: shipStatsForSlug("brigantine") };
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });

  let view = portDialogueView(session, city, gameState, economy, [city], context);
  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    view.options.findIndex((entry) => entry.label === "Market"),
    context
  );
  view = portDialogueView(session, city, gameState, economy, [city], context);
  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    view.options.findIndex((entry) => entry.label === "Not now"),
    context
  );
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const result = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    view.options.findIndex((entry) => entry.label === "Seek illicit market"),
    context
  );
  assert.equal(result.illicitMarketAccessPolicyId, PORTUGUESE_CROWN_SPICE_POLICY_ID);
  assert.equal(session.nodeId, "market");

  view = portDialogueView(session, city, gameState, economy, [city], context);
  const cinnamonIndex = view.options.findIndex((entry) => (
    entry.action.type === "buy" && entry.action.goodId === "cinnamon"
  ));
  assert.ok(cinnamonIndex >= 0);
  assert.equal(view.options[cinnamonIndex].disabled, false);
  const purchase = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    cinnamonIndex,
    context
  );
  assert.equal(purchase.marketPurchase.tradeTerms.illicit, true);
  assert.equal(purchase.marketPurchase.tradeTerms.accessPolicyId, PORTUGUESE_CROWN_SPICE_POLICY_ID);
  assert.equal(session.illicitTradeVisit.enforcementFactionId, "portugal");
  assert.equal(session.illicitTradeVisit.purchasedCargo.cinnamon, 1);
});

test("buying the final unit disables its stable market row instead of moving later goods", () => {
  const city = {
    tileId: 109,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    population: 50000,
    character: { name: "Ines Carvalho", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 1000000;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });

  const initial = portDialogueView(session, city, gameState, economy, [city]);
  const buyIndexes = initial.options
    .map((entry, index) => entry.action.type === "buy" ? index : -1)
    .filter((index) => index >= 0);
  assert.ok(buyIndexes.length >= 2);
  const purchaseIndex = buyIndexes[0];
  const followingIndex = buyIndexes[1];
  const goodId = initial.options[purchaseIndex].action.goodId;
  const followingGoodId = initial.options[followingIndex].action.goodId;
  economy.portStates.get(city.cityId).goods.get(goodId).stock = 1;

  const singleUnitView = portDialogueView(session, city, gameState, economy, [city]);
  const buyMaxIndex = singleUnitView.options.findIndex((entry) => (
    entry.action.type === "buy-max" && entry.action.goodId === goodId
  ));
  assert.ok(buyMaxIndex >= 0);
  assert.equal(singleUnitView.options[buyMaxIndex].action.quantity, 1);
  assert.equal(singleUnitView.options[buyMaxIndex].disabled, false);

  const purchase = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    buyMaxIndex,
    { simMinute: 10 }
  );
  assert.equal(purchase.marketPurchase.quantity, 1);
  const after = portDialogueView(session, city, gameState, economy, [city]);

  assert.equal(after.options[purchaseIndex].action.goodId, goodId);
  assert.equal(after.options[purchaseIndex].disabled, true);
  assert.match(after.options[purchaseIndex].detail, /STOCK 0$/);
  assert.equal(after.options[followingIndex].action.goodId, followingGoodId);
});

test("scrolling a port market exposes every stocked trade good that cargo hints can recommend", () => {
  const rouen = {
    tileId: 110,
    cityId: "rouen|france",
    city: "Rouen",
    displayCity: "Rouen",
    country: "France",
    cityType: "northern-european",
    population: 40000,
    character: { name: "Claude Le Roux", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [rouen], startMinute: 0 });
  const marketState = economy.portStates.get(rouen.cityId).goods;
  marketState.get("sugar").stock = 20;
  marketState.get("wool-cloth").stock = 20;
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 1000000;
  const session = createPortDialogueSession(rouen, { initialNodeId: "market", marketMode: "buy" });

  const expectedGoodIds = portMarket(economy, rouen)
    .filter((row) => (
      row.listedForSale &&
      row.stock > 0 &&
      ![FRESH_WATER_GOOD_ID, HARDTACK_GOOD_ID].includes(row.good.id)
    ))
    .map((row) => row.good.id)
    .sort();
  assert.ok(expectedGoodIds.length > 5, "Rouen should exercise the former five-good display cap");

  const view = portDialogueView(session, rouen, gameState, economy, [rouen]);
  const displayedGoodIds = view.options
    .filter((entry) => entry.action.type === "buy")
    .map((entry) => entry.action.goodId)
    .sort();

  assert.deepEqual(displayedGoodIds, expectedGoodIds);
  assert.ok(displayedGoodIds.includes("sugar"));
  assert.ok(displayedGoodIds.includes("wool-cloth"));
});

test("Ming markets visibly offer domestic gunpowder but not scarce imported matchlocks", () => {
  const city = {
    tileId: 110,
    cityId: "guangzhou|china",
    city: "Guangzhou",
    displayCity: "Guangzhou",
    country: "Ming",
    cityType: "east-asian",
    factionId: "ming",
    population: 120000,
    character: { name: "Li Wen", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 100000;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });

  const market = portDialogueView(session, city, gameState, economy, [city]);
  const goodIds = market.options
    .filter((entry) => entry.action.type === "buy")
    .map((entry) => entry.action.goodId);

  assert.ok(goodIds.includes(GUNPOWDER_GOOD_ID));
  assert.equal(goodIds.includes(MATCHLOCKS_GOOD_ID), false);
});

test("selling the final unit disables its stable market row instead of moving later goods", () => {
  const city = {
    tileId: 107,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    population: 50000,
    character: { name: "Ines Carvalho", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.wool = 1;
  gameState.cargo.timber = 2;
  gameState.accounts.cargoCostBasis.wool = 10;
  gameState.accounts.cargoCostBasis.timber = 20;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });

  const before = portDialogueView(session, city, gameState, economy, [city]);
  const woolIndex = before.options.findIndex((entry) => entry.action.goodId === "wool");
  const timberIndex = before.options.findIndex((entry) => entry.action.goodId === "timber");
  assert.ok(woolIndex >= 0);
  assert.ok(timberIndex >= 0);

  const sale = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    woolIndex,
    { simMinute: 10 }
  );
  const after = portDialogueView(session, city, gameState, economy, [city]);

  assert.equal(sale.marketSale.good.id, "wool");
  assert.equal(sale.marketSale.quantity, 1);
  assert.equal(after.options[woolIndex].action.goodId, "wool");
  assert.equal(after.options[woolIndex].disabled, true);
  assert.match(after.options[woolIndex].detail, /HELD 0$/);
  assert.equal(after.options[timberIndex].action.goodId, "timber");
  assert.equal(after.options[timberIndex].disabled, false);
});

test("edible cargo market rows show remaining sale clicks instead of rations", () => {
  const city = {
    tileId: 108,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    population: 50000,
    character: { name: "Ines Carvalho", role: "harbour-master", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 61 / 12;
  gameState.accounts.cargoCostBasis.fish = 50;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });

  const before = portDialogueView(session, city, gameState, economy, [city]);
  const fishIndex = before.options.findIndex((entry) => entry.action.goodId === "fish");
  assert.ok(fishIndex >= 0);
  assert.match(before.options[fishIndex].detail, /HELD 5$/);
  assert.doesNotMatch(before.options[fishIndex].detail, /RATION/);

  selectPortDialogueOption(session, city, gameState, economy, [city], fishIndex, { simMinute: 10 });
  const after = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(after.options[fishIndex].detail, /HELD 4$/);
});

test("market capacity explains provision space reserved by the selected loadout", () => {
  const city = {
    tileId: 109,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "England",
    cityType: "northern-european",
    population: 50000,
    character: { name: "Thomas More", role: "harbour-master", personalityId: "shrewd" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  restockShipLoadoutAtPort(gameState, city, stats, "balanced", { simMinute: 0 });
  const tradeSpace = cargoFree(gameState);

  delete gameState.cargo.hardtack;
  delete gameState.accounts.cargoCostBasis.hardtack;
  gameState.survival.freshWater = 0;
  gameState.cargo.fish = tradeSpace + 1;
  gameState.accounts.cargoCostBasis.fish = tradeSpace + 1;

  const sellSession = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  let view = portDialogueView(sellSession, city, gameState, economy, [city]);
  const fishIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell" && entry.action.goodId === "fish"
  ));
  assert.ok(fishIndex >= 0);
  selectPortDialogueOption(sellSession, city, gameState, economy, [city], fishIndex, {
    simMinute: 1
  });

  const hold = cargoHoldStatus(gameState);
  assert.ok(hold.physicalWholeUnits < hold.capacity);
  assert.equal(hold.freeWholeUnits, 0);
  const buySession = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  view = portDialogueView(buySession, city, gameState, economy, [city]);
  const blockedPurchase = view.options.find((entry) => entry.action.type === "buy");
  assert.ok(blockedPurchase);
  assert.equal(blockedPurchase.disabled, true);
  assert.match(blockedPurchase.disabledReason, /^Needs \d+ cargo spaces; 0 free after loadout\.$/);
});

test("port menus pin Back to city and Leave Port after their ordinary actions", () => {
  const city = {
    factionId: "portugal",
    tileId: 106,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.ship.loadoutId = "balanced";
  gameState.doubloons = 1000;
  const context = { shipStats: stats };

  for (const nodeId of ["market", "equipment", "equipment-nets", "equipment-cannons", "cargo", "loadout"]) {
    const session = createPortDialogueSession(city, { initialNodeId: nodeId });
    const view = portDialogueView(session, city, gameState, economy, [city], context);
    const expectedBackLabel = ["equipment-nets", "equipment-cannons"].includes(nodeId)
      ? "Back"
      : "Back to city";
    const back = view.options.find((entry) => entry.label === expectedBackLabel);
    assert.equal(back?.placement, "port-exit", `${nodeId} should mark its back action for the footer`);
    assert.equal(
      view.options[dialogueBackOptionIndex(view)]?.label,
      expectedBackLabel,
      `${nodeId} back navigation should activate its declared action`
    );
    const firstExitIndex = view.options.findIndex((entry) => entry.placement === "port-exit");
    assert.ok(
      view.options.slice(firstExitIndex).every((entry) => entry.placement === "port-exit"),
      `${nodeId} should keep all footer actions after ordinary actions`
    );
  }

  const buySession = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  const buy = portDialogueView(buySession, city, gameState, economy, [city], context);
  assert.equal(buy.options.at(-3).label, "Change ship loadout");
  assert.deepEqual(buy.options.slice(0, 2).map((entry) => entry.placement), [
    "mode-switch",
    "mode-switch"
  ]);
  assert.ok(buy.options.slice(2, -3).every((entry) => (
    entry.action.type === "buy" || entry.action.type === "buy-max"
  )));
  assert.deepEqual(buy.options.slice(-2).map((entry) => entry.label), [
    "Back to city",
    "Undo all trades"
  ]);
  assert.equal(buy.optionColumns, 2);

  const rootSession = createPortDialogueSession(city, { initialNodeId: "root" });
  const root = portDialogueView(rootSession, city, gameState, economy, [city], context);
  assert.equal(root.options.at(-1).label, "Leave port");
  assert.equal(root.options.at(-1).placement, "port-exit");
  assert.equal(dialogueBackOptionIndex(root), root.options.length - 1);
});

test("host-handled city submenu actions preserve a valid session until handoff", () => {
  const city = {
    factionId: "portugal",
    tileId: 110,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const context = { shipStats: stats };
  const session = createPortDialogueSession(city, { admittedToPort: true });
  session.nodeId = "city-menu";
  session.cityMenuLocationId = "ship";

  const before = portDialogueView(session, city, gameState, economy, [city], context);
  const waitIndex = before.options.findIndex(({ action }) => action.type === "wait-in-port");
  assert.ok(waitIndex >= 0);
  assert.deepEqual(
    selectPortDialogueOption(
      session,
      city,
      gameState,
      economy,
      [city],
      waitIndex,
      context
    ),
    { closed: true, action: { type: "wait-in-port" } }
  );
  assert.equal(session.cityMenuLocationId, "ship");
  assert.equal(portDialogueView(session, city, gameState, economy, [city], context).speaker, "Your ship");
});

test("port dialogue fallback navigation returns an admitted session to the city", () => {
  const city = {
    tileId: 107,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const session = createPortDialogueSession(city, {
    admittedToPort: true,
    initialNodeId: "shipyard-purchase-confirm"
  });
  session.cityMenuLocationId = "shipyard";
  session.shipyardPurchaseListingId = "listing-1";
  session.shipyardPurchaseReturnNodeId = "shipyard";
  session.shipyardPurchasePending = true;
  session.feedback = "Confirm this exchange.";
  session.selectedIndex = 1;

  assert.equal(returnPortDialogueToCity(session), session);
  assert.equal(session.nodeId, "root");
  assert.equal(session.cityMenuLocationId, null);
  assert.equal(session.shipyardPurchaseListingId, null);
  assert.equal(session.shipyardPurchaseReturnNodeId, null);
  assert.equal(session.shipyardPurchasePending, false);
  assert.equal(session.feedback, null);
  assert.equal(session.selectedIndex, 0);

  const barredSession = createPortDialogueSession(city, {
    initialNodeId: "shipyard-purchase-confirm"
  });
  assert.throws(
    () => returnPortDialogueToCity(barredSession),
    /before the player is admitted/
  );
});

test("market rows put unit and bulk actions together and undo every purchase on the page", () => {
  const city = {
    tileId: 301,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 8 });
  gameState.doubloons = 100000;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  const initial = portDialogueView(session, city, gameState, economy, [city]);
  const buy = initial.options.find((entry) => entry.action.type === "buy");
  const buyMax = initial.options.find((entry) => (
    entry.action.type === "buy-max" && entry.action.goodId === buy.action.goodId
  ));

  assert.ok(buyMax.action.quantity > 1);
  assert.equal(buy.rowId, buyMax.rowId);
  const initialUndoIndex = initial.options.findIndex((entry) => entry.action.type === "undo-market");
  assert.ok(initialUndoIndex >= 0);
  assert.equal(initial.options[initialUndoIndex].disabled, true);
  assert.equal(initial.options[initialUndoIndex].placement, "port-exit");
  const port = economy.portStates.get(city.cityId);
  const before = {
    doubloons: gameState.doubloons,
    cargo: { ...gameState.cargo },
    cargoCostBasis: { ...gameState.accounts.cargoCostBasis },
    realizedPnl: gameState.accounts.realizedPnl,
    nextEntryId: gameState.accounts.nextEntryId,
    ledger: gameState.accounts.ledger.map((entry) => ({ ...entry })),
    decisions: { ...gameState.memory.decisions },
    factionReputation: { ...gameState.relations.factionReputation },
    specie: port.specie,
    stocks: Object.fromEntries([...port.goods].map(([goodId, state]) => [goodId, state.stock]))
  };

  const purchase = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    initial.options.indexOf(buyMax),
    { simMinute: 10 }
  );
  assert.equal(purchase.marketPurchase.quantity, buyMax.action.quantity);
  const changed = portDialogueView(session, city, gameState, economy, [city]);
  const undoIndex = changed.options.findIndex((entry) => entry.action.type === "undo-market");
  assert.equal(undoIndex, initialUndoIndex);
  assert.equal(changed.options[undoIndex].disabled, false);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], undoIndex),
    { closed: false }
  );
  assert.equal(session.nodeId, "market-undo-confirm");
  const confirmation = portDialogueView(session, city, gameState, economy, [city]);
  const confirmIndex = confirmation.options.findIndex((entry) => (
    entry.action.type === "confirm-market-undo"
  ));
  const undo = selectPortDialogueOption(session, city, gameState, economy, [city], confirmIndex);

  assert.ok(undo.marketUndo);
  assert.deepEqual({
    doubloons: gameState.doubloons,
    cargo: gameState.cargo,
    cargoCostBasis: gameState.accounts.cargoCostBasis,
    realizedPnl: gameState.accounts.realizedPnl,
    nextEntryId: gameState.accounts.nextEntryId,
    ledger: gameState.accounts.ledger,
    decisions: gameState.memory.decisions,
    factionReputation: gameState.relations.factionReputation,
    specie: port.specie,
    stocks: Object.fromEntries([...port.goods].map(([goodId, state]) => [goodId, state.stock]))
  }, before);
  assert.deepEqual(session.marketPurchases, {});
});

test("sell all is a paired market action and undo restores cargo, accounts, and port specie", () => {
  const city = {
    tileId: 302,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.wool = 4;
  gameState.accounts.cargoCostBasis.wool = 80;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  const initial = portDialogueView(session, city, gameState, economy, [city]);
  const sell = initial.options.find((entry) => entry.action.type === "sell" && entry.action.goodId === "wool");
  const sellAll = initial.options.find((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "wool"
  ));
  const port = economy.portStates.get(city.cityId);
  const before = {
    doubloons: gameState.doubloons,
    cargo: { ...gameState.cargo },
    cargoCostBasis: { ...gameState.accounts.cargoCostBasis },
    realizedPnl: gameState.accounts.realizedPnl,
    ledger: gameState.accounts.ledger.map((entry) => ({ ...entry })),
    specie: port.specie,
    woolStock: port.goods.get("wool").stock
  };

  assert.equal(sell.rowId, sellAll.rowId);
  assert.equal(sellAll.action.quantity, 4);
  const initialUndoIndex = initial.options.findIndex((entry) => entry.action.type === "undo-market");
  assert.ok(initialUndoIndex >= 0);
  assert.equal(initial.options[initialUndoIndex].disabled, true);
  assert.equal(initial.options[initialUndoIndex].placement, "port-exit");
  const sale = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    initial.options.indexOf(sellAll),
    { simMinute: 10 }
  );
  assert.equal(sale.marketSale.quantity, 4);
  assert.equal(gameState.cargo.wool, undefined);
  const changed = portDialogueView(session, city, gameState, economy, [city]);
  const undoIndex = changed.options.findIndex((entry) => entry.action.type === "undo-market");
  assert.equal(undoIndex, initialUndoIndex);
  assert.equal(changed.options[undoIndex].disabled, false);
  selectPortDialogueOption(session, city, gameState, economy, [city], undoIndex);
  assert.equal(session.nodeId, "market-undo-confirm");
  assert.equal(session.selectedIndex, 1);
  let confirmation = portDialogueView(session, city, gameState, economy, [city]);
  const cancelIndex = confirmation.options.findIndex((entry) => (
    entry.action.type === "cancel-market-undo"
  ));
  selectPortDialogueOption(session, city, gameState, economy, [city], cancelIndex);
  assert.equal(session.nodeId, "market");
  assert.equal(gameState.cargo.wool, undefined);
  const saleView = portDialogueView(session, city, gameState, economy, [city]);
  const repeatedUndoIndex = saleView.options.findIndex((entry) => entry.action.type === "undo-market");
  selectPortDialogueOption(session, city, gameState, economy, [city], repeatedUndoIndex);
  confirmation = portDialogueView(session, city, gameState, economy, [city]);
  const confirmIndex = confirmation.options.findIndex((entry) => (
    entry.action.type === "confirm-market-undo"
  ));
  selectPortDialogueOption(session, city, gameState, economy, [city], confirmIndex);

  assert.deepEqual({
    doubloons: gameState.doubloons,
    cargo: gameState.cargo,
    cargoCostBasis: gameState.accounts.cargoCostBasis,
    realizedPnl: gameState.accounts.realizedPnl,
    ledger: gameState.accounts.ledger,
    specie: port.specie,
    woolStock: port.goods.get("wool").stock
  }, before);
  assert.equal(session.marketSales, 0);
});

test("one market ledger undoes alternating purchases and sales together", () => {
  const city = {
    tileId: 304,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.doubloons = 100000;
  gameState.cargo.wool = 2;
  gameState.accounts.cargoCostBasis.wool = 160;
  const session = createPortDialogueSession(city, {
    initialNodeId: "market",
    marketMode: "buy"
  });
  const port = economy.portStates.get(city.cityId);
  const before = {
    doubloons: gameState.doubloons,
    cargo: { ...gameState.cargo },
    cargoCostBasis: { ...gameState.accounts.cargoCostBasis },
    realizedPnl: gameState.accounts.realizedPnl,
    ledger: gameState.accounts.ledger.map((entry) => ({ ...entry })),
    specie: port.specie,
    stocks: Object.fromEntries([...port.goods].map(([goodId, state]) => [goodId, state.stock]))
  };

  let view = portDialogueView(session, city, gameState, economy, [city]);
  assert.deepEqual(view.options.slice(0, 2).map((entry) => ({
    label: entry.label,
    placement: entry.placement
  })), [
    { label: "Buy", placement: "mode-switch" },
    { label: "Sell", placement: "mode-switch" }
  ]);
  const buyIndex = view.options.findIndex((entry) => entry.action.type === "buy" && !entry.disabled);
  selectPortDialogueOption(session, city, gameState, economy, [city], buyIndex);
  const sharedSnapshot = session.marketUndoSnapshot;
  assert.equal(portMarketTransactionSessionOpen(session), true);

  view = portDialogueView(session, city, gameState, economy, [city]);
  const sellModeIndex = view.options.findIndex((entry) => (
    entry.action.type === "switch-market-mode" && entry.action.mode === "sell"
  ));
  selectPortDialogueOption(session, city, gameState, economy, [city], sellModeIndex);
  assert.equal(session.marketMode, "sell");
  assert.equal(session.marketUndoSnapshot, sharedSnapshot);
  assert.equal(portMarketTransactionSessionOpen(session), true);

  view = portDialogueView(session, city, gameState, economy, [city]);
  const sellIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell" && entry.action.goodId === "wool" && !entry.disabled
  ));
  selectPortDialogueOption(session, city, gameState, economy, [city], sellIndex);
  assert.equal(session.marketTransactionCount, 2);
  assert.equal(session.marketUndoSnapshot, sharedSnapshot);

  view = portDialogueView(session, city, gameState, economy, [city]);
  const undoIndex = view.options.findIndex((entry) => entry.action.type === "undo-market");
  assert.equal(view.options[undoIndex].label, "Undo all trades");
  assert.equal(view.options[undoIndex].disabled, false);
  selectPortDialogueOption(session, city, gameState, economy, [city], undoIndex);
  assert.equal(portMarketTransactionSessionOpen(session), true);
  const confirmation = portDialogueView(session, city, gameState, economy, [city]);
  const confirmIndex = confirmation.options.findIndex((entry) => (
    entry.action.type === "confirm-market-undo"
  ));
  selectPortDialogueOption(session, city, gameState, economy, [city], confirmIndex);

  assert.deepEqual({
    doubloons: gameState.doubloons,
    cargo: gameState.cargo,
    cargoCostBasis: gameState.accounts.cargoCostBasis,
    realizedPnl: gameState.accounts.realizedPnl,
    ledger: gameState.accounts.ledger,
    specie: port.specie,
    stocks: Object.fromEntries([...port.goods].map(([goodId, state]) => [goodId, state.stock]))
  }, before);
  assert.equal(session.nodeId, "market");
  assert.equal(session.marketMode, "sell");
  assert.equal(session.selectedIndex, 1);
  assert.equal(session.marketTransactionCount, 0);
  assert.equal(portMarketTransactionSessionOpen(session), true);

  view = portDialogueView(session, city, gameState, economy, [city]);
  const leaveIndex = view.options.findIndex((entry) => entry.action.type === "leave-market");
  selectPortDialogueOption(session, city, gameState, economy, [city], leaveIndex, {
    sailingDistanceKm: () => 0
  });
  assert.equal(portMarketTransactionSessionOpen(session), false);
});

test("sell all remains actionable when only one unit is held", () => {
  const city = {
    tileId: 303,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.wool = 1;
  gameState.accounts.cargoCostBasis.wool = 20;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  const view = portDialogueView(session, city, gameState, economy, [city]);
  const sellAllIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "wool"
  ));

  assert.ok(sellAllIndex >= 0);
  assert.equal(view.options[sellAllIndex].action.quantity, 1);
  assert.equal(view.options[sellAllIndex].disabled, false);
  const sale = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    sellAllIndex,
    { simMinute: 10 }
  );

  assert.equal(sale.marketSale.quantity, 1);
  assert.equal(gameState.cargo.wool, undefined);
});

test("a factor warns before delivering Papally prohibited arms to Ottoman buyers", () => {
  const city = {
    tileId: 912,
    cityId: "istanbul|turkey",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Turkey",
    cityType: "mediterranean",
    population: 400000,
    factionId: "ottoman",
    character: { name: "Kemal Reis", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Joan Alden", nationalityId: "england", expressions: ["neutral"] }
  });
  gameState.cargo.gunpowder = 1;
  gameState.accounts.cargoCostBasis.gunpowder = 100;
  const papalStanding = factionReputation(gameState, "papal-states");
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, {
    initialNodeId: "market",
    marketMode: "sell",
    admittedToPort: true
  });
  const context = { simMinute: 100 };
  const sell = portDialogueView(session, city, gameState, economy, [city], context);
  const saleIndex = sell.options.findIndex((entry) => (
    entry.action.type === "sell" && entry.action.goodId === "gunpowder"
  ));
  assert.ok(saleIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], saleIndex, context);

  const warning = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(warning.text, /Holy See forbid this cargo to the buyers here/i);
  assert.match(warning.text, /customs books will bear your name/i);
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  assert.equal(result.marketSale.embargoOrders[0].restrictionKind, "strategic-exports");
  assert.equal(factionReputation(gameState, "papal-states"), papalStanding - 5);
});

test("sell all matches the same sequence of rounded prices as individual sales", () => {
  const city = {
    tileId: 304,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const port = economy.portStates.get(city.cityId);
  port.goods.get("wool").stock = 30;
  port.specie = 28;
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter: null });
  gameState.cargo.wool = 3;
  gameState.accounts.cargoCostBasis.wool = 24;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  const view = portDialogueView(session, city, gameState, economy, [city]);
  const sellAllIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "wool"
  ));

  assert.ok(sellAllIndex >= 0);
  assert.equal(view.options[sellAllIndex].disabled, false);
  assert.match(view.options[sellAllIndex].label, /24 db/);
  const sale = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    sellAllIndex,
    { simMinute: 10 }
  );

  assert.equal(sale.marketSale.quantity, 3);
  assert.equal(sale.marketSale.price, 24);
  assert.equal(gameState.cargo.wool, undefined);
  assert.equal(port.specie, 4);
});

test("market comparisons use pixel-font-safe directional wording", () => {
  assert.equal(worldPriceIndicator({ direction: "high", percent: 18 }), "18% ABOVE WORLD");
  assert.equal(worldPriceIndicator({ direction: "low", percent: -12 }), "12% BELOW WORLD");
  assert.equal(worldPriceIndicator({ direction: "fair", percent: 3 }), "= WORLD PRICE");
  assert.throws(
    () => worldPriceIndicator({ direction: "sideways", percent: 0 }),
    /Unknown world price direction/
  );
});

test("founded colonies state and display their 15% goods discount", () => {
  const city = {
    tileId: 109,
    cityId: "port royal|canada",
    city: "Port Royal",
    displayCity: "Port Royal",
    country: "Canada",
    factionId: "neutral",
    cityType: "northern-european",
    population: 2400,
    lat: 44.741944,
    lon: -65.515556,
    playerFoundedColony: true,
    purchaseDiscountMultiplier: 0.85,
    character: { name: "Jeanne Hebert", role: "harbour-master", personalityId: "warm" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.doubloons = 10000;

  const greetingSession = createPortDialogueSession(city, { initialNodeId: "greeting" });
  const greeting = portDialogueView(greetingSession, city, gameState, economy, [city]);
  assert.match(greeting.text, /15% off goods you buy/);

  const buySession = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  const buy = portDialogueView(buySession, city, gameState, economy, [city]);
  const marketRows = buy.options.filter((entry) => entry.action.type === "buy");
  assert.ok(marketRows.length > 0);
  assert.ok(marketRows.every((entry) => entry.detail.includes("FOUNDER -15%")));
  assert.equal(playerTradeTerms(gameState, city, marketRows[0].action.goodId).purchaseDiscountMultiplier, 0.85);
});

test("a developed Nagasaki port has its harbour master state the discount without calling the player its founder", () => {
  const city = {
    tileId: 110,
    cityId: "nagasaki|japan",
    city: "Nagasaki",
    displayCity: "Nagasaki",
    country: "Japan",
    factionId: "japan",
    cityType: "east-asian",
    population: 2400,
    lat: 32.75,
    lon: 129.88,
    playerDevelopedPort: true,
    purchaseDiscountMultiplier: 0.85,
    character: { name: "Ito Haru", role: "harbour-master", personalityId: "warm" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, { initialNodeId: "greeting" });
  const greeting = portDialogueView(session, city, gameState, economy, [city]);

  assert.match(greeting.text, /China ship has made Nagasaki a city/);
  assert.match(greeting.text, /15% off goods you buy/);
  assert.doesNotMatch(greeting.text, /founder/i);
  assert.match(greeting.speaker, /harbour master of Nagasaki/);
});

test("leaving the buy screen recommends the strongest distance-adjusted trade route", () => {
  const ternate = {
    tileId: 101,
    cityId: "ternate|indonesia",
    city: "Ternate",
    displayCity: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis", role: "harbour-master" }
  };
  const london = {
    tileId: 102,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "England",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const lisbon = {
    tileId: 103,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const ports = [ternate, london, lisbon];
  const sailingDistanceKm = testSailingDistances([
    [ternate, london, 14200],
    [ternate, lisbon, 15100]
  ]);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 1000;
  const session = createPortDialogueSession(ternate, { initialNodeId: "market", marketMode: "buy" });

  for (const goodId of ["fish", "cloves"]) {
    const market = portDialogueView(session, ternate, gameState, economy, ports);
    const index = market.options.findIndex((entry) => entry.action.goodId === goodId);
    assert.ok(index >= 0, `${goodId} must be offered in Ternate`);
    selectPortDialogueOption(session, ternate, gameState, economy, ports, index);
  }

  const expected = bestPurchasedTradeRoute({
    purchases: session.marketPurchases,
    originCity: ternate,
    gameState,
    economy,
    portCities: ports,
    sailingDistanceKm
  });
  assert.deepEqual(
    { good: expected.goodLabel, destination: expected.destinationName },
    { good: "Cloves", destination: "London" }
  );

  const market = portDialogueView(session, ternate, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-market");
  const result = selectPortDialogueOption(
    session,
    ternate,
    gameState,
    economy,
    ports,
    backIndex,
    { sailingDistanceKm }
  );
  assert.equal(result.tradeTip.expectedPnl, expected.expectedPnl);
  assert.equal(session.nodeId, "trade-tip");
  const tradeTip = portDialogueView(session, ternate, gameState, economy, ports);
  assert.equal(tradeTip.text, "I heard London pays a good price for Cloves.");
  assert.equal(tradeTip.options[0].label, "Set a heading for London");
  assert.deepEqual(
    selectPortDialogueOption(session, ternate, gameState, economy, ports, 0),
    {
      closed: false,
      action: {
        type: "set-port-heading",
        destinationCityId: london.cityId,
        destinationTileId: london.tileId,
        destinationName: "London",
        reason: "TRADE PRICE TIP",
        tradeGoodId: "cloves"
      }
    }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(session.tradeTip, null);
  assert.equal(session.feedback, "Heading set for London.");
});

test("trade advice scores net proceeds after customs and crown duties", () => {
  const ternate = {
    tileId: 114,
    cityId: "ternate|indonesia",
    city: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    factionId: "neutral"
  };
  const goa = {
    tileId: 115,
    cityId: "goa|india",
    city: "Goa",
    country: "India",
    cityType: "south-asian",
    lat: 15.49,
    lon: 73.83,
    population: 40000,
    factionId: "portugal"
  };
  const economy = createWorldEconomy({ ports: [ternate, goa], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral"]
    }
  });
  visitPort(gameState, goa, 0);
  const pairKey = diplomacyPairKey("england", "portugal");
  const purchases = {
    cloves: { goodId: "cloves", quantity: 1, cost: 100 }
  };
  gameState.cargo.cloves = 1;
  const sailingDistanceKm = testSailingDistances([[ternate, goa, 6800]]);
  const route = () => bestPurchasedTradeRoute({
    purchases,
    originCity: ternate,
    gameState,
    economy,
    portCities: [ternate, goa],
    sailingDistanceKm
  });

  gameState.relations.diplomacy.overrides[pairKey] = DIPLOMACY_FRIENDLY;
  const friendlyTerms = playerTradeTerms(gameState, goa, "cloves");
  const friendly = route();
  assert.equal(friendlyTerms.customsRate, 0.05);
  assert.equal(friendlyTerms.crownMonopoly, true);
  assert.equal(
    friendly.expectedPnl,
    quotePortPurchase(economy, goa, "cloves", 1, friendlyTerms.saleMultiplier) - 100
  );

  gameState.relations.diplomacy.overrides[pairKey] = DIPLOMACY_NEUTRAL;
  const neutralTerms = playerTradeTerms(gameState, goa, "cloves");
  const neutral = route();
  assert.equal(neutralTerms.customsRate, 0.1);
  assert.equal(
    neutral.expectedPnl,
    quotePortPurchase(economy, goa, "cloves", 1, neutralTerms.saleMultiplier) - 100
  );
  assert.ok(friendly.expectedPnl > neutral.expectedPnl);
  assert.ok(friendly.recommendationScore > neutral.recommendationScore);
});

test("trade advice prefers a useful regional price over a better transcontinental price", () => {
  const istanbul = {
    tileId: 110,
    cityId: "istanbul|turkey",
    city: "Istanbul",
    country: "Turkey",
    cityType: "islamic-desert",
    lat: 41.01,
    lon: 28.98,
    population: 180000,
    factionId: "neutral"
  };
  const cairo = {
    tileId: 111,
    cityId: "cairo|egypt",
    city: "Cairo",
    country: "Egypt",
    cityType: "islamic-desert",
    lat: 30.04,
    lon: 31.24,
    population: 120000,
    factionId: "neutral"
  };
  const wuhan = {
    tileId: 112,
    cityId: "wuhan|china",
    city: "Wuhan",
    country: "China",
    cityType: "east-asian",
    lat: 30.59,
    lon: 114.31,
    population: 150000,
    factionId: "neutral"
  };
  const ports = [istanbul, cairo, wuhan];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  economy.portStates.get(cairo.cityId).goods.get("silver").stock = 0;
  economy.portStates.get(wuhan.cityId).goods.get("silver").stock = 0;
  const gameState = createGameState({ cargoCapacity: 20 });
  const purchases = {
    silver: { goodId: "silver", quantity: 1, cost: 60 }
  };
  gameState.cargo.silver = 1;
  const sailingDistanceKm = testSailingDistances([
    [istanbul, cairo, 1250],
    [istanbul, wuhan, 10700]
  ]);
  const route = (destinations) => bestPurchasedTradeRoute({
    purchases,
    originCity: istanbul,
    gameState,
    economy,
    portCities: [istanbul, ...destinations],
    sailingDistanceKm
  });

  const cairoOnly = route([cairo]);
  const wuhanOnly = route([wuhan]);
  assert.ok(wuhanOnly.expectedPnl > cairoOnly.expectedPnl);
  assert.ok(wuhanOnly.distanceKm > cairoOnly.distanceKm * 5);

  const recommended = route([cairo, wuhan]);
  assert.equal(recommended.destinationName, "Cairo");
  assert.equal(recommended.goodLabel, "Silver");
});

test("leaving after reselling purchases only recommends the cargo still aboard", () => {
  const city = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", country: "Portugal",
    cityType: "mediterranean", population: 100000, factionId: "neutral",
    character: { name: "Merchant", role: "harbour-master" } };
  const destination = { ...city, cityId: "london|united kingdom", tileId: 2, city: "London" };
  const ports = [city, destination];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const context = { sailingDistanceKm: () => 1000 };
  for (const held of [1, 0]) {
    const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
    session.marketPurchases = { cloves: { goodId: "cloves", quantity: 3, cost: 3 } };
    session.marketSales = 3 - held;
    gameState.cargo = held ? { cloves: held } : {};
    gameState.accounts.cargoCostBasis = held ? { cloves: held } : {};
    const market = portDialogueView(session, city, gameState, economy, ports, context);
    const result = selectPortDialogueOption(session, city, gameState, economy, ports,
      market.options.findIndex(({ action }) => action.type === "leave-market"), context);
    if (held === 0) {
      assert.equal(result.tradeTip, undefined);
      assert.equal(session.nodeId, "root");
    } else {
      assert.equal(result.tradeTip.quantity, 1);
    }
  }
});

test("post-purchase trade advice uses the blended ledger cost basis", () => {
  const origin = {
    tileId: 210,
    cityId: "istanbul|turkey",
    city: "Istanbul",
    country: "Turkey",
    cityType: "islamic-desert",
    lat: 41.01,
    lon: 28.98,
    population: 180000,
    factionId: "neutral"
  };
  const destination = {
    tileId: 211,
    cityId: "mudanya|turkey",
    city: "Mudanya",
    country: "Turkey",
    cityType: "islamic-desert",
    lat: 40.19,
    lon: 29.06,
    population: 70000,
    factionId: "neutral"
  };
  const economy = createWorldEconomy({ ports: [origin, destination], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 2;
  gameState.accounts.cargoCostBasis.fish = 10000;

  const recommendation = bestPurchasedTradeRoute({
    purchases: {
      fish: { goodId: "fish", quantity: 1, cost: 1 }
    },
    originCity: origin,
    gameState,
    economy,
    portCities: [destination],
    sailingDistanceKm: testSailingDistances([[origin, destination, 140]])
  });

  assert.equal(recommendation, null);
});

test("leaving the buy screen without a purchase returns directly to port business", () => {
  const city = {
    tileId: 104,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  const market = portDialogueView(session, city, gameState, economy, [city]);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-market");

  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], backIndex, {
      sailingDistanceKm: () => 0
    }),
    { closed: false }
  );
  assert.equal(session.nodeId, "root");
});

test("leaving a market empty-handed can reveal a source for outstanding quest cargo", () => {
  const hafnarfjordur = {
    cityId: "hafnarfjordur|iceland",
    tileId: 106,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  };
  const ternate = {
    tileId: 107,
    cityId: "ternate|indonesia",
    city: "Ternate",
    country: "Ternate",
    factionId: "neutral",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis", role: "harbour-master" }
  };
  const london = {
    tileId: 108,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const ports = [ternate, london];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  economy.portStates.get(ternate.cityId).goods.get("wool").stock = 0;
  economy.portStates.get(london.cityId).goods.get("wool").stock = 20;
  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  maybeSpawnVikingLongshipQuest(gameState, hafnarfjordur, {
    spawnChance: 1,
    simMinute: 0
  });
  const sailingDistanceKm = testSailingDistances([[ternate, london, 14200]]);

  assert.deepEqual(bestQuestCargoSource({
    originCity: ternate,
    gameState,
    economy,
    portCities: ports,
    simMinute: 100,
    sailingDistanceKm,
    random: () => 0
  }), {
    goodId: "wool",
    goodLabel: "Wool",
    destinationCityId: london.cityId,
    destinationTileId: london.tileId,
    destinationName: "London",
    distanceKm: 14200
  });

  const session = createPortDialogueSession(ternate, { initialNodeId: "market", marketMode: "buy" });
  const market = portDialogueView(session, ternate, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-market");
  const hintResult = selectPortDialogueOption(
    session,
    ternate,
    gameState,
    economy,
    ports,
    backIndex,
    { simMinute: 100, sailingDistanceKm, random: () => 0 }
  );
  assert.equal(hintResult.questCargoTip.goodId, "wool");
  assert.equal(session.nodeId, "quest-cargo-tip");
  const hint = portDialogueView(session, ternate, gameState, economy, ports);
  assert.equal(hint.text, "If it's Wool you're looking for, I hear they have some at London.");
  assert.equal(hint.options[0].label, "Set a heading for London");

  assert.deepEqual(
    selectPortDialogueOption(session, ternate, gameState, economy, ports, 1, { simMinute: 100 }),
    { closed: false, questCargoHintDeclined: true }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(bestQuestCargoSource({
    originCity: ternate,
    gameState,
    economy,
    portCities: ports,
    simMinute: 100 + QUEST_CARGO_HINT_DECLINE_COOLDOWN_MINUTES - 1,
    sailingDistanceKm,
    random: () => 0
  }), null);

  const laterSession = createPortDialogueSession(ternate, { initialNodeId: "market", marketMode: "buy" });
  const laterMarket = portDialogueView(laterSession, ternate, gameState, economy, ports);
  selectPortDialogueOption(
    laterSession,
    ternate,
    gameState,
    economy,
    ports,
    laterMarket.options.findIndex((entry) => entry.action.type === "leave-market"),
    {
      simMinute: 100 + QUEST_CARGO_HINT_DECLINE_COOLDOWN_MINUTES,
      sailingDistanceKm,
      random: () => 0
    }
  );
  assert.deepEqual(
    selectPortDialogueOption(laterSession, ternate, gameState, economy, ports, 0),
    {
      closed: false,
      action: {
        type: "set-port-heading",
        destinationCityId: london.cityId,
        destinationTileId: london.tileId,
        destinationName: "London",
        reason: "QUEST CARGO SOURCE",
        questCargoGoodId: "wool"
      }
    }
  );
});

test("an outstanding quest cargo waypoint does not suppress hints for another good", () => {
  const origin = {
    tileId: 601,
    cityId: "ternate|indonesia",
    city: "Ternate",
    country: "Ternate",
    factionId: "neutral",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis", role: "harbour-master" }
  };
  const source = {
    tileId: 602,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const economy = createWorldEconomy({ ports: [origin, source], startMinute: 0 });
  const shipStats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  maybeSpawnVikingLongshipQuest(state, {
    cityId: "hafnarfjordur|iceland",
    tileId: 603,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  }, { spawnChance: 1, simMinute: 0 });
  maybeSpawnChefQuest(state, origin, {
    spawnChance: 1,
    simMinute: 0,
    availableIngredientGoodIds: new Set(["grain", "pepper", "wine", "olive-oil"])
  });
  for (const goodId of ["wool", "grain", "pepper", "wine", "olive-oil"]) {
    economy.portStates.get(origin.cityId).goods.get(goodId).stock = 0;
    economy.portStates.get(source.cityId).goods.get(goodId).stock = 20;
  }
  addPortNavigationWaypoint(state, {
    destinationCityId: source.cityId,
    destinationTileId: source.tileId,
    destinationName: "London",
    reason: "QUEST CARGO SOURCE",
    questCargoGoodId: "wool"
  });

  const hint = bestQuestCargoSource({
    originCity: origin,
    gameState: state,
    economy,
    portCities: [origin, source],
    simMinute: 100,
    sailingDistanceKm: testSailingDistances([[origin, source, 14200]]),
    random: () => 0
  });

  assert.equal(hint.goodId, "grain");
  assert.equal(hint.destinationTileId, source.tileId);
});

test("a sold-out quest cargo waypoint is replaced by a fresh source", () => {
  const origin = {
    cityId: "ternate|indonesia", tileId: 611, city: "Ternate", country: "Ternate", factionId: "neutral",
    cityType: "southeast-asian", lat: 0.79, lon: 127.38, population: 25000
  };
  const stale = {
    cityId: "malacca|malaysia", tileId: 612, city: "Malacca", country: "Malacca", factionId: "neutral",
    cityType: "southeast-asian", lat: 2.19, lon: 102.25, population: 60000
  };
  const fresh = {
    cityId: "sakai|japan", tileId: 613, city: "Sakai", country: "Japan", factionId: "neutral",
    cityType: "east-asian", lat: 34.57, lon: 135.48, population: 50000
  };
  const economy = createWorldEconomy({ ports: [origin, stale, fresh], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  maybeSpawnVikingLongshipQuest(state, {
    cityId: "hafnarfjordur|iceland",
    tileId: 614, city: VIKING_LONGSHIP_PORT_CITY, country: "Iceland"
  }, { spawnChance: 1, simMinute: 0 });
  economy.portStates.get(origin.cityId).goods.get("wool").stock = 0;
  economy.portStates.get(stale.cityId).goods.get("wool").stock = 0;
  economy.portStates.get(fresh.cityId).goods.get("wool").stock = 10;
  addPortNavigationWaypoint(state, {
    destinationCityId: stale.cityId,
    destinationTileId: stale.tileId,
    destinationName: stale.city,
    reason: "QUEST CARGO SOURCE",
    questCargoGoodId: "wool"
  });

  const hint = bestQuestCargoSource({
    originCity: origin,
    gameState: state,
    economy,
    portCities: [origin, stale, fresh],
    simMinute: 100,
    sailingDistanceKm: testSailingDistances([[origin, stale, 1000], [origin, fresh, 2200]]),
    random: () => 0
  });
  assert.equal(hint.destinationTileId, fresh.tileId);
  addPortNavigationWaypoint(state, {
    destinationCityId: fresh.cityId,
    destinationTileId: fresh.tileId,
    destinationName: fresh.city,
    reason: "QUEST CARGO SOURCE",
    questCargoGoodId: "wool"
  });
  assert.deepEqual(
    state.memory.navigation.optionalWaypoints
      .filter((waypoint) => waypoint.questCargoGoodId === "wool")
      .map((waypoint) => waypoint.destinationTileId),
    [fresh.tileId]
  );
});

test("market buy controls subtly mark goods still needed for quests", () => {
  const city = {
    tileId: 604,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000,
    character: { name: "Thomas More", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  for (const [goodId, goodState] of economy.portStates.get(city.cityId).goods) {
    goodState.stock = goodId === "wool" ? 20 : 0;
  }
  const shipStats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  maybeSpawnVikingLongshipQuest(state, {
    cityId: "hafnarfjordur|iceland",
    tileId: 605,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  }, { spawnChance: 1, simMinute: 0 });

  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  const view = portDialogueView(session, city, state, economy, [city]);
  const woolControls = view.options.filter((entry) => entry.action.goodId === "wool");
  assert.equal(woolControls.length, 2);
  assert.ok(woolControls.every((entry) => entry.emphasis === "quest-cargo"));

  state.cargo.wool = 8;
  const stockedSession = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "buy" });
  const stockedView = portDialogueView(stockedSession, city, state, economy, [city]);
  assert.ok(stockedView.options
    .filter((entry) => entry.action.goodId === "wool")
    .every((entry) => entry.emphasis === undefined));
});

test("quest cargo sale controls are red and warn once per port visit", () => {
  const city = {
    tileId: 606,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000,
    character: { name: "Thomas More", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "concerned"]
    }
  });
  maybeSpawnVikingLongshipQuest(state, {
    cityId: "hafnarfjordur|iceland",
    tileId: 607,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  }, { spawnChance: 1, simMinute: 0 });
  state.cargo.wool = 8;

  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  let view = portDialogueView(session, city, state, economy, [city]);
  const woolControls = view.options.filter((entry) => entry.action.goodId === "wool");
  assert.equal(woolControls.length, 2);
  assert.ok(woolControls.every((entry) => entry.emphasis === "quest-cargo-danger"));

  const sellOneIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell" && entry.action.goodId === "wool"
  ));
  selectPortDialogueOption(session, city, state, economy, [city], sellOneIndex);
  assert.equal(session.nodeId, "quest-cargo-sale-warning");
  assert.equal(state.cargo.wool, 8);
  view = portDialogueView(session, city, state, economy, [city]);
  assert.match(view.text, /need our wool for a commission/i);

  const confirmIndex = view.options.findIndex((entry) => (
    entry.action.type === "confirm-quest-cargo-sale"
  ));
  selectPortDialogueOption(session, city, state, economy, [city], confirmIndex);
  assert.equal(session.nodeId, "market");
  assert.equal(state.cargo.wool, 7);

  view = portDialogueView(session, city, state, economy, [city]);
  const secondSaleIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell" && entry.action.goodId === "wool"
  ));
  selectPortDialogueOption(session, city, state, economy, [city], secondSaleIndex);
  assert.equal(session.nodeId, "market");
  assert.equal(state.cargo.wool, 6);
});

test("trade advice never recommends reselling cargo bought for a quest", () => {
  const origin = {
    tileId: 608,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const destination = {
    tileId: 609,
    cityId: "bordeaux|france",
    city: "Bordeaux",
    country: "France",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 44.84,
    lon: -0.58,
    population: 50000
  };
  const economy = createWorldEconomy({ ports: [origin, destination], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  maybeSpawnVikingLongshipQuest(state, {
    cityId: "hafnarfjordur|iceland",
    tileId: 610,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  }, { spawnChance: 1, simMinute: 0 });
  state.cargo.wool = 1;

  assert.equal(bestPurchasedTradeRoute({
    purchases: { wool: { goodId: "wool", quantity: 1, cost: 1 } },
    originCity: origin,
    gameState: state,
    economy,
    portCities: [origin, destination],
    sailingDistanceKm: () => 800
  }), null);
});

test("leaving the sell screen without a sale recommends a market for held trade goods", () => {
  const ternate = {
    tileId: 105,
    cityId: "ternate|indonesia",
    city: "Ternate",
    displayCity: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis", role: "harbour-master" }
  };
  const london = {
    tileId: 106,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "England",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const ports = [ternate, london];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.cloves = 2;
  gameState.accounts.cargoCostBasis.cloves = 0;
  const session = createPortDialogueSession(ternate, { initialNodeId: "market", marketMode: "sell" });
  const market = portDialogueView(session, ternate, gameState, economy, ports);
  const backIndex = dialogueBackOptionIndex(market);
  assert.equal(market.options[backIndex].action.type, "leave-market");

  const result = selectPortDialogueOption(session, ternate, gameState, economy, ports, backIndex, {
    sailingDistanceKm: testSailingDistances([[ternate, london, 14200]])
  });

  assert.equal(result.tradeTip.goodLabel, "Cloves");
  assert.equal(result.tradeTip.destinationName, "London");
  assert.equal(session.nodeId, "trade-tip");
  assert.equal(
    portDialogueView(session, ternate, gameState, economy, ports).text,
    "I heard London pays a good price for Cloves."
  );
});

test("held-cargo price advice does not recommend a loss-making destination", () => {
  const ternate = {
    tileId: 205,
    cityId: "ternate|indonesia",
    city: "Ternate",
    displayCity: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis", role: "harbour-master" }
  };
  const london = {
    tileId: 206,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "England",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const ports = [ternate, london];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.cloves = 2;
  gameState.accounts.cargoCostBasis.cloves = 100000;
  const session = createPortDialogueSession(ternate, { initialNodeId: "market", marketMode: "sell" });
  const market = portDialogueView(session, ternate, gameState, economy, ports);
  const backIndex = dialogueBackOptionIndex(market);

  const result = selectPortDialogueOption(session, ternate, gameState, economy, ports, backIndex, {
    sailingDistanceKm: testSailingDistances([[ternate, london, 14200]])
  });

  assert.deepEqual(result, { closed: false });
  assert.equal(session.tradeTip, null);
  assert.equal(session.nodeId, "root");
});

test("quest cargo advice prefers a nearby stocked market over a distant producer", () => {
  const hafnarfjordur = {
    cityId: "hafnarfjordur|iceland",
    tileId: 109,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  };
  const london = {
    tileId: 110,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const bristol = {
    tileId: 111,
    cityId: "bristol|england",
    city: "Bristol",
    country: "England",
    factionId: "neutral",
    cityType: "northern-european",
    lat: 51.45,
    lon: -2.59,
    population: 20000
  };
  const sakai = {
    tileId: 112,
    cityId: "sakai|japan",
    city: "Sakai",
    country: "Japan",
    factionId: "neutral",
    cityType: "east-asian",
    lat: 34.57,
    lon: 135.48,
    population: 50000
  };
  const ports = [london, bristol, sakai];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const londonWool = economy.portStates.get(london.cityId).goods.get("wool");
  const bristolWool = economy.portStates.get(bristol.cityId).goods.get("wool");
  const sakaiWool = economy.portStates.get(sakai.cityId).goods.get("wool");
  londonWool.stock = 0;
  bristolWool.stock = 5;
  bristolWool.productionPerDay = 0;
  sakaiWool.stock = 20;
  sakaiWool.productionPerDay = 2;

  const shipStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, shipStats });
  maybeSpawnVikingLongshipQuest(gameState, hafnarfjordur, {
    spawnChance: 1,
    simMinute: 0
  });

  assert.deepEqual(bestQuestCargoSource({
    originCity: london,
    gameState,
    economy,
    portCities: ports,
    simMinute: 100,
    sailingDistanceKm: testSailingDistances([
      [london, bristol, 190],
      [london, sakai, 20500]
    ]),
    random: () => 0
  }), {
    goodId: "wool",
    goodLabel: "Wool",
    destinationCityId: bristol.cityId,
    destinationTileId: bristol.tileId,
    destinationName: "Bristol",
    distanceKm: 190
  });
});

test("held-cargo price advice prefers a distant profit over a nearby loss", () => {
  const origin = {
    tileId: 207,
    cityId: "istanbul|ottoman empire",
    city: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 41.01,
    lon: 28.98,
    population: 180000,
    factionId: "neutral",
    character: { name: "Kemal Reis", role: "harbour-master" }
  };
  const nearby = {
    tileId: 208,
    cityId: "mudanya|turkey",
    city: "Mudanya",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 40.19,
    lon: 29.06,
    population: 70000,
    factionId: "neutral"
  };
  const distant = {
    tileId: 209,
    cityId: "london|united kingdom",
    city: "London",
    country: "England",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000,
    factionId: "neutral"
  };
  const ports = [origin, nearby, distant];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  economy.portStates.get(origin.cityId).goods.get("fish").stock *= 100;
  economy.portStates.get(nearby.cityId).goods.get("fish").stock *= 100;
  economy.portStates.get(distant.cityId).goods.get("fish").stock = 0;
  const nearbyRevenue = quotePortPurchase(economy, nearby, "fish", 1);
  const distantRevenue = quotePortPurchase(economy, distant, "fish", 1);
  assert.ok(distantRevenue > nearbyRevenue);

  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 1;
  gameState.accounts.cargoCostBasis.fish = (nearbyRevenue + distantRevenue) / 2;
  const session = createPortDialogueSession(origin, { initialNodeId: "market", marketMode: "sell" });
  const market = portDialogueView(session, origin, gameState, economy, ports);
  const backIndex = dialogueBackOptionIndex(market);
  const result = selectPortDialogueOption(session, origin, gameState, economy, ports, backIndex, {
    sailingDistanceKm: testSailingDistances([
      [origin, nearby, 140],
      [origin, distant, 3600]
    ])
  });

  assert.equal(result.tradeTip.destinationName, "London");
  assert.ok(result.tradeTip.expectedPnl > 0);
  assert.equal(session.nodeId, "trade-tip");
});

test("trade advice praises the current port when its cargo price leads the local area", () => {
  const istanbul = {
    tileId: 107,
    cityId: "istanbul|ottoman empire",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 41.01,
    lon: 28.98,
    population: 180000,
    factionId: "neutral",
    character: { name: "Kemal Reis", role: "harbour-master" }
  };
  const mudanya = {
    tileId: 108,
    cityId: "mudanya|turkey",
    city: "Mudanya",
    displayCity: "Mudanya",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 40.19,
    lon: 29.06,
    population: 70000,
    factionId: "neutral"
  };
  const ports = [istanbul, mudanya];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const istanbulFish = economy.portStates.get(istanbul.cityId).goods.get("fish");
  const mudanyaFish = economy.portStates.get(mudanya.cityId).goods.get("fish");
  istanbulFish.stock = 0;
  mudanyaFish.stock = mudanyaFish.targetStock * 100;
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 2;
  gameState.accounts.cargoCostBasis.fish = 0;
  const session = createPortDialogueSession(istanbul, { initialNodeId: "market", marketMode: "sell" });
  const sailingDistanceKm = testSailingDistances([[istanbul, mudanya, 140]]);
  const market = portDialogueView(session, istanbul, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-market");

  assert.ok(
    quotePortPurchase(economy, istanbul, "fish", 2) >
      quotePortPurchase(economy, mudanya, "fish", 2)
  );
  const result = selectPortDialogueOption(
    session,
    istanbul,
    gameState,
    economy,
    ports,
    backIndex,
    { sailingDistanceKm }
  );

  assert.equal(result.tradeTip.localMarket, true);
  assert.equal(result.tradeTip.destinationName, "Istanbul");
  const advice = portDialogueView(session, istanbul, gameState, economy, ports);
  assert.equal(advice.text, "You won't find a better price for Fish around this area.");
  assert.deepEqual(advice.options.map((entry) => entry.label), ["Back to city"]);

  istanbulFish.stock = istanbulFish.targetStock * 100;
  mudanyaFish.stock = 0;
  const destinationSession = createPortDialogueSession(istanbul, { initialNodeId: "market", marketMode: "sell" });
  const destinationMarket = portDialogueView(
    destinationSession,
    istanbul,
    gameState,
    economy,
    ports
  );
  const destinationBackIndex = destinationMarket.options.findIndex(
    (entry) => entry.action.type === "leave-market"
  );
  const destinationResult = selectPortDialogueOption(
    destinationSession,
    istanbul,
    gameState,
    economy,
    ports,
    destinationBackIndex,
    { sailingDistanceKm }
  );

  assert.equal(destinationResult.tradeTip.localMarket, false);
  assert.equal(destinationResult.tradeTip.destinationName, "Mudanya");
  const destinationAdvice = portDialogueView(
    destinationSession,
    istanbul,
    gameState,
    economy,
    ports
  );
  assert.equal(destinationAdvice.text, "I heard Mudanya pays a good price for Fish.");
  assert.equal(destinationAdvice.options[0].label, "Set a heading for Mudanya");
});

test("leaving the sell screen with no sellable cargo returns directly to port business", () => {
  const city = {
    tileId: 109,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.hardtack = 1;
  gameState.accounts.cargoCostBasis.hardtack = 2;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  const market = portDialogueView(session, city, gameState, economy, [city]);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-market");

  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], backIndex),
    { closed: false }
  );
  assert.equal(session.nodeId, "root");
});

test("leaving the sell screen after a completed sale does not offer trade advice", () => {
  const porto = {
    tileId: 107,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 41.16,
    lon: -8.63,
    population: 50000,
    character: { name: "Ines Carvalho", role: "harbour-master" }
  };
  const london = {
    tileId: 108,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "England",
    cityType: "northern-european",
    lat: 51.51,
    lon: -0.13,
    population: 70000
  };
  const ports = [porto, london];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.cloves = 2;
  gameState.accounts.cargoCostBasis.cloves = 20;
  const session = createPortDialogueSession(porto, { initialNodeId: "market", marketMode: "sell" });
  let market = portDialogueView(session, porto, gameState, economy, ports);
  const sellIndex = market.options.findIndex((entry) => entry.action.goodId === "cloves");
  selectPortDialogueOption(session, porto, gameState, economy, ports, sellIndex);
  market = portDialogueView(session, porto, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-market");

  assert.deepEqual(
    selectPortDialogueOption(session, porto, gameState, economy, ports, backIndex, {
      sailingDistanceKm: testSailingDistances([[porto, london, 1800]])
    }),
    { closed: false }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(session.tradeTip, null);
  assert.equal(gameState.cargo.cloves, 1);
  assert.equal(session.marketUndoSnapshot, null);
});

test("selling all cloves and leaving the market cannot restore the departed cargo", () => {
  const city = {
    tileId: 109,
    cityId: "malaga|spain",
    city: "Malaga",
    country: "Spain",
    cityType: "mediterranean",
    factionId: "spain",
    population: 55000,
    character: { name: "Beatriz de Mendoza", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.cloves = 6;
  gameState.accounts.cargoCostBasis.cloves = 120;
  const session = createPortDialogueSession(city, { initialNodeId: "market", marketMode: "sell" });
  let view = portDialogueView(session, city, gameState, economy, [city]);
  const sellAllIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "cloves"
  ));

  selectPortDialogueOption(session, city, gameState, economy, [city], sellAllIndex);
  assert.equal(gameState.cargo.cloves, undefined);
  view = portDialogueView(session, city, gameState, economy, [city]);
  const backIndex = view.options.findIndex((entry) => entry.action.type === "leave-market");
  selectPortDialogueOption(session, city, gameState, economy, [city], backIndex);

  assert.equal(session.nodeId, "root");
  assert.equal(session.marketUndoSnapshot, null);
  assert.equal(gameState.cargo.cloves, undefined);
  view = portDialogueView(session, city, gameState, economy, [city]);
  const leavePortIndex = view.options.findIndex((entry) => entry.action.type === "close");
  const departure = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    leavePortIndex
  );
  assert.equal(departure.closed, true);
  assert.equal(gameState.cargo.cloves, undefined);
});

test("the first port requires a chunky loadout choice and provisions the ship", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "loadout" });
  const context = { shipStats: stats, simMinute: 120 };

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.optionHeight, 34);
  assert.deepEqual(view.options.map((option) => option.label), [
    "LONG HAUL",
    "SHORT HAUL",
    "COMBAT FOCUSED",
    "BALANCED",
    "CUSTOM"
  ]);
  assert.ok(view.options.slice(0, 4).every(
    (option) => /CREW \d+  GUNS \d+  FOOD \d+D  WATER \d+D/.test(option.detail)
  ));
  assert.equal(view.options[4].detail, "SET CREW, GUNS, FOOD, AND WATER");

  const before = gameState.doubloons;
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 3, context);
  assert.equal(gameState.ship.loadoutId, "balanced");
  assert.equal(session.nodeId, "root");
  assert.ok(result.loadoutResult.plan.totalSpace <= stats.cargoCapacity);
  assert.ok(gameState.doubloons <= before);
  assert.match(session.feedback, /Balanced:/);
});

test("port crew offers show individuals and hire the selected sailor", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60_000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  setTestCrewCount(gameState, 1);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const offer = createCrewRecruitmentOffer({
    memory: gameState.memory.crewRecruitment,
    state: gameState,
    city,
    simMinute: 100,
    targetCrew: gameState.ship.loadoutTargets.crew,
    appearances: [{ appearanceId: "mariner-light-black-hair", crewTypeId: "sailor" }],
    identityForKey: () => ({
      name: "Mateo",
      nameCulture: "spanish",
      religionId: "roman-catholic",
      nationalityId: "spain"
    }),
    baseHireCost: 2
  });
  const session = createPortDialogueSession(city, { initialNodeId: "crew-recruitment" });
  const context = { shipStats: stats, simMinute: 120 };
  let view = portDialogueView(session, city, gameState, economy, [city], context);
  const offeredCount = offer.candidates.length;

  assert.equal(view.presentation.kind, "crew-recruitment");
  assert.equal(view.presentation.candidates.length, offer.candidates.length);
  assert.match(view.text, /offered to join/);
  const candidate = view.presentation.candidates[0];
  const beforeDoubloons = gameState.doubloons;
  const hired = selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);

  assert.equal(hired.crewHire.member.id, candidate.member.id);
  assert.equal(gameState.crewRoster.at(-1).id, candidate.member.id);
  assert.equal(gameState.ship.crew, 2);
  assert.equal(gameState.doubloons, beforeDoubloons - candidate.cost);
  assert.equal(crewRecruitmentOfferAt(gameState.memory.crewRecruitment, city).candidates.length,
    offeredCount - 1);

  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.presentation.candidates.some(({ member }) => member.id === candidate.member.id), false);
});

test("crew recruitment presents a clean empty state when no hands are available", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60_000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  createCrewRecruitmentOffer({
    memory: gameState.memory.crewRecruitment,
    state: gameState,
    city,
    simMinute: 100,
    targetCrew: gameState.ship.crew,
    appearances: [{ appearanceId: "mariner-light-black-hair", crewTypeId: "sailor" }],
    identityForKey: () => ({
      name: "Mateo",
      nameCulture: "spanish",
      religionId: "roman-catholic",
      nationalityId: "spain"
    }),
    baseHireCost: 2,
    allowEmpty: true
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "crew-recruitment" });
  const view = portDialogueView(session, city, gameState, economy, [city], { simMinute: 120 });

  assert.deepEqual(view.presentation.candidates, []);
  assert.match(view.text, /No suitable hands/);
  assert.deepEqual(view.options.map(({ label }) => label), ["Back to inn"]);
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  assert.equal(result.closed, false);
  assert.equal(session.nodeId, "inn-drink");
  const inn = portDialogueView(session, city, gameState, economy, [city], {
    simMinute: 120,
    innDialogue: { speaker: "Captain", expressionId: "neutral", text: "The ale is sound." }
  });
  assert.ok(inn.options.some(({ action }) => action.type === "open-crew-management"));
});

test("the inn routes crew management to the shared aboard roster", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60_000,
    character: { name: "Isabel Mendez", role: "innkeeper" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  setTestCrewCount(gameState, 4);
  const loadoutId = gameState.ship.loadoutId;
  const initialCrew = gameState.ship.crew;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, {
    initialNodeId: "inn-drink",
    admittedToPort: true
  });
  const context = {
    shipStats: stats,
    simMinute: 120,
    innDialogue: { speaker: "Captain", expressionId: "neutral", text: "The ale is sound." }
  };

  let view = portDialogueView(session, city, gameState, economy, [city], context);
  const manageIndex = view.options.findIndex(({ action }) => action.type === "open-crew-management");
  assert.ok(manageIndex >= 0);
  assert.ok(view.options.some(({ action }) => action.type === "open-crew-recruitment"));
  const result = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    manageIndex,
    context
  );
  assert.deepEqual(result.action, { type: "open-crew-management" });
  assert.equal(session.nodeId, "inn-drink");
  assert.equal(gameState.ship.loadoutId, loadoutId);
  assert.equal(gameState.ship.crew, initialCrew);
});

test("captain-led inn dialogue builds city navigation without treating the captain as port staff", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60_000,
    character: { name: "Catalina", role: "player-captain" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, {
    initialNodeId: "inn-drink",
    admittedToPort: true
  });

  const view = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    simMinute: 120,
    innDialogue: { speaker: "Catalina", expressionId: "neutral", text: "The ale is sound." }
  });

  assert.equal(view.speaker, "Catalina");
  assert.ok(view.options.some(({ action }) => action.type === "open-crew-recruitment"));
  assert.ok(view.options.some(({ action }) => action.type === "open-crew-management"));
});

test("lower loadouts require individual dismissals and support undo all", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60_000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  setTestCrewCount(gameState, 13);
  const initialIds = gameState.crewRoster.map(({ id }) => id);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "loadout" });
  const context = { shipStats: stats, simMinute: 120 };
  const originalLoadoutId = gameState.ship.loadoutId;

  let view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.options[1].detailTone, "danger");

  selectPortDialogueOption(session, city, gameState, economy, [city], 1, context);
  assert.equal(session.nodeId, "crew-dismissal");
  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.presentation.kind, "crew-dismissal");
  assert.equal(view.presentation.targetCrew, 12);
  assert.equal(view.presentation.loadoutLabel, "Short haul");
  assert.equal(view.presentation.remainingDismissals, 1);
  assert.match(view.text, /dismiss 1 more crewmate/i);

  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  assert.equal(gameState.ship.crew, 12);
  assert.equal(gameState.ship.loadoutId, originalLoadoutId);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const undoIndex = view.options.findIndex(({ action }) => action.type === "undo-crew-dismissals");
  selectPortDialogueOption(session, city, gameState, economy, [city], undoIndex, context);
  assert.equal(gameState.ship.crew, 13);
  assert.deepEqual(gameState.crewRoster.map(({ id }) => id), initialIds);

  view = portDialogueView(session, city, gameState, economy, [city], context);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const cancelIndex = view.options.findIndex(({ action }) => action.type === "cancel-crew-dismissal");
  selectPortDialogueOption(session, city, gameState, economy, [city], cancelIndex, context);
  assert.equal(gameState.ship.crew, 13);
  assert.deepEqual(gameState.crewRoster.map(({ id }) => id), initialIds);
  assert.equal(gameState.ship.loadoutId, originalLoadoutId);
  assert.equal(session.nodeId, "loadout");
  assert.equal(session.feedback, "All dismissals undone.");

  selectPortDialogueOption(session, city, gameState, economy, [city], 1, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  const applyIndex = view.options.findIndex(({ action }) => action.type === "confirm-crew-dismissal");
  const applied = selectPortDialogueOption(session, city, gameState, economy, [city], applyIndex, context);
  assert.equal(applied.crewDismissalsCommitted, true);
  assert.equal(gameState.ship.crew, 12);
  assert.equal(gameState.ship.loadoutId, "short-haul");
  assert.equal(session.nodeId, "root");
});

test("dismissing the newest crew keeps the muster on the new final page", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60_000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  setTestCrewCount(gameState, stats.crewCapacity);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "loadout" });
  const context = { shipStats: stats, simMinute: 120 };

  selectPortDialogueOption(session, city, gameState, economy, [city], 4, context);
  setPortCustomLoadoutValue(session, stats, "crew", 10);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  assert.equal(session.nodeId, "crew-dismissal");
  assert.equal(session.selectedIndex, gameState.crewRoster.length - 1);

  for (let dismissedCount = 0; dismissedCount < 4; dismissedCount += 1) {
    const view = portDialogueView(session, city, gameState, economy, [city], context);
    const newest = view.presentation.candidates.at(-1).member;
    const newestIndex = view.options.findIndex(({ action }) => action.memberId === newest.id);
    selectPortDialogueOption(session, city, gameState, economy, [city], newestIndex, context);
    assert.equal(session.selectedIndex, gameState.crewRoster.length - 1);
  }
});

test("custom loadout opens a slider model and reports discarded provisions", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "loadout" });
  const context = { shipStats: stats, simMinute: 120 };

  selectPortDialogueOption(session, city, gameState, economy, [city], 4, context);
  let view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(session.nodeId, "custom-loadout");
  assert.equal(view.presentation.kind, "custom-loadout");
  assert.equal(view.presentation.shipLabel, "Brigantine");
  assert.ok(view.presentation.crewWorkMultiplier > 1);
  assert.equal(view.presentation.cannonReloadPercent, 100);
  assert.deepEqual(view.options.map((entry) => [entry.label, entry.placement]), [
    ["Apply custom loadout", "port-exit"],
    ["Back", "port-exit"]
  ]);
  assert.deepEqual(view.presentation.fields.map((field) => field.key), [
    "crew", "cannons", "foodUnits", "waterUnits"
  ]);

  const crewBounds = view.presentation.fields.find((field) => field.key === "crew").bounds;
  const initialMultiplier = view.presentation.crewWorkMultiplier;
  setPortCustomLoadoutValue(session, stats, "crew", crewBounds.max);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(view.presentation.crewWorkMultiplier > initialMultiplier);
  setPortCustomLoadoutValue(session, stats, "crew", crewBounds.min);

  setPortCustomLoadoutValue(session, stats, "foodUnits", 1);
  setPortCustomLoadoutValue(session, stats, "waterUnits", 2);
  setPortCustomLoadoutValue(session, stats, "cannons", stats.cannons);
  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(view.presentation.cannonReloadPercent < 100);
  gameState.cargo.hardtack = 5;
  gameState.survival.freshWaterCapacity = 6;
  gameState.survival.freshWater = 6;
  view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.presentation.plan.reserveSpace, stats.cargoCapacity - view.presentation.plan.totalSpace);
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);

  assert.equal(gameState.ship.loadoutId, "custom");
  assert.equal(gameState.cargo.hardtack, 1);
  assert.equal(gameState.survival.freshWater, 2);
  assert.equal(result.loadoutResult.plan.foodUnits, 1);
  assert.equal(result.loadoutResult.plan.waterUnits, 2);
  assert.match(session.feedback, /Offloaded 4 food \/ 4 water/);
});

test("custom loadout feedback never exposes scientific notation for fractional stores", () => {
  const city = {
    tileId: 9,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60000,
    character: { name: "Isabel Mendez", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  initializeProvisionalShipLoadout(gameState, stats);
  gameState.cargo.hardtack = 5 / 12;
  gameState.accounts.cargoCostBasis.hardtack = 5;
  gameState.survival.freshWaterCapacity = 3;
  gameState.survival.freshWater = 3;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "loadout" });
  const context = { shipStats: stats, simMinute: 120 };

  selectPortDialogueOption(session, city, gameState, economy, [city], 4, context);
  setPortCustomLoadoutValue(session, stats, "foodUnits", 1);
  setPortCustomLoadoutValue(session, stats, "waterUnits", 3);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);

  assert.doesNotMatch(session.feedback, /Dumped/);
  assert.doesNotMatch(session.feedback, /\d[eE][+-]?\d/);
});

test("an already active banquet chef waits for a permanent berth before joining", () => {
  const city = {
    tileId: 44,
    cityId: "istanbul|ottoman empire",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    population: 100000,
    character: { name: "Kemal Aydin", role: "harbour-master" }
  };
  const stats = {
    slug: "two-berth-craft",
    cargoCapacity: 20,
    crewCapacity: 2,
    cannons: 0,
    mass: 10,
    navalWeaponKind: null
  };
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const quest = maybeSpawnChefQuest(gameState, city, { simMinute: 0, spawnChance: 1 });
  setTestCrewCount(gameState, gameState.ship.crewCapacity);
  addNamedCrewMember(gameState, {
    id: "existing-chef",
    name: "Existing Chef",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_CHEF, { replaceGenericWhenFull: true });
  for (const ingredient of quest.ingredients) gameState.cargo[ingredient.goodId] = 1;
  for (const ingredient of quest.ingredients) {
    deliverQuestCargoRequirement(
      gameState,
      city,
      ingredient.goodId,
      1,
      ingredient.requirementId
    );
  }
  prepareChefBanquet(gameState, city);
  serveChefBanquet(gameState, city, 50);
  completeChefBanquet(gameState, city, 100);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "chef-quest" });
  const view = portDialogueView(session, city, gameState, economy, [city]);
  const recruit = view.options.find((entry) => entry.action.type === "recruit-chef");
  assert.equal(recruit.disabled, true);
  assert.match(recruit.disabledReason, /berth/);
});

test("the banquet chef accepts ingredients across separate visits", () => {
  const city = {
    lat: 41.01,
    lon: 28.97,
    tileId: 45,
    cityId: "istanbul|ottoman empire",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    population: 100000,
    character: { name: "Kemal Aydin", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const quest = maybeSpawnChefQuest(gameState, city, { simMinute: 0, spawnChance: 1 });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const startingDoubloons = gameState.doubloons;
  const firstIngredient = quest.ingredients[0];
  gameState.cargo[firstIngredient.goodId] = 1;

  let session = createPortDialogueSession(city, { initialNodeId: "chef-quest" });
  let view = portDialogueView(session, city, gameState, economy, [city]);
  let deliveryIndex = view.options.findIndex(
    (entry) => entry.action.type === "deliver-chef-ingredients"
  );
  const partial = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    deliveryIndex,
    { simMinute: 100 }
  );
  assert.equal(partial.chefIngredientDeliveries.length, 1);
  assert.equal(partial.chefBanquetPrepared, undefined);
  assert.equal(gameState.doubloons, startingDoubloons);

  for (const ingredient of quest.ingredients.slice(1)) {
    gameState.cargo[ingredient.goodId] = 1;
  }
  session = createPortDialogueSession(city, { initialNodeId: "chef-quest" });
  view = portDialogueView(session, city, gameState, economy, [city]);
  deliveryIndex = view.options.findIndex(
    (entry) => entry.action.type === "deliver-chef-ingredients"
  );
  const completed = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    deliveryIndex,
    { simMinute: 200 }
  );
  assert.ok(completed.chefBanquetPrepared);
  assert.equal(gameState.doubloons, startingDoubloons + CHEF_QUEST_REWARD);
  const completedView = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(completedView.text, /prepare a fine meal/);
  assert.equal(completedView.feedback, `The hosts paid ${CHEF_QUEST_REWARD} db.`);
  assert.equal(
    completedView.feedback.includes(completed.chefBanquetPrepared.event.successText),
    false
  );

  const served = selectPortDialogueOption(session, city, gameState, economy, [city], 0, { simMinute: 200 });
  assert.equal(served.chefFeast.phase, "served");
  assert.ok(served.chefFeast.minute > 200);
  const gathering = { simMinute: served.chefFeast.minute, chefFeastGuestsGathered: false };
  const waitingView = portDialogueView(session, city, gameState, economy, [city], gathering);
  assert.equal(waitingView.options[0].disabled, true);
  assert.match(waitingView.options[0].disabledReason, /gather/);
  const before = structuredClone(gameState);
  const blocked = selectPortDialogueOption(session, city, gameState, economy, [city], 0, gathering);
  assert.equal(blocked.chefFeast, undefined);
  assert.deepEqual(gameState, before);
  const finished = selectPortDialogueOption(session, city, gameState, economy, [city], 0,
    { ...gathering, chefFeastGuestsGathered: true });
  assert.equal(finished.chefFeast.phase, "afterwards");
  assert.ok(finished.chefFeast.minute > served.chefFeast.minute);
  assert.equal(gameState.doubloons, startingDoubloons + CHEF_QUEST_REWARD);
  session.chefQuestArrival = true;
  session.nextPortNodeId = "root";
  recruitChef(gameState, city);
  const recruitedView = portDialogueView(session, city, gameState, economy, [city]);
  assert.deepEqual(recruitedView.options.map((entry) => entry.label), ["Back to city"]);
});

test("enemy port guards bar resupply and offer one risky disguise route", () => {
  const city = {
    tileId: 12,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const session = createPortDialogueSession(city, { initialNodeId: "barred" });
  let context = { portEntryStatus: portEntryStatus(gameState, city, 100) };

  const barred = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(barred.speaker, "Calais harbor guard");
  assert.match(barred.text, /King Francis I/);
  assert.match(barred.text, /No supplies will be sold/);
  assert.deepEqual(barred.options.map((entry) => entry.label), [
    "Try to enter in disguise",
    "Leave"
  ]);
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], 0, context), {
    closed: false,
    action: { type: "attempt-disguise" }
  });

  attemptPortDisguise(gameState, city, 100, 0.99);
  session.nodeId = "disguise-failed";
  context = { portEntryStatus: portEntryStatus(gameState, city, 101) };
  const failed = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(failed.text, /barely escape/);
  assert.deepEqual(failed.options.map((entry) => entry.label), [
    "Attack city",
    "Make for open water"
  ]);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, context),
    { closed: false }
  );
  assert.equal(session.nodeId, "city-attack");
});

test("a disabled hostile harbor offers an eligible captain a marine landing", () => {
  const city = {
    tileId: 12,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const playerCharacter = { name: "Joan Alden", nationalityId: "england", expressions: ["neutral"] };
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "barred" });
  const context = {
    portEntryStatus: portEntryStatus(gameState, city, 100),
    portRecoveryStatus: {
      attackerShipLabel: "your Armed Galleon",
      disabledUntilMinute: 3000,
      daysRemaining: 2
    },
    portConquestStatus: {
      canAttempt: true,
      capital: false,
      successPercent: 57,
      expectedCasualtiesRounded: 16,
      expectedDeathsRounded: 9,
      expectedWoundedRounded: 7,
      casualtyRangeLow: 12,
      casualtyRangeHigh: 21
    }
  };
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(view.text, /harbor guns are silent/i);
  assert.equal(view.options[0].label, "Start the assault");
  assert.equal(view.options[0].detail, "57% victory • expect 9 dead / 7 wounded (12–21 total)");
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], 0, context), {
    closed: false,
    action: { type: "land-marines" }
  });
});

test("a friendly foreign port warns before a piratical city attack", () => {
  const city = {
    tileId: 13,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 65000,
    character: { name: "Beatriz Ferreira", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Joan Alden", nationalityId: "england", expressions: ["neutral"] }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = { portAttackStatus: playerPortAttackStatus(gameState, city) };
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const attackIndex = root.options.findIndex((entry) => entry.label === "Attack city");
  assert.ok(attackIndex >= 0);
  assert.equal(root.options[attackIndex].detail, "Piracy");
  assert.equal(root.options[attackIndex].detailTone, "danger");
  selectPortDialogueOption(session, city, gameState, economy, [city], attackIndex, context);
  const warning = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(warning.text, /attacking Lisbon is piracy/i);
  assert.match(warning.text, /plunder the city/i);
  assert.deepEqual(warning.options.map((entry) => entry.label), ["Attack city anyway", "Back to city"]);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, context),
    { closed: false, action: { type: "attack-city" } }
  );
});

test("formal war permits a lawful port raid but grants no right of conquest", () => {
  const city = {
    tileId: 130,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Joan Alden", nationalityId: "england", expressions: ["neutral"] }
  });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = { portAttackStatus: playerPortAttackStatus(gameState, city) };
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const attackIndex = root.options.findIndex((entry) => entry.label === "Attack city");
  assert.ok(attackIndex >= 0);
  assert.equal(root.options[attackIndex].detail, "Legal attack");
  selectPortDialogueOption(session, city, gameState, economy, [city], attackIndex, context);
  const warning = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(warning.text, /flag you serve is at war with (?:the )?Kingdom of France/i);
  assert.match(warning.text, /carry off lawful spoil/i);
  assert.match(warning.text, /ruler's express commission/i);
  assert.doesNotMatch(warning.text, /taken for England/i);
  assert.deepEqual(warning.options.map((entry) => entry.label), ["Attack city", "Back to city"]);
});

test("a port attack button identifies the letter of marque that makes it legal", () => {
  const city = {
    tileId: 131,
    cityId: "rhodes|rhodes",
    city: "Rhodes",
    displayCity: "Rhodes",
    country: "Rhodes",
    cityType: "mediterranean",
    factionId: "hospitallers",
    population: 18000,
    character: { name: "Pierre de Villiers", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Li Wei", nationalityId: "ming", expressions: ["neutral"] }
  });
  gameState.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  gameState.relations.diplomacy.overrides["hospitallers|ottoman"] = DIPLOMACY_WAR;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = { portAttackStatus: playerPortAttackStatus(gameState, city) };
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const attack = root.options.find((entry) => entry.label === "Attack city");
  assert.ok(attack);
  assert.equal(attack.detail, "Legal - Ottoman letter of marque");
  assert.equal(attack.detailTone, "success");
});

test("a friendly capture-commission target closes its harbor and engages", () => {
  const city = {
    tileId: 14,
    cityId: "rhodes|rhodes",
    city: "Rhodes",
    displayCity: "Rhodes",
    country: "Rhodes",
    cityType: "mediterranean",
    factionId: "hospitallers",
    population: 18000,
    character: { name: "Pierre de Villiers", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Hasan", nationalityId: "tidore", expressions: ["neutral"] }
  });
  gameState.memory.quests.active = {
    id: "capture-rhodes",
    kind: "capture-port",
    stage: "capture",
    targetCityId: city.cityId,
    targetTileId: city.tileId,
    originFactionId: "ottoman"
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "barred" });
  const context = {
    simMinute: 100,
    portEntryStatus: portEntryStatus(gameState, city, 100),
    portAttackStatus: playerPortAttackStatus(gameState, city),
    portConquestStatus: { canAttempt: false, playerAssaultActive: false, minimumCrew: 36 }
  };
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(view.text, /commission is known/i);
  assert.deepEqual(view.options.map((entry) => entry.label), ["Attack city", "Leave"]);
  assert.equal(view.options[0].detail, "Legal attack");
  assert.equal(view.options[0].detailTone, "success");
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, context),
    { closed: false, action: { type: "attack-city" } }
  );
  assert.equal(session.nodeId, "barred");
});

test("an independent-port commission bars entry without naming a neutral sovereign", () => {
  const city = {
    tileId: 141,
    cityId: "aden|yemen",
    city: "Aden",
    displayCity: "Aden",
    country: "Yemen",
    cityType: "islamic-desert",
    factionId: "neutral",
    population: 18000,
    character: { name: "Ali ibn Dawud", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Hasan", nationalityId: "tidore", expressions: ["neutral"] }
  });
  gameState.memory.quests.active = {
    id: "capture-aden",
    kind: "capture-port",
    stage: "capture",
    targetCityId: city.cityId,
    targetTileId: city.tileId,
    targetFactionId: "neutral",
    independentTarget: true,
    originFactionId: "ottoman"
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const attack = playerPortAttackStatus(gameState, city);
  const context = {
    simMinute: 100,
    portEntryStatus: portEntryStatus(gameState, city, 100),
    portAttackStatus: attack,
    portConquestStatus: { canAttempt: false, playerAssaultActive: false, minimumCrew: 36 }
  };
  const barredSession = createPortDialogueSession(city, { initialNodeId: "barred" });
  const barred = portDialogueView(barredSession, city, gameState, economy, [city], context);
  assert.match(barred.text, /commission is known/i);
  assert.doesNotMatch(barred.text, /Neutral|neutral nation|neutral power/);

  const attackSession = createPortDialogueSession(city, { initialNodeId: "city-attack" });
  const confirmation = portDialogueView(
    attackSession,
    city,
    gameState,
    economy,
    [city],
    context
  );
  assert.match(confirmation.text, /sealed warrant names Aden/i);
  assert.match(confirmation.text, /declares no war against a foreign sovereign/i);
  assert.doesNotMatch(confirmation.text, /authorizes war against Neutral/i);
});

test("an unauthorized marine landing pillages instead of annexing", () => {
  const city = {
    tileId: 15,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 65000,
    character: { name: "Beatriz Ferreira", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Joan Alden", nationalityId: "england", expressions: ["neutral"] }
  });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "barred" });
  const context = {
    portEntryStatus: portEntryStatus(gameState, city, 100),
    portRecoveryStatus: { attackerShipLabel: "your ship", disabledUntilMinute: 3000, daysRemaining: 2 },
    portAttackStatus: playerPortAttackStatus(gameState, city),
    portConquestStatus: {
      canAttempt: true,
      playerAssaultActive: true,
      successPercent: 57,
      expectedCasualtiesRounded: 11,
      expectedDeathsRounded: 6,
      expectedWoundedRounded: 5,
      casualtyRangeLow: 8,
      casualtyRangeHigh: 15,
      capital: false
    }
  };
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(view.text, /exposed to plunder/i);
  assert.equal(view.options[0].label, "Start the raid");
  assert.equal(view.options[0].detail, "57% victory • expect 6 dead / 5 wounded (8–15 total)");
});

test("a disabled enemy harbor never admits an ineligible captain in disguise", () => {
  const city = {
    tileId: 12,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const playerCharacter = { name: "Joan Alden", nationalityId: "england", expressions: ["neutral"] };
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "barred" });
  const context = {
    portEntryStatus: portEntryStatus(gameState, city, 100),
    portRecoveryStatus: {
      attackerShipLabel: "the Portuguese Carrack commanded by Tomas Silva",
      disabledUntilMinute: 3000,
      daysRemaining: 2
    },
    portConquestStatus: {
      canAttempt: false,
      playerAssaultActive: false,
      minimumCrew: 20
    }
  };

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(
    view.text,
    "You think to take Calais with that handful? We will drive every one of you into the sea."
  );
  assert.deepEqual(view.options.map((entry) => entry.label), ["Leave"]);
});

test("a recovering non-enemy port refuses business and names the bombarding ship", () => {
  const city = {
    tileId: 17,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 14000,
    character: { name: "Beatriz Ferreira", role: "harbour-master" }
  };
  const playerCharacter = {
    name: "Joana Ferreira",
    nationalityId: "portugal",
    expressions: ["neutral", "sad"]
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const session = createPortDialogueSession(city, { initialNodeId: "recovering" });
  const context = {
    portEntryStatus: portEntryStatus(gameState, city, 100),
    portRecoveryStatus: {
      attackerShipLabel: "the French Brigantine commanded by Jean Moreau",
      disabledUntilMinute: 3000,
      daysRemaining: 2
    }
  };

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.speaker, "Beatriz Ferreira, harbour master of Porto");
  assert.match(view.text, /French Brigantine commanded by Jean Moreau/);
  assert.match(view.text, /bombarded/);
  assert.match(view.text, /quays remain closed for 2 more days/);
  assert.deepEqual(view.options.map((entry) => entry.label), ["Leave"]);
});

test("a successful disguise opens commerce but not faction business", () => {
  const city = {
    tileId: 14,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const session = createPortDialogueSession(city, {
    initialNodeId: "disguise-success",
    disguisedEntry: true,
    nextPortNodeId: "root"
  });

  const success = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(success.text, /papers appear to be in order/);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  const root = portDialogueView(session, city, gameState, economy, [city], {
    passengerOffer: { passenger: { name: "Pierre" } }
  });
  assert.match(root.text, /Keep your disguise intact/);
  assert.ok(root.options.some((entry) => entry.label === "Market"));
  assert.ok(root.options.some((entry) => entry.label === "Visit inn"));
  const authorityIndex = root.options.findIndex((entry) => entry.label === "Port authority");
  assert.ok(authorityIndex >= 0);
  assert.ok(root.options.every((entry) => entry.label !== "Ask about work"));
  assert.ok(root.options.every((entry) => entry.label !== "Ask about the garrison"));
  assert.ok(root.options.every((entry) => !entry.label.startsWith("Speak with")));
  assert.ok(root.options.every((entry) => entry.label !== "Letter of marque"));

  selectPortDialogueOption(session, city, gameState, economy, [city], authorityIndex);
  const warning = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(warning.speaker, "Joan Alden, captain");
  assert.match(warning.text, /need to be discreet/);
  assert.doesNotMatch(warning.text, /garrison|troops|men under arms/i);
});

test("work requested at the inn returns to the inn", () => {
  const city = {
    tileId: 140,
    cityId: "utrecht|netherlands",
    city: "Utrecht",
    displayCity: "Utrecht",
    country: "Netherlands",
    cityType: "northern-european",
    routeRegion: "northern-european",
    factionId: "utrecht",
    population: 30_000,
    lat: 52.09,
    lon: 5.12,
    character: { name: "Willem van Rijn", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, {
    initialNodeId: "inn-drink",
    admittedToPort: true
  });
  const context = {
    simMinute: 0,
    innDialogue: {
      speaker: "Lijsbeth, innkeeper",
      expressionId: "neutral",
      text: "The beer is sound."
    }
  };

  const inn = portDialogueView(session, city, gameState, economy, [city], context);
  const workIndex = inn.options.findIndex(({ label }) => label === "Ask about work");
  assert.ok(workIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], workIndex, context);

  const work = portDialogueView(session, city, gameState, economy, [city], context);
  const backIndex = work.options.findIndex(({ label }) => label === "Back to inn");
  assert.ok(backIndex >= 0);
  assert.equal(dialogueBackOptionIndex(work), backIndex);
  selectPortDialogueOption(session, city, gameState, economy, [city], backIndex, context);
  assert.equal(session.nodeId, "inn-drink");
});

test("foreign captains must find an illicit market to trade at Ming ports", () => {
  const city = {
    tileId: 15,
    cityId: "guangzhou|china",
    city: "Guangzhou",
    displayCity: "Guangzhou",
    country: "China",
    cityType: "east-asian",
    factionId: "ming",
    population: 120000,
    character: { name: "Li Wen", role: "harbour-master" }
  };
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = {
    simMinute: 0,
    random: () => 0.1,
    shipStats: shipStatsForSlug("brigantine")
  };

  let root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(root.text, /maritime prohibition/);
  assert.match(root.text, /Water, provisions, and ordinary harbor services remain available/);
  assert.ok(root.options.every((entry) => entry.label !== "Market"));
  assert.ok(root.options.some((entry) => entry.label === "Ship loadout"));
  assert.ok(root.options.every((entry) => entry.label !== "Equipment" && entry.label !== "Visit shipyard"));
  const illicitIndex = root.options.findIndex((entry) => entry.label === "Seek illicit market");
  assert.ok(illicitIndex >= 0);
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], illicitIndex, context);
  assert.equal(result.illicitMarketAccessPolicyId, "ming-maritime-prohibition");

  const buy = portDialogueView(session, city, gameState, economy, [city], context);
  const buyIndex = buy.options.findIndex((entry) => entry.action.type === "buy" && !entry.disabled);
  assert.ok(buyIndex >= 0);
  assert.match(buy.options[buyIndex].detail, /ILLICIT  DUTY 0%/);
  const purchase = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    buyIndex,
    context
  );
  assert.equal(purchase.closed, false);
  assert.equal(session.illicitTradeVisit.policyId, MING_TRADE_POLICY_ID);
  assert.equal(session.illicitTradeVisit.enforcementFactionId, "ming");
  assert.equal(session.illicitTradeVisit.transactionCount, 1);
  assert.ok(session.illicitTradeVisit.transactionValue > 0);
  assert.equal(Object.values(session.illicitTradeVisit.purchasedCargo).reduce((a, b) => a + b, 0), 1);
});

test("captains admitted under safe passage can seek an illicit wartime market", () => {
  const city = {
    tileId: 151,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const shipStats = shipStatsForSlug("fishing-lugger");
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, playerCharacter, shipStats });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  gameState.relations.safePassageUntilMinute.france = 1000;
  assert.equal(portEntryStatus(gameState, city, 100).allowed, true);
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = { simMinute: 100, random: () => 0.1, shipStats };

  let root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(root.text, /Wartime orders close this market/);
  assert.ok(root.options.every((entry) => entry.label !== "Market"));
  const illicitIndex = root.options.findIndex((entry) => entry.label === "Seek illicit market");
  assert.ok(illicitIndex >= 0);

  const result = selectPortDialogueOption(session, city, gameState, economy, [city], illicitIndex, context);
  assert.equal(result.illicitMarketAccessPolicyId, WARTIME_TRADE_RESTRICTION_ID);
  assert.equal(session.nodeId, "market");
  const market = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(market.text, /Calais market/);
});

test("a failed Ming illicit-market approach costs standing and cannot be repeated that visit", () => {
  const city = {
    tileId: 16,
    cityId: "nanjing|china",
    city: "Nanjing",
    displayCity: "Nanjing",
    country: "China",
    cityType: "east-asian",
    factionId: "ming",
    population: 160000,
    character: { name: "Zhang Rui", role: "harbour-master" }
  };
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter });
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const before = gameState.relations.factionReputation.ming;
  const context = { simMinute: 0, random: () => 0.9 };
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const illicitIndex = root.options.findIndex((entry) => entry.label === "Seek illicit market");

  const result = selectPortDialogueOption(session, city, gameState, economy, [city], illicitIndex, context);
  assert.equal(result.illicitMarketAccessPolicyId, null);
  assert.equal(gameState.relations.factionReputation.ming, before - 8);
  assert.match(session.feedback, /Ming standing fell/);
  assert.equal(session.nodeId, "illicit-caught");
  const caught = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(caught.feedbackTone, "danger");
  const after = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(after.options.every((entry) => entry.label !== "Seek illicit market"));
});

test("pirate hideouts speak and trade like covert havens", () => {
  const marketPort = {
    tileId: 18,
    cityId: "falmouth|united kingdom",
    city: "Falmouth",
    displayCity: "Falmouth",
    country: "United Kingdom",
    cityType: "northern-european",
    factionId: "england",
    population: 9000
  };
  const hideout = {
    ...marketPort,
    portId: "pirate-hideout-18",
    portAlias: "Black Gull Cove",
    factionId: "pirate",
    isPirateHideout: true,
    settlementType: "village",
    population: 1200,
    character: { name: "Mara Vane", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [marketPort], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(hideout);

  const greeting = portDialogueView(session, hideout, gameState, economy, [marketPort], { dayIndex: 3 });
  assert.equal(greeting.speaker, "Mara Vane, keeper of Black Gull Cove");
  assert.match(greeting.text, /cove|cargo|questions/i);
  selectPortDialogueOption(session, hideout, gameState, economy, [marketPort], 0);

  const root = portDialogueView(session, hideout, gameState, economy, [marketPort]);
  assert.match(root.text, /Powder, provisions, and silence/);
  assert.ok(root.options.some((entry) => entry.label === "Market"));
  assert.equal(root.options.filter((entry) => entry.label === "Market").length, 1);
  assert.ok(root.options.some((entry) => entry.label === "Lie low in the cove"));
  assert.ok(root.options.some((entry) => entry.label === "Put to sea"));
  assert.ok(root.options.every((entry) => entry.label !== "Ask about work"));
});

test("ports stock a local selection of fishing net upgrades", () => {
  const city = {
    tileId: 13,
    cityId: "bristol|england",
    city: "Bristol",
    displayCity: "Bristol",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 50000,
    character: { name: "Alice Cabot", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.doubloons = 5000;
  const session = createPortDialogueSession(city, { initialNodeId: "equipment-nets" });

  const view = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(view.optionHeight, 34);
  assert.match(view.text, /Current gear: Basic cast net/);
  const equipmentOptions = view.options.filter((entry) => entry.placement !== "port-exit");
  assert.equal(equipmentOptions[0].label, "Weighted cast net  900 db");
  assert.match(equipmentOptions[0].detail, /MAX HAUL/);
  assert.equal(equipmentOptions[0].disabled, false);
  assert.equal(equipmentOptions.some((entry) => /Basic cast net/.test(entry.label)), false);

  const weightedIndex = view.options.findIndex((entry) => entry.action.netId === "weighted-cast-net");
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], weightedIndex, { simMinute: 300 });
  assert.equal(result.fishingNetPurchase.net.id, "weighted-cast-net");
  assert.equal(gameState.doubloons, 4100);
  assert.match(session.feedback, /Weighted cast net fitted/);
});

test("a factor can proactively fit an affordable equipment upgrade", () => {
  const city = {
    tileId: 17,
    portId: "lubeck",
    cityId: "lubeck|germany",
    city: "Lubeck",
    displayCity: "Lubeck",
    country: "Hanseatic League",
    cityType: "northern-european",
    population: 40000,
    character: { name: "Greta Brandt", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.inventory.fishingNetId = "weighted-cast-net";
  gameState.doubloons = 5000;
  const pitch = {
    kind: "fishing-net",
    itemId: "drift-net",
    label: "Drift net",
    price: 4000,
    tier: 2,
    tierGain: 1,
    priority: 0,
    salesPitch: "It should pay for itself after a few fishing trips.",
    effectDetail: "Fishing odds x1.20 / Max haul 8",
    reconsidered: false
  };
  const session = createPortArrivalDialogueSession(city, { equipmentFactorPitch: pitch });

  const offer = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(offer.text, /before you go/i);
  assert.equal(offer.options[0].label, "Buy Drift net  4000 db");
  const result = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    0,
    { simMinute: 100 }
  );
  assert.equal(result.fishingNetPurchase.net.id, "drift-net");
  assert.equal(gameState.inventory.fishingNetId, "drift-net");
  assert.equal(gameState.doubloons, 1000);
  assert.match(portDialogueView(session, city, gameState, economy, [city]).text, /aboard and ready/);
});

test("a capital factor proactively offers a qualified captain a wartime letter of marque", () => {
  const city = {
    tileId: 1,
    portId: "london",
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  adjustFactionReputation(gameState, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  const factorOffer = prepareProactiveLetterOfMarque(
    gameState,
    city,
    LETTER_OF_MARQUE_POWER_REQUIRED
  );
  const session = createPortArrivalDialogueSession(city, {
    letterOfMarqueFactorOffer: factorOffer
  });
  const context = { shipPower: LETTER_OF_MARQUE_POWER_REQUIRED, simMinute: 120 };

  const offer = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(offer.text, /King Henry VIII's court is raising privateers/i);
  assert.match(offer.text, /war against France/i);
  assert.match(offer.text, /every power at war with England: France/i);
  assert.equal(offer.options[0].label, "Accept the letter of marque");

  const result = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    0,
    context
  );
  assert.equal(result.letterOfMarque.grantedNow, true);
  assert.equal(hasLetterOfMarqueFrom(gameState, "england"), true);
  const followup = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(followup.text, /commission now covers every enemy of England: France/i);
  assert.equal(followup.options[0].label, "Continue");
});

test("declining a proactive marque offer leaves the ordinary request available", () => {
  const city = {
    tileId: 1,
    portId: "london",
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  adjustFactionReputation(gameState, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  const session = createPortArrivalDialogueSession(city, {
    letterOfMarqueFactorOffer: prepareProactiveLetterOfMarque(
      gameState,
      city,
      LETTER_OF_MARQUE_POWER_REQUIRED
    )
  });
  const context = { shipPower: LETTER_OF_MARQUE_POWER_REQUIRED, simMinute: 120 };

  selectPortDialogueOption(session, city, gameState, economy, [city], 1, context);
  assert.equal(hasLetterOfMarqueFrom(gameState, "england"), false);
  const followup = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(followup.text, /remains available while England is at war/i);
});

test("a declined factor offer points the player back to the equipment store", () => {
  const city = {
    tileId: 17,
    cityId: "lubeck|hanseatic league",
    city: "Lubeck",
    country: "Hanseatic League",
    cityType: "northern-european",
    population: 40000,
    character: { name: "Greta Brandt", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortArrivalDialogueSession(city, {
    equipmentFactorPitch: {
      kind: "fishing-net",
      itemId: "weighted-cast-net",
      label: "Weighted cast net",
      price: 900,
      tier: 1,
      tierGain: 1,
      priority: 0,
      salesPitch: "It should pay for itself after a few fishing trips.",
      effectDetail: "Fishing odds x1.00 / Max haul 5",
      reconsidered: false
    }
  });

  selectPortDialogueOption(session, city, gameState, economy, [city], 1, { simMinute: 100 });
  assert.match(portDialogueView(session, city, gameState, economy, [city]).text, /remain available/i);
  assert.deepEqual(gameState.memory.decisions, {
    "equipment.factor-pitch-declined.fishing-net.weighted-cast-net": 101
  });
});

test("equipment factor follow-up agrees with a plural equipment label", () => {
  const city = {
    tileId: 10,
    portId: "lisbon",
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 5000;
  const session = createPortArrivalDialogueSession(city, {
    equipmentFactorPitch: {
      kind: "cannon",
      itemId: "bronze-culverins",
      label: "Bronze culverins",
      price: 2400,
      tier: 1,
      tierGain: 1,
      priority: 0,
      salesPitch: "A quicker battery can settle a broadside.",
      effectDetail: "Reload 8.50s / Damage x1.15 / Range x1.12",
      reconsidered: false
    }
  });

  selectPortDialogueOption(session, city, gameState, economy, [city], 0, { simMinute: 100 });
  assert.match(
    portDialogueView(session, city, gameState, economy, [city]).text,
    /The Bronze culverins are aboard/
  );
});

test("the equipment overview shows stocked levels and identifies specialist markets", () => {
  const city = {
    tileId: 14,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const session = createPortDialogueSession(city, { initialNodeId: "equipment" });

  const view = portDialogueView(session, city, gameState, economy, [city]);
  const nets = view.options.find((entry) => entry.label === "Fishing nets");
  const harpoons = view.options.find((entry) => entry.label === "Whale harpoons");
  const cannons = view.options.find((entry) => entry.label === "Cannon battery");

  assert.match(nets.detail, /^STOCK \d\/3 LEVELS$/);
  assert.match(harpoons.detail, /^STOCK \d\/3 LEVELS$/);
  assert.equal(cannons.detail, "STOCK 3/3 LEVELS  SPECIALIST");
});

test("the equipment store exposes stocked cannon upgrades and their complete firing profile", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 10000;
  const session = createPortDialogueSession(city, { initialNodeId: "equipment-cannons" });

  const view = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(view.optionHeight, 34);
  const equipmentOptions = view.options.filter((entry) => entry.placement !== "port-exit");
  assert.deepEqual(equipmentOptions.slice(0, 3).map((entry) => entry.label), [
    "Bronze culverins  2400 db",
    "Reinforced culverins  8500 db",
    "Royal foundry battery  24000 db"
  ]);
  assert.match(equipmentOptions[0].detail, /RELOAD 8\.50S  DAMAGE x1\.15  RANGE x1\.12/);

  const bronzeIndex = view.options.findIndex((entry) => entry.action.equipmentId === "bronze-culverins");
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], bronzeIndex, { simMinute: 300 });
  assert.equal(result.cannonEquipmentPurchase.equipment.id, "bronze-culverins");
  assert.equal(gameState.doubloons, 7600);
  assert.match(session.feedback, /Bronze culverins fitted/);
});

test("equipment merchants omit gear below the player's current tier", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.inventory.cannonEquipmentId = "reinforced-culverins";
  const session = createPortDialogueSession(city, { initialNodeId: "equipment-cannons" });

  const view = portDialogueView(session, city, gameState, economy, [city]);
  const labels = view.options.map((entry) => entry.label);

  assert.equal(labels.some((label) => /Bronze culverins/.test(label)), false);
  assert.equal(labels.some((label) => /Reinforced culverins/.test(label)), false);
  assert.equal(labels.some((label) => /Royal foundry battery/.test(label)), true);
});

test("a Polynesian equipment store does not present the player's cannons as local stock", () => {
  const city = {
    tileId: 11,
    cityId: "tarawa village|neutral",
    city: "Tarawa Village",
    displayCity: "Tarawa Village",
    country: "Neutral",
    factionId: "neutral",
    cityType: "polynesian",
    population: 1200,
    character: { name: "Te Rongo", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const overviewSession = createPortDialogueSession(city, { initialNodeId: "equipment" });

  const overview = portDialogueView(overviewSession, city, gameState, economy, [city]);
  const cannons = overview.options.find((entry) => entry.label === "Cannon battery");
  assert.equal(cannons.detail, "STOCK 0/3 LEVELS");
  assert.equal(cannons.disabled, true);
  assert.equal(cannons.disabledReason, "This port has no cannon equipment in stock.");

  const cannonSession = createPortDialogueSession(city, { initialNodeId: "equipment-cannons" });
  const cannonView = portDialogueView(cannonSession, city, gameState, economy, [city]);
  assert.equal(cannonView.options.some((entry) => /Standard ordnance/.test(entry.label)), false);
});

test("a rare equipment offer persists after declining and remembers the player", () => {
  const voyageSeed = "dialogue-test-15";
  const city = {
    tileId: 17,
    cityId: "porto novo|portugal",
    city: "Porto Novo",
    displayCity: "Porto Novo",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0, seedKey: voyageSeed });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    voyageSeed
  });
  gameState.doubloons = 5000;
  const session = createPortDialogueSession(city, { initialNodeId: "root" });

  const root = portDialogueView(session, city, gameState, economy, [city]);
  const equipmentIndex = root.options.findIndex((entry) => entry.action.nodeId === "equipment");
  assert.ok(equipmentIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], equipmentIndex);

  const firstOffer = portDialogueView(session, city, gameState, economy, [city]);
  const offeredItemId = firstOffer.options[0].action.itemId;
  const offeredItem = perkItemById(offeredItemId);
  assert.ok(firstOffer.text.includes(`came into possession of ${offeredItem.label}`));
  assert.deepEqual(firstOffer.options.map((entry) => entry.label), [
    `Buy it - ${offeredItem.price} db`,
    "No, thank you"
  ]);
  assert.ok(firstOffer.options[0].detail.length > 0);

  selectPortDialogueOption(session, city, gameState, economy, [city], 1);
  const equipment = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(equipment.options.every((entry) => entry.label !== "Special equipment"));
  const backIndex = equipment.options.findIndex((entry) => entry.action.nodeId === "root");
  selectPortDialogueOption(session, city, gameState, economy, [city], backIndex);

  const revisitedRoot = portDialogueView(session, city, gameState, economy, [city]);
  const revisitedEquipmentIndex = revisitedRoot.options.findIndex((entry) => entry.action.nodeId === "equipment");
  selectPortDialogueOption(session, city, gameState, economy, [city], revisitedEquipmentIndex);
  const repeatedOffer = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(repeatedOffer.text.includes(`Have you reconsidered buying the ${offeredItem.label}`));

  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 0, {
    simMinute: 300
  });
  assert.equal(result.perkItemPurchase.item.id, offeredItemId);
  assert.equal(gameState.inventory.items[offeredItemId], 1);
  assert.equal(gameState.doubloons, 5000 - offeredItem.price);
  assert.ok(session.feedback.includes(`${offeredItem.label} brought aboard`));
  assert.throws(
    () => purchasePerkItem(gameState, city, offeredItemId),
    /already aboard/
  );
});

test("a displayed package job remains the exact action selected from a multi-offer menu", () => {
  const lisbon = {
    tileId: 21,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "portugal",
    population: 70000,
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const porto = {
    ...lisbon,
    tileId: 22,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    population: 50000,
    lat: 41.15,
    lon: -8.61
  };
  const cadiz = {
    ...lisbon,
    tileId: 23,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    factionId: "spain",
    population: 60_000,
    lat: 36.53,
    lon: -6.29
  };
  const ports = [lisbon, porto, cadiz];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.memory.quests.onboardingDeliveriesCompleted = ONBOARDING_DELIVERY_COUNT;
  deliveryOfferForCity(gameState, lisbon, ports, { spawnChance: 1, simMinute: 0 });
  const session = createPortDialogueSession(lisbon, { initialNodeId: "quest" });

  const view = portDialogueView(session, lisbon, gameState, economy, ports);

  const offers = view.options.filter((entry) => entry.action.type === "accept-quest");
  assert.equal(offers.length, 3);
  assert.deepEqual(offers.map(({ action }) => action.quest.scenarioId), [
    "sealed-packet",
    "merchant-samples",
    "private-correspondence"
  ]);
  assert.match(offers[0].detail, /27\d km \/ \d+ DB/);
  assert.doesNotMatch(offers[0].detail, /GREAT-CIRCLE/);
  assert.equal(offers[2].action.quest.destinationCityId, cadiz.cityId);

  const accepted = selectPortDialogueAction(
    session,
    lisbon,
    gameState,
    economy,
    ports,
    offers[2]
  );
  assert.equal(accepted.acceptedQuest.scenarioId, "private-correspondence");
  assert.equal(gameState.memory.quests.deliveryOffers[lisbon.cityId], undefined);
  assert.equal(gameState.memory.quests.active.destinationCityId, cadiz.cityId);
});

test("a rumor queued before an active delivery cannot trap Back in a quest self-loop", () => {
  const istanbul = {
    tileId: 23,
    cityId: "istanbul|ottoman empire",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "ottoman",
    population: 400000,
    lat: 41.01,
    lon: 28.98,
    character: { name: "Leyla Celebi", role: "harbour-master" }
  };
  const athens = {
    ...istanbul,
    tileId: 24,
    cityId: "athens|greece",
    city: "Athens",
    displayCity: "Athens",
    lat: 37.98,
    lon: 23.73
  };
  const ports = [istanbul, athens];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  deliveryOfferForCity(gameState, istanbul, ports, { spawnChance: 1, simMinute: 0 });
  acceptQuest(gameState, questStateForCity(gameState, istanbul, ports).quest);
  const session = createPortDialogueSession(istanbul, {
    initialNodeId: "greeting",
    rumorText: "A pale spout was sighted beyond the Dardanelles.",
    nextPortNodeId: "quest"
  });

  selectPortDialogueOption(session, istanbul, gameState, economy, ports, 0);
  assert.equal(session.nodeId, "quest");
  assert.equal(session.nextPortNodeId, null);
  const warning = portDialogueView(session, istanbul, gameState, economy, ports);
  assert.match(warning.text, /Do not let it vanish into another captain's hold/);
  const backIndex = warning.options.findIndex((entry) => entry.label === "Back to city");
  selectPortDialogueOption(session, istanbul, gameState, economy, ports, backIndex);
  assert.equal(session.nodeId, "root");
});

test("no-work Back to city returns to the city after an arrival continuation", () => {
  const city = {
    tileId: 25,
    cityId: "faro|portugal",
    city: "Faro",
    displayCity: "Faro",
    country: "Portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "portugal",
    population: 8000,
    lat: 37.02,
    lon: -7.93,
    character: { name: "Diogo Vaz", role: "harbour-master" }
  };
  const ports = [city];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, {
    initialNodeId: "greeting",
    nextPortNodeId: "greeting",
    admittedToPort: true
  });

  selectPortDialogueOption(session, city, gameState, economy, ports, 0);
  assert.equal(session.nodeId, "root");
  assert.equal(session.nextPortNodeId, null);

  const root = portDialogueView(session, city, gameState, economy, ports);
  const workIndex = root.options.findIndex((entry) => entry.label === "Ask about work");
  assert.ok(workIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, ports, workIndex);

  const unavailable = portDialogueView(session, city, gameState, economy, ports);
  assert.match(unavailable.text, /No sealed packets/);
  const backIndex = unavailable.options.findIndex((entry) => entry.label === "Back to city");
  selectPortDialogueOption(session, city, gameState, economy, ports, backIndex);
  assert.equal(session.nodeId, "root");
});

test("a first-click island dispatch acceptance persists through delivery", () => {
  const tidore = deliveryPort({
    tileId: 31,
    cityId: "tidore|indonesia",
    city: "Tidore",
    lat: 0.67,
    lon: 127.45
  });
  const makian = deliveryPort({
    tileId: 32,
    cityId: "makian village|indonesia",
    city: "Makian Village",
    lat: 0.15,
    lon: 127.43
  });
  const gane = deliveryPort({
    tileId: 33,
    cityId: "gane village|indonesia",
    city: "Gane Village",
    lat: 0.05,
    lon: 127.9
  });
  const ports = [tidore, makian, gane];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const offer = deliveryOfferForCity(gameState, tidore, ports, { spawnChance: 1, simMinute: 0 });
  assert.equal(offer.cargoLabel, "harbor dispatch");

  const originSession = createPortDialogueSession(tidore, { initialNodeId: "quest" });
  const originView = portDialogueView(originSession, tidore, gameState, economy, ports);
  const acceptIndex = originView.options.findIndex(({ action }) => action.type === "accept-quest");
  assert.ok(acceptIndex >= 0);
  selectPortDialogueOption(originSession, tidore, gameState, economy, ports, acceptIndex);
  assert.equal(gameState.memory.quests.active.id, offer.id);
  assert.equal(gameState.memory.quests.active.destinationCityId, offer.destinationCityId);
  const acceptedView = portDialogueView(originSession, tidore, gameState, economy, ports);
  const backIndex = acceptedView.options.findIndex(({ label }) => label === "Back to city");
  assert.ok(backIndex >= 0);
  selectPortDialogueOption(originSession, tidore, gameState, economy, ports, backIndex);
  assert.equal(originSession.nodeId, "root");

  const destination = ports.find(({ cityId }) => cityId === offer.destinationCityId);
  assert.ok(destination);
  const destinationSession = createPortDialogueSession(destination, { initialNodeId: "quest" });
  const destinationView = portDialogueView(
    destinationSession,
    destination,
    gameState,
    economy,
    ports
  );
  const deliverIndex = destinationView.options.findIndex(({ action }) => action.type === "complete-quest");
  assert.ok(deliverIndex >= 0);
  selectPortDialogueOption(
    destinationSession,
    destination,
    gameState,
    economy,
    ports,
    deliverIndex,
    { simMinute: 10 }
  );
  assert.equal(gameState.memory.quests.active, null);
  assert.ok(gameState.memory.quests.completed[offer.id]);
});

function deliveryPort({ tileId, cityId, city, lat, lon }) {
  return {
    tileId,
    cityId,
    city,
    displayCity: city,
    country: "Indonesia",
    cityType: "southeast-asian",
    routeRegion: "maluku",
    factionId: "tidore",
    population: city === "Tidore" ? 12000 : 2500,
    lat,
    lon,
    character: { name: "Kaicili Yusuf", role: "harbour-master" }
  };
}

test("arrival news cannot replay after its greeting is acknowledged", () => {
  const city = {
    tileId: 26,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "spain",
    population: 45000,
    lat: 36.53,
    lon: -6.29,
    character: { name: "Ines de Vargas", role: "harbour-master", personalityId: "austere" }
  };
  const ports = [city];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const historicalGossip = {
    id: "tidore-court-news",
    place: "Tidore",
    report: "the sultan has received a Castilian embassy"
  };
  const session = createPortDialogueSession(city, {
    initialNodeId: "greeting",
    historicalGossip,
    admittedToPort: true
  });
  const context = () => ({ historicalGossip: session.historicalGossip });

  const firstGreeting = portDialogueView(session, city, gameState, economy, ports, context());
  assert.match(firstGreeting.text, /News from Tidore/);
  selectPortDialogueOption(session, city, gameState, economy, ports, 0, context());
  assert.equal(session.nodeId, "root");
  assert.equal(session.historicalGossip, null);

  session.nodeId = "greeting";
  const repeatedGreeting = portDialogueView(session, city, gameState, economy, ports, context());
  assert.doesNotMatch(repeatedGreeting.text, /News from Tidore/);
});

test("shipyards show a full vessel presentation and enforce the asking price", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const currentStats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const listing = {
    id: "shipyard-10-4",
    shipSlug: "brigantine",
    shipLabel: "Brigantine",
    source: "new-build",
    price: 35000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const poorView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(poorView.presentation.kind, "shipyard");
  assert.equal(poorView.presentation.listing.shipSlug, "brigantine");
  assert.equal(poorView.presentation.currentShipSlug, "fishing-lugger");
  assert.deepEqual(poorView.presentation.purchaseTerms, {
    listingPrice: 35000,
    tradeInValue: 900,
    netPrice: 34100
  });
  assert.equal(
    poorView.text,
    "A newly built Brigantine is offered for 35000 doubloons. Your Fishing Barque is worth 900 in trade."
  );
  const poorPurchase = poorView.options.find((entry) => entry.action.type === "confirm-ship-purchase");
  assert.equal(poorPurchase.disabled, true);
  assert.equal(poorPurchase.label, "Buy Brigantine  34100 db");
  assert.equal(poorPurchase.disabledReason, "You need 33740 more doubloons.");

  gameState.doubloons = 40000;
  const richView = portDialogueView(session, city, gameState, economy, [city], context);
  const richPurchaseIndex = richView.options.findIndex((entry) => (
    entry.action.type === "confirm-ship-purchase"
  ));
  assert.equal(richView.options[richPurchaseIndex].disabled, false);
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], richPurchaseIndex, context), {
    closed: false
  });
  assert.equal(session.nodeId, "shipyard-purchase-confirm");
  assert.equal(session.selectedIndex, 1);

  const confirmationView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(confirmationView.options[session.selectedIndex].label, "Keep Fishing Barque");
  assert.match(confirmationView.text, /This cannot be undone/);
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], 0, context), {
    closed: false,
    action: { type: "purchase-ship", listingId: listing.id, shipSlug: "brigantine" }
  });
  assert.equal(session.shipyardPurchasePending, true);
  const pendingView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(pendingView.text, "The shipwrights are readying the vessel for inspection.");
  assert.equal(pendingView.feedbackTone, undefined);
  assert.equal(pendingView.options[0].label, "Confirm exchange");
  assert.ok(pendingView.options.every((entry) => entry.disabled));

});

test("shipyards require excess crew to be dismissed before a profitable downgrade", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const currentStats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  gameState.ship.loadoutId = "short-haul";
  setTestCrewCount(gameState, 20);
  gameState.ship.cannons = 9;
  gameState.survival.freshWaterCapacity = 20;
  gameState.survival.freshWater = 20;
  gameState.cargo.hardtack = 10;
  const listing = {
    id: "shipyard-10-downgrade",
    shipSlug: "felucca",
    shipLabel: "Felucca",
    source: "new-build",
    price: 5000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  assert.ok(cargoUsed(gameState) > shipStatsForSlug("felucca").cargoCapacity);
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "confirm-ship-purchase");

  assert.equal(purchase.disabled, true);
  assert.match(purchase.disabledReason, /Dismiss \d+ crew/);
});

test("shipyards still block a smaller ship when transferred trade cargo cannot fit", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const currentStats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  gameState.cargo.gold = 21;
  const listing = {
    id: "shipyard-10-overloaded",
    shipSlug: "felucca",
    shipLabel: "Felucca",
    source: "new-build",
    price: 5000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "confirm-ship-purchase");

  assert.equal(purchase.disabled, true);
  assert.match(purchase.disabledReason, /transferred cargo uses/);
});

test("shipyards explain when permanent crew cannot berth instead of formatting infinite cargo", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const currentStats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  setTestCrewCount(gameState, 2);
  addNamedCrewMember(gameState, {
    id: "shipyard-berth-test",
    name: "Permanent Sailor",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, undefined, { replaceGenericWhenFull: true });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const listing = {
    id: "shipyard-10-no-berths",
    shipSlug: "dhow",
    shipLabel: "Dhow",
    source: "new-build",
    price: 1000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "confirm-ship-purchase");

  assert.equal(purchase.disabled, true);
  assert.equal(
    purchase.disabledReason,
    "Your permanent crew require 2 berths; this vessel has only 1."
  );
});

test("shipyards account for the historian leaving with a traded-in Viking longship", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const hafnarfjordur = {
    cityId: "hafnarfjordur|iceland",
    tileId: 64,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland",
    portId: "city-64"
  };
  const currentStats = shipStatsForSlug("viking-longship");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  maybeSpawnVikingLongshipQuest(gameState, hafnarfjordur, { spawnChance: 1, simMinute: 0 });
  gameState.cargo = { wool: 8, timber: 6, iron: 3 };
  gameState.accounts.cargoCostBasis = { wool: 80, timber: 60, iron: 30 };
  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    deliverVikingLongshipQuestCargo(gameState, hafnarfjordur, stage.id);
  }
  acceptVikingLongshipReward(gameState);
  setTestCrewCount(gameState, 1);
  addNamedCrewMember(gameState, {
    id: "icelandic-historian",
    name: "Leif Eriksen",
    homePortCityId: "hafnarfjordur|iceland",
    homePortName: VIKING_LONGSHIP_PORT_CITY,
    homePortCountry: "Iceland",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_HISTORIAN, { replaceGenericWhenFull: true });
  gameState.doubloons = 50000;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const listing = {
    id: "shipyard-10-dhow",
    shipSlug: "dhow",
    shipLabel: "Dhow",
    source: "new-build",
    price: 1000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "confirm-ship-purchase");

  assert.equal(purchase.disabled, false);
});

test("empty shipyards direct captains to the nearest listed vessel", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], {
    shipyard: { famous: true, listing: null },
    nearestShipyardListing: {
      portId: "porto|portugal",
      tileId: 11,
      portName: "Porto",
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      source: "new-build",
      distanceKm: 312
    }
  });

  assert.equal(view.text, "I heard a rumour of a new brigantine for sale at Porto.");
  assert.equal(view.options[0].label, "Set a heading for Porto");
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, {
      shipyard: { famous: true, listing: null },
      nearestShipyardListing: {
        portId: "porto|portugal",
        tileId: 11,
        portName: "Porto",
        shipLabel: "Brigantine",
        shipProseLabel: "brigantine",
        source: "new-build",
        distanceKm: 312
      }
    }),
    {
      closed: false,
      action: {
        type: "set-port-heading",
        destinationCityId: "porto|portugal",
        destinationTileId: 11,
        destinationName: "Porto",
        reason: "NEW SHIP FOR SALE"
      }
    }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(session.feedback, "Heading set for Porto.");
});

test("a wealthy captain sees and can begin the major-port shipyard project", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 75000;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const yard = economy.shipyards.yards.get(city.cityId);
  const context = { shipStats: stats, shipyard: yard, simMinute: 100 };
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });

  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const offerIndex = root.options.findIndex((entry) => entry.label === "Meet the shipyard syndicate");
  assert.ok(offerIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], offerIndex, context);
  assert.equal(session.nodeId, "shipyard-investment-offer");
  const offer = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(offer.text, /A deepwater yard needs 100000 doubloons/);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  assert.equal(session.nodeId, "shipyard-investment");

  const project = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(project.text, /100000 doubloons, timber, iron, and naval stores/);
  const capital = project.options.find((entry) => entry.action.type === "pay-shipyard-investment");
  assert.equal(capital.disabled, true);
  assert.equal(capital.disabledReason, "Need 25000 more doubloons.");
  session.shipyardInvestmentArrival = true;
  for (const [cargo, label] of [[{}, "Not now"], [{ fish: 3 }, "Not now"],
    [{ timber: 1 }, "Keep the cargo aboard"]]) {
    gameState.cargo = cargo;
    const arrival = portDialogueView(session, city, gameState, economy, [city], context);
    assert.equal(arrival.options[0].label, label);
    assert.equal(arrival.options[0].disabled, false);
  }
});

test("opening a funded shipyard atomically creates its portfolio and readable world ledger", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 75000;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const yard = shipyardAtPort(economy.shipyards, city);
  const project = beginShipyardInvestment(gameState, city, yard, 10);
  project.capitalPaid = true;
  project.materialsDelivered = { ...SHIPYARD_INVESTMENT_MATERIALS };
  const session = createPortDialogueSession(city, {
    initialNodeId: "shipyard-investment",
    admittedToPort: true
  });
  const context = { shipStats: stats, shipyard: yard, simMinute: 100 };
  const projectView = portDialogueView(session, city, gameState, economy, [city], context);
  const openIndex = projectView.options.findIndex((entry) => (
    entry.action.type === "open-player-shipyard"
  ));

  const result = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    openIndex,
    context
  );

  assert.equal(result.closed, false);
  assert.equal(result.action, undefined);
  assert.equal(result.playerShipyardFunded.portTileId, city.tileId);
  assert.deepEqual(gameState.memory.shipyardInvestment.backedPortCityIds, [city.cityId]);
  assert.ok(yard.playerBacking);
  assert.ok(yard.playerAccounts);
  const ledger = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(ledger.presentation.kind, "player-shipyard-ledger");
});

test("a proactive shipyard offer can be declined back into the arrival queue", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 75000;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const context = {
    shipStats: stats,
    shipyard: economy.shipyards.yards.get(city.cityId),
    simMinute: 100
  };
  const session = createPortDialogueSession(city, {
    initialNodeId: "shipyard-investment-offer",
    admittedToPort: true,
    nextPortNodeId: "greeting",
    shipyardInvestmentArrival: true
  });
  session.shipyardInvestmentOfferApproached = true;

  const offer = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(offer.options.at(-1).label, "Not now");
  assert.equal(offer.options.at(-1).action.nodeId, "greeting");
  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    offer.options.length - 1,
    context
  );
  assert.equal(session.nodeId, "greeting");
  assert.equal(gameState.memory.shipyardInvestment.project, null);
});

test("a returning shipyard investor is invited to inspect the yard after receiving ordinary dialogue", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  fundWorldEconomyShipyard(economy, city, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  const session = createPortDialogueSession(city, {
    initialNodeId: "shipyard-arrival",
    shipyardLedgerTab: "books",
    admittedToPort: true
  });
  session.shipyardDividendArrival = {
    amount: 22000,
    sales: [{ shipSlug: "galleon" }],
    salesSummary: "Since your last visit, we sold a Galleon.",
    lifetimeTotal: 54000
  };
  session.shipyardLedgerReturnNodeId = "greeting";
  const view = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    shipyard: economy.shipyards.yards.get(city.cityId),
    simMinute: 100
  });
  assert.equal(view.presentation, undefined);
  assert.match(view.text, /sold a Galleon/);
  assert.match(view.text, /22000 doubloons is already in your purse/);
  assert.deepEqual(view.options.map(({ label }) => label), ["Continue"]);
  assert.equal(view.options[0].action.nodeId, "shipyard-arrival-review");

  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    0,
    {
      shipStats: stats,
      shipyard: economy.shipyards.yards.get(city.cityId),
      simMinute: 100
    }
  );
  const review = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    shipyard: economy.shipyards.yards.get(city.cityId),
    simMinute: 100
  });
  assert.match(review.text, /inspect the yard/);
  assert.deepEqual(review.options.map(({ label }) => label), ["Inspect the shipyard", "Back to city"]);
  assert.equal(review.options[0].action.nodeId, "shipyard");
  assert.equal(review.options[1].action.nodeId, "root");

  selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    0,
    {
      shipStats: stats,
      shipyard: economy.shipyards.yards.get(city.cityId),
      simMinute: 100
    }
  );
  const accounts = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    shipyard: economy.shipyards.yards.get(city.cityId),
    simMinute: 100
  });
  assert.equal(accounts.presentation.kind, "player-shipyard-ledger");
  assert.equal(accounts.presentation.tab, "books");
});

test("an owned shipyard buys uncommitted construction cargo through its stores tab", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
  gameState.cargo.timber = 5;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const yard = fundWorldEconomyShipyard(economy, city, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  for (const goodId of ["timber", "iron", "naval-stores", "linen-cloth"]) {
    yard.materialInventory[goodId] = 0;
    economy.portStates.get(city.cityId).goods.get(goodId).stock = 0;
  }
  const context = { shipStats: stats, shipyard: yard, simMinute: 100 };
  const arrivalSession = createPortDialogueSession(city, {
    initialNodeId: "shipyard-arrival",
    admittedToPort: true
  });
  arrivalSession.shipyardMaterialArrival = true;
  const arrivalView = portDialogueView(
    arrivalSession,
    city,
    gameState,
    economy,
    [city],
    context
  );
  assert.equal(arrivalView.presentation, undefined);
  assert.match(arrivalView.text, /short of timber/);
  assert.equal(arrivalView.options[0].label, "Keep the cargo aboard");
  assert.equal(arrivalView.options[0].action.nodeId, "shipyard-arrival-review");
  const arrivalSaleIndex = arrivalView.options.findIndex((entry) => (
    entry.action.type === "sell-shipyard-material" && entry.action.goodId === "timber"
  ));
  assert.ok(arrivalSaleIndex >= 0);
  const arrivalSale = selectPortDialogueOption(
    arrivalSession,
    city,
    gameState,
    economy,
    [city],
    arrivalSaleIndex,
    context
  );
  assert.equal(arrivalSale.marketSale.good.id, "timber");
  const materialFollowup = portDialogueView(
    arrivalSession,
    city,
    gameState,
    economy,
    [city],
    context
  );
  assert.equal(materialFollowup.options.at(-1).label, "Continue");
  assert.equal(materialFollowup.options.at(-1).action.nodeId, "shipyard-arrival-review");

  yard.materialInventory.timber = 0;
  gameState.cargo.timber = 5;
  const session = createPortDialogueSession(city, {
    initialNodeId: "shipyard",
    shipyardLedgerTab: "materials",
    admittedToPort: true
  });
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(view.optionColumns, 3);
  const saleIndex = view.options.findIndex((entry) => (
    entry.action.type === "sell-shipyard-material" && entry.action.goodId === "timber"
  ));
  assert.ok(saleIndex >= 0);
  assert.equal(view.options[saleIndex].rowId, "shipyard-material-timber");
  const result = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    saleIndex,
    context
  );

  assert.equal(result.marketSale.good.id, "timber");
  assert.equal(gameState.cargo.timber, undefined);
  assert.equal(yard.materialInventory.timber, 5);
  assert.equal(economy.portStates.get(city.cityId).goods.get("timber").stock, 0);
  assert.match(session.feedback, /moved straight to the yard stores/);

  yard.materialInventory.timber = 0;
  gameState.cargo.timber = 5;
  gameState.doubloons = 100000;
  beginShipyardInvestment(gameState, {
    tileId: 11,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    settlementType: "city"
  }, { famous: true, playerBacking: null }, 100);
  const reservedView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(reservedView.options.some((entry) => (
    entry.action.type === "sell-shipyard-material" && entry.action.goodId === "timber"
  )), false);
});

test("owned shipyard supply hints are cached and can become named waypoints", () => {
  const city = {
    tileId: 10,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "spain",
    character: { name: "Diego de Vargas", role: "harbour-master" }
  };
  const source = {
    tileId: 11,
    cityId: "exeter|england",
    city: "Exeter",
    displayCity: "Exeter",
    country: "England",
    cityType: "northern-european",
    settlementType: "city",
    population: 30000,
    factionId: "england",
    lat: 50.72,
    lon: -3.53,
    character: { name: "Thomas Carew", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
  const economy = createWorldEconomy({ ports: [city, source], startMinute: 0 });
  const yard = fundWorldEconomyShipyard(economy, city, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  for (const goodId of ["timber", "iron", "naval-stores", "linen-cloth"]) {
    yard.materialInventory[goodId] = 0;
    economy.portStates.get(city.cityId).goods.get(goodId).stock = 0;
  }
  const timber = economy.portStates.get(source.cityId).goods.get("timber");
  timber.stock = 50;
  timber.productionPerDay = 1;
  const session = createPortDialogueSession(city, {
    initialNodeId: "shipyard",
    shipyardLedgerTab: "yard",
    admittedToPort: true
  });
  let distanceCalls = 0;
  const context = {
    shipStats: stats,
    shipyard: yard,
    simMinute: 100,
    portCities: [city, source],
    sailingDistanceKm: () => {
      distanceCalls += 1;
      return 420;
    }
  };

  portDialogueView(session, city, gameState, economy, [city, source], context);
  assert.equal(distanceCalls, 0);
  session.shipyardLedgerTab = "materials";
  const stores = portDialogueView(session, city, gameState, economy, [city, source], context);
  assert.equal(distanceCalls, 1);
  portDialogueView(session, city, gameState, economy, [city, source], context);
  assert.equal(distanceCalls, 1);
  const timberHeading = stores.options.find((entry) => (
    entry.action.type === "set-port-heading" &&
    entry.action.shipyardMaterialGoodId === "timber"
  ));
  assert.equal(timberHeading.action.destinationName, "Exeter");
  assert.match(timberHeading.label, /Exeter \(Timber\)/);
  assert.equal(timberHeading.rowId, "shipyard-material-timber");
});

test("shipyard hints prefer an open supplier but still name a barred last source", () => {
  const city = {
    tileId: 20,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    settlementType: "city",
    population: 100000,
    factionId: "england",
    character: { name: "William Harcourt", role: "harbour-master" }
  };
  const barredSource = {
    ...city,
    tileId: 21,
    cityId: "rouen|france",
    city: "Rouen",
    displayCity: "Rouen",
    country: "France",
    population: 50000,
    factionId: "france"
  };
  const openSource = {
    ...city,
    tileId: 22,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    factionId: "portugal"
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral"]
    }
  });
  gameState.relations.diplomacy.overrides[diplomacyPairKey("england", "france")] =
    DIPLOMACY_HOSTILE;
  gameState.relations.factionReputation.france = 0;
  gameState.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
  const ports = [city, barredSource, openSource];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const yard = fundWorldEconomyShipyard(economy, city, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  yard.materialInventory.timber = 100;
  yard.materialInventory.iron = 100;
  yard.materialInventory["naval-stores"] = 100;
  yard.materialInventory["linen-cloth"] = 0;
  economy.portStates.get(city.cityId).goods.get("linen-cloth").stock = 0;
  for (const source of [barredSource, openSource]) {
    const linen = economy.portStates.get(source.cityId).goods.get("linen-cloth");
    linen.stock = 20;
    linen.productionPerDay = 1;
  }
  const context = {
    shipStats: stats,
    shipyard: yard,
    simMinute: 100,
    portCities: ports,
    sailingDistanceKm: (_origin, destination) => destination.tileId === barredSource.tileId ? 100 : 500
  };
  const openSession = createPortDialogueSession(city, {
    initialNodeId: "shipyard",
    shipyardLedgerTab: "materials",
    admittedToPort: true
  });
  const openView = portDialogueView(openSession, city, gameState, economy, ports, context);
  const preferred = openView.presentation.materialSources.find((source) => (
    source.goodId === "linen-cloth"
  ));
  assert.equal(preferred.destinationName, "Lisbon");
  assert.equal(preferred.accessible, true);

  economy.portStates.get(openSource.cityId).goods.get("linen-cloth").stock = 0;
  const barredSession = createPortDialogueSession(city, {
    initialNodeId: "shipyard",
    shipyardLedgerTab: "materials",
    admittedToPort: true
  });
  const barredView = portDialogueView(barredSession, city, gameState, economy, ports, context);
  const fallback = barredView.presentation.materialSources.find((source) => (
    source.goodId === "linen-cloth"
  ));
  assert.equal(fallback.destinationName, "Rouen");
  assert.equal(fallback.accessible, false);
  const heading = barredView.options.find((entry) => (
    entry.action.type === "set-port-heading" &&
    entry.action.shipyardMaterialGoodId === "linen-cloth"
  ));
  assert.match(heading.label, /Rouen \(Sailcloth; harbor barred\)/);
});

test("a player-backed yard replaces the ordinary shipyard and keeps its finished hull purchasable", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    settlementType: "city",
    population: 100000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 200000;
  gameState.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const yard = fundWorldEconomyShipyard(economy, city, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  yard.buildStartedMinute = 0;
  yard.nextBuildMinute = 90 * 1440;
  yard.listing = generateShipyardListing(yard, 12, 0);
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard", admittedToPort: true });
  const view = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    shipyard: yard,
    simMinute: 30 * 1440
  });

  assert.equal(view.presentation.kind, "player-shipyard-ledger");
  assert.equal(view.presentation.ledger.currentBuild.daysRemaining, 60);
  assert.equal(view.presentation.ledger.finishedShip.id, yard.listing.id);
  const inspectIndex = view.options.findIndex((entry) => entry.action.type === "inspect-shipyard-listing");
  assert.ok(inspectIndex >= 0);
  assert.ok(!view.options.some((entry) => entry.action.type === "purchase-ship"));
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], inspectIndex, {
      shipStats: stats,
      shipyard: yard,
      simMinute: 30 * 1440
    }),
    { closed: false }
  );
  const purchaseView = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    shipyard: yard,
    simMinute: 30 * 1440
  });
  assert.equal(purchaseView.presentation.kind, "shipyard");
  assert.equal(purchaseView.presentation.listing.id, yard.listing.id);
  const confirmIndex = purchaseView.options.findIndex((entry) => (
    entry.action.type === "confirm-ship-purchase"
  ));
  assert.ok(confirmIndex >= 0);
  assert.ok(!purchaseView.options.some((entry) => entry.action.type === "purchase-ship"));
  selectPortDialogueOption(session, city, gameState, economy, [city], confirmIndex, {
    shipStats: stats,
    shipyard: yard,
    simMinute: 30 * 1440
  });
  const confirmationView = portDialogueView(session, city, gameState, economy, [city], {
    shipStats: stats,
    shipyard: yard,
    simMinute: 30 * 1440
  });
  assert.equal(session.nodeId, "shipyard-purchase-confirm");
  assert.equal(session.selectedIndex, 1);
  assert.match(confirmationView.options[1].label, /^Keep /);
  assert.equal(view.options.filter((entry) => entry.label.includes("shipyard")).length, 0);
});

test("a completed ship sale gets a named historical handover before returning to port", () => {
  const city = {
    tileId: 10,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const currentStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  beginShipHandoverDialogue(session, {
    shipSlug: "galleon",
    transactionText: "The Galleon is yours for 90000 doubloons after trade-in.",
    sellerTitle: "shipwright"
  });

  const handover = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(handover.speaker, "Fernao da Cunha, shipwright");
  assert.equal(handover.expressionId, "pleased");
  assert.match(handover.text, /^The Galleon is yours for 90000 doubloons after trade-in\./);
  assert.match(handover.text, /sixteenth-century development of the carrack/);
  assert.deepEqual(handover.options.map((entry) => entry.label), ["Back to city"]);
  assert.doesNotMatch(handover.text, /rumou?r|for sale at/i);

  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0),
    { closed: false }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(session.shipHandover, null);
});

test("the Icelandic enthusiast unlocks the Viking longship after three fetch deliveries", () => {
  const city = {
    factionId: "denmark-norway",
    tileId: 64,
    cityId: "hafnarfjordur|iceland",
    city: "Hafnarfjordur",
    displayCity: "Hafnarfjordur",
    country: "Iceland",
    cityType: "northern-european",
    population: 1500,
    character: { name: "Leif Eriksen", role: "harbour-master" }
  };
  const currentStats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const context = { shipStats: currentStats };
  const session = createPortDialogueSession(city, { initialNodeId: "root" });

  const hiddenRoot = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(hiddenRoot.options.some((entry) => entry.action.nodeId === "viking-longship"), false);
  maybeSpawnVikingLongshipQuest(gameState, city, { spawnChance: 1, simMinute: 0 });
  const arrival = createPortArrivalDialogueSession(city, { vikingLongshipApproach: true });
  assert.equal(arrival.nodeId, "viking-longship");
  const arrivalView = portDialogueView(arrival, city, gameState, economy, [city], context);
  assert.ok(arrivalView.options.some((entry) => entry.label === "Not now"));
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const enthusiastIndex = root.options.findIndex((entry) => entry.action.nodeId === "viking-longship");
  assert.ok(enthusiastIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], enthusiastIndex, context);

  const firstView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(firstView.speaker, "Leif Eriksen, historical enthusiast");
  assert.match(firstView.text, /historical enthusiast/i);
  assert.match(firstView.text, /could you find/i);
  assert.doesNotMatch(firstView.text, /bring me 8 wool\.?$/i);
  assert.equal(firstView.options.find((entry) => entry.action.type === "deliver-viking-material").disabled, true);

  gameState.cargo = { wool: 3, timber: 6, iron: 3 };
  gameState.accounts.cargoCostBasis = { wool: 144, timber: 84, iron: 78 };
  let view = portDialogueView(session, city, gameState, economy, [city], context);
  let deliveryIndex = view.options.findIndex((entry) => entry.action.type === "deliver-viking-material");
  assert.match(view.options[deliveryIndex].label, /Wool x3/);
  const partialWool = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    deliveryIndex,
    { ...context, simMinute: 500 }
  );
  assert.equal(partialWool.vikingLongshipDelivery.complete, false);
  assert.equal(partialWool.vikingLongshipDelivery.remainingQuantity, 5);
  assert.equal(vikingLongshipQuestState(gameState, city).stageIndex, 0);
  gameState.cargo.wool = 5;
  for (const expectedGood of ["Wool", "Timber", "Iron"]) {
    view = portDialogueView(session, city, gameState, economy, [city], context);
    deliveryIndex = view.options.findIndex((entry) => entry.action.type === "deliver-viking-material");
    assert.match(view.options[deliveryIndex].label, new RegExp(expectedGood));
    const result = selectPortDialogueOption(session, city, gameState, economy, [city], deliveryIndex, {
      ...context,
      simMinute: 500
    });
    assert.ok(result.vikingLongshipDelivery);
  }

  const reward = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(reward.presentation.kind, "shipyard");
  assert.equal(reward.presentation.listing.shipSlug, "viking-longship");
  assert.equal(reward.presentation.listing.price, 0);
  assert.equal(reward.presentation.currentShipSlug, "brigantine");
  assert.deepEqual(reward.presentation.purchaseTerms, {
    listingPrice: 0,
    tradeInValue: 0,
    netPrice: 0
  });
  assert.equal(
    createShipComparisonView(
      reward.presentation.currentShipSlug,
      reward.presentation.listing.shipSlug
    ).candidate.slug,
    "viking-longship"
  );
  assert.match(reward.text, /accepting replaces your Brigantine/i);
  assert.ok(reward.options.some((entry) => entry.action.type === "accept-viking-longship-reward"));
  assert.equal(reward.options.some((entry) => entry.label === "Back"), false);
  assert.equal(reward.options.length, 2);
  const declineIndex = reward.options.findIndex((entry) => entry.action.type === "decline-viking-longship-reward");
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], declineIndex, context),
    { closed: false, vikingLongshipRewardDeclined: true }
  );

  gameState.doubloons = 50000;
  const availableForPurchase = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(availableForPurchase.text, /part with her for 42000 doubloons/i);
  assert.equal(availableForPurchase.presentation.currentShipSlug, "brigantine");
  assert.deepEqual(availableForPurchase.presentation.purchaseTerms, {
    listingPrice: 42000,
    tradeInValue: 0,
    netPrice: 42000
  });
  const purchaseIndex = availableForPurchase.options.findIndex(
    (entry) => entry.action.type === "purchase-viking-longship"
  );
  assert.equal(availableForPurchase.options[purchaseIndex].disabled, false);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], purchaseIndex, context),
    { closed: false, action: { type: "purchase-viking-longship", shipSlug: "viking-longship" } }
  );
  markVikingLongshipPurchased(gameState);
  const postPurchaseRoot = portDialogueView(
    createPortDialogueSession(city, { initialNodeId: "root" }),
    city,
    gameState,
    economy,
    [city],
    context
  );
  assert.equal(
    postPurchaseRoot.options.some((entry) => entry.action.nodeId === "viking-longship"),
    false
  );
});

test("a Kyoto gunsmith establishes domestic matchlock production after Nagasaki opens", () => {
  const city = {
    factionId: "japan",
    tileId: 65,
    cityId: "kyoto|japan",
    city: "Kyoto",
    displayCity: "Kyoto",
    country: "Japan",
    cityType: "east-asian",
    population: 100000,
    character: { name: "Sato Masanobu", role: "harbour-master" }
  };
  const gameState = createGameState({ cargoCapacity: 50 });
  establishNagasakiQuest(gameState, city);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const startingDoubloons = gameState.doubloons;

  maybeSpawnJapaneseMatchlockQuest(gameState, city, { spawnChance: 1, simMinute: 0 });
  const arrival = createPortArrivalDialogueSession(city, { japaneseMatchlockApproach: true });
  assert.equal(arrival.nodeId, "japanese-matchlocks");
  assert.match(portDialogueView(arrival, city, gameState, economy, [city]).text, /Nagasaki/);

  const session = arrival;
  gameState.cargo = Object.fromEntries(JAPANESE_MATCHLOCK_FETCH_STAGES.map((stage) => [
    stage.goodId,
    stage.quantity
  ]));
  gameState.accounts.cargoCostBasis = Object.fromEntries(JAPANESE_MATCHLOCK_FETCH_STAGES.map((stage) => [
    stage.goodId,
    stage.quantity * 10
  ]));
  const firstStage = JAPANESE_MATCHLOCK_FETCH_STAGES[0];
  gameState.cargo[firstStage.goodId] = 1;
  let partialView = portDialogueView(session, city, gameState, economy, [city]);
  let partialIndex = partialView.options.findIndex(
    (entry) => entry.action.type === "deliver-japanese-matchlock-material"
  );
  const partial = selectPortDialogueOption(
    session,
    city,
    gameState,
    economy,
    [city],
    partialIndex,
    { simMinute: 400 }
  );
  assert.equal(partial.japaneseMatchlockDelivery.complete, false);
  assert.equal(gameState.doubloons, startingDoubloons);
  gameState.cargo[firstStage.goodId] = 1;
  for (const stage of JAPANESE_MATCHLOCK_FETCH_STAGES) {
    const view = portDialogueView(session, city, gameState, economy, [city]);
    const deliveryIndex = view.options.findIndex(
      (entry) => entry.action.type === "deliver-japanese-matchlock-material"
    );
    assert.match(view.options[deliveryIndex].label, new RegExp(stage.goodLabel));
    assert.equal(dialogueOptionIconId(view.options[deliveryIndex]), `good:${stage.goodId}`);
    selectPortDialogueOption(session, city, gameState, economy, [city], deliveryIndex, {
      simMinute: 500
    });
  }

  const completed = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(completed.text, /Kyoto's smiths can make matchlocks of our own/i);
  assert.equal(gameState.doubloons, startingDoubloons + JAPANESE_MATCHLOCK_COMPLETION_REWARD);
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  assert.equal(market.get(MATCHLOCKS_GOOD_ID).productionPerDay, 1.5);
  assert.ok(market.get(MATCHLOCKS_GOOD_ID).listedForSale);

  const root = createPortDialogueSession(city, { initialNodeId: "root" });
  const gunsmithIndex = portDialogueView(root, city, gameState, economy, [city]).options.findIndex(
    (entry) => entry.action.nodeId === "japanese-matchlocks"
  );
  assert.ok(gunsmithIndex >= 0);
  assert.doesNotThrow(() => selectPortDialogueOption(
    root,
    city,
    gameState,
    economy,
    [city],
    gunsmithIndex
  ));
});

test("a Caribbean planter pays for ginger roots and establishes local production", () => {
  const city = {
    tileId: 68,
    cityId: "havana|cuba",
    city: "Havana",
    displayCity: "Havana",
    country: "Cuba",
    cityType: "mediterranean",
    population: 8000,
    character: { name: "Isabel de Rojas", role: "harbour-master" }
  };
  const gameState = createGameState({ cargoCapacity: 50 });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const startingDoubloons = gameState.doubloons;

  maybeSpawnCaribbeanGingerQuest(gameState, city, { spawnChance: 1, simMinute: 0 });
  const arrival = createPortArrivalDialogueSession(city, { caribbeanGingerApproach: true });
  assert.equal(arrival.nodeId, "caribbean-ginger");
  const arrivalView = portDialogueView(arrival, city, gameState, economy, [city]);
  assert.match(arrivalView.text, /Southeast Asia/);
  assert.ok(arrivalView.text.length <= 150);

  const session = arrival;
  gameState.cargo[GINGER_GOOD_ID] = 2;
  gameState.accounts.cargoCostBasis[GINGER_GOOD_ID] = 60;
  let view = portDialogueView(session, city, gameState, economy, [city]);
  let deliveryIndex = view.options.findIndex(
    (entry) => entry.action.type === "deliver-caribbean-ginger"
  );
  assert.equal(dialogueOptionIconId(view.options[deliveryIndex]), `good:${GINGER_GOOD_ID}`);
  const partial = selectPortDialogueOption(session, city, gameState, economy, [city], deliveryIndex, {
    simMinute: 500
  });
  assert.equal(partial.caribbeanGingerDelivery.complete, false);
  assert.equal(partial.caribbeanGingerIndustry, null);
  assert.equal(gameState.doubloons, startingDoubloons);
  gameState.cargo[GINGER_GOOD_ID] = 4;
  view = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(view.text, /Delivered: 2\/6/);
  assert.ok(view.text.length <= 170);
  deliveryIndex = view.options.findIndex(
    (entry) => entry.action.type === "deliver-caribbean-ginger"
  );
  selectPortDialogueOption(session, city, gameState, economy, [city], deliveryIndex, {
    simMinute: 600
  });

  const completed = portDialogueView(session, city, gameState, economy, [city]);
  assert.match(completed.text, /ginger has taken beautifully/i);
  assert.ok(completed.text.length <= 130);
  assert.equal(gameState.doubloons, startingDoubloons + CARIBBEAN_GINGER_COMPLETION_REWARD);
  const market = new Map(portMarket(economy, city).map((row) => [row.good.id, row]));
  assert.equal(market.get(GINGER_GOOD_ID).productionPerDay, 1.25);
  assert.ok(market.get(GINGER_GOOD_ID).listedForSale);
});

test("Panama dialogue commissions, provisions, and embarks the Inca expedition", () => {
  const panama = conquestQuestCity(
    137225,
    "Panama City",
    "Panama",
    8.9824,
    -79.5199,
    "spain",
    "Hernando de Soto"
  );
  const chanChan = conquestQuestCity(
    134664,
    "Chanchan",
    "Peru",
    -8.106,
    -79.0745,
    "inca",
    "Cusi Yupanqui"
  );
  const cuzco = conquestQuestCity(
    134185,
    "Cuzco",
    "Peru",
    -13.5319,
    -71.9675,
    "inca",
    "Titu Cusi"
  );
  const cartagena = conquestQuestCity(
    137226,
    "Cartagena",
    "Colombia",
    10.391,
    -75.479,
    "spain",
    "Juan de la Cosa"
  );
  const ports = [panama, chanChan, cuzco, cartagena];
  const stats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.doubloons = 10_000;
  restockShipLoadoutAtPort(gameState, panama, stats, "short-haul", { simMinute: 0 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const context = { portCities: ports, simMinute: 100, shipStats: stats };
  const proactiveArrival = createPortArrivalDialogueSession(panama, {
    conquistadorApproach: true
  });
  assert.equal(proactiveArrival.nodeId, "conquistador");
  assert.equal(proactiveArrival.conquistadorArrival, true);
  const session = createPortDialogueSession(panama, { initialNodeId: "root" });

  let view = portDialogueView(session, panama, gameState, economy, ports, context);
  const speakerIndex = view.options.findIndex((entry) => entry.action.nodeId === "conquistador");
  assert.ok(speakerIndex >= 0);
  selectPortDialogueOption(session, panama, gameState, economy, ports, speakerIndex, context);

  view = portDialogueView(session, panama, gameState, economy, ports, context);
  assert.match(view.text, /Crown licenses me.*God and His Majesty/s);
  const acceptIndex = view.options.findIndex(
    (entry) => entry.action.type === "accept-conquistador-expedition"
  );
  assert.equal(view.options[acceptIndex].disabled, false);
  selectPortDialogueOption(session, panama, gameState, economy, ports, acceptIndex, context);

  for (const stage of CONQUISTADOR_FETCH_STAGES) {
    gameState.cargo[stage.goodId] = stage.quantity;
    view = portDialogueView(session, panama, gameState, economy, ports, context);
    assert.match(view.text, /God and the King.*my notary/s);
    const deliveryIndex = view.options.findIndex(
      (entry) => entry.action.type === "deliver-conquistador-material"
    );
    assert.equal(dialogueOptionIconId(view.options[deliveryIndex]), `good:${stage.goodId}`);
    selectPortDialogueOption(session, panama, gameState, economy, ports, deliveryIndex, context);
  }

  view = portDialogueView(session, panama, gameState, economy, ports, context);
  assert.match(view.text, /notary.*chaplain.*every man counted his share/s);
  let embarkIndex = view.options.findIndex(
    (entry) => entry.action.type === "begin-conquistador-expedition"
  );
  assert.equal(view.options[embarkIndex].disabled, true);
  const switchIndex = view.options.findIndex(
    (entry) => entry.action.type === "select-loadout"
  );
  assert.equal(view.options[switchIndex].label, "Switch to Combat focused");
  const loadoutArrival = createPortArrivalDialogueSession(panama, {
    conquistadorEmbarkationApproach: true
  });
  assert.equal(loadoutArrival.nodeId, "conquistador");
  assert.equal(loadoutArrival.conquistadorEmbarkationApproached, true);
  selectPortDialogueOption(session, panama, gameState, economy, ports, switchIndex, context);
  assert.equal(gameState.ship.loadoutId, "combat");
  assert.equal(session.nodeId, "conquistador");
  setTestCrewCount(gameState, gameState.ship.loadoutTargets.crew);
  setTestCrewExperienceStars(gameState, 3);
  view = portDialogueView(session, panama, gameState, economy, ports, context);
  embarkIndex = view.options.findIndex(
    (entry) => entry.action.type === "begin-conquistador-expedition"
  );
  assert.equal(view.options[embarkIndex].disabled, false);
  const embarked = selectPortDialogueOption(
    session,
    panama,
    gameState,
    economy,
    ports,
    embarkIndex,
    context
  );
  assert.equal(gameState.memory.quests.conquistador.stage, CONQUISTADOR_STAGE_CAPTURE);
  assert.ok(embarked.conquistadorDiplomacyEvents.length > 0);

  const attack = playerPortAttackStatus(gameState, chanChan);
  assert.equal(attack.mode, "conquest");
  assert.equal(attack.captureFactionId, "spain");
  assert.equal(attack.piracy, false);
  const landingSession = createPortDialogueSession(chanChan, { initialNodeId: "barred" });
  const landingView = portDialogueView(landingSession, chanChan, gameState, economy, ports, {
    ...context,
    portEntryStatus: portEntryStatus(gameState, chanChan, context.simMinute),
    portRecoveryStatus: { attackerShipLabel: "your ship", disabledUntilMinute: 3000, daysRemaining: 2 },
    portAttackStatus: attack,
    portConquestStatus: {
      canAttempt: true,
      playerAssaultActive: true,
      successPercent: 79,
      expectedCasualtiesRounded: 7,
      expectedDeathsRounded: 4,
      expectedWoundedRounded: 3,
      casualtyRangeLow: 4,
      casualtyRangeHigh: 11,
      capital: false,
      conquistadorCompany: { ready: true }
    }
  });
  assert.match(landingView.text, /conquistadors are lowering their boats/i);
  assert.match(landingView.text, /Spanish Trujillo.*march inland toward Cuzco/i);
  assert.equal(landingView.options[0].label, "Start the assault");

  view = portDialogueView(session, panama, gameState, economy, ports, context);
  assert.match(view.text, /royal seal.*cross.*Spain's peace/s);

  const memory = gameState.memory.quests.conquistador;
  recordConquistadorAssaultFailure(memory, 18);
  const replenishmentSession = createPortDialogueSession(cartagena, {
    initialNodeId: "conquistador",
    nextPortNodeId: "root",
    admittedToPort: true
  });
  replenishmentSession.conquistadorArrival = true;
  view = portDialogueView(replenishmentSession, cartagena, gameState, economy, ports, context);
  assert.match(view.text, /royal commission.*replace the fallen.*first one taught us/s);
  const replenishIndex = view.options.findIndex(
    (entry) => entry.action.type === "replenish-conquistador-company"
  );
  assert.equal(view.options[replenishIndex].disabled, false);
  const replenished = selectPortDialogueOption(
    replenishmentSession,
    cartagena,
    gameState,
    economy,
    ports,
    replenishIndex,
    context
  );
  assert.equal(replenished.conquistadorReplenishment.added, 18);
  view = portDialogueView(replenishmentSession, cartagena, gameState, economy, ports, context);
  assert.match(view.text, /ranks are full again.*Take us south/s);

  memory.stage = CONQUISTADOR_STAGE_CAMPAIGN;
  memory.companyStrength = 0;
  memory.companyNeedsReplenishment = false;
  memory.capturedAtMinute = 100;
  memory.rewardReadyMinute = 2000;
  chanChan.displayCity = "Trujillo";
  const trujilloSession = createPortDialogueSession(chanChan, { initialNodeId: "conquistador" });
  view = portDialogueView(trujilloSession, chanChan, gameState, economy, ports, {
    ...context,
    simMinute: 500
  });
  assert.match(view.text, /conquered coast.*Cuzco.*God willing/s);

  memory.stage = CONQUISTADOR_STAGE_REWARD_READY;
  view = portDialogueView(trujilloSession, chanChan, gameState, economy, ports, {
    ...context,
    simMinute: 2000
  });
  assert.match(view.text, /Cuzco answers to the Crown.*kept faith/s);

  memory.stage = CONQUISTADOR_STAGE_COMPLETE;
  memory.completedAtMinute = 2000;
  view = portDialogueView(trujilloSession, chanChan, gameState, economy, ports, {
    ...context,
    simMinute: 2001
  });
  assert.match(view.text, /weighed and witnessed.*Panama remembers/s);
});

function conquestQuestCity(tileId, city, country, lat, lon, factionId, characterName) {
  return {
    cityId: `${city.toLocaleLowerCase("en-US")}|${country.toLocaleLowerCase("en-US")}`,
    tileId,
    city,
    displayCity: city,
    country,
    lat,
    lon,
    factionId,
    cityType: "andean",
    population: 25000,
    character: { name: characterName, role: "harbour-master", personalityId: "bold" }
  };
}

function establishNagasakiQuest(gameState, kyoto) {
  const target = {
    ...colonizationTargetForCity({ cityId: "nagasaki|japan", city: "Nagasaki", country: "Japan" }),
    tileId: 66
  };
  const origin = {
    tileId: 67,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    lat: 38.72,
    lon: -9.14
  };
  assignColonizationQuest(gameState.memory.colonization, {
    target,
    origin,
    approvalPort: { ...kyoto, factionId: "japan", lat: 35.01, lon: 135.77 }
  });
  for (const stage of colonizationQuestView(gameState).history.fetchStages) {
    completeColonizationFetchStage(gameState.memory.colonization, stage.id);
  }
  beginColonizationExpedition(gameState.memory.colonization);
  grantColonizationApproval(gameState.memory.colonization, { approvalCargoDelivered: true });
  landColonists(gameState.memory.colonization, 100);
  advanceColonizationQuest(gameState.memory.colonization, 101, { awayFromColony: true });
  establishColony(gameState.memory.colonization, 102);
}

test("declining a passenger clears the offer without starting or failing it", () => {
  const origin = {
    tileId: 1,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const quest = {
    id: "passenger-1-2-test",
    kind: "passenger",
    originKey: "Lisbon|Portugal|1",
    originCityId: origin.cityId,
    originTileId: origin.tileId,
    originName: "Lisbon",
    destinationTileId: 2,
    destinationName: "Goa",
    distanceKm: 7640,
    passenger: { id: "passenger:mateo-costa", name: "Mateo Costa" },
    reward: 180,
    scenarioId: "family-letter",
    dialogue: {
      offer: "A letter found me in Lisbon. My family in Goa needs me before the season turns.",
      arrival: "Goa at last."
    }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.memory.quests.passengerOffers[quest.originKey] = quest;
  const session = createPassengerDialogueSession(origin, quest);

  const offer = passengerDialogueView(session, origin, quest, gameState);
  assert.equal(offer.speaker, "Mateo Costa, passenger");
  assert.match(offer.text, /7,640 km/);
  assert.equal(offer.options[0].detail, "7,640 km");
  assert.deepEqual(offer.options.map((option) => option.label), [
    "Take passenger to Goa  180 db",
    "Decline"
  ]);
  assert.deepEqual(selectPassengerDialogueOption(session, origin, quest, gameState, 1), {
    closed: false,
    action: { type: "open-port" }
  });
  assert.equal(gameState.memory.quests.active, null);
  assert.equal(gameState.memory.quests.passengerActive, null);
  assert.equal(gameState.memory.quests.passengerOffers[quest.originKey], undefined);
  assert.equal(gameState.memory.quests.failed?.[quest.id], undefined);
});

test("a passenger can disembark before the captain enters a barred destination", () => {
  const destination = {
    tileId: 2,
    cityId: "algiers|algeria",
    city: "Algiers",
    displayCity: "Algiers",
    country: "Algeria",
    factionId: "ottoman"
  };
  const quest = {
    id: "passenger-hostile-algiers-test",
    kind: "passenger",
    originKey: "Lisbon|Portugal|1",
    originCityId: "lisbon|portugal",
    originTileId: 1,
    originName: "Lisbon",
    destinationKey: "Algiers|Algeria|2",
    destinationCityId: destination.cityId,
    destinationTileId: destination.tileId,
    destinationName: destination.city,
    destinationCountry: destination.country,
    distanceKm: 1100,
    passenger: { id: "passenger:yusuf-benali", name: "Yusuf Benali" },
    reward: 180,
    scenarioId: "family-letter",
    dialogue: { arrival: "Algiers at last." }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.memory.quests.passengerActive = quest;
  const session = createPassengerDialogueSession(destination, quest, {
    admittedToPort: false,
    continueToPortOnClose: true,
    nextPortNodeId: "barred"
  });

  assert.equal(session.admittedToPort, false);
  assert.equal(session.continueToPortOnClose, true);
  assert.equal(session.nextPortNodeId, "barred");
  assert.match(passengerDialogueView(session, destination, quest, gameState).options[0].label, /Set passenger ashore/);
  assert.deepEqual(
    selectPassengerDialogueOption(session, destination, quest, gameState, 0),
    { closed: true, action: null }
  );
  assert.equal(gameState.memory.quests.passengerActive, null);
});

test("a Muslim captain can accompany a Hajj passenger inland from Jeddah", () => {
  const jeddah = {
    tileId: 14,
    cityId: "jeddah|saudi arabia",
    city: "Jeddah",
    displayCity: "Jeddah",
    country: "Saudi Arabia",
    factionId: "ottoman"
  };
  const quest = {
    id: "passenger-hajj-aceh-jeddah",
    kind: "passenger",
    originKey: "Aceh|Indonesia|13",
    originCityId: "aceh|indonesia",
    originTileId: 13,
    originName: "Aceh",
    originFactionId: "ottoman",
    destinationKey: "Jeddah|Saudi Arabia|14",
    destinationCityId: jeddah.cityId,
    destinationTileId: jeddah.tileId,
    destinationName: "Jeddah",
    destinationCountry: "Saudi Arabia",
    distanceKm: 8600,
    passenger: { id: "passenger:nur-aisyah", name: "Nur Aisyah", religionId: "sunni-islam" },
    reward: 650,
    scenarioId: "hajj",
    dialogue: {
      arrival: "Jeddah at last—the sea gate to Mecca. From here the pilgrims take the road inland."
    }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Ahmed Reis",
      nationalityId: "ottoman",
      religionId: "sunni-islam",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.memory.quests.passengerActive = quest;
  const session = createPassengerDialogueSession(jeddah, quest);
  const before = gameState.doubloons;

  const arrival = passengerDialogueView(session, jeddah, quest, gameState);
  assert.match(arrival.text, /fellow Muslim/i);
  assert.equal(arrival.options[0].label, "Undertake the Hajj together");
  assert.deepEqual(selectPassengerDialogueOption(session, jeddah, quest, gameState, 0), {
    closed: false,
    action: null
  });

  const pilgrimage = passengerDialogueView(session, jeddah, quest, gameState);
  assert.match(pilgrimage.text, /stood together at Arafat/i);
  assert.equal(pilgrimage.options[0].label, "Return to Jeddah  650 db");
  const completion = selectPassengerDialogueOption(
    session,
    jeddah,
    quest,
    gameState,
    0,
    { simMinute: 2000 }
  );
  assert.equal(completion.closed, true);
  assert.equal(completion.action, null);
  assert.equal(completion.missionItemGift.item.id, HAJJ_PILGRIMAGE_PERK_ITEM_ID);
  assert.equal(completion.missionItemGift.guaranteed, true);
  assert.equal(gameState.inventory.items[HAJJ_PILGRIMAGE_PERK_ITEM_ID], 1);
  assert.equal(gameState.doubloons, before + quest.reward);
  assert.equal(gameState.memory.flags.hajjCompleted, true);
  assert.equal(gameState.memory.quests.passengerActive, null);

  const nonMuslimState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      religionId: "roman-catholic",
      expressions: ["neutral", "happy"]
    }
  });
  nonMuslimState.memory.quests.passengerActive = quest;
  const nonMuslimSession = createPassengerDialogueSession(jeddah, quest);
  assert.deepEqual(
    passengerDialogueView(nonMuslimSession, jeddah, quest, nonMuslimState)
      .options.map(({ label }) => label),
    ["See pilgrim to the Mecca road  650 db", "Not yet"]
  );
});

test("a captain of the relevant faith can join a religious mission for an extra reward", () => {
  const nanjing = {
    tileId: 102,
    cityId: "nanjing|china",
    city: "Nanjing",
    displayCity: "Nanjing",
    country: "China",
    factionId: "joseon"
  };
  const quest = {
    id: "passenger-religious-ming-mediation",
    kind: "passenger",
    originKey: "Beijing|China|101",
    originCityId: "beijing|china",
    originTileId: 101,
    originName: "Beijing",
    originFactionId: "ming",
    destinationKey: "Nanjing|China|102",
    destinationCityId: nanjing.cityId,
    destinationTileId: nanjing.tileId,
    destinationName: "Nanjing",
    destinationCountry: "China",
    distanceKm: 850,
    passenger: { id: "passenger:shi-dehai", name: "Shi Dehai", religionId: "mahayana-buddhism" },
    passengerReligionId: "mahayana-buddhism",
    reward: 300,
    scenarioId: "religious-ming-three-teachings-mediation",
    religiousMissionId: "ming-three-teachings-mediation",
    dialogue: {
      arrival: "Nanjing's Buddhist, Daoist, and civic elders are seated together."
    }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Lin Mei",
      nationalityId: "ming",
      religionId: "daoism",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.memory.quests.passengerActive = quest;
  const session = createPassengerDialogueSession(nanjing, quest);
  const beforeDoubloons = gameState.doubloons;
  const beforeStanding = factionReputation(gameState, "joseon");

  const arrival = passengerDialogueView(session, nanjing, quest, gameState);
  assert.equal(arrival.speaker, "Shi Dehai, Buddhist monk");
  assert.deepEqual(arrival.options.map(({ label }) => label), [
    "Help reconcile the two temples",
    "Set Buddhist monk ashore  300 db",
    "Not yet"
  ]);
  assert.equal(dialogueOptionIconId(arrival.options[0]), "religion:buddhist");
  assert.deepEqual(selectPassengerDialogueOption(session, nanjing, quest, gameState, 0), {
    closed: false,
    action: null
  });

  const mediation = passengerDialogueView(session, nanjing, quest, gameState);
  assert.match(mediation.text, /shared upkeep/);
  assert.equal(mediation.options[0].label, "Complete the mission  420 db");
  const completion = selectPassengerDialogueOption(
    session,
    nanjing,
    quest,
    gameState,
    0,
    { simMinute: 400 }
  );
  assert.equal(completion.closed, true);
  assert.equal(completion.religiousMissionParticipation.title, "Two Temples, One Harbor");
  assert.equal(completion.religiousMissionParticipation.bonusDoubloons, 120);
  assert.equal(gameState.doubloons, beforeDoubloons + quest.reward + 120);
  assert.equal(factionReputation(gameState, "joseon"), beforeStanding + 3);
  assert.equal(gameState.memory.quests.passengerActive, null);

  const outsiderState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      religionId: "roman-catholic",
      expressions: ["neutral", "happy"]
    }
  });
  outsiderState.memory.quests.passengerActive = quest;
  const outsiderSession = createPassengerDialogueSession(nanjing, quest);
  assert.deepEqual(
    passengerDialogueView(outsiderSession, nanjing, quest, outsiderState)
      .options.map(({ label }) => label),
    ["Set Buddhist monk ashore  300 db", "Not yet"]
  );
});

test("a Catholic captain chooses whether the September Testament changes their faith", () => {
  const simMinute = gameMinuteForDate(1535, 1, 1);
  const destination = {
    tileId: 202,
    cityId: "bremen|germany",
    city: "Bremen",
    displayCity: "Bremen",
    country: "Germany",
    factionId: "denmark-norway"
  };
  const quest = {
    id: "passenger-september-testament-conversion",
    kind: "passenger",
    originKey: "Hamburg|Germany|201",
    originCityId: "hamburg|germany",
    originTileId: 201,
    originName: "Hamburg",
    originFactionId: "denmark-norway",
    destinationKey: "Bremen|Germany|202",
    destinationCityId: destination.cityId,
    destinationTileId: destination.tileId,
    destinationName: destination.city,
    destinationCountry: destination.country,
    distanceKm: 95,
    passenger: { id: "passenger:greta-weiss", name: "Greta Weiss", religionId: "lutheran" },
    passengerReligionId: "lutheran",
    reward: 180,
    scenarioId: "religious-september-testament",
    religiousMissionId: "september-testament",
    dialogue: {
      arrival: "Bremen's booksellers have shutters drawn and buyers waiting."
    }
  };
  const catholicCaptain = {
    name: "Isabel Duarte",
    nationalityId: "portugal",
    religionId: "roman-catholic",
    expressions: ["neutral", "happy"]
  };

  const convertingState = createGameState({
    cargoCapacity: 20,
    startMinute: simMinute,
    playerCharacter: catholicCaptain
  });
  convertingState.memory.quests.passengerActive = quest;
  const convertingSession = createPassengerDialogueSession(destination, quest);
  const swedishBefore = factionReputation(convertingState, "sweden");
  const spanishBefore = factionReputation(convertingState, "spain");

  assert.deepEqual(
    selectPassengerDialogueOption(convertingSession, destination, quest, convertingState, 0),
    { closed: false, action: null }
  );
  const choice = passengerDialogueView(convertingSession, destination, quest, convertingState);
  assert.match(choice.text, /read the Bibles/);
  assert.deepEqual(choice.options.map(({ label }) => label), [
    "Remain Roman Catholic",
    "Become Lutheran"
  ]);
  const conversion = selectPassengerDialogueOption(
    convertingSession,
    destination,
    quest,
    convertingState,
    1,
    { simMinute }
  );
  assert.equal(conversion.closed, true);
  assert.equal(conversion.religiousConversion.religionId, "lutheran");
  assert.equal(convertingState.playerCharacter.religionId, "lutheran");
  assert.ok(factionReputation(convertingState, "sweden") > swedishBefore);
  assert.ok(factionReputation(convertingState, "spain") < spanishBefore);
  assert.equal(convertingState.memory.flags.septemberTestamentFaithDecisionMade, true);
  assert.equal(convertingState.memory.quests.passengerActive, null);

  const remainingState = createGameState({
    cargoCapacity: 20,
    startMinute: simMinute,
    playerCharacter: catholicCaptain
  });
  remainingState.memory.quests.passengerActive = quest;
  const remainingSession = createPassengerDialogueSession(destination, quest);
  const remainingSwedishBefore = factionReputation(remainingState, "sweden");
  const remainingSpanishBefore = factionReputation(remainingState, "spain");
  selectPassengerDialogueOption(remainingSession, destination, quest, remainingState, 0);
  const remaining = selectPassengerDialogueOption(
    remainingSession,
    destination,
    quest,
    remainingState,
    0,
    { simMinute }
  );
  assert.equal(remaining.closed, true);
  assert.equal(remaining.religiousConversion.religionId, "roman-catholic");
  assert.equal(remainingState.playerCharacter.religionId, "roman-catholic");
  assert.equal(factionReputation(remainingState, "sweden"), remainingSwedishBefore);
  assert.equal(factionReputation(remainingState, "spain"), remainingSpanishBefore);
  assert.equal(remainingState.memory.quests.passengerActive, null);
});

test("three Testament deliveries convert factors before any captain may convert", () => {
  const simMinute = gameMinuteForDate(1535, 1, 1);
  const cities = [
    {
      tileId: 302,
      cityId: IMPERIAL_CITY_REFERENCES.BREMEN.id,
      city: "Bremen",
      country: "Germany",
      factionId: "bremen"
    },
    { cityId: "amsterdam|netherlands", tileId: 303, city: "Amsterdam", country: "Netherlands", factionId: "habsburg" },
    { cityId: "london|united kingdom", tileId: 304, city: "London", country: "United Kingdom", factionId: "england" }
  ].map((city) => ({ ...city, displayCity: city.city }));
  const itinerary = cities.map((city) => ({
    key: `${city.city}|${city.country}|${city.tileId}`,
    cityId: city.cityId,
    tileId: city.tileId,
    name: city.city,
    country: city.country,
    factionId: city.factionId,
    legDistanceKm: 600
  }));
  const quest = {
    id: "passenger-september-testament-circuit",
    kind: "passenger",
    originKey: "Hamburg|Germany|301",
    originCityId: "hamburg|germany",
    originTileId: 301,
    originName: "Hamburg",
    originFactionId: "denmark-norway",
    destinationKey: itinerary[0].key,
    destinationCityId: itinerary[0].cityId,
    destinationTileId: itinerary[0].tileId,
    destinationName: itinerary[0].name,
    destinationCountry: itinerary[0].country,
    distanceKm: 1800,
    passenger: { id: "passenger:greta-weiss", name: "Greta Weiss", religionId: "lutheran" },
    passengerReligionId: "lutheran",
    reward: 360,
    scenarioId: "religious-september-testament",
    religiousMissionId: "september-testament",
    itinerary: createQuestItinerary(itinerary, { mode: QUEST_ITINERARY_ORDERED }),
    dialogue: {}
  };
  const lutheranCaptainQuest = structuredClone(quest);
  const state = createGameState({
    cargoCapacity: 20,
    startMinute: simMinute,
    playerCharacter: {
      name: "Tenzin Dorje",
      nationalityId: "habsburg",
      religionId: "tibetan-buddhism",
      expressions: ["neutral", "happy"]
    }
  });
  state.memory.quests.passengerActive = quest;
  const papalBefore = papalAuthorityForState(state);

  for (let index = 0; index < cities.length; index += 1) {
    const city = cities[index];
    const session = createPassengerDialogueSession(city, quest);
    const arrival = passengerDialogueView(session, city, quest, state);
    assert.match(arrival.text, new RegExp(`delivery ${index + 1} of 3`));
    const delivery = selectPassengerDialogueOption(session, city, quest, state, 0, {
      simMinute: simMinute + index
    });
    assert.equal(delivery.religiousLegDelivery.legNumber, index + 1);
    if (index === 0) {
      assert.equal(delivery.religiousLegDelivery.imperialReligiousCirculation.religionId, "mixed");
      assert.equal(
        state.relations.imperial.cityReligions[IMPERIAL_CITY_REFERENCES.BREMEN.id],
        "mixed"
      );
      assert.equal(state.relations.imperial.religiousBlocByFactionId.bremen, "mixed");
    }
    assert.equal(papalAuthorityForState(state), papalBefore - (index + 1) * 0.8);
    assert.equal(
      reconcileCharacterForPapalAuthority(
        state,
        { name: `Factor ${index}`, religionId: "roman-catholic" },
        { portCityId: city.cityId }
      ).religionId,
      "lutheran"
    );
    if (index < 2) {
      assert.equal(delivery.closed, false);
      assert.equal(state.playerCharacter.religionId, "tibetan-buddhism");
      assert.equal(state.memory.quests.passengerActive.destinationTileId, cities[index + 1].tileId);
    } else {
      const choice = passengerDialogueView(session, city, quest, state);
      assert.deepEqual(choice.options.map(({ label }) => label), [
        "Keep my present faith",
        "Become Lutheran"
      ]);
      const swedishBefore = factionReputation(state, "sweden");
      const spanishBefore = factionReputation(state, "spain");
      const conversion = selectPassengerDialogueOption(session, city, quest, state, 1, {
        simMinute: simMinute + index
      });
      assert.equal(conversion.closed, true);
      assert.equal(state.playerCharacter.religionId, "lutheran");
      assert.ok(factionReputation(state, "sweden") > swedishBefore);
      assert.ok(factionReputation(state, "spain") < spanishBefore);
      assert.equal(state.memory.quests.passengerActive, null);
    }
  }

  lutheranCaptainQuest.itinerary.completedCityIds.push(cities[0].cityId, cities[1].cityId);
  Object.assign(lutheranCaptainQuest, {
    destinationKey: itinerary[2].key,
    destinationCityId: itinerary[2].cityId,
    destinationTileId: itinerary[2].tileId,
    destinationName: itinerary[2].name,
    destinationCountry: itinerary[2].country
  });
  const lutheranState = createGameState({
    cargoCapacity: 20,
    startMinute: simMinute,
    playerCharacter: {
      name: "Greta Albrecht",
      nationalityId: "bremen",
      religionId: "lutheran",
      expressions: ["neutral", "happy"]
    }
  });
  lutheranState.memory.quests.passengerActive = lutheranCaptainQuest;
  const finalSession = createPassengerDialogueSession(cities[2], lutheranCaptainQuest);
  const finalDelivery = selectPassengerDialogueOption(
    finalSession,
    cities[2],
    lutheranCaptainQuest,
    lutheranState,
    0,
    { simMinute: simMinute + 10 }
  );
  assert.equal(finalDelivery.closed, false);
  assert.equal(finalDelivery.religiousLegDelivery.final, true);
  const participation = passengerDialogueView(
    finalSession,
    cities[2],
    lutheranCaptainQuest,
    lutheranState
  );
  assert.match(participation.text, /forbidden books/);
  assert.match(participation.options[0].label, /Complete the mission/);
  const completion = selectPassengerDialogueOption(
    finalSession,
    cities[2],
    lutheranCaptainQuest,
    lutheranState,
    0,
    { simMinute: simMinute + 11 }
  );
  assert.equal(completion.closed, true);
  assert.equal(lutheranState.memory.quests.passengerActive, null);
});

test("Catholic Bible inspections can pass cleanly, show sympathy, or seize the books", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.memory.quests.passengerActive = {
    id: "testament-inspection-quest",
    kind: "passenger",
    religiousMissionId: "september-testament"
  };
  assert.equal(resolveCatholicBibleInspection(state, {
    npcShipId: "clean-ship",
    detectionRoll: 0.9,
    sympathyRoll: 0.9
  }).outcome, "clean");
  assert.equal(resolveCatholicBibleInspection(state, {
    npcShipId: "sympathetic-ship",
    detectionRoll: 0.1,
    sympathyRoll: 0.1
  }).outcome, "sympathetic");
  assert.equal(resolveCatholicBibleInspection(state, {
    npcShipId: "caught-ship",
    detectionRoll: 0.1,
    sympathyRoll: 0.9
  }).outcome, "caught");
  assert.equal(resolveCatholicBibleInspection(state, {
    npcShipId: "caught-ship",
    detectionRoll: 0.1,
    sympathyRoll: 0.9
  }), null);

  const ship = {
    id: "sympathetic-ship",
    slug: "brigantine",
    character: { name: "Hans Keller", role: "harbour-master" },
    roleLabel: "Warship"
  };
  const sympatheticSession = createShipDialogueSession(ship, {
    bibleInspection: { questId: "testament-inspection-quest", outcome: "sympathetic" }
  });
  assert.match(shipDialogueView(sympatheticSession, ship).text, /eyesight has failed/);
  const caughtSession = createShipDialogueSession({ ...ship, id: "caught-ship" }, {
    bibleInspection: { questId: "testament-inspection-quest", outcome: "caught" }
  });
  const caughtShip = { ...ship, id: "caught-ship" };
  assert.deepEqual(shipDialogueView(caughtSession, caughtShip).options.map(({ label }) => label), [
    "Surrender the Bibles",
    "Run for it"
  ]);
  assert.equal(
    selectShipDialogueOption(caughtSession, caughtShip, 1).action.type,
    "evade-bible-inspection"
  );
});

test("envoy dialogue lets courts negotiate while the captain carries the answer", () => {
  const origin = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", country: "Portugal", factionId: "portugal" };
  const target = {
    tileId: 2,
    cityId: "london|united kingdom",
    city: "London",
    country: "United Kingdom",
    factionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const otherPort = {
    tileId: 3,
    cityId: "calais|france",
    city: "Calais",
    country: "France",
    factionId: "france",
    cityType: "northern-european",
    population: 12000,
    character: { name: "Etienne Moreau", role: "harbour-master" }
  };
  const quest = {
    id: "friendly-envoy-1-2-test",
    kind: "friendly-envoy",
    stage: "outbound",
    originKey: "Lisbon|Portugal|1",
    originCityId: origin.cityId,
    originTileId: origin.tileId,
    originName: "Lisbon",
    originCountry: "Portugal",
    originFactionId: "portugal",
    targetKey: "London|United Kingdom|2",
    targetCityId: target.cityId,
    targetTileId: target.tileId,
    targetName: "London",
    targetCountry: "United Kingdom",
    targetFactionId: "england",
    destinationKey: "London|United Kingdom|2",
    destinationCityId: target.cityId,
    destinationTileId: target.tileId,
    destinationName: "London",
    destinationCountry: "United Kingdom",
    distanceKm: 1580,
    passenger: { id: "envoy:duarte-de-meneses", name: "Duarte de Meneses" },
    reward: 310,
    dialogue: {
      offer: "Carry me to London and home again.",
      negotiationOpening: "I bring our court's proposal for the English council.",
      negotiation: "The English court has received our proposals.",
      returnUnderway: "Take me home with their answer.",
      homecoming: "The court awaits my report."
    }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.memory.quests.passengerOffers[quest.originKey] = quest;

  const offerSession = createPassengerDialogueSession(origin, quest);
  const offer = passengerDialogueView(offerSession, origin, quest, gameState);
  assert.equal(offer.speaker, "Duarte de Meneses, envoy");
  assert.match(offer.options[0].label, /Carry envoy to London/);
  selectPassengerDialogueOption(offerSession, origin, quest, gameState, 0);

  const active = gameState.memory.quests.active;
  const negotiationSession = createPassengerDialogueSession(target, active);
  const negotiation = passengerDialogueView(negotiationSession, target, active, gameState);
  assert.deepEqual(negotiation.options.map(({ label }) => label), [
    "Present the envoy to court",
    "Not yet"
  ]);
  assert.equal(negotiation.text, "I bring our court's proposal for the English council.");
  const result = selectPassengerDialogueOption(
    negotiationSession,
    target,
    active,
    gameState,
    0,
    { simMinute: 240, portCities: [origin, target, otherPort] }
  );
  assert.equal(result.action.type, "envoy-negotiated");
  assert.equal(result.closed, false);
  assert.equal(gameState.memory.quests.active.stage, "return");
  const answer = passengerDialogueView(
    negotiationSession,
    target,
    gameState.memory.quests.active,
    gameState
  );
  assert.equal(answer.speaker, "Thomas Cromwell, local official");
  assert.equal(answer.text, "The English court has received our proposals.");
  assert.equal(answer.options[0].label, "Receive the answer");
  assert.deepEqual(selectPassengerDialogueOption(
    negotiationSession,
    target,
    gameState.memory.quests.active,
    gameState,
    0
  ), { closed: true, action: null });

  const otherPortSession = createPortDialogueSession(otherPort, { initialNodeId: "quest" });
  const otherPortEconomy = createWorldEconomy({ ports: [otherPort], startMinute: 0 });
  const busy = portDialogueView(
    otherPortSession,
    otherPort,
    gameState,
    otherPortEconomy,
    [origin, target, otherPort]
  );
  assert.equal(
    busy.text,
    "Duarte de Meneses is aboard, returning from London to Lisbon; finish that embassy first."
  );
  assert.doesNotMatch(busy.text, /Lisbon to Lisbon/);

  const returnSession = createPassengerDialogueSession(origin, gameState.memory.quests.active);
  const homecoming = passengerDialogueView(returnSession, origin, gameState.memory.quests.active, gameState);
  assert.equal(homecoming.options[0].label, "Report to court  310 db");
  assert.deepEqual(selectPassengerDialogueOption(
    returnSession,
    origin,
    gameState.memory.quests.active,
    gameState,
    0,
    { simMinute: 480 }
  ), { closed: true, action: null });
  assert.equal(gameState.memory.quests.active, null);
});

test("a quest character precedes the loadout and factor during port arrival", () => {
  const city = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", country: "Portugal" };
  const passengerQuest = {
    id: "passenger-arrival-order",
    kind: "passenger",
    originCityId: city.cityId,
    originTileId: city.tileId,
    destinationCityId: "goa|india",
    destinationTileId: 2
  };
  const passengerSession = createPassengerDialogueSession(city, passengerQuest);

  const firstPort = createPortArrivalDialogueSession(city, {
    needsLoadout: true,
    questCharacterSession: passengerSession
  });
  assert.equal(firstPort.kind, "passenger");
  assert.equal(firstPort.admittedToPort, true);
  assert.equal(firstPort.continueToPortOnClose, true);
  assert.equal(firstPort.nextPortNodeId, "loadout");

  const ordinaryPort = createPortArrivalDialogueSession(city, {
    questCharacterSession: passengerSession,
    equipmentFactorPitch: { itemId: "sturdy-barrels" },
    rumorText: "A factor has some lower-priority gossip.",
    vikingLongshipApproach: true
  });
  assert.equal(ordinaryPort.kind, "passenger");
  assert.equal(ordinaryPort.admittedToPort, true);
  assert.equal(ordinaryPort.nextPortNodeId, "greeting");

  const deliveryPort = createPortArrivalDialogueSession(city, {
    questCharacterSession: passengerSession,
    openDeliveryMission: true
  });
  assert.equal(deliveryPort.kind, "passenger");
  assert.equal(deliveryPort.admittedToPort, true);
  assert.equal(deliveryPort.nextPortNodeId, "quest");

  const noPassenger = createPortArrivalDialogueSession(city, { needsLoadout: true });
  assert.equal(noPassenger.kind, "port");
  assert.equal(noPassenger.admittedToPort, true);
  assert.equal(noPassenger.nodeId, "loadout");

  const futureQuestSession = createPortArrivalDialogueSession(city, {
    questCharacterSession: {
      kind: "colony-founder",
      cityId: city.cityId,
      questId: "future-colony-quest"
    }
  });
  assert.equal(futureQuestSession.kind, "colony-founder");
  assert.equal(futureQuestSession.admittedToPort, true);
  assert.equal(futureQuestSession.continueToPortOnClose, true);
  assert.equal(futureQuestSession.nextPortNodeId, "greeting");
});

test("a drunk captain and factor exchange remarks before ordinary port dialogue", () => {
  const city = {
    tileId: 81,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    character: { name: "Fernao da Cunha", role: "harbour-master", personalityId: "vigilant" }
  };
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter: inesPlayer(city) });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortArrivalDialogueSession(city, { arrivedDrunk: true, drunkVariant: 2 });

  const captain = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(captain.speaker, "Ines Pereira, captain");
  assert.match(captain.text, /barely moves/i);
  assert.equal(dialogueOptionIconId(captain.options[0]), "action:talk");
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);

  const factor = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(factor.speaker, "Fernao da Cunha, harbour master of Lisbon");
  assert.match(factor.text, /stationary/i);
  assert.equal(dialogueOptionIconId(factor.options[0]), "action:talk");
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  assert.equal(session.nodeId, "greeting");
});

test("a port factor remembers the captain's drunken arrivals on later visits", () => {
  const city = {
    tileId: 82,
    cityId: "porto|portugal",
    city: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    character: { name: "Tomas Velho", role: "harbour-master", personalityId: "cordial" }
  };
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter: inesPlayer(city) });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });

  visitPort(gameState, city, 100, { arrivedDrunk: true });
  assert.deepEqual(portMemory(gameState, city), {
    visits: 1,
    drunkArrivals: 1,
    lastDrunkVisit: 1,
    lastDrunkArrivalMinute: 100
  });

  visitPort(gameState, city, 200);
  const soberReturn = createPortArrivalDialogueSession(city, { drunkVariant: 1 });
  const greeting = portDialogueView(soberReturn, city, gameState, economy, [city]);
  assert.match(greeting.text, /steadier step|correct door|horizon|steer my office/i);

  const ordinaryReturn = createPortArrivalDialogueSession(city, { drunkVariant: 0 });
  const ordinaryGreeting = portDialogueView(ordinaryReturn, city, gameState, economy, [city]);
  assert.doesNotMatch(ordinaryGreeting.text, /steadier step|correct door|horizon|steer my office/i);

  visitPort(gameState, city, 300, { arrivedDrunk: true });
  const repeatArrival = createPortArrivalDialogueSession(city, { arrivedDrunk: true, drunkVariant: 2 });
  selectPortDialogueOption(repeatArrival, city, gameState, economy, [city], 0);
  const repeatFactor = portDialogueView(repeatArrival, city, gameState, economy, [city]);
  assert.match(repeatFactor.text, /again|last entrance|harbor still|seen you arrive/i);
  assert.equal(portMemory(gameState, city).drunkArrivals, 2);
});

test("a port factor receives a wealthy magnate according to her present station", () => {
  const city = {
    tileId: 83,
    cityId: "istanbul|türkiye",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Türkiye",
    factionId: "ottoman",
    cityType: "mediterranean",
    character: { name: "Kemal Reis", role: "harbour-master", personalityId: "enterprising" }
  };
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter: inesPlayer(city) });
  gameState.doubloons = 1_100_000;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  visitPort(gameState, city, 100);

  const session = createPortDialogueSession(city, { initialNodeId: "greeting" });
  const greeting = portDialogueView(session, city, gameState, economy, [city], {
    cities: [city],
    simMinute: 100,
    dayIndex: 1,
    localHour: 12
  });
  assert.match(greeting.text, /wealth|fit out a fleet/i);
});

test("a port continuation cannot present the wealthy reception twice during one landing", () => {
  const city = {
    tileId: 84,
    cityId: "augsberg|germany",
    city: "Augsberg",
    displayCity: "Augsburg",
    country: "Germany",
    factionId: "augsburg",
    cityType: "northern-european",
    character: { name: "Hans Fugger", role: "harbour-master", personalityId: "enterprising" }
  };
  const gameState = createGameState({ cargoCapacity: 20, playerCharacter: inesPlayer(city) });
  gameState.doubloons = 1_100_000;
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  visitPort(gameState, city, 100);
  const session = createPortDialogueSession(city, {
    initialNodeId: "greeting",
    admittedToPort: true
  });
  const context = {
    cities: [city],
    simMinute: 100,
    dayIndex: 1,
    localHour: 12,
    arrivalGreetingPresented: false
  };

  const greeting = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(greeting.text, /wealth|fit out a fleet/i);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  assert.equal(session.nodeId, "root");

  session.nodeId = "drunk-factor";
  session.postDrunkNodeId = "greeting";
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, {
    ...context,
    arrivalGreetingPresented: true
  });
  assert.equal(session.nodeId, "root");
  assert.throws(
    () => portDialogueView(
      { ...session, nodeId: "greeting" },
      city,
      gameState,
      economy,
      [city],
      { ...context, arrivalGreetingPresented: true }
    ),
    /arrival greeting was requested twice: augsberg\|germany/
  );
});

function inesPlayer(city) {
  return {
    id: "player:ines-pereira",
    name: "Ines Pereira",
    homePortCityId: city.cityId,
    homePortTileId: city.tileId,
    homePortName: city.displayCity || city.city,
    homePortCountry: city.country,
    expressions: ["neutral", "happy"],
    skillIds: ["able-seaman"]
  };
}

test("an active package mission opens its factor before the port menu", () => {
  const origin = {
    tileId: 71,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha", role: "innkeeper" }
  };
  const destination = {
    ...origin,
    tileId: 72,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    lat: 41.15,
    lon: -8.61
  };
  const unrelated = {
    ...origin,
    tileId: 73,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    factionId: "spain",
    lat: 36.53,
    lon: -6.29
  };
  const ports = [origin, destination, unrelated];
  const gameState = createGameState({ cargoCapacity: 20 });
  deliveryOfferForCity(gameState, origin, ports, { spawnChance: 1, simMinute: 0 });
  const available = questStateForCity(gameState, origin, ports);
  assert.equal(available.kind, "available");
  assert.equal(deliveryMissionShouldOpenOnArrival(gameState, origin, ports), true);

  acceptQuest(gameState, available.quest);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const innSession = createPortDialogueSession(origin, {
    initialNodeId: "quest",
    admittedToPort: true
  });
  const innView = portDialogueView(innSession, origin, gameState, economy, ports);
  assert.equal(innView.options.some(({ action }) => action.type === "accept-quest"), false);
  assert.equal(deliveryMissionShouldOpenOnArrival(gameState, origin, ports), true);
  assert.equal(deliveryMissionShouldOpenOnArrival(gameState, destination, ports), true);
  assert.equal(deliveryMissionShouldOpenOnArrival(gameState, unrelated, ports), false);

  const arrival = createPortArrivalDialogueSession(destination, { openDeliveryMission: true });
  assert.equal(arrival.kind, "port");
  assert.equal(arrival.nodeId, "quest");
  assert.equal(arrival.nextPortNodeId, "root");
  assert.equal(arrival.admittedToPort, true);
});

test("completing an arrival delivery proceeds to the required loadout", () => {
  const origin = {
    tileId: 74,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const destination = {
    ...origin,
    tileId: 75,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    lat: 41.15,
    lon: -8.61
  };
  const ports = [origin, destination];
  const gameState = createGameState({ cargoCapacity: 20 });
  deliveryOfferForCity(gameState, origin, ports, { spawnChance: 1, simMinute: 0 });
  const quest = questStateForCity(gameState, origin, ports).quest;
  acceptQuest(gameState, quest);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const session = createPortArrivalDialogueSession(destination, {
    needsLoadout: true,
    openDeliveryMission: true
  });
  const view = portDialogueView(session, destination, gameState, economy, ports);
  const completeIndex = view.options.findIndex((entry) => entry.action.type === "complete-quest");

  assert.ok(completeIndex >= 0);
  const result = selectPortDialogueOption(
    session,
    destination,
    gameState,
    economy,
    ports,
    completeIndex,
    { missionGiftRandom: () => 0 }
  );
  assert.equal(session.nodeId, "loadout");
  assert.equal(gameState.memory.quests.active, null);
  assert.equal(result.missionItemGift, null);
});

test("completing a packet does not silently roll another job before work is requested", () => {
  const origin = {
    tileId: 76,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha", role: "harbour-master" }
  };
  const destination = {
    ...origin,
    tileId: 77,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    lat: 41.15,
    lon: -8.61
  };
  const ports = [origin, destination];
  const gameState = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  deliveryOfferForCity(gameState, origin, ports, { spawnChance: 1, simMinute: 0 });
  acceptQuest(gameState, questStateForCity(gameState, origin, ports).quest);
  const session = createPortArrivalDialogueSession(destination, {
    openDeliveryMission: true
  });
  const delivery = portDialogueView(session, destination, gameState, economy, ports);
  const completeIndex = delivery.options.findIndex(
    (entry) => entry.action.type === "complete-quest"
  );

  const result = selectPortDialogueOption(
    session,
    destination,
    gameState,
    economy,
    ports,
    completeIndex,
    { simMinute: 0 }
  );

  assert.equal(session.nodeId, "root");
  assert.equal(result.nextDeliveryOffer, undefined);
  assert.equal(questStateForCity(gameState, destination, ports).kind, "unavailable");

  const root = portDialogueView(session, destination, gameState, economy, ports);
  const workIndex = root.options.findIndex((entry) => entry.label === "Ask about work");
  selectPortDialogueOption(session, destination, gameState, economy, ports, workIndex, {
    simMinute: 0
  });
  assert.equal(session.nodeId, "quest");
  const nextJob = portDialogueView(session, destination, gameState, economy, ports);
  assert.equal(nextJob.options.some((entry) => entry.action.type === "accept-quest"), true);
});

test("only admitted port sessions carry automatic departure services", () => {
  const city = { cityId: "lisbon|portugal", tileId: 1, city: "Lisbon", country: "Portugal" };
  const barred = createPortDialogueSession(city, { initialNodeId: "barred" });
  const admitted = createPortDialogueSession(city, { admittedToPort: true });

  assert.equal(barred.admittedToPort, false);
  assert.equal(admitted.admittedToPort, true);
});

test("capital port dialogue can grant a letter of marque", () => {
  const city = {
    tileId: 1,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  adjustFactionReputation(gameState, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  const session = createPortDialogueSession(city);
  const context = { shipPower: LETTER_OF_MARQUE_POWER_REQUIRED, simMinute: 120 };

  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const marqueIndex = root.options.findIndex((option) => option.action.nodeId === "marque");
  assert.ok(marqueIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], marqueIndex, context);
  const marque = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(marque.text, /King Henry VIII/);
  const requestIndex = marque.options.findIndex((entry) => entry.action.type === "request-marque");
  assert.equal(marque.options[requestIndex].disabled, false);

  selectPortDialogueOption(session, city, gameState, economy, [city], requestIndex, context);
  assert.equal(hasLetterOfMarqueFrom(gameState, "england"), true);
  const issued = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(issued.text, /King Henry VIII grants you authority/);
  assert.doesNotMatch(issued.text, /already carry/i);
  assert.equal(issued.feedback, null);

  const backIndex = issued.options.findIndex((entry) => entry.action.nodeId === "root");
  selectPortDialogueOption(session, city, gameState, economy, [city], backIndex, context);
  const revisitedRoot = portDialogueView(session, city, gameState, economy, [city], context);
  const revisitIndex = revisitedRoot.options.findIndex((entry) => entry.action.nodeId === "marque");
  selectPortDialogueOption(session, city, gameState, economy, [city], revisitIndex, context);
  const alreadyHeld = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(alreadyHeld.text, /already carry King Henry VIII's authority/i);
  assert.equal(alreadyHeld.feedback, null);
});

test("a crown capture commission names the enemy port, spoils, and return reward", () => {
  const london = {
    tileId: 801,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const calais = {
    tileId: 802,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    population: 18000,
    factionId: "france",
    character: { name: "Guillaume Morel", role: "harbour-master" }
  };
  const stats = shipStatsForSlug("large-junk");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    },
    shipStats: stats
  });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  setTestCrewCount(gameState, 36);
  setTestCrewExperienceStars(gameState, 3);
  gameState.ship.cannons = 8;
  gameState.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const ports = [london, calais];
  const offer = capturePortMissionOfferForCity(gameState, london, ports, {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 180
  });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const session = createPortDialogueSession(london, { initialNodeId: "quest" });
  const view = portDialogueView(session, london, gameState, economy, ports);

  assert.equal(deliveryMissionShouldOpenOnArrival(gameState, london, ports), true);
  assert.match(view.speaker, /war secretary/i);
  assert.match(view.text, /keep the spoils/i);
  assert.match(view.text, /Calais/);
  assert.match(view.text, new RegExp(`${offer.reward.toLocaleString("en-US")} doubloons`));
  assert.ok(view.options.some((entry) => entry.action.type === "accept-quest"));
});

test("capital petition dialogue lets the captain name an enemy while the court fixes the objective", () => {
  const london = {
    tileId: 803,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const calais = {
    tileId: 804,
    cityId: "calais|france",
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    population: 18000,
    factionId: "france",
    character: { name: "Guillaume Morel", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  gameState.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const ports = [london, calais];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const context = {
    simMinute: 0,
    random: () => 0,
    sailingDistanceKm: () => 180
  };
  const session = createPortDialogueSession(london, { initialNodeId: "root" });
  session.nodeId = "city-menu";
  session.cityMenuLocationId = "authority";
  const root = portDialogueView(session, london, gameState, economy, ports, context);
  const openIndex = root.options.findIndex((entry) => entry.action.nodeId === "capture-petition");
  assert.ok(openIndex >= 0);

  selectPortDialogueOption(session, london, gameState, economy, ports, openIndex, context);
  const petition = portDialogueView(session, london, gameState, economy, ports, context);
  assert.match(petition.speaker, /war secretary/i);
  assert.match(petition.text, /does not grant the choice of a harbor/i);
  assert.match(petition.text, /council will judge the realm's need/i);
  const franceIndex = petition.options.findIndex((entry) => (
    entry.action.type === "petition-capture-commission" &&
    entry.action.targetFactionId === "france"
  ));
  assert.ok(franceIndex >= 0);

  const decision = selectPortDialogueOption(
    session,
    london,
    gameState,
    economy,
    ports,
    franceIndex,
    context
  );
  assert.equal(decision.captureCommissionPetition.granted, true);
  const answer = portDialogueView(session, london, gameState, economy, ports, context);
  assert.match(answer.text, /object is fixed under seal/i);
  assert.match(answer.text, /take Calais/i);
  assert.doesNotMatch(answer.text, /you choose|your choice|name the port/i);
  assert.ok(answer.options.some((entry) => (
    entry.action.type === "accept-quest" && /capture Calais/i.test(entry.label)
  )));
});

test("a captain may ask whether the council has designs upon an independent harbor", () => {
  const istanbul = {
    tileId: 807,
    cityId: "istanbul|turkey",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Turkey",
    cityType: "islamic-desert",
    population: 400000,
    factionId: "ottoman",
    isFactionCapital: true,
    capitalOfFactionId: "ottoman",
    character: { name: "Piri Reis", role: "harbour-master" }
  };
  const aden = {
    tileId: 808,
    cityId: "aden|yemen",
    city: "Aden",
    displayCity: "Aden",
    country: "Yemen",
    cityType: "islamic-desert",
    population: 18000,
    factionId: "neutral",
    character: { name: "Ali ibn Dawud", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  gameState.relations.factionReputation.ottoman = 80;
  const ports = [istanbul, aden];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const context = {
    simMinute: 20,
    random: () => 0,
    sailingDistanceKm: () => 2500
  };
  const session = createPortDialogueSession(istanbul, { initialNodeId: "capture-petition" });
  const petition = portDialogueView(session, istanbul, gameState, economy, ports, context);
  const independentIndex = petition.options.findIndex((entry) => (
    entry.action.type === "petition-capture-commission" &&
    entry.action.petitionTargetId === CAPTURE_COMMISSION_INDEPENDENT_PETITION_ID
  ));

  assert.ok(independentIndex >= 0);
  assert.match(petition.text, /ask after an independent port/i);
  assert.match(petition.options[independentIndex].label, /ask after an independent harbor/i);
  assert.doesNotMatch(petition.text, /neutral nation|neutral power/i);

  selectPortDialogueOption(
    session,
    istanbul,
    gameState,
    economy,
    ports,
    independentIndex,
    context
  );
  const answer = portDialogueView(session, istanbul, gameState, economy, ports, context);
  assert.match(answer.text, /council—not your company—has chosen Aden/i);
  assert.match(answer.text, /no war is proclaimed/i);
  assert.match(answer.text, /grants a sealed warrant/i);
});

test("an independent-port warrant fixes the objective without inventing a neutral sovereign", () => {
  const istanbul = {
    tileId: 805,
    cityId: "istanbul|turkey",
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Turkey",
    cityType: "islamic-desert",
    population: 400000,
    factionId: "ottoman",
    isFactionCapital: true,
    capitalOfFactionId: "ottoman",
    character: { name: "Piri Reis", role: "harbour-master" }
  };
  const aden = {
    tileId: 806,
    cityId: "aden|yemen",
    city: "Aden",
    displayCity: "Aden",
    country: "Yemen",
    cityType: "islamic-desert",
    population: 18000,
    factionId: "neutral",
    character: { name: "Ali ibn Dawud", role: "harbour-master" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  gameState.relations.lettersOfMarque.ottoman = { factionId: "ottoman", simMinute: 0 };
  const ports = [istanbul, aden];
  const context = {
    simMinute: 20,
    spawnChance: 1,
    sailingDistanceKm: () => 650
  };
  const offer = capturePortMissionOfferForCity(gameState, istanbul, ports, context);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const session = createPortDialogueSession(istanbul, { initialNodeId: "quest" });
  const view = portDialogueView(session, istanbul, gameState, economy, ports, context);

  assert.equal(offer.independentTarget, true);
  assert.match(view.text, /independent harbor of Aden/i);
  assert.match(view.text, /sealed warrant/i);
  assert.match(view.text, /No foreign sovereign is named/i);
  assert.doesNotMatch(view.text, /neutral nation|neutral power|heralds.*war/i);

  const acceptIndex = view.options.findIndex((entry) => entry.action.type === "accept-quest");
  const result = selectPortDialogueOption(
    session,
    istanbul,
    gameState,
    economy,
    ports,
    acceptIndex,
    context
  );
  assert.equal(result.acceptedQuest.independentTarget, true);
  assert.equal(playerPortAttackStatus(gameState, aden).commissioned, true);
  assert.equal(playerPortAttackStatus(gameState, aden).piracy, false);

  const underway = portDialogueView(session, istanbul, gameState, economy, ports, context);
  assert.match(underway.text, /council chose the harbor/i);
  assert.match(underway.text, /your charge is .*take it, not to alter the terms/i);
});

test("a final capital commission explains the war's grievance and general peace", () => {
  const london = {
    tileId: 811,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const paris = {
    tileId: 812,
    cityId: "paris|france",
    city: "Paris",
    displayCity: "Paris",
    country: "France",
    cityType: "northern-european",
    population: 180000,
    factionId: "france",
    isFactionCapital: true,
    capitalOfFactionId: "france",
    character: { name: "Guillaume Morel", role: "harbour-master" }
  };
  const capturedFrenchPorts = ["Calais", "Rouen", "Bordeaux", "Marseille"].map((name, index) => ({
    tileId: 813 + index,
    cityId: `${name.toLocaleLowerCase("en-US")}|france`,
    city: name,
    displayCity: name,
    country: "France",
    cityType: "northern-european",
    population: 20000,
    factionId: "england",
    foundingFactionId: "france"
  }));
  const stats = shipStatsForSlug("large-junk");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    },
    shipStats: stats
  });
  gameState.relations.diplomacy.overrides["england|france"] = DIPLOMACY_WAR;
  setTestCrewCount(gameState, 36);
  setTestCrewExperienceStars(gameState, 3);
  gameState.ship.cannons = 8;
  gameState.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const ports = [london, paris, ...capturedFrenchPorts];
  const offer = capturePortMissionOfferForCity(gameState, london, ports, {
    simMinute: 0,
    spawnChance: 1,
    sailingDistanceKm: () => 520
  });
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const session = createPortDialogueSession(london, { initialNodeId: "quest" });
  const view = portDialogueView(session, london, gameState, economy, ports);

  assert.equal(offer.kind, "capture-capital");
  assert.match(view.text, /old claims across the Channel/i);
  assert.match(view.text, /hold its court for the commissioners.*press the terms/i);
  assert.doesNotMatch(view.text, /captain.*terms|you.*negotiate|force peace/i);
  assert.match(view.text, new RegExp(`${offer.reward.toLocaleString("en-US")} doubloons`));
  assert.ok(view.options.some((entry) => (
    entry.action.type === "accept-quest" && /final commission/i.test(entry.label)
  )));
});

test("letter of marque dialogue shows fractional standing until the requirement is truly met", () => {
  const city = {
    tileId: 1,
    cityId: "london|united kingdom",
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  adjustFactionReputation(
    gameState,
    "england",
    LETTER_OF_MARQUE_REPUTATION_REQUIRED - factionReputation(gameState, "england") - 0.4
  );
  const session = createPortDialogueSession(city, { initialNodeId: "marque" });
  const context = { shipPower: LETTER_OF_MARQUE_POWER_REQUIRED, simMinute: 120 };

  const short = portDialogueView(session, city, gameState, economy, [city], context);
  const requestIndex = short.options.findIndex((entry) => entry.action.type === "request-marque");
  assert.match(short.text, /Standing \+14\.6\/\+15\./);
  assert.equal(short.options[requestIndex].disabled, true);
  assert.equal(short.options[requestIndex].disabledReason, "Need standing +15.");

  adjustFactionReputation(gameState, "england", 0.4);
  const eligible = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(eligible.text, /Standing \+15\/\+15\./);
  assert.equal(eligible.options[requestIndex].disabled, false);
});

test("a trusted captain can petition a capital for a historically named personal trade pass", () => {
  const city = {
    tileId: 81,
    cityId: "beijing|china",
    city: "Beijing",
    displayCity: "Beijing",
    country: "China",
    cityType: "east-asian",
    population: 700000,
    factionId: "ming",
    isFactionCapital: true,
    capitalOfFactionId: "ming",
    character: { name: "Wang Shouren", role: "harbour-master" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  adjustFactionReputation(gameState, "ming", TRADE_PASS_REPUTATION_REQUIRED);
  const session = createPortDialogueSession(city);
  const context = { simMinute: 720 };

  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const passIndex = root.options.findIndex((entry) => entry.action.type === "open-trade-pass");
  assert.ok(passIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], passIndex, context);

  const petition = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(petition.text, /Board of Rites/);
  assert.match(petition.text, /memorial/);
  const requestIndex = petition.options.findIndex((entry) => (
    entry.action.type === "request-trade-pass"
  ));
  assert.equal(petition.options[requestIndex].disabled, false);

  selectPortDialogueOption(session, city, gameState, economy, [city], requestIndex, context);
  const issued = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(issued.text, /imperial trade seal/);
  assert.match(issued.text, /maritime customs officers/);
  assert.equal(hasPersonalTradePass(gameState, MING_TRADE_POLICY_ID), true);
});

function testSailingDistances(entries) {
  const distances = new Map();
  for (const [a, b, distanceKm] of entries) {
    distances.set(`${Math.min(a.tileId, b.tileId)}:${Math.max(a.tileId, b.tileId)}`, distanceKm);
  }
  return (a, b) => {
    if (a.tileId === b.tileId) return 0;
    const distance = distances.get(`${Math.min(a.tileId, b.tileId)}:${Math.max(a.tileId, b.tileId)}`);
    if (distance === undefined) throw new Error(`Missing test sailing distance: ${a.tileId} to ${b.tileId}`);
    return distance;
  };
}

test("a marque holder can find capture petitions at port authority even away from court", () => {
  const city = { cityId: "bristol|united kingdom", tileId: 803, city: "Bristol", country: "United Kingdom",
    factionId: "england", cityType: "northern-european", population: 12000,
    character: { name: "Thomas Ward", role: "harbour-master" } };
  const state = createGameState({ cargoCapacity: 20 });
  state.relations.lettersOfMarque.england = { factionId: "england", simMinute: 0 };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "city-menu" });
  session.cityMenuLocationId = "authority";
  const view = portDialogueView(session, city, state, economy, [city]);
  const index = view.options.findIndex(({ action }) => action.nodeId === "capture-petition");
  assert.ok(index >= 0);
  assert.equal(view.options[index].disabled, true);
  assert.match(view.options[index].disabledReason, /capital/);
  const before = structuredClone(state);
  selectPortDialogueOption(session, city, state, economy, [city], index);
  assert.equal(session.nodeId, "city-menu");
  assert.deepEqual(state, before);
});

test("Spanish colonist embarkation warns unlicensed foreigners without warning licensed or domestic captains", () => {
  const target = { ...colonizationTargetForCity({ cityId: "lima|peru" }), tileId: 900 };
  const origin = { cityId: "seville|spain", city: "Seville", country: "Spain", factionId: "spain",
    tileId: 901, lat: 37.39, lon: -5.98, cityType: "mediterranean", population: 60000,
    character: { name: "Juan de Medina", role: "harbour-master" } };
  const stats = shipStatsForSlug("galleon");
  for (const [nationalityId, licensed, warned] of [["england", false, true], ["england", true, false], ["spain", false, false]]) {
    const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats,
      playerCharacter: { name: "Test Captain", nationalityId, expressions: ["neutral", "happy"] } });
    if (licensed) grantPersonalTradePass(state.relations.personalTradePasses, "spanish-indies-monopoly", 0);
    assignColonizationQuest(state.memory.colonization, { target, origin });
    for (const stage of colonizationQuestView(state).history.fetchStages) {
      completeColonizationFetchStage(state.memory.colonization, stage.id);
    }
    const session = createPortDialogueSession(origin, { initialNodeId: "colonization" });
    const economy = createWorldEconomy({ ports: [origin], startMinute: 0 });
    const view = portDialogueView(session, origin, state, economy, [origin], { shipStats: stats, simMinute: 0 });
    assert.equal(/grants no trading privilege/.test(view.text), warned);
    assert.ok(view.options.some(({ action }) => action.type === "embark-colonists"));
  }
});

test("both market modes show the current finite specie including an empty treasury", () => {
  const city = { cityId: "lisbon|portugal", tileId: 902, city: "Lisbon", country: "Portugal",
    factionId: "portugal", cityType: "mediterranean", population: 70000,
    character: { name: "Fernao da Cunha", role: "harbour-master" } };
  const state = createGameState({ cargoCapacity: 20 });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "market" });
  for (const specie of [1200, 37, 0]) {
    economy.portStates.get(city.cityId).specie = specie;
    for (const mode of ["buy", "sell"]) {
      session.marketMode = mode;
      const view = portDialogueView(session, city, state, economy, [city]);
      assert.ok(view.text.startsWith(`Market specie: ${specie} db.`));
    }
  }
});
