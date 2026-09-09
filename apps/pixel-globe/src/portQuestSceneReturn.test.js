import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { assertPortRootScene, resolvePortDialogueContinuation } from "./portEntryFlow.js";
import { createPortDialogueSession } from "./dialogueSystem.js";
const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
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
    vm.runInNewContext(`${source.slice(start, end)}\ncontinuePortDialogueAfterQuestCharacter()`, runtime);
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
    let activations = 0;
    const runtime = { gameState: {}, portCityView: existing, markPassengerOfferSeen() {},
      activatePortCityView(city) { activations++; runtime.portCityView = { cityId: city.cityId }; },
      createWorldPassengerDialogueSession: (city, quest, options) => ({ cityId: city.cityId, ...options }),
      createDialogueLayoutState: () => ({}), stopShipForDialogue() {}, ensureDialoguePortraitLoaded() {} };
    vm.runInNewContext(`${opening}\nopenPassengerDialogue({ cityId: "bremen|germany" }, {})`, runtime);
    assert.equal(activations, existing ? 0 : 1);
    assert.equal(runtime.portCityView.cityId, runtime.dialogueState.cityId);
    if (existing) assert.equal(runtime.portCityView, existing);
  }
});
