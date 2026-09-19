import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { questSearchAreaReached, questSiteArrivalCandidate } from "./questSiteArrival.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { createTreasureCampaignFields, recoverTreasure, treasureCampaignPhase, treasureRecoveryCaptainMessage } from "./treasureCampaign.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function runtime(names, context) {
  runInNewContext(names.map(name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(source)).join("\n"), context);
  return context;
}

for (const kind of ["pirate", "whale"]) {
  test(`${kind} sighting arrival follows its displayed bearing despite globe/chart displacement`, () => {
    let messages = 0;
    let arrivals = 0;
    let marker = { x: 150, y: 200 };
    const sighting = { latitudeDeg: 10, longitudeDeg: 20, pirateId: "pirate-1", reached: false };
    const goal = { type: "white-whale", sighting };
    const context = runtime(["playerReachedCampaignSearchArea", "updateWhiteWhaleSightingObjective", "updateTreasurePirateSearchObjective"], {
      gameState: { memory: { campaignGoal: goal } }, activeTreasureCampaignGoal: () => goal,
      treasureCampaignPhase: () => "map-hunt", PERFORMANCE_BENCHMARK: null,
      CAMPAIGN_GOAL_WHITE_WHALE: "white-whale", captainAlertModal: null, dialogueState: null,
      chart: {}, localLayout: { viewX: 100, viewY: 200 },
      // The globe position is deliberately far from the reported coordinates.
      // Arrival must use the same projected point as the visible waypoint.
      ship: { position: [-1, 0, 0] }, PIXELS_PER_RADIAN: 10000,
      dot3: (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0),
      clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
      latLonToDirection: () => [1, 0, 0], localPointForGlobeVector: () => marker,
      questSearchAreaReached, weatherClockMinutes: 10,
      treasurePirateHints: () => arrivals ? [] : [sighting],
      reachTreasurePirateHint: () => { arrivals++; return { text: "Search these waters" }; },
      reachWhiteWhaleSighting: () => { arrivals++; sighting.reached = true; return "Search these waters"; },
      openCaptainAlertModal: () => { messages++; return true; }, saveVoyageNow() {}
    });
    const update = kind === "pirate" ? context.updateTreasurePirateSearchObjective : context.updateWhiteWhaleSightingObjective;
    assert.equal(update(), false, "a distant marker has not been reached");
    marker = null;
    assert.equal(update(), false, "off-chart sightings have not been reached");
    marker = { x: 100, y: 200 };
    assert.equal(update(), true);
    assert.equal(update(), false, "arrival dialogue is delivered once");
    assert.equal(messages, 1);
  });
}

function treasureGoal() {
  const goal = { ...createTreasureCampaignFields("arrival-test"), treasureTileId: 73 };
  goal.treasureCaptainName = "Flint Bones";
  goal.mapPirates = Array.from({ length: 12 }, (_, index) => ({
    id: `pirate-${index}`, shipId: `ship-${index}`, shipSlug: "xebec", hideoutCityId: `haven-${index}`,
    hideoutTileId: index, captainId: `captain-${index}`, captainName: `Captain ${index}`
  }));
  goal.acquiredMapPiecePirateIds = goal.mapPirates.map(pirate => pirate.id);
  return goal;
}

test("treasure home ambushers do not repeat individual automatic hails", () => {
  const ships = new Map([
    ["ambusher", { encounter: { kind: "treasure-pirate", stage: "home-ambush" } }],
    ["hunter", { encounter: { kind: "treasure-pirate", stage: "map-hunt" } }],
    ["patrol", { encounter: { kind: "patrol" } }]
  ]);
  const context = runtime(["automaticNpcCombatHailAllowed"], {
    npcSeaRoutes: { shipById: ships },
    TREASURE_PIRATE_ENCOUNTER_KIND: "treasure-pirate",
    TREASURE_PIRATE_STAGE_AMBUSH: "home-ambush"
  });
  assert.equal(context.automaticNpcCombatHailAllowed("ambusher"), false);
  assert.equal(context.automaticNpcCombatHailAllowed("hunter"), true);
  assert.equal(context.automaticNpcCombatHailAllowed("patrol"), true);
});

test("treasure ambush construction requires every unresolved ship to be active and visible", () => {
  const goal = treasureGoal();
  goal.ambushDefeatedPirateIds = [goal.mapPirates[0].id];
  const ships = new Map(goal.mapPirates.slice(1).map(pirate => [pirate.shipId, {
    id: pirate.shipId,
    hitPoints: 1,
    hiddenAtHideout: false,
    encounter: { kind: "treasure-pirate", stage: "home-ambush", pirateId: pirate.id }
  }]));
  const context = runtime(["assertTreasureAmbushFleet"], {
    npcSeaRoutes: { shipById: ships },
    TREASURE_PIRATE_ENCOUNTER_KIND: "treasure-pirate",
    TREASURE_PIRATE_STAGE_AMBUSH: "home-ambush"
  });
  assert.equal(context.assertTreasureAmbushFleet(goal), true);
  ships.delete(goal.mapPirates[1].shipId);
  assert.throws(() => context.assertTreasureAmbushFleet(goal), /fleet is incomplete/);
});

for (const alreadyAnchored of [false, true]) {
  test(`treasure recovery accepts its nearby island despite a closer shore (restored anchor: ${alreadyAnchored})`, () => {
    const goal = JSON.parse(JSON.stringify(treasureGoal()));
    let rewards = 0;
    let saves = 0;
    let sequence = null;
    const calls = [
      { id: 74, row: { t: "grassland" }, x: 3, y: 0 },
      { id: 73, row: { t: "grassland" }, x: 30, y: 0 }
    ];
    const context = runtime(["nearestScavengeShoreCall", "canAnchorAtCurrentShore", "toggleAnchor", "maybeRecoverCampaignTreasureAtAnchor", "maybeAutoAnchorAtNonPortQuestSite"], {
      ship: { tileId: 75 }, gameState: {}, gameOverReason: null, shoreScavengeAction: null,
      anchored: alreadyAnchored, portWaitState: null, dialogueState: null, captainAlertModal: null,
      chart: { tileCalls: calls, cityCalls: [] }, localLayout: { viewX: 0, viewY: 0 }, worldFramePresented: true,
      menusAreOpen: () => false, playerHasCombatEngagement: () => false,
      activeTreasureCampaignGoal: () => goal, activeColonizationObjectives: () => [],
      treasureCampaignPhase, questSiteArrivalCandidate, ANCHOR_SHORE_MAX_PX: 36,
      isWaterSurfaceRow, tileHasSurfaceIce: () => false,
      distance2: (x, y, a, b) => (x-a)**2 + (y-b)**2,
      isShipNavigableTile: () => true, isPlayerUsableSurfaceWaterTile: () => true,
      stopShipMotion() {}, playAnchorHandlingSound() {}, weatherClockMinutes: 100,
      recoverTreasure, receiveTreasureCargo: () => { rewards++; return { quantity: 3 }; },
      syncShipCargoFromGameState() {}, ensureTreasureCampaignEncounters() {}, chartOffsetPixels: () => ({ x: 0, y: 0 }),
      treasureRecoveryCaptainMessage, campaignGoalHomeCity: () => ({ city: "Lisbon" }), cityLabelText: city => city.city,
      startGoldTreasureSequence: value => { sequence = value; }, lastFrameMs: 10,
      playDiscoverySuccessSound() {}, showSurvivalNotice() {}, saveVoyageNow: () => { saves++; }
    });
    assert.equal(context.nearestScavengeShoreCall().id, 74);
    calls[1].x = 37;
    assert.equal(context.maybeAutoAnchorAtNonPortQuestSite(), false, "a different nearby island cannot award this treasure");
    calls[1].x = 30;
    calls[1].row.t = "water";
    assert.equal(context.maybeAutoAnchorAtNonPortQuestSite(), false, "open ocean is not the island's shore");
    calls[1].row.t = "grassland";
    const lastPiece = goal.acquiredMapPiecePirateIds.pop();
    assert.equal(context.maybeAutoAnchorAtNonPortQuestSite(), false, "the captain needs the completed map");
    goal.acquiredMapPiecePirateIds.push(lastPiece);
    assert.equal(rewards, 0);
    assert.equal(context.maybeAutoAnchorAtNonPortQuestSite(), true);
    assert.equal(goal.treasureRecovered, true);
    assert.equal(goal.ambushStarted, true);
    assert.equal(goal.acquiredMapPiecePirateIds.length, 12);
    assert.equal(sequence.sourcePoint.x, 30, "treasure comes from the named island");
    assert.match(sequence.captainMessage, /Flint Bones/);
    assert.equal(context.maybeAutoAnchorAtNonPortQuestSite(), false);
    assert.equal(rewards, 1);
    assert.equal(saves, 1);
  });
}
