import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_WAR,
  PIRATE_FACTION_ID,
  diplomacyBetween
} from "./factions.js";
import {
  NPC_ROLE_FISHERMAN,
  NPC_ROLE_MERCHANT,
  NPC_ROLE_PIRATE,
  NPC_ROLE_WHALER,
  NPC_ROLE_WARSHIP
} from "./npcSeaRoutes.js";
import { activeCombatCrew, crewWoundsForceSurrender } from "./combatWounds.js";

export const PLAYER_COMBAT_ID = "player";
export const COMBAT_DETECTION_RADIUS_PX = 92;
export const COMBAT_DISENGAGE_RADIUS_PX = 148;
export const PIRATE_PLAYER_DETECTION_RADIUS_PX = 68;
export const PIRATE_TREASURE_DETECTION_RADIUS_PX = 112;
export const WARSHIP_PIRATE_INTERCEPTION_RADIUS_PX = 138;
export const WARSHIP_PIRATE_DISENGAGE_RADIUS_PX = 190;
export const PLAYER_ALLY_REINFORCEMENT_RADIUS_PX = 170;
export const PLAYER_ALLY_REINFORCEMENT_TARGET_RADIUS_PX = 220;
export const PLAYER_ALLY_MIN_REINFORCEMENT_CANNONS = 4;
export const PLAYER_NPC_ATTACK_GRACE_SECONDS = 60;
export const COMBAT_MODE_ATTACK = "attack";
export const COMBAT_MODE_FLEE = "flee";
const COMBAT_SPATIAL_CELL_SIZE_PX = WARSHIP_PIRATE_INTERCEPTION_RADIUS_PX;
const COMBAT_SPATIAL_INDEX_MIN_ENTITIES = 12;

export function createShipCombatState() {
  return {
    engagements: new Map()
  };
}

export function updateShipCombatState(state, entities, relationBetween = diplomacyBetween) {
  if (!state?.engagements) throw new Error("Missing ship combat state");
  assertRelationResolver(relationBetween);
  if (!Array.isArray(entities)) throw new Error("Ship combat requires an entity list");
  const byId = new Map();
  for (const entity of entities) {
    validateEntity(entity);
    byId.set(entity.id, entity);
  }
  if (byId.size !== entities.length) throw new Error("Combat entities contain duplicate ids");
  let changed = false;
  const startedEngagements = [];

  for (const [key, engagement] of state.engagements) {
    const a = byId.get(engagement.aId);
    const b = byId.get(engagement.bId);
    if (!a || !b || a.combatGrace || b.combatGrace ||
        (!engagement.playerInitiated && playerSafePassageApplies(a, b) &&
          !playerPersonalHostilityApplies(a, b)) ||
        (!engagement.playerInitiated && !entitiesAreEnemies(a, b, relationBetween)) ||
        playerEnteredPortEndsEngagement(a, b) ||
        !withinDistance(a, b, engagementDisengageRadius(engagement, a, b))) {
      state.engagements.delete(key);
      changed = true;
    }
  }

  const candidateIndexes = nearbyCombatCandidateIndexes(entities);
  for (let index = 0; index < entities.length; index++) {
    const candidates = candidateIndexes?.[index] ?? null;
    const candidateCount = candidates?.length ?? entities.length - index - 1;
    for (let candidate = 0; candidate < candidateCount; candidate++) {
      const candidateIndex = candidates?.[candidate] ?? index + candidate + 1;
      const a = entities[index];
      const b = entities[candidateIndex];
      if (!withinDistance(a, b, combatDetectionRadius(a, b)) ||
          !validatedShipsTriggerCombat(a, b, relationBetween)) continue;
      const key = engagementKey(a.id, b.id);
      if (state.engagements.has(key)) continue;
      const engagement = { aId: a.id, bId: b.id };
      state.engagements.set(key, engagement);
      startedEngagements.push(engagement);
      changed = true;
    }
  }

  const reinforcements = addPlayerAllyReinforcements(
    state,
    entities,
    byId,
    relationBetween
  );
  if (reinforcements.length > 0) {
    startedEngagements.push(...reinforcements);
    changed = true;
  }

  const enemiesById = new Map();
  const playerReinforcementIds = new Set();
  for (const engagement of state.engagements.values()) {
    const a = byId.get(engagement.aId);
    const b = byId.get(engagement.bId);
    if (!a || !b) continue;
    appendEnemy(enemiesById, a.id, b);
    appendEnemy(enemiesById, b.id, a);
    if (engagement.alliedReinforcement === true) {
      playerReinforcementIds.add(a.id);
    }
  }

  const intents = new Map();
  for (const [entityId, enemies] of enemiesById) {
    const entity = byId.get(entityId);
    if (!entity) throw new Error(`Combat enemy index lost entity: ${entityId}`);
    const mode = combatMode(entity, enemies, playerReinforcementIds.has(entity.id));
    const target = chooseTarget(entity, enemies, mode);
    intents.set(entity.id, {
      mode,
      targetId: target.id,
      enemyIds: enemies.map((enemy) => enemy.id)
    });
  }
  return { changed, intents, engagementCount: state.engagements.size, startedEngagements };
}

function appendEnemy(enemiesById, entityId, enemy) {
  const enemies = enemiesById.get(entityId);
  if (enemies) enemies.push(enemy);
  else enemiesById.set(entityId, [enemy]);
}

function nearbyCombatCandidateIndexes(entities) {
  if (entities.length < COMBAT_SPATIAL_INDEX_MIN_ENTITIES) return null;
  const cells = new Map();
  const cellCoordinates = new Array(entities.length);
  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index];
    const cellX = Math.floor(entity.x / COMBAT_SPATIAL_CELL_SIZE_PX);
    const cellY = Math.floor(entity.y / COMBAT_SPATIAL_CELL_SIZE_PX);
    cellCoordinates[index] = { x: cellX, y: cellY };
    const key = `${cellX},${cellY}`;
    const occupants = cells.get(key);
    if (occupants) occupants.push(index);
    else cells.set(key, [index]);
  }

  const candidatesByIndex = Array.from({ length: entities.length }, () => []);
  for (let index = 0; index < entities.length; index++) {
    const cell = cellCoordinates[index];
    const nearbyIndices = candidatesByIndex[index];
    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        const occupants = cells.get(`${cell.x + offsetX},${cell.y + offsetY}`);
        if (!occupants) continue;
        for (const candidateIndex of occupants) {
          if (candidateIndex > index) nearbyIndices.push(candidateIndex);
        }
      }
    }
    nearbyIndices.sort((a, b) => a - b);
  }
  return candidatesByIndex;
}

export function shipsTriggerCombat(a, b, relationBetween = diplomacyBetween) {
  validateEntity(a);
  validateEntity(b);
  assertRelationResolver(relationBetween);
  return validatedShipsTriggerCombat(a, b, relationBetween);
}

function validatedShipsTriggerCombat(a, b, relationBetween) {
  if (a.id === b.id || a.combatGrace || b.combatGrace) return false;
  if (!entitiesAreEnemies(a, b, relationBetween)) return false;
  if (a.id === PLAYER_COMBAT_ID || b.id === PLAYER_COMBAT_ID) {
    const player = a.id === PLAYER_COMBAT_ID ? a : b;
    const npc = a.id === PLAYER_COMBAT_ID ? b : a;
    if (playerSafePassageApplies(player, npc) && !playerPersonalHostilityApplies(player, npc)) {
      return false;
    }
    if (player.npcAttackProtected) return false;
    if (player.portProtected) return false;
    if (npc.role === NPC_ROLE_PIRATE &&
        player.majorPortProtected &&
        npc.forceAttack !== true) {
      return false;
    }
    return npc.role === NPC_ROLE_PIRATE || npc.role === NPC_ROLE_WARSHIP;
  }
  return a.role === NPC_ROLE_PIRATE ||
    b.role === NPC_ROLE_PIRATE ||
    a.factionId === PIRATE_FACTION_ID ||
    b.factionId === PIRATE_FACTION_ID ||
    a.role === NPC_ROLE_WARSHIP ||
    b.role === NPC_ROLE_WARSHIP;
}

function entitiesAreEnemies(a, b, relationBetween) {
  return playerPersonalHostilityApplies(a, b) ||
    (a.factionId !== b.factionId &&
      relationBetween(a.factionId, b.factionId) === DIPLOMACY_WAR);
}

function playerPersonalHostilityApplies(a, b) {
  if (a.id !== PLAYER_COMBAT_ID && b.id !== PLAYER_COMBAT_ID) return false;
  const player = a.id === PLAYER_COMBAT_ID ? a : b;
  const npc = a.id === PLAYER_COMBAT_ID ? b : a;
  return player.hostileFactionIds.includes(npc.factionId);
}

function playerSafePassageApplies(a, b) {
  if (a.id !== PLAYER_COMBAT_ID && b.id !== PLAYER_COMBAT_ID) return false;
  const player = a.id === PLAYER_COMBAT_ID ? a : b;
  const npc = a.id === PLAYER_COMBAT_ID ? b : a;
  return player.safePassageFactionIds.includes(npc.factionId);
}

export function playerNpcAttackGraceIsActive(activePlaySeconds) {
  if (!Number.isFinite(activePlaySeconds) || activePlaySeconds < 0) {
    throw new Error(`Invalid active play time for combat grace: ${activePlaySeconds}`);
  }
  return activePlaySeconds < PLAYER_NPC_ATTACK_GRACE_SECONDS;
}

export function npcPrizeRecipientId(winnerId, npcShips, shoreBatteries) {
  if (typeof winnerId !== "string" || winnerId.length === 0) {
    throw new Error(`Invalid combat winner id: ${winnerId}`);
  }
  if (!npcShips || typeof npcShips.has !== "function") throw new Error("NPC prize resolution requires an NPC ship collection");
  if (!shoreBatteries || typeof shoreBatteries.has !== "function") {
    throw new Error("NPC prize resolution requires a shore battery collection");
  }
  if (winnerId === PLAYER_COMBAT_ID || shoreBatteries.has(winnerId)) return null;
  if (npcShips.has(winnerId)) return winnerId;
  throw new Error(`Unknown combat winner: ${winnerId}`);
}

function combatDetectionRadius(a, b) {
  if (isNpcWarshipPiratePair(a, b)) return WARSHIP_PIRATE_INTERCEPTION_RADIUS_PX;
  if (isPlayerPiratePair(a, b)) {
    const player = a.id === PLAYER_COMBAT_ID ? a : b;
    return player.carriesPirateTreasure
      ? PIRATE_TREASURE_DETECTION_RADIUS_PX
      : PIRATE_PLAYER_DETECTION_RADIUS_PX;
  }
  return COMBAT_DETECTION_RADIUS_PX;
}

function combatDisengageRadius(a, b) {
  return isNpcWarshipPiratePair(a, b)
    ? WARSHIP_PIRATE_DISENGAGE_RADIUS_PX
    : COMBAT_DISENGAGE_RADIUS_PX;
}

function engagementDisengageRadius(engagement, a, b) {
  return engagement.alliedReinforcement === true
    ? PLAYER_ALLY_REINFORCEMENT_TARGET_RADIUS_PX
    : combatDisengageRadius(a, b);
}

function addPlayerAllyReinforcements(state, entities, byId, relationBetween) {
  const player = byId.get(PLAYER_COMBAT_ID);
  if (!player || player.portProtected) return [];

  const playerEnemyIds = new Set();
  for (const engagement of state.engagements.values()) {
    if (engagement.aId === PLAYER_COMBAT_ID) playerEnemyIds.add(engagement.bId);
    else if (engagement.bId === PLAYER_COMBAT_ID) playerEnemyIds.add(engagement.aId);
  }
  if (playerEnemyIds.size === 0) return [];

  const reinforcements = [];
  for (const ally of entities) {
    if (!shipCanReinforcePlayer(ally, player, relationBetween)) continue;
    for (const enemyId of playerEnemyIds) {
      const enemy = byId.get(enemyId);
      if (!enemy ||
          !entitiesAreEnemies(ally, enemy, relationBetween) ||
          !withinDistance(ally, enemy, PLAYER_ALLY_REINFORCEMENT_TARGET_RADIUS_PX)) {
        continue;
      }
      const key = engagementKey(ally.id, enemy.id);
      if (state.engagements.has(key)) continue;
      const engagement = {
        aId: ally.id,
        bId: enemy.id,
        alliedReinforcement: true
      };
      state.engagements.set(key, engagement);
      reinforcements.push(engagement);
    }
  }
  return reinforcements;
}

function shipCanReinforcePlayer(ally, player, relationBetween) {
  if (
    ally.id === PLAYER_COMBAT_ID ||
    ally.combatGrace ||
    player.hostileFactionIds.includes(ally.factionId) ||
    relationBetween(player.factionId, ally.factionId) !== DIPLOMACY_ALLY ||
    !withinDistance(player, ally, PLAYER_ALLY_REINFORCEMENT_RADIUS_PX) ||
    ally.hitPoints / ally.maxHitPoints <= 0.36
  ) {
    return false;
  }
  return ally.role === NPC_ROLE_WARSHIP ||
    ally.role === NPC_ROLE_PIRATE ||
    ally.cannons >= PLAYER_ALLY_MIN_REINFORCEMENT_CANNONS;
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

function playerEnteredPortEndsEngagement(a, b) {
  if (a.id !== PLAYER_COMBAT_ID && b.id !== PLAYER_COMBAT_ID) return false;
  const player = a.id === PLAYER_COMBAT_ID ? a : b;
  return Boolean(player.portProtected);
}

export function forceShipEngagement(state, aId, bId) {
  if (!state?.engagements) throw new Error("Missing ship combat state");
  if (typeof aId !== "string" || aId === "" || typeof bId !== "string" || bId === "") {
    throw new Error("Forced ship engagement requires two ship ids");
  }
  if (aId === bId) throw new Error(`Cannot engage ship ${aId} with itself`);
  const key = engagementKey(aId, bId);
  const existing = state.engagements.get(key);
  if (existing) {
    if (existing.playerInitiated === true) return false;
    existing.playerInitiated = true;
    return true;
  }
  state.engagements.set(key, { aId, bId, playerInitiated: true });
  return true;
}

export function combatPower(entity) {
  validateEntity(entity);
  return validatedCombatPower(entity);
}

export function engagementKey(aId, bId) {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

export function combatantsShareEnemy(state, aId, bId) {
  if (!state?.engagements || !(state.engagements instanceof Map)) {
    throw new Error("Shared-enemy attribution requires ship combat state");
  }
  if (typeof aId !== "string" || aId === "" || typeof bId !== "string" || bId === "") {
    throw new Error("Shared-enemy attribution requires two combatant ids");
  }
  if (aId === bId) return false;

  const aEnemies = new Set();
  for (const engagement of state.engagements.values()) {
    if (engagement.aId === aId) aEnemies.add(engagement.bId);
    else if (engagement.bId === aId) aEnemies.add(engagement.aId);
  }
  if (aEnemies.size === 0) return false;
  for (const engagement of state.engagements.values()) {
    const bEnemy = engagement.aId === bId
      ? engagement.bId
      : engagement.bId === bId
        ? engagement.aId
        : null;
    if (bEnemy !== null && aEnemies.has(bEnemy)) return true;
  }
  return false;
}

export function playerCombatAllegiance(
  playerFactionId,
  otherFactionId,
  playerInCombat,
  relationBetween = diplomacyBetween
) {
  if (!playerInCombat) return null;
  assertRelationResolver(relationBetween);
  const relation = relationBetween(playerFactionId, otherFactionId);
  if (relation === DIPLOMACY_WAR || relation === DIPLOMACY_HOSTILE) return "enemy";
  if (relation === DIPLOMACY_ALLY || relation === DIPLOMACY_FRIENDLY) return "friendly";
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
  const npcPower = validatedCombatPower(npc);
  const playerPower = validatedCombatPower(player);
  const health = npc.hitPoints / npc.maxHitPoints;
  const crewBroken = Number.isInteger(npc.crew) && Number.isInteger(npc.woundedCrew)
    ? crewWoundsForceSurrender(npc.crew, npc.woundedCrew)
    : false;
  const badlyDamaged = health <= 0.3;
  const hopelesslyOutmatched = playerPower >= npcPower * 2.4;
  const outmatched = playerPower >= npcPower * 1.35;
  const cannotOutrunPlayer = npc.topSpeedRad <= player.topSpeedRad * 0.97;
  return crewBroken || badlyDamaged || hopelesslyOutmatched || (outmatched && cannotOutrunPlayer);
}

function combatMode(entity, enemies, reinforcingPlayer = false) {
  if (entity.forceAttack === true) return COMBAT_MODE_ATTACK;
  const health = entity.hitPoints / entity.maxHitPoints;
  if (health <= 0.36) return COMBAT_MODE_FLEE;
  if (reinforcingPlayer) return COMBAT_MODE_ATTACK;
  if (
    entity.role === NPC_ROLE_MERCHANT ||
    entity.role === NPC_ROLE_FISHERMAN ||
    entity.role === NPC_ROLE_WHALER
  ) return COMBAT_MODE_FLEE;
  let strongestEnemy = 0;
  for (const enemy of enemies) {
    strongestEnemy = Math.max(strongestEnemy, validatedCombatPower(enemy));
  }
  if (validatedCombatPower(entity) < strongestEnemy * 0.56) return COMBAT_MODE_FLEE;
  return COMBAT_MODE_ATTACK;
}

function chooseTarget(entity, enemies, mode) {
  let target = enemies[0];
  if (mode === COMBAT_MODE_FLEE) {
    for (let index = 1; index < enemies.length; index++) {
      const candidate = enemies[index];
      const powerDifference = validatedCombatPower(candidate) - validatedCombatPower(target);
      if (powerDifference > 0 ||
          (powerDifference === 0 && distanceSquared(entity, candidate) < distanceSquared(entity, target))) {
        target = candidate;
      }
    }
    return target;
  }
  for (let index = 1; index < enemies.length; index++) {
    const candidate = enemies[index];
    const candidateHealth = candidate.hitPoints / candidate.maxHitPoints;
    const targetHealth = target.hitPoints / target.maxHitPoints;
    if (candidateHealth < targetHealth ||
        (candidateHealth === targetHealth &&
          distanceSquared(entity, candidate) < distanceSquared(entity, target))) {
      target = candidate;
    }
  }
  return target;
}

function validateEntity(entity) {
  if (!entity || typeof entity.id !== "string" || entity.id === "") throw new Error("Combat ship needs an id");
  if (![
    NPC_ROLE_MERCHANT,
    NPC_ROLE_FISHERMAN,
    NPC_ROLE_WHALER,
    NPC_ROLE_WARSHIP,
    NPC_ROLE_PIRATE
  ].includes(entity.role)) {
    throw new Error(`Invalid combat role for ${entity.id}: ${entity.role}`);
  }
  if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) throw new Error(`Invalid combat position: ${entity.id}`);
  if (!Number.isFinite(entity.hitPoints) || entity.hitPoints <= 0) throw new Error(`Invalid combat hull: ${entity.id}`);
  if (!Number.isFinite(entity.maxHitPoints) || entity.maxHitPoints < entity.hitPoints) {
    throw new Error(`Invalid maximum hull: ${entity.id}`);
  }
  if (!Number.isInteger(entity.cannons) || entity.cannons < 0) throw new Error(`Invalid cannon count: ${entity.id}`);
  if (entity.crew !== undefined || entity.woundedCrew !== undefined) {
    if (!Number.isInteger(entity.crew) || entity.crew <= 0 ||
        !Number.isInteger(entity.woundedCrew) || entity.woundedCrew < 0 ||
        entity.woundedCrew > entity.crew) {
      throw new Error(`Invalid combat crew for ${entity.id}: ${entity.woundedCrew}/${entity.crew}`);
    }
  }
  if (typeof entity.npcAttackProtected !== "boolean") {
    throw new Error(`Invalid NPC attack protection for ${entity.id}: ${entity.npcAttackProtected}`);
  }
  if (entity.forceAttack !== undefined && typeof entity.forceAttack !== "boolean") {
    throw new Error(`Invalid forced-attack flag for ${entity.id}: ${entity.forceAttack}`);
  }
  if (entity.id === PLAYER_COMBAT_ID) {
    if (!Array.isArray(entity.safePassageFactionIds) ||
        entity.safePassageFactionIds.some((factionId) => typeof factionId !== "string" || factionId === "")) {
      throw new Error("Player combat entity requires safe passage faction ids");
    }
    if (!Array.isArray(entity.hostileFactionIds) ||
        entity.hostileFactionIds.some((factionId) => typeof factionId !== "string" || factionId === "")) {
      throw new Error("Player combat entity requires personally hostile faction ids");
    }
    if (typeof entity.carriesPirateTreasure !== "boolean") {
      throw new Error("Player combat entity requires pirate treasure state");
    }
  }
  return entity;
}

function assertRelationResolver(relationBetween) {
  if (typeof relationBetween !== "function") throw new Error("Ship combat requires a diplomacy resolver");
}

function validatedCombatPower(entity) {
  const activeCrew = Number.isInteger(entity.crew)
    ? activeCombatCrew(entity.crew, entity.woundedCrew)
    : 0;
  return entity.hitPoints * 10 + entity.cannons * 9 + activeCrew * 2;
}

function withinDistance(a, b, radius) {
  return distanceSquared(a, b) <= radius * radius;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
