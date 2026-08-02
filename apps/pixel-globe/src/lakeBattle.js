import {
  accurateBroadsideShotIndex,
  advanceCannonReload,
  navalWeaponForShip,
  navalWeaponUsesBroadside,
  NAVAL_WEAPON_CANNON
} from "./navalWeapons.js";
import {
  PORTABLE_PROJECTILE_CANNON,
  activePortableWeaponAssignments,
  portableWeaponItemById,
  representativePortableWeaponItemIdsForShip
} from "./portableWeapons.js";
import { activeCombatCrew, applyCrewWounds, crewWoundsForceSurrender } from "./combatWounds.js";
import {
  STANDARD_CANNON_EQUIPMENT_ID,
  cannonWeaponWithEquipment
} from "./cannonEquipment.js";
import { advanceCannonSmokeBursts, createCannonSmokeBurst } from "./cannonSmoke.js";
import { advanceHullSplinterBursts, createHullSplinterBurst } from "./hullSplinters.js";
import { resolveShipCollision } from "./shipCollision.js";
import { firstNavalProjectileHit, navalProjectilePoint } from "./navalProjectile.js";
import {
  pointInShipFootprint,
  shipFootprintCenter,
  shipFootprintFrame,
  shipFootprintRadius,
  translatedShipFootprint
} from "./shipFootprint.js";
import {
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  rowingCrewRatio,
  sailingEfficiencyForAlignment,
  shipDragFactor,
  shipPropulsionPerformance
} from "./shipPropulsion.js";
import {
  SHIP_PROPULSION_SAIL,
  SHIP_STATS,
  shipHullResistsDamage,
  shipLabelForSlug,
  shipStatsForSlug
} from "./shipStats.js";
import { shipTurnRate } from "./shipTurning.js";
import {
  chooseNpcObstacleAvoidanceDirection,
  chooseNpcSailingDirection
} from "./npcVisualNavigation.js";
import {
  buildLakeBattleMapWaterMask,
  createLakeBattleMap,
  lakeBattleMapCoastalSpawnPoint,
  lakeBattleMapSpawnPoint,
  lakeBattleMapWaterAt
} from "./lakeBattleMap.js";
import {
  SHORE_BATTERY_HIT_POINTS_PER_GUN,
  SHORE_BATTERY_RELOAD_SECONDS
} from "./shoreBatteries.js";

export const LAKE_BATTLE_PHASE_ACTIVE = "active";
export const LAKE_BATTLE_PHASE_FINISHED = "finished";
export const LAKE_BATTLE_PLAYER_ID = "lake-player";
export const LAKE_BATTLE_ENEMY_ID = "lake-enemy";
export const LAKE_BATTLE_DEFAULT_SEED = 0x4c414b45;
export const LAKE_BATTLE_CITY_SLUG = "city";
export const LAKE_BATTLE_WIND = Object.freeze({ directionRad: Math.PI * 0.69, strength: 0.54 });
export const LAKE_BATTLE_SHIP_SLUGS = Object.freeze(SHIP_STATS
  .map((stats) => stats.slug));
export const LAKE_BATTLE_ENEMY_SLUGS = Object.freeze([...LAKE_BATTLE_SHIP_SLUGS, LAKE_BATTLE_CITY_SLUG]);

const LAKE_BATTLE_CITY_STATS = Object.freeze({
  slug: LAKE_BATTLE_CITY_SLUG,
  cannons: 4,
  batteryGuns: 2,
  hitPoints: 2 * SHORE_BATTERY_HIT_POINTS_PER_GUN,
  crewCapacity: 24,
  crewProtection: 65,
  mass: 48,
  accelerationRad: 0,
  topSpeedRad: 0,
  turnRateRad: 0,
  upwindStallAngleRad: 0,
  propulsion: null
});

const PIXELS_PER_RADIAN = 2450;
const BROADSIDE_HALF_ANGLE_RAD = 0.62;
const CANNON_RANGE_PX = 74;
const CANNON_SPEED_PX = 88;
const CANNON_ARC_HEIGHT_PX = 13;
const CANNON_SPREAD_RAD = 0.18;
const SPLASH_TTL_SECONDS = 0.46;
const IMPACT_TTL_SECONDS = 0.32;
const MAX_PROJECTILES = 160;
const MAX_EFFECTS = 128;
const LAKE_BATTLE_MAP_SEED_SALT = 0x6d61702d;
const LAKE_BATTLE_WIND_SEED_SALT = 0x77696e64;
const SHORE_SLIDE_ANGLES = Object.freeze([
  0,
  Math.PI / 12,
  -Math.PI / 12,
  Math.PI / 6,
  -Math.PI / 6,
  Math.PI / 4,
  -Math.PI / 4,
  Math.PI / 2,
  -Math.PI / 2
]);
const ENEMY_OBSTACLE_PROBE_DISTANCES_PX = Object.freeze([12, 24, 40, 60, 84, 112]);
const ENEMY_OBSTACLE_ENTER_CLEARANCE_PX = 60;
const ENEMY_OBSTACLE_REJOIN_CLEARANCE_PX = 84;
const ENEMY_OBSTACLE_REJOIN_DECISIONS = 3;
const ENEMY_NAVIGATION_DECISION_SECONDS = 0.12;
const ENEMY_TACK_LEG_PX = 72;
const CITY_COMBAT_OFFSET_Y = 8;
const SHORE_ROTATION_ESCAPE_SEARCH_PX = 24;
const SHORE_ROTATION_ESCAPE_DIRECTIONS = 16;

export function createLakeBattle({
  width,
  height,
  playerSlug,
  enemySlug,
  playerCannonEquipmentId = STANDARD_CANNON_EQUIPMENT_ID,
  enemyCannonEquipmentId = STANDARD_CANNON_EQUIPMENT_ID,
  playerPortableWeaponItemIds = null,
  enemyPortableWeaponItemIds = null,
  shipFootprints,
  seed = LAKE_BATTLE_DEFAULT_SEED
}) {
  validateArenaSize(width, height);
  validateBattleShipSlug(playerSlug);
  validateBattleEnemySlug(enemySlug);
  if (!Number.isInteger(seed)) throw new Error(`Lake battle seed must be an integer: ${seed}`);
  validateLakeBattleShipFootprints(shipFootprints, playerSlug, enemySlug);
  const map = createLakeBattleArenaMap(width, height, seed);
  const playerStats = lakeBattleCombatantStats(playerSlug);
  const enemyStats = lakeBattleCombatantStats(enemySlug);
  const playerSpawn = lakeBattleMapSpawnPoint(map, "player", lakeBattleSlugFootprintRadius(shipFootprints, playerSlug));
  const enemySpawn = enemySlug === LAKE_BATTLE_CITY_SLUG
    ? lakeBattleMapCoastalSpawnPoint(map)
    : lakeBattleMapSpawnPoint(map, "enemy", lakeBattleSlugFootprintRadius(shipFootprints, enemySlug));

  const state = {
    width,
    height,
    phase: LAKE_BATTLE_PHASE_ACTIVE,
    outcome: null,
    elapsedSeconds: 0,
    map,
    waterMask: buildLakeBattleMapWaterMask(map),
    wind: createLakeBattleWind(seed ^ LAKE_BATTLE_WIND_SEED_SALT),
    shipFootprints,
    player: createBattleShip(
      LAKE_BATTLE_PLAYER_ID,
      playerSlug,
      playerSpawn.x,
      playerSpawn.y,
      -0.18,
      playerCannonEquipmentId,
      playerPortableWeaponItemIds
    ),
    enemy: createBattleCombatant(
      LAKE_BATTLE_ENEMY_ID,
      enemySlug,
      enemySpawn.x,
      enemySpawn.y,
      Math.PI - 0.18,
      enemyCannonEquipmentId,
      enemyPortableWeaponItemIds
    ),
    projectiles: [],
    cannonSmokeBursts: [],
    hullSplinterBursts: [],
    splashes: [],
    impacts: [],
    events: [],
    randomSeed: seed >>> 0,
    projectileSerial: 1,
    collisionCooldown: 0
  };
  assertShipFitsLake(state, state.player);
  assertShipFitsLake(state, state.enemy);
  return state;
}

export function createLakeBattleArenaMap(width, height, seed = LAKE_BATTLE_DEFAULT_SEED) {
  if (!Number.isInteger(seed)) throw new Error(`Lake battle seed must be an integer: ${seed}`);
  return createLakeBattleMap(width, height, seed ^ LAKE_BATTLE_MAP_SEED_SALT);
}

export function updateLakeBattle(state, dt, input = {}) {
  validateBattleState(state);
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.1) throw new Error(`Invalid lake battle timestep: ${dt}`);
  if (state.phase !== LAKE_BATTLE_PHASE_ACTIVE || dt === 0) return false;

  state.elapsedSeconds += dt;
  updateLakeBattleWind(state);
  state.collisionCooldown = Math.max(0, state.collisionCooldown - dt);
  updateCooldowns(state.player, dt);
  updateCooldowns(state.enemy, dt);

  const playerDesiredHeading = input.desiredHeadingRad === null || input.desiredHeadingRad === undefined
    ? null
    : normalizeAngle(input.desiredHeadingRad);
  if (playerDesiredHeading !== null && !Number.isFinite(playerDesiredHeading)) {
    throw new Error(`Invalid player lake battle heading: ${input.desiredHeadingRad}`);
  }
  const playerRowingRequested = input.rowingRequested ?? (
    input.desiredHeadingRad !== null && input.desiredHeadingRad !== undefined
  );
  if (typeof playerRowingRequested !== "boolean") {
    throw new Error(`Invalid player lake battle rowing request: ${input.rowingRequested}`);
  }

  updateBattleShipMotion(state, state.player, playerDesiredHeading, playerRowingRequested, dt);
  updateBattleShipMotion(state, state.enemy, enemyDesiredHeading(state, dt), true, dt);
  resolveBattleShipCollision(state);

  if (input.firePort) fireLakeBattleBroadside(state, LAKE_BATTLE_PLAYER_ID, "port");
  if (input.fireStarboard) fireLakeBattleBroadside(state, LAKE_BATTLE_PLAYER_ID, "starboard");
  fireLakeBattlePortableWeapons(state, LAKE_BATTLE_PLAYER_ID);
  fireLakeBattlePortableWeapons(state, LAKE_BATTLE_ENEMY_ID);
  fireEnemyWhenAligned(state);
  updateProjectiles(state, dt);
  updateEffects(state, dt);
  finishBattleIfNeeded(state);
  return true;
}

export function resizeLakeBattle(state, width, height) {
  validateBattleState(state);
  validateArenaSize(width, height);
  if (state.width === width && state.height === height) return false;
  const scaleX = width / state.width;
  const scaleY = height / state.height;
  const scalePoint = (point) => {
    point.x *= scaleX;
    point.y *= scaleY;
  };
  for (const ship of [state.player, state.enemy]) {
    scalePoint(ship);
    for (const wake of ship.wake) scalePoint(wake);
    if (ship.lastWakePoint) scalePoint(ship.lastWakePoint);
  }
  for (const projectile of state.projectiles) {
    projectile.startX *= scaleX;
    projectile.startY *= scaleY;
    projectile.targetX *= scaleX;
    projectile.targetY *= scaleY;
    projectile.arcHeight *= Math.min(scaleX, scaleY);
  }
  for (const effect of [
    ...state.cannonSmokeBursts,
    ...state.hullSplinterBursts,
    ...state.splashes,
    ...state.impacts
  ]) scalePoint(effect);
  state.width = width;
  state.height = height;
  state.map = createLakeBattleMap(width, height, state.map.seed);
  state.waterMask = buildLakeBattleMapWaterMask(state.map);
  relocateShipToNavigableMapCell(state, state.player);
  relocateShipToNavigableMapCell(state, state.enemy);
  assertShipFitsLake(state, state.player);
  assertShipFitsLake(state, state.enemy);
  return true;
}

export function fireLakeBattleBroadside(state, shipId, sideName) {
  validateBattleState(state);
  if (state.phase !== LAKE_BATTLE_PHASE_ACTIVE) return false;
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown lake battle broadside: ${sideName}`);
  }
  const ship = lakeBattleShipById(state, shipId);
  if (!navalWeaponUsesBroadside(ship.weapon)) return false;
  const target = ship.id === LAKE_BATTLE_PLAYER_ID ? state.enemy : state.player;
  if (ship.cooldowns[sideName] > 0 || ship.hitPoints <= 0) return false;

  ship.cooldowns[sideName] = ship.weapon.reloadSeconds;
  const count = Math.max(1, Math.ceil(ship.stats.cannons / 2));
  const side = lakeBattleBroadsideDirection(ship, sideName);
  const sourcePoint = lakeBattleCombatantPoint(ship);
  const targetPoint = lakeBattleCombatantAimPoint(state, target);
  const toTarget = normalizedDirection(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
  const targetDistance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
  const range = lakeBattleWeaponRange(ship);
  const aimed = targetDistance <= range * 1.08 && dot2(side, toTarget) >= Math.cos(BROADSIDE_HALF_ANGLE_RAD);
  const trueShotIndex = accurateBroadsideShotIndex(count);

  for (let index = 0; index < count; index++) {
    const random = nextBattleRandom(state);
    const rangeRandom = nextBattleRandom(state);
    const trueShot = index === trueShotIndex;
    const lineT = count === 1 ? 0 : index / (count - 1) - 0.5;
    const heading = lakeBattleHeadingVector(ship);
    const startX = sourcePoint.x + heading.x * lineT * 13 + side.x * 8;
    const startY = sourcePoint.y + heading.y * lineT * 13 + side.y * 8;
    const spread = trueShot ? 0 : (random - 0.5) * 2 * CANNON_SPREAD_RAD;
    const aim = rotate2(aimed ? toTarget : side, spread);
    const projectileRange = aimed
      ? targetDistance + (rangeRandom - 0.5) * 7
      : range * (0.82 + rangeRandom * 0.28);
    const targetX = aimed && trueShot ? targetPoint.x : startX + aim.x * projectileRange;
    const targetY = aimed && trueShot ? targetPoint.y : startY + aim.y * projectileRange;
    const actualRange = Math.hypot(targetX - startX, targetY - startY);
    addLakeBattleProjectile(state, ship, {
      id: state.projectileSerial++,
      ownerId: ship.id,
      targetId: aimed ? target.id : null,
      kind: ship.weapon.kind,
      startX,
      startY,
      targetX,
      targetY,
      age: 0,
      duration: Math.max(0.12, actualRange / (CANNON_SPEED_PX * ship.weapon.speedScale)),
      arcHeight: (CANNON_ARC_HEIGHT_PX + nextBattleRandom(state) * 4) * ship.weapon.arcHeightScale,
      damage: ship.weapon.damage,
      seed: Math.floor(nextBattleRandom(state) * 0xffffffff) >>> 0
    });
  }
  finishLakeBattleVolley(state, ship, count);
  return true;
}

export function fireLakeBattlePortableWeapons(state, shipId) {
  validateBattleState(state);
  if (state.phase !== LAKE_BATTLE_PHASE_ACTIVE) return false;
  const ship = lakeBattleShipById(state, shipId);
  if (ship.hitPoints <= 0 || ship.surrendered) return false;
  const target = ship.id === LAKE_BATTLE_PLAYER_ID ? state.enemy : state.player;
  if (target.hitPoints <= 0 || target.surrendered) return false;
  const sourcePoint = lakeBattleCombatantPoint(ship);
  const targetPoint = lakeBattleCombatantAimPoint(state, target);
  const targetDistance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
  if (targetDistance <= 1e-6) return false;
  const assignments = activePortableWeaponAssignments({
    ownedItemIds: ship.portableWeaponItemIds,
    activeCrew: activeCombatCrew(ship.crew, ship.woundedCrew),
    shipStats: ship.stats,
    installedCannons: ship.stats.cannons,
    targetDistancePx: targetDistance,
    baseRangePx: CANNON_RANGE_PX
  }).filter(({ weapon }) => (ship.portableWeaponCooldowns[weapon.itemId] || 0) <= 0);
  if (assignments.length === 0) return false;

  const heading = lakeBattleHeadingVector(ship);
  for (const { weapon, operators } of assignments) {
    ship.portableWeaponCooldowns[weapon.itemId] = weapon.reloadSeconds;
    for (let index = 0; index < operators; index++) {
      const lineT = operators === 1 ? 0 : index / (operators - 1) - 0.5;
      const seed = Math.floor(nextBattleRandom(state) * 0xffffffff) >>> 0;
      const startX = sourcePoint.x + heading.x * lineT * 8;
      const startY = sourcePoint.y + heading.y * lineT * 8;
      const jitter = weapon.animationKind === "bullet" ? 2 : 3.5;
      const targetX = targetPoint.x + (nextBattleRandom(state) - 0.5) * jitter * 2;
      const targetY = targetPoint.y + (nextBattleRandom(state) - 0.5) * jitter * 2;
      const projectileRange = Math.hypot(targetX - startX, targetY - startY);
      addLakeBattleProjectile(state, ship, {
        id: state.projectileSerial++,
        ownerId: ship.id,
        targetId: target.id,
        kind: weapon.animationKind,
        portable: true,
        weaponId: weapon.itemId,
        weapon,
        startX,
        startY,
        targetX,
        targetY,
        age: 0,
        duration: Math.max(0.12, projectileRange / (CANNON_SPEED_PX * weapon.speedScale)),
        arcHeight: (CANNON_ARC_HEIGHT_PX + nextBattleRandom(state) * 4) * weapon.arcHeightScale,
        damage: weapon.hullDamage,
        projectileSize: weapon.projectileSize,
        smokeScale: weapon.smokeScale,
        incendiary: weapon.incendiary === true,
        seed
      });
    }
    finishLakeBattleVolley(state, ship, operators, weapon.animationKind, weapon.itemId);
  }
  return true;
}

function addLakeBattleProjectile(state, ship, projectile) {
  const fixedWeaponMatches = ship.weapon && projectile.kind === ship.weapon.kind;
  const portableWeaponMatches = projectile.portable &&
    ship.portableWeaponItemIds.includes(projectile.weaponId) &&
    portableWeaponItemById(projectile.weaponId).weapon !== null;
  if (projectile.ownerId !== ship.id || (!fixedWeaponMatches && !portableWeaponMatches)) {
    throw new Error(`Lake battle projectile does not match firing ship: ${ship.id}`);
  }
  state.projectiles.push(projectile);
  if (projectile.kind === NAVAL_WEAPON_CANNON || projectile.kind === PORTABLE_PROJECTILE_CANNON ||
      projectile.weapon?.smokeScale > 0) {
    state.cannonSmokeBursts.push(createCannonSmokeBurst(projectile));
  }
}

function finishLakeBattleVolley(state, ship, count, weaponKind = ship.weapon?.kind, weaponId = null) {
  if (!weaponKind) throw new Error(`Lake battle volley has no weapon kind: ${ship.id}`);
  if (state.projectiles.length > MAX_PROJECTILES) {
    state.projectiles.splice(0, state.projectiles.length - MAX_PROJECTILES);
  }
  state.events.push({ type: "fire", shipId: ship.id, weaponKind, weaponId, count });
}

export function lakeBattleWaterAt(state, x, y, margin = 0) {
  validateArenaGeometry(state, x, y, margin);
  return lakeBattleMapWaterAt(state.map, x, y, margin);
}

export function buildLakeBattleWaterMask(map) {
  return buildLakeBattleMapWaterMask(map);
}

export function lakeBattleShipFitsInWater(state, ship, x = ship.x, y = ship.y) {
  if (ship.kind === "city") return lakeBattleCityFitsShore(state, x, y);
  const frame = lakeBattleShipFootprintFrame(state, ship);
  return frame.samples.every((sample) => lakeBattleMaskWaterAt(state, x + sample.x, y + sample.y));
}

function lakeBattleMaskWaterAt(state, x, y) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= state.width || py < 0 || py >= state.height) return false;
  return state.waterMask[py * state.width + px] === 1;
}

export function lakeBattleWindFlowDirection(battle) {
  validateBattleState(battle);
  return normalizeAngle(battle.wind.directionRad + Math.PI);
}

export function lakeBattleShipById(state, shipId) {
  if (shipId === LAKE_BATTLE_PLAYER_ID) return state.player;
  if (shipId === LAKE_BATTLE_ENEMY_ID) return state.enemy;
  throw new Error(`Unknown lake battle ship: ${shipId}`);
}

export function lakeBattleHeadingVector(ship) {
  return { x: Math.cos(ship.headingRad), y: Math.sin(ship.headingRad) };
}

export function lakeBattleBroadsideDirection(ship, sideName) {
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown lake battle broadside: ${sideName}`);
  }
  const heading = lakeBattleHeadingVector(ship);
  const starboard = { x: -heading.y, y: heading.x };
  return sideName === "starboard" ? starboard : { x: -starboard.x, y: -starboard.y };
}

export function lakeBattleWeaponRange(ship) {
  if (!ship || !Array.isArray(ship.portableWeaponItemIds)) {
    throw new Error("Lake battle weapon range requires a combatant");
  }
  const rangeScales = ship.portableWeaponItemIds
    .map((itemId) => portableWeaponItemById(itemId).weapon?.rangeScale || 0);
  if (ship.weapon) rangeScales.push(ship.weapon.rangeScale);
  const rangeScale = Math.max(0, ...rangeScales);
  if (rangeScale <= 0) throw new Error(`Lake battle combatant is unarmed: ${ship.slug}`);
  return CANNON_RANGE_PX * rangeScale;
}

export function lakeBattleProjectilePoint(projectile) {
  return navalProjectilePoint(projectile);
}

export function drainLakeBattleEvents(state) {
  validateBattleState(state);
  const events = state.events.slice();
  state.events.length = 0;
  return events;
}

function createBattleShip(id, slug, x, y, headingRad, cannonEquipmentId, portableWeaponItemIds) {
  return createBattleCombatant(id, slug, x, y, headingRad, cannonEquipmentId, portableWeaponItemIds);
}

function createBattleCombatant(id, slug, x, y, headingRad, cannonEquipmentId, requestedPortableWeaponItemIds) {
  const stats = lakeBattleCombatantStats(slug);
  const baseWeapon = navalWeaponForShip({ cannons: stats.cannons });
  if (!baseWeapon && cannonEquipmentId !== STANDARD_CANNON_EQUIPMENT_ID) {
    throw new Error(`Cannon equipment cannot be fitted to cannonless ship: ${slug}`);
  }
  let weapon = baseWeapon
    ? cannonWeaponWithEquipment(baseWeapon, cannonEquipmentId)
    : null;
  if (slug === LAKE_BATTLE_CITY_SLUG && weapon) {
    weapon = Object.freeze({ ...weapon, reloadSeconds: SHORE_BATTERY_RELOAD_SECONDS });
  }
  const portableWeaponItemIds = requestedPortableWeaponItemIds === null
    ? lakeBattlePortableWeaponItemIds(slug)
    : validateLakeBattlePortableWeaponItemIds(requestedPortableWeaponItemIds, slug);
  return {
    id,
    slug,
    kind: slug === LAKE_BATTLE_CITY_SLUG ? "city" : "ship",
    stats,
    crew: stats.crewCapacity,
    woundedCrew: 0,
    surrendered: false,
    weapon,
    portableWeaponItemIds,
    portableWeaponCooldowns: {},
    x,
    y,
    headingRad: normalizeAngle(headingRad),
    speedPx: 0,
    hitPoints: stats.hitPoints,
    maxHitPoints: stats.hitPoints,
    cooldowns: { port: 0, starboard: 0 },
    rowing: false,
    orbitDirection: id === LAKE_BATTLE_ENEMY_ID ? 1 : 0,
    avoidanceActive: false,
    avoidanceSide: 0,
    avoidanceClearDecisions: 0,
    tackSide: 0,
    tackRemainingPx: 0,
    navigationCourseRad: normalizeAngle(headingRad),
    navigationDecisionCooldown: 0,
    wake: [],
    lastWakePoint: null
  };
}

export function lakeBattlePortableWeaponItemIds(slug) {
  const stats = lakeBattleCombatantStats(slug);
  return representativePortableWeaponItemIdsForShip({ shipSlug: slug, cannons: stats.cannons });
}

function validateLakeBattlePortableWeaponItemIds(itemIds, slug) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error(`Lake battle combatant needs portable equipment: ${slug}`);
  }
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length !== itemIds.length) {
    throw new Error(`Lake battle portable equipment is duplicated: ${slug}`);
  }
  if (!uniqueIds.some((itemId) => portableWeaponItemById(itemId).weapon)) {
    throw new Error(`Lake battle combatant has no portable weapon: ${slug}`);
  }
  return Object.freeze(uniqueIds);
}

function createLakeBattleWind(seed) {
  const directionOffset = (seedUnit(seed, 1) - 0.5) * 0.9;
  const strengthOffset = (seedUnit(seed, 2) - 0.5) * 0.34;
  const wind = {
    directionRad: normalizeAngle(LAKE_BATTLE_WIND.directionRad + directionOffset),
    strength: clamp(LAKE_BATTLE_WIND.strength + strengthOffset, 0.24, 0.88),
    baseDirectionRad: normalizeAngle(LAKE_BATTLE_WIND.directionRad + directionOffset),
    baseStrength: clamp(LAKE_BATTLE_WIND.strength + strengthOffset, 0.24, 0.88),
    directionPhase: seedUnit(seed, 3) * Math.PI * 2,
    strengthPhase: seedUnit(seed, 4) * Math.PI * 2
  };
  sampleLakeBattleWind(wind, 0);
  return wind;
}

function updateLakeBattleWind(state) {
  sampleLakeBattleWind(state.wind, state.elapsedSeconds);
}

function sampleLakeBattleWind(wind, time) {
  wind.directionRad = normalizeAngle(
    wind.baseDirectionRad +
    Math.sin(time / 18 + wind.directionPhase) * 0.16 +
    Math.sin(time / 43 - wind.directionPhase * 0.6) * 0.08
  );
  wind.strength = clamp(
    wind.baseStrength +
    Math.sin(time / 14 + wind.strengthPhase) * 0.16 +
    Math.sin(time / 37 - wind.strengthPhase * 0.7) * 0.09,
    0.16,
    0.98
  );
}

function relocateShipToNavigableMapCell(state, ship) {
  if (ship.kind === "city") {
    const spawn = lakeBattleMapCoastalSpawnPoint(state.map);
    ship.x = spawn.x;
    ship.y = spawn.y;
    ship.speedPx = 0;
    return;
  }
  if (lakeBattleShipFitsInWater(state, ship)) return;
  const candidates = state.map.cells
    .filter((cell) => cell.water && cell.shoreDistance >= 2)
    .sort((a, b) => {
      const aDistance = (a.x - ship.x) ** 2 + (a.y - ship.y) ** 2;
      const bDistance = (b.x - ship.x) ** 2 + (b.y - ship.y) ** 2;
      return aDistance - bDistance || a.id - b.id;
    });
  const target = candidates.find((cell) => lakeBattleShipFitsInWater(state, ship, cell.x, cell.y));
  if (!target) throw new Error(`Could not place ${ship.slug} in resized lake battle map`);
  ship.x = target.x;
  ship.y = target.y;
  ship.speedPx = 0;
}

function updateBattleShipMotion(state, ship, desiredHeadingRad, rowingRequested, dt) {
  if (ship.kind === "city") return;
  if (desiredHeadingRad !== null) {
    const turnRate = shipTurnRate({
      turnRateRad: ship.stats.turnRateRad,
      speedRad: ship.speedPx / PIXELS_PER_RADIAN,
      topSpeedRad: ship.stats.topSpeedRad
    });
    ship.headingRad = rotateAngleToward(ship.headingRad, desiredHeadingRad, turnRate * dt);
    nudgeLakeBattleShipTowardClearWater(state, ship);
  }
  const heading = lakeBattleHeadingVector(ship);
  const windFlowDirection = lakeBattleWindFlowDirection(state);
  const windFlow = { x: Math.cos(windFlowDirection), y: Math.sin(windFlowDirection) };
  const sailEfficiency = sailingEfficiencyForStats(ship.stats, heading, windFlow);
  const propulsion = shipPropulsionPerformance(ship.stats, {
    windStrength: state.wind.strength,
    sailEfficiency,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio: rowingCrewRatio(activeCombatCrew(ship.crew, ship.woundedCrew), ship.stats.crewCapacity),
    rowingRequested
  });
  ship.rowing = propulsion.rowing;
  ship.speedPx += ship.stats.accelerationRad * PIXELS_PER_RADIAN * propulsion.accelerationFactor * dt;
  ship.speedPx *= shipDragFactor(propulsion.stalled, dt);
  const maxSpeedPx = propulsion.stalled ? 0 : propulsion.maxSpeedRad * PIXELS_PER_RADIAN;
  ship.speedPx = clamp(ship.speedPx, 0, Number.isFinite(maxSpeedPx) ? maxSpeedPx : ship.speedPx);
  const movedDistance = moveShipInsideLake(state, ship, ship.speedPx * dt);
  if (ship.tackSide !== 0) {
    ship.tackRemainingPx = Math.max(0, ship.tackRemainingPx - movedDistance);
  }
  updateShipWake(ship, dt);
}

function nudgeLakeBattleShipTowardClearWater(state, ship) {
  if (lakeBattleShipFitsInWater(state, ship)) return false;
  const target = nearestLakeBattleClearancePoint(state, ship);
  if (!target) return false;
  ship.x = target.x;
  ship.y = target.y;
  return true;
}

function nearestLakeBattleClearancePoint(state, ship) {
  for (let radius = 1; radius <= SHORE_ROTATION_ESCAPE_SEARCH_PX; radius++) {
    for (let index = 0; index < SHORE_ROTATION_ESCAPE_DIRECTIONS; index++) {
      const angle = ship.headingRad + index / SHORE_ROTATION_ESCAPE_DIRECTIONS * Math.PI * 2;
      const x = ship.x + Math.cos(angle) * radius;
      const y = ship.y + Math.sin(angle) * radius;
      if (lakeBattleShipFitsInWater(state, ship, x, y)) return { x, y };
    }
  }
  return null;
}

function updateShipWake(ship, dt) {
  for (const particle of ship.wake) particle.age += dt;
  ship.wake = ship.wake.filter((particle) => particle.age < particle.ttl);
  if (ship.speedPx < 4) {
    ship.lastWakePoint = null;
    return;
  }
  const heading = lakeBattleHeadingVector(ship);
  const point = { x: ship.x - heading.x * 6, y: ship.y - heading.y * 6 };
  if (ship.lastWakePoint && Math.hypot(point.x - ship.lastWakePoint.x, point.y - ship.lastWakePoint.y) < 3) return;
  ship.wake.push({
    x: point.x,
    y: point.y,
    sideX: -heading.y,
    sideY: heading.x,
    age: 0,
    ttl: 2.25,
    seed: Math.round(point.x * 17 + point.y * 31) >>> 0
  });
  if (ship.wake.length > 80) ship.wake.splice(0, ship.wake.length - 80);
  ship.lastWakePoint = point;
}

function moveShipInsideLake(state, ship, distance) {
  if (distance <= 0) return 0;
  for (const angleOffset of SHORE_SLIDE_ANGLES) {
    const movementAngle = ship.headingRad + angleOffset;
    const x = ship.x + Math.cos(movementAngle) * distance;
    const y = ship.y + Math.sin(movementAngle) * distance;
    if (!lakeBattleShipFitsInWater(state, ship, x, y)) continue;
    ship.x = x;
    ship.y = y;
    if (angleOffset !== 0) ship.speedPx *= 0.96;
    return distance;
  }
  ship.speedPx *= 0.28;
  return 0;
}

function enemyDesiredHeading(state, dt) {
  const enemy = state.enemy;
  if (enemy.kind === "city") return null;
  enemy.navigationDecisionCooldown = Math.max(0, enemy.navigationDecisionCooldown - dt);
  if (enemy.navigationDecisionCooldown > 0) return enemy.navigationCourseRad;
  enemy.navigationDecisionCooldown = ENEMY_NAVIGATION_DECISION_SECONDS;

  const player = state.player;
  const toPlayer = normalizedDirection(player.x - enemy.x, player.y - enemy.y);
  const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  const tacticalDirection = distance > Math.min(68, lakeBattleWeaponRange(enemy) * 0.86)
    ? toPlayer
    : rotate2(toPlayer, enemy.orbitDirection * Math.PI / 2);
  const sailingDirection = enemySailingDirection(state, tacticalDirection);
  const clearDistance = enemyDirectionClearDistance(state, enemy, sailingDirection);

  if (enemy.avoidanceActive) {
    enemy.avoidanceClearDecisions = clearDistance >= ENEMY_OBSTACLE_REJOIN_CLEARANCE_PX
      ? enemy.avoidanceClearDecisions + 1
      : 0;
    if (enemy.avoidanceClearDecisions >= ENEMY_OBSTACLE_REJOIN_DECISIONS) {
      enemy.avoidanceActive = false;
      enemy.avoidanceClearDecisions = 0;
      enemy.avoidanceSide = 0;
    }
  } else if (clearDistance < ENEMY_OBSTACLE_ENTER_CLEARANCE_PX) {
    enemy.avoidanceActive = true;
    enemy.avoidanceClearDecisions = 0;
  }
  if (!enemy.avoidanceActive) {
    enemy.navigationCourseRad = Math.atan2(sailingDirection.y, sailingDirection.x);
    return enemy.navigationCourseRad;
  }

  const avoidance = chooseNpcObstacleAvoidanceDirection({
    desiredDirection: sailingDirection,
    currentDirection: lakeBattleHeadingVector(enemy),
    clearDistanceFor: (candidate) => (
      enemyDirectionCanMakeWay(state, enemy, candidate)
        ? enemyDirectionClearDistance(state, enemy, candidate)
        : 0
    ),
    preferredSide: enemy.avoidanceSide || enemy.orbitDirection
  });
  if (avoidance) {
    if (avoidance.side !== 0) enemy.avoidanceSide = avoidance.side;
    enemy.navigationCourseRad = Math.atan2(avoidance.direction.y, avoidance.direction.x);
  }
  return enemy.navigationCourseRad;
}

function enemySailingDirection(state, desiredDirection) {
  const enemy = state.enemy;
  if (enemy.stats.propulsion !== SHIP_PROPULSION_SAIL) return desiredDirection;
  const windFlowDirection = lakeBattleWindFlowDirection(state);
  const preferredTackSide = enemy.tackSide !== 0 && enemy.tackRemainingPx <= 0
    ? -enemy.tackSide
    : enemy.tackSide || enemy.orbitDirection;
  const result = chooseNpcSailingDirection({
    desiredDirection,
    windFlowDirection: {
      x: Math.cos(windFlowDirection),
      y: Math.sin(windFlowDirection)
    },
    stallAngleRad: enemy.stats.upwindStallAngleRad,
    currentDirection: lakeBattleHeadingVector(enemy),
    preferredTackSide
  });
  if (result.tacking && (enemy.tackSide !== result.tackSide || enemy.tackRemainingPx <= 0)) {
    enemy.tackSide = result.tackSide;
    enemy.tackRemainingPx = ENEMY_TACK_LEG_PX;
  } else if (!result.tacking) {
    enemy.tackSide = 0;
    enemy.tackRemainingPx = 0;
  }
  return result.direction;
}

function enemyDirectionCanMakeWay(state, enemy, direction) {
  if (enemy.stats.propulsion !== SHIP_PROPULSION_SAIL) return true;
  const windFlowDirection = lakeBattleWindFlowDirection(state);
  const windFlow = { x: Math.cos(windFlowDirection), y: Math.sin(windFlowDirection) };
  return sailingEfficiencyForStats(enemy.stats, direction, windFlow) > 0;
}

function enemyDirectionClearDistance(state, enemy, direction) {
  let clearDistance = 0;
  for (const distance of ENEMY_OBSTACLE_PROBE_DISTANCES_PX) {
    const x = enemy.x + direction.x * distance;
    const y = enemy.y + direction.y * distance;
    if (!lakeBattleShipFitsInWater(state, enemy, x, y)) break;
    clearDistance = distance;
  }
  return clearDistance;
}

function fireEnemyWhenAligned(state) {
  const enemy = state.enemy;
  if (!navalWeaponUsesBroadside(enemy.weapon)) return false;
  if (enemy.kind === "city") {
    const source = lakeBattleCombatantPoint(enemy);
    const target = lakeBattleCombatantAimPoint(state, state.player);
    const direction = Math.atan2(target.y - source.y, target.x - source.x);
    enemy.headingRad = normalizeAngle(direction - Math.PI / 2);
    return fireLakeBattleBroadside(state, enemy.id, "starboard");
  }
  const targetDirection = normalizedDirection(state.player.x - enemy.x, state.player.y - enemy.y);
  const targetDistance = Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y);
  if (targetDistance > lakeBattleWeaponRange(enemy) * 1.04) return false;
  const port = lakeBattleBroadsideDirection(enemy, "port");
  const starboard = lakeBattleBroadsideDirection(enemy, "starboard");
  const portDot = dot2(port, targetDirection);
  const starboardDot = dot2(starboard, targetDirection);
  const sideName = portDot >= starboardDot ? "port" : "starboard";
  if (Math.max(portDot, starboardDot) < Math.cos(BROADSIDE_HALF_ANGLE_RAD * 0.82)) return false;
  return fireLakeBattleBroadside(state, enemy.id, sideName);
}

function updateProjectiles(state, dt) {
  const kept = [];
  for (const projectile of state.projectiles) {
    const previousAge = projectile.age;
    projectile.age = Math.min(projectile.duration, projectile.age + dt);
    if (projectile.kind === NAVAL_WEAPON_CANNON) {
      const target = lakeBattleProjectileTarget(state, projectile);
      const hit = target.hitPoints > 0
        ? firstNavalProjectileHit(
            navalProjectilePoint(projectile, previousAge),
            navalProjectilePoint(projectile),
            [{
              id: target.id,
              ...lakeBattleCombatantPoint(target),
              ...(lakeBattleCombatantIsCity(target)
                ? { radius: lakeBattleCombatantHitRadius(target) }
                : { footprint: lakeBattleShipWorldFootprint(state, target) })
            }]
          )
        : null;
      if (hit) {
        applyLakeBattleProjectileHit(state, projectile, target, hit);
        continue;
      }
    }
    if (projectile.age < projectile.duration) {
      kept.push(projectile);
      continue;
    }
    const target = projectile.targetId ? lakeBattleShipById(state, projectile.targetId) : null;
    const hit = target && target.hitPoints > 0 && (lakeBattleCombatantIsCity(target)
      ? Math.hypot(
          lakeBattleCombatantPoint(target).x - projectile.targetX,
          lakeBattleCombatantPoint(target).y - projectile.targetY
        ) <= lakeBattleCombatantHitRadius(target)
      : pointInShipFootprint(
          { x: projectile.targetX, y: projectile.targetY },
          lakeBattleShipWorldFootprint(state, target)
        ));
    if (hit) {
      applyLakeBattleProjectileHit(state, projectile, target, {
        x: projectile.targetX,
        y: projectile.targetY
      });
    } else if (projectile.kind === NAVAL_WEAPON_CANNON) {
      state.splashes.push({
        x: Math.round(projectile.targetX),
        y: Math.round(projectile.targetY),
        age: 0,
        ttl: SPLASH_TTL_SECONDS,
        seed: projectile.seed
      });
    }
  }
  state.projectiles = kept;
  trimEffects(state);
}

function lakeBattleProjectileTarget(state, projectile) {
  if (projectile.ownerId === state.player.id) return state.enemy;
  if (projectile.ownerId === state.enemy.id) return state.player;
  throw new Error(`Unknown lake battle projectile owner: ${projectile.ownerId}`);
}

function applyLakeBattleProjectileHit(state, projectile, target, point) {
  let newWounds = 0;
  if (projectile.portable) {
    const weapon = portableWeaponItemById(projectile.weaponId).weapon;
    if (!weapon) throw new Error(`Lake battle portable projectile has no weapon: ${projectile.weaponId}`);
    const woundResult = applyCrewWounds({
      totalCrew: target.crew,
      woundedCrew: target.woundedCrew,
      crewDamage: weapon.crewDamage,
      hitChance: weapon.crewHitChance,
      crewProtection: target.stats.crewProtection,
      random: () => nextBattleRandom(state)
    });
    target.woundedCrew = woundResult.woundedCrew;
    newWounds = woundResult.newWounds;
    target.surrendered = crewWoundsForceSurrender(target.crew, target.woundedCrew);
  }
  const canDamageHull = projectile.damage > 0;
  const resisted = canDamageHull && target.kind !== "city" &&
    shipHullResistsDamage(target.stats, { roll: nextBattleRandom(state) });
  const damage = canDamageHull && !resisted ? projectile.damage : 0;
  target.hitPoints = Math.max(0, target.hitPoints - damage);
  if (damage > 0 && target.hitPoints > 0) {
    state.hullSplinterBursts.push(createHullSplinterBurst(projectile, point));
  }
  state.impacts.push({
    x: Math.round(point.x),
    y: Math.round(point.y),
    age: 0,
    ttl: IMPACT_TTL_SECONDS,
    seed: projectile.seed,
    kind: projectile.kind
  });
  state.events.push({
    type: "hit",
    shipId: target.id,
    weaponKind: projectile.kind,
    weaponId: projectile.weaponId || null,
    damage,
    resisted,
    newWounds,
    surrendered: target.surrendered
  });
}

function updateEffects(state, dt) {
  state.cannonSmokeBursts = advanceCannonSmokeBursts(state.cannonSmokeBursts, dt);
  state.hullSplinterBursts = advanceHullSplinterBursts(state.hullSplinterBursts, dt);
  for (const effect of state.splashes) effect.age += dt;
  for (const effect of state.impacts) effect.age += dt;
  state.splashes = state.splashes.filter((effect) => effect.age < effect.ttl);
  state.impacts = state.impacts.filter((effect) => effect.age < effect.ttl);
}

function resolveBattleShipCollision(state) {
  if (state.player.kind === "city" || state.enemy.kind === "city") return false;
  const a = collisionBody(state, state.player);
  const b = collisionBody(state, state.enemy);
  const result = resolveShipCollision(a, b);
  if (!result) return false;
  const playerX = state.player.x + result.a.correctionX;
  const playerY = state.player.y + result.a.correctionY;
  const enemyX = state.enemy.x + result.b.correctionX;
  const enemyY = state.enemy.y + result.b.correctionY;
  if (lakeBattleShipFitsInWater(state, state.player, playerX, playerY)) {
    state.player.x = playerX;
    state.player.y = playerY;
  }
  if (lakeBattleShipFitsInWater(state, state.enemy, enemyX, enemyY)) {
    state.enemy.x = enemyX;
    state.enemy.y = enemyY;
  }
  state.player.speedPx = Math.max(0, result.a.vx * Math.cos(state.player.headingRad) + result.a.vy * Math.sin(state.player.headingRad));
  state.enemy.speedPx = Math.max(0, result.b.vx * Math.cos(state.enemy.headingRad) + result.b.vy * Math.sin(state.enemy.headingRad));
  if (state.collisionCooldown <= 0 && (result.a.damage > 0 || result.b.damage > 0)) {
    const playerResisted = result.a.damage > 0 &&
      shipHullResistsDamage(state.player.stats, { roll: nextBattleRandom(state) });
    const enemyResisted = result.b.damage > 0 &&
      shipHullResistsDamage(state.enemy.stats, { roll: nextBattleRandom(state) });
    const playerDamage = playerResisted ? 0 : result.a.damage;
    const enemyDamage = enemyResisted ? 0 : result.b.damage;
    state.player.hitPoints = Math.max(0, state.player.hitPoints - playerDamage);
    state.enemy.hitPoints = Math.max(0, state.enemy.hitPoints - enemyDamage);
    state.collisionCooldown = 0.5;
    state.events.push({
      type: "collision",
      playerDamage,
      enemyDamage,
      playerResisted,
      enemyResisted
    });
  }
  return true;
}

function collisionBody(state, ship) {
  const heading = lakeBattleHeadingVector(ship);
  return {
    id: ship.id,
    x: ship.x,
    y: ship.y,
    vx: heading.x * ship.speedPx,
    vy: heading.y * ship.speedPx,
    headingX: heading.x,
    headingY: heading.y,
    mass: ship.stats.mass,
    footprint: lakeBattleShipWorldFootprint(state, ship)
  };
}

function finishBattleIfNeeded(state) {
  const playerDefeated = state.player.hitPoints <= 0 || state.player.surrendered;
  const enemyDefeated = state.enemy.hitPoints <= 0 || state.enemy.surrendered;
  if (!playerDefeated && !enemyDefeated) return false;
  state.phase = LAKE_BATTLE_PHASE_FINISHED;
  state.player.speedPx = 0;
  state.enemy.speedPx = 0;
  state.outcome = playerDefeated && enemyDefeated
    ? "draw"
    : enemyDefeated
      ? "victory"
      : "defeat";
  state.events.push({
    type: "finished",
    outcome: state.outcome,
    playerSurrendered: state.player.surrendered,
    enemySurrendered: state.enemy.surrendered
  });
  return true;
}

function sailingEfficiencyForStats(stats, heading, windFlow) {
  const alignment = clamp(dot2(heading, windFlow), -1, 1);
  return sailingEfficiencyForAlignment(stats, alignment);
}

function updateCooldowns(ship, dt) {
  const activeCrew = activeCombatCrew(ship.crew, ship.woundedCrew);
  if (navalWeaponUsesBroadside(ship.weapon)) {
    ship.cooldowns.port = advanceCannonReload(ship.cooldowns.port, dt, activeCrew, ship.stats.cannons);
    ship.cooldowns.starboard = advanceCannonReload(ship.cooldowns.starboard, dt, activeCrew, ship.stats.cannons);
  } else {
    ship.cooldowns.port = Math.max(0, ship.cooldowns.port - dt);
    ship.cooldowns.starboard = Math.max(0, ship.cooldowns.starboard - dt);
  }
  for (const itemId of Object.keys(ship.portableWeaponCooldowns)) {
    const cooldown = Math.max(0, ship.portableWeaponCooldowns[itemId] - dt);
    if (cooldown === 0) delete ship.portableWeaponCooldowns[itemId];
    else ship.portableWeaponCooldowns[itemId] = cooldown;
  }
}

function assertShipFitsLake(state, ship) {
  if (ship.kind === "city") {
    if (!lakeBattleCityFitsShore(state, ship.x, ship.y)) {
      throw new Error("Lake battle city is not placed beside a coastal land hex");
    }
    return;
  }
  if (!lakeBattleShipFitsInWater(state, ship)) {
    throw new Error(`Lake battle start position is not navigable for ${ship.slug}`);
  }
}

function lakeBattleCityFitsShore(state, x, y) {
  const cell = state.map.cells.find((candidate) => candidate.x === x && candidate.y === y);
  if (!cell || cell.water) return false;
  return cell.coastal || cell.neighbors.some((id) => state.map.cellById.get(id).coastal);
}

function validateBattleShipSlug(slug) {
  shipStatsForSlug(slug);
  if (!LAKE_BATTLE_SHIP_SLUGS.includes(slug)) throw new Error(`Ship cannot enter lake battle: ${slug}`);
}

function validateBattleEnemySlug(slug) {
  if (slug === LAKE_BATTLE_CITY_SLUG) return;
  validateBattleShipSlug(slug);
}

export function lakeBattleCombatantStats(slug) {
  if (slug === LAKE_BATTLE_CITY_SLUG) return LAKE_BATTLE_CITY_STATS;
  return shipStatsForSlug(slug);
}

export function lakeBattleCombatantLabel(slug) {
  return slug === LAKE_BATTLE_CITY_SLUG ? "City" : shipLabelForSlug(slug);
}

export function lakeBattleCombatantIsCity(combatantOrSlug) {
  const slug = typeof combatantOrSlug === "string" ? combatantOrSlug : combatantOrSlug?.slug;
  return slug === LAKE_BATTLE_CITY_SLUG;
}

export function lakeBattleCombatantHitRadius(combatant) {
  if (!combatant?.stats) throw new Error("Lake battle hit radius requires a combatant");
  return lakeBattleCombatantIsCity(combatant)
    ? 14
    : clamp(7 + Math.sqrt(combatant.stats.mass) / 5, 8, 12);
}

function lakeBattleShipFootprintFrame(state, ship) {
  const frames = state.shipFootprints?.get(ship.slug);
  if (!frames) throw new Error(`Lake battle is missing hull footprints for ${ship.slug}`);
  return shipFootprintFrame(frames, lakeBattleHeadingVector(ship));
}

function lakeBattleShipWorldFootprint(state, ship) {
  const point = lakeBattleCombatantPoint(ship);
  return translatedShipFootprint(lakeBattleShipFootprintFrame(state, ship), point.x, point.y);
}

function lakeBattleCombatantAimPoint(state, combatant) {
  if (lakeBattleCombatantIsCity(combatant)) return lakeBattleCombatantPoint(combatant);
  const point = lakeBattleCombatantPoint(combatant);
  const center = shipFootprintCenter(lakeBattleShipFootprintFrame(state, combatant));
  return { x: point.x + center.x, y: point.y + center.y };
}

function lakeBattleSlugFootprintRadius(shipFootprints, slug) {
  const frames = shipFootprints.get(slug);
  if (!frames) throw new Error(`Lake battle is missing hull footprints for ${slug}`);
  return Math.max(...frames.map(shipFootprintRadius));
}

function validateLakeBattleShipFootprints(shipFootprints, playerSlug, enemySlug) {
  if (!(shipFootprints instanceof Map)) throw new Error("Lake battle requires the baked ship hull footprints");
  for (const slug of [playerSlug, enemySlug]) {
    if (slug === LAKE_BATTLE_CITY_SLUG) continue;
    if (!shipFootprints.has(slug)) throw new Error(`Lake battle is missing hull footprints for ${slug}`);
  }
}

export function lakeBattleCombatantPoint(combatant) {
  if (!combatant || !Number.isFinite(combatant.x) || !Number.isFinite(combatant.y)) {
    throw new Error("Lake battle combatant point requires finite coordinates");
  }
  return {
    x: combatant.x,
    y: combatant.y + (lakeBattleCombatantIsCity(combatant) ? CITY_COMBAT_OFFSET_Y : 0)
  };
}

function validateBattleState(state) {
  if (!state || typeof state !== "object") throw new Error("Lake battle state is required");
  validateArenaSize(state.width, state.height);
  if (
    !state.player || !state.enemy || !state.map || !state.wind ||
    !(state.waterMask instanceof Uint8Array) || state.waterMask.length !== state.width * state.height ||
    !Array.isArray(state.projectiles) || !Array.isArray(state.cannonSmokeBursts) ||
    !Array.isArray(state.hullSplinterBursts) || !Array.isArray(state.events)
  ) {
    throw new Error("Lake battle state is incomplete");
  }
  if (!Number.isFinite(state.wind.directionRad) || !Number.isFinite(state.wind.strength)) {
    throw new Error("Lake battle wind is invalid");
  }
  for (const combatant of [state.player, state.enemy]) {
    if (!Number.isInteger(combatant.crew) || combatant.crew < 0) {
      throw new Error(`Invalid lake battle crew: ${combatant.crew}`);
    }
    activeCombatCrew(combatant.crew, combatant.woundedCrew);
    if (typeof combatant.surrendered !== "boolean" || !Array.isArray(combatant.portableWeaponItemIds) ||
        !combatant.portableWeaponCooldowns || typeof combatant.portableWeaponCooldowns !== "object") {
      throw new Error(`Invalid lake battle portable combat state: ${combatant.id}`);
    }
  }
}

function validateArenaSize(width, height) {
  if (!Number.isInteger(width) || width < 200) throw new Error(`Invalid lake battle width: ${width}`);
  if (!Number.isInteger(height) || height < 140) throw new Error(`Invalid lake battle height: ${height}`);
}

function validateArenaGeometry(state, x, y, margin) {
  validateArenaSize(state.width, state.height);
  if (![x, y, margin].every(Number.isFinite) || margin < 0) {
    throw new Error(`Invalid lake battle geometry: ${x}, ${y}, ${margin}`);
  }
}

function nextBattleRandom(state) {
  let x = state.randomSeed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.randomSeed = x >>> 0;
  return state.randomSeed / 0x100000000;
}

function seedUnit(seed, salt) {
  let value = (seed ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

function normalizedDirection(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 1e-9) return { x: 1, y: 0 };
  return { x: x / length, y: y / length };
}

function rotateAngleToward(current, target, maxStep) {
  const delta = shortestAngle(target - current);
  return normalizeAngle(current + clamp(delta, -maxStep, maxStep));
}

function normalizeAngle(angle) {
  return shortestAngle(angle);
}

function shortestAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function rotate2(direction, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos
  };
}

function dot2(a, b) {
  return a.x * b.x + a.y * b.y;
}

function trimEffects(state) {
  if (state.cannonSmokeBursts.length > MAX_EFFECTS) {
    state.cannonSmokeBursts.splice(0, state.cannonSmokeBursts.length - MAX_EFFECTS);
  }
  if (state.hullSplinterBursts.length > MAX_EFFECTS) {
    state.hullSplinterBursts.splice(0, state.hullSplinterBursts.length - MAX_EFFECTS);
  }
  if (state.splashes.length > MAX_EFFECTS) state.splashes.splice(0, state.splashes.length - MAX_EFFECTS);
  if (state.impacts.length > MAX_EFFECTS) state.impacts.splice(0, state.impacts.length - MAX_EFFECTS);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
