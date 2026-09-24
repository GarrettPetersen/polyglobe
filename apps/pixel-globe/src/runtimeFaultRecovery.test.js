import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  consumeSkipAutomaticSavePreparation,
  createRuntimeFaultRecoveryState,
  recordRuntimeFault,
  recordRuntimeFrameSuccess,
  requestSkipAutomaticSavePreparation,
  runtimeFaultSignature,
  shouldSkipAutomaticSavePreparation
} from "./runtimeFaultRecovery.js";

test("one runtime fault retries the frame while a tight repeat returns to the saved title", () => {
  const state = createRuntimeFaultRecoveryState();
  const error = new Error("Broken presentation invariant");
  assert.equal(recordRuntimeFault(state, error, 1_000).action, "retry-frame");
  assert.equal(recordRuntimeFault(state, error, 1_100).action, "reload-title");
});

test("a successful frame clears the repeated-fault circuit breaker", () => {
  const state = createRuntimeFaultRecoveryState();
  const error = new Error("Transient renderer assertion");
  recordRuntimeFault(state, error, 1_000);
  recordRuntimeFrameSuccess(state);
  assert.equal(recordRuntimeFault(state, error, 1_100).action, "retry-frame");
});

test("runtime fault signatures are stable, bounded, and distinguish call sites", () => {
  const first = new Error("Invalid ship state");
  first.stack = "Error: Invalid ship state\n    at drawShip (main.js:10:2)";
  const second = new Error("Invalid ship state");
  second.stack = "Error: Invalid ship state\n    at drawPort (main.js:20:2)";
  assert.match(runtimeFaultSignature(first), /^[0-9a-f]{8}$/);
  assert.equal(runtimeFaultSignature(first), runtimeFaultSignature(first));
  assert.notEqual(runtimeFaultSignature(first), runtimeFaultSignature(second));
});

test("save preparation recovery is a one-shot session request", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  assert.equal(consumeSkipAutomaticSavePreparation(storage), false);
  requestSkipAutomaticSavePreparation(storage);
  assert.equal(shouldSkipAutomaticSavePreparation(storage), true);
  assert.equal(shouldSkipAutomaticSavePreparation(storage), true, "reading must retain the request until recovery succeeds");
  assert.equal(consumeSkipAutomaticSavePreparation(storage), true);
  assert.equal(consumeSkipAutomaticSavePreparation(storage), false);
  assert.throws(() => requestSkipAutomaticSavePreparation(null), /requires session storage/);
  assert.throws(() => consumeSkipAutomaticSavePreparation({}), /requires session storage/);
  assert.throws(() => shouldSkipAutomaticSavePreparation(null), /requires session storage/);
});

test("the release frame loop recovers before its developer fatal-error path", async () => {
  const source = await readFile(new URL("./main.js", import.meta.url), "utf8");
  const loop = source.slice(source.indexOf("function loop(nowMs)"), source.indexOf("function captureAutomationFailure"));
  assert.match(loop, /!diagnosticModeEnabled[\s\S]*recoverRuntimeLoopFault\(error, nowMs\)[\s\S]*return;/);
  assert.ok(loop.indexOf("recoverRuntimeLoopFault(error, nowMs)") < loop.indexOf("drawFatalError(error"));
  assert.match(source, /incident\.action === "retry-frame"[\s\S]*requestAnimationFrame\(loop\)/);
  assert.match(source, /incident\.action === "reload-title"|window\.location\.reload\(\)/);
  assert.match(source, /addEventListener\("error"[\s\S]*captureUnhandledRuntimeFault/);
  assert.match(source, /addEventListener\("unhandledrejection"[\s\S]*captureUnhandledRuntimeFault/);
});

test("every release error boundary reports and recovers without exposing the developer crash screen", async () => {
  const source = await readFile(new URL("./main.js", import.meta.url), "utf8");
  const globalHandlers = source.slice(
    source.indexOf('window.addEventListener("error"'),
    source.indexOf("steamPlatformBridge?.onPauseRequested")
  );
  assert.match(globalHandlers, /captureUnhandledRuntimeFault[\s\S]*event\.preventDefault\(\)/);
  assert.equal((globalHandlers.match(/event\.preventDefault\(\)/g) || []).length, 2);

  const recovery = source.slice(
    source.indexOf("function captureUnhandledRuntimeFault("),
    source.indexOf("function captureAutomationFailure(")
  );
  assert.match(recovery, /captureRecoverableRuntimeDiagnostic[\s\S]*scheduleRuntimeTitleRecovery/);

  const fatal = source.slice(
    source.indexOf("function drawFatalError("),
    source.indexOf("async function copyDisplayedCrashReport(")
  );
  assert.match(fatal, /!diagnosticModeEnabled[\s\S]*captureRecoverableRuntimeDiagnostic[\s\S]*(?:scheduleRuntimeTitleRecovery|reportStartupFailure)/);
  assert.ok(fatal.indexOf("captureRecoverableRuntimeDiagnostic") < fatal.indexOf("drawDeveloperFatalError"));
  assert.equal((source.match(/drawDeveloperFatalError\(/g) || []).length, 2,
    "Developer crash renderer must only have its definition and guarded call");
  assert.match(source, /gameTelemetry\.consentStatus !== TELEMETRY_CONSENT_GRANTED[\s\S]*consumeStartupDiagnostic/);
  assert.match(source, /resolveTelemetryConsent\(granted\)[\s\S]*if \(granted\) reportPriorStartupDiagnostic\(\)/);
  assert.match(source, /localSaveResult\.status === "ready" &&[\s\S]*!skipAutomaticSavePreparation/);
  assert.match(source, /recoverSavedVoyageFailure[\s\S]*requestSkipAutomaticSavePreparation[\s\S]*scheduleRuntimeTitleRecovery/);
  assert.match(source, /localSaveResult\.status === "invalid"[\s\S]*save-read-recovered/);
});
