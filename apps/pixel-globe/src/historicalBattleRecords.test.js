import assert from "node:assert/strict";
import test from "node:test";
import {
  createHistoricalBattleRecords,
  historicalBattleRecordKey,
  readHistoricalBattleRecords,
  recordHistoricalBattleResult,
  writeHistoricalBattleRecords,
  writeHistoricalBattleRecordsWithRecovery
} from "./historicalBattleRecords.js";

function replay() {
  return {
    version: 1,
    scenarioId: "lepanto-1571",
    playerSideId: "holy-league",
    playerSquadronId: "league-center",
    seed: 7,
    commands: []
  };
}

test("historical battle records persist side results and the latest replay", () => {
  const records = createHistoricalBattleRecords();
  recordHistoricalBattleResult(records, {
    scenarioId: "lepanto-1571",
    playerSideId: "holy-league",
    playerSquadronId: "league-center",
    outcome: "victory",
    enemyShipsDefeated: 140,
    durationSeconds: 320,
    endedAt: 1234
  }, replay());

  const key = historicalBattleRecordKey("lepanto-1571", "holy-league");
  assert.equal(records.played, 1);
  assert.equal(records.victories, 1);
  assert.equal(records.byScenarioSide[key].maxEnemyShipsDefeated, 140);
  assert.equal(records.latestReplay.seed, 7);
});

test("historical battle records round trip through storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const records = createHistoricalBattleRecords();
  writeHistoricalBattleRecords(records, { storage });
  assert.deepEqual(readHistoricalBattleRecords({ storage }), {
    status: "ready",
    records,
    error: null
  });
});

test("historical battle replays use a compact persisted command encoding", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const records = recordsWithReplayCommands(500);
  writeHistoricalBattleRecords(records, { storage });
  const serialized = values.get("marque-and-reprisal.historical-battle-records");
  assert.ok(serialized.length < JSON.stringify(records).length * 0.45);
  assert.deepEqual(readHistoricalBattleRecords({ storage }).records, records);
});

test("storage pressure drops only the replay while retaining battle results", () => {
  const records = recordsWithReplayCommands(500);
  const probe = memoryStorage();
  writeHistoricalBattleRecords(records, { storage: probe });
  const compactReplayLength = probe.getItem("marque-and-reprisal.historical-battle-records").length;
  const storage = capacityStorage(compactReplayLength - 1);

  const result = writeHistoricalBattleRecordsWithRecovery(records, { storage });

  assert.equal(result.replayStored, false);
  assert.equal(result.error.name, "QuotaExceededError");
  assert.equal(result.records.played, 1);
  assert.equal(result.records.victories, 1);
  assert.equal(result.records.latestReplay, null);
  assert.deepEqual(readHistoricalBattleRecords({ storage }).records, result.records);
});

test("legacy verbose historical battle replays still load", () => {
  const records = recordsWithReplayCommands(2);
  const storage = memoryStorage({
    "marque-and-reprisal.historical-battle-records": JSON.stringify(records)
  });
  assert.deepEqual(readHistoricalBattleRecords({ storage }).records, records);
});

test("legacy compact squadron commands migrate to movement-only controls", () => {
  const records = recordsWithReplayCommands(0);
  records.latestReplay.commands = [[1, 123, 7, "ahead", "advance", 2, "follow"]];
  records.latestReplay.commandEncoding = "tuple-v1";
  const storage = memoryStorage({
    "marque-and-reprisal.historical-battle-records": JSON.stringify(records)
  });

  const loaded = readHistoricalBattleRecords({ storage }).records;
  assert.deepEqual(loaded.latestReplay.commands, [{
    tick: 1,
    desiredHeadingQ: 123,
    rowingRequested: true,
    rowingMode: "ahead",
    firePort: true,
    fireStarboard: true
  }]);
});

function recordsWithReplayCommands(count) {
  const records = createHistoricalBattleRecords();
  const value = replay();
  value.commands = Array.from({ length: count }, (_, index) => ({
    tick: index + 1,
    desiredHeadingQ: index % 65536,
    rowingRequested: index % 2 === 0,
    rowingMode: index % 2 === 0 ? "ahead" : "idle",
    firePort: index % 19 === 0,
    fireStarboard: index % 23 === 0
  }));
  recordHistoricalBattleResult(records, {
    scenarioId: "lepanto-1571",
    playerSideId: "holy-league",
    playerSquadronId: "league-center",
    outcome: "victory",
    enemyShipsDefeated: 140,
    durationSeconds: 320,
    endedAt: 1234
  }, value);
  return records;
}

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

function capacityStorage(maxCharacters) {
  const storage = memoryStorage();
  const setItem = storage.setItem;
  storage.setItem = (key, value) => {
    const serialized = String(value);
    if (serialized.length > maxCharacters) {
      const error = new Error(`Storage quota exceeded: ${serialized.length}/${maxCharacters}`);
      error.name = "QuotaExceededError";
      throw error;
    }
    setItem(key, serialized);
  };
  return storage;
}
