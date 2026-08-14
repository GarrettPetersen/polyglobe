export const CRASH_CURSOR_KEY = "crashes/all-fixed-at";
export const PERFORMANCE_CURSOR_KEY = "performance/all-fixed-at";

export async function readCrashCursor(env) {
  return readTelemetryCursor(env, CRASH_CURSOR_KEY, "crash");
}

export async function readPerformanceCursor(env) {
  return readTelemetryCursor(env, PERFORMANCE_CURSOR_KEY, "performance");
}

async function readTelemetryCursor(env, key, label) {
  if (typeof env?.TELEMETRY_STATE?.get !== "function") {
    throw new Error(`Telemetry ${label} cursor requires TELEMETRY_STATE KV`);
  }
  return normalizeTelemetryCursor(await env.TELEMETRY_STATE.get(key), label);
}

export function normalizeCrashCursor(value) {
  return normalizeTelemetryCursor(value, "crash");
}

export function normalizePerformanceCursor(value) {
  return normalizeTelemetryCursor(value, "performance");
}

function normalizeTelemetryCursor(value, label) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid telemetry ${label} cursor: ${value}`);
  }
  return new Date(value).toISOString();
}

export function analyticsCursorTimestamp(value) {
  const cursor = normalizeCrashCursor(value);
  if (cursor === null) return "1970-01-01 00:00:00";
  return cursor.slice(0, 19).replace("T", " ");
}
