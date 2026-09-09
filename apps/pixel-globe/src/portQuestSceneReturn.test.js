import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { assertPortRootScene, resolvePortDialogueContinuation } from "./portEntryFlow.js";
import { createPortDialogueSession } from "./dialogueSystem.js";
const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const entryCode = source.slice(source.indexOf("function ensurePortCityView("), source.indexOf("function activatePortCityView("));
function entryRuntime(runtime) {
  return Object.assign(runtime, {
    requireCityId: city => { assert.ok(city.cityId); return city.cityId; },
    assertPortRootScene, createPortDialogueSession,
    portCityView: runtime.portCityView ?? null,
    chartPortCallById: cityId => ({ cityId, spriteX: 1, spriteY: 2 }),
    activatePortCityView(city) { runtime.activations = (runtime.activations || 0) + 1; runtime.portCityView = { cityId: city.cityId }; },
    colonizationSiteIsRuined: () => false,
    clearPausedView() {}, queuePortCitySceneSync() {}, dialogueViewCache: {},
    stopShipForDialogue() {}, ensureDialoguePortraitLoaded() {}, createDialogueLayoutState: () => ({})
  });
}
const start = source.indexOf("function continuePortDialogueAfterQuestCharacter() {");
const end = source.indexOf("function continuePortDialogueAfterCampaign()", start);
for (const admitted of [false, true]) {
  test(`quest completion returns to an admitted city scene (previously admitted: ${admitted})`, () => {
    const city = { cityId: "bremen|germany" };
    let admissions = 0;
    const runtime = {
      dialogueState: { kind: "passenger", cityId: city.cityId, admittedToPort: admitted, nextPortNodeId: admitted ? "root" : "barred" },
      currentDialogueCity: () => city, currentPortArrivalGreetingPresented: () => true,
      portDialogueContext: () => ({ portEntryStatus: { allowed: true, hostile: false }, portRecoveryStatus: null,
        portAttackStatus: { commissioned: false }, portConquestStatus: { canAttempt: false, playerAssaultActive: false } }),
      resolvePortDialogueContinuation, createPortDialogueSession,
      admitPlayerToPort: () => { admissions++; return false; }, createDialogueLayoutState: () => ({}),
      ensureDialoguePortraitLoaded() {}, continuePortArrivalDialogues() {}
    };
    vm.runInNewContext(`${entryCode}\n${source.slice(start, end)}\ncontinuePortDialogueAfterQuestCharacter()`, entryRuntime(runtime));
    assert.equal(runtime.dialogueState.nodeId, "root");
    assert.equal(runtime.dialogueState.admittedToPort, true);
    assert.equal(admissions, admitted ? 0 : 1);
    assert.doesNotThrow(() => assertPortRootScene(runtime.dialogueState, { cityId: city.cityId }));
  });
}
test("legacy city-root escapes fail while scene loading and entry dialogues remain allowed", () => {
  const root = { kind: "port", nodeId: "root", cityId: "bremen|germany", admittedToPort: true };
  for (const scene of [null, { cityId: "london|united kingdom" }]) {
    assert.throws(() => assertPortRootScene(root, scene), /City root escaped the interactive scene/);
  }
  const scene = { cityId: root.cityId, sceneReady: false };
  assert.doesNotThrow(() => assertPortRootScene(root, scene));
  assert.throws(() => assertPortRootScene({ ...root, admittedToPort: false }, scene), /City root escaped/);
  assert.doesNotThrow(() => assertPortRootScene({ ...root, admittedToPort: false }, scene, { ruinedSite: true }));
  for (const nodeId of ["barred", "recovering", "greeting"]) {
    assert.doesNotThrow(() => assertPortRootScene({ ...root, nodeId, admittedToPort: false }, scene));
  }
});

test("opening a passenger dialogue establishes its city scene and preserves an existing landing", () => {
  const opening = source.slice(source.indexOf("function openPassengerDialogue("), start);
  for (const existing of [null, { cityId: "bremen|germany", arrivalGreetingPresented: true }]) {
    const runtime = entryRuntime({ gameState: {}, portCityView: existing, markPassengerOfferSeen() {},
      createWorldPassengerDialogueSession: (city, quest, options) => ({ kind: "passenger", cityId: city.cityId, ...options }) });
    vm.runInNewContext(`${entryCode}\n${opening}\nopenPassengerDialogue({ cityId: "bremen|germany" }, {})`, runtime);
    assert.equal(runtime.activations || 0, existing ? 0 : 1);
    assert.equal(runtime.portCityView.cityId, runtime.dialogueState.cityId);
    if (existing) assert.equal(runtime.portCityView, existing);
  }
});

for (const kind of ["port", "passenger", "rescued-traveler", "campaign-goal"]) {
  test(`${kind} entry owns scene, pause, layout and portrait preparation`, () => {
    const runtime = entryRuntime({});
    const calls = [];
    runtime.clearPausedView = () => calls.push("cache");
    runtime.createDialogueLayoutState = () => { calls.push("layout"); return {}; };
    runtime.stopShipForDialogue = () => calls.push("pause");
    runtime.ensureDialoguePortraitLoaded = () => calls.push("portrait");
    const api = vm.runInNewContext(`${entryCode}\n({openCityDialogue})`, runtime);
    const city = { cityId: "bremen|germany" };
    const session = { kind, cityId: city.cityId, nodeId: "root", admittedToPort: true };
    api.openCityDialogue(city, session);
    assert.equal(runtime.dialogueState, session);
    assert.deepEqual(calls, ["cache", "layout", "pause", "portrait"]);
    assert.equal(runtime.activations, 1);
    api.openCityDialogue(city, session);
    assert.equal(runtime.activations, 1);
    api.openCityDialogue({ cityId: "london|united kingdom" }, { ...session, cityId: "london|united kingdom" });
    assert.equal(runtime.activations, 2);
    assert.throws(() => api.openCityDialogue(city, { ...session, cityId: "wrong" }), /does not belong/);
    assert.equal(runtime.activations, 2);
  });
}

test("opening a scene does not grant city admission and missing projections fail", () => {
  const runtime = entryRuntime({});
  const api = vm.runInNewContext(`${entryCode}\n({openPortMenu})`, runtime);
  const city = { cityId: "bremen|germany" };
  api.openPortMenu(city, { initialNodeId: "barred", admittedToPort: false });
  assert.equal(runtime.dialogueState.admittedToPort, false);
  assert.throws(() => api.openPortMenu(city, { initialNodeId: "root", admittedToPort: false }), /City root escaped/);
  runtime.portCityView = null;
  runtime.chartPortCallById = () => null;
  assert.throws(() => api.openPortMenu(city, { initialNodeId: "barred" }), /without a projected port/);
});

test("runtime city constructors cannot bypass the shared entry lifecycle", () => {
  assert.doesNotMatch(source, /dialogueState\s*=\s*create(?:PortDialogueSession|PortArrivalDialogueSession|WorldPassengerDialogueSession|RescuedTravelerHomecomingSession)\(/);
  const directSceneCalls = [...source.matchAll(/(?<!function )\bactivatePortCityView\(/g)];
  assert.equal(directSceneCalls.length, 1, "Only ensurePortCityView may start a scene transition");
  const ensureStart = source.indexOf("function ensurePortCityView(");
  const ensureEnd = source.indexOf("function openCityDialogue(", ensureStart);
  assert.ok(directSceneCalls[0].index > ensureStart && directSceneCalls[0].index < ensureEnd);
});
