import test from "node:test";
import assert from "node:assert/strict";

import {
  LETTER_OF_MARQUE_POWER_REQUIRED,
  LETTER_OF_MARQUE_REPUTATION_REQUIRED,
  acceptQuest,
  adjustFactionReputation,
  createGameState,
  grantLetterOfMarque
} from "./gameState.js";
import {
  SHIP_INFO_CARGO_ROWS_PER_PAGE,
  SHIP_PAPERS_ROWS_PER_PAGE,
  createShipInfoView,
  createShipyardShipView,
  shipInfoCargoPage,
  shipLedgerDateLabel,
  shipLedgerPage,
  shipPapersPage,
  shipPerformanceRating
} from "./shipInfo.js";
import { shipStatsForSlug } from "./shipStats.js";

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

test("ship specifications explain oar and combined propulsion", () => {
  const canoe = createShipyardShipView("mesoamerican-dugout-canoe");
  const galley = createShipyardShipView("mediterranean-galley");
  const longship = createShipyardShipView("viking-longship");

  assert.equal(canoe.propulsionSummary, "OAR / NO DEAD ZONE");
  assert.equal(galley.propulsionSummary, "OAR + SAIL / ROWS UPWIND");
  assert.equal(longship.propulsionSummary, "OAR + SAIL / ROWS UPWIND");
  assert.equal(longship.armamentLabel, "ARROWS");
  assert.equal(longship.armamentSummary, "VOLLEY");
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
    shipPerformanceRating(shipStatsForSlug("frigate"), "speed") >
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

test("ship papers pages stop at either end", () => {
  const view = {
    papers: Array.from({ length: SHIP_PAPERS_ROWS_PER_PAGE + 1 }, (_, index) => ({ id: `paper-${index}` }))
  };
  assert.equal(shipPapersPage(view, 0).rows.length, SHIP_PAPERS_ROWS_PER_PAGE);
  assert.equal(shipPapersPage(view, 1).rows.length, 1);
  assert.equal(shipPapersPage(view, -1).page, 0);
  assert.equal(shipPapersPage(view, 2).page, 1);
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
