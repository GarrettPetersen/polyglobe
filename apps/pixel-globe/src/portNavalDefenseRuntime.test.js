import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { advanceCannonReload, navalWeaponForShip } from "./navalWeapons.js";
import { createShipCombatState, forceShipEngagement } from "./shipCombat.js";
import { NPC_PORT_RESPONSE_ATTACK, NPC_PORT_ATTACK_ALERT_MINUTES } from "./npcSeaRoutes.js";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
function runtimeFunction(name, context) {
  const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  return runInNewContext(`${declaration.getText(source)}; ${name}`, context);
}

test("a deliberate first cannon impact calls defenders before the battery is disabled; stray hits do not", () => {
  for (const [hitByPlayer, accidental] of [[true, false], [true, true], [false, false]]) {
    const orders = [];
    const battery = { id: "battery", portId: "lisbon", factionId: "portugal", hitPoints: 100, engagedTargetIds: new Set() };
    const context = {
      FRIENDLY_FIRE_DIRECT: "direct", FRIENDLY_FIRE_WARNING: "warning",
      playerCannonHitDisposition: () => accidental ? "warning" : "direct",
      friendlyFireDispositionIsAccidental: value => value === "warning",
      beginPlayerInitiatedShoreCombat: () => battery.engagedTargetIds.add("player"),
      playNavalImpactSound() {}, weatherClockMinutes: 100, shoreBatteryAttackerShipLabel: () => "Attacker",
      NEUTRAL_FACTION_ID: "neutral", PIRATE_FACTION_ID: "pirate",
      chartCityCallByLocationId: () => ({ cityId: "lisbon" }), NPC_PORT_RESPONSE_ATTACK, NPC_PORT_ATTACK_ALERT_MINUTES,
      orderPortNavalResponse: (...args) => orders.push(args),
      damageShoreBattery: () => ({ newlyDisabled: false }),
      addHullSplinterBurst() {}, cityArtKeyForCity: () => "port", requireEntityById: () => ({}), cityById: new Map(),
      gameState: { memory: { flags: {} } }, emitCaptureEvent() {}, recordPlayerFriendlyFireWarning() {}
    };
    runtimeFunction("applyShoreBatteryHit", context)({ portable: false, ownerId: "attacker", damage: 1 }, battery, { x: 0, y: 0 }, hitByPlayer);
    assert.equal(orders.length, accidental ? 0 : 1);
    if (!accidental) {
      assert.equal(orders[0][2], NPC_PORT_RESPONSE_ATTACK);
      assert.equal(orders[0][3], 100 + NPC_PORT_ATTACK_ALERT_MINUTES);
    }
  }
});

test("newly visible response ships start both broadsides half loaded, ordinary traffic remains ready", () => {
  for (const responding of [false, true]) {
    const routeShip = { portResponse: responding ? { phase: "responding" } : null, factionId: "portugal", cultureType: "mediterranean", role: "warship" };
    const context = {
      npcSeaRoutes: { shipById: new Map([["defender", routeShip]]) },
      shipStatsForSlug: () => ({ cannons: 12, crewCapacity: 40 }), residentShipVisualAsset: () => ({}),
      navalWeaponForShip, npcPortableWeaponItemIds: () => []
    };
    const profile = runtimeFunction("npcVisualShipProfile", context)("defender", "galleon");
    const placement = { x: 0, y: 0, vector: [1, 0, 0], heading: [0, 1, 0] };
    const state = runtimeFunction("createNpcVisualState", {
      normalizeTangentOrFallback: () => placement.heading, WORLD_NORTH: [0, 0, 1],
      ensureNpcShipCaptain() {}, npcVisualShipProfile: () => profile,
      nearestNpcNavigableVisualPoint: () => placement, NPC_VISUAL_RECOVERY_SEARCH_PX: 10,
      NAVAL_WEAPON_CANNON: "cannon", npcVisualMovementBucketForId: () => 0,
      createVisualPresentation: () => ({}), lastFrameMs: 0,
      setNpcShipVisualNavigation() {}, npcSeaRoutes: context.npcSeaRoutes
    })({ id: "defender", slug: "galleon", routeVector: [1, 0, 0], routeHeading: [0, 1, 0] }, placement);
    for (const remaining of Object.values(state.broadsideCooldowns)) {
      assert.equal(remaining, responding ? 5 : 0);
      if (responding) {
        assert.ok(advanceCannonReload(remaining, 4.9, 40, 12) > 0);
        assert.equal(advanceCannonReload(remaining, 5, 40, 12), 0);
      }
    }
  }
});

test("defenders engage the actual nearby attacker, including a privateer, without attacking distant ships", () => {
  const defender = { id: "defender", factionId: "portugal", x: 0, y: 0, combatGrace: false };
  const response = { targetCityId: "lisbon", phase: "responding" };
  const battery = { factionId: "portugal", engagedTargetIds: new Set(["player", "distant"]) };
  const state = createShipCombatState();
  const context = {
    npcVisualShips: new Map([[defender.id, defender]]), npcSeaRoutes: { shipById: new Map([[defender.id, { portResponse: response }]]) },
    shoreBatteryStates: new Map([["battery", battery]]), shoreBatteryId: () => "battery",
    requireEntityById: () => ({}), cityById: new Map(),
    combatEntityAimPoint: id => ({ x: id === "player" ? 10 : 1000, y: 0 }),
    distance2: (x, y, a, b) => (x - a) ** 2 + (y - b) ** 2,
    COMBAT_DETECTION_RADIUS_PX: 92, forceShipEngagement, shipCombatState: state
  };
  const update = runtimeFunction("forcePortDefenseEngagements", context);
  assert.equal(update(), true);
  assert.equal(state.engagements.size, 1);
  assert.equal([...state.engagements.values()][0].bId, "player");
  assert.equal(update(), false, "repeated frames preserve the engagement");
  response.phase = "returning";
  state.engagements.clear();
  assert.equal(update(), false);
});

test("a recalled local ship keeps existing reload work and repeated alerts neither reload nor reset the worker", () => {
  const visual = { navalWeapon: navalWeaponForShip({ cannons: 12 }), broadsideCooldowns: { port: 0, starboard: 8 } };
  let outcome = "warship-recalled";
  let resets = 0;
  const context = {
    npcSeaRoutes: { shipById: new Map([["defender", { currentPort: { cityId: "lisbon" }, plan: { startMinute: 100 } }]]) },
    npcVisualShips: new Map([["defender", visual]]), weatherClockMinutes: 100,
    orderNpcPortResponse: () => ({ outcome, shipId: "defender" }),
    npcVisualSnapshotCache: { reset() { resets++; } }, distantWorldApplyState: {},
    resetDistantWorldWorkerSchedule() {}
  };
  const order = runtimeFunction("orderPortNavalResponse", context);
  order({ cityId: "lisbon" }, "portugal", NPC_PORT_RESPONSE_ATTACK, 1540);
  assert.deepEqual(visual.broadsideCooldowns, { port: 5, starboard: 8 });
  visual.broadsideCooldowns.port = 2;
  outcome = "response-active";
  order({ cityId: "lisbon" }, "portugal", NPC_PORT_RESPONSE_ATTACK, 1540);
  assert.equal(visual.broadsideCooldowns.port, 2);
  assert.equal(resets, 1);
});
