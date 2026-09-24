import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createWorldMutationBoundary } from "./runtimeTransitions.js";
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
    runtime.runPlayerWorldMutation = createWorldMutationBoundary(runtime.invalidateDistantWorldWorkerState);
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

test("ship dialogue closes before rendering when its transient target leaves visibility", () => {
  for (const missing of ["visual", "strategic"]) {
    const calls = [];
    const shipId = "atlantic-coast-4";
    const runtime = {
      dialogueState: { kind: "ship", npcShipId: shipId },
      npcSeaRoutes: { shipById: new Map([[shipId, {}]]) },
      npcVisualShips: new Map([[shipId, {}]]),
      releaseDialogueSession: (options) => {
        calls.push(["release", options]);
        runtime.dialogueState = null;
      },
      resumeShipAfterOverlayIfReady: () => calls.push(["resume"])
    };
    if (missing === "visual") runtime.npcVisualShips.delete(shipId);
    else runtime.npcSeaRoutes.shipById.delete(shipId);
    const api = functions(["reconcileActiveShipDialogueTarget"], runtime);
    assert.equal(api.reconcileActiveShipDialogueTarget(), true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0][0], "release");
    assert.equal(calls[0][1].destination, "sailing");
    assert.equal(calls[1][0], "resume");
  }
});

test("ship dialogue target reconciliation preserves valid and unrelated sessions", () => {
  const shipId = "atlantic-coast-4";
  for (const dialogueState of [
    { kind: "ship", npcShipId: shipId },
    { kind: "port", cityId: "lisbon|portugal" },
    null
  ]) {
    const runtime = {
      dialogueState,
      npcSeaRoutes: { shipById: new Map([[shipId, {}]]) },
      npcVisualShips: new Map([[shipId, {}]]),
      releaseDialogueSession: () => assert.fail("valid dialogue was released"),
      resumeShipAfterOverlayIfReady: () => assert.fail("valid dialogue resumed sailing")
    };
    const api = functions(["reconcileActiveShipDialogueTarget"], runtime);
    assert.equal(api.reconcileActiveShipDialogueTarget(), false);
  }
});

test("a stale NPC visual cannot advertise a hail action", () => {
  const shipId = "atlantic-coast-10";
  const state = { id: shipId, x: 4, y: 3, combatGrace: false };
  const runtime = {
    localLayout: { viewX: 0, viewY: 0 },
    NPC_HAIL_RADIUS_PX: 10,
    distance2: (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2,
    npcSeaRoutes: { shipById: new Map([[shipId, {}]]) }
  };
  const api = functions(["npcShipInHailRange", "npcShipCanBeHailed"], runtime);

  assert.equal(api.npcShipCanBeHailed(state), true);
  runtime.npcSeaRoutes.shipById.delete(shipId);
  assert.equal(api.npcShipCanBeHailed(state), false, "retired strategic ship remains in the visual index");
});

test("every ship interaction entrance uses the complete hail eligibility policy", () => {
  const text = name => source.statements.find(
    node => ts.isFunctionDeclaration(node) && node.name.text === name
  ).getText(source);
  for (const name of ["activeNpcShipCalls", "worldInteractionTargetAtPoint", "interactionTargetIsUsable"]) {
    assert.match(text(name), /npcShipCanBeHailed\(/);
  }
  assert.doesNotMatch(text("worldInteractionTargetAtPoint"), /npcShipInHailRange\(/);
});

test("the hail boundary recovers and reports if a transient NPC retires before activation", () => {
  const diagnostics = [];
  const runtime = {
    gameTelemetry: { captureDiagnostic: (...args) => diagnostics.push(args) },
    telemetryCrashContext: screen => ({ screen }),
    STALE_NPC_HAIL_DIAGNOSTIC_COOLDOWN_MS: 30 * 86_400_000
  };
  const api = functions(["recoverStaleNpcHailTarget"], runtime);
  assert.equal(api.recoverStaleNpcHailTarget("atlantic-coast-10", {
    strategicShip: null,
    visualShip: {}
  }), false);
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0][0].message, /atlantic-coast-10.*strategic ship/);
  assert.equal(diagnostics[0][1].screen, "ship-hail-recovered");
  assert.equal(diagnostics[0][2].key, "stale-npc-hail-target");
  assert.equal(diagnostics[0][2].cooldownMs, 30 * 86_400_000);

  const openText = source.statements.find(
    node => ts.isFunctionDeclaration(node) && node.name.text === "openShipDialogue"
  ).getText(source);
  assert.match(openText, /return recoverStaleNpcHailTarget/);
  assert.doesNotMatch(openText, /Cannot hail missing NPC ship/);
});

test("gold treasure completion waits for an occupied character-alert slot", () => {
  let alertSlotAvailable = false;
  let openAttempts = 0;
  let resumes = 0;
  const runtime = {
    goldTreasureSequence: null,
    itemAcquisitionEffects: [],
    dirty: false,
    ITEM_ARRIVAL_SOUND_COIN_CLINK: "coin",
    ITEM_ARRIVAL_SOUND_QUEST_DELIVERY: "quest",
    ITEM_ARRIVAL_SOUND_DISCOVERY_SUCCESS: "discovery",
    itemAcquisitionEffectComplete: () => true,
    playCoinClinkSound() {},
    playCollectionDingSound() {},
    playDiscoverySuccessSound() {},
    openCaptainAlertModal: () => {
      openAttempts++;
      return alertSlotAvailable;
    },
    resumeShipAfterOverlayIfReady: () => resumes++
  };
  const api = functions(["updateItemAcquisitionEffects"], runtime);
  runtime.goldTreasureSequence = { completeAtMs: 10, captainMessage: "The gold is aboard." };

  assert.equal(api.updateItemAcquisitionEffects(10), false);
  assert.deepEqual(runtime.goldTreasureSequence, {
    completeAtMs: 10,
    captainMessage: "The gold is aboard."
  });
  assert.equal(openAttempts, 1);
  assert.equal(resumes, 0);

  alertSlotAvailable = true;
  assert.equal(api.updateItemAcquisitionEffects(11), true);
  assert.equal(runtime.goldTreasureSequence, null);
  assert.equal(openAttempts, 2);
  assert.equal(resumes, 0, "the newly opened alert retains overlay ownership");
});

test("a full hold defers gold treasure dialogue through the normal sequence lifecycle", () => {
  let pauses = 0;
  const runtime = {
    goldTreasureSequence: null,
    itemAcquisitionEffects: [],
    dirty: false,
    pauseShipForOverlay: () => pauses++
  };
  const api = functions(["startGoldTreasureSequence"], runtime);
  assert.equal(api.startGoldTreasureSequence({
    sourcePoint: { x: 4, y: 8 },
    cargoReward: { good: { id: "gold" }, quantity: 0 },
    captainMessage: "The hold is full.",
    nowMs: 25
  }), true);
  assert.equal(runtime.goldTreasureSequence.completeAtMs, 25);
  assert.equal(runtime.goldTreasureSequence.captainMessage, "The hold is full.");
  assert.equal(pauses, 1);
  assert.equal(runtime.dirty, true);
});

test("whale simulation waits when an overlay opens earlier in the same frame", () => {
  for (const overlay of ["dialogue", "captain-alert", "port-assault", "menu"]) {
    const runtime = {
      gameState: { memory: { whales: {} } },
      chart: {},
      localLayout: {},
      dialogueState: overlay === "dialogue" ? {} : null,
      captainAlertModal: overlay === "captain-alert" ? {} : null,
      portAssaultState: overlay === "port-assault" ? {} : null,
      menusAreOpen: () => overlay === "menu"
    };
    const api = functions(["updateWhales"], runtime);
    assert.equal(api.updateWhales(1, 100), false, overlay);
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
  runtime.runPlayerWorldMutation = createWorldMutationBoundary(runtime.invalidateDistantWorldWorkerState);
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
  assert.match(text("captureSurrenderedShip"), /restoreFailedSurrenderedShipCapture|recoverCaptureFailure/);
  assert.match(text("captureSurrenderedShip"), /assertSurrenderedNpcPrizeReadyForCapture/);
  assert.match(text("navigateBackFromDialogue"), /dialogueEscapeReturnsToPortCity/);
  assert.doesNotMatch(text("navigateBackFromDialogue"), /portCityView\.active/);
  for (const name of ["openShipDialogue", "updateSoundDues", "openShoreBatteryCombatHail", "openDamageSurrenderDecision", "openSurrenderPrizeDecision"]) {
    assert.match(text(name), /activateDialogueSession\(/);
    assert.doesNotMatch(text(name), /dialogueLayout = createDialogueLayoutState\(/);
  }
  for (const name of ["openShipInfoMenu", "openCreditsMenu", "openPastVoyagesMenu", "openOptionsMenu", "openDiscoveriesMenu", "openAchievementsMenu", "openPoliticsMenu", "openNavigationMenu", "openAboardMenu", "openCaptainMenu"]) {
    assert.match(text(name), /switchNotebookPage\(/);
    assert.doesNotMatch(text(name), /keys\.clear\(|clearPointerSteering\(/);
  }
});

test("runtime reconciles mutable dialogue targets before every input and render boundary", () => {
  const text = name => source.statements.find(
    node => ts.isFunctionDeclaration(node) && node.name.text === name
  ).getText(source);
  assert.ok(
    text("runFrame").indexOf("reconcileActiveShipDialogueTarget()") <
      text("runFrame").indexOf("pollGamepadControls(nowMs)"),
    "ship dialogue targets must be reconciled before controller input and rendering"
  );
  for (const name of [
    "dispatchWorldOverlayKey",
    "dispatchWorldOverlayPointerDown",
    "dispatchWorldOverlayPointerMove",
    "handleCanvasWheel"
  ]) assert.match(text(name), /reconcileActiveShipDialogueTarget\(\)/);
});

test("sailing prepares shoreline connector caches incrementally before render fallback", () => {
  const text = name => source.statements.find(
    node => ts.isFunctionDeclaration(node) && node.name.text === name
  ).getText(source);
  assert.match(text("runFrame"), /advanceTerrainConnectorLayerPrefetch\(chart\)/);
  assert.match(
    text("advanceTerrainConnectorLayerPrefetch"),
    /TERRAIN_CONNECTOR_PREFETCH_BUDGET_MS/
  );
  assert.match(
    text("advanceTerrainConnectorLayerPrefetch"),
    /cached\.revision === revision && !geometryPrefetchRequired/
  );
  assert.match(
    text("terrainConnectorLayer"),
    /surfaceDetailLayerCoversViewport/
  );
  assert.match(text("terrainConnectorLayer"), /advanceTerrainConnectorLayerBuild\(build, Infinity\)/);
});
