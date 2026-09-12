import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createEnvoyCompanionPeople } from "./expeditionTravelers.js";
import { aboardRoster } from "./aboardRoster.js";
import { createGameState, acceptQuest, shipTravelerManifest } from "./gameState.js";
import { passengerOfferForCity, activeNamedTravelMissions } from "./passengerMissions.js";
import { gameMinuteForDate } from "./rulers.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function runtime(names, context) {
  const code = names.map(name => source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === name).getText(source)).join("\n");
  return runInNewContext(`${code}\n({${names.join(",")}})`, context);
}

test("a two-person Treaty of Madrid delegation has a complete manifest after acceptance and restoration", () => {
  const ports = [
    { cityId: "paris|france", tileId: 1, city: "Paris", country: "France", factionId: "france", lat: 48.86, lon: 2.35 },
    { cityId: "barcelona|spain", tileId: 2, city: "Barcelona", country: "Spain", factionId: "spain", lat: 41.39, lon: 2.17 }
  ];
  const captain = { id: "captain", name: "Captain", nationalityId: "france", expressions: ["neutral"], homePortCityId: "paris|france", homePortTileId: 1 };
  const state = createGameState({ cargoCapacity: 20, playerCharacter: captain });
  const quest = passengerOfferForCity(state, ports[0], ports, {
    historicalWorldState: { worldCities: [...ports, { cityId: "milan|italy", city: "Milan", country: "Italy", factionId: "habsburg" }],
      collapsedFactionIds: state.memory.conquest.collapsedFactionIds, diplomacy: state.relations.diplomacy,
      papacy: state.relations.papacy, tradeAccessGrants: state.relations.tradeAccessGrants,
      foreignSettlementExpulsions: state.relations.foreignSettlementExpulsions },
    spawnChance: 1, simMinute: gameMinuteForDate(1526, 1, 15), sailingDistanceKm: () => 1000,
    createCharacter: () => ({ id: "envoy", name: "Pierre" })
  });
  assert.equal(quest.envoyCount, 2);
  acceptQuest(state, quest);
  const makePeople = state => runtime(["currentExpeditionTravelerPeople"], {
    gameState: state, cityById: new Map(ports.map(port => [port.cityId, port])),
    TRAVELER_KIND_SETTLER: "settler", TRAVELER_KIND_ENVOY: "envoy", CONQUISTADOR_STAGE_CAPTURE: "capture",
    activeNamedTravelMissions, createEnvoyCompanionPeople,
    requireEntityById: (map, id) => map.get(id), cityCivilianAppearanceIds: (_origin, sexes) => sexes.map(() => "man"),
    expeditionIdentityFactory: () => ({ id }) => ({ givenName: "Jean", name: "Jean", nameCulture: "french" }),
    currentCaptureCommissionTravelerPeople: () => []
  }).currentExpeditionTravelerPeople({ travelerGroups: shipTravelerManifest(state), colonyLeader: null });
  const people = makePeople(state);
  assert.equal(people.length, 1);
  const roster = aboardRoster({ captain, crewCount: 1, crewMembers: [], namedCrew: [],
    travelerGroups: shipTravelerManifest(state), travelerPeople: people,
    namedTravelers: activeNamedTravelMissions(state) });
  assert.equal(roster.count, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(makePeople(JSON.parse(JSON.stringify(state))))), JSON.parse(JSON.stringify(people)));
});

function navigationHarness(placement) {
  const state = { id: "atlantic-coast-2", x: 0, y: 0, tileId: 1, vector: [1, 0, 0], heading: [0, 1, 0], slug: "galleon", stats: { mass: 1 }, collisionVelocityX: 0, collisionVelocityY: 0 };
  let released = false;
  let synced = false;
  const context = {
    measurePerformanceBenchmarkStage: (_name, callback) => callback(),
    PLAYER_COMBAT_ID: "player", npcVisualShips: new Map([[state.id, state]]), npcSeaRoutes: {}, lastFrameMs: 0,
    NPC_VISUAL_RECOVERY_SEARCH_PX: 20,
    shipNavigabilityAtLocalPoint: x => x === 0 ? { ok: false } : { ok: true, tileId: 2, kind: "river" },
    npcHullFitsDrawnNavigation: () => true,
    nearestNpcNavigableVisualPoint: () => placement,
    releaseNpcVisualState: () => { released = true; },
    applyNpcVisualPlacement: (target, move) => Object.assign(target, move),
    resetVisualPresentation: () => {}, setNpcShipVisualNavigation: () => { synced = true; },
    npcShipScreenHeading: () => ({ x: 1, y: 0 }), npcCollisionBaseVelocity: () => ({ x: 0, y: 0 }),
    combatCollisionFootprint: () => ({ radius: 2 })
  };
  return { state, api: runtime(["prepareNpcVisualNavigation", "prepareCombatCollisionParticipants", "combatCollisionBody"], context), released: () => released, synced: () => synced };
}

test("collisions admit ships against changed chart geometry before constructing collision bodies", () => {
  const h = navigationHarness({ x: 4, y: 5, tileId: 2, vector: [0, 1, 0], heading: [1, 0, 0] });
  assert.ok(h.api.prepareCombatCollisionParticipants(new Set([h.state.id])).has(h.state.id));
  const body = h.api.combatCollisionBody(h.state.id);
  assert.equal(body.x, 4);
  assert.equal(body.y, 5);
  assert.equal(h.synced(), true);
  assert.equal(h.released(), false);
});

test("ships outside the chart leave local collision simulation without losing their strategic ship", () => {
  const h = navigationHarness(null);
  assert.equal(h.api.prepareCombatCollisionParticipants(new Set([h.state.id])).size, 0);
  assert.equal(h.released(), true);
  assert.equal(h.synced(), false);
});

test("invalid navigation produced by recovery still fails loudly", () => {
  const h = navigationHarness({ x: 0, y: 0, tileId: 1 });
  assert.throws(() => h.api.prepareCombatCollisionParticipants(new Set([h.state.id])), /recovery produced invalid navigation/);
});


for (const kind of ["hidden", "waiting", "sailing", "visible", "absent"]) {
  test(`treasure rumors use the actual ${kind} pirate location without scanning other ships`, () => {
    const position = [0, 1, 0];
    let recorded = null;
    let saved = false;
    const context = {
      activeTreasureCampaignGoal: () => ({ pirateHints: [] }), treasureCampaignPhase: () => "map-hunt",
      TREASURE_PIRATE_HINT_LIMIT: 3, unrevealedTreasurePirates: () => [{ id: "pirate", shipId: "ship", hideoutTileId: 999 }],
      spriteKeyHash: () => 0, npcSeaRoutes: {}, weatherClockMinutes: 50,
      npcShipLocation: () => kind === "absent" ? null : { kind, position },
      vectorLatLon: value => { assert.equal(value, position); return { latitudeDeg: 1, longitudeDeg: 2 }; },
      nearestCityToPosition: value => { assert.equal(value, position); return { city: "Current haven", lat: 1, lon: 2 }; },
      approximateOceanRumorLocation: value => { assert.equal(value, position); return { latitudeDeg: 1, longitudeDeg: 2 }; },
      cityLabelText: city => city.city,
      recordTreasurePirateRumor: (_goal, rumor) => { recorded = rumor; return rumor; },
      saveVoyageNow: () => { saved = true; }
    };
    const result = runtime(["maybeTreasurePirateRumor"], context).maybeTreasurePirateRumor("inn", { force: true });
    if (kind === "absent") {
      assert.equal(result, null);
      assert.equal(saved, false);
    } else {
      assert.equal(recorded.referenceCityName, "Current haven");
      assert.equal(saved, true);
    }
  });
}


for (const available of [false, true]) {
  test(`quest-ship arrows ${available ? "use the current position" : "omit hidden or absent targets"}`, () => {
    const position = [0, 1, 0];
    let drawn = null;
    runtime(["drawQuestShipArrow"], {
      npcShipSightingPosition: () => available ? position : null,
      npcSeaRoutes: {}, weatherClockMinutes: 50, npcVisualShips: new Map(),
      drawWorldTargetArrow: spec => { drawn = spec; }, renderedUiText: value => value,
      localPointForGlobeVector: () => ({ x: 10, y: 20 }), QUEST_NAVIGATION_STYLE: {}
    }).drawQuestShipArrow({ id: "target" }, { idPrefix: "tea-race", label: "Racer", nowMs: 1 });
    if (available) assert.equal(drawn.targetVector, position);
    else assert.equal(drawn, null);
  });
}
