import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const functions = ["saveAndQuitDesktop", "waitForVoyagePersistence", "flushVoyageSaveWrites", "startLocalSaveWrite", "closeOptionsMenu"].map(name =>
  source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(source)).join("\n");
function harness(overrides = {}) {
  const calls = [];
  const context = {
    steamPlatformBridge: { quitGame: async () => calls.push("quit") }, desktopExitPending: false,
    setTimeout, clearTimeout,
    optionsMenu: { isOpen: true }, dirty: false, startMenu: null, lakeBattleMode: null,
    hasStartedVoyage: true, gameOverReason: null, ship: { hitPoints: 100 },
    saveVoyageNow: (_reason, options) => { assert.equal(options.includeWorldTraffic, true); calls.push("save"); return true; },
    localSaveWriteCompletion: null, savePersistenceWarning: null,
    flushPlatformCloudSaves: async () => calls.push("cloud"), uiText: key => key,
    gameTelemetry: { captureCrash: error => calls.push(error.message) }, telemetryCrashContext: () => ({}), ...overrides
  };
  return { calls, context, ...runInNewContext(`${functions}; ({saveAndQuitDesktop, closeOptionsMenu, waitForVoyagePersistence, startLocalSaveWrite})`, context) };
}

test("Save and quit waits for asynchronous local saves and cloud upload; repeated clicks cannot quit early", async () => {
  let finish;
  const h = harness();
  h.context.localSaveWriteCompletion = new Promise(resolve => { finish = () => { h.context.localSaveWriteCompletion = null; resolve(); }; });
  const quitting = h.saveAndQuitDesktop();
  assert.deepEqual(h.calls, ["save"]);
  assert.equal(await h.saveAndQuitDesktop(), false);
  h.closeOptionsMenu();
  assert.equal(h.context.optionsMenu.isOpen, true);
  finish();
  assert.equal(await quitting, true);
  assert.deepEqual(h.calls, ["save", "cloud", "quit"]);
});

test("failed local or cloud writes keep the game open with retry feedback", async () => {
  for (const overrides of [
    { saveVoyageNow: () => false },
    { savePersistenceWarning: { error: new Error("disk full") } },
    { flushPlatformCloudSaves: async () => { throw new Error("cloud unavailable"); } }
  ]) {
    const h = harness(overrides);
    assert.equal(await h.saveAndQuitDesktop(), false);
    assert.ok(!h.calls.includes("quit"));
    assert.equal(h.context.optionsMenu.returnError, "options.saveQuitFailed");
    assert.equal(h.context.desktopExitPending, false);
    assert.equal(h.context.optionsMenu.isOpen, true);
  }
});

test("quitting from duels, death, or the title screen never overwrites the campaign", async () => {
  for (const overrides of [{ lakeBattleMode: {} }, { startMenu: {} }, { gameOverReason: "sunk" }, { hasStartedVoyage: false }]) {
    const h = harness(overrides);
    assert.equal(await h.saveAndQuitDesktop(), true);
    assert.deepEqual(h.calls, ["cloud", "quit"]);
  }
});

test("browser cannot execute desktop quit", async () => {
  await assert.rejects(harness({ steamPlatformBridge: null }).saveAndQuitDesktop(), /requires a desktop platform/);
});

test("an unresponsive save does not trap the player in the quit flow forever", async () => {
  const h = harness({ localSaveWriteCompletion: new Promise(() => {}) });
  await assert.rejects(h.waitForVoyagePersistence(1), /game remains open/);
  assert.ok(!h.calls.includes("quit"));
});

test("quit drains a pending checkpoint after the currently active compression write", async () => {
  const releases = [];
  const completed = [];
  const h = harness({ localSaveWriteActive: false, pendingLocalSaveWrite: null,
    localSaveAbortController: new AbortController(),
    writeLocalSaveWithRecoveryAsync: payload => new Promise(resolve => releases.push(() => resolve(payload))),
    completeLocalSaveWrite: result => completed.push(result.id), failLocalSaveWrite: error => { throw error; }
  });
  h.startLocalSaveWrite({ payload: { id: "autosave" }, snapshotErrors: [] });
  h.context.pendingLocalSaveWrite = { payload: { id: "quit-checkpoint" }, snapshotErrors: [] };
  const quitting = h.saveAndQuitDesktop();
  releases[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(completed, ["autosave"]);
  assert.deepEqual(h.calls, ["save"]);
  assert.equal(h.context.localSaveWriteActive, true);
  releases[1]();
  assert.equal(await quitting, true);
  assert.deepEqual(completed, ["autosave", "quit-checkpoint"]);
  assert.deepEqual(h.calls, ["save", "cloud", "quit"]);
});
