import assert from "node:assert/strict";
import test from "node:test";

import {
  createPassengerDialogueSession,
  createPortDialogueSession,
  createShipDialogueSession,
  passengerDialogueView,
  portDialogueView,
  selectPassengerDialogueOption,
  selectPortDialogueOption,
  selectShipDialogueOption,
  shipDialogueView
} from "./dialogueSystem.js";
import { createWorldEconomy } from "./economy.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  adjustFactionReputation,
  createGameState,
  hasLetterOfMarqueFrom
} from "./gameState.js";

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

  const pirate = {
    id: "pirate",
    roleLabel: "Pirate",
    faction: { adjective: "Pirate" },
    character: { name: "Anne Flint" }
  };
  const pirateView = shipDialogueView(createShipDialogueSession(pirate), pirate);
  assert.equal(pirateView.speaker, "Anne Flint, pirate captain");
  assert.match(pirateView.text, /^Heave to/);
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
    character: { name: "Fernao da Cunha" }
  };
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const gameState = createGameState({ cargoCapacity: 20 });
  const session = createPortDialogueSession(city);

  const root = portDialogueView(session, city, gameState, economy, [city]);
  assert.equal(root.speaker, "Fernao da Cunha, Lisbon factor");
  assert.match(root.text, /Market specie: \d+ db/);
  selectPortDialogueOption(session, city, gameState, economy, [city], 0);
  const market = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(market.options.some((option) => /\d+ db  x\d+/.test(option.label)));
  const buyIndex = market.options.findIndex((option) => option.action.type === "buy" && !option.disabled);
  assert.ok(buyIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], buyIndex, { simMinute: 115200 });
  session.nodeId = "sell";
  const sell = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(sell.options.some((option) => /P\/L [+-]\d+ db/.test(option.label)));
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
  assert.deepEqual(offer.options.map((option) => option.label), [
    "Take passenger to Goa  180 db",
    "Talk to factor",
    "Not now"
  ]);
  assert.deepEqual(selectPassengerDialogueOption(session, origin, quest, gameState, 2), {
    closed: true,
    action: null
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
