import { mkdir, readFile, writeFile } from "node:fs/promises";

const REPORT_KINDS = Object.freeze(["crash", "performance", "map-integrity"]);

export async function rememberCrashReportRead({ readAt, previousCursor }) {
  return rememberTelemetryReportRead("crash", { readAt, previousCursor });
}

export async function rememberPerformanceReportRead({ readAt, previousCursor }) {
  return rememberTelemetryReportRead("performance", { readAt, previousCursor });
}

export async function rememberMapIntegrityReportRead({ readAt, previousCursor }) {
  return rememberTelemetryReportRead("map-integrity", { readAt, previousCursor });
}

async function rememberTelemetryReportRead(kind, { readAt, previousCursor }) {
  validateReportKind(kind);
  const state = {
    readAt: requiredTimestamp(readAt, `${kind} report read time`),
    previousCursor: previousCursor === null
      ? null
      : requiredTimestamp(previousCursor, `previous ${kind} cursor`)
  };
  await mkdir(new URL("../.wrangler/", import.meta.url), { recursive: true });
  await writeFile(stateUrl(kind), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return state;
}

export async function readRememberedCrashReport() {
  return readRememberedTelemetryReport("crash");
}

export async function readRememberedPerformanceReport() {
  return readRememberedTelemetryReport("performance");
}

export async function readRememberedMapIntegrityReport() {
  return readRememberedTelemetryReport("map-integrity");
}

async function readRememberedTelemetryReport(kind) {
  validateReportKind(kind);
  let text;
  try {
    text = await readFile(stateUrl(kind), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`No post-cursor ${kind} report has been read; run ${kind}:new first`);
    }
    throw error;
  }
  let state;
  try {
    state = JSON.parse(text);
  } catch {
    throw new Error("Remembered crash report state is invalid JSON");
  }
  return {
    readAt: requiredTimestamp(state?.readAt, `remembered ${kind} report read time`),
    previousCursor: state?.previousCursor === null
      ? null
      : requiredTimestamp(state?.previousCursor, `remembered previous ${kind} cursor`)
  };
}

function stateUrl(kind) {
  return new URL(`../.wrangler/${kind}-report-read-at.json`, import.meta.url);
}

function validateReportKind(kind) {
  if (!REPORT_KINDS.includes(kind)) throw new Error(`Unknown telemetry report kind: ${kind}`);
}

function requiredTimestamp(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid ${label}`);
  }
  return new Date(value).toISOString();
}
