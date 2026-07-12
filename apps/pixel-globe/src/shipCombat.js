import {
  DIPLOMACY_ALLY,
  DIPLOMACY_WAR,
  PIRATE_FACTION_ID,
  diplomacyBetween
} from "./factions.js";
import {
  NPC_ROLE_FISHERMAN,
  NPC_ROLE_MERCHANT,
  NPC_ROLE_PIRATE,
  NPC_ROLE_WARSHIP
} from "./npcSeaRoutes.js";

export const PLAYER_COMBAT_ID = "player";
export const COMBAT_DETECTION_RADIUS_PX = 92;
export const COMBAT_DISENGAGE_RADIUS_PX = 148;
export const PIRATE_PLAYER_DETECTION_RADIUS_PX = 68;
export const WARSHIP_PIRATE_INTERCEPTION_RADIUS_PX = 138;
export const WARSHIP_PIRATE_DISENGAGE_RADIUS_PX = 190;
export const COMBAT_MODE_ATTACK = "attack";
export const COMBAT_MODE_FLEE = "flee";

export function createShipCombatState() {
  return {
    engagements: new Map()
  };
}

export function updateShipCombatState(state, entities) {
  if (!state?.engagements) throw new Error("Missing ship combat state");
  const byId = new Map(entities.map(validateEntity).map((entity) => [entity.id, entity]));
  if (byId.size !== entities.length) throw new Error("Combat entities contain duplicate ids");
  let changed = false;
  const startedEngagements = [];

  for (const [key, engagement] of [...state.engagements.entries()]) {
    const a = byId.get(engagement.aId);
    const b = byId.get(engagement.bId);
    if (!a || !b || a.combatGrace || b.combatGrace || protectedPortEndsPirateAttack(a, b) ||
        distance(a, b) > combatDisengageRadius(a, b)) {
      state.engagements.delete(key);
      changed = true;
    }
  }

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (!shipsTriggerCombat(a, b) || distance(a, b) > combatDetectionRadius(a, b)) continue;
      const key = engagementKey(a.id, b.id);
      if (state.engagements.has(key)) continue;
      const engagement = { aId: a.id, bId: b.id };
      state.engagements.set(key, engagement);
      startedEngagements.push(engagement);
      changed = true;
    }
  }

  const enemiesById = new Map(entities.map((entity) => [entity.id, []]));
  for (const engagement of state.engagements.values()) {
    const a = byId.get(engagement.aId);
    const b = byId.get(engagement.bId);
    if (!a || !b) continue;
    enemiesById.get(a.id).push(b);
    enemiesById.get(b.id).push(a);
  }

  const intents = new Map();
  for (const entity of entities) {
    const enemies = enemiesById.get(entity.id);
    if (!enemies || enemies.length === 0) continue;
    const target = chooseTarget(entity, enemies);
    intents.set(entity.id, {
      mode: combatMode(entity, enemies),
      targetId: target.id,
      enemyIds: enemies.map((enemy) => enemy.id)
    });
  }
  return { changed, intents, engagementCount: state.engagements.size, startedEngagements };
}

export function shipsTriggerCombat(a, b) {
  validateEntity(a);
  validateEntity(b);
  if (a.id === b.id || a.combatGrace || b.combatGrace || a.factionId === b.factionId) return false;
  if (diplomacyBetween(a.factionId, b.factionId) !== DIPLOMACY_WAR) return false;
  if (a.id === PLAYER_COMBAT_ID || b.id === PLAYER_COMBAT_ID) {
    const player = a.id === PLAYER_COMBAT_ID ? a : b;
    const npc = a.id === PLAYER_COMBAT_ID ? b : a;
    if (npc.role === NPC_ROLE_PIRATE && player.majorPortProtected) return false;
    return npc.role === NPC_ROLE_PIRATE || npc.role === NPC_ROLE_WARSHIP;
  }
  return a.role === NPC_ROLE_PIRATE ||
    b.role === NPC_ROLE_PIRATE ||
    a.factionId === PIRATE_FACTION_ID ||
    b.factionId === PIRATE_FACTION_ID ||
    a.role === NPC_ROLE_WARSHIP ||
    b.role === NPC_ROLE_WARSHIP;
}

function combatDetectionRadius(a, b) {
  if (isNpcWarshipPiratePair(a, b)) return WARSHIP_PIRATE_INTERCEPTION_RADIUS_PX;
  if (isPlayerPiratePair(a, b)) return PIRATE_PLAYER_DETECTION_RADIUS_PX;
  return COMBAT_DETECTION_RADIUS_PX;
}

function combatDisengageRadius(a, b) {
  return isNpcWarshipPiratePair(a, b)
    ? WARSHIP_PIRATE_DISENGAGE_RADIUS_PX
    : COMBAT_DISENGAGE_RADIUS_PX;
}

function isNpcWarshipPiratePair(a, b) {
  if (a.id === PLAYER_COMBAT_ID || b.id === PLAYER_COMBAT_ID) return false;
  return (a.role === NPC_ROLE_WARSHIP && b.role === NPC_ROLE_PIRATE) ||
    (a.role === NPC_ROLE_PIRATE && b.role === NPC_ROLE_WARSHIP);
}

function isPlayerPiratePair(a, b) {
  if (a.id !== PLAYER_COMBAT_ID && b.id !== PLAYER_COMBAT_ID) return false;
  const npc = a.id === PLAYER_COMBAT_ID ? b : a;
  return npc.role === NPC_ROLE_PIRATE;
}

function protectedPortEndsPirateAttack(a, b) {
  if (!isPlayerPiratePair(a, b)) return false;
  const player = a.id === PLAYER_COMBAT_ID ? a : b;
  return Boolean(player.majorPortProtected);
}

export function forceShipEngagement(state, aId, bId) {
  if (!state?.engagements) throw new Error("Missing ship combat state");
  if (typeof aId !== "string" || aId === "" || typeof bId !== "string" || bId === "") {
    throw new Error("Forced ship engagement requires two ship ids");
  }
  if (aId === bId) throw new Error(`Cannot engage ship ${aId} with itself`);
  const key = engagementKey(aId, bId);
  if (state.engagements.has(key)) return false;
  state.engagements.set(key, { aId, bId, playerInitiated: true });
  return true;
}

export function combatPower(entity) {
  validateEntity(entity);
  return entity.hitPoints * 10 + entity.cannons * 9;
}

export function engagementKey(aId, bId) {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

export function playerCombatAllegiance(playerFactionId, otherFactionId, playerInCombat) {
  if (!playerInCombat) return null;
  const relation = diplomacyBetween(playerFactionId, otherFactionId);
  if (relation === DIPLOMACY_WAR) return "enemy";
  if (relation === DIPLOMACY_ALLY) return "friendly";
  return null;
}

export function npcShouldOfferSurrender(npc, player) {
  validateEntity(npc);
  validateEntity(player);
  if (!Number.isFinite(npc.topSpeedRad) || npc.topSpeedRad <= 0) {
    throw new Error(`Invalid top speed for surrendering ship ${npc.id}`);
  }
  if (!Number.isFinite(player.topSpeedRad) || player.topSpeedRad <= 0) {
    throw new Error(`Invalid top speed for threatening ship ${player.id}`);
  }
  const npcPower = combatPower(npc);
  const playerPower = combatPower(player);
  const health = npc.hitPoints / npc.maxHitPoints;
  const badlyDamaged = health <= 0.3;
  const hopelesslyOutmatched = playerPower >= npcPower * 2.4;
  const outmatched = playerPower >= npcPower * 1.35;
  const cannotOutrunPlayer = npc.topSpeedRad <= player.topSpeedRad * 0.97;
  return badlyDamaged || hopelesslyOutmatched || (outmatched && cannotOutrunPlayer);
}

function combatMode(entity, enemies) {
  if (entity.role === NPC_ROLE_MERCHANT || entity.role === NPC_ROLE_FISHERMAN) return COMBAT_MODE_FLEE;
  const health = entity.hitPoints / entity.maxHitPoints;
  if (health <= 0.36) return COMBAT_MODE_FLEE;
  const strongestEnemy = Math.max(...enemies.map(combatPower));
  if (combatPower(entity) < strongestEnemy * 0.56) return COMBAT_MODE_FLEE;
  return COMBAT_MODE_ATTACK;
}

function chooseTarget(entity, enemies) {
  if (combatMode(entity, enemies) === COMBAT_MODE_FLEE) {
    return [...enemies].sort((a, b) => combatPower(b) - combatPower(a) || distance(entity, a) - distance(entity, b))[0];
  }
  return [...enemies].sort((a, b) => (
    a.hitPoints / a.maxHitPoints - b.hitPoints / b.maxHitPoints ||
    distance(entity, a) - distance(entity, b)
  ))[0];
}

function validateEntity(entity) {
  if (!entity || typeof entity.id !== "string" || entity.id === "") throw new Error("Combat ship needs an id");
  if (![NPC_ROLE_MERCHANT, NPC_ROLE_FISHERMAN, NPC_ROLE_WARSHIP, NPC_ROLE_PIRATE].includes(entity.role)) {
    throw new Error(`Invalid combat role for ${entity.id}: ${entity.role}`);
  }
  if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) throw new Error(`Invalid combat position: ${entity.id}`);
  if (!Number.isFinite(entity.hitPoints) || entity.hitPoints <= 0) throw new Error(`Invalid combat hull: ${entity.id}`);
  if (!Number.isFinite(entity.maxHitPoints) || entity.maxHitPoints < entity.hitPoints) {
    throw new Error(`Invalid maximum hull: ${entity.id}`);
  }
  if (!Number.isInteger(entity.cannons) || entity.cannons < 0) throw new Error(`Invalid cannon count: ${entity.id}`);
  return entity;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
