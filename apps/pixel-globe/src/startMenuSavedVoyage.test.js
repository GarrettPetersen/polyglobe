import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const functions = ["prepareSavedVoyageForMenu", "continueSavedVoyage"].map(name => {
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  return declaration.getText(source);
}).join("\n");
function harness(restore = async () => ({ recoveredDerivedSystems: [], grandfatheredWorldwideDemo: false })) {
  const calls = [];
  const context = {
    startMenu: { isLoading: false, preparedVoyage: null },
    localSaveResult: { status: "ready", save: { payload: { id: "voyage" } } },
    hasStartedVoyage: false, dirty: false, gameState: {}, chart: {},
    restoreSavedVoyage: async payload => { calls.push("restore"); return restore(payload); },
    savedVoyageCrashContext: () => ({}),
    gameTelemetry: { recordVoyageStart: () => calls.push("start") },
    closeStartMenu: () => { context.startMenu = null; calls.push("close"); },
    revealMinimapFromChart: () => calls.push("reveal"), chartOffsetPixels: () => ({}),
    saveVoyageNow: () => calls.push("save"), showSurvivalNotice: () => calls.push("notice")
  };
  return { ...runInNewContext(`${functions}; ({ prepareSavedVoyageForMenu, continueSavedVoyage })`, context), context, calls };
}
test("saved menu preparation restores once without starting or saving; Continue reuses it", async () => {
  const h = harness();
  const menu = h.context.startMenu;
  await h.prepareSavedVoyageForMenu(menu);
  assert.equal(h.context.hasStartedVoyage, false);
  assert.equal(h.context.startMenu, menu);
  assert.deepEqual(h.calls, ["restore"]);
  await h.continueSavedVoyage();
  assert.deepEqual(h.calls, ["restore", "start", "close", "reveal", "save"]);
  assert.equal(h.context.hasStartedVoyage, true);
});
test("Continue restores normally without a prepared menu", async () => {
  const h = harness();
  await h.continueSavedVoyage();
  assert.deepEqual(h.calls, ["restore", "start", "close", "reveal", "save"]);
});
test("a replacement save or new menu cannot reuse another prepared world", async () => {
  const h = harness();
  await h.prepareSavedVoyageForMenu(h.context.startMenu);
  h.context.localSaveResult.save = { payload: { id: "replacement" } };
  await h.prepareSavedVoyageForMenu(h.context.startMenu);
  h.context.startMenu = { isLoading: false, preparedVoyage: null };
  await h.prepareSavedVoyageForMenu(h.context.startMenu);
  assert.deepEqual(h.calls, ["restore", "restore", "restore"]);
});
test("failed preparation preserves the save without caching a partial world", async () => {
  const error = new Error("Broken save invariant");
  const h = harness(async () => { throw error; });
  const saved = h.context.localSaveResult.save;
  await assert.rejects(h.prepareSavedVoyageForMenu(h.context.startMenu), error);
  assert.equal(h.context.localSaveResult.save, saved);
  assert.equal(h.context.startMenu.preparedVoyage, null);
  assert.equal(h.context.hasStartedVoyage, false);
});
test("preparation rejects a menu replaced during restoration", async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.prepareSavedVoyageForMenu(h.context.startMenu);
  h.context.startMenu = { preparedVoyage: null };
  finish({});
  await assert.rejects(pending, /changed during restoration/);
  assert.equal(h.context.startMenu.preparedVoyage, null);
});

test("mode exits discard city views, pending wipes and stale selection work without a departure animation", () => {
  const declaration = name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(source);
  for (const ready of [false, true]) for (const active of [false, true]) {
    const context = {
      portCityView: active ? { sceneReady: ready, centerX: 10, centerY: 20 } : null,
      portCityTransition: { direction: "exit" }, portCitySceneSyncKey: "old city",
      portCityPointerDown: {}, portCityIllicitEvent: {}, portCitySceneSelectionSerial: 4,
      worldFramePresented: true, dirty: false,
      capturePresentedFrame: () => assert.fail("mode changes must not show the old city over the restored voyage")
    };
    runInNewContext(`${declaration("deactivatePortCityView")}\ndeactivatePortCityView({ animate: false });`, context);
    for (const key of ["portCityView", "portCityTransition", "portCitySceneSyncKey", "portCityPointerDown", "portCityIllicitEvent"]) {
      assert.equal(context[key], null, key);
    }
    assert.equal(context.portCitySceneSelectionSerial, 5, "invalidate pending scene selections even without an active view");
    assert.equal(context.worldFramePresented, false);
  }
  for (const name of ["closeLakeBattleModeToStartMenu", "returnToStartMenuFromOptions", "restoreSavedVoyage"]) {
    assert.match(declaration(name), /deactivatePortCityView\(\{ animate: false \}\)/, `${name} must discard the previous mode's city`);
  }
});
