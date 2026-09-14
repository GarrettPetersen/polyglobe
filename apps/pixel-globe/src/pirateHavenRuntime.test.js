import { pirateHavenNavigationReasonText } from "./pirateHavenDialogue.js";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { pirateRevengeTargetPresent } from "./pirateHavens.js";
const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source);

test("a revenge waypoint follows the actual ship and returns to the issuer if that hull is lost", () => {
  const haven = { cityId: "pirate-haven-1", city: "Black Gull Cove", vector: [1, 0, 0] };
  const port = { cityId: "lisbon|portugal", city: "Lisbon", vector: [0, 1, 0] };
  const merchant = { id: "merchant-1", seed: 77, hitPoints: 20, currentPort: port, visualNavigation: { vector: [0.9, 0.1, 0] } };
  const quest = { id: "quest-1", kind: "revenge", ready: false, originCityId: haven.cityId, havenCityId: haven.cityId,
    targetShipId: merchant.id, targetShipSeed: merchant.seed, targetCaptainName: "Joao", targetShipName: "Santa Maria" };
  let location = { kind: "visible", position: merchant.visualNavigation.vector };
  const context = { gameState: { memory: { pirateHavens: { revenge: quest, suppression: null } } },
    npcSeaRoutes: { shipById: new Map([[merchant.id, merchant]]) }, cityById: new Map([[haven.cityId, haven]]),
    pirateHavenNavigationReasonText, pirateRevengeTargetPresent, weatherClockMinutes: 1,
    npcShipLocation: (_system, id, minute) => {
      assert.equal(id, merchant.id);
      assert.equal(minute, 1);
      return location;
    },
    placedCityTargetVector: city => city.vector, requireEntityById: (map, id) => map.get(id),
    cityLabelText: city => city.city, QUEST_NAVIGATION_STYLE: {} };
  const entries = runInNewContext(`${declaration("pirateHavenNavigationEntries")}; pirateHavenNavigationEntries`, context);
  assert.deepEqual(entries()[0].targetVector, merchant.visualNavigation.vector);
  merchant.visualNavigation = null;
  location = { kind: "sailing", position: [0.8, 0.2, 0] };
  assert.deepEqual(entries()[0].targetVector, [0.8, 0.2, 0]);
  for (const kind of ["waiting", "hidden"]) {
    location = { kind, position: port.vector };
    assert.deepEqual(entries()[0].targetVector, port.vector);
  }
  merchant.seed++;
  assert.deepEqual(entries()[0].targetVector, haven.vector);
  assert.match(entries()[0].reason, /Ship lost/);
});

test("haven state changes cancel stale workers and rebuild chart records before spatial indexes", () => {
  const calls = [];
  const context = { chart: null, camera: {}, resetDistantWorldWorkerSchedule: () => calls.push("worker"),
    buildChart: () => { calls.push("chart"); return { updated: true }; },
    refreshWorldSpatialStaticEntries: () => { assert.equal(context.chart.updated, true); calls.push("spatial"); } };
  runInNewContext(`${declaration("refreshPirateHavenWorld")}; refreshPirateHavenWorld();`, context);
  assert.deepEqual(calls, ["worker", "chart", "spatial"]);
});

test("a completed haven commission opens before ordinary arrival dialogue and prepares other mission lanes", () => {
  const city = { cityId: "lisbon|portugal" };
  for (const needsLoadout of [false, true]) {
    const calls = [];
    const context = {
      recordTeaRaceArrivalAtPort() {}, playerAccessiblePortCities: () => [city], weatherClockMinutes: 100,
      gameState: { memory: { pirateHavens: {} } }, sailingDistanceBetweenPorts() {}, worldEconomy: {},
      capturePortMissionOfferForCity: () => calls.push("capture"),
      wokouHuntMissionOfferForCity: () => calls.push("wokou"),
      deliveryOfferForCity: () => calls.push("delivery"),
      passengerDialogueQuestsForCity: () => { calls.push("travel"); return []; },
      pirateQuestAtIssuer: () => ({ ready: true, originCityId: city.cityId }),
      createPortDialogueSession: (_city, options) => options
    };
    const session = runInNewContext(`${declaration("createOrdinaryPortArrivalSession")}; createOrdinaryPortArrivalSession`, context)(city, needsLoadout);
    assert.deepEqual(calls, ["capture", "wokou", "delivery", "travel"]);
    assert.equal(session.initialNodeId, "pirate-haven-commission");
    assert.equal(session.nextPortNodeId, needsLoadout ? "loadout" : "root");
  }
});

test("repeated combat callbacks penalize a pirate attack once without rewarding piracy", () => {
  const ship = { factionId: "pirate" };
  let attacks = 0;
  const context = {
    gameState: {}, npcSeaRoutes: { shipById: new Map() }, activeNingboMissionQuest: () => null,
    npcVisualShips: new Map([["pirate-ship", ship]]), PIRATE_FACTION_ID: "pirate",
    hasPrivateeringAuthorityAgainst: () => false,
    recordAttackAgainstFaction: () => { attacks++; },
    recordPiracyAgainstFaction: () => assert.fail("Attacking pirates is not piracy")
  };
  const record = runInNewContext(`${declaration("recordPlayerAttackConsequences")}; recordPlayerAttackConsequences`, context);
  record("pirate-ship");
  record("pirate-ship");
  assert.equal(attacks, 1);
});

test("only a deliberate player sinking records a pirate hull loss, once", () => {
  for (const [winner, accidental, expected] of [["player", false, 1], ["npc", false, 0], ["player", true, 0]]) {
    const ship = { id: "pirate-ship", factionId: "pirate", role: "pirate", slug: "galleon" };
    const ships = new Map([[ship.id, ship]]);
    let losses = 0;
    const context = {
      npcSeaRoutes: { shipById: ships }, npcVisualShips: new Map(),
      npcShipCaptains: new Map([[ship.id, { name: "Test Captain" }]]),
      PLAYER_COMBAT_ID: "player", NPC_ROLE_PIRATE: "pirate", PIRATE_FACTION_ID: "pirate",
      TREASURE_PIRATE_ENCOUNTER_KIND: "treasure", PIRATE_CAPTIVE_REVENGE_ENCOUNTER_KIND: "revenge",
      gameState: {}, weatherClockMinutes: 100, lastFrameMs: 1, NOTICE_DURATION_MS: { combat: 100 },
      recordCombatAuthorityOutcome() {}, combatEntityPoint: () => ({}),
      recordPlayerSelfDefenseConsequences: () => null, recordPlayerShipVictory() {},
      factionById: () => ({ adjective: "Pirate" }), shipLabelForSlug: () => "Galleon",
      maybeGrantDefeatedShipPerkItem: () => null,
      sinkNpcShip: (_routes, id) => ships.delete(id),
      recordPirateLoss: (_state, kind) => { assert.equal(kind, "ship"); losses++; },
      recordPlayerAccidentalDamagePenalty: () => ({ delta: 0 }),
      clearCombatForShip() {}, deleteNpcVisualShipState() {}, shipCombatEntryCollisionGrace: new Map(),
      npcCombatProjectiles: [], maybeOpenPirateCaptiveQuest() {}
    };
    const sink = runInNewContext(`${declaration("handleNpcSinking")}; handleNpcSinking`, context);
    assert.equal(sink(ship.id, winner, { accidentalPlayerCollision: accidental }), true);
    assert.equal(sink(ship.id, winner, { accidentalPlayerCollision: accidental }), false);
    assert.equal(losses, expected);
  }
});

test("an arriving passenger conversation cannot skip the port's independent job offers", () => {
  const city = { cityId: "london|united kingdom" };
  const quest = { id: "arriving-envoy", destinationCityId: city.cityId };
  const prepared = [];
  const context = {
    recordTeaRaceArrivalAtPort() {}, playerAccessiblePortCities: () => [city], weatherClockMinutes: 100,
    gameState: { memory: { pirateHavens: {} } }, sailingDistanceBetweenPorts() {}, worldEconomy: {},
    capturePortMissionOfferForCity: () => prepared.push("capture"),
    wokouHuntMissionOfferForCity: () => prepared.push("wokou"),
    deliveryOfferForCity: () => prepared.push("delivery"),
    passengerDialogueQuestsForCity: () => { prepared.push("travel"); return []; },
    pirateQuestAtIssuer: () => null, spriteKeyHash: () => 0, requireCityId: c => c.cityId,
    weatherParts: { dayIndex: 0 }, portMemory: () => ({ visits: 1 }),
    activeTravelMissionQuests: () => [quest], questHasDestination: () => true,
    shouldAutoOpenPassengerDialogue: () => true, pendingQuestJourneyDialogue: () => null,
    createWorldPassengerDialogueSession: (_city, q) => ({ questId: q.id }),
    createPortArrivalDialogueSession: (_city, options) => options
  };
  const arrive = runInNewContext(`${declaration("createOrdinaryPortArrivalSession")}; createOrdinaryPortArrivalSession`, context);
  assert.equal(arrive(city, false).questCharacterSession.questId, quest.id);
  assert.deepEqual(prepared, ["capture", "wokou", "delivery", "travel"]);
});
