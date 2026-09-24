import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { createPresentationRecovery } from "./presentationRecovery.js";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const CITY_TEXT_SOURCE = readFileSync(new URL("../city-visualizer/cityPixelText.js", import.meta.url), "utf8");
const CITY_SOURCE = readFileSync(new URL("../city-visualizer/main.js", import.meta.url), "utf8");

test("presentation recovery reports and skips one widget outside diagnostic mode", () => {
  const reports = [];
  const recovery = createPresentationRecovery({
    isDiagnosticMode: () => false,
    report: (error, diagnosticKey) => reports.push({ message: error.message, diagnosticKey })
  });

  const result = recovery.present("survival-meters", () => {
    throw new Error("Survival meter icon is not loaded");
  });

  assert.equal(result.recovered, true);
  assert.equal(result.value, undefined);
  assert.deepEqual(reports, [{
    message: "Survival meter icon is not loaded",
    diagnosticKey: "survival-meters"
  }]);
  assert.equal(recovery.present("wind-indicator", () => "shown").value, "shown");
});

test("presentation recovery stays loud in diagnostic mode and still requires a reporter", () => {
  const recovery = createPresentationRecovery({
    isDiagnosticMode: () => true,
    report: () => {
      throw new Error("diagnostic mode must not report instead of throwing");
    }
  });
  assert.throws(
    () => recovery.present("survival-meters", () => {
      throw new Error("Survival meter icon is not loaded");
    }),
    /Survival meter icon is not loaded/
  );
  assert.throws(
    () => createPresentationRecovery({ isDiagnosticMode: () => false, report: null }),
    /requires a reporter/
  );
});

test("live sailing widgets and city labels recover without hiding a modal", () => {
  const worldInterface = functionSource(MAIN_SOURCE, "function drawWorldInterface(", "function drawLandmarkDiscoveryIndicators(");
  assert.match(worldInterface, /presentInterfaceWidget\("survival-meters"/);
  assert.match(worldInterface, /presentInterfaceWidget\("campaign-goal-arrow"/);
  assert.match(worldInterface, /if \(dialogueVisible\) \{[\s\S]*drawDialogueOverlay\(nowMs\)/);
  assert.doesNotMatch(worldInterface, /presentInterfaceWidget\("dialogue-overlay"/);
  assert.match(worldInterface, /if \(startMenu\) \{[\s\S]*drawStartMenu\(nowMs\)/);
  assert.doesNotMatch(worldInterface, /presentInterfaceWidget\("start-menu"/);

  const cityLabels = functionSource(CITY_SOURCE, "function drawSceneLabels(", "function drawCityNameLabel(");
  assert.match(cityLabels, /recoverCityPresentation\(error, "city-name-label"\)/);
  assert.match(cityLabels, /recoverCityPresentation\(error, "city-set-sail-label"\)/);
  assert.match(cityLabels, /drawSetSailControl\(\)/);
  assert.match(CITY_TEXT_SOURCE, /scratch\.fillStyle = "#ffffff"/);
  assert.match(CITY_TEXT_SOURCE, /globalCompositeOperation = "source-in"/);
  assert.match(CITY_TEXT_SOURCE, /reportPresentationFailure\(error, "city-pixel-text-empty-raster"\)/);
  assert.match(MAIN_SOURCE, /reportPresentationFailure: \(error, diagnosticKey\) => \{[\s\S]*city-pixel-text-empty-raster[\s\S]*reportRuntimeDiagnosticAssertion/);
});

function functionSource(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `${startMarker} source range`);
  return source.slice(start, end);
}
