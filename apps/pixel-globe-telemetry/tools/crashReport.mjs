import { ANALYTICS_ENGINE_DATASET } from "./analyticsEngine.mjs";
import { analyticsCursorTimestamp, normalizeCrashCursor } from "../src/crashCursor.js";

const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 90 * 24;
const OUTPUT_FORMATS = new Set(["human", "json"]);

export function parseCrashReportArguments(args) {
  if (!Array.isArray(args)) throw new Error("Crash report arguments must be an array");
  let windowHours = DEFAULT_WINDOW_HOURS;
  let format = "human";
  let sinceFixed = false;
  let windowWasSet = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--hours" || argument === "--days") {
      if (windowWasSet) throw new Error("Use only one of --hours or --days");
      const value = Number(args[index + 1]);
      const multiplier = argument === "--days" ? 24 : 1;
      if (!Number.isInteger(value) || value < 1 || value * multiplier > MAX_WINDOW_HOURS) {
        throw new Error(`${argument} must define a whole-number window no longer than 90 days`);
      }
      windowHours = value * multiplier;
      windowWasSet = true;
      index += 1;
      continue;
    }
    if (argument === "--format") {
      format = String(args[index + 1] || "").toLowerCase();
      if (!OUTPUT_FORMATS.has(format)) throw new Error("--format must be human or json");
      index += 1;
      continue;
    }
    if (argument === "--since-fixed") {
      sinceFixed = true;
      continue;
    }
    throw new Error(`Unknown crash report argument: ${argument}`);
  }
  return { windowHours, format, sinceFixed };
}

export function crashSummarySql(windowHours, after = null) {
  const interval = validatedWindowHours(windowHours);
  return `
    SELECT count() AS reports,
      count(DISTINCT index1) AS affected_installations,
      count(DISTINCT blob13) AS fingerprints,
      min(timestamp) AS first_seen,
      max(timestamp) AS last_seen
    FROM ${ANALYTICS_ENGINE_DATASET}
    WHERE blob1 = 'crash'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${interval}' HOUR
      ${afterCursorSql(after)}
  `.trim();
}

export function crashGroupsSql(windowHours, after = null) {
  const interval = validatedWindowHours(windowHours);
  return `
    SELECT blob13 AS fingerprint, blob3 AS revision, blob4 AS channel,
      blob5 AS platform, blob6 AS locale, blob18 AS game_state_version,
      blob17 AS screen, blob14 AS error_name, blob15 AS message,
      blob16 AS stack, blob8 AS main_quest, blob10 AS ship,
      count() AS reports,
      count(DISTINCT index1) AS affected_installations,
      min(timestamp) AS first_seen,
      max(timestamp) AS last_seen
    FROM ${ANALYTICS_ENGINE_DATASET}
    WHERE blob1 = 'crash'
      AND blob4 != 'deployment-check'
      AND timestamp > NOW() - INTERVAL '${interval}' HOUR
      ${afterCursorSql(after)}
    GROUP BY fingerprint, revision, channel, platform, locale, game_state_version,
      screen, error_name, message, stack, main_quest, ship
    ORDER BY reports DESC, last_seen DESC
  `.trim();
}

export function createCrashReport({
  windowHours,
  summaryRows,
  crashRows,
  cursor = null,
  generatedAt = new Date().toISOString()
}) {
  const interval = validatedWindowHours(windowHours);
  if (!Array.isArray(summaryRows) || !Array.isArray(crashRows)) {
    throw new Error("Crash report query results must be arrays");
  }
  const emptySummary = {
    reports: 0,
    affectedInstallations: 0,
    fingerprints: 0,
    firstSeen: null,
    lastSeen: null
  };
  const summary = summaryRows.length === 0 ? emptySummary : {
    reports: integerField(summaryRows[0].reports, "summary reports"),
    affectedInstallations: integerField(
      summaryRows[0].affected_installations,
      "summary affected installations"
    ),
    fingerprints: integerField(summaryRows[0].fingerprints, "summary fingerprints"),
    firstSeen: optionalString(summaryRows[0].first_seen),
    lastSeen: optionalString(summaryRows[0].last_seen)
  };
  if (summary.reports === 0) {
    summary.firstSeen = null;
    summary.lastSeen = null;
  }
  const crashes = crashRows.map((row) => ({
    fingerprint: requiredString(row.fingerprint, "crash fingerprint"),
    revision: requiredString(row.revision, "crash revision"),
    channel: requiredString(row.channel, "crash channel"),
    platform: requiredString(row.platform, "crash platform"),
    locale: requiredString(row.locale, "crash locale"),
    gameStateVersion: integerField(row.game_state_version, "crash game state version"),
    screen: requiredString(row.screen, "crash screen"),
    errorName: requiredString(row.error_name, "crash error name"),
    message: requiredString(row.message, "crash message", true),
    stack: requiredString(row.stack, "crash stack", true),
    mainQuest: optionalString(row.main_quest),
    ship: optionalString(row.ship),
    reports: integerField(row.reports, "crash reports"),
    affectedInstallations: integerField(
      row.affected_installations,
      "crash affected installations"
    ),
    firstSeen: requiredString(row.first_seen, "crash first seen"),
    lastSeen: requiredString(row.last_seen, "crash last seen")
  }));
  const groupedReports = crashes.reduce((total, crash) => total + crash.reports, 0);
  if (groupedReports !== summary.reports) {
    throw new Error(
      `Crash report groups do not account for every report: ${groupedReports}/${summary.reports}`
    );
  }
  return {
    schemaVersion: 2,
    generatedAt: requiredString(generatedAt, "report generation time"),
    windowHours: interval,
    cursor: normalizeCrashCursor(cursor),
    summary,
    crashes
  };
}

export function formatCrashReport(report, format) {
  if (!OUTPUT_FORMATS.has(format)) throw new Error(`Unsupported crash report format: ${format}`);
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const lines = [
    `Marque & Reprisal crash telemetry, last ${report.windowHours} hours`,
    report.cursor ? `Only reports after all-fixed cursor ${report.cursor}` : "All reports in window",
    `${report.summary.reports} reports across ${report.crashes.length} context groups; ` +
      `${report.summary.affectedInstallations} affected installations`
  ];
  if (report.crashes.length === 0) return `${lines.join("\n")}\n\n(no crashes)\n`;
  for (const [index, crash] of report.crashes.entries()) {
    lines.push(
      "",
      `[${index + 1}] ${crash.errorName}: ${crash.message || "(no message)"}`,
      `fingerprint: ${crash.fingerprint}`,
      `reports: ${crash.reports}; affected installations: ${crash.affectedInstallations}`,
      `seen: ${crash.firstSeen} to ${crash.lastSeen}`,
      `build: ${crash.revision}; channel: ${crash.channel}; platform: ${crash.platform}; ` +
        `locale: ${crash.locale}; save schema: ${crash.gameStateVersion}`,
      `screen: ${crash.screen}; quest: ${crash.mainQuest || "(none)"}; ` +
        `ship: ${crash.ship || "(none)"}`,
      "stack:",
      crash.stack || "(no stack)"
    );
  }
  return `${lines.join("\n")}\n`;
}

function afterCursorSql(value) {
  const cursor = normalizeCrashCursor(value);
  return cursor === null
    ? ""
    : `AND timestamp > toDateTime('${analyticsCursorTimestamp(cursor)}')`;
}

function validatedWindowHours(value) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_WINDOW_HOURS) {
    throw new Error(`Crash report window must be 1-${MAX_WINDOW_HOURS} hours`);
  }
  return value;
}

function integerField(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function requiredString(value, label, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function optionalString(value) {
  return typeof value === "string" && value !== "" ? value : null;
}
