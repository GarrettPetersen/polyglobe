import test from "node:test";
import assert from "node:assert/strict";

import { createGameState } from "./gameState.js";
import {
  SHIP_INFO_CARGO_ROWS_PER_PAGE,
  createShipInfoView,
  shipInfoCargoPage,
  shipPerformanceRating
} from "./shipInfo.js";
import { shipStatsForSlug } from "./shipStats.js";

test("ship information uses live hull, currency, stats, and cargo", () => {
  const stats = shipStatsForSlug("brigantine");
  const gameState = createGameState({ cargoCapacity: stats.cargoCapacity });
  gameState.cargo.grain = 2;
  gameState.cargo.wine = 1;
  const view = createShipInfoView({
    typeSlug: "brigantine",
    hitPoints: 123,
    maxHitPoints: stats.hitPoints
  }, gameState);

  assert.equal(view.label, "Brigantine");
  assert.equal(view.hull, 123);
  assert.equal(view.maxHull, 155);
  assert.equal(view.cannons, 14);
  assert.equal(view.cargoUsed, 3);
  assert.equal(view.cargoCapacity, 115);
  assert.deepEqual(view.cargo.map(({ id, quantity }) => [id, quantity]), [
    ["grain", 2],
    ["wine", 1]
  ]);
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

test("cargo manifest pages wrap in both directions", () => {
  const view = {
    cargo: Array.from({ length: SHIP_INFO_CARGO_ROWS_PER_PAGE + 2 }, (_, index) => ({ id: `good-${index}` }))
  };
  assert.equal(shipInfoCargoPage(view, 0).rows.length, SHIP_INFO_CARGO_ROWS_PER_PAGE);
  assert.equal(shipInfoCargoPage(view, 1).rows.length, 2);
  assert.equal(shipInfoCargoPage(view, -1).page, 1);
  assert.equal(shipInfoCargoPage(view, 2).page, 0);
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
