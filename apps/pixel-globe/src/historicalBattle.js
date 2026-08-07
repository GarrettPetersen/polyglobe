import {
  createBattleSpatialGrid,
  queryBattleSpatialGrid,
  rebuildBattleSpatialGrid
} from "./battleSpatialGrid.js";
import { activeCombatCrew, applyCrewWounds, crewWoundsForceSurrender } from "./combatWounds.js";
import {
  STANDARD_CANNON_EQUIPMENT_ID,
  cannonWeaponWithEquipment
} from "./cannonEquipment.js";
import {
  accurateBroadsideShotIndex,
  advanceCannonReload,
  navalWeaponForShip
} from "./navalWeapons.js";
import {
  activePortableWeaponAssignments,
  portableWeaponItemById
} from "./portableWeapons.js";
import { resolveShipCollision } from "./shipCollision.js";
import { shipFootprintFrame, translatedShipFootprint } from "./shipFootprint.js";
import {
  SHIP_ROWING_MODE_AHEAD,
  SHIP_ROWING_MODE_ASTERN,
  SHIP_ROWING_MODE_IDLE,
  normalizeShipRowingMode,
  shipRowingModeIsActive,
  shipRowingModeThrustDirection
} from "./shipRowingAnimation.js";
import {
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  rowingCrewRatio,
  sailingEfficiencyForAlignment,
  shipCanUseOars,
  shipDragFactor,
  shipPropulsionPerformance
} from "./shipPropulsion.js";
import { shipHullResistsDamage, shipStatsForSlug } from "./shipStats.js";
import { shipTurnRate } from "./shipTurning.js";
import {
  historicalBattleScenarioById,
  historicalBattleSideById,
  historicalBattleSquadronById
} from "./historicalBattleScenarios.js";
import {
  createHistoricalBattleMap,
  historicalBattleMapEscapeAt,
  historicalBattleMapWaterAt
} from "./historicalBattleMap.js";

export const HISTORICAL_BATTLE_PHASE_ACTIVE = "active";
export const HISTORICAL_BATTLE_PHASE_FINISHED = "finished";
export const HISTORICAL_BATTLE_FIXED_STEP_SECONDS = 1 / 20;
export const HISTORICAL_BATTLE_SPATIAL_CELL_SIZE = 48;

const PIXELS_PER_RADIAN = 2450;
const MAX_FRAME_SECONDS = 0.25;
const MAX_ACCUMULATED_SECONDS = 0.5;
const TARGET_REFRESH_TICKS = 16;
const TARGET_SEARCH_RADIUS_PX = 190;
const ENGAGEMENT_RANGE_PX = 92;
const FORMATION_COLUMN_SPACING_PX = 44;
const FORMATION_ROW_SPACING_PX = 38;
const FORMATION_REJOIN_DISTANCE_PX = 210;
const FRIENDLY_AVOIDANCE_RADIUS_PX = 34;
const COLLISION_QUERY_RADIUS_PX = 24;
const CANNON_RANGE_PX = 74;
const CANNON_SPEED_PX = 88;
const CANNON_SPREAD_RAD = 0.18;
const BROADSIDE_HALF_ANGLE_RAD = 0.62;
const MAX_PROJECTILES = 1600;
const MAX_EVENTS = 2048;
const MAX_PORTABLE_VISUAL_PROJECTILES = 6;
const BATTLE_TIME_LIMIT_SECONDS = 24 * 60;
const VICTORY_REMAINING_RATIO = 0.08;
const STRATEGIC_RETREAT_RATIO = 0.46;
const TWO_PI = Math.PI * 2;

export function createHistoricalBattle({
  scenarioId,
  playerSideId,
  playerSquadronId,
  shipFootprints = null,
  seed = 0x4c455041
}) {
  if (!Number.isInteger(seed)) throw new Error(`Historical battle seed must be an integer: ${seed}`);
  const scenario = historicalBattleScenarioById(scenarioId);
  const playerSide = historicalBattleSideById(scenario, playerSideId);
  historicalBattleSquadronById(playerSide, playerSquadronId);
  const map = createHistoricalBattleMap(scenario.map);
  const ships = [];
  const squadrons = [];
  const sides = scenario.sides.map((sideValue, sideIndex) => ({
    id: sideValue.id,
    sideIndex,
    name: sideValue.name,
    color: sideValue.color,
    startingShips: sideValue.squadrons.reduce((total, entry) => total + entry.count, 0),
    remainingShips: 0,
    surrenderedShips: 0,
    sunkShips: 0,
    escapedShips: 0
  }));

  for (let sideIndex = 0; sideIndex < scenario.sides.length; sideIndex++) {
    const sideValue = scenario.sides[sideIndex];
    for (let squadronIndex = 0; squadronIndex < sideValue.squadrons.length; squadronIndex++) {
      const squadronValue = sideValue.squadrons[squadronIndex];
      const squadronState = createSquadronState(sideValue, sideIndex, squadronValue, squadronIndex);
      squadronState.globalIndex = squadrons.length;
      squadrons.push(squadronState);
      expandSquadronShips(ships, squadronState, sideValue, squadronValue, playerSideId, playerSquadronId);
    }
  }

  const playerShipIndex = ships.findIndex((ship) => ship.playerControlled);
  if (playerShipIndex < 0) throw new Error("Historical battle has no player flagship");
  for (const squadron of squadrons) {
    squadron.leaderIndex = ships.findIndex((ship) => ship.squadronId === squadron.id);
    if (squadron.leaderIndex < 0) throw new Error(`Historical squadron has no leader: ${squadron.id}`);
  }

  const state = {
    version: 2,
    scenario,
    map,
    wind: Object.freeze({ ...scenario.map.wind }),
    shipFootprints,
    playerSideId,
    playerSquadronId,
    playerShipIndex,
    phase: HISTORICAL_BATTLE_PHASE_ACTIVE,
    outcome: null,
    winningSideId: null,
    elapsedSeconds: 0,
    accumulatorSeconds: 0,
    tick: 0,
    randomSeed: seed >>> 0,
    projectileSerial: 1,
    ships,
    squadrons,
    sides,
    designatedTargetIndex: -1,
    spatialGrid: createBattleSpatialGrid(HISTORICAL_BATTLE_SPATIAL_CELL_SIZE),
    spatialScratch: [],
    projectiles: [],
    events: [],
    commandLog: [],
    metrics: {
      fixedSteps: 0,
      targetQueries: 0,
      spatialCandidates: 0,
      broadsideChecks: 0,
      collisionChecks: 0
    }
  };
  rebuildBattleSpatialGrid(state.spatialGrid, ships);
  recountHistoricalBattleSides(state);
  validateInitialFleetPositions(state);
  return state;
}

export function updateHistoricalBattle(state, dt, input = {}) {
  assertBattle(state);
  if (!Number.isFinite(dt) || dt < 0 || dt > MAX_FRAME_SECONDS) {
    throw new Error(`Invalid historical battle frame time: ${dt}`);
  }
  if (state.phase !== HISTORICAL_BATTLE_PHASE_ACTIVE || dt === 0) return false;
  state.accumulatorSeconds = Math.min(MAX_ACCUMULATED_SECONDS, state.accumulatorSeconds + dt);
  const command = createHistoricalBattleCommand(state.tick, input);
  let firstStep = true;
  let advanced = false;
  while (state.accumulatorSeconds + 1e-9 >= HISTORICAL_BATTLE_FIXED_STEP_SECONDS) {
    stepHistoricalBattle(state, firstStep ? command : commandWithoutOneShotActions(command));
    state.accumulatorSeconds -= HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
    firstStep = false;
    advanced = true;
    if (state.phase !== HISTORICAL_BATTLE_PHASE_ACTIVE) break;
  }
  if (advanced && commandHasPlayerIntent(command)) appendCommandLog(state, command);
  return advanced;
}

export function createHistoricalBattleCommand(tick, input = {}) {
  if (!Number.isInteger(tick) || tick < 0) throw new Error(`Invalid historical battle command tick: ${tick}`);
  const desiredHeadingRad = input.desiredHeadingRad === null || input.desiredHeadingRad === undefined
    ? null
    : normalizeAngle(input.desiredHeadingRad);
  if (desiredHeadingRad !== null && !Number.isFinite(desiredHeadingRad)) {
    throw new Error(`Invalid historical battle heading: ${input.desiredHeadingRad}`);
  }
  const rowingRequested = input.rowingRequested === undefined
    ? desiredHeadingRad !== null
    : Boolean(input.rowingRequested);
  const rowingMode = input.rowingMode === undefined
    ? (rowingRequested ? SHIP_ROWING_MODE_AHEAD : SHIP_ROWING_MODE_IDLE)
    : normalizeShipRowingMode(input.rowingMode);
  const unitCommand = normalizeUnitCommand(input.unitCommand ?? null);
  return Object.freeze({
    tick,
    desiredHeadingQ: desiredHeadingRad === null ? null : Math.round(desiredHeadingRad / TWO_PI * 65535),
    rowingRequested,
    rowingMode,
    firePort: input.firePort === true,
    fireStarboard: input.fireStarboard === true,
    squadronOrder: normalizeSquadronOrder(input.squadronOrder ?? null),
    unitCommand
  });
}

export function historicalBattlePlayerShip(state) {
  assertBattle(state);
  const ship = state.ships[state.playerShipIndex];
  if (!ship) throw new Error("Historical battle player flagship is missing");
  return ship;
}

export function historicalBattleSideSummary(state, sideId) {
  assertBattle(state);
  const found = state.sides.find((side) => side.id === sideId);
  if (!found) throw new Error(`Historical battle side is missing: ${sideId}`);
  return Object.freeze({ ...found });
}

export function historicalBattleSquadronSummary(state, squadronId) {
  assertBattle(state);
  const squadron = state.squadrons.find((entry) => entry.id === squadronId);
  if (!squadron) throw new Error(`Historical battle squadron is missing: ${squadronId}`);
  let remainingShips = 0;
  for (const ship of state.ships) {
    if (ship.squadronId === squadronId && ship.active) remainingShips += 1;
  }
  return Object.freeze({
    id: squadron.id,
    name: squadron.name,
    commander: squadron.commander,
    order: squadron.order,
    startingShips: squadron.startingShips,
    remainingShips
  });
}

export function historicalBattleVisibleShips(state, camera, width, height, margin = 48) {
  assertBattle(state);
  if (!Number.isFinite(camera?.x) || !Number.isFinite(camera?.y)) {
    throw new Error("Historical battle visibility requires a finite camera");
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid historical battle viewport: ${width}x${height}`);
  }
  const left = camera.x - width / 2 - margin;
  const right = camera.x + width / 2 + margin;
  const top = camera.y - height / 2 - margin;
  const bottom = camera.y + height / 2 + margin;
  return state.ships.filter((ship) => (
    (ship.active || ship.surrendered || ship.sinkingSeconds > 0) &&
    ship.x >= left && ship.x <= right && ship.y >= top && ship.y <= bottom
  ));
}

export function historicalBattleShipAtPoint(state, x, y, radius = 16) {
  assertBattle(state);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) {
    throw new Error(`Invalid historical battle selection point: ${x},${y}/${radius}`);
  }
  queryBattleSpatialGrid(state.spatialGrid, x, y, radius, state.spatialScratch);
  let best = null;
  let bestDistance = radius;
  for (const index of state.spatialScratch) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    const distance = Math.hypot(ship.x - x, ship.y - y);
    if (distance >= bestDistance) continue;
    best = ship;
    bestDistance = distance;
  }
  return best;
}

export function drainHistoricalBattleEvents(state) {
  assertBattle(state);
  const events = state.events;
  state.events = [];
  return events;
}

export function fireHistoricalBattleBroadside(state, sideName) {
  assertBattle(state);
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown historical battle broadside: ${sideName}`);
  }
  if (state.phase !== HISTORICAL_BATTLE_PHASE_ACTIVE) return false;
  const ship = historicalBattlePlayerShip(state);
  if (!ship.active || ship.cooldowns[sideName] > 0) return false;
  const targetIndex = bestBroadsideTarget(state, ship, sideName);
  if (targetIndex < 0) return false;
  return fireShipBroadside(state, ship, state.ships[targetIndex], sideName);
}

export function historicalBattleSnapshot(state) {
  assertBattle(state);
  return Object.freeze({
    tick: state.tick,
    phase: state.phase,
    outcome: state.outcome,
    randomSeed: state.randomSeed,
    sides: Object.freeze(state.sides.map((side) => Object.freeze({
      id: side.id,
      remainingShips: side.remainingShips,
      surrenderedShips: side.surrenderedShips,
      sunkShips: side.sunkShips,
      escapedShips: side.escapedShips
    }))),
    ships: Object.freeze(state.ships.map((ship) => Object.freeze({
      id: ship.id,
      x: roundSnapshot(ship.x),
      y: roundSnapshot(ship.y),
      headingRad: roundSnapshot(ship.headingRad),
      speedPx: roundSnapshot(ship.speedPx),
      hitPoints: ship.hitPoints,
      woundedCrew: ship.woundedCrew,
      active: ship.active,
      surrendered: ship.surrendered,
      escaped: ship.escaped
    })))
  });
}

function stepHistoricalBattle(state, command) {
  state.tick += 1;
  state.elapsedSeconds += HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
  state.metrics.fixedSteps += 1;
  applySquadronCommand(state, command);
  applyUnitCommand(state, command.unitCommand);
  updateStrategicRetreats(state);
  rebuildBattleSpatialGrid(state.spatialGrid, state.ships);
  refreshTargets(state);
  updateShipMotion(state, command);
  rebuildBattleSpatialGrid(state.spatialGrid, state.ships);
  if (state.tick % 2 === 0) resolveHistoricalShipCollisions(state);
  updateShipWeapons(state, command);
  updateBattleProjectiles(state);
  updateSinkingShips(state);
  recountHistoricalBattleSides(state);
  finishHistoricalBattleIfNeeded(state);
}

function expandSquadronShips(ships, squadronState, sideValue, squadronValue, playerSideId, playerSquadronId) {
  let slotIndex = 0;
  for (const group of squadronValue.shipGroups) {
    for (let groupIndex = 0; groupIndex < group.count; groupIndex++) {
      const formation = formationOffset(
        slotIndex,
        squadronValue.frontage,
        squadronValue.rowSpacingPx ?? FORMATION_ROW_SPACING_PX,
        squadronValue.columnSpacingPx ?? FORMATION_COLUMN_SPACING_PX
      );
      const position = projectFormationPoint(
        squadronValue.x,
        squadronValue.y,
        sideValue.headingRad,
        formation.forward,
        formation.lateral
      );
      const baseStats = shipStatsForSlug(group.shipSlug);
      const stats = Object.freeze({ ...baseStats, cannons: group.cannons });
      const playerControlled = sideValue.id === playerSideId &&
        squadronValue.id === playerSquadronId && slotIndex === 0;
      const weapon = group.cannons > 0
        ? cannonWeaponWithEquipment(
            navalWeaponForShip({ cannons: group.cannons }),
            STANDARD_CANNON_EQUIPMENT_ID
          )
        : null;
      const stagger = (slotIndex % 11) * 0.17;
      ships.push({
        id: `${sideValue.id}:${squadronValue.id}:${String(slotIndex + 1).padStart(3, "0")}`,
        sideId: sideValue.id,
        sideIndex: squadronState.sideIndex,
        squadronId: squadronValue.id,
        squadronIndex: squadronState.globalIndex,
        factionId: group.factionId,
        slotIndex,
        formationForward: formation.forward,
        formationLateral: formation.lateral,
        shipSlug: group.shipSlug,
        role: group.role,
        playerControlled,
        active: true,
        surrendered: false,
        escaped: false,
        x: position.x,
        y: position.y,
        previousX: position.x,
        previousY: position.y,
        headingRad: normalizeAngle(sideValue.headingRad),
        speedPx: 0,
        targetIndex: -1,
        cooldowns: { port: stagger, starboard: stagger * 0.61 },
        portableWeaponCooldowns: {},
        portableWeaponItemIds: Object.freeze([...group.portableWeaponItemIds]),
        weapon,
        weaponRangePx: weapon ? CANNON_RANGE_PX * weapon.rangeScale : 0,
        stats,
        hitPoints: stats.hitPoints,
        maxHitPoints: stats.hitPoints,
        crew: stats.crewCapacity,
        woundedCrew: 0,
        maxCrew: stats.crewCapacity,
        sinkingSeconds: 0,
        collisionCooldownSeconds: 0,
        rowing: false,
        rowingMode: SHIP_ROWING_MODE_IDLE,
        wake: [],
        lastWakePoint: null
      });
      slotIndex += 1;
    }
  }
}

function createSquadronState(sideValue, sideIndex, squadronValue, sideSquadronIndex) {
  const role = squadronValue.id.includes("reserve") ? "reserve" :
    squadronValue.id.includes("galleass") ? "vanguard" : "line";
  return {
    id: squadronValue.id,
    sideId: sideValue.id,
    sideIndex,
    sideSquadronIndex,
    globalIndex: -1,
    name: squadronValue.name,
    commander: squadronValue.commander,
    startingShips: squadronValue.count,
    leaderIndex: -1,
    headingRad: sideValue.headingRad,
    order: role === "reserve" ? "hold" : "advance",
    followSquadronId: null,
    role
  };
}

function formationOffset(slotIndex, frontage, rowSpacingPx, columnSpacingPx) {
  if (slotIndex === 0) return { forward: 0, lateral: 0 };
  const followerIndex = slotIndex - 1;
  const row = followerIndex % frontage;
  const column = Math.floor(followerIndex / frontage);
  const stagger = row % 2 === 0 ? 0 : -columnSpacingPx * 0.32;
  return {
    forward: -(column + 1) * columnSpacingPx + stagger,
    lateral: (row - (frontage - 1) / 2) * rowSpacingPx
  };
}

function projectFormationPoint(x, y, headingRad, forward, lateral) {
  const fx = Math.cos(headingRad);
  const fy = Math.sin(headingRad);
  return {
    x: x + fx * forward - fy * lateral,
    y: y + fy * forward + fx * lateral
  };
}

function refreshTargets(state) {
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    if (ship.sideId === state.playerSideId && state.ships[state.designatedTargetIndex]?.active) {
      ship.targetIndex = state.designatedTargetIndex;
      continue;
    }
    const current = state.ships[ship.targetIndex];
    const currentDistance = current?.active && current.sideIndex !== ship.sideIndex
      ? Math.hypot(current.x - ship.x, current.y - ship.y)
      : Number.POSITIVE_INFINITY;
    if ((state.tick + index) % TARGET_REFRESH_TICKS !== 0) continue;
    if (currentDistance <= TARGET_SEARCH_RADIUS_PX * 0.62) continue;
    ship.targetIndex = nearestEnemyIndex(state, index, TARGET_SEARCH_RADIUS_PX);
  }
}

function nearestEnemyIndex(state, shipIndex, radius) {
  const ship = state.ships[shipIndex];
  queryBattleSpatialGrid(state.spatialGrid, ship.x, ship.y, radius, state.spatialScratch);
  state.metrics.targetQueries += 1;
  state.metrics.spatialCandidates += state.spatialScratch.length;
  const radiusSq = radius * radius;
  let bestIndex = -1;
  let bestDistanceSq = radiusSq;
  for (const candidateIndex of state.spatialScratch) {
    const candidate = state.ships[candidateIndex];
    if (!candidate.active || candidate.sideIndex === ship.sideIndex) continue;
    const dx = candidate.x - ship.x;
    const dy = candidate.y - ship.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= bestDistanceSq) continue;
    bestDistanceSq = distanceSq;
    bestIndex = candidateIndex;
  }
  return bestIndex;
}

function updateShipMotion(state, command) {
  updateSquadronLeaders(state);
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    const target = state.ships[ship.targetIndex];
    const targetDistance = target?.active
      ? Math.hypot(target.x - ship.x, target.y - ship.y)
      : Number.POSITIVE_INFINITY;
    let desiredHeading = ship.headingRad;
    let rowingMode = shipCanUseOars(ship.stats) ? SHIP_ROWING_MODE_AHEAD : SHIP_ROWING_MODE_IDLE;
    let speedCapPx = Number.POSITIVE_INFINITY;

    if (ship.playerControlled) {
      desiredHeading = command.desiredHeadingQ === null
        ? ship.headingRad
        : command.desiredHeadingQ / 65535 * TWO_PI;
      rowingMode = command.rowingMode;
    } else if (isSquadronLeader(state, index)) {
      const intent = leaderMotionIntent(state, ship, target, targetDistance);
      desiredHeading = intent.headingRad;
      speedCapPx = intent.speedCapPx;
    } else {
      const intent = followerMotionIntent(state, ship, target, targetDistance);
      desiredHeading = intent.headingRad;
      speedCapPx = intent.speedCapPx;
    }
    if (speedCapPx !== 0) {
      desiredHeading = avoidFriendlyCollisionHeading(state, index, desiredHeading);
    }
    moveShipWithStandardPropulsion(state, ship, desiredHeading, rowingMode, speedCapPx);
  }
}

function leaderMotionIntent(state, ship, target, targetDistance) {
  const squadron = state.squadrons[ship.squadronIndex];
  if (!squadron) throw new Error(`Historical ship has missing squadron: ${ship.id}`);
  if (squadron.order === "follow") {
    const followed = state.squadrons.find((entry) => entry.id === squadron.followSquadronId);
    const leader = state.ships[followed?.leaderIndex];
    if (leader?.active) {
      return {
        headingRad: Math.atan2(leader.y - ship.y, leader.x - ship.x),
        speedCapPx: Number.POSITIVE_INFINITY
      };
    }
  }
  if (squadron.order === "hold" && targetDistance > ENGAGEMENT_RANGE_PX) {
    return { headingRad: squadron.headingRad, speedCapPx: 0 };
  }
  if (squadron.order === "withdraw") {
    return { headingRad: retreatHeading(state, ship), speedCapPx: Number.POSITIVE_INFINITY };
  }
  if (target?.active && targetDistance <= 27 && bowAlignment(ship, target) > 0.7) {
    return {
      headingRad: Math.atan2(target.y - ship.y, target.x - ship.x),
      speedCapPx: Number.POSITIVE_INFINITY
    };
  }
  if (target?.active && targetDistance <= ENGAGEMENT_RANGE_PX) {
    return {
      headingRad: broadsideApproach(ship, target),
      speedCapPx: Number.POSITIVE_INFINITY
    };
  }
  return { headingRad: squadron.headingRad, speedCapPx: Number.POSITIVE_INFINITY };
}

function followerMotionIntent(state, ship, target, targetDistance) {
  const squadron = state.squadrons[ship.squadronIndex];
  if (squadron?.order === "withdraw") {
    return { headingRad: retreatHeading(state, ship), speedCapPx: Number.POSITIVE_INFINITY };
  }
  if (squadron?.order === "hold" && targetDistance > ENGAGEMENT_RANGE_PX) {
    return { headingRad: squadron.headingRad, speedCapPx: 0 };
  }
  if (target?.active && targetDistance <= 27 && bowAlignment(ship, target) > 0.72) {
    return {
      headingRad: Math.atan2(target.y - ship.y, target.x - ship.x),
      speedCapPx: Number.POSITIVE_INFINITY
    };
  }
  if (target?.active && targetDistance <= ENGAGEMENT_RANGE_PX) {
    return { headingRad: broadsideApproach(ship, target), speedCapPx: Number.POSITIVE_INFINITY };
  }
  const leader = state.ships[squadron?.leaderIndex];
  if (!leader?.active) {
    return {
      headingRad: squadron?.headingRad ?? ship.headingRad,
      speedCapPx: Number.POSITIVE_INFINITY
    };
  }
  const slot = projectFormationPoint(
    leader.x,
    leader.y,
    leader.headingRad,
    ship.formationForward,
    ship.formationLateral
  );
  const distance = Math.hypot(slot.x - ship.x, slot.y - ship.y);
  return {
    headingRad: distance < 4 ? leader.headingRad : Math.atan2(slot.y - ship.y, slot.x - ship.x),
    speedCapPx: Math.abs(leader.speedPx) + Math.max(0, distance - 4) * 0.75
  };
}

function broadsideApproach(ship, target) {
  const bearing = Math.atan2(target.y - ship.y, target.x - ship.x);
  const delta = signedAngle(bearing - ship.headingRad);
  return normalizeAngle(bearing - (delta >= 0 ? 1 : -1) * Math.PI / 2);
}

function retreatHeading(state, ship) {
  return ship.sideId === state.map.escape.sideId ? 0 : Math.PI;
}

function moveShipWithStandardPropulsion(
  state,
  ship,
  desiredHeading,
  rowingMode,
  speedCapPx = Number.POSITIVE_INFINITY
) {
  const dt = HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
  const activeCrew = activeCombatCrew(ship.crew, ship.woundedCrew);
  const rowerRatio = rowingCrewRatio(activeCrew, ship.stats.crewCapacity);
  const turnRate = shipTurnRate({
    turnRateRad: ship.stats.turnRateRad,
    speedRad: Math.abs(ship.speedPx) / PIXELS_PER_RADIAN,
    topSpeedRad: ship.stats.topSpeedRad
  });
  ship.previousX = ship.x;
  ship.previousY = ship.y;
  ship.headingRad = turnToward(ship.headingRad, desiredHeading, turnRate * dt);
  const heading = { x: Math.cos(ship.headingRad), y: Math.sin(ship.headingRad) };
  const windFlow = normalizeAngle(state.wind.directionRad + Math.PI);
  const alignment = clamp(heading.x * Math.cos(windFlow) + heading.y * Math.sin(windFlow), -1, 1);
  const sailEfficiency = sailingEfficiencyForAlignment(ship.stats, alignment);
  const normalizedRowingMode = shipCanUseOars(ship.stats)
    ? normalizeShipRowingMode(rowingMode)
    : SHIP_ROWING_MODE_IDLE;
  const thrustDirection = shipRowingModeThrustDirection(normalizedRowingMode);
  const propulsion = shipPropulsionPerformance(ship.stats, {
    windStrength: state.wind.strength,
    sailEfficiency,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio,
    rowingRequested: thrustDirection !== 0,
    rowingDirection: thrustDirection < 0 ? -1 : 1
  });
  ship.rowingMode = propulsion.rowing ? normalizedRowingMode : SHIP_ROWING_MODE_IDLE;
  ship.rowing = shipRowingModeIsActive(ship.rowingMode);
  ship.speedPx += ship.stats.accelerationRad * PIXELS_PER_RADIAN *
    propulsion.accelerationFactor * propulsion.propulsionDirection * dt;
  ship.speedPx *= shipDragFactor(propulsion.stalled, dt);
  const propulsionMaxSpeedPx = propulsion.stalled ? 0 : propulsion.maxSpeedRad * PIXELS_PER_RADIAN;
  const maxSpeedPx = Math.min(propulsionMaxSpeedPx, Math.max(0, speedCapPx));
  ship.speedPx = clamp(ship.speedPx, -maxSpeedPx, maxSpeedPx);
  const movementAngle = ship.headingRad + (ship.speedPx < 0 ? Math.PI : 0);
  const distance = Math.abs(ship.speedPx * dt);
  const nextX = ship.x + Math.cos(movementAngle) * distance;
  const nextY = ship.y + Math.sin(movementAngle) * distance;
  if (historicalBattleMapEscapeAt(state.map, ship.sideId, nextX, nextY)) {
    escapeShip(state, ship);
    return;
  }
  const clearance = ship.role === "galleass" ? 10 : 7;
  if (historicalBattleMapWaterAt(state.map, nextX, nextY, clearance)) {
    ship.x = nextX;
    ship.y = nextY;
    return;
  }
  ship.speedPx *= 0.28;
  ship.headingRad = turnToward(
    ship.headingRad,
    Math.atan2(state.map.height / 2 - ship.y, state.map.width / 2 - ship.x),
    turnRate * dt * 1.5
  );
}

function avoidFriendlyCollisionHeading(state, shipIndex, desiredHeading) {
  const ship = state.ships[shipIndex];
  queryBattleSpatialGrid(
    state.spatialGrid,
    ship.x,
    ship.y,
    FRIENDLY_AVOIDANCE_RADIUS_PX,
    state.spatialScratch
  );
  let awayX = 0;
  let awayY = 0;
  for (const otherIndex of state.spatialScratch) {
    if (otherIndex === shipIndex) continue;
    const other = state.ships[otherIndex];
    if (!other.active || other.sideIndex !== ship.sideIndex) continue;
    const dx = ship.x - other.x;
    const dy = ship.y - other.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 1e-6 || distance >= FRIENDLY_AVOIDANCE_RADIUS_PX) continue;
    const strength = 1 - distance / FRIENDLY_AVOIDANCE_RADIUS_PX;
    awayX += dx / distance * strength;
    awayY += dy / distance * strength;
  }
  if (Math.hypot(awayX, awayY) < 0.08) return desiredHeading;
  const desiredX = Math.cos(desiredHeading);
  const desiredY = Math.sin(desiredHeading);
  return Math.atan2(desiredY + awayY * 0.7, desiredX + awayX * 0.7);
}

function updateSquadronLeaders(state) {
  for (const squadron of state.squadrons) {
    if (state.ships[squadron.leaderIndex]?.active) continue;
    squadron.leaderIndex = state.ships.findIndex((ship) => ship.active && ship.squadronId === squadron.id);
  }
}

function updateStrategicRetreats(state) {
  if (state.tick % 100 !== 0) return;
  const escapeSide = state.sides.find((side) => side.id === state.map.escape.sideId);
  if (!escapeSide || escapeSide.remainingShips > escapeSide.startingShips * STRATEGIC_RETREAT_RATIO) return;
  for (const squadron of state.squadrons) {
    if (squadron.sideId === escapeSide.id && squadron.order !== "withdraw") squadron.order = "withdraw";
  }
}

function resolveHistoricalShipCollisions(state) {
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    ship.collisionCooldownSeconds = Math.max(
      0,
      ship.collisionCooldownSeconds - HISTORICAL_BATTLE_FIXED_STEP_SECONDS * 2
    );
    queryBattleSpatialGrid(state.spatialGrid, ship.x, ship.y, COLLISION_QUERY_RADIUS_PX, state.spatialScratch);
    for (const otherIndex of state.spatialScratch) {
      if (otherIndex <= index) continue;
      const other = state.ships[otherIndex];
      if (!other.active) continue;
      state.metrics.collisionChecks += 1;
      const result = resolveShipCollision(collisionBody(state, ship), collisionBody(state, other));
      if (!result) continue;
      const shipX = ship.x + result.a.correctionX;
      const shipY = ship.y + result.a.correctionY;
      const otherX = other.x + result.b.correctionX;
      const otherY = other.y + result.b.correctionY;
      if (historicalBattleMapWaterAt(state.map, shipX, shipY, 5)) {
        ship.x = shipX;
        ship.y = shipY;
      }
      if (historicalBattleMapWaterAt(state.map, otherX, otherY, 5)) {
        other.x = otherX;
        other.y = otherY;
      }
      ship.speedPx = result.a.vx * Math.cos(ship.headingRad) + result.a.vy * Math.sin(ship.headingRad);
      other.speedPx = result.b.vx * Math.cos(other.headingRad) + result.b.vy * Math.sin(other.headingRad);
      if (ship.collisionCooldownSeconds > 0 || other.collisionCooldownSeconds > 0) continue;
      const shipDamage = collisionDamageAfterResistance(state, ship, result.a.damage);
      const otherDamage = collisionDamageAfterResistance(state, other, result.b.damage);
      if (shipDamage === 0 && otherDamage === 0) continue;
      ship.hitPoints = Math.max(0, ship.hitPoints - shipDamage);
      other.hitPoints = Math.max(0, other.hitPoints - otherDamage);
      ship.collisionCooldownSeconds = 0.5;
      other.collisionCooldownSeconds = 0.5;
      pushBattleEvent(state, {
        type: "collision",
        shipIndex: index,
        otherIndex,
        shipDamage,
        otherDamage
      });
      resolveShipDefeat(state, ship);
      resolveShipDefeat(state, other);
    }
  }
}

function collisionBody(state, ship) {
  const headingX = Math.cos(ship.headingRad);
  const headingY = Math.sin(ship.headingRad);
  return {
    id: ship.id,
    x: ship.x,
    y: ship.y,
    vx: headingX * ship.speedPx,
    vy: headingY * ship.speedPx,
    headingX,
    headingY,
    mass: ship.stats.mass,
    footprint: historicalShipWorldFootprint(state, ship)
  };
}

function historicalShipWorldFootprint(state, ship) {
  const frames = state.shipFootprints?.get?.(ship.shipSlug);
  if (frames) {
    const frame = shipFootprintFrame(frames, {
      x: Math.cos(ship.headingRad),
      y: Math.sin(ship.headingRad)
    });
    return translatedShipFootprint(frame, ship.x, ship.y);
  }
  const halfLength = ship.role === "galleass" ? 10 : 8;
  const halfWidth = ship.role === "galleass" ? 5 : 3;
  const points = [
    { x: halfLength, y: 0 },
    { x: -halfLength, y: -halfWidth },
    { x: -halfLength, y: halfWidth }
  ];
  const cos = Math.cos(ship.headingRad);
  const sin = Math.sin(ship.headingRad);
  return points.map((point) => ({
    x: ship.x + point.x * cos - point.y * sin,
    y: ship.y + point.x * sin + point.y * cos
  }));
}

function collisionDamageAfterResistance(state, ship, damage) {
  if (damage <= 0) return 0;
  return shipHullResistsDamage(ship.stats, { roll: nextRandom(state) }) ? 0 : damage;
}

function updateShipWeapons(state, command) {
  for (const ship of state.ships) {
    if (!ship.active) continue;
    const activeCrew = activeCombatCrew(ship.crew, ship.woundedCrew);
    ship.cooldowns.port = advanceCannonReload(
      ship.cooldowns.port,
      HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
      activeCrew,
      ship.stats.cannons
    );
    ship.cooldowns.starboard = advanceCannonReload(
      ship.cooldowns.starboard,
      HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
      activeCrew,
      ship.stats.cannons
    );
    for (const itemId of Object.keys(ship.portableWeaponCooldowns)) {
      const cooldown = Math.max(
        0,
        ship.portableWeaponCooldowns[itemId] - HISTORICAL_BATTLE_FIXED_STEP_SECONDS
      );
      if (cooldown === 0) delete ship.portableWeaponCooldowns[itemId];
      else ship.portableWeaponCooldowns[itemId] = cooldown;
    }
  }
  if (command.firePort) fireHistoricalBattleBroadside(state, "port");
  if (command.fireStarboard) fireHistoricalBattleBroadside(state, "starboard");

  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    const target = state.ships[ship.targetIndex];
    if (!target?.active) continue;
    const distance = Math.hypot(target.x - ship.x, target.y - ship.y);
    firePortableWeapons(state, ship, target, distance);
    if (ship.playerControlled || !ship.weapon || distance > cannonRange(ship)) continue;
    state.metrics.broadsideChecks += 1;
    const sideName = broadsideSideForTarget(ship, target);
    if (sideName && ship.cooldowns[sideName] <= 0) fireShipBroadside(state, ship, target, sideName);
  }
}

function bestBroadsideTarget(state, ship, sideName) {
  queryBattleSpatialGrid(state.spatialGrid, ship.x, ship.y, cannonRange(ship), state.spatialScratch);
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidateIndex of state.spatialScratch) {
    const candidate = state.ships[candidateIndex];
    if (!candidate.active || candidate.sideIndex === ship.sideIndex) continue;
    const distance = Math.hypot(candidate.x - ship.x, candidate.y - ship.y);
    if (distance >= bestDistance || broadsideSideForTarget(ship, candidate) !== sideName) continue;
    bestDistance = distance;
    bestIndex = candidateIndex;
  }
  return bestIndex;
}

function broadsideSideForTarget(ship, target) {
  const bearing = Math.atan2(target.y - ship.y, target.x - ship.x);
  const delta = signedAngle(bearing - ship.headingRad);
  if (Math.abs(Math.abs(delta) - Math.PI / 2) > BROADSIDE_HALF_ANGLE_RAD) return null;
  return delta > 0 ? "starboard" : "port";
}

function fireShipBroadside(state, ship, target, sideName) {
  if (!ship.weapon || ship.cooldowns[sideName] > 0 || !ship.active || !target.active) return false;
  ship.cooldowns[sideName] = ship.weapon.reloadSeconds;
  const count = Math.max(1, Math.ceil(ship.stats.cannons / 2));
  const sideDirection = broadsideDirection(ship, sideName);
  const toTarget = normalizedDirection(target.x - ship.x, target.y - ship.y);
  const targetDistance = Math.hypot(target.x - ship.x, target.y - ship.y);
  const aimed = targetDistance <= cannonRange(ship) * 1.08 &&
    dot(sideDirection, toTarget) >= Math.cos(BROADSIDE_HALF_ANGLE_RAD);
  const trueShotIndex = accurateBroadsideShotIndex(count);
  for (let index = 0; index < count; index++) {
    const trueShot = index === trueShotIndex;
    const lineT = count === 1 ? 0 : index / (count - 1) - 0.5;
    const heading = { x: Math.cos(ship.headingRad), y: Math.sin(ship.headingRad) };
    const startX = ship.x + heading.x * lineT * 13 + sideDirection.x * 8;
    const startY = ship.y + heading.y * lineT * 13 + sideDirection.y * 8;
    const spread = trueShot ? 0 : (nextRandom(state) - 0.5) * 2 * CANNON_SPREAD_RAD;
    const aim = rotate(aimed ? toTarget : sideDirection, spread);
    const projectileRange = aimed
      ? targetDistance + (nextRandom(state) - 0.5) * 7
      : cannonRange(ship) * (0.82 + nextRandom(state) * 0.28);
    const targetX = aimed && trueShot ? target.x : startX + aim.x * projectileRange;
    const targetY = aimed && trueShot ? target.y : startY + aim.y * projectileRange;
    const actualRange = Math.hypot(targetX - startX, targetY - startY);
    addProjectile(state, {
      id: state.projectileSerial++,
      kind: "cannon",
      ownerIndex: state.ships.indexOf(ship),
      targetIndex: aimed ? state.ships.indexOf(target) : -1,
      startX,
      startY,
      targetX,
      targetY,
      ageSeconds: 0,
      durationSeconds: Math.max(0.12, actualRange / (CANNON_SPEED_PX * ship.weapon.speedScale)),
      damage: ship.weapon.damage,
      hit: aimed && (trueShot || nextRandom(state) < 0.5),
      projectileSize: 2
    });
  }
  pushBattleEvent(state, {
    type: "fire",
    shipIndex: state.ships.indexOf(ship),
    sideName,
    weaponKind: "cannon",
    cannonCount: ship.stats.cannons
  });
  return true;
}

function firePortableWeapons(state, ship, target, targetDistance) {
  const assignments = activePortableWeaponAssignments({
    ownedItemIds: ship.portableWeaponItemIds,
    activeCrew: activeCombatCrew(ship.crew, ship.woundedCrew),
    shipStats: ship.stats,
    installedCannons: ship.stats.cannons,
    targetDistancePx: targetDistance,
    baseRangePx: CANNON_RANGE_PX,
    targetCrewProtection: target.stats.crewProtection
  }).filter(({ weapon }) => (ship.portableWeaponCooldowns[weapon.itemId] || 0) <= 0);
  if (assignments.length === 0) return false;
  for (const { weapon, operators } of assignments) {
    ship.portableWeaponCooldowns[weapon.itemId] = weapon.reloadSeconds;
    const visualCount = Math.min(MAX_PORTABLE_VISUAL_PROJECTILES, operators);
    for (let index = 0; index < visualCount; index++) {
      const share = Math.floor(operators / visualCount) + Number(index < operators % visualCount);
      const jitter = weapon.animationKind === "bullet" ? 2 : 3.5;
      const targetX = target.x + (nextRandom(state) - 0.5) * jitter * 2;
      const targetY = target.y + (nextRandom(state) - 0.5) * jitter * 2;
      const range = Math.hypot(targetX - ship.x, targetY - ship.y);
      addProjectile(state, {
        id: state.projectileSerial++,
        kind: weapon.animationKind,
        weaponId: weapon.itemId,
        ownerIndex: state.ships.indexOf(ship),
        targetIndex: state.ships.indexOf(target),
        startX: ship.x,
        startY: ship.y,
        targetX,
        targetY,
        ageSeconds: 0,
        durationSeconds: Math.max(0.12, range / (CANNON_SPEED_PX * weapon.speedScale)),
        damage: weapon.hullDamage * share,
        crewDamage: weapon.crewDamage * share,
        hit: true,
        projectileSize: weapon.projectileSize,
        crewHitChance: weapon.crewHitChance,
        crewProtectionPenetration: weapon.crewProtectionPenetration
      });
    }
    pushBattleEvent(state, {
      type: "fire",
      shipIndex: state.ships.indexOf(ship),
      weaponKind: weapon.animationKind,
      weaponId: weapon.itemId,
      count: operators,
      cannonCount: 0
    });
  }
  return true;
}

function addProjectile(state, projectile) {
  state.projectiles.push(projectile);
  if (state.projectiles.length > MAX_PROJECTILES) {
    state.projectiles.splice(0, state.projectiles.length - MAX_PROJECTILES);
  }
}

function updateBattleProjectiles(state) {
  const survivors = [];
  for (const projectile of state.projectiles) {
    projectile.ageSeconds += HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
    if (projectile.ageSeconds < projectile.durationSeconds) {
      survivors.push(projectile);
      continue;
    }
    const target = state.ships[projectile.targetIndex];
    if (!projectile.hit || !target?.active) continue;
    let newWounds = 0;
    if (projectile.crewDamage > 0) {
      const result = applyCrewWounds({
        totalCrew: target.crew,
        woundedCrew: target.woundedCrew,
        crewDamage: projectile.crewDamage,
        hitChance: projectile.crewHitChance,
        crewProtection: target.stats.crewProtection,
        crewProtectionPenetration: projectile.crewProtectionPenetration,
        random: () => nextRandom(state)
      });
      target.woundedCrew = result.woundedCrew;
      newWounds = result.newWounds;
      target.surrendered = crewWoundsForceSurrender(target.crew, target.woundedCrew);
    }
    const resisted = projectile.damage > 0 &&
      shipHullResistsDamage(target.stats, { roll: nextRandom(state) });
    const damage = projectile.damage > 0 && !resisted ? projectile.damage : 0;
    target.hitPoints = Math.max(0, target.hitPoints - damage);
    pushBattleEvent(state, {
      type: "hit",
      shipIndex: projectile.targetIndex,
      ownerIndex: projectile.ownerIndex,
      weaponKind: projectile.kind,
      weaponId: projectile.weaponId || null,
      damage,
      newWounds,
      resisted
    });
    resolveShipDefeat(state, target);
  }
  state.projectiles = survivors;
}

function resolveShipDefeat(state, ship) {
  if (!ship.active) return;
  if (ship.hitPoints <= 0) {
    ship.active = false;
    ship.sinkingSeconds = 2.8;
    ship.speedPx = 0;
    pushBattleEvent(state, { type: "sunk", shipIndex: state.ships.indexOf(ship) });
    return;
  }
  if (ship.surrendered || crewWoundsForceSurrender(ship.crew, ship.woundedCrew)) {
    ship.active = false;
    ship.surrendered = true;
    ship.speedPx = 0;
    pushBattleEvent(state, { type: "surrendered", shipIndex: state.ships.indexOf(ship) });
  }
}

function escapeShip(state, ship) {
  ship.active = false;
  ship.escaped = true;
  ship.speedPx = 0;
  pushBattleEvent(state, { type: "escaped", shipIndex: state.ships.indexOf(ship) });
}

function updateSinkingShips(state) {
  for (const ship of state.ships) {
    if (ship.sinkingSeconds <= 0) continue;
    ship.sinkingSeconds = Math.max(0, ship.sinkingSeconds - HISTORICAL_BATTLE_FIXED_STEP_SECONDS);
  }
}

function recountHistoricalBattleSides(state) {
  for (const side of state.sides) {
    side.remainingShips = 0;
    side.surrenderedShips = 0;
    side.sunkShips = 0;
    side.escapedShips = 0;
  }
  for (const ship of state.ships) {
    const side = state.sides[ship.sideIndex];
    if (ship.active) side.remainingShips += 1;
    else if (ship.escaped) side.escapedShips += 1;
    else if (ship.surrendered) side.surrenderedShips += 1;
    else side.sunkShips += 1;
  }
}

function finishHistoricalBattleIfNeeded(state) {
  const escapeSide = state.sides.find((side) => side.id === state.map.escape.sideId);
  if (escapeSide?.escapedShips >= state.map.escape.victoryCount) {
    finishHistoricalBattle(
      state,
      escapeSide.id === state.playerSideId ? "victory" : "defeat",
      escapeSide.id
    );
    return;
  }
  const player = historicalBattlePlayerShip(state);
  if (!player.active && !player.escaped) {
    finishHistoricalBattle(state, "defeat", opponentSideId(state, state.playerSideId));
    return;
  }
  const defeatedSides = state.sides.filter((side) => (
    side.remainingShips <= Math.max(1, Math.floor(side.startingShips * VICTORY_REMAINING_RATIO))
  ));
  if (defeatedSides.length === 1) {
    const winner = state.sides.find((side) => side.id !== defeatedSides[0].id);
    finishHistoricalBattle(state, winner.id === state.playerSideId ? "victory" : "defeat", winner.id);
  } else if (defeatedSides.length === 2 || state.elapsedSeconds >= BATTLE_TIME_LIMIT_SECONDS) {
    const scores = state.sides.map((side) => ({
      side,
      score: side.remainingShips + side.escapedShips * 0.65
    })).sort((a, b) => b.score - a.score);
    const tied = scores[0].score === scores[1].score;
    finishHistoricalBattle(
      state,
      tied ? "draw" : scores[0].side.id === state.playerSideId ? "victory" : "defeat",
      tied ? null : scores[0].side.id
    );
  }
}

function finishHistoricalBattle(state, outcome, winningSideId) {
  state.phase = HISTORICAL_BATTLE_PHASE_FINISHED;
  state.outcome = outcome;
  state.winningSideId = winningSideId;
  pushBattleEvent(state, { type: "finished", outcome, winningSideId });
}

function applySquadronCommand(state, command) {
  if (!command.squadronOrder) return;
  const squadron = state.squadrons.find((entry) => entry.id === state.playerSquadronId);
  if (!squadron) throw new Error(`Player squadron is missing: ${state.playerSquadronId}`);
  squadron.order = command.squadronOrder;
}

function applyUnitCommand(state, unitCommand) {
  if (!unitCommand) return;
  const ship = state.ships[unitCommand.shipIndex];
  if (!ship?.active) return;
  if (unitCommand.action === "target") {
    if (ship.sideId === state.playerSideId) throw new Error("Cannot designate an allied ship as a target");
    state.designatedTargetIndex = unitCommand.shipIndex;
    return;
  }
  if (ship.sideId !== state.playerSideId) throw new Error("Cannot command an enemy squadron");
  const squadron = state.squadrons[ship.squadronIndex];
  if (!squadron) throw new Error(`Commanded ship has no squadron: ${ship.id}`);
  if (unitCommand.action === "follow") {
    squadron.order = "follow";
    squadron.followSquadronId = state.playerSquadronId;
  } else if (unitCommand.action === "attack") {
    squadron.order = "advance";
    squadron.followSquadronId = null;
  } else if (unitCommand.action === "retreat") {
    squadron.order = "withdraw";
    squadron.followSquadronId = null;
  }
}

function validateInitialFleetPositions(state) {
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!historicalBattleMapWaterAt(state.map, ship.x, ship.y, ship.role === "galleass" ? 10 : 7)) {
      throw new Error(`Historical ship starts outside navigable water: ${ship.id} at ${ship.x},${ship.y}`);
    }
    queryBattleSpatialGrid(
      state.spatialGrid,
      ship.x,
      ship.y,
      COLLISION_QUERY_RADIUS_PX,
      state.spatialScratch
    );
    for (const otherIndex of state.spatialScratch) {
      if (otherIndex <= index) continue;
      const other = state.ships[otherIndex];
      if (!resolveShipCollision(collisionBody(state, ship), collisionBody(state, other))) continue;
      throw new Error(`Historical ships overlap at battle start: ${ship.id} / ${other.id}`);
    }
  }
}

function isSquadronLeader(state, shipIndex) {
  const ship = state.ships[shipIndex];
  return state.squadrons[ship.squadronIndex]?.leaderIndex === shipIndex;
}

function opponentSideId(state, sideId) {
  const opponent = state.sides.find((side) => side.id !== sideId);
  if (!opponent) throw new Error(`Historical battle has no opponent for ${sideId}`);
  return opponent.id;
}

function cannonRange(ship) {
  return CANNON_RANGE_PX * (ship.weapon?.rangeScale || 0);
}

function broadsideDirection(ship, sideName) {
  const heading = { x: Math.cos(ship.headingRad), y: Math.sin(ship.headingRad) };
  return sideName === "port"
    ? { x: heading.y, y: -heading.x }
    : { x: -heading.y, y: heading.x };
}

function bowAlignment(ship, target) {
  const direction = normalizedDirection(target.x - ship.x, target.y - ship.y);
  return direction.x * Math.cos(ship.headingRad) + direction.y * Math.sin(ship.headingRad);
}

function normalizeSquadronOrder(order) {
  if (order === null) return null;
  if (!["advance", "hold", "withdraw", "follow"].includes(order)) {
    throw new Error(`Unknown historical squadron order: ${order}`);
  }
  return order;
}

function normalizeUnitCommand(command) {
  if (command === null) return null;
  if (!command || !Number.isInteger(command.shipIndex) || command.shipIndex < 0 ||
      !["follow", "attack", "retreat", "target"].includes(command.action)) {
    throw new Error(`Invalid historical battle unit command: ${JSON.stringify(command)}`);
  }
  return Object.freeze({ shipIndex: command.shipIndex, action: command.action });
}

function commandWithoutOneShotActions(command) {
  return Object.freeze({
    ...command,
    firePort: false,
    fireStarboard: false,
    squadronOrder: null,
    unitCommand: null
  });
}

function commandHasPlayerIntent(command) {
  return command.desiredHeadingQ !== null || command.rowingRequested ||
    command.firePort || command.fireStarboard || command.squadronOrder !== null ||
    command.unitCommand !== null;
}

function appendCommandLog(state, command) {
  const previous = state.commandLog[state.commandLog.length - 1];
  if (previous && JSON.stringify(previous) === JSON.stringify(command)) return;
  state.commandLog.push(command);
}

function pushBattleEvent(state, event) {
  if (state.events.length >= MAX_EVENTS) state.events.shift();
  state.events.push(Object.freeze({ tick: state.tick, ...event }));
}

function nextRandom(state) {
  let value = state.randomSeed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.randomSeed = value >>> 0;
  return state.randomSeed / 0x100000000;
}

function normalizedDirection(x, y) {
  const length = Math.hypot(x, y);
  return length <= 1e-9 ? { x: 1, y: 0 } : { x: x / length, y: y / length };
}

function turnToward(current, target, maximumDelta) {
  const delta = signedAngle(target - current);
  return normalizeAngle(current + Math.max(-maximumDelta, Math.min(maximumDelta, delta)));
}

function signedAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function normalizeAngle(value) {
  if (value >= 0 && value < TWO_PI) return value;
  return ((value % TWO_PI) + TWO_PI) % TWO_PI;
}

function rotate(vector, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function roundSnapshot(value) {
  return Math.round(value * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function assertBattle(state) {
  if (!state || state.version !== 2 || !Array.isArray(state.ships) || !Array.isArray(state.squadrons)) {
    throw new Error("Invalid historical battle state");
  }
}
