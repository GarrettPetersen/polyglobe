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
  portDialogueView,
  prepareDamageSurrenderDialogue,
  prepareSurrenderPrizeDialogue,
  selectPassengerDialogueOption,
  setPortCustomLoadoutValue,
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
  createWorldEconomy,
  portMarket,
  quotePortPurchase
} from "./economy.js";
import { dialogueOptionIconId } from "./gameIcons.js";
import { HAJJ_PILGRIMAGE_PERK_ITEM_ID, perkItemById } from "./perkItems.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  TRADE_PASS_REPUTATION_REQUIRED,
  acceptQuest,
  adjustFactionReputation,
  attemptPortDisguise,
  cargoFree,
  cargoHoldStatus,
  cargoUsed,
  capturePortMissionOfferForCity,
  createGameState,
  deliverQuestCargoRequirement,
  deliveryOfferForCity,
  factionReputation,
  hasLetterOfMarqueFrom,
  hasPersonalTradePass,
  initializeProvisionalShipLoadout,
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
import {
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR
} from "./factions.js";
import { diplomacyPairKey } from "./worldDiplomacy.js";
import { shipStatsForSlug } from "./shipStats.js";
import { createShipComparisonView } from "./shipInfo.js";
import { QUEST_ITINERARY_ORDERED, createQuestItinerary } from "./questItinerary.js";
import { gameMinuteForDate } from "./rulers.js";
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
  CHEF_QUEST_REWARD,
  completeChefBanquet,
  maybeSpawnChefQuest
} from "./chefQuest.js";
import {
  NAMED_CREW_ROLE_CHEF,
  NAMED_CREW_ROLE_HISTORIAN,
  addNamedCrewMember
} from "./namedCrew.js";

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
      permitFee: 140,
      fine: 280,
      canAffordPermit: true,
      canAffordFine: true,
      controlledCargo: { pepper: 2 },
      controlledCargoQuantity: 2
    }
  });
  const view = shipDialogueView(session, ship);

  assert.match(view.text, /Estado da India/);
  assert.deepEqual(view.options.map((entry) => entry.label), [
    "Buy cartaz  140 db",
    "Pay fine  280 db",
    "Surrender controlled cargo",
    "Run for it"
  ]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 3), {
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

test("disabled shore battery passage offers stay open without crashing", () => {
  const city = {
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
  assert.throws(() => selectShipDialogueOption(session, ship, 0), /11 units of cargo/);
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
    city: "Ceuta",
    displayCity: "Ceuta",
    country: "Morocco",
    cityType: "mediterranean",
    population: 12000,
    foundingFactionId: "portugal",
    factionId: "ottoman",
    character: { name: "Diogo Mendes", personalityId: "vigilant" }
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

test("port dialogue exposes live market specie, stock, and prices", () => {
  const city = {
    tileId: 1,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city);

  const context = { nearbyShips: { pirates: 1 } };
  const greeting = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(greeting.speaker, "Fernao da Cunha, Lisbon factor");
  assert.match(greeting.text, /Pirates/);
  assert.equal(greeting.expressionId, "afraid");
  assert.deepEqual(greeting.options.map((option) => option.label), ["Continue"]);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  const root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(root.speaker, "Fernao da Cunha, Lisbon factor");
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
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, { simMinute: 115201 });
  session.nodeId = "sell";
  const sell = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(sell.options.every((option) => option.action.goodId !== HARDTACK_GOOD_ID));
  assert.ok(sell.options.every((option) => option.action.goodId !== FRESH_WATER_GOOD_ID));
  assert.equal(sell.feedbackLineReserve, 2);
  assert.equal(sell.optionHeight, 30);
  assert.equal(sell.options.at(-2).label, "Back");
  assert.equal(sell.options.at(-2).placement, "port-exit");
  assert.equal(sell.options.at(-1).label, "Undo all sales");
  assert.equal(sell.options.at(-1).placement, "port-exit");
  assert.equal(sell.options.at(-1).disabled, true);
  assert.ok(sell.options.some((option) => /P\/L [+-]\d+ db/.test(option.detail || "")));
  assert.ok(sell.options.some((option) => /WORLD/.test(option.detail || "")));

  const provisionsOnlyState = createGameState({ cargoCapacity: 20 });
  const provisionsOnlySession = createPortDialogueSession(city, { initialNodeId: "sell" });
  const provisionsOnlySell = portDialogueView(
    provisionsOnlySession,
    city,
    provisionsOnlyState,
    economy,
    [city]
  );
  assert.deepEqual(provisionsOnlySell.options.map((option) => option.label), [
    "No cargo to sell",
    "Back",
    "Undo all sales"
  ]);
});

test("a factor explains customs once and repeats the explanation only after the rate changes", () => {
  const city = {
    tileId: 91,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    factionId: "portugal",
    character: { name: "Fernao da Cunha", personalityId: "vigilant" }
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

test("a foreign settlement is explained by the factor and supplies its resident customs privilege", () => {
  const city = withForeignSettlements1522({
    tileId: 92,
    city: "Ternate",
    displayCity: "Ternate",
    country: "Indonesia",
    cityType: "southeast-asian",
    population: 12000,
    factionId: "ternate",
    character: { name: "Hamza Darwis", personalityId: "vigilant" }
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
    city: "Colombo",
    displayCity: "Colombo",
    country: "Sri Lanka",
    cityType: "south-asian",
    population: 12000,
    factionId: "neutral",
    character: { name: "Dinesh Jayawardena", personalityId: "shrewd" }
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
  const buyGoodsIndex = view.options.findIndex((entry) => entry.label === "Buy goods");
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
    view.options.findIndex((entry) => entry.label === "Buy goods"),
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
  assert.equal(licensedSession.nodeId, "buy");
  view = portDialogueView(licensedSession, city, gameState, economy, [city], context);
  assert.equal(view.options.find((entry) => (
    entry.action.type === "buy" && entry.action.goodId === "cinnamon"
  )).disabled, false);
});

test("Colombo offers costly cartaz papers to hostile captains and a clear refusal during war", () => {
  const city = withForeignSettlements1522({
    tileId: 155810,
    city: "Colombo",
    displayCity: "Colombo",
    country: "Sri Lanka",
    cityType: "south-asian",
    population: 12000,
    factionId: "neutral",
    character: { name: "Dinesh Jayawardena", personalityId: "shrewd" }
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
    view.options.findIndex((entry) => entry.label === "Buy goods"),
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
    view.options.findIndex((entry) => entry.label === "Buy goods"),
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
    city: "Colombo",
    displayCity: "Colombo",
    country: "Sri Lanka",
    cityType: "south-asian",
    population: 12000,
    factionId: "neutral",
    character: { name: "Dinesh Jayawardena", personalityId: "shrewd" }
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
    view.options.findIndex((entry) => entry.label === "Buy goods"),
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
  assert.equal(session.nodeId, "buy");

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
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    population: 50000,
    character: { name: "Ines Carvalho", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 1000000;
  const session = createPortDialogueSession(city, { initialNodeId: "buy" });

  const initial = portDialogueView(session, city, gameState, economy, [city]);
  const buyIndexes = initial.options
    .map((entry, index) => entry.action.type === "buy" ? index : -1)
    .filter((index) => index >= 0);
  assert.ok(buyIndexes.length >= 2);
  const purchaseIndex = buyIndexes[0];
  const followingIndex = buyIndexes[1];
  const goodId = initial.options[purchaseIndex].action.goodId;
  const followingGoodId = initial.options[followingIndex].action.goodId;
  economy.portStates.get(city.tileId).goods.get(goodId).stock = 1;

  selectPortDialogueOption(session, city, gameState, economy, [city], purchaseIndex, { simMinute: 10 });
  const after = portDialogueView(session, city, gameState, economy, [city]);

  assert.equal(after.options[purchaseIndex].action.goodId, goodId);
  assert.equal(after.options[purchaseIndex].disabled, true);
  assert.match(after.options[purchaseIndex].detail, /STOCK 0$/);
  assert.equal(after.options[followingIndex].action.goodId, followingGoodId);
});

test("Ming markets visibly offer domestic gunpowder but not scarce imported matchlocks", () => {
  const city = {
    tileId: 110,
    city: "Guangzhou",
    displayCity: "Guangzhou",
    country: "Ming",
    cityType: "east-asian",
    factionId: "ming",
    population: 120000,
    character: { name: "Li Wen", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 100000;
  const session = createPortDialogueSession(city, { initialNodeId: "buy" });

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
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    population: 50000,
    character: { name: "Ines Carvalho", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.wool = 1;
  gameState.cargo.timber = 2;
  gameState.accounts.cargoCostBasis.wool = 10;
  gameState.accounts.cargoCostBasis.timber = 20;
  const session = createPortDialogueSession(city, { initialNodeId: "sell" });

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
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    population: 50000,
    character: { name: "Ines Carvalho", personalityId: "vigilant" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 61 / 12;
  gameState.accounts.cargoCostBasis.fish = 50;
  const session = createPortDialogueSession(city, { initialNodeId: "sell" });

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
    city: "London",
    displayCity: "London",
    country: "England",
    cityType: "northern-european",
    population: 50000,
    character: { name: "Thomas More", personalityId: "shrewd" }
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

  const sellSession = createPortDialogueSession(city, { initialNodeId: "sell" });
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
  const buySession = createPortDialogueSession(city, { initialNodeId: "buy" });
  view = portDialogueView(buySession, city, gameState, economy, [city]);
  const blockedPurchase = view.options.find((entry) => entry.action.type === "buy");
  assert.ok(blockedPurchase);
  assert.equal(blockedPurchase.disabled, true);
  assert.match(blockedPurchase.disabledReason, /^Needs \d+ cargo spaces; 0 free after loadout\.$/);
});

test("port menus pin Back and Leave Port after their ordinary actions", () => {
  const city = {
    tileId: 106,
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  gameState.ship.loadoutId = "balanced";
  gameState.doubloons = 1000;
  const context = { shipStats: stats };

  for (const nodeId of ["buy", "sell", "equipment", "equipment-nets", "equipment-cannons", "cargo", "loadout"]) {
    const session = createPortDialogueSession(city, { initialNodeId: nodeId });
    const view = portDialogueView(session, city, gameState, economy, [city], context);
    const back = view.options.find((entry) => entry.label === "Back");
    assert.equal(back?.placement, "port-exit", `${nodeId} should mark Back for the footer`);
    assert.equal(
      view.options[dialogueBackOptionIndex(view)]?.label,
      "Back",
      `${nodeId} back navigation should activate its declared Back action`
    );
    const firstExitIndex = view.options.findIndex((entry) => entry.placement === "port-exit");
    assert.ok(
      view.options.slice(firstExitIndex).every((entry) => entry.placement === "port-exit"),
      `${nodeId} should keep all footer actions after ordinary actions`
    );
  }

  const buySession = createPortDialogueSession(city, { initialNodeId: "buy" });
  const buy = portDialogueView(buySession, city, gameState, economy, [city], context);
  assert.equal(buy.options.at(-3).label, "Change ship loadout");
  assert.ok(buy.options.slice(0, -3).every((entry) => (
    entry.action.type === "buy" || entry.action.type === "buy-max"
  )));
  assert.deepEqual(buy.options.slice(-2).map((entry) => entry.label), [
    "Back",
    "Undo all purchases"
  ]);
  assert.equal(buy.optionColumns, 2);

  const rootSession = createPortDialogueSession(city, { initialNodeId: "root" });
  const root = portDialogueView(rootSession, city, gameState, economy, [city], context);
  assert.equal(root.options.at(-1).label, "Leave port");
  assert.equal(root.options.at(-1).placement, "port-exit");
  assert.equal(dialogueBackOptionIndex(root), root.options.length - 1);
});

test("market rows put unit and bulk actions together and undo every purchase on the page", () => {
  const city = {
    tileId: 301,
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 8 });
  gameState.doubloons = 100000;
  const session = createPortDialogueSession(city, { initialNodeId: "buy" });
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
  const port = economy.portStates.get(city.tileId);
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
  const undo = selectPortDialogueOption(session, city, gameState, economy, [city], undoIndex);

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
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.wool = 4;
  gameState.accounts.cargoCostBasis.wool = 80;
  const session = createPortDialogueSession(city, { initialNodeId: "sell" });
  const initial = portDialogueView(session, city, gameState, economy, [city]);
  const sell = initial.options.find((entry) => entry.action.type === "sell" && entry.action.goodId === "wool");
  const sellAll = initial.options.find((entry) => (
    entry.action.type === "sell-all" && entry.action.goodId === "wool"
  ));
  const port = economy.portStates.get(city.tileId);
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

test("sell all remains actionable when only one unit is held", () => {
  const city = {
    tileId: 303,
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.wool = 1;
  gameState.accounts.cargoCostBasis.wool = 20;
  const session = createPortDialogueSession(city, { initialNodeId: "sell" });
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
    character: { name: "Jeanne Hebert", personalityId: "warm" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.doubloons = 10000;

  const greetingSession = createPortDialogueSession(city, { initialNodeId: "greeting" });
  const greeting = portDialogueView(greetingSession, city, gameState, economy, [city]);
  assert.match(greeting.text, /15% off goods you buy/);

  const buySession = createPortDialogueSession(city, { initialNodeId: "buy" });
  const buy = portDialogueView(buySession, city, gameState, economy, [city]);
  const marketRows = buy.options.filter((entry) => entry.action.type === "buy");
  assert.ok(marketRows.length > 0);
  assert.ok(marketRows.every((entry) => entry.detail.includes("FOUNDER -15%")));
  assert.equal(playerTradeTerms(gameState, city, marketRows[0].action.goodId).purchaseDiscountMultiplier, 0.85);
});

test("a developed Nagasaki port states its trading discount without calling the player its founder", () => {
  const city = {
    tileId: 110,
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
    character: { name: "Ito Haru", personalityId: "warm" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, { initialNodeId: "greeting" });
  const greeting = portDialogueView(session, city, gameState, economy, [city]);

  assert.match(greeting.text, /China ship has made Nagasaki a city/);
  assert.match(greeting.text, /15% off goods you buy/);
  assert.doesNotMatch(greeting.text, /founder/i);
  assert.match(greeting.speaker, /port steward of Nagasaki/);
});

test("leaving the buy screen recommends the strongest distance-adjusted trade route", () => {
  const ternate = {
    tileId: 101,
    city: "Ternate",
    displayCity: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis" }
  };
  const london = {
    tileId: 102,
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
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const ports = [ternate, london, lisbon];
  const sailingDistanceKm = testSailingDistances([
    [ternate, london, 14200],
    [ternate, lisbon, 15100]
  ]);
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 200 });
  gameState.doubloons = 1000;
  const session = createPortDialogueSession(ternate, { initialNodeId: "buy" });

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
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-buy");
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
        destinationTileId: london.tileId,
        destinationName: "London",
        reason: "TRADE PRICE TIP"
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
  economy.portStates.get(cairo.tileId).goods.get("silver").stock = 0;
  economy.portStates.get(wuhan.tileId).goods.get("silver").stock = 0;
  const gameState = createGameState({ cargoCapacity: 20 });
  const purchases = {
    silver: { goodId: "silver", quantity: 1, cost: 60 }
  };
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

test("post-purchase trade advice uses the blended ledger cost basis", () => {
  const origin = {
    tileId: 210,
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
    city: "Bursa",
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
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city, { initialNodeId: "buy" });
  const market = portDialogueView(session, city, gameState, economy, [city]);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-buy");

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
    tileId: 106,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  };
  const ternate = {
    tileId: 107,
    city: "Ternate",
    country: "Ternate",
    factionId: "neutral",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis" }
  };
  const london = {
    tileId: 108,
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
  economy.portStates.get(ternate.tileId).goods.get("wool").stock = 0;
  economy.portStates.get(london.tileId).goods.get("wool").stock = 20;
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
    destinationTileId: london.tileId,
    destinationName: "London",
    distanceKm: 14200
  });

  const session = createPortDialogueSession(ternate, { initialNodeId: "buy" });
  const market = portDialogueView(session, ternate, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-buy");
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

  const laterSession = createPortDialogueSession(ternate, { initialNodeId: "buy" });
  const laterMarket = portDialogueView(laterSession, ternate, gameState, economy, ports);
  selectPortDialogueOption(
    laterSession,
    ternate,
    gameState,
    economy,
    ports,
    laterMarket.options.findIndex((entry) => entry.action.type === "leave-buy"),
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
        destinationTileId: london.tileId,
        destinationName: "London",
        reason: "QUEST CARGO SOURCE"
      }
    }
  );
});

test("leaving the sell screen without a sale recommends a market for held trade goods", () => {
  const ternate = {
    tileId: 105,
    city: "Ternate",
    displayCity: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis" }
  };
  const london = {
    tileId: 106,
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
  const session = createPortDialogueSession(ternate, { initialNodeId: "sell" });
  const market = portDialogueView(session, ternate, gameState, economy, ports);
  const backIndex = dialogueBackOptionIndex(market);
  assert.equal(market.options[backIndex].action.type, "leave-sell");

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
    city: "Ternate",
    displayCity: "Ternate",
    country: "Ternate",
    cityType: "southeast-asian",
    lat: 0.79,
    lon: 127.38,
    population: 25000,
    character: { name: "Hamza Darwis" }
  };
  const london = {
    tileId: 206,
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
  const session = createPortDialogueSession(ternate, { initialNodeId: "sell" });
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
    tileId: 109,
    city: VIKING_LONGSHIP_PORT_CITY,
    country: "Iceland"
  };
  const london = {
    tileId: 110,
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
  const londonWool = economy.portStates.get(london.tileId).goods.get("wool");
  const bristolWool = economy.portStates.get(bristol.tileId).goods.get("wool");
  const sakaiWool = economy.portStates.get(sakai.tileId).goods.get("wool");
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
    destinationTileId: bristol.tileId,
    destinationName: "Bristol",
    distanceKm: 190
  });
});

test("held-cargo price advice prefers a distant profit over a nearby loss", () => {
  const origin = {
    tileId: 207,
    city: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 41.01,
    lon: 28.98,
    population: 180000,
    factionId: "neutral",
    character: { name: "Kemal Reis" }
  };
  const nearby = {
    tileId: 208,
    city: "Bursa",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 40.19,
    lon: 29.06,
    population: 70000,
    factionId: "neutral"
  };
  const distant = {
    tileId: 209,
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
  economy.portStates.get(origin.tileId).goods.get("fish").stock *= 100;
  economy.portStates.get(nearby.tileId).goods.get("fish").stock *= 100;
  economy.portStates.get(distant.tileId).goods.get("fish").stock = 0;
  const nearbyRevenue = quotePortPurchase(economy, nearby, "fish", 1);
  const distantRevenue = quotePortPurchase(economy, distant, "fish", 1);
  assert.ok(distantRevenue > nearbyRevenue);

  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 1;
  gameState.accounts.cargoCostBasis.fish = (nearbyRevenue + distantRevenue) / 2;
  const session = createPortDialogueSession(origin, { initialNodeId: "sell" });
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
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 41.01,
    lon: 28.98,
    population: 180000,
    factionId: "neutral",
    character: { name: "Kemal Reis" }
  };
  const bursa = {
    tileId: 108,
    city: "Bursa",
    displayCity: "Bursa",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    lat: 40.19,
    lon: 29.06,
    population: 70000,
    factionId: "neutral"
  };
  const ports = [istanbul, bursa];
  const economy = createWorldEconomy({ ports, startMinute: 0 });
  const istanbulFish = economy.portStates.get(istanbul.tileId).goods.get("fish");
  const bursaFish = economy.portStates.get(bursa.tileId).goods.get("fish");
  istanbulFish.stock = 0;
  bursaFish.stock = bursaFish.targetStock * 100;
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.fish = 2;
  gameState.accounts.cargoCostBasis.fish = 0;
  const session = createPortDialogueSession(istanbul, { initialNodeId: "sell" });
  const sailingDistanceKm = testSailingDistances([[istanbul, bursa, 140]]);
  const market = portDialogueView(session, istanbul, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-sell");

  assert.ok(
    quotePortPurchase(economy, istanbul, "fish", 2) >
      quotePortPurchase(economy, bursa, "fish", 2)
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
  assert.deepEqual(advice.options.map((entry) => entry.label), ["Continue"]);

  istanbulFish.stock = istanbulFish.targetStock * 100;
  bursaFish.stock = 0;
  const destinationSession = createPortDialogueSession(istanbul, { initialNodeId: "sell" });
  const destinationMarket = portDialogueView(
    destinationSession,
    istanbul,
    gameState,
    economy,
    ports
  );
  const destinationBackIndex = destinationMarket.options.findIndex(
    (entry) => entry.action.type === "leave-sell"
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
  assert.equal(destinationResult.tradeTip.destinationName, "Bursa");
  const destinationAdvice = portDialogueView(
    destinationSession,
    istanbul,
    gameState,
    economy,
    ports
  );
  assert.equal(destinationAdvice.text, "I heard Bursa pays a good price for Fish.");
  assert.equal(destinationAdvice.options[0].label, "Set a heading for Bursa");
});

test("leaving the sell screen with no sellable cargo returns directly to port business", () => {
  const city = {
    tileId: 109,
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.cargo.hardtack = 1;
  gameState.accounts.cargoCostBasis.hardtack = 2;
  const session = createPortDialogueSession(city, { initialNodeId: "sell" });
  const market = portDialogueView(session, city, gameState, economy, [city]);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-sell");

  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], backIndex),
    { closed: false }
  );
  assert.equal(session.nodeId, "root");
});

test("leaving the sell screen after a completed sale does not offer trade advice", () => {
  const porto = {
    tileId: 107,
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 41.16,
    lon: -8.63,
    population: 50000,
    character: { name: "Ines Carvalho" }
  };
  const london = {
    tileId: 108,
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
  const session = createPortDialogueSession(porto, { initialNodeId: "sell" });
  let market = portDialogueView(session, porto, gameState, economy, ports);
  const sellIndex = market.options.findIndex((entry) => entry.action.goodId === "cloves");
  selectPortDialogueOption(session, porto, gameState, economy, ports, sellIndex);
  market = portDialogueView(session, porto, gameState, economy, ports);
  const backIndex = market.options.findIndex((entry) => entry.action.type === "leave-sell");

  assert.deepEqual(
    selectPortDialogueOption(session, porto, gameState, economy, ports, backIndex, {
      sailingDistanceKm: testSailingDistances([[porto, london, 1800]])
    }),
    { closed: false }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(session.tradeTip, null);
});

test("the first port requires a chunky loadout choice and provisions the ship", () => {
  const city = {
    tileId: 9,
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60000,
    character: { name: "Isabel Mendez" }
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

test("custom loadout opens a slider model and reports discarded provisions", () => {
  const city = {
    tileId: 9,
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60000,
    character: { name: "Isabel Mendez" }
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
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    population: 60000,
    character: { name: "Isabel Mendez" }
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
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    population: 100000,
    character: { name: "Kemal Aydin" }
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
  gameState.ship.crew = gameState.ship.crewCapacity;
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
  completeChefBanquet(gameState, city, 100);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "chef-quest" });
  const view = portDialogueView(session, city, gameState, economy, [city]);
  const recruit = view.options.find((entry) => entry.action.type === "recruit-chef");
  assert.equal(recruit.disabled, true);
  assert.match(recruit.disabledReason, /no berth/);
});

test("the banquet chef accepts ingredients across separate visits", () => {
  const city = {
    tileId: 45,
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "islamic-desert",
    population: 100000,
    character: { name: "Kemal Aydin" }
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
  assert.equal(partial.chefBanquetCompleted, undefined);
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
  assert.ok(completed.chefBanquetCompleted);
  assert.equal(gameState.doubloons, startingDoubloons + CHEF_QUEST_REWARD);
  const completedView = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(completedView.text.includes(completed.chefBanquetCompleted.event.successText));
  assert.equal(completedView.feedback, `The hosts paid ${CHEF_QUEST_REWARD} db.`);
  assert.equal(
    completedView.feedback.includes(completed.chefBanquetCompleted.event.successText),
    false
  );
});

test("enemy port guards bar resupply and offer one risky disguise route", () => {
  const city = {
    tileId: 12,
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau" }
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
  assert.deepEqual(failed.options.map((entry) => entry.label), ["Make for open water"]);
});

test("a disabled hostile harbor offers an eligible captain a marine landing", () => {
  const city = {
    tileId: 12,
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau" }
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
      failureCrewLossMin: 12,
      failureCrewLossMax: 21
    }
  };
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(view.text, /harbor guns are silent/i);
  assert.equal(view.options[0].label, "Land Marines");
  assert.equal(view.options[0].detail, "57% Chance of Success");
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], 0, context), {
    closed: false,
    action: { type: "land-marines" }
  });
});

test("a friendly foreign port warns before a piratical city attack", () => {
  const city = {
    tileId: 13,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 65000,
    character: { name: "Beatriz Ferreira" }
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
  selectPortDialogueOption(session, city, gameState, economy, [city], attackIndex, context);
  const warning = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(warning.text, /attacking Lisbon is piracy/i);
  assert.match(warning.text, /plunder the city/i);
  assert.deepEqual(warning.options.map((entry) => entry.label), ["Attack city anyway", "Back"]);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, context),
    { closed: false, action: { type: "attack-city" } }
  );
});

test("a friendly capture-commission target closes its harbor and engages", () => {
  const city = {
    tileId: 14,
    city: "Rhodes",
    displayCity: "Rhodes",
    country: "Rhodes",
    cityType: "mediterranean",
    factionId: "hospitallers",
    population: 18000,
    character: { name: "Pierre de Villiers" }
  };
  const gameState = createGameState({
    cargoCapacity: 20,
    playerCharacter: { name: "Hasan", nationalityId: "tidore", expressions: ["neutral"] }
  });
  gameState.memory.quests.active = {
    id: "capture-rhodes",
    kind: "capture-port",
    stage: "capture",
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
});

test("an unauthorized marine landing pillages instead of annexing", () => {
  const city = {
    tileId: 15,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 65000,
    character: { name: "Beatriz Ferreira" }
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
    portConquestStatus: { canAttempt: true, playerAssaultActive: true, successPercent: 57, capital: false }
  };
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(view.text, /exposed to plunder/i);
  assert.equal(view.options[0].label, "Pillage city");
  assert.equal(view.options[0].detail, "57% Chance of Success");
});

test("a disabled enemy harbor never admits an ineligible captain in disguise", () => {
  const city = {
    tileId: 12,
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau" }
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
    "You think to take Calais with that handful? Bring fewer than 20 fighting hands ashore, and we will drive every one of you into the sea."
  );
  assert.deepEqual(view.options.map((entry) => entry.label), ["Leave"]);
});

test("a recovering non-enemy port refuses business and names the bombarding ship", () => {
  const city = {
    tileId: 17,
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 14000,
    character: { name: "Beatriz Ferreira" }
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
  assert.equal(view.speaker, "Beatriz Ferreira, Porto factor");
  assert.match(view.text, /French Brigantine commanded by Jean Moreau/);
  assert.match(view.text, /bombarded/);
  assert.match(view.text, /quays remain closed for 2 more days/);
  assert.deepEqual(view.options.map((entry) => entry.label), ["Leave"]);
});

test("a successful disguise opens commerce but not faction business", () => {
  const city = {
    tileId: 14,
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau" }
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
  assert.ok(root.options.some((entry) => entry.label === "Buy goods"));
  assert.ok(root.options.every((entry) => entry.label !== "Ask about work"));
  assert.ok(root.options.every((entry) => !entry.label.startsWith("Speak with")));
  assert.ok(root.options.every((entry) => entry.label !== "Letter of marque"));
});

test("foreign captains must find an illicit market to trade at Ming ports", () => {
  const city = {
    tileId: 15,
    city: "Guangzhou",
    displayCity: "Guangzhou",
    country: "China",
    cityType: "east-asian",
    factionId: "ming",
    population: 120000,
    character: { name: "Li Wen" }
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
  assert.ok(root.options.every((entry) => entry.label !== "Buy goods" && entry.label !== "Sell cargo"));
  assert.ok(root.options.some((entry) => entry.label === "Ship loadout"));
  assert.ok(root.options.every((entry) => entry.label !== "Equipment" && entry.label !== "Visit shipyard"));
  const illicitIndex = root.options.findIndex((entry) => entry.label === "Seek illicit market");
  assert.ok(illicitIndex >= 0);
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], illicitIndex, context);
  assert.equal(result.illicitMarketAccessPolicyId, "ming-maritime-prohibition");

  root = portDialogueView(session, city, gameState, economy, [city], context);
  const buyIllicitIndex = root.options.findIndex((entry) => entry.label === "Buy illicit goods");
  assert.ok(buyIllicitIndex >= 0);
  assert.ok(root.options.some((entry) => entry.label === "Sell cargo illicitly"));
  selectPortDialogueOption(session, city, gameState, economy, [city], buyIllicitIndex, context);
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
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    factionId: "france",
    population: 18000,
    character: { name: "Etienne Moreau" }
  };
  const playerCharacter = {
    name: "Joan Alden",
    nationalityId: "england",
    expressions: ["neutral", "happy"]
  };
  const shipStats = shipStatsForSlug("fishing-lugger");
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: shipStats.cargoCapacity, playerCharacter, shipStats });
  gameState.relations.safePassageUntilMinute.france = 1000;
  assert.equal(portEntryStatus(gameState, city, 100).allowed, true);
  const session = createPortDialogueSession(city, { initialNodeId: "root", admittedToPort: true });
  const context = { simMinute: 100, random: () => 0.1, shipStats };

  let root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(root.text, /Wartime orders close this market/);
  assert.ok(root.options.every((entry) => entry.label !== "Buy goods" && entry.label !== "Sell cargo"));
  const illicitIndex = root.options.findIndex((entry) => entry.label === "Seek illicit market");
  assert.ok(illicitIndex >= 0);

  const result = selectPortDialogueOption(session, city, gameState, economy, [city], illicitIndex, context);
  assert.equal(result.illicitMarketAccessPolicyId, WARTIME_TRADE_RESTRICTION_ID);
  root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(root.options.some((entry) => entry.label === "Buy illicit goods"));
  assert.ok(root.options.some((entry) => entry.label === "Sell cargo illicitly"));
});

test("a failed Ming illicit-market approach costs standing and cannot be repeated that visit", () => {
  const city = {
    tileId: 16,
    city: "Nanjing",
    displayCity: "Nanjing",
    country: "China",
    cityType: "east-asian",
    factionId: "ming",
    population: 160000,
    character: { name: "Zhang Rui" }
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
  const after = portDialogueView(session, city, gameState, economy, [city], context);
  assert.ok(after.options.every((entry) => entry.label !== "Seek illicit market"));
});

test("pirate hideouts speak and trade like covert havens", () => {
  const marketPort = {
    tileId: 18,
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
    character: { name: "Mara Vane" }
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
  assert.ok(root.options.some((entry) => entry.label === "Buy doubtful goods"));
  assert.ok(root.options.some((entry) => entry.label === "Fence cargo"));
  assert.ok(root.options.some((entry) => entry.label === "Lie low in the cove"));
  assert.ok(root.options.some((entry) => entry.label === "Put to sea"));
  assert.ok(root.options.every((entry) => entry.label !== "Ask about work"));
});

test("ports stock a local selection of fishing net upgrades", () => {
  const city = {
    tileId: 13,
    city: "Bristol",
    displayCity: "Bristol",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 50000,
    character: { name: "Alice Cabot" }
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
    city: "Lubeck",
    displayCity: "Lubeck",
    country: "Hanseatic League",
    cityType: "northern-european",
    population: 40000,
    character: { name: "Greta Brandt" }
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
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell" }
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
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell" }
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
    city: "Lubeck",
    country: "Hanseatic League",
    cityType: "northern-european",
    population: 40000,
    character: { name: "Greta Brandt" }
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
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
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
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
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
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
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
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
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
    city: "Tarawa Village",
    displayCity: "Tarawa Village",
    country: "Neutral",
    factionId: "neutral",
    cityType: "polynesian",
    population: 1200,
    character: { name: "Te Rongo" }
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
  const voyageSeed = "dialogue-test-143";
  const city = {
    tileId: 17,
    city: "Porto Novo",
    displayCity: "Porto Novo",
    country: "Portugal",
    cityType: "mediterranean",
    factionId: "portugal",
    population: 70000,
    character: { name: "Fernao da Cunha" }
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

test("package job offers show the destination distance", () => {
  const lisbon = {
    tileId: 21,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "portugal",
    population: 70000,
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha" }
  };
  const porto = {
    ...lisbon,
    tileId: 22,
    city: "Porto",
    displayCity: "Porto",
    population: 50000,
    lat: 41.15,
    lon: -8.61
  };
  const economy = createWorldEconomy({ ports: [lisbon, porto], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  deliveryOfferForCity(gameState, lisbon, [lisbon, porto], { spawnChance: 1, simMinute: 0 });
  const session = createPortDialogueSession(lisbon, { initialNodeId: "quest" });

  const view = portDialogueView(session, lisbon, gameState, economy, [lisbon, porto]);

  assert.match(view.text, /27\d km away/);
  const offer = view.options.find((entry) => entry.action.type === "accept-quest");
  assert.match(offer.detail, /27\d km/);
  assert.doesNotMatch(offer.detail, /GREAT-CIRCLE/);
});

test("a rumor queued before an active delivery cannot trap Back in a quest self-loop", () => {
  const istanbul = {
    tileId: 23,
    city: "Istanbul",
    displayCity: "Istanbul",
    country: "Ottoman Empire",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "ottoman",
    population: 400000,
    lat: 41.01,
    lon: 28.98,
    character: { name: "Leyla Celebi" }
  };
  const athens = {
    ...istanbul,
    tileId: 24,
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
  const backIndex = warning.options.findIndex((entry) => entry.label === "Back");
  selectPortDialogueOption(session, istanbul, gameState, economy, ports, backIndex);
  assert.equal(session.nodeId, "root");
});

test("no-work Back returns to the city menu after an arrival continuation", () => {
  const city = {
    tileId: 25,
    city: "Faro",
    displayCity: "Faro",
    country: "Portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    factionId: "portugal",
    population: 8000,
    lat: 37.02,
    lon: -7.93,
    character: { name: "Diogo Vaz" }
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
  const backIndex = unavailable.options.findIndex((entry) => entry.label === "Back");
  selectPortDialogueOption(session, city, gameState, economy, ports, backIndex);
  assert.equal(session.nodeId, "root");
});

test("shipyards show a full vessel presentation and enforce the asking price", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
  };
  const currentStats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const listing = {
    id: "shipyard-10-4",
    shipSlug: "brigantine",
    shipLabel: "Brigantine",
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
  const poorPurchase = poorView.options.find((entry) => entry.action.type === "purchase-ship");
  assert.equal(poorPurchase.disabled, true);
  assert.equal(poorPurchase.label, "Buy Brigantine  34100 db");
  assert.equal(poorPurchase.disabledReason, "You need 33740 more doubloons.");

  gameState.doubloons = 40000;
  const richView = portDialogueView(session, city, gameState, economy, [city], context);
  const richPurchaseIndex = richView.options.findIndex((entry) => entry.action.type === "purchase-ship");
  assert.equal(richView.options[richPurchaseIndex].disabled, false);
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], richPurchaseIndex, context), {
    closed: false,
    action: { type: "purchase-ship", listingId: listing.id, shipSlug: "brigantine" }
  });

});

test("shipyards allow a profitable downgrade after projecting the smaller loadout", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
  };
  const currentStats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  gameState.ship.loadoutId = "short-haul";
  gameState.ship.crew = 20;
  gameState.ship.cannons = 9;
  gameState.survival.freshWaterCapacity = 20;
  gameState.survival.freshWater = 20;
  gameState.cargo.hardtack = 10;
  const listing = {
    id: "shipyard-10-downgrade",
    shipSlug: "felucca",
    shipLabel: "Felucca",
    price: 5000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  assert.ok(cargoUsed(gameState) > shipStatsForSlug("felucca").cargoCapacity);
  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "purchase-ship");

  assert.equal(purchase.disabled, false);
  assert.match(purchase.label, /^Trade for Felucca  \+\d+ db$/);
});

test("shipyards still block a smaller ship when transferred trade cargo cannot fit", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
  };
  const currentStats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  gameState.cargo.gold = 21;
  const listing = {
    id: "shipyard-10-overloaded",
    shipSlug: "felucca",
    shipLabel: "Felucca",
    price: 5000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "purchase-ship");

  assert.equal(purchase.disabled, true);
  assert.match(purchase.disabledReason, /transferred cargo uses/);
});

test("shipyards explain when permanent crew cannot berth instead of formatting infinite cargo", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
  };
  const currentStats = shipStatsForSlug("galleon");
  const gameState = createGameState({ cargoCapacity: currentStats.cargoCapacity, shipStats: currentStats });
  gameState.ship.crew = 2;
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
    price: 1000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "purchase-ship");

  assert.equal(purchase.disabled, true);
  assert.equal(
    purchase.disabledReason,
    "Your permanent crew require 2 berths; this vessel has only 1."
  );
});

test("shipyards account for the historian leaving with a traded-in Viking longship", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
  };
  const hafnarfjordur = {
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
  gameState.ship.crew = 1;
  addNamedCrewMember(gameState, {
    id: "icelandic-historian",
    name: "Leif Eriksen",
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
    price: 1000
  };
  const context = { shipStats: currentStats, shipyard: { famous: true, listing } };
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], context);
  const purchase = view.options.find((entry) => entry.action.type === "purchase-ship");

  assert.equal(purchase.disabled, false);
});

test("empty shipyards direct captains to the nearest listed vessel", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortDialogueSession(city, { initialNodeId: "shipyard" });

  const view = portDialogueView(session, city, gameState, economy, [city], {
    shipyard: { famous: true, listing: null },
    nearestShipyardListing: {
      portId: 11,
      portName: "Porto",
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      distanceKm: 312
    }
  });

  assert.equal(view.text, "I heard a rumour of a new brigantine for sale at Porto.");
  assert.equal(view.options[0].label, "Set a heading for Porto");
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, {
      shipyard: { famous: true, listing: null },
      nearestShipyardListing: {
        portId: 11,
        portName: "Porto",
        shipLabel: "Brigantine",
        shipProseLabel: "brigantine",
        distanceKm: 312
      }
    }),
    {
      closed: false,
      action: {
        type: "set-port-heading",
        destinationTileId: 11,
        destinationName: "Porto",
        reason: "NEW SHIP FOR SALE"
      }
    }
  );
  assert.equal(session.nodeId, "root");
  assert.equal(session.feedback, "Heading set for Porto.");
});

test("a completed ship sale gets a named historical handover before returning to port", () => {
  const city = {
    tileId: 10,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 100000,
    character: { name: "Fernao da Cunha" }
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
  assert.deepEqual(handover.options.map((entry) => entry.label), ["Continue"]);
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
    tileId: 64,
    city: "Hafnarfjordur",
    displayCity: "Hafnarfjordur",
    country: "Iceland",
    cityType: "northern-european",
    population: 1500,
    character: { name: "Leif Eriksen" }
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
    tileId: 65,
    city: "Kyoto",
    displayCity: "Kyoto",
    country: "Japan",
    cityType: "east-asian",
    population: 100000,
    character: { name: "Sato Masanobu" }
  };
  const gameState = createGameState({ cargoCapacity: 50 });
  establishNagasakiQuest(gameState, city);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const startingDoubloons = gameState.doubloons;

  maybeSpawnJapaneseMatchlockQuest(gameState, city, { spawnChance: 1, simMinute: 0 });
  const arrival = createPortArrivalDialogueSession(city, { japaneseMatchlockApproach: true });
  assert.equal(arrival.nodeId, "japanese-matchlocks");
  assert.match(portDialogueView(arrival, city, gameState, economy, [city]).text, /Nagasaki/);

  const session = createPortDialogueSession(city, { initialNodeId: "japanese-matchlocks" });
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
    city: "Havana",
    displayCity: "Havana",
    country: "Cuba",
    cityType: "mediterranean",
    population: 8000,
    character: { name: "Isabel de Rojas" }
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

  const session = createPortDialogueSession(city, { initialNodeId: "caribbean-ginger" });
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

function establishNagasakiQuest(gameState, kyoto) {
  const target = {
    ...colonizationTargetForCity({ city: "Nagasaki", country: "Japan" }),
    tileId: 66
  };
  const origin = {
    tileId: 67,
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

test("passenger dialogue can be declined and accepted later", () => {
  const origin = {
    tileId: 1,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    population: 70000,
    character: { name: "Fernao da Cunha" }
  };
  const quest = {
    id: "passenger-1-2-test",
    kind: "passenger",
    originKey: "Lisbon|Portugal|1",
    originTileId: origin.tileId,
    originName: "Lisbon",
    destinationTileId: 2,
    destinationName: "Goa",
    distanceKm: 7640,
    passenger: { name: "Mateo Costa" },
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

  const acceptSession = createPassengerDialogueSession(origin, quest);
  assert.deepEqual(selectPassengerDialogueOption(acceptSession, origin, quest, gameState, 0), {
    closed: true,
    action: null
  });
  assert.equal(gameState.memory.quests.passengerActive.id, quest.id);
  assert.equal(gameState.memory.quests.passengerOffers[quest.originKey], undefined);
});

test("a passenger can disembark before the captain enters a barred destination", () => {
  const destination = {
    tileId: 2,
    city: "Algiers",
    displayCity: "Algiers",
    country: "Algeria",
    factionId: "ottoman"
  };
  const quest = {
    id: "passenger-hostile-algiers-test",
    kind: "passenger",
    originKey: "Lisbon|Portugal|1",
    originTileId: 1,
    originName: "Lisbon",
    destinationKey: "Algiers|Algeria|2",
    destinationTileId: destination.tileId,
    destinationName: destination.city,
    destinationCountry: destination.country,
    distanceKm: 1100,
    passenger: { name: "Yusuf Benali" },
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
    city: "Jeddah",
    displayCity: "Jeddah",
    country: "Saudi Arabia",
    factionId: "ottoman"
  };
  const quest = {
    id: "passenger-hajj-aceh-jeddah",
    kind: "passenger",
    originKey: "Aceh|Indonesia|13",
    originTileId: 13,
    originName: "Aceh",
    originFactionId: "ottoman",
    destinationKey: "Jeddah|Saudi Arabia|14",
    destinationTileId: jeddah.tileId,
    destinationName: "Jeddah",
    destinationCountry: "Saudi Arabia",
    distanceKm: 8600,
    passenger: { name: "Nur Aisyah", religionId: "sunni-islam" },
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
    city: "Nanjing",
    displayCity: "Nanjing",
    country: "China",
    factionId: "joseon"
  };
  const quest = {
    id: "passenger-religious-ming-mediation",
    kind: "passenger",
    originKey: "Beijing|China|101",
    originTileId: 101,
    originName: "Beijing",
    originFactionId: "ming",
    destinationKey: "Nanjing|China|102",
    destinationTileId: nanjing.tileId,
    destinationName: "Nanjing",
    destinationCountry: "China",
    distanceKm: 850,
    passenger: { name: "Shi Dehai", religionId: "mahayana-buddhism" },
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
    city: "Bremen",
    displayCity: "Bremen",
    country: "Germany",
    factionId: "denmark-norway"
  };
  const quest = {
    id: "passenger-september-testament-conversion",
    kind: "passenger",
    originKey: "Hamburg|Germany|201",
    originTileId: 201,
    originName: "Hamburg",
    originFactionId: "denmark-norway",
    destinationKey: "Bremen|Germany|202",
    destinationTileId: destination.tileId,
    destinationName: destination.city,
    destinationCountry: destination.country,
    distanceKm: 95,
    passenger: { name: "Greta Weiss", religionId: "lutheran" },
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
    { tileId: 302, city: "Bremen", country: "Germany", factionId: "denmark-norway" },
    { tileId: 303, city: "Amsterdam", country: "Netherlands", factionId: "habsburg" },
    { tileId: 304, city: "London", country: "United Kingdom", factionId: "england" }
  ].map((city) => ({ ...city, displayCity: city.city }));
  const itinerary = cities.map((city) => ({
    key: `${city.city}|${city.country}|${city.tileId}`,
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
    originTileId: 301,
    originName: "Hamburg",
    originFactionId: "denmark-norway",
    destinationKey: itinerary[0].key,
    destinationTileId: itinerary[0].tileId,
    destinationName: itinerary[0].name,
    destinationCountry: itinerary[0].country,
    distanceKm: 1800,
    passenger: { name: "Greta Weiss", religionId: "lutheran" },
    passengerReligionId: "lutheran",
    reward: 360,
    scenarioId: "religious-september-testament",
    religiousMissionId: "september-testament",
    itinerary: createQuestItinerary(itinerary, { mode: QUEST_ITINERARY_ORDERED }),
    dialogue: {}
  };
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
    assert.equal(papalAuthorityForState(state), papalBefore - (index + 1) * 0.8);
    assert.equal(
      reconcileCharacterForPapalAuthority(
        state,
        { name: `Factor ${index}`, religionId: "roman-catholic" },
        { portTileId: city.tileId }
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
    character: { name: "Hans Keller" },
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

test("envoy dialogue advances from negotiations to a paid return voyage", () => {
  const origin = { tileId: 1, city: "Lisbon", country: "Portugal", factionId: "portugal" };
  const target = {
    tileId: 2,
    city: "London",
    country: "United Kingdom",
    factionId: "england",
    character: { name: "Thomas Cromwell" }
  };
  const otherPort = {
    tileId: 3,
    city: "Calais",
    country: "France",
    factionId: "france",
    cityType: "northern-european",
    population: 12000,
    character: { name: "Etienne Moreau" }
  };
  const quest = {
    id: "friendly-envoy-1-2-test",
    kind: "friendly-envoy",
    stage: "outbound",
    originKey: "Lisbon|Portugal|1",
    originTileId: origin.tileId,
    originName: "Lisbon",
    originCountry: "Portugal",
    originFactionId: "portugal",
    targetKey: "London|United Kingdom|2",
    targetTileId: target.tileId,
    targetName: "London",
    targetCountry: "United Kingdom",
    targetFactionId: "england",
    destinationKey: "London|United Kingdom|2",
    destinationTileId: target.tileId,
    destinationName: "London",
    destinationCountry: "United Kingdom",
    distanceKm: 1580,
    passenger: { name: "Duarte de Meneses" },
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
  assert.equal(negotiation.options[0].label, "Begin negotiations");
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
  const city = { tileId: 1, city: "Lisbon", country: "Portugal" };
  const passengerQuest = {
    id: "passenger-arrival-order",
    kind: "passenger",
    originTileId: city.tileId,
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
      cityTileId: city.tileId,
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
    city: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    character: { name: "Fernao da Cunha", personalityId: "vigilant" }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.playerCharacter = {
    name: "Ines Pereira",
    expressions: ["neutral", "happy"],
    skillIds: ["able-seaman"]
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const session = createPortArrivalDialogueSession(city, { arrivedDrunk: true, drunkVariant: 2 });

  const captain = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(captain.speaker, "Ines Pereira, captain");
  assert.match(captain.text, /barely moves/i);
  assert.equal(dialogueOptionIconId(captain.options[0]), "action:talk");
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);

  const factor = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(factor.speaker, "Fernao da Cunha, Lisbon factor");
  assert.match(factor.text, /stationary/i);
  assert.equal(dialogueOptionIconId(factor.options[0]), "action:talk");
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  assert.equal(session.nodeId, "greeting");
});

test("a port factor remembers the captain's drunken arrivals on later visits", () => {
  const city = {
    tileId: 82,
    city: "Porto",
    country: "Portugal",
    cityType: "mediterranean",
    character: { name: "Tomas Velho", personalityId: "cordial" }
  };
  const gameState = createGameState({ cargoCapacity: 20 });
  gameState.playerCharacter = {
    name: "Ines Pereira",
    expressions: ["neutral", "happy"],
    skillIds: ["able-seaman"]
  };
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

  visitPort(gameState, city, 300, { arrivedDrunk: true });
  const repeatArrival = createPortArrivalDialogueSession(city, { arrivedDrunk: true, drunkVariant: 2 });
  selectPortDialogueOption(repeatArrival, city, gameState, economy, [city], 0);
  const repeatFactor = portDialogueView(repeatArrival, city, gameState, economy, [city]);
  assert.match(repeatFactor.text, /again|last entrance|harbor still|seen you arrive/i);
  assert.equal(portMemory(gameState, city).drunkArrivals, 2);
});

test("an active package mission opens its factor before the port menu", () => {
  const origin = {
    tileId: 71,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    lat: 38.72,
    lon: -9.14
  };
  const destination = {
    ...origin,
    tileId: 72,
    city: "Porto",
    displayCity: "Porto",
    lat: 41.15,
    lon: -8.61
  };
  const unrelated = {
    ...origin,
    tileId: 73,
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
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha" }
  };
  const destination = {
    ...origin,
    tileId: 75,
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

test("completing a packet rolls the destination's next job without re-entering port", () => {
  const origin = {
    tileId: 76,
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    routeRegion: "mediterranean",
    lat: 38.72,
    lon: -9.14,
    character: { name: "Fernao da Cunha" }
  };
  const destination = {
    ...origin,
    tileId: 77,
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
  assert.equal(result.nextDeliveryOffer?.originTileId, destination.tileId);
  assert.equal(questStateForCity(gameState, destination, ports).kind, "available");

  const root = portDialogueView(session, destination, gameState, economy, ports);
  const workIndex = root.options.findIndex((entry) => entry.label === "Ask about work");
  selectPortDialogueOption(session, destination, gameState, economy, ports, workIndex);
  assert.equal(session.nodeId, "quest");
  const nextJob = portDialogueView(session, destination, gameState, economy, ports);
  assert.equal(
    nextJob.options.find((entry) => entry.action.type === "accept-quest")?.action.quest.id,
    result.nextDeliveryOffer.id
  );
});

test("only admitted port sessions carry automatic departure services", () => {
  const city = { tileId: 1, city: "Lisbon", country: "Portugal" };
  const barred = createPortDialogueSession(city, { initialNodeId: "barred" });
  const admitted = createPortDialogueSession(city, { admittedToPort: true });

  assert.equal(barred.admittedToPort, false);
  assert.equal(admitted.admittedToPort, true);
});

test("capital port dialogue can grant a letter of marque", () => {
  const city = {
    tileId: 1,
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell" }
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
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell" }
  };
  const calais = {
    tileId: 802,
    city: "Calais",
    displayCity: "Calais",
    country: "France",
    cityType: "northern-european",
    population: 18000,
    factionId: "france",
    character: { name: "Guillaume Morel" }
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
  gameState.ship.crew = 36;
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

test("a final capital commission explains the war's grievance and general peace", () => {
  const london = {
    tileId: 811,
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell" }
  };
  const paris = {
    tileId: 812,
    city: "Paris",
    displayCity: "Paris",
    country: "France",
    cityType: "northern-european",
    population: 180000,
    factionId: "france",
    isFactionCapital: true,
    capitalOfFactionId: "france",
    character: { name: "Guillaume Morel" }
  };
  const capturedFrenchPorts = ["Calais", "Rouen", "Bordeaux", "Marseille"].map((name, index) => ({
    tileId: 813 + index,
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
  gameState.ship.crew = 36;
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
  assert.match(view.text, /force peace/i);
  assert.match(view.text, new RegExp(`${offer.reward.toLocaleString("en-US")} doubloons`));
  assert.ok(view.options.some((entry) => (
    entry.action.type === "accept-quest" && /final commission/i.test(entry.label)
  )));
});

test("letter of marque dialogue shows fractional standing until the requirement is truly met", () => {
  const city = {
    tileId: 1,
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    cityType: "northern-european",
    population: 90000,
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england",
    character: { name: "Thomas Cromwell" }
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
    city: "Beijing",
    displayCity: "Beijing",
    country: "China",
    cityType: "east-asian",
    population: 700000,
    factionId: "ming",
    isFactionCapital: true,
    capitalOfFactionId: "ming",
    character: { name: "Wang Shouren" }
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
