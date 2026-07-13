import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PAST_VOYAGES,
  VOYAGE_HISTORY_STORAGE_KEY,
  appendVoyageRecord,
  grossDoubloonsEarned,
  readVoyageHistory,
  voyageHistorySummary
} from "./voyageHistory.js";

test("past voyages persist newest first without sharing the active save slot", () => {
  const storage = memoryStorage();
  appendVoyageRecord(voyageRecord({ captainName: "Anne", daysAtSea: 8 }), { storage, endedAt: 100 });
  appendVoyageRecord(voyageRecord({ captainName: "Zheng", daysAtSea: 21 }), { storage, endedAt: 200 });

  const loaded = readVoyageHistory({ storage });
  assert.equal(loaded.status, "ready");
  assert.deepEqual(loaded.records.map((record) => record.captainName), ["Zheng", "Anne"]);
  assert.ok(storage.getItem(VOYAGE_HISTORY_STORAGE_KEY));
  assert.equal(storage.getItem("marque-and-reprisal.save"), null);
});

test("voyage summaries expose lifetime totals and useful records", () => {
  const records = [
    completedRecord(voyageRecord({
      captainName: "Anne",
      daysAtSea: 8,
      doubloonsEarned: 900,
      endingDoubloons: 1300,
      discoveries: 2,
      visitedPorts: 5
    }), 1),
    completedRecord(voyageRecord({
      captainName: "Zheng",
      daysAtSea: 21,
      doubloonsEarned: 4200,
      endingDoubloons: 3900,
      discoveries: 7,
      visitedPorts: 14
    }), 2)
  ];

  assert.deepEqual(voyageHistorySummary(records), {
    voyages: 2,
    totalDays: 29,
    totalDoubloonsEarned: 5100,
    longestVoyageDays: 21,
    mostDoubloonsEarned: 4200,
    richestEndingPurse: 3900,
    mostDiscoveries: 7,
    mostPortsVisited: 14
  });
});

test("gross earnings count income but not the opening purse", () => {
  assert.equal(grossDoubloonsEarned([
    { kind: "opening", amount: 1000 },
    { kind: "sell", amount: 325 },
    { kind: "buy", amount: -120 },
    { kind: "income", amount: 80 }
  ]), 405);
});

test("history remains bounded and malformed storage fails closed", () => {
  const storage = memoryStorage();
  for (let index = 0; index < MAX_PAST_VOYAGES + 4; index++) {
    appendVoyageRecord(voyageRecord({ captainName: `Captain ${index}` }), {
      storage,
      endedAt: index + 1
    });
  }
  assert.equal(readVoyageHistory({ storage }).records.length, MAX_PAST_VOYAGES);

  storage.setItem(VOYAGE_HISTORY_STORAGE_KEY, "not-json");
  assert.equal(readVoyageHistory({ storage }).status, "invalid");
});

function voyageRecord(overrides = {}) {
  return {
    captainName: "Captain Test",
    home: "Lisbon, Portugal",
    birthDateLabel: "1 JAN 1490",
    endDateLabel: "2 FEB 1523",
    vessel: "Caravel",
    outcome: "Lost at sea.",
    daysAtSea: 10,
    doubloonsEarned: 500,
    endingDoubloons: 1200,
    netDoubloons: 200,
    realizedPnl: 75,
    discoveries: 3,
    visitedPorts: 6,
    completedQuests: 2,
    lettersOfMarque: 1,
    crewLost: 4,
    piracyActs: 0,
    circumnavigated: false,
    latitude: 10,
    longitude: 20,
    ...overrides
  };
}

function completedRecord(record, endedAt) {
  return { ...record, id: `${endedAt}-1`, endedAt };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}
