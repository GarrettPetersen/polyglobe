import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { runShipReplacement } from "./shipReplacementLifecycle.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function functions(names, runtime) {
  const code = names.map(name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source)).join("\n");
  return vm.runInNewContext(`${code}\n({${names.join(",")}})`, runtime);
}

test("ship replacement publishes a complete hull before presentation and saves once", async () => {
  const steps = [];
  const assets = {};
  const outcome = { crew: ["retained"] };
  const result = await runShipReplacement({ isCurrent: () => true,
    load: async () => { steps.push("load"); return assets; },
    commit: () => { steps.push("commit"); return outcome; },
    publish: value => { assert.equal(value, assets); steps.push("publish"); },
    present: value => { assert.equal(value, outcome); steps.push("present"); },
    save: () => steps.push("save") });
  assert.equal(result.status, "completed");
  assert.deepEqual(steps, ["load", "commit", "publish", "present", "save"]);
});

for (const change of ["dialogue", "voyage", "ship", "node", "listing"]) {
  test(`ship assets resolving after a changed ${change} cannot replace or save a ship`, async () => {
    let resolve;
    let eligible = true;
    const runtime = { runShipReplacement, gameState: {}, ship: { typeSlug: "galleon" },
      dialogueState: { nodeId: "confirmation" }, shipStatsForSlug: slug => ({ slug }),
      loadShipAssetSet: () => new Promise(done => { resolve = done; }),
      invalidateDistantWorldWorkerState: () => assert.fail("stale request mutated the world") };
    const api = functions(["performPlayerShipReplacement"], runtime);
    const result = api.performPlayerShipReplacement({ slug: "brigantine", session: runtime.dialogueState,
      stillCurrent: () => eligible, commit: () => assert.fail("stale commit"), present() {}, saveReason: "test" });
    if (change === "dialogue") runtime.dialogueState = { nodeId: "confirmation" };
    if (change === "voyage") runtime.gameState = {};
    if (change === "ship") runtime.ship = { typeSlug: "galleon" };
    if (change === "node") runtime.dialogueState.nodeId = "root";
    if (change === "listing") eligible = false;
    resolve({});
    assert.equal((await result).status, "cancelled");
  });
}

test("replacement failures propagate and never continue to publication or saving", async () => {
  for (const phase of ["load", "commit", "publish", "present", "save"]) {
    const calls = [];
    const failure = new Error(phase);
    const ops = Object.fromEntries(["load", "commit", "publish", "present", "save"].map(name => [name, () => {
      calls.push(name); if (name === phase) throw failure; return {};
    }]));
    await assert.rejects(runShipReplacement({ isCurrent: () => true, ...ops }), error => error === failure);
    assert.equal(calls.at(-1), phase);
  }
});

for (const movement of ["stop", "resume", "unchanged"]) {
  test(`dialogue entry uses explicit ${movement} movement semantics`, () => {
    const calls = [];
    const session = { kind: "ship" };
    const runtime = { dialogueViewCache: {}, clearPausedView: () => calls.push("cache"),
      createDialogueLayoutState: () => ({ scrollOffset: 0 }), stopShipForDialogue: () => calls.push("stop"),
      pauseShipForOverlay: () => calls.push("resume"), ensureDialoguePortraitLoaded: () => calls.push("portrait") };
    const api = functions(["activateDialogueSession"], runtime);
    api.activateDialogueSession(session, { movement });
    assert.equal(runtime.dialogueState, session);
    assert.deepEqual(calls, movement === "unchanged" ? ["cache", "portrait"] : ["cache", movement, "portrait"]);
    assert.equal(runtime.dialogueLayout.scrollOffset, 0);
    assert.throws(() => api.activateDialogueSession({}, { movement: "invalid" }), /requires a session/);
    assert.throws(() => api.activateDialogueSession(session, { movement: "invalid" }), /Unknown dialogue movement/);
  });
}

test("every notebook page switch closes all old pages and clears input while retaining its parent", () => {
  const names = ["ShipInfo", "Credits", "PastVoyages", "Options", "Discoveries", "Achievements", "Politics", "Navigation", "Aboard"];
  const ids = ["ship", "credits", "voyages", "options", "discoveries", "achievements", "politics", "navigation", "crew", null];
  for (const oldPage of names) for (const next of ids) {
    const pages = Object.fromEntries(names.map(name => [name, { open: name === oldPage, cache: {}, dismissals: name === "Aboard" && oldPage === "Aboard" ? 1 : 0 }]));
    let savedDismissals = 0, clears = 0;
    const runtime = { captainMenu: { isOpen: true }, keys: { clear: () => clears++ }, clearPointerSteering: () => clears++ };
    for (const name of names) runtime[`close${name}Menu`] = () => {
      const page = pages[name]; if (page.open) savedDismissals += page.dismissals;
      page.open = false; page.cache = null; page.dismissals = 0;
    };
    const api = functions(["switchNotebookPage"], runtime);
    api.switchNotebookPage(next);
    assert.ok(Object.values(pages).every(page => !page.open && page.cache === null));
    assert.equal(savedDismissals, oldPage === "Aboard" ? 1 : 0);
    assert.equal(clears, 2);
    assert.equal(runtime.captainMenu.isOpen, true);
    assert.throws(() => api.switchNotebookPage("invented"), /Unknown notebook page/);
    assert.equal(clears, 2);
  }
});

test("runtime replacement owns worker synchronization, hull publication and persistence", async () => {
  const calls = [];
  const runtime = { runShipReplacement, gameState: { ship: { slug: "galleon" } }, ship: { typeSlug: "galleon" },
    dialogueState: { nodeId: "confirm" }, shipStatsForSlug: slug => ({ slug }),
    loadShipAssetSet: async () => ({}), invalidateDistantWorldWorkerState: () => calls.push("invalidate"),
    resetDistantWorldWorkerSchedule: () => calls.push("worker"),
    applyPlayerShipType: slug => { calls.push("hull"); runtime.ship.typeSlug = slug; },
    syncShipCargoFromGameState: () => calls.push("cargo"), playShipHandoverSound: () => calls.push("sound"),
    saveVoyageNow: reason => { assert.equal(reason, "purchase"); calls.push("save"); } };
  const api = functions(["performPlayerShipReplacement"], runtime);
  const result = await api.performPlayerShipReplacement({ slug: "brigantine", session: runtime.dialogueState, saveReason: "purchase",
    commit: stats => { calls.push("commit"); runtime.gameState.ship.slug = stats.slug; }, present: () => calls.push("present") });
  assert.equal(result.status, "completed");
  assert.deepEqual(calls, ["invalidate", "commit", "worker", "hull", "cargo", "sound", "present", "save"]);
});

test("replacement rejects an asynchronous publication instead of saving a partial hull", async () => {
  await assert.rejects(runShipReplacement({ isCurrent: () => true, load: async () => ({}), commit() {},
    publish: async () => {}, present: () => assert.fail("presentation ran before publication"),
    save: () => assert.fail("saved a partial publication") }), /publish must be synchronous/);
});

test("replacement, dialogue and notebook callers use their shared entry operations", () => {
  const text = name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source);
  for (const name of ["purchaseShipyardShip", "acquireVikingLongship", "captureSurrenderedShip"]) {
    assert.match(text(name), /performPlayerShipReplacement\(/);
    assert.doesNotMatch(text(name), /loadShipAssetSet\(|applyPlayerShipType\(|syncShipCargoFromGameState\(|saveVoyageNow\(/);
  }
  for (const name of ["openShipDialogue", "updateSoundDues", "openShoreBatteryCombatHail", "openDamageSurrenderDecision", "openSurrenderPrizeDecision"]) {
    assert.match(text(name), /activateDialogueSession\(/);
    assert.doesNotMatch(text(name), /dialogueLayout = createDialogueLayoutState\(/);
  }
  for (const name of ["openShipInfoMenu", "openCreditsMenu", "openPastVoyagesMenu", "openOptionsMenu", "openDiscoveriesMenu", "openAchievementsMenu", "openPoliticsMenu", "openNavigationMenu", "openAboardMenu", "openCaptainMenu"]) {
    assert.match(text(name), /switchNotebookPage\(/);
    assert.doesNotMatch(text(name), /keys\.clear\(|clearPointerSteering\(/);
  }
});
