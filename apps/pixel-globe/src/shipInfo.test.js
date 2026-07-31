import test from "node:test";
import assert from "node:assert/strict";

import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  TRADE_PASS_REPUTATION_REQUIRED,
  acceptQuest,
  adjustFactionReputation,
  createGameState,
  grantLetterOfMarque,
  issuePersonalTradePass
} from "./gameState.js";
import {
  SHIP_INFO_CARGO_ROWS_PER_PAGE,
  SHIP_PAPER_ROW_CONTENT_INSET,
  SHIP_PAPERS_ROWS_PER_PAGE,
  compactShipMeterLayout,
  createShipComparisonView,
  createShipInfoView,
  createShipyardShipView,
  shipInfoCargoPage,
  shipComparisonArmamentRow,
  shipComparisonDifferenceLabel,
  shipLocalDateLabel,
  shipLedgerDateLabel,
  shipLedgerPage,
  shipPapersPage,
  shipPerformanceRating,
  stepShipPaperSelectionIndex
} from "./shipInfo.js";
import { shipStatsForSlug } from "./shipStats.js";
import { SPANISH_INDIES_TRADE_POLICY_ID } from "./sovereignTradeAccess.js";

test("ship information uses live hull, currency, stats, and cargo", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: {
      name: "Ines Navarro",
      expressions: [{ id: "neutral" }, { id: "angry" }]
    }
  });
  gameState.cargo.grain = 2;
  gameState.cargo.wine = 1;
  const view = createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: stats.hitPoints - 3,
    maxHitPoints: stats.hitPoints
  }, gameState);

  assert.equal(view.label, "Brigantine");
  assert.equal(view.captainName, "Ines Navarro");
  assert.equal(view.hull, 13);
  assert.equal(view.maxHull, 16);
  assert.equal(view.cannons, 14);
  assert.equal(view.seaworthiness, 7);
  assert.equal(view.armor, 0);
  assert.equal(view.cargoUsed, 3);
  assert.equal(view.cargoCapacity, 115);
  assert.equal(view.realizedPnl, 0);
  assert.deepEqual(view.cargo.map(({ id, quantity }) => [id, quantity]), [
    ["grain", 2],
    ["wine", 1]
  ]);
});

test("shipyard previews expose the full vessel specification", () => {
  const view = createShipyardShipView("galleon");

  assert.equal(view.label, "Galleon");
  assert.equal(view.hull, view.maxHull);
  assert.equal(view.cannons, view.maxCannons);
  assert.equal(view.crew, view.crewCapacity);
  assert.ok(view.cargoCapacity > 0);
  assert.ok(view.upwindStallAngleDeg > 0);
  assert.equal(view.propulsion, "sail");
  assert.match(view.propulsionSummary, /^SAIL \/ /);
  assert.ok(view.seaworthiness > 0);
  assert.deepEqual(Object.keys(view.ratings), ["speed", "acceleration", "turning", "windward"]);
});

test("ship comparisons expose signed differences from the current vessel", () => {
  const comparison = createShipComparisonView("fishing-lugger", "small-cog");
  const metrics = Object.fromEntries(comparison.metrics.map((metric) => [metric.id, metric]));

  assert.equal(comparison.current.label, "Fishing Barque");
  assert.equal(comparison.candidate.label, "Small Cog");
  assert.ok(metrics.hull.difference > 0);
  assert.ok(metrics.cargo.difference > 0);
  assert.ok(metrics.speed.difference < 0);
  assert.equal(metrics.cargo.difference, 52);
  assert.equal(metrics.armor.difference, 0);
});

test("ship comparison differences occupy a dedicated signed column", () => {
  assert.equal(shipComparisonDifferenceLabel(52), "+52");
  assert.equal(shipComparisonDifferenceLabel(0), "0");
  assert.equal(shipComparisonDifferenceLabel(-3), "-3");
  assert.throws(() => shipComparisonDifferenceLabel(Number.NaN), /Invalid ship comparison difference/);
});

test("ship comparison armament avoids repeating long gun summaries", () => {
  const cannonComparison = createShipComparisonView("small-cog", "brigantine");
  assert.deepEqual(shipComparisonArmamentRow(cannonComparison), {
    label: "GUNS",
    candidate: "14",
    current: "2",
    difference: 12
  });

  const arrowComparison = createShipComparisonView("small-cog", "viking-longship");
  assert.deepEqual(shipComparisonArmamentRow(arrowComparison), {
    label: "WEAPON",
    candidate: "ARROWS",
    current: "2 GUNS",
    difference: -2
  });
  assert.throws(
    () => shipComparisonArmamentRow(null),
    /requires current and candidate vessels/
  );
});

test("ship comparisons expose the turtle ship's exceptional armor", () => {
  const comparison = createShipComparisonView("joseon-panokseon", "joseon-turtle-ship");
  const armor = comparison.metrics.find((metric) => metric.id === "armor");

  assert.equal(comparison.candidate.armor, 40);
  assert.deepEqual(armor, {
    id: "armor",
    label: "ARMOR",
    current: 0,
    candidate: 40,
    difference: 40
  });
});

test("ship specifications explain oar and combined propulsion", () => {
  const canoe = createShipyardShipView("mesoamerican-dugout-canoe");
  const galley = createShipyardShipView("mediterranean-galley");
  const longship = createShipyardShipView("viking-longship");

  assert.equal(canoe.propulsionSummary, "OAR / NO DEAD ZONE");
  assert.equal(galley.propulsionSummary, "OAR + SAIL / ROW TO BOOST");
  assert.equal(longship.propulsionSummary, "OAR + SAIL / ROW TO BOOST");
  assert.equal(longship.armamentLabel, "ARROWS");
  assert.equal(longship.armamentSummary, "");
});

test("ship ledger pages newest entries first and uses the 1522 game calendar", () => {
  const gameState = createGameState({ cargoCapacity: 20, startMinute: 79 * 1440 + 12 * 60 });
  for (let id = 2; id <= 12; id++) {
    gameState.accounts.ledger.push({ id, simMinute: (79 + id) * 1440 });
  }
  gameState.accounts.nextEntryId = 13;

  const firstPage = shipLedgerPage(gameState, 0);
  const secondPage = shipLedgerPage(gameState, 1);
  assert.equal(firstPage.rows.length, 10);
  assert.equal(firstPage.rows[0].id, 12);
  assert.equal(secondPage.rows.length, 2);
  assert.equal(shipLedgerDateLabel(79 * 1440 + 12 * 60), "21 MAR 1522");
});

test("ship local date follows longitude across midnight and the date line", () => {
  const march21At0030 = 79 * 1440 + 30;
  const march21At1400 = 79 * 1440 + 14 * 60;
  assert.equal(shipLocalDateLabel(march21At0030, 0), "21 MAR 1522");
  assert.equal(shipLocalDateLabel(march21At0030, -15), "20 MAR 1522");
  assert.equal(shipLocalDateLabel(march21At1400, 170), "22 MAR 1522");
  assert.equal(shipLocalDateLabel(march21At1400, -170), "21 MAR 1522");
  assert.throws(() => shipLocalDateLabel(march21At0030, 181), /longitude/);
});

test("ship papers include active deliveries and letters of marque", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    }
  });
  acceptQuest(gameState, {
    id: "delivery-1-2",
    kind: "delivery",
    originTileId: 1,
    originName: "Lisbon",
    factionId: "portugal",
    regionKey: "mediterranean",
    destinationTileId: 2,
    destinationName: "Porto",
    reward: 120
  });
  adjustFactionReputation(gameState, "england", LETTER_OF_MARQUE_REPUTATION_REQUIRED);
  grantLetterOfMarque(gameState, {
    tileId: 3,
    city: "London",
    displayCity: "London",
    country: "United Kingdom",
    factionId: "england",
    isFactionCapital: true,
    capitalOfFactionId: "england"
  }, LETTER_OF_MARQUE_POWER_REQUIRED, { simMinute: 1440 });

  const view = createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints
  }, gameState);

  assert.deepEqual(view.papers.map((paper) => paper.kind), ["delivery", "item", "item", "marque"]);
  assert.equal(view.papers[0].issuer, "Kingdom of Portugal");
  assert.equal(view.papers[0].route, "Lisbon -> Porto");
  assert.equal(view.papers[0].detail, "Reward 120 DB");
  assert.equal(view.papers[1].title, "Basic cast net");
  assert.equal(view.papers[1].issuer, "Ship stores");
  assert.match(view.papers[1].detail, /max haul 3/);
  assert.equal(view.papers[2].title, "Standard ordnance");
  assert.match(view.papers[2].detail, /Reload 10\.00s/);
  assert.equal(view.papers[3].issuer, "Kingdom of England");
  assert.equal(view.papers[3].title, "English letter of marque");
  assert.equal(view.papers[3].simMinute, 1440);
  assert.equal(shipPapersPage(view, 0).rows.length, 4);
});

test("special item details expose the same canonical perk effect shown when acquired", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats
  });
  gameState.inventory.items["bronze-fish-hooks"] = 1;

  const view = createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints
  }, gameState);
  const hooks = view.papers.find((paper) => paper.title === "Bronze Fish Hooks");

  assert.equal(hooks.detail, "A case of strong hooks improves both line fishing and net work.");
  assert.equal(hooks.effect, "Fishing odds +8% / Fishing haul +10%");
  assert.equal(
    view.papers.find((paper) => paper.title === "Basic cast net").effect,
    null
  );
});

test("ship papers include the captain's named sovereign trade permits", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({
    cargoCapacity: stats.cargoCapacity,
    playerCharacter: {
      name: "Joan Alden",
      nationalityId: "england",
      expressions: ["neutral", "happy"]
    },
    shipStats: stats
  });
  adjustFactionReputation(gameState, "spain", TRADE_PASS_REPUTATION_REQUIRED);
  issuePersonalTradePass(gameState, {
    tileId: 4,
    city: "Seville",
    displayCity: "Seville",
    country: "Spain",
    factionId: "spain",
    isFactionCapital: true,
    capitalOfFactionId: "spain"
  }, SPANISH_INDIES_TRADE_POLICY_ID, { simMinute: 2880 });

  const view = createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints
  }, gameState);
  const permit = view.papers.find((paper) => paper.kind === "permit");

  assert.equal(permit.title, "Indies trade licencia");
  assert.equal(permit.issuer, "Spanish Monarchy");
  assert.equal(permit.route, "Spanish American ports");
  assert.match(permit.detail, /Royal license/);
  assert.equal(permit.simMinute, 2880);
});

test("ship papers show an active passenger aboard", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity });
  acceptQuest(gameState, {
    id: "passenger-1-2",
    kind: "passenger",
    originTileId: 1,
    originName: "Lisbon",
    destinationTileId: 2,
    destinationName: "Goa",
    passenger: { name: "Mateo Costa" },
    passengerName: "Mateo Costa",
    reward: 180
  });

  const view = createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints
  }, gameState);

  assert.equal(view.papers[0].kind, "passenger");
  assert.equal(view.papers[0].title, "Passenger: Mateo Costa");
  assert.equal(view.papers[0].issuer, "Mateo Costa");
  assert.equal(view.papers[0].route, "Lisbon -> Goa");
  assert.equal(view.papers[0].detail, "Fare 180 DB");
});

test("performance ratings preserve the expected fleet ordering", () => {
  assert.ok(
    shipPerformanceRating(shipStatsForSlug("pirate-brig"), "speed") >
    shipPerformanceRating(shipStatsForSlug("small-cog"), "speed")
  );
  assert.ok(
    shipPerformanceRating(shipStatsForSlug("felucca"), "windward") >
    shipPerformanceRating(shipStatsForSlug("carrack"), "windward")
  );
});

test("cargo manifest pages stop at either end", () => {
  const view = {
    cargo: Array.from({ length: SHIP_INFO_CARGO_ROWS_PER_PAGE + 2 }, (_, index) => ({ id: `good-${index}` }))
  };
  assert.equal(shipInfoCargoPage(view, 0).rows.length, SHIP_INFO_CARGO_ROWS_PER_PAGE);
  assert.equal(shipInfoCargoPage(view, 1).rows.length, 2);
  assert.equal(shipInfoCargoPage(view, -1).page, 0);
  assert.equal(shipInfoCargoPage(view, 2).page, 1);
});

test("cargo manifest pages respect compact responsive row capacity", () => {
  const view = {
    cargo: Array.from({ length: 7 }, (_, index) => ({ id: `good-${index}` }))
  };
  assert.deepEqual(shipInfoCargoPage(view, 0, 3), {
    page: 0,
    pageCount: 3,
    rows: view.cargo.slice(0, 3)
  });
  assert.deepEqual(shipInfoCargoPage(view, 1, 3), {
    page: 1,
    pageCount: 3,
    rows: view.cargo.slice(3, 6)
  });
  assert.throws(() => shipInfoCargoPage(view, 0, 0), /rows-per-page/i);
});

test("ship papers pages stop at either end", () => {
  const view = {
    papers: Array.from({ length: SHIP_PAPERS_ROWS_PER_PAGE + 1 }, (_, index) => ({ id: `paper-${index}` }))
  };
  assert.equal(shipPapersPage(view, 0).rows.length, SHIP_PAPERS_ROWS_PER_PAGE);
  assert.equal(shipPapersPage(view, 1).rows.length, 1);
  assert.equal(shipPapersPage(view, -1).page, 0);
  assert.equal(shipPapersPage(view, 2).page, 1);
});

test("ship paper focus activates on the edge nearest the navigation direction", () => {
  assert.equal(stepShipPaperSelectionIndex({
    currentIndex: 3,
    direction: 1,
    minIndex: 3,
    maxIndex: 5,
    active: false
  }), 3);
  assert.equal(stepShipPaperSelectionIndex({
    currentIndex: 3,
    direction: -1,
    minIndex: 3,
    maxIndex: 5,
    active: false
  }), 5);
  assert.equal(stepShipPaperSelectionIndex({
    currentIndex: 3,
    direction: 1,
    minIndex: 0,
    maxIndex: 5,
    active: true
  }), 4);
  assert.equal(SHIP_PAPER_ROW_CONTENT_INSET, 6);
});

test("cargo capacity disagreement fails loudly", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity - 1 });
  assert.throws(() => createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints
  }, gameState), /cargo capacity mismatch/);
});

test("compact ship meter reserves the measured label and value text", () => {
  const layout = compactShipMeterLayout({
    labelX: 20,
    valueX: 280,
    labelWidth: 63,
    valueWidth: 39
  });

  assert.deepEqual(layout, {
    x: 87,
    width: 150,
    valueLeft: 241
  });
  assert.ok(layout.x > 20 + 63);
  assert.ok(layout.x + layout.width < layout.valueLeft);
});

test("compact ship meter fails loudly when localized text leaves no room", () => {
  assert.throws(() => compactShipMeterLayout({
    labelX: 20,
    valueX: 120,
    labelWidth: 70,
    valueWidth: 24
  }), /cannot fit between label and value/);
});
