import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PoliticalNoticeQueue, POLITICAL_NOTICE_LIMIT } from "./politicalNoticeQueue.js";
import { SUPPORTED_LANGUAGES, translate } from "./localization.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function runtime(names, context) {
  const code = names.map((name) => source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source)).join("\n");
  return runInNewContext(`${code}\n({${names.join(",")}})`, context);
}

function noticeHarness() {
  const context = {
    politicalNoticeQueue: new PoliticalNoticeQueue(), survivalNotice: null, survivalNoticeRect: null,
    lastFrameMs: 0, dirty: false, NOTICE_DURATION_MS: { survival: 100 },
    startMenu: null, playerIntroModal: null, captainAlertModal: null, dialogueState: null,
    portCityView: null, portCityTransition: null, portAssaultState: null, gameOverReason: null,
    menusAreOpen: () => false, uiText: (key, params) => translate("en", key, params)
  };
  const api = runtime(["hudNoticesAreObscured", "showSurvivalNotice", "updatePoliticalNotices", "clearPoliticalNotices"], context);
  return { context, ...api, tick(now) { context.lastFrameMs = now; api.updatePoliticalNotices(now); } };
}

test("simultaneous political dispatches each get a full reading interval", () => {
  const h = noticeHarness();
  h.showSurvivalNotice("PAPAL ARMS BAN", "warn", "politics-news");
  h.showSurvivalNotice("NATIONAL IMPORT BAN", "warn", "politics-news");
  h.tick(0);
  assert.equal(h.context.survivalNotice.text, "PAPAL ARMS BAN");
  h.tick(99);
  assert.equal(h.context.survivalNotice.text, "PAPAL ARMS BAN");
  h.tick(100);
  assert.equal(h.context.survivalNotice.text, "NATIONAL IMPORT BAN");
  assert.equal(h.context.survivalNotice.expiresAtMs, 200);
});

test("urgent survival warnings preempt dispatches without losing them", () => {
  const h = noticeHarness();
  h.showSurvivalNotice("ARMS BAN", "warn", "politics-news");
  h.tick(0);
  h.tick(50);
  h.showSurvivalNotice("CREW OVERBOARD", "warn");
  h.tick(149);
  assert.equal(h.context.survivalNotice.text, "CREW OVERBOARD");
  h.tick(150);
  assert.equal(h.context.survivalNotice.text, "ARMS BAN");
  assert.equal(h.context.survivalNotice.expiresAtMs, 250);
});

for (const overlay of ["startMenu", "playerIntroModal", "captainAlertModal", "dialogueState", "portCityView", "portCityTransition", "portAssaultState", "gameOverReason", "menu"]) {
  test(`political dispatches wait while hidden by ${overlay}`, () => {
    const h = noticeHarness();
    if (overlay === "menu") h.context.menusAreOpen = () => true;
    else h.context[overlay] = { sceneReady: true };
    h.showSurvivalNotice("ARMS BAN", "warn", "politics-news");
    h.tick(1000);
    assert.equal(h.context.survivalNotice, null);
    if (overlay === "menu") h.context.menusAreOpen = () => false;
    else h.context[overlay] = null;
    h.tick(2000);
    assert.equal(h.context.survivalNotice.expiresAtMs, 2100);
  });
}

test("an already visible dispatch resumes after an obscuring city scene", () => {
  const h = noticeHarness();
  h.showSurvivalNotice("ARMS BAN", "warn", "politics-news");
  h.tick(0);
  h.context.portCityView = { sceneReady: true };
  h.tick(50);
  h.tick(1000);
  h.context.portCityView = null;
  h.tick(1001);
  assert.equal(h.context.survivalNotice.text, "ARMS BAN");
  assert.equal(h.context.survivalNotice.expiresAtMs, 1101);
});

test("opening a menu does not revive an already expired political dispatch", () => {
  const h = noticeHarness();
  h.showSurvivalNotice("ARMS BAN", "warn", "politics-news");
  h.tick(0);
  h.context.menusAreOpen = () => true;
  h.tick(100);
  h.context.menusAreOpen = () => false;
  h.tick(200);
  assert.equal(h.context.survivalNotice, null);
  assert.equal(h.context.politicalNoticeQueue.take(), null);
});

test("bounded political catch-up explicitly summarizes excess dispatches, including interruptions", () => {
  const h = noticeHarness();
  for (let i = 0; i < POLITICAL_NOTICE_LIMIT + 5; i++) h.showSurvivalNotice(`DISPATCH ${i}`, "warn", "politics-news");
  for (let i = 0; i < POLITICAL_NOTICE_LIMIT; i++) {
    h.tick(i * 100);
    assert.equal(h.context.survivalNotice.text, `DISPATCH ${i}`);
  }
  h.tick(POLITICAL_NOTICE_LIMIT * 100);
  assert.match(h.context.survivalNotice.text, /^5 MORE DISPATCHES/);
  h.showSurvivalNotice("CREW OVERBOARD", "warn");
  h.tick((POLITICAL_NOTICE_LIMIT + 1) * 100);
  assert.match(h.context.survivalNotice.text, /^5 MORE DISPATCHES/);
  assert.equal(h.context.politicalNoticeQueue.take(), null);
  h.showSurvivalNotice("NEW DISPATCH", "warn", "politics-news");
  h.clearPoliticalNotices();
  assert.equal(h.context.survivalNotice, null);
  assert.equal(h.context.politicalNoticeQueue.take(), null);
});

test("political dispatches reject malformed content and preserve bounded preemption", () => {
  const queue = new PoliticalNoticeQueue();
  assert.throws(() => queue.enqueue({ text: "", tone: "warn" }), /text and tone/);
  assert.throws(() => queue.prepend({ kind: "overflow", count: -1 }), /positive count/);
  for (let i = 0; i < POLITICAL_NOTICE_LIMIT; i++) queue.enqueue({ text: `DISPATCH ${i}`, tone: "warn" });
  queue.prepend({ text: "INTERRUPTED", tone: "warn" });
  assert.equal(queue.take().text, "INTERRUPTED");
  for (let i = 0; i < POLITICAL_NOTICE_LIMIT - 1; i++) assert.equal(queue.take().text, `DISPATCH ${i}`);
  assert.deepEqual(queue.take(), { kind: "overflow", count: 1 });
});

test("a political update announces every category and applies commission revocation despite earlier events", () => {
  const notice = noticeHarness();
  const result = {
    authorityEvents: [{}], historicalTransitions: [{ playerFactionChanged: true }],
    conquistadorTransfers: [{ cityName: "CUZCO" }, { cityName: "LIMA" }], conquistadorRewardReady: true,
    englishReformation: true, papalActions: ["papal action 1", "papal action 2"],
    papalCommissionRevoked: "revoked", papalMattersOpened: ["papal matter"],
    embargoEvents: ["papal arms ban", "national import ban"], courtActions: ["court action"],
    courtMattersOpened: ["court matter"],
    soundDuesExemptionRevocations: [{ factionId: "lubeck" }],
    diplomacyEvents: [{ kind: "peace" }, { kind: "war" }]
  };
  const effects = [];
  Object.assign(notice.context, {
    gameState: { relations: { diplomacy: {} }, playerCharacter: {} }, weatherClockMinutes: 10,
    cityByTileId: new Map(), nextGamePoliticsMinute: () => 10, advanceGamePolitics: () => result,
    playerAccessiblePortCities: () => [], reconcileEnglishReformationCharacters() {}, reconcilePapalAuthorityCharacters() {},
    recordPortCaptureAuthorityForState() {}, applyCurrentPortConquestOwnership() {}, saveVoyageNow() {},
    openCharacterAlertModal: () => effects.push("succession alert"), reconcileForeignSettlementPolitics: () => ["expulsion"],
    clearPapalCommissionSafePassage: () => effects.push("passage cleared"),
    clearPapalCommissionCargoProgress: () => effects.push("cargo cleared"),
    papalActionNotice: (event) => event, papalCommissionRevocationNotice: (event) => event,
    papalMatterNotice: (event) => event, tradeEmbargoHudNotice: (event) => event,
    courtActionNotice: (event) => event, courtMatterNotice: (event) => event,
    factionById: () => ({ adjective: "Lubeck" }),
    foreignSettlementExpulsionNotice: (events) => events.join(), diplomacyEventNotice: (event) => event.kind,
    showSurvivalNotice: notice.showSurvivalNotice
  });
  const { updateWorldDiplomacy } = runtime(
    ["soundDuesExemptionRevocationNotice", "updateWorldDiplomacy"],
    notice.context
  );
  assert.equal(updateWorldDiplomacy(), true);
  assert.deepEqual(effects, ["succession alert", "passage cleared", "cargo cleared"]);
  const dispatches = [];
  for (let dispatch; (dispatch = notice.context.politicalNoticeQueue.take());) dispatches.push(dispatch);
  assert.equal(dispatches.length, 17);
  assert.deepEqual(dispatches.slice(8, 11).map(({ text }) => text), ["papal matter", "papal arms ban", "national import ban"]);
  assert.equal(dispatches.at(-2).tone, "good");
  assert.equal(dispatches.at(-1).text, "war");
});

function musicHarness() {
  const played = [];
  const context = {
    lakeBattleMode: null, LAKE_BATTLE_PHASE_ACTIVE: "active", LAKE_BATTLE_SCREEN_SINKING: "sinking",
    LAKE_BATTLE_SCREEN_PORT_ASSAULT: "assault", portAssaultState: null, combatMusicUntilMs: 100,
    nearbyCombatMusicUntilMs: 0, MUSIC_COMBAT_CROSSFADE_SECONDS: 1,
    shipCombatState: { engagements: new Map() }, shoreBatteryStates: new Map(), PLAYER_COMBAT_ID: "player",
    themeMusic: { currentTrackKey: "combatBig", requestedTrackKey: "combatBig" },
    gameOverReason: null, dialogueState: null, ensureThemeMusicContinuity() {}, playerStormIntensity: () => 0,
    stormMusicActive: false, STORM_MUSIC_ENTER_INTENSITY: 1, STORM_MUSIC_EXIT_INTENSITY: 0.5,
    backgroundMusicTrackKey: "ship", MUSIC_RETURN_CROSSFADE_SECONDS: 1, playMusicTrack: (key) => played.push(key)
  };
  return { context, played, ...runtime(["combatMusicIsActive", "playerHasCombatEngagement", "playerHasShoreBatteryEngagement", "isCombatMusicTrack", "updateMusicContext"], context) };
}

test("battle score survives the timer through a city assault and its pause, then returns after completion", () => {
  const h = musicHarness();
  h.context.portAssaultState = { completionApplied: false, pausedAtMs: null };
  h.updateMusicContext(10000);
  h.context.portAssaultState.pausedAtMs = 10000;
  h.updateMusicContext(20000);
  assert.deepEqual(h.played, []);
  h.context.portAssaultState.completionApplied = true;
  h.updateMusicContext(30000);
  assert.deepEqual(h.played, ["ship"]);
});

test("battle score lasts through naval maneuvering and shore engagement, but unrelated battles do not hold it", () => {
  const h = musicHarness();
  h.context.shipCombatState.engagements.set("duel", { aId: "enemy", bId: "player" });
  h.updateMusicContext(10000);
  h.context.shipCombatState.engagements.clear();
  h.context.shoreBatteryStates.set("port", { engagedTargetIds: new Set(["player"]) });
  h.updateMusicContext(20000);
  assert.deepEqual(h.played, []);
  h.context.shoreBatteryStates.clear();
  h.context.shipCombatState.engagements.set("duel", { aId: "enemy", bId: "another-npc" });
  h.updateMusicContext(30000);
  assert.deepEqual(h.played, ["ship"]);
});

test("battle score still covers lake combat, sinking, landing and the post-shot hold", () => {
  const h = musicHarness();
  for (const mode of [{ battle: { phase: "active" } }, { screen: "sinking" }, { screen: "assault" }]) {
    h.context.lakeBattleMode = mode;
    assert.equal(h.combatMusicIsActive(10000), true);
  }
  h.context.lakeBattleMode = null;
  assert.equal(h.combatMusicIsActive(99), true);
  assert.equal(h.combatMusicIsActive(100), false);
});

test("city and naval reports pass distinct localized headings to their shared renderer", () => {
  for (const language of SUPPORTED_LANGUAGES) {
    const headings = [];
    const context = {
      portAssaultState: { casualtyReport: {} }, captainAlertModal: { kind: "naval-casualty-report" },
      portAssaultElapsedMs: () => 0, drawPortAssaultBattleStatus() {},
      uiText: (key) => translate(language, key), drawCrewCasualtyReport: (_modal, heading) => headings.push(heading)
    };
    const h = runtime(["drawPortAssaultOverlay", "drawCaptainAlertModal"], context);
    h.drawPortAssaultOverlay(0);
    h.drawCaptainAlertModal(0);
    assert.equal(headings.length, 2);
    assert.notEqual(headings[0], headings[1]);
    assert.ok(headings.every((heading) => heading && !heading.startsWith("combat.")));
  }
});

test("a bombardment score does not alternate when player and battery volleys differ in size", () => {
  const played = [];
  const context = { lastFrameMs: 100, combatMusicUntilMs: 0, nearbyCombatMusicUntilMs: 0, COMBAT_MUSIC_HOLD_MS: 18000,
    MUSIC_COMBAT_CROSSFADE_SECONDS: 1, navalAfterActionQuietSinceMs: 0,
    themeMusic: { requestedTrackKey: "ship" }, combatMusicIsActive: () => true,
    combatMusicTrackForThreat: threat => threat === "big" ? "combatBig" : "combatSmall",
    playMusicTrack(key) { context.themeMusic.requestedTrackKey = key; played.push(key); } };
  const h = runtime(["startCombatMusicForThreat"], context);
  for (const threat of ["big", "small", "big", "small"]) h.startCombatMusicForThreat(threat);
  assert.deepEqual(played, ["combatBig", "combatBig", "combatBig", "combatBig"]);
  assert.equal(context.navalAfterActionQuietSinceMs, null);
});

test("a nearby fight plays the observer score and does not hold the player's battle music", () => {
  const played = [];
  const context = {
    lastFrameMs: 1000, combatMusicUntilMs: 0, nearbyCombatMusicUntilMs: 0, COMBAT_MUSIC_HOLD_MS: 18000,
    MUSIC_COMBAT_CROSSFADE_SECONDS: 1, navalAfterActionQuietSinceMs: 0, PLAYER_COMBAT_ID: "player",
    lakeBattleMode: null, LAKE_BATTLE_PHASE_ACTIVE: "active", LAKE_BATTLE_SCREEN_SINKING: "sinking",
    LAKE_BATTLE_SCREEN_PORT_ASSAULT: "assault", portAssaultState: null,
    shipCombatState: { engagements: new Map() }, shoreBatteryStates: new Map(),
    themeMusic: { currentTrackKey: "ship", requestedTrackKey: "ship" },
    combatMusicTrackForThreat: (threat) => threat === "big" ? "combatBig" : "combatSmall",
    playMusicTrack(key) {
      context.themeMusic.requestedTrackKey = key;
      context.themeMusic.currentTrackKey = key;
      played.push(key);
    }
  };
  const h = runtime([
    "combatMusicIsActive", "playerHasCombatEngagement", "playerHasShoreBatteryEngagement",
    "startCombatMusicForThreat", "startNearbyCombatMusic", "startObservedCombatMusic"
  ], context);
  h.startObservedCombatMusic("small", "npc-a", "npc-b");
  assert.deepEqual(played, ["combat-nearby"]);
  assert.equal(context.combatMusicUntilMs, 0);
  assert.equal(context.nearbyCombatMusicUntilMs, 19000);
  h.startObservedCombatMusic("big", "npc-a", "player");
  assert.deepEqual(played, ["combat-nearby", "combatBig"]);
  assert.equal(context.combatMusicUntilMs, 19000);
  assert.equal(context.nearbyCombatMusicUntilMs, 0);
  context.shipCombatState.engagements.set("duel", { aId: "enemy", bId: "player" });
  h.startObservedCombatMusic("small", "npc-a", "npc-b");
  assert.equal(played.at(-1), "combatBig");
});

test("nearby combat music yields to a storm, then returns to the voyage when the hold ends", () => {
  const h = musicHarness();
  h.context.combatMusicUntilMs = 0;
  h.context.nearbyCombatMusicUntilMs = 5000;
  h.context.themeMusic.currentTrackKey = "ship";
  h.context.themeMusic.requestedTrackKey = "ship";
  h.context.playerStormIntensity = () => 1;
  h.updateMusicContext(1000);
  assert.deepEqual(h.played, ["storm"]);
  h.played.length = 0;
  h.context.playerStormIntensity = () => 0;
  h.context.stormMusicActive = true;
  h.context.themeMusic.currentTrackKey = "storm";
  h.context.themeMusic.requestedTrackKey = "storm";
  h.updateMusicContext(2000);
  assert.deepEqual(h.played, ["combat-nearby"]);
  h.played.length = 0;
  h.context.themeMusic.currentTrackKey = "combat-nearby";
  h.context.themeMusic.requestedTrackKey = "combat-nearby";
  h.updateMusicContext(5000);
  assert.deepEqual(h.played, ["ship"]);
});

test("a hovered market row keeps its sale detail after the first sale", () => {
  const regular = [
    { index: 2, option: { detail: "Sold last voyage for 40 db", detailTone: "success", disabled: false } }
  ];
  const view = { presentation: { kind: "market" }, feedback: "Sold fish. P/L +12 db.", feedbackTone: "success" };
  const context = {
    dialogueState: { selectedIndex: 2 },
    renderedUiText: (text) => text
  };
  const h = runtime(["compactMarketFooterContent", "selectedMarketOptionContext"], context);
  const hovered = h.compactMarketFooterContent(view, regular);
  assert.equal(hovered.kind, "context");
  assert.equal(hovered.text, "Sold last voyage for 40 db");
  assert.equal(hovered.tone, "success");
  context.dialogueState.selectedIndex = 0;
  assert.equal(h.compactMarketFooterContent(view, regular).kind, "feedback");
  view.feedback = null;
  assert.equal(h.compactMarketFooterContent(view, regular).text, "Sold last voyage for 40 db");
});

test("losing window focus clears held controls without pausing the voyage", () => {
  const calls = [];
  const context = {
    mainThreadFreezeMonitor: {},
    suspendMainThreadFreezeMonitor() { calls.push("suspend"); },
    clearSessionHeldControls() { calls.push("clear"); },
    pauseActiveSteamGameplay(reason) { calls.push(reason); }
  };
  runtime(["handleWindowBlur"], context).handleWindowBlur();
  assert.deepEqual(calls, ["suspend", "clear"]);
});

test("a hidden page still pauses the voyage", () => {
  const calls = [];
  const context = {
    performance: { now: () => 40 },
    document: { visibilityState: "hidden" },
    mainThreadFreezeMonitor: {},
    suspendMainThreadFreezeMonitor() { calls.push("suspend"); },
    clearSessionHeldControls() { calls.push("clear"); },
    pauseActiveSteamGameplay(reason) { calls.push(reason); }
  };
  runtime(["resetFrameClocksAfterVisibilityChange"], context).resetFrameClocksAfterVisibilityChange();
  assert.deepEqual(calls, ["suspend", "clear", "hidden"]);
});

test("silenced attacked shore batteries keep the player engaged until the bombardment ends", () => {
  const h = musicHarness();
  h.context.shoreBatteryStates.set("tunis", { playerAttackActive: true, engagedTargetIds: new Set() });
  h.updateMusicContext(100000);
  assert.deepEqual(h.played, []);
  h.context.shoreBatteryStates.get("tunis").playerAttackActive = false;
  h.updateMusicContext(100001);
  assert.deepEqual(h.played, ["ship"]);
});
