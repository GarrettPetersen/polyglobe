import { validateHistoricalBattleReplay } from "./historicalBattle.js";

export const HISTORICAL_BATTLE_RECORDS_STORAGE_KEY =
  "marque-and-reprisal.historical-battle-records";
export const HISTORICAL_BATTLE_RECORDS_VERSION = 1;

const MAX_RECENT_RESULTS = 20;

export function createHistoricalBattleRecords() {
  return {
    version: HISTORICAL_BATTLE_RECORDS_VERSION,
    played: 0,
    victories: 0,
    defeats: 0,
    draws: 0,
    maxEnemyShipsDefeated: 0,
    byScenarioSide: {},
    recent: [],
    latestReplay: null
  };
}

export function readHistoricalBattleRecords({ storage = defaultStorage() } = {}) {
  try {
    const serialized = storage.getItem(HISTORICAL_BATTLE_RECORDS_STORAGE_KEY);
    if (!serialized) return { status: "ready", records: createHistoricalBattleRecords(), error: null };
    const records = JSON.parse(serialized);
    validateHistoricalBattleRecords(records);
    return { status: "ready", records, error: null };
  } catch (error) {
    return { status: "invalid", records: null, error: asError(error) };
  }
}

export function writeHistoricalBattleRecords(records, { storage = defaultStorage() } = {}) {
  validateHistoricalBattleRecords(records);
  storage.setItem(HISTORICAL_BATTLE_RECORDS_STORAGE_KEY, JSON.stringify(records));
  return records;
}

export function recordHistoricalBattleResult(records, result, replay) {
  validateHistoricalBattleRecords(records);
  validateHistoricalBattleResult(result);
  validateHistoricalBattleReplay(replay);
  if (replay.scenarioId !== result.scenarioId || replay.playerSideId !== result.playerSideId ||
      replay.playerSquadronId !== result.playerSquadronId) {
    throw new Error("Historical battle result and replay do not describe the same battle");
  }

  records.played += 1;
  records[pluralOutcome(result.outcome)] += 1;
  records.maxEnemyShipsDefeated = Math.max(
    records.maxEnemyShipsDefeated,
    result.enemyShipsDefeated
  );
  const key = historicalBattleRecordKey(result.scenarioId, result.playerSideId);
  const side = records.byScenarioSide[key] || {
    played: 0,
    victories: 0,
    defeats: 0,
    draws: 0,
    maxEnemyShipsDefeated: 0
  };
  side.played += 1;
  side[pluralOutcome(result.outcome)] += 1;
  side.maxEnemyShipsDefeated = Math.max(side.maxEnemyShipsDefeated, result.enemyShipsDefeated);
  records.byScenarioSide[key] = side;
  records.recent.unshift({ ...result });
  records.recent.length = Math.min(records.recent.length, MAX_RECENT_RESULTS);
  records.latestReplay = replay;
  validateHistoricalBattleRecords(records);
  return records;
}

export function historicalBattleRecordKey(scenarioId, sideId) {
  if (typeof scenarioId !== "string" || scenarioId.length === 0 ||
      typeof sideId !== "string" || sideId.length === 0) {
    throw new Error("Historical battle record key requires a scenario and side");
  }
  return `${scenarioId}:${sideId}`;
}

export function validateHistoricalBattleRecords(records) {
  if (!records || typeof records !== "object" ||
      records.version !== HISTORICAL_BATTLE_RECORDS_VERSION) {
    throw new Error(`Unsupported historical battle records: ${records?.version ?? "missing"}`);
  }
  for (const key of ["played", "victories", "defeats", "draws", "maxEnemyShipsDefeated"]) {
    requireCount(records[key], `historical battle ${key}`);
  }
  if (records.victories + records.defeats + records.draws !== records.played) {
    throw new Error("Historical battle outcome totals do not match battles played");
  }
  if (!records.byScenarioSide || typeof records.byScenarioSide !== "object" ||
      Array.isArray(records.byScenarioSide)) {
    throw new Error("Historical battle side records are invalid");
  }
  for (const [key, side] of Object.entries(records.byScenarioSide)) {
    if (!key.includes(":")) throw new Error(`Invalid historical battle side record: ${key}`);
    for (const field of ["played", "victories", "defeats", "draws", "maxEnemyShipsDefeated"]) {
      requireCount(side?.[field], `${key} ${field}`);
    }
    if (side.victories + side.defeats + side.draws !== side.played) {
      throw new Error(`Historical battle side totals do not match: ${key}`);
    }
  }
  if (!Array.isArray(records.recent) || records.recent.length > MAX_RECENT_RESULTS) {
    throw new Error("Historical battle recent results are invalid");
  }
  for (const result of records.recent) validateHistoricalBattleResult(result);
  if (records.latestReplay !== null) validateHistoricalBattleReplay(records.latestReplay);
  return records;
}

function validateHistoricalBattleResult(result) {
  if (!result || typeof result !== "object") throw new Error("Historical battle result is required");
  for (const key of ["scenarioId", "playerSideId", "playerSquadronId"]) {
    if (typeof result[key] !== "string" || result[key].length === 0) {
      throw new Error(`Historical battle result has no ${key}`);
    }
  }
  if (!["victory", "defeat", "draw"].includes(result.outcome)) {
    throw new Error(`Invalid historical battle result: ${result.outcome}`);
  }
  requireCount(result.enemyShipsDefeated, "historical battle enemies defeated");
  if (!Number.isFinite(result.durationSeconds) || result.durationSeconds < 0) {
    throw new Error(`Invalid historical battle duration: ${result.durationSeconds}`);
  }
  if (!Number.isFinite(result.endedAt) || result.endedAt <= 0) {
    throw new Error(`Invalid historical battle result time: ${result.endedAt}`);
  }
  return result;
}

function pluralOutcome(outcome) {
  return outcome === "victory" ? "victories" : outcome === "defeat" ? "defeats" : "draws";
}

function requireCount(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
}

function asError(error) {
  return error instanceof Error ? error : new Error(String(error));
}

function defaultStorage() {
  if (typeof localStorage === "undefined") throw new Error("Historical battle storage is unavailable");
  return localStorage;
}
