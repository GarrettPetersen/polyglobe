export const VOYAGE_HISTORY_STORAGE_KEY = "marque-and-reprisal.voyage-history";
export const VOYAGE_HISTORY_VERSION = 2;
export const MAX_PAST_VOYAGES = 50;
export const VOYAGE_OUTCOME_TYPES = Object.freeze(["victory", "death", "quit", "demo"]);

const NON_NEGATIVE_FIELDS = Object.freeze([
  "daysAtSea",
  "doubloonsEarned",
  "endingDoubloons",
  "discoveries",
  "visitedPorts",
  "completedQuests",
  "lettersOfMarque",
  "crewLost",
  "piracyActs"
]);

export function readVoyageHistory({ storage = defaultStorage() } = {}) {
  try {
    const serialized = storage.getItem(VOYAGE_HISTORY_STORAGE_KEY);
    if (serialized === null) return { status: "ready", records: [], error: null };
    const history = migrateVoyageHistory(JSON.parse(serialized));
    validateVoyageHistory(history);
    return { status: "ready", records: history.records, error: null };
  } catch (error) {
    return { status: "invalid", records: [], error: asError(error) };
  }
}

export function appendVoyageRecord(record, {
  storage = defaultStorage(),
  endedAt = Date.now()
} = {}) {
  if (!Number.isFinite(endedAt) || endedAt <= 0) {
    throw new Error(`Invalid voyage end timestamp: ${endedAt}`);
  }
  const loaded = readVoyageHistory({ storage });
  const previous = loaded.status === "ready" ? loaded.records : [];
  const normalized = {
    ...record,
    id: `${Math.floor(endedAt)}-${previous.length + 1}`,
    endedAt: Math.floor(endedAt)
  };
  validateVoyageRecord(normalized);
  const history = {
    version: VOYAGE_HISTORY_VERSION,
    records: [normalized, ...previous].slice(0, MAX_PAST_VOYAGES)
  };
  storage.setItem(VOYAGE_HISTORY_STORAGE_KEY, JSON.stringify(history));
  return { record: normalized, records: history.records };
}

export function voyageHistorySummary(records) {
  if (!Array.isArray(records)) throw new Error("Voyage history records must be an array");
  records.forEach(validateVoyageRecord);
  return records.reduce((summary, record) => ({
    voyages: summary.voyages + 1,
    totalDays: summary.totalDays + record.daysAtSea,
    totalDoubloonsEarned: summary.totalDoubloonsEarned + record.doubloonsEarned,
    longestVoyageDays: Math.max(summary.longestVoyageDays, record.daysAtSea),
    mostDoubloonsEarned: Math.max(summary.mostDoubloonsEarned, record.doubloonsEarned),
    richestEndingPurse: Math.max(summary.richestEndingPurse, record.endingDoubloons),
    mostDiscoveries: Math.max(summary.mostDiscoveries, record.discoveries),
    mostPortsVisited: Math.max(summary.mostPortsVisited, record.visitedPorts),
    victories: summary.victories + (record.outcomeType === "victory" ? 1 : 0),
    deaths: summary.deaths + (record.outcomeType === "death" ? 1 : 0),
    quits: summary.quits + (record.outcomeType === "quit" ? 1 : 0),
    demos: summary.demos + (record.outcomeType === "demo" ? 1 : 0)
  }), {
    voyages: 0,
    totalDays: 0,
    totalDoubloonsEarned: 0,
    longestVoyageDays: 0,
    mostDoubloonsEarned: 0,
    richestEndingPurse: 0,
    mostDiscoveries: 0,
    mostPortsVisited: 0,
    victories: 0,
    deaths: 0,
    quits: 0,
    demos: 0
  });
}

export function grossDoubloonsEarned(ledger) {
  if (!Array.isArray(ledger)) throw new Error("Voyage earnings require a ledger");
  return ledger.reduce((total, entry) => {
    if (entry?.kind === "opening") return total;
    return total + (Number.isFinite(entry?.amount) && entry.amount > 0 ? entry.amount : 0);
  }, 0);
}

function validateVoyageHistory(history) {
  if (!history || typeof history !== "object" || history.version !== VOYAGE_HISTORY_VERSION) {
    throw new Error(`Unsupported voyage history version: ${history?.version ?? "missing"}`);
  }
  if (!Array.isArray(history.records) || history.records.length > MAX_PAST_VOYAGES) {
    throw new Error("Voyage history contains an invalid record list");
  }
  history.records.forEach(validateVoyageRecord);
  return history;
}

function migrateVoyageHistory(history) {
  if (!history || typeof history !== "object") throw new Error("Invalid voyage history");
  if (history.version === VOYAGE_HISTORY_VERSION) return history;
  if (history.version !== 1 || !Array.isArray(history.records)) {
    throw new Error(`Unsupported voyage history version: ${history.version ?? "missing"}`);
  }
  return {
    version: VOYAGE_HISTORY_VERSION,
    records: history.records.map((record) => ({
      ...record,
      outcomeType: typeof record.outcome === "string" && record.outcome.includes("abandoned") ? "quit" : "death",
      goal: "Unknown",
      mappedPercent: 0
    }))
  };
}

function validateVoyageRecord(record) {
  if (!record || typeof record !== "object") throw new Error("Invalid voyage record");
  for (const key of [
    "id",
    "captainName",
    "home",
    "birthDateLabel",
    "endDateLabel",
    "vessel",
    "outcome",
    "goal"
  ]) {
    if (typeof record[key] !== "string" || record[key].trim() === "") {
      throw new Error(`Voyage record has invalid ${key}`);
    }
  }
  if (!VOYAGE_OUTCOME_TYPES.includes(record.outcomeType)) {
    throw new Error(`Voyage record has invalid outcome type: ${record.outcomeType}`);
  }
  if (!Number.isFinite(record.endedAt) || record.endedAt <= 0) {
    throw new Error(`Voyage record has invalid endedAt: ${record.endedAt}`);
  }
  for (const key of NON_NEGATIVE_FIELDS) {
    if (!Number.isFinite(record[key]) || record[key] < 0) {
      throw new Error(`Voyage record has invalid ${key}: ${record[key]}`);
    }
  }
  if (!Number.isFinite(record.netDoubloons) || !Number.isFinite(record.realizedPnl)) {
    throw new Error("Voyage record has invalid profit figures");
  }
  if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)) {
    throw new Error("Voyage record has invalid last position");
  }
  if (!Number.isFinite(record.mappedPercent) || record.mappedPercent < 0 || record.mappedPercent > 100) {
    throw new Error(`Voyage record has invalid mapped percentage: ${record.mappedPercent}`);
  }
  if (typeof record.circumnavigated !== "boolean") {
    throw new Error("Voyage record has invalid circumnavigation status");
  }
  return record;
}

function defaultStorage() {
  if (typeof localStorage === "undefined") throw new Error("Local storage is unavailable");
  return localStorage;
}

function asError(value) {
  return value instanceof Error ? value : new Error(String(value));
}
