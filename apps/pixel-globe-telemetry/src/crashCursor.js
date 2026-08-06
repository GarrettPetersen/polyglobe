export const CRASH_CURSOR_KEY = "crashes/all-fixed-at";

export async function readCrashCursor(env) {
  if (typeof env?.TELEMETRY_STATE?.get !== "function") {
    throw new Error("Telemetry crash cursor requires TELEMETRY_STATE KV");
  }
  return normalizeCrashCursor(await env.TELEMETRY_STATE.get(CRASH_CURSOR_KEY));
}

export function normalizeCrashCursor(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid telemetry crash cursor: ${value}`);
  }
  return new Date(value).toISOString();
}

export function analyticsCursorTimestamp(value) {
  const cursor = normalizeCrashCursor(value);
  if (cursor === null) return "1970-01-01 00:00:00";
  return cursor.slice(0, 19).replace("T", " ");
}
