import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const citySource = ts.createSourceFile("city.js", readFileSync(new URL("../city-visualizer/main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function compiled(name, context, file = source) {
  let node;
  function visit(candidate) {
    if (ts.isFunctionDeclaration(candidate) && candidate.name.text === name) node = candidate;
    if (!node) ts.forEachChild(candidate, visit);
  }
  visit(file);
  assert.ok(node, name);
  return runInNewContext(`${node.getText(file)}; ${name}`, context);
}
test("port resupply notices receive their full reading time after the departure wipe", () => {
  const notice = { action: null, text: "PORT: FOOD +1", expiresAtMs: 4000, lastVisibilityCheckMs: 0, pendingVisibility: true };
  const context = { survivalNotice: notice, startMenu: null, playerIntroModal: null, captainAlertModal: null,
    dialogueState: {}, portCityView: null, portCityTransition: {}, portAssaultState: null,
    gameOverReason: null, menusAreOpen: () => false, NOTICE_DURATION_MS: { survival: 4000 },
    politicalNoticeQueue: { take: () => null } };
  context.hudNoticesAreObscured = compiled("hudNoticesAreObscured", context);
  const update = compiled("updatePoliticalNotices", context);
  update(10000);
  context.dialogueState = null; context.portCityTransition = null;
  update(11000);
  assert.equal(notice.expiresAtMs, 15000);
  update(13000);
  assert.equal(notice.expiresAtMs, 15000);
});
test("feast labels return after the nighttime aftermath without removing the table", () => {
  const calls = [];
  const context = { state: { feast: { phase: "served", elapsedMs: 60000 } },
    drawCityNameLabel: () => {}, drawSetSailControl: () => calls.push("sail"), drawDestinationLabels: () => calls.push("locations") };
  const draw = compiled("drawSceneLabels", context, citySource);
  draw(); assert.equal(calls.length, 0);
  context.state.feast = { phase: "afterwards", elapsedMs: 2999 };
  draw(); assert.equal(calls.length, 0);
  context.state.feast.elapsedMs = 3000;
  draw(); assert.deepEqual(calls, ["sail", "locations"]);
});
test("positive standing never changes to black ink at high reputation", () => {
  const color = compiled("politicsStandingColor", { PIRATE_MENU_INK_MUTED: "muted", PIRATE_MENU_SUCCESS: "green" });
  for (const value of [0.2, 15, 50, 75, 100]) assert.equal(color(value), "green");
});
test("a nearby fishing ground remains the default fishing interaction beside a port", () => {
  const context = { fishingAction: null, gameState: { memory: { whales: {} } },
    activePortCalls: () => [{ id: "port" }], harpoonableWhaleCalls: () => [],
    activeFishCall: () => ({ id: "fish" }), activeNpcShipCalls: () => [] };
  const targets = compiled("activeInteractionTargets", context)();
  assert.equal(targets[0].kind, "fish");
  assert.equal(targets[1].kind, "port");
});
test("leaving safe port waiting completes departure instead of leaving the city menu open", () => {
  const calls = [];
  const city = { cityId: "london|united kingdom", character: { name: "John" } };
  const context = { portWaitState: { cityId: city.cityId, portId: city.cityId },
    chartCityCallByLocationId: () => city, characterExpression: () => "neutral",
    openPortMenu: () => calls.push("restore admission"), closeDialogue: () => calls.push("depart"),
    saveVoyageNow: () => {}, dirty: false };
  assert.equal(compiled("stopWaitingInPort", context)(), true);
  assert.deepEqual(calls, ["restore admission", "depart"]);
  assert.equal(context.portWaitState, null);
});
test("rescued travellers can have Asian homes and avoid another active passenger's home", () => {
  const ports = [1,2,3].map(id => ({ cityId: `city-${id}`, tileId: id, factionId: "ming" }));
  const context = { npcSeaRoutes: {}, ship: { position: [] }, activeRescuedTravelers: () => [{ homePortCityId: "city-1" }],
    playerAccessiblePortCities: () => ports, PIRATE_FACTION_ID: "pirate", EARTH_RADIUS_KM: 6371,
    tileCenterVector: id => id, vectorArcDistance: () => 0.3, spriteKeyHash: () => 0 };
  assert.equal(compiled("rescuedTravelerHomePort", context)("rescued-1").cityId, "city-2");
});

test("NPC hints use the current target hull position and never report a lost replacement as the quarry", async () => {
  const { pirateRevengeTargetPresent } = await import("./pirateHavens.js");
  const { shipTargetRumorEligible, recordShipTargetRumor, shipTargetRumorText } = await import("./shipTargetRumors.js");
  const merchant = { id: "merchant", seed: 7, hitPoints: 30, visualNavigation: { vector: [0.001, 0] } };
  const memory = { decisions: {}, pirateHavens: { revenge: { targetShipId: merchant.id, targetShipSeed: 7, ready: false,
    targetShipName: "Santa Maria" } } };
  const context = { gameState: { memory }, weatherClockMinutes: 100, activeWokouHuntQuest: () => null,
    pirateRevengeTargetPresent, shipTargetRumorEligible, recordShipTargetRumor, shipTargetRumorText,
    spriteKeyHash: () => 0, npcSeaRoutes: { shipById: new Map([[merchant.id, merchant]]) },
    npcShipSnapshotForId: () => ({ routeVector: [4, 0] }),
    vectorLatLon: vector => ({ latitudeDeg: vector[0], longitudeDeg: vector[1] }),
    nearestCityToPosition: () => ({ city: "Ningbo", lat: 0, lon: 0 }), saveVoyageNow: () => {} };
  const rumor = compiled("maybeShipTargetRumor", context);
  assert.match(rumor("speaker-1").text, /off Ningbo/);
  assert.equal(rumor("speaker-2"), null);
  context.weatherClockMinutes += 7 * 1440;
  merchant.visualNavigation.vector = [-2, 0];
  assert.match(rumor("speaker-3").text, /south of Ningbo/);
  context.weatherClockMinutes += 7 * 1440;
  merchant.seed++;
  assert.equal(rumor("speaker-4"), null);
});

test("a hostile toll offer intercepts attempted docking before opening the barred city screen", () => {
  const calls = [];
  const city = { cityId: "calais|france", factionId: "france", character: {} };
  const battery = { playerHailed: false, playerAttackActive: false, gunCount: 2 };
  const context = { gameState: {}, weatherClockMinutes: 100,
    clearPortNavigationWaypointsAt: () => {}, ensureShoreBatteryState: () => battery,
    continuingPortBombardmentThreat: () => null, shoreBatteryIsDisabled: () => false,
    setBackgroundMusicTrack: () => {}, musicTrackForCity: () => "port", citySiteIsRuined: () => false,
    portEntryStatus: () => ({ canPurchaseSafePassage: true }), playerPortAttackStatus: () => ({ commissioned: false }),
    openShoreBatteryCombatHail: () => calls.push("offer toll"), ensurePortCityView: () => { throw new Error("premature docking"); } };
  compiled("openPortDialogue", context)(city);
  assert.deepEqual(calls, ["offer toll"]);
});
