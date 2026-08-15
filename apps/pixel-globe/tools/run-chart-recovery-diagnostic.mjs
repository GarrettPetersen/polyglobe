import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  collectCapturePageErrors,
  launchCaptureBrowser
} from "./capture-browser.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const server = args.baseUrl ? null : startServer(args.port);
const baseUrl = args.baseUrl || `http://127.0.0.1:${args.port}`;
const allCases = [
  {
    id: "open-ocean-admission-only",
    scenarioId: "diagnostic-chart-recovery-ocean",
    tiltDeg: 6,
    speedRatio: 0.7,
    durationSeconds: 1,
    deterministicTravelPx: 260,
    passiveOnly: true,
    allowDialogue: false,
    maximumFinalTiltDeg: 2.5,
    maximumFinalTearPx: 8,
    maximumFinalWaterTearPx: 12,
    maximumObservedTiltDeg: 7,
    maximumObservedVisibleTiltDeg: 7,
    maximumObservedUnobscuredTearPx: 10,
    maximumObservedUnobscuredWaterTearPx: 12,
    requireOrdinaryAdmissionOnly: true
  },
  {
    id: "open-ocean-full-repair",
    scenarioId: "diagnostic-chart-recovery-ocean",
    tiltDeg: 12,
    speedRatio: 0.7,
    durationSeconds: 24,
    passiveOnly: false,
    allowDialogue: false,
    maximumFinalTiltDeg: 4,
    maximumFinalTearPx: 8,
    maximumFinalWaterTearPx: 12,
    maximumObservedTiltDeg: 13,
    maximumObservedVisibleTiltDeg: 13,
    maximumObservedUnobscuredTearPx: 10,
    maximumObservedUnobscuredWaterTearPx: 12
  },
  {
    id: "scandinavian-coast-preventive",
    scenarioId: "diagnostic-chart-recovery-scandinavia",
    tiltDeg: 0,
    speedRatio: 0.25,
    durationSeconds: 40,
    deterministicTravelPx: 160,
    passiveOnly: false,
    allowDialogue: false,
    maximumFinalTiltDeg: 5,
    maximumFinalTearPx: 10,
    maximumFinalWaterTearPx: 12,
    maximumObservedTiltDeg: 8,
    maximumObservedVisibleTiltDeg: 8,
    maximumObservedUnobscuredTearPx: 10,
    maximumObservedUnobscuredWaterTearPx: 12,
    requireFogCoveredTileMovement: true
  },
  {
    id: "scandinavian-coast-full-repair",
    scenarioId: "diagnostic-chart-recovery-scandinavia",
    tiltDeg: 12,
    speedRatio: 0.25,
    durationSeconds: 40,
    deterministicTravelPx: 160,
    passiveOnly: false,
    allowDialogue: false,
    maximumFinalTiltDeg: 5,
    maximumFinalTearPx: 10,
    maximumFinalWaterTearPx: 12,
    maximumObservedTiltDeg: 18,
    maximumObservedVisibleTiltDeg: 21,
    maximumObservedUnobscuredTearPx: 10,
    maximumObservedUnobscuredWaterTearPx: 12,
    requireFogCoveredTileMovement: true
  },
  {
    id: "scotland-to-arctic-norway-coverage",
    scenarioId: "diagnostic-chart-coverage-norwegian-sea",
    tiltDeg: 0,
    speedRatio: 0.4,
    durationSeconds: 1,
    deterministicTravelPx: 240,
    passiveOnly: false,
    allowDialogue: false,
    maximumFinalTiltDeg: 5,
    maximumFinalTearPx: 10,
    maximumFinalWaterTearPx: 12,
    maximumObservedTiltDeg: 6,
    maximumObservedVisibleTiltDeg: 6,
    maximumObservedUnobscuredTearPx: 10,
    maximumObservedUnobscuredWaterTearPx: 12
  }
];
const cases = args.caseId === null
  ? allCases
  : allCases.filter((entry) => entry.id === args.caseId);
if (args.durationSeconds !== null) {
  for (const entry of cases) entry.durationSeconds = args.durationSeconds;
}
if (cases.length === 0) throw new Error(`Unknown chart diagnostic case: ${args.caseId}`);

try {
  await waitForServer(baseUrl, server);
  const browser = await launchCaptureBrowser({ headless: args.headless });
  const reports = [];
  try {
    for (const diagnosticCase of cases) {
      process.stdout.write(`Running ${diagnosticCase.id}...\n`);
      reports.push(await runDiagnosticCase(browser, baseUrl, diagnosticCase));
    }
  } finally {
    await browser.close();
  }

  const report = {
    measuredAt: new Date().toISOString(),
    baseUrl,
    headless: args.headless,
    cases: reports
  };
  await mkdir(path.dirname(args.output), { recursive: true });
  await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
  printReport(report, args.output);

  const failures = reports.flatMap((entry) => entry.failures.map((failure) => (
    `${entry.id}: ${failure}`
  )));
  if (failures.length > 0) {
    throw new Error(`Chart recovery diagnostic failed:\n${failures.join("\n")}`);
  }
} finally {
  if (server) server.kill("SIGTERM");
}

async function runDiagnosticCase(browser, baseUrl, diagnosticCase) {
  const page = await browser.newPage({ viewport: { width: 455, height: 256 } });
  const errors = [];
  collectCapturePageErrors(page, errors);
  const url = diagnosticUrl(baseUrl, diagnosticCase.scenarioId);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: args.timeoutMs });
    await page.waitForFunction(
      () => window.__PIXEL_GLOBE_CHART_RECOVERY_READY__ === true ||
        Boolean(window.__PIXEL_GLOBE_CAPTURE_ERROR__),
      null,
      { timeout: args.timeoutMs }
    );
    await throwPageError(page);
    const initial = await page.evaluate((options) => (
      window.__PIXEL_GLOBE_CHART_RECOVERY_TEST__.start(options)
    ), {
      tiltDeg: diagnosticCase.tiltDeg,
      speedRatio: diagnosticCase.speedRatio,
      passiveOnly: diagnosticCase.passiveOnly,
      allowDialogue: diagnosticCase.allowDialogue
    });
    const samples = [{ elapsedSeconds: 0, ...initial }];
    if (Number.isFinite(diagnosticCase.deterministicTravelPx)) {
      samples.push({
        elapsedSeconds: 0.1,
        ...await page.evaluate(({ distancePx, elapsedMs }) => (
          window.__PIXEL_GLOBE_CHART_RECOVERY_TEST__.advanceTravel(distancePx, elapsedMs)
        ), {
          distancePx: diagnosticCase.deterministicTravelPx,
          elapsedMs: diagnosticCase.durationSeconds * 1000
        })
      });
    }
    if (!Number.isFinite(diagnosticCase.deterministicTravelPx)) {
      const startedAt = performance.now();
      let nextSampleAt = startedAt + 1000;
      let requestedTravelPx = 0;
      while (performance.now() - startedAt < diagnosticCase.durationSeconds * 1000) {
        const waitMs = Math.max(1, nextSampleAt - performance.now());
        await page.waitForTimeout(waitMs);
        await throwPageError(page);
        const elapsedSeconds = (performance.now() - startedAt) / 1000;
        const targetTravelPx = Math.min(
          diagnosticCase.durationSeconds * initial.speedPxPerSecond,
          Math.floor(elapsedSeconds) * initial.speedPxPerSecond
        );
        const travelThisSamplePx = Math.max(0, targetTravelPx - requestedTravelPx);
        const sample = await page.evaluate(({ distancePx, elapsedMs }) => {
          const diagnostic = window.__PIXEL_GLOBE_CHART_RECOVERY_TEST__;
          if (diagnostic.snapshot().dialogueActive) diagnostic.advanceDialogue();
          return distancePx > 0
            ? diagnostic.advanceTravel(distancePx, elapsedMs)
            : diagnostic.snapshot();
        }, {
          distancePx: travelThisSamplePx,
          elapsedMs: travelThisSamplePx / initial.speedPxPerSecond * 1000
        });
        requestedTravelPx += travelThisSamplePx;
        samples.push({
          elapsedSeconds: Math.round(elapsedSeconds * 10) / 10,
          ...sample
        });
        nextSampleAt += 1000;
      }
    }
    await throwPageError(page);
    if (errors.length > 0) {
      throw new Error(`Browser errors:\n${errors.join("\n")}`);
    }
    const final = samples.at(-1);
    const failures = validateCase(diagnosticCase, samples);
    return {
      id: diagnosticCase.id,
      url,
      durationSeconds: diagnosticCase.durationSeconds,
      initial,
      final,
      minimumAbsoluteTiltDeg: Math.min(...samples.map((sample) => Math.abs(sample.fullTiltDeg))),
      maximumTearPx: Math.max(...samples.map((sample) => sample.tearPx)),
      maximumViewportEdgeGapPx: Math.max(...samples.map((sample) => sample.viewportEdgeGapPx)),
      maximumViewportInteriorGapPx: Math.max(
        ...samples.map((sample) => sample.viewportInteriorGapPx)
      ),
      samples,
      failures
    };
  } finally {
    await page.close();
  }
}

function validateCase(diagnosticCase, samples) {
  const initial = samples[0];
  const final = samples.at(-1);
  const failures = [];
  const maximumViewportEdgeGapPx = Math.max(...samples.map((sample) => (
    sample.viewportEdgeGapPx
  )));
  if (maximumViewportEdgeGapPx > 4) {
    failures.push(
      `left ${maximumViewportEdgeGapPx.toFixed(2)}px of an uncovered viewport edge`
    );
  }
  const maximumViewportInteriorGapPx = Math.max(...samples.map((sample) => (
    sample.viewportInteriorGapPx
  )));
  if (maximumViewportInteriorGapPx > 72) {
    failures.push(
      `left a ${maximumViewportInteriorGapPx.toFixed(2)}px interior terrain void`
    );
  }
  if (Math.abs(initial.fullTiltDeg) < diagnosticCase.tiltDeg * 0.7) {
    failures.push(
      `tilt injection produced only ${initial.fullTiltDeg.toFixed(2)} degrees`
    );
  }
  if (Math.abs(final.visibleTiltDeg) > diagnosticCase.maximumFinalTiltDeg) {
    failures.push(
      `finished at ${final.visibleTiltDeg.toFixed(2)} visible degrees; ` +
        `limit ${diagnosticCase.maximumFinalTiltDeg}`
    );
  }
  if (final.terrainTearPx > diagnosticCase.maximumFinalTearPx) {
    failures.push(
      `finished with ${final.terrainTearPx.toFixed(2)}px land/coast tear; ` +
        `limit ${diagnosticCase.maximumFinalTearPx}px`
    );
  }
  if (final.waterTearPx > diagnosticCase.maximumFinalWaterTearPx) {
    failures.push(
      `finished with ${final.waterTearPx.toFixed(2)}px water tear; ` +
        `limit ${diagnosticCase.maximumFinalWaterTearPx}px`
    );
  }
  const maximumObservedTiltDeg = Math.max(...samples.map((sample) => (
    Math.abs(sample.fullTiltDeg)
  )));
  if (
    Number.isFinite(diagnosticCase.maximumObservedTiltDeg) &&
    maximumObservedTiltDeg > diagnosticCase.maximumObservedTiltDeg
  ) {
    failures.push(
      `reached ${maximumObservedTiltDeg.toFixed(2)} degrees; ` +
        `peak limit ${diagnosticCase.maximumObservedTiltDeg}`
    );
  }
  const maximumObservedUnobscuredTearPx = Math.max(...samples.map((sample) => (
    sample.unobscuredTerrainTearPx
  )));
  if (
    Number.isFinite(diagnosticCase.maximumObservedUnobscuredTearPx) &&
    maximumObservedUnobscuredTearPx > diagnosticCase.maximumObservedUnobscuredTearPx
  ) {
    failures.push(
      `reached ${maximumObservedUnobscuredTearPx.toFixed(2)}px unobscured ` +
        `land/coast tear; ` +
        `peak limit ${diagnosticCase.maximumObservedUnobscuredTearPx}px`
    );
  }
  const maximumObservedUnobscuredWaterTearPx = Math.max(...samples.map((sample) => (
    sample.unobscuredWaterTearPx
  )));
  if (
    Number.isFinite(diagnosticCase.maximumObservedUnobscuredWaterTearPx) &&
    maximumObservedUnobscuredWaterTearPx >
      diagnosticCase.maximumObservedUnobscuredWaterTearPx
  ) {
    failures.push(
      `reached ${maximumObservedUnobscuredWaterTearPx.toFixed(2)}px unobscured ` +
        `water tear; peak limit ${diagnosticCase.maximumObservedUnobscuredWaterTearPx}px`
    );
  }
  const maximumObservedVisibleTiltDeg = Math.max(...samples.map((sample) => (
    Math.abs(sample.visibleTiltDeg)
  )));
  if (
    Number.isFinite(diagnosticCase.maximumObservedVisibleTiltDeg) &&
    maximumObservedVisibleTiltDeg > diagnosticCase.maximumObservedVisibleTiltDeg
  ) {
    failures.push(
      `reached ${maximumObservedVisibleTiltDeg.toFixed(2)} degrees unobscured; ` +
        `visible peak limit ${diagnosticCase.maximumObservedVisibleTiltDeg}`
    );
  }
  if (final.distanceTravelledPx < 80) {
    failures.push("ship did not travel far enough to exercise live tile admission");
  }
  if (final.integrityTelemetry.samplesObserved < 2) {
    failures.push("chart integrity telemetry did not observe the moving diagnostic");
  }
  const oversizedMoves = final.coveredTileMoves.filter((move) => (
    Math.abs(move.toX - move.fromX) > move.maximumStepPx ||
      Math.abs(move.toY - move.fromY) > move.maximumStepPx
  ));
  if (oversizedMoves.length > 0) {
    failures.push(`${oversizedMoves.length} covered tile moves exceeded their repair step`);
  }
  if (diagnosticCase.requireFogCoveredTileMovement) {
    const fogMoves = final.coveredTileMoves.filter((move) => move.reason.includes("fog"));
    if (fogMoves.length === 0) {
      failures.push("staged no fog-covered tile movement");
    }
    if (final.coveredTileApplications === 0) {
      failures.push("applied no covered tile movement to the live chart");
    }
  }
  if (diagnosticCase.requireOrdinaryAdmissionOnly) {
    const repairs = final.repairs;
    const assistedRepairs = repairs.swellRepairPasses +
      repairs.cloudBanksStarted +
      repairs.closingFogsStarted +
      repairs.heatHazesStarted +
      repairs.dialogueReframesStarted;
    if (assistedRepairs !== 0) {
      failures.push(`ordinary-admission case used ${assistedRepairs} assisted repairs`);
    }
  }
  if (final.exactReframes.length > 0) {
    failures.push(
      `used ${final.exactReframes.length} exact rebuild(s): ` +
        final.exactReframes.map((entry) => entry.reason).join(", ")
    );
  }
  return failures;
}

function diagnosticUrl(baseUrl, scenarioId) {
  const params = new URLSearchParams({
    capture: scenarioId,
    captureFormat: "steam",
    chartRecoveryTest: "1"
  });
  return `${baseUrl}/?${params}`;
}

async function throwPageError(page) {
  const message = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null);
  if (message) throw new Error(`Diagnostic runtime failure: ${message}`);
}

function printReport(report, output) {
  for (const entry of report.cases) {
    process.stdout.write(
      `${entry.id}: tilt ${entry.initial.fullTiltDeg.toFixed(2)} -> ` +
        `${entry.final.visibleTiltDeg.toFixed(2)} visible deg ` +
        `(${entry.final.fullTiltDeg.toFixed(2)} including concealed margin), ` +
        `tear ${entry.final.unobscuredTerrainTearPx.toFixed(2)}px land / ` +
        `${entry.final.unobscuredWaterTearPx.toFixed(2)}px water, ` +
        `void ${entry.maximumViewportInteriorGapPx.toFixed(2)}px, ` +
        `telemetry ${entry.final.integrityTelemetry.samplesObserved} samples / ` +
        `${entry.final.integrityTelemetry.incidentsDetected} incidents, ` +
        `position ${entry.final.latitudeDeg.toFixed(2)},${entry.final.longitudeDeg.toFixed(2)}, ` +
        `${entry.failures.length === 0 ? "PASS" : "FAIL"}\n`
    );
  }
  process.stdout.write(`Report: ${output}\n`);
}

function startServer(port) {
  return spawn(process.execPath, ["server.mjs"], {
    cwd: APP_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function waitForServer(baseUrl, activeServer) {
  const deadline = Date.now() + 30_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (activeServer && activeServer.exitCode !== null) {
      throw new Error(`Diagnostic server exited with code ${activeServer.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Diagnostic server did not start: ${lastError?.message || "timeout"}`);
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: null,
    port: 5195,
    headless: true,
    timeoutMs: 120_000,
    caseId: null,
    durationSeconds: null,
    output: path.join(APP_ROOT, "build/diagnostics/chart-recovery-latest.json")
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--base-url") {
      parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    } else if (arg === "--port") {
      parsed.port = positiveNumber(requiredValue(argv, ++index, arg), arg);
    } else if (arg === "--headed") {
      parsed.headless = false;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = positiveNumber(requiredValue(argv, ++index, arg), arg);
    } else if (arg === "--case") {
      parsed.caseId = requiredValue(argv, ++index, arg);
    } else if (arg === "--duration-seconds") {
      parsed.durationSeconds = positiveNumber(requiredValue(argv, ++index, arg), arg);
    } else if (arg === "--output") {
      parsed.output = path.resolve(APP_ROOT, requiredValue(argv, ++index, arg));
    } else {
      throw new Error(`Unknown chart diagnostic argument: ${arg}`);
    }
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function positiveNumber(raw, label) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} requires a positive number`);
  }
  return value;
}
