import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { localChartDistancePx } from "./localChartProximity.js";
import { colonizationTargetForCity } from "./colonialCities.js";
import {
  COLONIZATION_AFTERMATH_MISSING, colonizationQuestView,
  COLONIZATION_AFTERMATH_INVESTIGATING, COLONIZATION_STAGE_FAILED,
  ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX,
  createColonizationQuestMemory, assignColonizationQuest, completeColonizationFetchStage,
  beginColonizationExpedition, landColonists, advanceColonizationQuest,
  establishColony, advanceColonizationAftermaths, colonizationAftermathView,
  discoverableColonizationAftermath, colonizationAftermathReportPort,
  discoverColonizationAftermath
} from "./colonizationQuest.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function runtime(names, context) {
  runInNewContext(names.map(name => {
    const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.ok(declaration, `Missing runtime function: ${name}`);
    return declaration.getText(source);
  }).join("\n"), context);
  return context;
}

const LONDON = { cityId: "london|united kingdom", tileId: 11, city: "London",
  country: "United Kingdom", factionId: "england", lat: 51.51, lon: -0.13 };
const ROANOKE = { ...colonizationTargetForCity({ cityId: "roanoke|united states of america" }), tileId: 124 };
function landedColony() {
  const memory = createColonizationQuestMemory();
  assignColonizationQuest(memory, { target: ROANOKE, origin: LONDON });
  const state = { memory: { colonization: memory, quests: { cargoDeliveries: {} } }, cargo: {} };
  for (const stage of colonizationQuestView(state).history.fetchStages) completeColonizationFetchStage(memory, stage.id);
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  return memory;
}

function chartContext() {
  const context = {
    chart: {}, localLayout: { viewX: 100, viewY: 200 },
    targetPoint: { x: 100, y: 200 }, ship: { position: [-1, 0, 0] },
    tileCenterVector: () => [1, 0, 0], PIXELS_PER_RADIAN: 10000,
    dot3: (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0),
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    localChartDistancePx
  };
  context.localPointForGlobeVector = () => context.targetPoint;
  return context;
}

test("local proximity distinguishes absent targets, coincident points, and invalid coordinates", () => {
  assert.equal(localChartDistancePx(null, { x: 0, y: 0 }), null);
  assert.equal(localChartDistancePx({ x: 1, y: 2 }, { x: 1, y: 2 }), 0);
  assert.equal(localChartDistancePx({ x: 4, y: 6 }, { x: 1, y: 2 }), 5);
  for (const invalid of [undefined, {}, { x: Infinity, y: 0 }, { x: 0, y: NaN }]) {
    assert.throws(() => localChartDistancePx(invalid, { x: 0, y: 0 }), /finite local chart/);
    assert.throws(() => localChartDistancePx({ x: 0, y: 0 }, invalid), /finite local chart/);
  }
});

for (const outsideChart of [false, true]) {
  test(`colony departure follows the local chart (off-chart departure: ${outsideChart})`, () => {
    const memory = landedColony();
    const context = runtime(["playerLocalDistanceToGlobeVector", "updateColonizationQuest"], {
      ...chartContext(), gameState: { memory: { colonization: memory } }, weatherClockMinutes: 1100,
      COLONY_DEPARTURE_DISTANCE_PX: 90, COLONIZATION_STAGE_FAILED,
      advanceColonizationQuest, advanceColonizationAftermaths, colonizationTileIsVisible: () => false,
      syncColonizationWorldState() {}, colonizationQuestView: () => ({ target: ROANOKE }), saveVoyageNow() {}
    });
    context.localPointForGlobeVector = () => context.targetPoint;
    assert.equal(context.updateColonizationQuest(), false, "visibly at the colony despite distant globe position");
    assert.equal(memory.leftSinceFounding, false);
    context.ship.position = [1, 0, 0];
    context.targetPoint = outsideChart ? null : { x: 190, y: 200 };
    assert.equal(context.updateColonizationQuest(), true, "visibly departed despite a close globe position");
    assert.equal(memory.leftSinceFounding, true);
    assert.equal(context.updateColonizationQuest(), false, "departure is recorded once");
  });
}

test("uninitialized chart cannot invent colony departure or stop the resupply deadline", () => {
  const memory = landedColony();
  const context = runtime(["playerLocalDistanceToGlobeVector", "updateColonizationQuest"], {
    ...chartContext(), chart: null, localLayout: null,
    gameState: { memory: { colonization: memory } }, weatherClockMinutes: memory.resupplyDeadlineMinute + 1,
    COLONY_DEPARTURE_DISTANCE_PX: 90, COLONIZATION_STAGE_FAILED,
    advanceColonizationQuest, advanceColonizationAftermaths, colonizationTileIsVisible: () => false,
    syncColonizationWorldState() {}, colonizationQuestView: () => ({ target: ROANOKE }), saveVoyageNow() {}
  });
  assert.equal(context.updateColonizationQuest(), true);
  assert.equal(memory.stage, COLONIZATION_STAGE_FAILED);
  assert.equal(memory.leftSinceFounding, false);
});

test("restored missing Roanoke starts its investigation at the displayed site, once", () => {
  let memory = landedColony();
  advanceColonizationQuest(memory, 1100, { awayFromColony: true });
  establishColony(memory, 1200);
  const minute = memory.aftermath.dueMinute + 1;
  advanceColonizationAftermaths(memory, minute, { isTileVisible: () => false });
  memory = JSON.parse(JSON.stringify(memory));
  let saves = 0;
  const context = runtime(["playerLocalDistanceToGlobeVector", "maybeDiscoverMissingColonizationAftermath"], {
    ...chartContext(), gameState: { memory: { colonization: memory } },
    gameOverReason: null, dialogueState: null, captainAlertModal: null, portWaitState: null,
    COLONIZATION_AFTERMATH_MISSING, colonizationAftermathView,
    discoverableColonizationAftermath, colonizationAftermathReportPort, discoverColonizationAftermath,
    portCities: [LONDON], weatherClockMinutes: minute,
    syncColonizationWorldState() {}, saveVoyageNow: () => saves++
  });
  context.localPointForGlobeVector = () => context.targetPoint;
  context.ship.position = [1, 0, 0];
  context.targetPoint = { x: 101 + ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX, y: 200 };
  assert.equal(context.maybeDiscoverMissingColonizationAftermath(), false, "globe proximity cannot trigger a distant site");
  context.targetPoint = null;
  assert.equal(context.maybeDiscoverMissingColonizationAftermath(), false);
  context.ship.position = [-1, 0, 0];
  context.targetPoint = { x: 100 + ROANOKE_SPONTANEOUS_DISCOVERY_RADIUS_PX, y: 200 };
  assert.equal(context.maybeDiscoverMissingColonizationAftermath(), true);
  assert.equal(memory.aftermath.stage, COLONIZATION_AFTERMATH_INVESTIGATING);
  assert.equal(context.maybeDiscoverMissingColonizationAftermath(), false);
  assert.equal(saves, 1);
});

test("overboard rescue follows the swimmer's visible position without rescuing airborne or off-chart crew", () => {
  let rescued = 0;
  let drowned = 0;
  const entry = { id: "overboard-1", position: [1, 0, 0], ageSeconds: 0, flightSeconds: 1, remainingSeconds: 5, splashed: false };
  const context = runtime(["playerLocalDistanceToGlobeVector", "updateOverboardCrew"], {
    ...chartContext(), overboardCrew: [entry], OVERBOARD_RECOVERY_RADIUS_PX: 9,
    vectorArcDistance: (a, b) => Math.acos(a.reduce((sum, value, index) => sum + value * b[index], 0)),
    restoreSweptCrewMember: () => { rescued += 1; return true; },
    reportRuntimeDiagnosticAssertion() {},
    recordDrownedCrewMember: () => drowned++,
    playManOverboardSplashSound() {}, syncShipCargoFromGameState() {}, playCollectionDingSound() {},
    emitCaptureEvent() {}, showSurvivalNotice() {}, uiText: key => key, scheduleEventAutosave() {},
    playCrewDeathSound() {}, presentPendingNamedCrewDeathNotice() {}
  });
  context.localPointForGlobeVector = () => context.targetPoint;
  context.updateOverboardCrew(0.5);
  assert.equal(rescued, 0, "still airborne");
  context.ship.position = [1, 0, 0];
  context.targetPoint = { x: 110, y: 200 };
  context.updateOverboardCrew(1);
  assert.equal(rescued, 0, "ten visible pixels away is outside rescue reach despite globe overlap");
  context.targetPoint = null;
  context.updateOverboardCrew(1);
  assert.equal(rescued, 0);
  context.targetPoint = { x: 109, y: 200 };
  context.ship.position = [-1, 0, 0];
  context.updateOverboardCrew(1);
  assert.equal(rescued, 1);
  assert.equal(drowned, 0);
  context.updateOverboardCrew(1);
  assert.equal(rescued, 1);
  context.overboardCrew = [{ ...entry, id: "overboard-2", remainingSeconds: 0.5 }];
  context.targetPoint = null;
  context.updateOverboardCrew(1);
  assert.equal(drowned, 1, "off-chart swimmers still have a drowning deadline");
});
