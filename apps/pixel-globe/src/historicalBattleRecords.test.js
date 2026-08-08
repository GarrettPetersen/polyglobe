import assert from "node:assert/strict";
import test from "node:test";
import {
  createHistoricalBattleRecords,
  historicalBattleRecordKey,
  readHistoricalBattleRecords,
  recordHistoricalBattleResult,
  writeHistoricalBattleRecords
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
