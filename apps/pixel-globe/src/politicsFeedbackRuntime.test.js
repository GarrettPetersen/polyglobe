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
  const api = runtime(["showSurvivalNotice", "updatePoliticalNotices", "clearPoliticalNotices"], context);
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
    courtMattersOpened: ["court matter"], diplomacyEvents: [{ kind: "peace" }, { kind: "war" }]
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
    papalMatterNotice: (event) => event, tradeEmbargoEventNotice: (event) => event,
    courtActionNotice: (event) => event, courtMatterNotice: (event) => event,
    foreignSettlementExpulsionNotice: (events) => events.join(), diplomacyEventNotice: (event) => event.kind,
    showSurvivalNotice: notice.showSurvivalNotice
  });
  const { updateWorldDiplomacy } = runtime(["updateWorldDiplomacy"], notice.context);
  assert.equal(updateWorldDiplomacy(), true);
  assert.deepEqual(effects, ["succession alert", "passage cleared", "cargo cleared"]);
  const dispatches = [];
  for (let dispatch; (dispatch = notice.context.politicalNoticeQueue.take());) dispatches.push(dispatch);
  assert.equal(dispatches.length, 16);
  assert.deepEqual(dispatches.slice(8, 11).map(({ text }) => text), ["papal matter", "papal arms ban", "national import ban"]);
  assert.equal(dispatches.at(-2).tone, "good");
  assert.equal(dispatches.at(-1).text, "war");
});

function musicHarness() {
  const played = [];
  const context = {
    lakeBattleMode: null, LAKE_BATTLE_PHASE_ACTIVE: "active", LAKE_BATTLE_SCREEN_SINKING: "sinking",
    LAKE_BATTLE_SCREEN_PORT_ASSAULT: "assault", portAssaultState: null, combatMusicUntilMs: 100,
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
