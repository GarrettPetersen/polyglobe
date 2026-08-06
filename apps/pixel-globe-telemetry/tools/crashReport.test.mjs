import assert from "node:assert/strict";
import test from "node:test";

import {
  crashGroupsSql,
  crashSummarySql,
  createCrashReport,
  formatCrashReport,
  parseCrashReportArguments
} from "./crashReport.mjs";

test("crash report arguments accept bounded windows and the all-fixed cursor", () => {
  assert.deepEqual(parseCrashReportArguments([]), {
    windowHours: 24,
    format: "human",
    sinceFixed: false
  });
  assert.deepEqual(parseCrashReportArguments(["--hours", "12", "--format", "json"]), {
    windowHours: 12,
    format: "json",
    sinceFixed: false
  });
  assert.deepEqual(parseCrashReportArguments(["--days", "7", "--since-fixed"]), {
    windowHours: 168,
    format: "human",
    sinceFixed: true
  });
  assert.throws(() => parseCrashReportArguments(["--hours", "2", "--days", "1"]), /only one/i);
  assert.throws(() => parseCrashReportArguments(["--hours", "0"]), /whole-number window/i);
  assert.throws(() => parseCrashReportArguments(["--format", "csv"]), /human or json/i);
});

test("crash queries cover the requested window and retain diagnostic fields", () => {
  const summary = crashSummarySql(48);
  const groups = crashGroupsSql(48);
  assert.match(summary, /INTERVAL '48' HOUR/);
  assert.match(summary, /count\(DISTINCT index1\)/);
  assert.match(groups, /blob16 AS stack/);
  assert.match(groups, /blob3 AS revision/);
  assert.match(groups, /min\(timestamp\) AS first_seen/);
  assert.match(groups, /ORDER BY reports DESC, last_seen DESC/);
});

test("post-cursor crash queries exclude reports already declared fixed", () => {
  const cursor = "2026-08-05T12:34:56.789Z";
  assert.match(crashSummarySql(48, cursor), /timestamp > toDateTime\('2026-08-05 12:34:56'\)/);
  assert.match(crashGroupsSql(48, cursor), /timestamp > toDateTime\('2026-08-05 12:34:56'\)/);
});

test("crash reports normalize Cloudflare rows for agents and humans", () => {
  const report = createCrashReport({
    windowHours: 24,
    generatedAt: "2026-07-25T12:00:00.000Z",
    cursor: "2026-07-25T09:00:00.000Z",
    summaryRows: [{
      reports: "2",
      affected_installations: "1",
      fingerprints: "1",
      first_seen: "2026-07-25 10:00:00.000",
      last_seen: "2026-07-25 11:00:00.000"
    }],
    crashRows: [{
      fingerprint: "abc123",
      revision: "deadbee",
      channel: "browser-production",
      platform: "browser",
      locale: "en",
      game_state_version: "19",
      screen: "sailing",
      error_name: "TypeError",
      message: "boom",
      stack: "TypeError: boom\n    at sail (main.js:1:1)",
      main_quest: "explorer",
      ship: "lateen-barque",
      reports: "2",
      affected_installations: "1",
      first_seen: "2026-07-25 10:00:00.000",
      last_seen: "2026-07-25 11:00:00.000"
    }]
  });
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.summary.reports, 2);
  assert.equal(report.cursor, "2026-07-25T09:00:00.000Z");
  assert.equal(report.crashes[0].gameStateVersion, 19);
  assert.match(formatCrashReport(report, "human"), /TypeError: boom/);
  assert.match(formatCrashReport(report, "human"), /Only reports after all-fixed cursor/);
  assert.deepEqual(JSON.parse(formatCrashReport(report, "json")), report);
});

test("crash reports fail when grouped results silently omit reports", () => {
  assert.throws(() => createCrashReport({
    windowHours: 24,
    summaryRows: [{
      reports: 2,
      affected_installations: 1,
      fingerprints: 1,
      first_seen: "first",
      last_seen: "last"
    }],
    crashRows: [{
      fingerprint: "abc123",
      revision: "deadbee",
      channel: "browser-production",
      platform: "browser",
      locale: "en",
      game_state_version: 19,
      screen: "sailing",
      error_name: "TypeError",
      message: "boom",
      stack: "",
      main_quest: "",
      ship: "",
      reports: 1,
      affected_installations: 1,
      first_seen: "first",
      last_seen: "last"
    }]
  }), /do not account for every report/i);
});

test("empty aggregate timestamps do not pretend a crash happened in 1970", () => {
  const report = createCrashReport({
    windowHours: 24,
    summaryRows: [{
      reports: 0,
      affected_installations: 0,
      fingerprints: 0,
      first_seen: "1970-01-01 00:00:00",
      last_seen: "1970-01-01 00:00:00"
    }],
    crashRows: []
  });
  assert.equal(report.summary.firstSeen, null);
  assert.equal(report.summary.lastSeen, null);
});
