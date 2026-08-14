import assert from "node:assert/strict";
import test from "node:test";

import {
  DIAGNOSTIC_MODE_STORAGE_KEY,
  RUNTIME_ASSERTION_DIAGNOSTIC_COOLDOWN_MS,
  RuntimeDiagnosticAssertionError,
  handleRuntimeDiagnosticAssertion,
  isRuntimeDiagnosticAssertionError,
  loadDiagnosticMode,
  persistDiagnosticMode,
  reportRuntimeDiagnostic
} from "./diagnosticMode.js";

test("diagnostic mode is disabled for existing installations and persists independently of saves", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };

  assert.equal(loadDiagnosticMode(storage), false);
  assert.equal(persistDiagnosticMode(storage, true), true);
  assert.equal(values.get(DIAGNOSTIC_MODE_STORAGE_KEY), "true");
  assert.equal(loadDiagnosticMode(storage), true);
  assert.equal(persistDiagnosticMode(storage, false), false);
  assert.equal(loadDiagnosticMode(storage), false);
});

test("runtime assertions report once through the caller and stay silent outside diagnostic mode", () => {
  const reports = [];
  const result = handleRuntimeDiagnosticAssertion({
    message: "visible tile moved",
    diagnosticKey: "chart-visible-authority",
    diagnosticMode: false,
    report: (error, options) => reports.push({ error, options })
  });

  assert.equal(result, false);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].error.message, "visible tile moved");
  assert.deepEqual(reports[0].options, {
    key: "chart-visible-authority",
    cooldownMs: RUNTIME_ASSERTION_DIAGNOSTIC_COOLDOWN_MS
  });
});

test("runtime assertions remain loud in diagnostic mode", () => {
  let reported = false;
  assert.throws(() => handleRuntimeDiagnosticAssertion({
    message: "visible tile moved",
    diagnosticKey: "chart-visible-authority",
    diagnosticMode: true,
    report: () => {
      reported = true;
    }
  }), (error) => {
    assert.equal(isRuntimeDiagnosticAssertionError(error), true);
    assert.equal(error instanceof RuntimeDiagnosticAssertionError, true);
    assert.equal(error.diagnosticKey, "chart-visible-authority");
    return true;
  });
  assert.equal(reported, true);
});

test("recoverable diagnostics report without becoming blocking assertions", () => {
  const reports = [];
  const error = reportRuntimeDiagnostic(
    "chart repair could not cover the viewport",
    "chart-viewport-uncovered",
    (reportedError, options) => reports.push({ reportedError, options })
  );

  assert.equal(error.message, "chart repair could not cover the viewport");
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reportedError, error);
  assert.deepEqual(reports[0].options, {
    key: "chart-viewport-uncovered",
    cooldownMs: RUNTIME_ASSERTION_DIAGNOSTIC_COOLDOWN_MS
  });
});
