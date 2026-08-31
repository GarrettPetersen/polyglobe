import assert from "node:assert/strict";
import test from "node:test";

import {
  collectPlayerShipyardDividends,
  createGameState,
  compactPlayerLedger,
  playerLedgerLifetimeMetrics,
  playerLedgerTotalEntryCount
} from "./gameState.js";
import { createWorldShipyards, fundPlayerShipyard, shipyardAtPort } from "./shipyards.js";
import { shipStatsForSlug } from "./shipStats.js";
import { grossDoubloonsEarned } from "./voyageHistory.js";

test("ledger compaction retains recent rows and summarizes lifetime achievement metrics", () => {
  const state = {
    accounts: {
      nextEntryId: 10,
      ledger: [
        entry(1, "opening", { amount: 360 }),
        entry(2, "sell", { amount: 90, goodId: "pepper" }),
        entry(3, "catch", { quantity: 4, goodId: "fish" }),
        entry(4, "income", { amount: 50, description: "Passenger fare" }),
        entry(5, "ship", { amount: -500 }),
        entry(6, "buy", { amount: -20, goodId: "grain" }),
        entry(7, "sell", { amount: 120, goodId: "cloves" }),
        entry(8, "catch", { quantity: 3, goodId: "fish" }),
        entry(9, "buy", { amount: -15, goodId: "wine" })
      ]
    }
  };

  const result = compactPlayerLedger(state, { limit: 6 });
  assert.deepEqual(result, { archivedEntryCount: 4, retainedEntryCount: 6 });
  assert.deepEqual(state.accounts.ledger.map((row) => row.kind), [
    "opening", "archive", "buy", "sell", "catch", "buy"
  ]);
  assert.equal(grossDoubloonsEarned(state.accounts.ledger), 260);
  assert.deepEqual(playerLedgerLifetimeMetrics(state), {
    entryCount: 8,
    grossDoubloonsEarned: 260,
    soldGoodIds: ["cloves", "pepper"],
    fishCaughtQuantity: 7,
    passengerDeliveries: 1,
    acquiredShips: 1
  });
  assert.equal(playerLedgerTotalEntryCount(state), 9);
});

test("repeated compaction merges an existing archive without losing prior totals", () => {
  const state = {
    accounts: {
      nextEntryId: 8,
      ledger: [
        entry(1, "opening", { amount: 360 }),
        {
          ...entry(2, "archive", { amount: 90 }),
          archivedEntryCount: 2,
          archivedSoldGoodIds: ["pepper"],
          archivedFishCaughtQuantity: 1,
          archivedPassengerDeliveries: 0,
          archivedAcquiredShips: 0
        },
        entry(3, "buy", { amount: -10 }),
        entry(4, "sell", { amount: 100, goodId: "cloves" }),
        entry(5, "catch", { quantity: 2, goodId: "fish" }),
        entry(6, "ship", { amount: -200 }),
        entry(7, "income", { amount: 50, description: "Passenger fare" })
      ]
    }
  };

  compactPlayerLedger(state, { limit: 5 });
  assert.deepEqual(playerLedgerLifetimeMetrics(state), {
    entryCount: 7,
    grossDoubloonsEarned: 240,
    soldGoodIds: ["cloves", "pepper"],
    fishCaughtQuantity: 3,
    passengerDeliveries: 1,
    acquiredShips: 1
  });
  assert.equal(playerLedgerTotalEntryCount(state), 8);
});

test("collecting shipyard dividends pays the purse and clears the yard balance together", () => {
  const city = {
    tileId: 91,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    factionId: "spain",
    routeRegion: "mediterranean",
    cityType: "mediterranean",
    settlementType: "city",
    population: 45000,
    lat: 36.53,
    lon: -6.29
  };
  const stats = shipStatsForSlug("fishing-lugger");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  state.memory.shipyardInvestment.backedPortCityIds.push(city.cityId);
  const system = createWorldShipyards({ ports: [city], startMinute: 0 });
  const yard = fundPlayerShipyard(system, city, {
    investedMinute: 0,
    seedCapital: 100000,
    materialContributions: { timber: 20, iron: 12, "naval-stores": 10 }
  });
  yard.playerDividendBalance = 22000;
  yard.lifetimePlayerDividends = 54000;
  yard.playerPendingSales = [{
    id: "cadiz-galleon-sale",
    shipSlug: "galleon",
    price: 100000,
    dividend: 22000,
    buyer: "npc",
    soldMinute: 100
  }];
  const purseBefore = state.doubloons;

  const payout = collectPlayerShipyardDividends(state, system, city, { simMinute: 120 });

  assert.equal(payout.amount, 22000);
  assert.equal(payout.sales[0].shipSlug, "galleon");
  assert.equal(payout.lifetimeTotal, 54000);
  assert.equal(state.doubloons, purseBefore + 22000);
  assert.equal(state.accounts.ledger.at(-1).kind, "shipyard");
  assert.equal(state.accounts.ledger.at(-1).amount, 22000);
  assert.equal(shipyardAtPort(system, city).playerDividendBalance, 0);
  assert.deepEqual(shipyardAtPort(system, city).playerPendingSales, []);
  assert.equal(collectPlayerShipyardDividends(state, system, city, { simMinute: 121 }), null);
});

function entry(id, kind, overrides = {}) {
  return {
    id,
    kind,
    simMinute: 100 + id,
    location: "Aboard",
    country: "",
    description: kind,
    goodId: null,
    quantity: 0,
    amount: 0,
    balance: 360,
    costBasis: null,
    pnl: null,
    ...overrides
  };
}
