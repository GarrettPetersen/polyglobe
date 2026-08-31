import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("save read and restore failures use the standard crash report presentation", () => {
  const saveReadFailure = MAIN_SOURCE.match(
    /if \(localSaveResult\.status === "invalid"\) \{[\s\S]*?\n  \}/
  )?.[0];
  const saveRestoreFailure = MAIN_SOURCE.match(
    /async function continueSavedVoyage\(\) \{[\s\S]*?\n\}\n\nasync function restoreSavedVoyage/
  )?.[0];

  assert.ok(saveReadFailure, "save-read failure branch must remain explicit");
  assert.match(saveReadFailure, /drawFatalError\([\s\S]*telemetryCrashContext\("save-read"\)/);
  assert.ok(saveRestoreFailure, "save-restore handler must remain explicit");
  assert.match(saveRestoreFailure, /drawFatalError\([\s\S]*telemetryCrashContext\("save-restore"\)/);
});

test("fatal presentation freezes ordinary rendering and exposes crash details", () => {
  const runFrameOpening = MAIN_SOURCE.match(
    /function runFrame\([^)]*\) \{[\s\S]*?if \(pendingWorldAssetError\)/
  )?.[0];
  const fatalPresentation = MAIN_SOURCE.match(
    /function drawFatalError\([\s\S]*?\n\}\n\nasync function copyDisplayedCrashReport/
  )?.[0];

  assert.match(runFrameOpening, /if \(displayedCrashReport\) return;/);
  assert.match(fatalPresentation, /crashCopyButton\.hidden = false/);
  assert.match(fatalPresentation, /context: crashContext/);
});
