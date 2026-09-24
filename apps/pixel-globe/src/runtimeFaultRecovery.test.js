import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  createRuntimeFaultRecoveryState,
  recordRuntimeFault,
  recordRuntimeFrameSuccess,
  runtimeFaultSignature
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
