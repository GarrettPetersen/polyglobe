import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("opening the fully covered city resets north-up without a chart reframe wave", () => {
  const activation = functionSource("activatePortCityView", "resetWorldNorthUpBehindPortCityCover");
  assert.match(activation, /snapshot: capturePresentedFrame\(\)[\s\S]*resetWorldNorthUpBehindPortCityCover\(\)/);
  const reset = functionSource("resetWorldNorthUpBehindPortCityCover", "deactivatePortCityView");
  assert.match(reset, /cancelChartModalReframeTransition\(\)/);
  assert.match(reset, /reframeWorldNorthUp\("port city opened"\)/);
  assert.doesNotMatch(reset, /createChartModalReframeWave/);
});

test("city Escape activates Set Sail and the normal captain menu remains available", () => {
  const keys = functionSource("handlePortCityKeyDown", "beginPortCityPointer");
  assert.match(keys, /keyAction === KEY_ACTION\.CAPTAIN_MENU[\s\S]*openCaptainMenu\(\)/);
  assert.match(keys, /event\.key === "Escape"[\s\S]*PORT_CITY_LOCATION\.SET_SAIL/);
  const availability = functionSource("captainMenuButtonIsAvailable", "drawCaptainMenu");
  assert.match(availability, /dialogueActive: Boolean\(dialogueState\) && !portCityRootNavigationIsActive\(\)/);
  assert.match(MAIN_SOURCE, /if \(!dialogueVisible\) drawCaptainMenuButton\(\);/);
});

test("city rendering receives live weather and market modes use the compact header switch", () => {
  const cityDraw = functionSource("drawPortCityScene", "currentPortCityWeatherPresentation");
  assert.match(cityDraw, /portCityRuntime\.setWeather\(currentPortCityWeatherPresentation\(\)\)/);
  const dialogueDraw = functionSource("drawDialogueOverlayContent", "drawMarketModeSwitch");
  assert.match(dialogueDraw, /compactMarketSwitch = view\.presentation\?\.kind === "market"/);
  assert.match(dialogueDraw, /drawModeSwitches: !compactMarketSwitch/);
  assert.match(dialogueDraw, /compactMarketSwitch\) drawMarketModeSwitch/);
});

test("city rendering receives every live city name instead of retaining its baked label", () => {
  const synchronization = functionSource("synchronizePortCityScene", "beginPortCityIllicitCaughtPresentation");
  assert.match(synchronization, /const label = cityLabelText\(city\)/);
  assert.match(synchronization, /syncKey = JSON\.stringify\(\{[\s\S]*label,[\s\S]*\}\)/);
  assert.match(synchronization, /portCityRuntime\.selectCity\(city\.cityId, \{[\s\S]*label,[\s\S]*\}\)/);
});

test("city shipyards receive the authoritative current build for owned and ordinary yards", () => {
  const synchronization = functionSource("synchronizePortCityScene", "beginPortCityIllicitCaughtPresentation");
  assert.match(synchronization, /const shipyardConstruction = yard[\s\S]*shipyardCurrentBuild/);
  assert.match(synchronization, /syncKey = JSON\.stringify\(\{[\s\S]*shipyardConstruction[\s\S]*\}\)/);
  assert.match(
    synchronization,
    /portCityRuntime\.selectCity\(city\.cityId, \{[\s\S]*shipyardConstruction[\s\S]*\}\)/
  );
});

function functionSource(name, nextName) {
  const start = MAIN_SOURCE.indexOf(`function ${name}(`);
  const end = MAIN_SOURCE.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `Missing function ${name}`);
  assert.ok(end > start, `Missing function boundary ${nextName}`);
  return MAIN_SOURCE.slice(start, end);
}
