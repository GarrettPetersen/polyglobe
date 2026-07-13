import assert from "node:assert/strict";
import test from "node:test";

import {
  createPassengerDialogueSession,
  createPortArrivalDialogueSession,
  createPortDialogueSession,
  createShipDialogueSession,
  passengerDialogueView,
  portDialogueView,
  selectPassengerDialogueOption,
  selectPortDialogueOption,
  selectShipDialogueOption,
  shipDialogueView
} from "./dialogueSystem.js";
import { FRESH_WATER_GOOD_ID, HARDTACK_GOOD_ID, createWorldEconomy } from "./economy.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  adjustFactionReputation,
  createGameState,
  hasLetterOfMarqueFrom,
  initializeProvisionalShipLoadout
} from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

test("hailing an NPC ship identifies the captain by name", () => {
  const ship = { id: "mediterranean-4", label: "Xebec", character: { name: "Marco Doria" } };
  const session = createShipDialogueSession(ship);
  const view = shipDialogueView(session, ship);

  assert.equal(session.kind, "ship");
  assert.equal(view.speaker, "Marco Doria, merchant captain");
  assert.equal(view.text, "Fair winds, captain. Running in ballast.");
  assert.deepEqual(view.options.map((option) => option.label), ["Demand surrender", "Leave"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 1), { closed: true, action: null });
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

test("warship and pirate captains identify their role and allegiance", () => {
  const warship = {
    id: "warship",
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
    roleLabel: "Pirate",
    faction: { adjective: "Pirate" },
    character: { name: "Anne Flint" }
  };
  const pirateView = shipDialogueView(createShipDialogueSession(pirate), pirate);
  assert.equal(pirateView.speaker, "Anne Flint, pirate captain");
  assert.match(pirateView.text, /^Heave to/);
  assert.equal(pirateView.expressionId, "stern");
});

test("an attacking captain hails with a reason before combat", () => {
  const attacker = {
    id: "portuguese-warship",
    roleLabel: "Warship",
    faction: { adjective: "Portuguese" },
    character: { name: "Ines Vaz" }
  };
  const session = createShipDialogueSession(attacker, {
    attackReason: "You sail under outlaw colors. Strike them, or we open fire!"
  });
  const view = shipDialogueView(session, attacker);

  assert.equal(view.expressionId, "angry");
  assert.equal(view.text, "You sail under outlaw colors. Strike them, or we open fire!");
  assert.deepEqual(view.options.map((option) => option.label), ["To arms"]);
});

test("an outmatched ship offers surrender and the player may refuse it", () => {
  const ship = {
    id: "outmatched",
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
    closed: true,
    action: { type: "surrender" }
  });
});

test("a protected surrendered ship cannot be threatened again", () => {
  const ship = {
    id: "protected",
    character: { name: "Marco Doria" },
    combatGrace: true
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);
  assert.deepEqual(view.options.map((option) => option.label), ["Leave"]);
});

test("piracy warning lets the player back out before a hostile demand", () => {
  const ship = {
    id: "merchant",
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
  assert.equal(market.optionHeight, 30);
  assert.ok(market.options.some((option) => /\d+ db/.test(option.label)));
  assert.ok(market.options.some((option) => /WORLD/.test(option.detail || "")));
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
  selectPortDialogueOption(session, city, gameState, economy, [city], buyIndex, { simMinute: 115200 });
  assert.equal(portDialogueView(session, city, gameState, economy, [city]).expressionId, "pleased");
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, { simMinute: 115201 });
  session.nodeId = "sell";
  const sell = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(sell.options.every((option) => option.action.goodId !== HARDTACK_GOOD_ID));
  assert.ok(sell.options.every((option) => option.action.goodId !== FRESH_WATER_GOOD_ID));
  assert.equal(sell.optionHeight, 30);
  assert.equal(sell.options.at(-1).label, "Back");
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
    "Back"
  ]);
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
    "BALANCED"
  ]);
  assert.ok(view.options.every((option) => /CREW \d+  GUNS \d+  FOOD \d+D  WATER \d+D/.test(option.detail)));

  const before = gameState.doubloons;
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 3, context);
  assert.equal(gameState.ship.loadoutId, "balanced");
  assert.equal(session.nodeId, "root");
  assert.ok(result.loadoutResult.plan.totalSpace <= stats.cargoCapacity);
  assert.ok(gameState.doubloons <= before);
  assert.match(session.feedback, /Balanced targets set/);
});

test("ports sell a costly progression of fishing net upgrades", () => {
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
  const session = createPortDialogueSession(city, { initialNodeId: "nets" });

  const view = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(view.optionHeight, 34);
  assert.match(view.text, /Current gear: Basic cast net/);
  assert.deepEqual(view.options.slice(0, 4).map((entry) => entry.label), [
    "* Basic cast net  FITTED",
    "Weighted cast net  900 db",
    "Drift net  4000 db",
    "Masterwork seine  15000 db"
  ]);
  assert.ok(view.options.slice(0, 4).every((entry) => /MAX HAUL/.test(entry.detail)));
  assert.equal(view.options[0].disabled, true);
  assert.equal(view.options[1].disabled, false);
  assert.equal(view.options[2].disabled, false);
  assert.equal(view.options[3].disabled, true);

  const result = selectPortDialogueOption(session, city, gameState, economy, [city], 1, { simMinute: 300 });
  assert.equal(result.fishingNetPurchase.net.id, "weighted-cast-net");
  assert.equal(gameState.doubloons, 4100);
  assert.match(session.feedback, /Weighted cast net fitted/);
});

test("package job offers show the great-circle distance", () => {
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
  const session = createPortDialogueSession(lisbon, { initialNodeId: "quest" });

  const view = portDialogueView(session, lisbon, gameState, economy, [lisbon, porto]);

  assert.match(view.text, /27\d km away/);
  assert.match(view.options[0].detail, /27\d km GREAT-CIRCLE/);
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
  assert.equal(poorView.options[0].disabled, true);
  assert.match(poorView.options[0].disabledReason, /more doubloons/);

  gameState.doubloons = 40000;
  const richView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(richView.options[0].disabled, false);
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], 0, context), {
    closed: false,
    action: { type: "purchase-ship", listingId: listing.id, shipSlug: "brigantine" }
  });
});

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
  assert.equal(offer.options[0].detail, "7,640 km GREAT-CIRCLE");
  assert.deepEqual(offer.options.map((option) => option.label), [
    "Take passenger to Goa  180 db",
    "Decline"
  ]);
  assert.deepEqual(selectPassengerDialogueOption(session, origin, quest, gameState, 1), {
    closed: false,
    action: { type: "open-port" }
  });
  assert.equal(gameState.memory.quests.active, null);

  const acceptSession = createPassengerDialogueSession(origin, quest);
  assert.deepEqual(selectPassengerDialogueOption(acceptSession, origin, quest, gameState, 0), {
    closed: true,
    action: null
  });
  assert.equal(gameState.memory.quests.active.id, quest.id);
  assert.equal(gameState.memory.quests.passengerOffers[quest.originKey], undefined);
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
  assert.equal(firstPort.continueToPortOnClose, true);
  assert.equal(firstPort.nextPortNodeId, "loadout");

  const ordinaryPort = createPortArrivalDialogueSession(city, {
    questCharacterSession: passengerSession
  });
  assert.equal(ordinaryPort.kind, "passenger");
  assert.equal(ordinaryPort.nextPortNodeId, "greeting");

  const noPassenger = createPortArrivalDialogueSession(city, { needsLoadout: true });
  assert.equal(noPassenger.kind, "port");
  assert.equal(noPassenger.nodeId, "loadout");

  const futureQuestSession = createPortArrivalDialogueSession(city, {
    questCharacterSession: {
      kind: "colony-founder",
      cityTileId: city.tileId,
      questId: "future-colony-quest"
    }
  });
  assert.equal(futureQuestSession.kind, "colony-founder");
  assert.equal(futureQuestSession.continueToPortOnClose, true);
  assert.equal(futureQuestSession.nextPortNodeId, "greeting");
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
  assert.equal(marque.options[0].disabled, false);

  selectPortDialogueOption(session, city, gameState, economy, [city], 0, context);
  assert.equal(hasLetterOfMarqueFrom(gameState, "england"), true);
  assert.match(session.feedback, /letter of marque granted/i);
});
