import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("opening the fully covered city resets north-up without a chart reframe wave", () => {
  const activation = functionSource("activatePortCityView", "resetWorldNorthUpBehindPortCityCover");
  assert.match(activation, /direction: "enter-pending"[\s\S]*queuePortCitySceneSync\(\)/);
  assert.doesNotMatch(activation, /resetWorldNorthUpBehindPortCityCover\(\)/);
  const synchronization = functionSource("synchronizePortCityScene", "beginPortCityIllicitCaughtPresentation");
  assert.match(
    synchronization,
    /portCityView\.sceneReady = true;[\s\S]*resetWorldNorthUpBehindPortCityCover\(\);[\s\S]*direction = "enter"/
  );
  const cover = functionSource("currentChartReframeCoverState", "activeOpaqueWorldCoverKinds");
  assert.match(cover, /portCityScene: portCityView\?\.sceneReady === true/);
  const reset = functionSource("resetWorldNorthUpBehindPortCityCover", "deactivatePortCityView");
  assert.match(reset, /cancelChartModalReframeTransition\(\)/);
  assert.match(reset, /reframeWorldNorthUp\("port city opened"\)/);
  assert.doesNotMatch(reset, /createChartModalReframeWave/);
});

test("city wipes stay on the renderer clock during deterministic capture", () => {
  const synchronization = functionSource("synchronizePortCityScene", "beginPortCityIllicitCaughtPresentation");
  const deactivation = functionSource("deactivatePortCityView", "queuePortCitySceneSync");
  assert.match(synchronization, /portCityTransition\.startedAtMs = lastFrameMs/);
  assert.match(deactivation, /startedAtMs: lastFrameMs/);
  assert.doesNotMatch(synchronization, /performance\.now/);
  assert.doesNotMatch(deactivation, /performance\.now/);
});

test("city wipes require the selected city's projected map coordinates", () => {
  const center = functionSource("portCityTransitionCenter", "capturePresentedFrame");
  assert.match(center, /requireCityId\(cityCall, "Port city transition"\)/);
  assert.match(center, /requires projected coordinates/);
  assert.match(center, /produced invalid screen coordinates/);
  assert.doesNotMatch(center, /SCREEN_W \/ 2|SCREEN_H \/ 2/);
});

test("city Escape activates Set Sail and the normal captain menu remains available", () => {
  const keys = functionSource("handlePortCityKeyDown", "beginPortCityPointer");
  assert.match(keys, /keyAction === KEY_ACTION\.CAPTAIN_MENU[\s\S]*openCaptainMenu\(\)/);
  assert.match(keys, /event\.key === "Escape"[\s\S]*PORT_CITY_LOCATION\.SET_SAIL/);
  const availability = functionSource("captainMenuButtonIsAvailable", "drawCaptainMenu");
  assert.match(availability, /dialogueActive: Boolean\(dialogueState\) && !portCityRootPresentationIsOwned\(\)/);
  assert.match(MAIN_SOURCE, /if \(!dialogueVisible\) drawCaptainMenuButton\(\);/);
});

test("pending city activation neither draws nor accepts input through the legacy port menu", () => {
  const cityOwnership = functionSource(
    "portCityRootPresentationIsOwned",
    "portCityTransitionCenter"
  );
  assert.match(cityOwnership, /portCityView &&[\s\S]*nodeId === "root"/);
  assert.doesNotMatch(cityOwnership, /sceneReady/);

  const draw = functionSource("drawWorldInterface", "minimapShouldBeVisible");
  assert.match(
    draw,
    /drawPortCityTransitionOverlay\(nowMs\);[\s\S]*portCityRootPresentationIsOwned\(\) && !portCityView\.sceneReady\) return;/
  );
  assert.match(draw, /dialogueActive: Boolean\(dialogueState\) && !portCityRootPresentationIsOwned\(\)/);

  const keys = functionSource("dispatchWorldOverlayKey", "dispatchWorldOverlayPointerDown");
  assert.match(keys, /portCityRootPresentationIsOwned\(\)[\s\S]*event\.preventDefault\(\)/);
  const pointers = functionSource("dispatchWorldOverlayPointerDown", "dispatchWorldOverlayPointerMove");
  assert.match(pointers, /portCityRootPresentationIsOwned\(\)[\s\S]*portCityPointerDown = null/);
});

test("pending city activation is not misreported as an opaque world cover", () => {
  const cover = functionSource("currentChartReframeCoverState", "activeOpaqueWorldCoverKinds");
  assert.match(cover, /const cityRootPresentationOwned = portCityRootPresentationIsOwned\(\)/);
  assert.match(cover, /fullPortDialogue:[\s\S]*!cityRootPresentationOwned/);
  assert.match(cover, /blockingDialogue:[\s\S]*!cityRootPresentationOwned/);
});

test("city rendering receives live weather and market modes use the compact header switch", () => {
  const cityDraw = functionSource("drawPortCityScene", "currentPortCityWeatherPresentation");
  assert.match(cityDraw, /portCityRuntime\.setWeather\(currentPortCityWeatherPresentation\(\)\)/);
  assert.ok(
    cityDraw.indexOf("worldRenderer.endFrame()") <
      cityDraw.indexOf("portCityRuntime.drawEmissiveOverlay(screenCtx, shakeOffset)"),
    "the GPU scene must be presented before the emissive city overlay"
  );
  const dialogueDraw = functionSource("drawDialogueOverlayContent", "drawMarketModeSwitch");
  assert.match(dialogueDraw, /compactMarketSwitch = view\.presentation\?\.kind === "market"/);
  assert.match(dialogueDraw, /drawModeSwitches: !compactMarketSwitch/);
  assert.match(dialogueDraw, /compactMarketSwitch\) drawMarketModeSwitch/);
});

test("city rendering receives every live city name instead of retaining its baked label", () => {
  const synchronization = functionSource("synchronizePortCityScene", "beginPortCityIllicitCaughtPresentation");
  assert.match(synchronization, /const city = currentPortCitySceneCity\(\)/);
  assert.doesNotMatch(synchronization, /chartPortCallById\(portCityView\.portId\)/);
  const currentCity = functionSource("currentPortCitySceneCity", "portCitySceneAssetOptions");
  assert.match(currentCity, /requireEntityById\(cityById, portCityView\.cityId, "Port city view"\)/);
  assert.match(currentCity, /pirateHideoutPortsByTileId\.get\(city\.tileId\)/);
  assert.match(synchronization, /const label = cityLabelText\(city\)/);
  assert.match(synchronization, /selectionOptions = Object\.freeze\(\{[\s\S]*label[\s\S]*\}\)/);
  assert.match(synchronization, /portCityRuntime\.selectCity\(city\.cityId, selectionOptions\)/);
});

test("city shipyards receive the authoritative current build for owned and ordinary yards", () => {
  const synchronization = functionSource("synchronizePortCityScene", "beginPortCityIllicitCaughtPresentation");
  assert.match(synchronization, /const shipyardConstruction = yard[\s\S]*shipyardCurrentBuild/);
  assert.match(synchronization, /return Object\.freeze\(\{[\s\S]*shipyardConstruction[\s\S]*\}\)/);
  assert.match(synchronization, /const assetOptions = portCitySceneAssetOptions\(city\)/);
  assert.match(synchronization, /portCityRuntime\.selectCity\(city\.cityId, selectionOptions\)/);
});

test("nearby ports preload the same strict asset selection consumed by activation", () => {
  const preloader = functionSource("preloadNearbyPortCityScene", "portCitySceneAssetPreloadKey");
  assert.match(preloader, /const options = portCitySceneAssetOptions\(cityCall\)/);
  assert.match(preloader, /portCityRuntime\.preloadCity\(candidate\.cityCall\.cityId, candidate\.options\)/);
  assert.match(preloader, /pendingWorldAssetError = new Error/);
  const identity = functionSource(
    "authoritativePlayerShipSlugForPortCity",
    "beginPortCityIllicitCaughtPresentation"
  );
  assert.match(identity, /runtimeShipSlug !== persistedShipSlug/);
  assert.match(identity, /player ship identity diverged/);
});

test("the paused-port benchmark establishes the same covered world frame as production", () => {
  const setup = functionSource("setupPerformanceBenchmark", "updatePerformanceBenchmark");
  assert.match(
    setup,
    /render\(performance\.now\(\), \{ allowColdCoveredWorldRender: true \}\);[\s\S]*openPortDialogue\(cityCall\)/
  );
});

test("landing after a successful bombardment preserves combat music for the assault", () => {
  const opening = functionSource("openPortDialogue", "withPortArrivalGossip");
  assert.match(opening, /continuingPortBombardmentThreat\(\{/);
  assert.match(opening, /if \(continuingBombardment\) \{[\s\S]*startCombatMusicForThreat/);
  assert.match(
    opening,
    /else \{[\s\S]*combatMusicUntilMs = 0;[\s\S]*setBackgroundMusicTrack\(musicTrackForCity/
  );
});

test("arrival recruitment defaults to leave and rejects a spilled purchase input", () => {
  const recruitment = functionSource("maybeOpenCrewRecruitmentArrival", "prepareCrewRecruitmentAt");
  assert.match(recruitment, /selectedIndex = offer\.candidates\.length/);
  assert.match(recruitment, /createArrivalRecruitmentActivationGuard/);
  const choice = functionSource("chooseDialogueOption", "applyDialogueOption");
  assert.match(choice, /dialogueActionBlockedByActivationGuard/);
  assert.match(choice, /if \([\s\S]*\) \{[\s\S]*return false/);
});

function functionSource(name, nextName) {
  const start = MAIN_SOURCE.indexOf(`function ${name}(`);
  const end = MAIN_SOURCE.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `Missing function ${name}`);
  assert.ok(end > start, `Missing function boundary ${nextName}`);
  return MAIN_SOURCE.slice(start, end);
}
