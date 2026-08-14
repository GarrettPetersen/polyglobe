import assert from "node:assert/strict";
import test from "node:test";

import {
  analyticsCursorTimestamp,
  normalizeCrashCursor,
  normalizePerformanceCursor,
  readCrashCursor,
  readPerformanceCursor
} from "./crashCursor.js";

test("crash cursors normalize to unambiguous UTC timestamps", () => {
  assert.equal(normalizeCrashCursor(null), null);
  assert.equal(
    normalizeCrashCursor("2026-08-05 12:34:56Z"),
    "2026-08-05T12:34:56.000Z"
  );
  assert.equal(
    analyticsCursorTimestamp("2026-08-05T12:34:56.789Z"),
    "2026-08-05 12:34:56"
  );
  assert.throws(() => normalizeCrashCursor("last Tuesday"), /Invalid telemetry crash cursor/);
  assert.equal(
    normalizePerformanceCursor("2026-08-05 13:00:00Z"),
    "2026-08-05T13:00:00.000Z"
  );
  assert.throws(
    () => normalizePerformanceCursor("eventually"),
    /Invalid telemetry performance cursor/
  );
});

test("crash cursors are read from the shared telemetry state", async () => {
  assert.equal(await readCrashCursor({
    TELEMETRY_STATE: { get: async () => "2026-08-05T12:34:56.000Z" }
  }), "2026-08-05T12:34:56.000Z");
  await assert.rejects(() => readCrashCursor({}), /requires TELEMETRY_STATE KV/);
});

test("performance cursors use an independent shared telemetry key", async () => {
  const reads = [];
  const cursor = await readPerformanceCursor({
    TELEMETRY_STATE: {
      get: async (key) => {
        reads.push(key);
        return "2026-08-05T13:00:00.000Z";
      }
    }
  });
  assert.equal(cursor, "2026-08-05T13:00:00.000Z");
  assert.deepEqual(reads, ["performance/all-fixed-at"]);
});
