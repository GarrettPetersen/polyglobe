import assert from "node:assert/strict";
import test from "node:test";

import {
  bestPurchasedTradeRoute,
  createPassengerDialogueSession,
  createPortArrivalDialogueSession,
  createPortDialogueSession,
  deliveryMissionShouldOpenOnArrival,
  createShoreBatteryDialogueSession,
  createShipDialogueSession,
  passengerDialogueView,
  portDialogueView,
  prepareSurrenderPrizeDialogue,
  selectPassengerDialogueOption,
  selectPortDialogueOption,
  selectShoreBatteryDialogueOption,
  selectShipDialogueOption,
  shoreBatteryDialogueView,
  shipDialogueView,
  worldPriceIndicator
} from "./dialogueSystem.js";
import { FRESH_WATER_GOOD_ID, HARDTACK_GOOD_ID, createWorldEconomy } from "./economy.js";
import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  acceptQuest,
  adjustFactionReputation,
  attemptPortDisguise,
  createGameState,
  hasLetterOfMarqueFrom,
  initializeProvisionalShipLoadout,
  portEntryStatus,
  questStateForCity
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

test("a non-enemy ship offers emergency provisions once the player is depleted", () => {
  const ship = {
    id: "relief-ship",
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
    playerWarship: true
  });
  const view = shoreBatteryDialogueView(session, city);
  assert.equal(session.kind, "shore-battery");
  assert.equal(view.speaker, "Kemal Reis, Alexandria");
  assert.match(view.text, /Sultan Suleiman I/);
  assert.match(view.text, /fired upon/);
  assert.deepEqual(selectShoreBatteryDialogueOption(session, city, 0), { closed: true, action: null });
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

test("ship cargo manifests describe fractional food as whole rations", () => {
  const ship = {
    id: "provision-tender-1",
    label: "Dhow",
    character: { name: "Yusuf al-Masri" },
    cargo: { hardtack: 1 / 3 }
  };
  const view = shipDialogueView(createShipDialogueSession(ship), ship);

  assert.match(view.text, /Hardtack 4 RATIONS/);
  assert.doesNotMatch(view.text, /0\.333/);
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
  ship.combatGrace = true;
  prepareSurrenderPrizeDialogue(acceptingSession, ship, {
    slug: "fishing-lugger",
    hitPoints: 3,
    maxHitPoints: 4,
    cargoUsed: 8
  }, {
    specie: 75,
    cargoQuantity: 3
  });
  const prize = shipDialogueView(acceptingSession, ship);
  assert.equal(prize.presentation.kind, "ship-capture");
  assert.equal(prize.presentation.candidateShipSlug, "small-cog");
  assert.equal(prize.presentation.candidateHitPoints, prize.presentation.candidateMaxHitPoints);
  assert.equal(prize.presentation.currentShipSlug, "fishing-lugger");
  assert.match(prize.text, /75 doubloons and 3 cargo/);
  assert.deepEqual(prize.options.map((option) => option.label), [
    "Take Small Cog",
    "Keep Fishing Barque"
  ]);

  assert.deepEqual(selectShipDialogueOption(acceptingSession, ship, 0), {
    closed: false,
    action: null
  });
  const confirmation = shipDialogueView(acceptingSession, ship);
  assert.match(confirmation.text, /repaired to full hull strength/);
  assert.match(confirmation.text, /permanently replace your current Fishing Barque/);
  assert.equal(confirmation.options[0].detail, "CURRENT SHIP WILL BE REPLACED");
  assert.deepEqual(selectShipDialogueOption(acceptingSession, ship, 0), {
    closed: false,
    action: { type: "capture-surrendered-ship" }
  });
  assert.equal(acceptingSession.nodeId, "capture-loading");
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
  assert.equal(shipDialogueView(session, ship).options[0].disabled, false);
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
  selectPortDialogueOption(session, city, gameState, economy, [city], buyIndex, { simMinute: 115200 });
  assert.equal(portDialogueView(session, city, gameState, economy, [city]).expressionId, "pleased");
  selectPortDialogueOption(session, city, gameState, economy, [city], 0, { simMinute: 115201 });
  session.nodeId = "sell";
  const sell = portDialogueView(session, city, gameState, economy, [city]);
  assert.ok(sell.options.every((option) => option.action.goodId !== HARDTACK_GOOD_ID));
  assert.ok(sell.options.every((option) => option.action.goodId !== FRESH_WATER_GOOD_ID));
  assert.equal(sell.feedbackLineReserve, 2);
  assert.equal(sell.optionHeight, 30);
  assert.equal(sell.options.at(-1).label, "Back");
  assert.equal(sell.options.at(-1).placement, "port-exit");
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
    const firstExitIndex = view.options.findIndex((entry) => entry.placement === "port-exit");
    assert.ok(
      view.options.slice(firstExitIndex).every((entry) => entry.placement === "port-exit"),
      `${nodeId} should keep all footer actions after ordinary actions`
    );
  }

  const buySession = createPortDialogueSession(city, { initialNodeId: "buy" });
  const buy = portDialogueView(buySession, city, gameState, economy, [city], context);
  assert.equal(buy.options.at(-2).label, "Change ship loadout");
  assert.ok(buy.options.slice(0, -2).every((entry) => entry.action.type === "buy"));

  const rootSession = createPortDialogueSession(city, { initialNodeId: "root" });
  const root = portDialogueView(rootSession, city, gameState, economy, [city], context);
  assert.equal(root.options.at(-1).label, "Leave port");
  assert.equal(root.options.at(-1).placement, "port-exit");
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
  const context = { simMinute: 0, random: () => 0.1 };

  let root = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(root.text, /maritime prohibition/);
  assert.ok(root.options.every((entry) => entry.label !== "Buy goods" && entry.label !== "Sell cargo"));
  const illicitIndex = root.options.findIndex((entry) => entry.label === "Seek illicit market");
  assert.ok(illicitIndex >= 0);
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], illicitIndex, context);
  assert.equal(result.mingIllicitMarketAccess, true);

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
  assert.equal(result.mingIllicitMarketAccess, false);
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
  assert.deepEqual(equipmentOptions.slice(0, 2).map((entry) => entry.label), [
    "* Basic cast net  FITTED",
    "Weighted cast net  900 db"
  ]);
  assert.ok(equipmentOptions.slice(0, 2).every((entry) => /MAX HAUL/.test(entry.detail)));
  assert.equal(equipmentOptions[0].disabled, true);
  assert.equal(equipmentOptions[1].disabled, false);

  const weightedIndex = view.options.findIndex((entry) => entry.action.netId === "weighted-cast-net");
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], weightedIndex, { simMinute: 300 });
  assert.equal(result.fishingNetPurchase.net.id, "weighted-cast-net");
  assert.equal(gameState.doubloons, 4100);
  assert.match(session.feedback, /Weighted cast net fitted/);
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
    "* Standard ordnance  FITTED",
    "Bronze culverins  2400 db",
    "Reinforced culverins  8500 db"
  ]);
  assert.match(equipmentOptions[1].detail, /RELOAD 8\.50S  DAMAGE x1\.15  RANGE x1\.12/);

  const bronzeIndex = view.options.findIndex((entry) => entry.action.equipmentId === "bronze-culverins");
  const result = selectPortDialogueOption(session, city, gameState, economy, [city], bronzeIndex, { simMinute: 300 });
  assert.equal(result.cannonEquipmentPurchase.equipment.id, "bronze-culverins");
  assert.equal(gameState.doubloons, 7600);
  assert.match(session.feedback, /Bronze culverins fitted/);
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
  const session = createPortDialogueSession(lisbon, { initialNodeId: "quest" });

  const view = portDialogueView(session, lisbon, gameState, economy, [lisbon, porto]);

  assert.match(view.text, /27\d km away/);
  const offer = view.options.find((entry) => entry.action.type === "accept-quest");
  assert.match(offer.detail, /27\d km/);
  assert.doesNotMatch(offer.detail, /GREAT-CIRCLE/);
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
  assert.equal(poorView.text, "A newly built Brigantine is offered for 35000 doubloons.");
  const poorPurchase = poorView.options.find((entry) => entry.action.type === "purchase-ship");
  assert.equal(poorPurchase.disabled, true);
  assert.match(poorPurchase.disabledReason, /more doubloons/);

  gameState.doubloons = 40000;
  const richView = portDialogueView(session, city, gameState, economy, [city], context);
  const richPurchaseIndex = richView.options.findIndex((entry) => entry.action.type === "purchase-ship");
  assert.equal(richView.options[richPurchaseIndex].disabled, false);
  assert.deepEqual(selectPortDialogueOption(session, city, gameState, economy, [city], richPurchaseIndex, context), {
    closed: false,
    action: { type: "purchase-ship", listingId: listing.id, shipSlug: "brigantine" }
  });
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
      distanceKm: 312
    }
  });

  assert.equal(view.text, "I heard a rumour of a new Brigantine for sale at Porto.");
  assert.equal(view.options[0].label, "Set a heading for Porto");
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], 0, {
      shipyard: { famous: true, listing: null },
      nearestShipyardListing: {
        portId: 11,
        portName: "Porto",
        shipLabel: "Brigantine",
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

  const root = portDialogueView(session, city, gameState, economy, [city], context);
  const enthusiastIndex = root.options.findIndex((entry) => entry.action.nodeId === "viking-longship");
  assert.ok(enthusiastIndex >= 0);
  selectPortDialogueOption(session, city, gameState, economy, [city], enthusiastIndex, context);

  const firstView = portDialogueView(session, city, gameState, economy, [city], context);
  assert.equal(firstView.speaker, "Leif Eriksen, historical enthusiast");
  assert.match(firstView.text, /historical enthusiast/i);
  assert.equal(firstView.options.find((entry) => entry.action.type === "deliver-viking-material").disabled, true);

  gameState.cargo = { wool: 8, timber: 6, iron: 3 };
  gameState.accounts.cargoCostBasis = { wool: 144, timber: 84, iron: 78 };
  for (const expectedGood of ["Wool", "Timber", "Iron"]) {
    const view = portDialogueView(session, city, gameState, economy, [city], context);
    const deliveryIndex = view.options.findIndex((entry) => entry.action.type === "deliver-viking-material");
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
  assert.match(reward.text, /accepting will replace your Brigantine/i);
  assert.ok(reward.options.some((entry) => entry.action.type === "accept-viking-longship-reward"));
  const declineIndex = reward.options.findIndex((entry) => entry.action.type === "decline-viking-longship-reward");
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], declineIndex, context),
    { closed: false, vikingLongshipRewardDeclined: true }
  );

  gameState.doubloons = 50000;
  const availableForPurchase = portDialogueView(session, city, gameState, economy, [city], context);
  assert.match(availableForPurchase.text, /part with her for 42000 doubloons/i);
  const purchaseIndex = availableForPurchase.options.findIndex(
    (entry) => entry.action.type === "purchase-viking-longship"
  );
  assert.equal(availableForPurchase.options[purchaseIndex].disabled, false);
  assert.deepEqual(
    selectPortDialogueOption(session, city, gameState, economy, [city], purchaseIndex, context),
    { closed: false, action: { type: "purchase-viking-longship", shipSlug: "viking-longship" } }
  );
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

  const acceptSession = createPassengerDialogueSession(origin, quest);
  assert.deepEqual(selectPassengerDialogueOption(acceptSession, origin, quest, gameState, 0), {
    closed: true,
    action: null
  });
  assert.equal(gameState.memory.quests.active.id, quest.id);
  assert.equal(gameState.memory.quests.passengerOffers[quest.originKey], undefined);
});

test("envoy dialogue advances from negotiations to a paid return voyage", () => {
  const origin = { tileId: 1, city: "Lisbon", country: "Portugal", factionId: "portugal" };
  const target = { tileId: 2, city: "London", country: "United Kingdom", factionId: "england" };
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
  const result = selectPassengerDialogueOption(
    negotiationSession,
    target,
    active,
    gameState,
    0,
    { simMinute: 240 }
  );
  assert.equal(result.action.type, "envoy-negotiated");
  assert.equal(gameState.memory.quests.active.stage, "return");

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
    questCharacterSession: passengerSession
  });
  assert.equal(ordinaryPort.kind, "passenger");
  assert.equal(ordinaryPort.admittedToPort, true);
  assert.equal(ordinaryPort.nextPortNodeId, "greeting");

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
  const available = questStateForCity(gameState, origin, ports);
  assert.equal(available.kind, "available");
  assert.equal(deliveryMissionShouldOpenOnArrival(gameState, origin, ports), false);

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
  selectPortDialogueOption(session, destination, gameState, economy, ports, completeIndex);
  assert.equal(session.nodeId, "loadout");
  assert.equal(gameState.memory.quests.active, null);
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
  assert.match(session.feedback, /letter of marque granted/i);
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
