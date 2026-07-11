import assert from "node:assert/strict";
import test from "node:test";

import {
  COMBAT_MODE_ATTACK,
  COMBAT_MODE_FLEE,
  COMBAT_DISENGAGE_RADIUS_PX,
  createShipCombatState,
  forceShipEngagement,
  npcShouldOfferSurrender,
  playerCombatAllegiance,
  updateShipCombatState
} from "./shipCombat.js";

test("pirates trigger many-to-many combat while merchants flee", () => {
  const state = createShipCombatState();
  const entities = [
    ship("pirate", "pirate", "pirate", 0, 0, 130, 12),
    ship("merchant-a", "merchant", "portugal", 30, 0, 110, 8),
    ship("merchant-b", "merchant", "spain", -30, 0, 90, 4)
  ];
  const result = updateShipCombatState(state, entities);
  assert.equal(result.engagementCount, 2);
  assert.equal(result.startedEngagements.length, 2);
  assert.equal(result.intents.get("pirate").mode, COMBAT_MODE_ATTACK);
  assert.equal(result.intents.get("pirate").enemyIds.length, 2);
  assert.equal(result.intents.get("merchant-a").mode, COMBAT_MODE_FLEE);
  assert.equal(result.intents.get("merchant-b").mode, COMBAT_MODE_FLEE);
});

test("warring warships fight but unescorted merchants do not initiate", () => {
  const war = createShipCombatState();
  const warResult = updateShipCombatState(war, [
    ship("english", "warship", "england", 0, 0, 190, 18),
    ship("french", "warship", "france", 40, 0, 190, 18)
  ]);
  assert.equal(warResult.engagementCount, 1);

  const trade = createShipCombatState();
  const tradeResult = updateShipCombatState(trade, [
    ship("english", "merchant", "england", 0, 0, 110, 8),
    ship("french", "merchant", "france", 40, 0, 110, 8)
  ]);
  assert.equal(tradeResult.engagementCount, 0);
});

test("damaged ships flee and sufficient distance ends combat", () => {
  const state = createShipCombatState();
  const pirate = ship("pirate", "pirate", "pirate", 0, 0, 20, 12, 130);
  const target = ship("target", "warship", "portugal", 30, 0, 190, 18);
  const active = updateShipCombatState(state, [pirate, target]);
  assert.equal(active.intents.get("pirate").mode, COMBAT_MODE_FLEE);

  target.x = COMBAT_DISENGAGE_RADIUS_PX + 1;
  const escaped = updateShipCombatState(state, [pirate, target]);
  assert.equal(escaped.engagementCount, 0);
  assert.deepEqual(escaped.startedEngagements, []);
});

test("player combat allegiance distinguishes enemies, allies, and neutral ships", () => {
  assert.equal(playerCombatAllegiance("england", "france", true), "enemy");
  assert.equal(playerCombatAllegiance("england", "spain", true), "friendly");
  assert.equal(playerCombatAllegiance("venice", "genoa", true), null);
  assert.equal(playerCombatAllegiance("england", "france", false), null);
});

test("merchants do not initiate against the player but warships do", () => {
  const merchantEncounter = updateShipCombatState(createShipCombatState(), [
    ship("player", "pirate", "pirate", 0, 0, 30, 14),
    ship("merchant", "merchant", "portugal", 30, 0, 8, 0)
  ]);
  const fishermanEncounter = updateShipCombatState(createShipCombatState(), [
    ship("player", "pirate", "pirate", 0, 0, 30, 14),
    ship("fisherman", "fisherman", "portugal", 30, 0, 8, 0)
  ]);
  const warshipEncounter = updateShipCombatState(createShipCombatState(), [
    ship("player", "pirate", "pirate", 0, 0, 30, 14),
    ship("warship", "warship", "portugal", 30, 0, 30, 18)
  ]);

  assert.equal(merchantEncounter.engagementCount, 0);
  assert.equal(fishermanEncounter.engagementCount, 0);
  assert.equal(warshipEncounter.engagementCount, 1);
});

test("the player can force an engagement regardless of diplomacy", () => {
  const state = createShipCombatState();
  assert.equal(forceShipEngagement(state, "player", "friendly"), true);
  assert.equal(forceShipEngagement(state, "player", "friendly"), false);
  assert.equal(state.engagements.get("friendly|player").playerInitiated, true);
});

test("surrender judgment weighs combat power, damage, and escape speed", () => {
  const player = threatShip("player", 30, 14, 0.04);
  assert.equal(npcShouldOfferSurrender(threatShip("slow-weak", 8, 0, 0.03), player), true);
  assert.equal(npcShouldOfferSurrender(threatShip("fast-marginal", 20, 8, 0.05), player), false);
  assert.equal(npcShouldOfferSurrender(threatShip("strong", 40, 24, 0.038), player), false);
  assert.equal(npcShouldOfferSurrender(threatShip("damaged", 5, 18, 0.045, 30), player), true);
});

function ship(id, role, factionId, x, y, hitPoints, cannons, maxHitPoints = hitPoints) {
  return { id, role, factionId, x, y, hitPoints, maxHitPoints, cannons, combatGrace: false };
}

function threatShip(id, hitPoints, cannons, topSpeedRad, maxHitPoints = hitPoints) {
  return {
    ...ship(id, "warship", id === "player" ? "pirate" : "portugal", 0, 0, hitPoints, cannons, maxHitPoints),
    topSpeedRad
  };
}
