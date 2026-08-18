import {
  createBattleSpatialGrid,
  queryBattleSpatialGrid,
  rebuildBattleSpatialGrid
} from "./battleSpatialGrid.js";
import { activeCombatCrew, crewWoundsForceSurrender } from "./combatWounds.js";
import {
  STANDARD_CANNON_EQUIPMENT_ID,
  cannonWeaponWithEquipment
} from "./cannonEquipment.js";
import {
  advanceCannonReload,
  NAVAL_CANNON_RANGE_PX as CANNON_RANGE_PX,
  navalWeaponForShip
} from "./navalWeapons.js";
import {
  activePortableWeaponAssignments,
  advancePortableProjectileLaunch,
  portableWeaponAimPoint,
  portableWeaponVolleyLaunchDelaySeconds
} from "./portableWeapons.js";
import { resolveShipCollision } from "./shipCollision.js";
import { resolveNavalProjectileImpact } from "./navalCombatResolution.js";
import { createPortableNavalProjectile } from "./navalProjectileFactory.js";
import {
  firstNavalProjectileHit,
  navalProjectileMayHitBystanders,
  navalProjectilePoint
} from "./navalProjectile.js";
import { advanceHullSplinterBursts, createHullSplinterBurst } from "./hullSplinters.js";
import {
  createNavalBroadsideVolley,
  navalBroadsideSideForTarget
} from "./navalBroadsideVolley.js";
import {
  pointInShipFootprint,
  shipFootprintFrame,
  shipFootprintRadius,
  shipProjectileSilhouetteRadius,
  translatedShipProjectileSilhouette,
  translatedShipFootprint
} from "./shipFootprint.js";
import {
  SHIP_ROWING_MODE_AHEAD,
  SHIP_ROWING_MODE_ASTERN,
  SHIP_ROWING_MODE_IDLE,
  SHIP_ROWING_MODE_PIVOT_PORT,
  SHIP_ROWING_MODE_PIVOT_STARBOARD,
  normalizeShipRowingMode
} from "./shipRowingAnimation.js";
import {
  shipCanUseOars
} from "./shipPropulsion.js";
import { shipHullResistsDamage, shipStatsForSlug } from "./shipStats.js";
import {
  FLAT_BATTLE_PIXELS_PER_RADIAN as PIXELS_PER_RADIAN,
  advanceFlatBattleShipKinematics
} from "./flatBattleShipMotion.js";
import {
  chooseNpcObstacleAvoidanceDirection,
  chooseNpcSailingDirection
} from "./npcVisualNavigation.js";
import {
  historicalBattleScenarioById,
  historicalBattleSideById,
  historicalBattleSquadronById
} from "./historicalBattleScenarios.js";
import { EARTH_RADIUS_KM } from "./worldDistance.js";
import {
  createHistoricalBattleMap,
  historicalBattleMapEscapeAt,
  historicalBattleMapPointForLonLat,
  historicalBattleMapWaterAt
} from "./historicalBattleMap.js";
import { updateFlatBattleShipWake } from "./flatBattleWake.js";

export const HISTORICAL_BATTLE_PHASE_ACTIVE = "active";
export const HISTORICAL_BATTLE_PHASE_FINISHED = "finished";
export const HISTORICAL_BATTLE_FIXED_STEP_SECONDS = 1 / 20;
export const HISTORICAL_BATTLE_SPATIAL_CELL_SIZE = 48;
export const HISTORICAL_BATTLE_REPLAY_VERSION = 1;

const MAX_FRAME_SECONDS = 0.25;
const MAX_ACCUMULATED_SECONDS = 0.5;
const TARGET_REFRESH_TICKS = 16;
const TARGET_SEARCH_RADIUS_PX = 190;
const ENGAGEMENT_RANGE_PX = 92;
const FORMATION_COLUMN_SPACING_PX = 44;
const FORMATION_ROW_SPACING_PX = 38;
const TACTICAL_SQUADRON_COLUMN_SPACING_PX = 250;
const TACTICAL_SQUADRON_ROW_SPACING_PX = 210;
const FORMATION_REJOIN_DISTANCE_PX = 210;
const FRIENDLY_AVOIDANCE_RADIUS_PX = 64;
const FRIENDLY_AVOIDANCE_LOOKAHEAD_SECONDS = 3.2;
const FRIENDLY_AVOIDANCE_SEPARATION_PX = 30;
const FRIENDLY_AVOIDANCE_DECISION_TICKS = 4;
const FRIENDLY_COLLISION_YIELD_TICKS = 40;
const FORMATION_ROTATION_RATE_RAD = 0.34;
const TARGET_PRESSURE_DISTANCE_PX = 26;
const HISTORICAL_WAKE_SIMULATION_RADIUS_PX = 520;
const HISTORICAL_WAKE_PARTICLE_LIMIT = 72;
const HISTORICAL_NAVIGATION_DECISION_TICKS = 4;
const HISTORICAL_NAVIGATION_ENTER_CLEARANCE_PX = 104;
const HISTORICAL_NAVIGATION_REJOIN_CLEARANCE_PX = 148;
const HISTORICAL_NAVIGATION_REJOIN_DECISIONS = 3;
const HISTORICAL_STRATEGY_REFRESH_TICKS = 20;
const HISTORICAL_RESERVE_RELEASE_SECONDS = 75;
const HISTORICAL_TACK_DURATION_TICKS = 360;
const HISTORICAL_NAVIGATION_PROBE_DISTANCES_PX = Object.freeze([
  24, 48, 80, 120, 180, 260, 380, 520
]);
const MAX_PROJECTILES = 1600;
const MAX_EFFECTS = 512;
const SPLASH_TTL_SECONDS = 0.46;
const IMPACT_TTL_SECONDS = 0.32;
const MAX_EVENTS = 2048;
const MAX_PORTABLE_VISUAL_PROJECTILES = 6;
const BATTLE_TIME_LIMIT_SECONDS = 24 * 60;
const BATTLE_BREAK_REMAINING_RATIO = 0.38;
const BATTLE_BREAK_MINIMUM_SECONDS = 90;
const BATTLE_MOP_UP_SECONDS = 45;
const PLAYER_REPAIR_DAMAGE_COOLDOWN_SECONDS = 12;
const PLAYER_REPAIR_SECONDS_PER_HIT_POINT = 20;
const PLAYER_REPAIR_SAFE_RADIUS_PX = 240;
const PLAYER_REPAIR_HULL_RATIO = 0.5;
const TWO_PI = Math.PI * 2;

export function createHistoricalBattle({
  scenarioId,
  playerSideId,
  playerSquadronId,
  shipFootprints = null,
  shipWakeAnchorsBySlug,
  seed = 0x4c455041
}) {
  if (!Number.isInteger(seed)) throw new Error(`Historical battle seed must be an integer: ${seed}`);
  const scenario = historicalBattleScenarioById(scenarioId);
  requireHistoricalWakeAnchors(scenario, shipWakeAnchorsBySlug);
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
    for (let divisionIndex = 0; divisionIndex < sideValue.squadrons.length; divisionIndex++) {
      const divisionValue = sideValue.squadrons[divisionIndex];
      const tacticalSquadrons = createTacticalSquadronValues(map, sideValue, divisionValue);
      for (const tacticalValue of tacticalSquadrons) {
        const squadronState = createSquadronState(
          sideValue,
          sideIndex,
          divisionValue,
          divisionIndex,
          tacticalValue,
          scenario.strategy.counterparts[divisionValue.id]
        );
        squadronState.globalIndex = squadrons.length;
        squadrons.push(squadronState);
        expandSquadronShips(
          ships,
          squadronState,
          sideValue,
          tacticalValue,
          playerSideId,
          playerSquadronId
        );
      }
    }
  }

  for (const ship of ships) {
    ship.wakeAnchors = shipWakeAnchorsBySlug.get(ship.shipSlug);
  }

  const playerShipIndex = ships.findIndex((ship) => ship.playerControlled);
  if (playerShipIndex < 0) throw new Error("Historical battle has no player flagship");
  for (const squadron of squadrons) {
    squadron.leaderIndex = ships.findIndex((ship) => ship.squadronId === squadron.id);
    if (squadron.leaderIndex < 0) throw new Error(`Historical squadron has no leader: ${squadron.id}`);
  }

  const initialWind = historicalBattleWindAt(scenario.map.wind, 0);
  const state = {
    version: 2,
    scenario,
    map,
    wind: { ...initialWind },
    shipFootprints,
    playerSideId,
    playerSquadronId,
    playerShipIndex,
    phase: HISTORICAL_BATTLE_PHASE_ACTIVE,
    outcome: null,
    winningSideId: null,
    elapsedSeconds: 0,
    brokenSideId: null,
    brokenAtSeconds: null,
    mopUpEndsAtSeconds: null,
    accumulatorSeconds: 0,
    tick: 0,
    initialSeed: seed >>> 0,
    randomSeed: seed >>> 0,
    projectileSerial: 1,
    ships,
    squadrons,
    sides,
    spatialGrid: createBattleSpatialGrid(HISTORICAL_BATTLE_SPATIAL_CELL_SIZE),
    spatialScratch: [],
    targetPressure: new Uint16Array(ships.length),
    projectiles: [],
    hullSplinterBursts: [],
    splashes: [],
    impacts: [],
    events: [],
    commandLog: [],
    metrics: {
      fixedSteps: 0,
      targetQueries: 0,
      spatialCandidates: 0,
      broadsideChecks: 0,
      collisionChecks: 0,
      friendlyCollisionCorrections: 0,
      playerSquadronFriendlyCollisionCorrections: 0
    }
  };
  initializeHistoricalShipCollisionRadii(state);
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
  if (advanced) appendCommandLog(state, command);
  return advanced;
}

export function createHistoricalBattleReplay(state) {
  assertBattle(state);
  return Object.freeze({
    version: HISTORICAL_BATTLE_REPLAY_VERSION,
    scenarioId: state.scenario.id,
    playerSideId: state.playerSideId,
    playerSquadronId: state.playerSquadronId,
    seed: state.initialSeed,
    commands: Object.freeze(state.commandLog.map((command) => Object.freeze({ ...command })))
  });
}

export function validateHistoricalBattleReplay(replay) {
  if (!replay || typeof replay !== "object" ||
      replay.version !== HISTORICAL_BATTLE_REPLAY_VERSION) {
    throw new Error(`Unsupported historical battle replay: ${replay?.version ?? "missing"}`);
  }
  for (const [key, value] of [
    ["scenario", replay.scenarioId],
    ["side", replay.playerSideId],
    ["squadron", replay.playerSquadronId]
  ]) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Historical battle replay has no ${key}`);
    }
  }
  if (!Number.isInteger(replay.seed)) {
    throw new Error(`Historical battle replay has an invalid seed: ${replay.seed}`);
  }
  if (!Array.isArray(replay.commands)) throw new Error("Historical battle replay commands are missing");
  let previousTick = -1;
  for (const command of replay.commands) {
    validateHistoricalBattleCommand(command);
    if (command.tick <= previousTick) {
      throw new Error(`Historical battle replay commands are out of order at tick ${command.tick}`);
    }
    previousTick = command.tick;
  }
  return replay;
}

export function updateHistoricalBattleReplay(state, dt, replay) {
  assertBattle(state);
  validateHistoricalBattleReplay(replay);
  if (state.scenario.id !== replay.scenarioId || state.playerSideId !== replay.playerSideId ||
      state.playerSquadronId !== replay.playerSquadronId || state.initialSeed !== (replay.seed >>> 0)) {
    throw new Error("Historical battle replay setup does not match the battle");
  }
  if (!Number.isFinite(dt) || dt < 0 || dt > MAX_FRAME_SECONDS) {
    throw new Error(`Invalid historical replay frame time: ${dt}`);
  }
  if (state.phase !== HISTORICAL_BATTLE_PHASE_ACTIVE || dt === 0) return false;
  state.accumulatorSeconds = Math.min(MAX_ACCUMULATED_SECONDS, state.accumulatorSeconds + dt);
  let advanced = false;
  while (state.accumulatorSeconds + 1e-9 >= HISTORICAL_BATTLE_FIXED_STEP_SECONDS) {
    stepHistoricalBattle(state, replayCommandAtTick(replay.commands, state.tick));
    state.accumulatorSeconds -= HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
    advanced = true;
    if (state.phase !== HISTORICAL_BATTLE_PHASE_ACTIVE) break;
  }
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
  return Object.freeze({
    tick,
    desiredHeadingQ: desiredHeadingRad === null ? null : Math.round(desiredHeadingRad / TWO_PI * 65535),
    rowingRequested,
    rowingMode,
    firePort: input.firePort === true,
    fireStarboard: input.fireStarboard === true
  });
}

export function historicalBattlePlayerShip(state) {
  assertBattle(state);
  const ship = state.ships[state.playerShipIndex];
  if (!ship) throw new Error("Historical battle player flagship is missing");
  return ship;
}

export function historicalBattleInterpolatedShipPose(state, ship) {
  assertBattle(state);
  if (!ship || !Number.isFinite(ship.x) || !Number.isFinite(ship.y) ||
      !Number.isFinite(ship.headingRad) || !Number.isFinite(ship.previousX) ||
      !Number.isFinite(ship.previousY) || !Number.isFinite(ship.previousHeadingRad)) {
    throw new Error("Historical battle render pose requires a complete ship state");
  }
  const alpha = clamp(
    state.accumulatorSeconds / HISTORICAL_BATTLE_FIXED_STEP_SECONDS,
    0,
    1
  );
  return {
    x: ship.previousX + (ship.x - ship.previousX) * alpha,
    y: ship.previousY + (ship.y - ship.previousY) * alpha,
    headingRad: normalizeAngle(
      ship.previousHeadingRad + signedAngle(ship.headingRad - ship.previousHeadingRad) * alpha
    )
  };
}

export function historicalBattleWindFlowDirection(state) {
  assertBattle(state);
  return normalizeAngle(state.wind.directionRad + Math.PI);
}

export function historicalBattleWindAt(windSpec, elapsedSeconds) {
  if (!Number.isFinite(windSpec?.directionRad) || !Number.isFinite(windSpec?.strength)) {
    throw new Error("Historical battle wind schedule requires an initial wind");
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error(`Invalid historical battle wind time: ${elapsedSeconds}`);
  }
  const shift = windSpec.shift;
  if (!shift || elapsedSeconds <= shift.beginsAtSeconds) {
    return Object.freeze({
      directionRad: normalizeAngle(windSpec.directionRad),
      strength: windSpec.strength
    });
  }
  if (elapsedSeconds < shift.reversesAtSeconds) {
    const progress = smoothstep01(
      (elapsedSeconds - shift.beginsAtSeconds) /
      (shift.reversesAtSeconds - shift.beginsAtSeconds)
    );
    return Object.freeze({
      directionRad: normalizeAngle(windSpec.directionRad),
      strength: lerp(windSpec.strength, shift.lullStrength, progress)
    });
  }
  if (elapsedSeconds < shift.completesAtSeconds) {
    const progress = smoothstep01(
      (elapsedSeconds - shift.reversesAtSeconds) /
      (shift.completesAtSeconds - shift.reversesAtSeconds)
    );
    return Object.freeze({
      directionRad: normalizeAngle(shift.directionRad),
      strength: lerp(shift.lullStrength, shift.strength, progress)
    });
  }
  return Object.freeze({
    directionRad: normalizeAngle(shift.directionRad),
    strength: shift.strength
  });
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
    startingShips: squadron.startingShips,
    remainingShips
  });
}

export function historicalBattleCommanderMarkers(state) {
  assertBattle(state);
  const player = historicalBattlePlayerShip(state);
  const playerCommander = state.scenario.selection.commanders.find((commander) => (
    commander.sideId === state.playerSideId && commander.squadronId === state.playerSquadronId
  ));
  if (!playerCommander) {
    throw new Error(`Historical battle has no selected commander for ${state.playerSquadronId}`);
  }
  return Object.freeze(state.scenario.selection.commanders
    .filter((commander) => commander.id !== playerCommander.id)
    .map((commander) => {
      const shipIndex = historicalCommanderShipIndex(state, commander);
      if (shipIndex < 0) return null;
      const ship = state.ships[shipIndex];
      return Object.freeze({
        commanderId: commander.id,
        sideId: commander.sideId,
        shipIndex,
        x: ship.x,
        y: ship.y,
        distancePx: Math.hypot(ship.x - player.x, ship.y - player.y),
        distanceKm: historicalBattleMapDistanceKm(state.map, player, ship)
      });
    })
    .filter(Boolean));
}

function historicalBattleMapDistanceKm(map, from, to) {
  const longitudeSpanRad = (map.bounds.maxLongitudeDeg - map.bounds.minLongitudeDeg) *
    Math.PI / 180;
  const latitudeSpanRad = (map.bounds.maxLatitudeDeg - map.bounds.minLatitudeDeg) *
    Math.PI / 180;
  const longitudeDistanceRad = (to.x - from.x) / map.width * longitudeSpanRad *
    Math.cos(map.latitudeDeg * Math.PI / 180);
  const latitudeDistanceRad = (to.y - from.y) / map.height * latitudeSpanRad;
  return Math.hypot(longitudeDistanceRad, latitudeDistanceRad) * EARTH_RADIUS_KM;
}

function historicalCommanderShipIndex(state, commander) {
  let fallbackIndex = -1;
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active || ship.divisionId !== commander.squadronId) continue;
    if (ship.squadronId === commander.squadronId) return index;
    if (fallbackIndex < 0) fallbackIndex = index;
  }
  return fallbackIndex;
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
    (ship.active || ship.surrendered) &&
    ship.x >= left && ship.x <= right && ship.y >= top && ship.y <= bottom
  ));
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
  return fireShipBroadside(
    state,
    ship,
    targetIndex < 0 ? null : state.ships[targetIndex],
    sideName
  );
}

export function historicalBattleSnapshot(state) {
  assertBattle(state);
  return Object.freeze({
    tick: state.tick,
    phase: state.phase,
    outcome: state.outcome,
    brokenSideId: state.brokenSideId,
    mopUpEndsAtSeconds: state.mopUpEndsAtSeconds,
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
      repairing: ship.repairing,
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
  const wind = historicalBattleWindAt(state.scenario.map.wind, state.elapsedSeconds);
  state.wind.directionRad = wind.directionRad;
  state.wind.strength = wind.strength;
  state.metrics.fixedSteps += 1;
  rebuildBattleSpatialGrid(state.spatialGrid, state.ships);
  updateSquadronLeaders(state);
  updateStrategicObjectives(state);
  refreshTargets(state);
  updateShipMotion(state, command);
  rebuildBattleSpatialGrid(state.spatialGrid, state.ships);
  if (state.tick % 2 === 0) resolveHistoricalShipCollisions(state);
  updateShipWeapons(state, command);
  updateBattleProjectiles(state);
  updateHistoricalBattleEffects(state);
  updateHistoricalPlayerRepairs(state);
  recountHistoricalBattleSides(state);
  updateBrokenBattleState(state);
  finishHistoricalBattleIfNeeded(state);
}

function expandSquadronShips(
  ships,
  squadronState,
  sideValue,
  tacticalValue,
  playerSideId,
  playerSquadronId
) {
  const anchor = { x: squadronState.anchorX, y: squadronState.anchorY };
  let slotIndex = 0;
  for (const group of tacticalValue.shipGroups) {
    for (let groupIndex = 0; groupIndex < group.count; groupIndex++) {
      const formation = formationOffset(
        slotIndex,
        tacticalValue.frontage,
        tacticalValue.rowSpacingPx ?? FORMATION_ROW_SPACING_PX,
        tacticalValue.columnSpacingPx ?? FORMATION_COLUMN_SPACING_PX
      );
      const position = projectFormationPoint(
        anchor.x,
        anchor.y,
        sideValue.headingRad,
        formation.forward,
        formation.lateral
      );
      const baseStats = shipStatsForSlug(group.shipSlug);
      const stats = Object.freeze({ ...baseStats, cannons: group.cannons });
      const playerControlled = sideValue.id === playerSideId &&
        squadronState.id === playerSquadronId && slotIndex === 0;
      const weapon = group.cannons > 0
        ? cannonWeaponWithEquipment(
            navalWeaponForShip({ cannons: group.cannons }),
            STANDARD_CANNON_EQUIPMENT_ID
          )
        : null;
      const stagger = (slotIndex % 11) * 0.17;
      ships.push({
        id: `${sideValue.id}:${squadronState.id}:${String(slotIndex + 1).padStart(3, "0")}`,
        sideId: sideValue.id,
        sideIndex: squadronState.sideIndex,
        divisionId: squadronState.divisionId,
        squadronId: squadronState.id,
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
        previousHeadingRad: normalizeAngle(sideValue.headingRad),
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
        collisionRadius: 0,
        collisionCooldownSeconds: 0,
        lastDamageAtSeconds: Number.NEGATIVE_INFINITY,
        repairProgressSeconds: 0,
        repairing: false,
        rowing: false,
        rowingMode: SHIP_ROWING_MODE_IDLE,
        navigationCourseRad: normalizeAngle(sideValue.headingRad),
        navigationDecisionTick: squadronState.globalIndex % HISTORICAL_NAVIGATION_DECISION_TICKS,
        tackSide: 0,
        nextTackTick: 0,
        shoreAvoidanceActive: false,
        shoreAvoidanceSide: 0,
        shoreAvoidanceClearDecisions: 0,
        friendlyYieldUntilTick: 0,
        friendlyYieldHeadingRad: normalizeAngle(sideValue.headingRad),
        friendlyAvoidanceHeadingOffsetRad: 0,
        friendlyAvoidanceSpeedCapPx: Number.POSITIVE_INFINITY,
        friendlyAvoidanceCollisionRisk: 0,
        wake: [],
        lastWakePoint: null,
        wakeSeedCounter: 0,
        wakeParticleLimit: HISTORICAL_WAKE_PARTICLE_LIMIT
      });
      slotIndex += 1;
    }
  }
}

function createSquadronState(
  sideValue,
  sideIndex,
  divisionValue,
  divisionIndex,
  tacticalValue,
  counterpartDivisionId
) {
  const role = divisionValue.role;
  return {
    id: tacticalValue.id,
    divisionId: divisionValue.id,
    sideId: sideValue.id,
    sideIndex,
    divisionIndex,
    tacticalIndex: tacticalValue.tacticalIndex,
    globalIndex: -1,
    name: tacticalValue.name,
    commander: divisionValue.commander,
    startingShips: tacticalValue.count,
    leaderIndex: -1,
    anchorX: tacticalValue.anchorX,
    anchorY: tacticalValue.anchorY,
    headingRad: sideValue.headingRad,
    formationHeadingRad: sideValue.headingRad,
    stance: role === "reserve" ? "hold" : "advance",
    counterpartDivisionId,
    counterpartActive: true,
    strategicTargetIndex: -1,
    role
  };
}

function createTacticalSquadronValues(map, sideValue, divisionValue) {
  const shipGroups = partitionHistoricalShipGroups(
    divisionValue.shipGroups,
    divisionValue.tacticalSize
  );
  const anchor = historicalBattleMapPointForLonLat(
    map,
    divisionValue.longitudeDeg,
    divisionValue.latitudeDeg
  );
  const tacticalFrontage = Math.min(divisionValue.tacticalFrontage, shipGroups.length);
  return shipGroups.map((groups, tacticalIndex) => {
    const offset = tacticalSquadronOffset(
      tacticalIndex,
      shipGroups.length,
      tacticalFrontage,
      divisionValue.tacticalRowSpacingPx ?? TACTICAL_SQUADRON_ROW_SPACING_PX,
      divisionValue.tacticalColumnSpacingPx ?? TACTICAL_SQUADRON_COLUMN_SPACING_PX
    );
    const position = projectFormationPoint(
      anchor.x,
      anchor.y,
      sideValue.headingRad,
      offset.forward,
      offset.lateral
    );
    const id = tacticalIndex === 0
      ? divisionValue.id
      : `${divisionValue.id}-${tacticalIndex + 1}`;
    return {
      id,
      name: tacticalIndex === 0
        ? divisionValue.name
        : `${divisionValue.name} ${tacticalIndex + 1}`,
      tacticalIndex,
      count: groups.reduce((total, group) => total + group.count, 0),
      shipGroups: groups,
      frontage: Math.min(divisionValue.frontage, divisionValue.tacticalSize),
      rowSpacingPx: divisionValue.rowSpacingPx,
      columnSpacingPx: divisionValue.columnSpacingPx,
      anchorX: position.x,
      anchorY: position.y
    };
  });
}

function partitionHistoricalShipGroups(shipGroups, tacticalSize) {
  const partitions = [];
  let partition = [];
  let partitionCount = 0;
  for (const group of shipGroups) {
    let remaining = group.count;
    while (remaining > 0) {
      const count = Math.min(remaining, tacticalSize - partitionCount);
      partition.push({ ...group, count });
      partitionCount += count;
      remaining -= count;
      if (partitionCount !== tacticalSize) continue;
      partitions.push(partition);
      partition = [];
      partitionCount = 0;
    }
  }
  if (partitionCount > 0) partitions.push(partition);
  return partitions;
}

function tacticalSquadronOffset(index, count, frontage, rowSpacingPx, columnSpacingPx) {
  const column = Math.floor(index / frontage);
  const columnStart = column * frontage;
  const shipsInColumn = Math.min(frontage, count - columnStart);
  const row = index - columnStart;
  return {
    forward: -column * columnSpacingPx,
    lateral: (row - (shipsInColumn - 1) / 2) * rowSpacingPx
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

function updateStrategicObjectives(state) {
  if (state.tick % HISTORICAL_STRATEGY_REFRESH_TICKS !== 0) return;
  if (state.elapsedSeconds >= HISTORICAL_RESERVE_RELEASE_SECONDS) {
    for (const squadron of state.squadrons) {
      if (squadron.stance === "hold") squadron.stance = "advance";
    }
  }
  for (const squadron of state.squadrons) {
    if (squadron.stance === "withdraw") {
      squadron.strategicTargetIndex = -1;
      continue;
    }
    const leader = state.ships[squadron.leaderIndex];
    if (!leader?.active) {
      squadron.strategicTargetIndex = -1;
      continue;
    }
    const counterpartSquadrons = state.squadrons.filter((candidate) => (
      candidate.divisionId === squadron.counterpartDivisionId &&
      state.ships[candidate.leaderIndex]?.active
    ));
    squadron.counterpartActive = counterpartSquadrons.length > 0;
    if (counterpartSquadrons.length > 0) {
      const counterpart = counterpartSquadrons[
        squadron.tacticalIndex % counterpartSquadrons.length
      ];
      squadron.strategicTargetIndex = counterpart.leaderIndex;
      continue;
    }
    squadron.strategicTargetIndex = nearestEnemySquadronLeaderIndex(state, squadron, leader);
  }
}

function nearestEnemySquadronLeaderIndex(state, squadron, leader) {
  let nearestIndex = -1;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;
  for (const candidate of state.squadrons) {
    if (candidate.sideIndex === squadron.sideIndex) continue;
    const candidateLeader = state.ships[candidate.leaderIndex];
    if (!candidateLeader?.active) continue;
    const distanceSq = (candidateLeader.x - leader.x) ** 2 +
      (candidateLeader.y - leader.y) ** 2;
    if (distanceSq >= nearestDistanceSq) continue;
    nearestDistanceSq = distanceSq;
    nearestIndex = candidate.leaderIndex;
  }
  return nearestIndex;
}

function refreshTargets(state) {
  state.targetPressure.fill(0);
  for (const ship of state.ships) {
    const target = state.ships[ship.targetIndex];
    if (ship.active && target?.active && target.sideIndex !== ship.sideIndex) {
      state.targetPressure[ship.targetIndex] += 1;
    }
  }
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    const squadron = state.squadrons[ship.squadronIndex];
    if (squadron?.stance === "withdraw") {
      ship.targetIndex = -1;
      continue;
    }
    const current = state.ships[ship.targetIndex];
    const currentDistance = current?.active && current.sideIndex !== ship.sideIndex
      ? Math.hypot(current.x - ship.x, current.y - ship.y)
      : Number.POSITIVE_INFINITY;
    if ((state.tick + index) % TARGET_REFRESH_TICKS !== 0) continue;
    if (currentDistance <= TARGET_SEARCH_RADIUS_PX * 0.62) continue;
    if (current?.active && current.sideIndex !== ship.sideIndex) {
      state.targetPressure[ship.targetIndex] = Math.max(
        0,
        state.targetPressure[ship.targetIndex] - 1
      );
    }
    ship.targetIndex = nearestEnemyIndex(state, index, TARGET_SEARCH_RADIUS_PX);
    if (ship.targetIndex >= 0) state.targetPressure[ship.targetIndex] += 1;
  }
}

function nearestEnemyIndex(state, shipIndex, radius) {
  const ship = state.ships[shipIndex];
  const squadron = state.squadrons[ship.squadronIndex];
  queryBattleSpatialGrid(state.spatialGrid, ship.x, ship.y, radius, state.spatialScratch);
  state.metrics.targetQueries += 1;
  state.metrics.spatialCandidates += state.spatialScratch.length;
  const radiusSq = radius * radius;
  let bestIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestCounterpartIndex = -1;
  let bestCounterpartScore = Number.POSITIVE_INFINITY;
  for (const candidateIndex of state.spatialScratch) {
    const candidate = state.ships[candidateIndex];
    if (!candidate.active || candidate.sideIndex === ship.sideIndex) continue;
    const dx = candidate.x - ship.x;
    const dy = candidate.y - ship.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= radiusSq) continue;
    const pressure = state.targetPressure[candidateIndex];
    const score = distanceSq + pressure * TARGET_PRESSURE_DISTANCE_PX ** 2;
    if (squadron?.counterpartActive &&
        candidate.divisionId === squadron.counterpartDivisionId) {
      if (score < bestCounterpartScore) {
        bestCounterpartScore = score;
        bestCounterpartIndex = candidateIndex;
      }
      continue;
    }
    if (score >= bestScore) continue;
    bestScore = score;
    bestIndex = candidateIndex;
  }
  return bestCounterpartIndex >= 0 ? bestCounterpartIndex : bestIndex;
}

function updateShipMotion(state, command) {
  const player = state.ships[state.playerShipIndex];
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
    if (!ship.playerControlled && speedCapPx !== 0 && !shipCanUseOars(ship.stats)) {
      desiredHeading = historicalBattleSailingHeading(state, ship, desiredHeading);
    }
    if (!ship.playerControlled && state.tick < ship.friendlyYieldUntilTick) {
      desiredHeading = ship.friendlyYieldHeadingRad;
      rowingMode = shipCanUseOars(ship.stats) ? SHIP_ROWING_MODE_AHEAD : SHIP_ROWING_MODE_IDLE;
      speedCapPx = Number.POSITIVE_INFINITY;
    }
    if (speedCapPx !== 0) {
      if (!ship.playerControlled) {
        if ((state.tick + index) % FRIENDLY_AVOIDANCE_DECISION_TICKS === 0) {
          updateFriendlyCollisionAvoidance(state, index, desiredHeading);
        }
        desiredHeading = normalizeAngle(
          desiredHeading + ship.friendlyAvoidanceHeadingOffsetRad
        );
        speedCapPx = Math.min(speedCapPx, ship.friendlyAvoidanceSpeedCapPx);
        if (ship.friendlyAvoidanceCollisionRisk > 0.2 && shipCanUseOars(ship.stats)) {
          const pivotSpeedPx = ship.stats.topSpeedRad * PIXELS_PER_RADIAN * 0.22;
          rowingMode = Math.abs(ship.speedPx) > pivotSpeedPx
            ? SHIP_ROWING_MODE_ASTERN
            : signedAngle(desiredHeading - ship.headingRad) >= 0
              ? SHIP_ROWING_MODE_PIVOT_STARBOARD
              : SHIP_ROWING_MODE_PIVOT_PORT;
        }
      }
      if (!ship.playerControlled && isSquadronLeader(state, index)) {
        desiredHeading = updateHistoricalBattleNavigationCourse(
          state.map,
          ship,
          state.tick,
          desiredHeading
        );
      }
    }
    const wakeEnabled = ship.playerControlled || (
      player?.active &&
      Math.hypot(ship.x - player.x, ship.y - player.y) <= HISTORICAL_WAKE_SIMULATION_RADIUS_PX
    );
    moveShipWithStandardPropulsion(
      state,
      ship,
      desiredHeading,
      rowingMode,
      speedCapPx,
      wakeEnabled
    );
  }
}

function leaderMotionIntent(state, ship, target, targetDistance) {
  const squadron = state.squadrons[ship.squadronIndex];
  if (!squadron) throw new Error(`Historical ship has missing squadron: ${ship.id}`);
  if (squadron.stance === "hold" && targetDistance > ENGAGEMENT_RANGE_PX) {
    return { headingRad: squadron.headingRad, speedCapPx: 0 };
  }
  if (squadron.stance === "withdraw") {
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
  const strategicTarget = state.ships[squadron.strategicTargetIndex];
  if (strategicTarget?.active) {
    return {
      headingRad: Math.atan2(strategicTarget.y - ship.y, strategicTarget.x - ship.x),
      speedCapPx: Number.POSITIVE_INFINITY
    };
  }
  return { headingRad: squadron.headingRad, speedCapPx: Number.POSITIVE_INFINITY };
}

function followerMotionIntent(state, ship, target, targetDistance) {
  const squadron = state.squadrons[ship.squadronIndex];
  if (squadron?.stance === "hold" && squadron.id !== state.playerSquadronId &&
      targetDistance > ENGAGEMENT_RANGE_PX) {
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
    squadron.formationHeadingRad,
    ship.formationForward,
    ship.formationLateral
  );
  const distance = Math.hypot(slot.x - ship.x, slot.y - ship.y);
  return {
    headingRad: distance < 4
      ? squadron.formationHeadingRad
      : Math.atan2(slot.y - ship.y, slot.x - ship.x),
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

function historicalBattleSailingHeading(state, ship, desiredHeadingRad) {
  const tackExpired = state.tick >= ship.nextTackTick;
  const preferredTackSide = ship.tackSide === 0
    ? (ship.squadronIndex % 2 === 0 ? -1 : 1)
    : tackExpired
      ? -ship.tackSide
      : ship.tackSide;
  const sailing = chooseNpcSailingDirection({
    desiredDirection: {
      x: Math.cos(desiredHeadingRad),
      y: Math.sin(desiredHeadingRad)
    },
    windFlowDirection: {
      x: Math.cos(state.wind.directionRad + Math.PI),
      y: Math.sin(state.wind.directionRad + Math.PI)
    },
    stallAngleRad: ship.stats.upwindStallAngleRad,
    currentDirection: {
      x: Math.cos(ship.headingRad),
      y: Math.sin(ship.headingRad)
    },
    preferredTackSide,
    committedTackSide: tackExpired ? 0 : ship.tackSide
  });
  if (sailing.tacking && sailing.tackSide !== ship.tackSide) {
    ship.nextTackTick = state.tick + HISTORICAL_TACK_DURATION_TICKS;
  } else if (!sailing.tacking) {
    ship.nextTackTick = 0;
  }
  ship.tackSide = sailing.tackSide;
  return Math.atan2(sailing.direction.y, sailing.direction.x);
}

function moveShipWithStandardPropulsion(
  state,
  ship,
  desiredHeading,
  rowingMode,
  speedCapPx = Number.POSITIVE_INFINITY,
  wakeEnabled = true
) {
  const dt = HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
  ship.previousX = ship.x;
  ship.previousY = ship.y;
  ship.previousHeadingRad = ship.headingRad;
  const kinematics = advanceFlatBattleShipKinematics({
    ship,
    dt,
    desiredHeadingRad: desiredHeading,
    rowingMode,
    windDirectionRad: state.wind.directionRad,
    windStrength: state.wind.strength,
    speedCapPx,
    autoPivot: true
  });
  const distance = Math.abs(kinematics.distancePx);
  const nextX = ship.x + Math.cos(kinematics.movementHeadingRad) * distance;
  const nextY = ship.y + Math.sin(kinematics.movementHeadingRad) * distance;
  if (historicalBattleMapEscapeAt(state.map, ship.sideId, nextX, nextY)) {
    escapeShip(state, ship);
    return;
  }
  const clearance = ship.role === "galleass" ? 10 : 7;
  if (historicalBattleMapWaterAt(state.map, nextX, nextY, clearance)) {
    ship.x = nextX;
    ship.y = nextY;
    updateHistoricalShipWake(ship, dt, wakeEnabled);
    return;
  }
  ship.speedPx *= 0.28;
  updateHistoricalShipWake(ship, dt, wakeEnabled);
}

export function updateHistoricalBattleNavigationCourse(map, ship, tick, desiredHeadingRad) {
  if (!Number.isInteger(tick) || tick < 0) {
    throw new Error(`Invalid historical battle navigation tick: ${tick}`);
  }
  if ((tick + ship.navigationDecisionTick) % HISTORICAL_NAVIGATION_DECISION_TICKS !== 0) {
    return ship.navigationCourseRad;
  }
  const clearancePx = ship.role === "galleass" ? 10 : 7;
  const desiredDirection = {
    x: Math.cos(desiredHeadingRad),
    y: Math.sin(desiredHeadingRad)
  };
  const directClearDistancePx = historicalBattleDirectionClearDistance(
    map,
    ship.x,
    ship.y,
    desiredDirection,
    clearancePx
  );
  if (ship.shoreAvoidanceActive) {
    ship.shoreAvoidanceClearDecisions =
      directClearDistancePx >= HISTORICAL_NAVIGATION_REJOIN_CLEARANCE_PX
        ? ship.shoreAvoidanceClearDecisions + 1
        : 0;
    if (ship.shoreAvoidanceClearDecisions >= HISTORICAL_NAVIGATION_REJOIN_DECISIONS) {
      ship.shoreAvoidanceActive = false;
      ship.shoreAvoidanceSide = 0;
      ship.shoreAvoidanceClearDecisions = 0;
    }
  } else if (directClearDistancePx < HISTORICAL_NAVIGATION_ENTER_CLEARANCE_PX) {
    ship.shoreAvoidanceActive = true;
    ship.shoreAvoidanceClearDecisions = 0;
  }
  if (!ship.shoreAvoidanceActive) {
    ship.navigationCourseRad = desiredHeadingRad;
    return ship.navigationCourseRad;
  }
  const course = historicalBattleNavigableCourse(map, {
    x: ship.x,
    y: ship.y,
    desiredHeadingRad,
    currentHeadingRad: ship.headingRad,
    clearancePx,
    preferredSide: ship.shoreAvoidanceSide || (ship.squadronIndex % 2 === 0 ? -1 : 1),
    forceAvoidance: true
  });
  if (course.side !== 0) ship.shoreAvoidanceSide = course.side;
  ship.navigationCourseRad = course.headingRad;
  return ship.navigationCourseRad;
}

export function historicalBattleNavigableCourse(map, {
  x,
  y,
  desiredHeadingRad,
  currentHeadingRad,
  clearancePx,
  preferredSide = 0,
  forceAvoidance = false
}) {
  if (![x, y, desiredHeadingRad, currentHeadingRad, clearancePx, preferredSide].every(Number.isFinite) ||
      clearancePx < 0 || Math.abs(preferredSide) > 1) {
    throw new Error("Historical battle navigation requires finite position, heading, and clearance");
  }
  const desiredDirection = {
    x: Math.cos(desiredHeadingRad),
    y: Math.sin(desiredHeadingRad)
  };
  const directClearDistancePx = historicalBattleDirectionClearDistance(
    map,
    x,
    y,
    desiredDirection,
    clearancePx
  );
  if (!forceAvoidance && directClearDistancePx >= HISTORICAL_NAVIGATION_ENTER_CLEARANCE_PX) {
    return Object.freeze({
      headingRad: normalizeAngle(desiredHeadingRad),
      side: 0,
      clearDistancePx: directClearDistancePx
    });
  }
  const avoidance = chooseNpcObstacleAvoidanceDirection({
    desiredDirection,
    currentDirection: {
      x: Math.cos(currentHeadingRad),
      y: Math.sin(currentHeadingRad)
    },
    clearDistanceFor: (direction) => historicalBattleDirectionClearDistance(
      map,
      x,
      y,
      direction,
      clearancePx
    ),
    preferredSide
  });
  if (!avoidance) {
    return Object.freeze({
      headingRad: normalizeAngle(currentHeadingRad),
      side: Math.sign(preferredSide),
      clearDistancePx: 0
    });
  }
  return Object.freeze({
    headingRad: normalizeAngle(Math.atan2(avoidance.direction.y, avoidance.direction.x)),
    side: avoidance.side,
    clearDistancePx: avoidance.clearDistance
  });
}

function historicalBattleDirectionClearDistance(map, x, y, direction, clearancePx) {
  let clearDistancePx = 0;
  for (const distancePx of HISTORICAL_NAVIGATION_PROBE_DISTANCES_PX) {
    if (!historicalBattleMapWaterAt(
      map,
      x + direction.x * distancePx,
      y + direction.y * distancePx,
      clearancePx
    )) break;
    clearDistancePx = distancePx;
  }
  return clearDistancePx;
}

function updateHistoricalShipWake(ship, dt, wakeEnabled) {
  if (wakeEnabled) {
    updateFlatBattleShipWake(ship, dt, ship.wakeAnchors);
    return;
  }
  ship.wake.length = 0;
  ship.lastWakePoint = null;
}

function requireHistoricalWakeAnchors(scenario, anchorsBySlug) {
  if (!(anchorsBySlug instanceof Map)) {
    throw new Error("Historical battles require the production ship wake-anchor bake");
  }
  for (const side of scenario.sides) {
    for (const squadron of side.squadrons) {
      for (const group of squadron.shipGroups) {
        if (!anchorsBySlug.has(group.shipSlug)) {
          throw new Error(`Historical battle ship has no wake anchors: ${group.shipSlug}`);
        }
      }
    }
  }
}

function updateFriendlyCollisionAvoidance(state, shipIndex, desiredHeading) {
  const ship = state.ships[shipIndex];
  queryBattleSpatialGrid(
    state.spatialGrid,
    ship.x,
    ship.y,
    FRIENDLY_AVOIDANCE_RADIUS_PX,
    state.spatialScratch
  );
  const desiredX = Math.cos(desiredHeading);
  const desiredY = Math.sin(desiredHeading);
  const expectedSpeedPx = Math.max(
    Math.abs(ship.speedPx),
    ship.stats.topSpeedRad * PIXELS_PER_RADIAN * 0.72
  );
  let awayX = 0;
  let awayY = 0;
  let speedCapPx = Number.POSITIVE_INFINITY;
  let collisionRisk = 0;
  for (const otherIndex of state.spatialScratch) {
    if (otherIndex === shipIndex) continue;
    const other = state.ships[otherIndex];
    if (!other.active || other.sideIndex !== ship.sideIndex) continue;
    const toOtherX = other.x - ship.x;
    const toOtherY = other.y - ship.y;
    const distance = Math.hypot(toOtherX, toOtherY);
    if (distance <= 1e-6 || distance >= FRIENDLY_AVOIDANCE_RADIUS_PX) continue;
    const otherVelocityX = Math.cos(other.headingRad) * other.speedPx;
    const otherVelocityY = Math.sin(other.headingRad) * other.speedPx;
    const relativeVelocityX = otherVelocityX - desiredX * expectedSpeedPx;
    const relativeVelocityY = otherVelocityY - desiredY * expectedSpeedPx;
    const relativeSpeedSq = relativeVelocityX ** 2 + relativeVelocityY ** 2;
    const closestSeconds = relativeSpeedSq <= 1e-6
      ? 0
      : clamp(
          -(toOtherX * relativeVelocityX + toOtherY * relativeVelocityY) / relativeSpeedSq,
          0,
          FRIENDLY_AVOIDANCE_LOOKAHEAD_SECONDS
        );
    const closestX = toOtherX + relativeVelocityX * closestSeconds;
    const closestY = toOtherY + relativeVelocityY * closestSeconds;
    const closestDistance = Math.hypot(closestX, closestY);
    const immediateStrength = Math.max(
      0,
      1 - distance / (FRIENDLY_AVOIDANCE_SEPARATION_PX * 1.35)
    );
    const predictedStrength = closestSeconds > 0
      ? Math.max(0, 1 - closestDistance / FRIENDLY_AVOIDANCE_SEPARATION_PX)
      : 0;
    const crossingStrength = other.squadronId === ship.squadronId ? 0 : predictedStrength;
    collisionRisk = Math.max(collisionRisk, crossingStrength);
    const strength = Math.max(immediateStrength, crossingStrength);
    if (strength > 0) {
      if (closestDistance > 1e-4) {
        awayX -= closestX / closestDistance * strength;
        awayY -= closestY / closestDistance * strength;
      } else {
        awayX += desiredY * strength;
        awayY -= desiredX * strength;
      }
    }
    const aheadPx = toOtherX * desiredX + toOtherY * desiredY;
    const lateralPx = Math.abs(toOtherX * desiredY - toOtherY * desiredX);
    if (aheadPx > 0 && aheadPx < 58 && lateralPx < 18) {
      const otherAlongCoursePx = Math.max(
        0,
        otherVelocityX * desiredX + otherVelocityY * desiredY
      );
      speedCapPx = Math.min(
        speedCapPx,
        otherAlongCoursePx + Math.max(0, aheadPx - 24) * 0.16
      );
    }
  }
  const avoidanceStrength = Math.hypot(awayX, awayY);
  const avoidedHeading = avoidanceStrength < 0.04
    ? desiredHeading
    : Math.atan2(desiredY + awayY * 1.45, desiredX + awayX * 1.45);
  ship.friendlyAvoidanceHeadingOffsetRad = signedAngle(avoidedHeading - desiredHeading);
  ship.friendlyAvoidanceSpeedCapPx = shipCanUseOars(ship.stats)
    ? speedCapPx
    : Math.min(speedCapPx, expectedSpeedPx * (1 - collisionRisk * 0.75));
  ship.friendlyAvoidanceCollisionRisk = collisionRisk;
}

function updateSquadronLeaders(state) {
  for (const squadron of state.squadrons) {
    if (!state.ships[squadron.leaderIndex]?.active) {
      squadron.leaderIndex = state.ships.findIndex((ship) => (
        ship.active && ship.squadronId === squadron.id
      ));
    }
    const leader = state.ships[squadron.leaderIndex];
    if (!leader?.active) continue;
    squadron.formationHeadingRad = turnToward(
      squadron.formationHeadingRad,
      leader.headingRad,
      FORMATION_ROTATION_RATE_RAD * HISTORICAL_BATTLE_FIXED_STEP_SECONDS
    );
  }
}

function resolveHistoricalShipCollisions(state) {
  const collisionBodies = new Array(state.ships.length);
  const bodyFor = (index) => {
    if (!collisionBodies[index]) collisionBodies[index] = collisionBody(state, state.ships[index]);
    return collisionBodies[index];
  };
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.active) continue;
    ship.collisionCooldownSeconds = Math.max(
      0,
      ship.collisionCooldownSeconds - HISTORICAL_BATTLE_FIXED_STEP_SECONDS * 2
    );
    queryBattleSpatialGrid(
      state.spatialGrid,
      ship.x,
      ship.y,
      historicalCollisionQueryRadius(state, ship),
      state.spatialScratch
    );
    for (const otherIndex of state.spatialScratch) {
      if (otherIndex <= index) continue;
      const other = state.ships[otherIndex];
      if (!other.active) continue;
      state.metrics.collisionChecks += 1;
      const result = resolveShipCollision(bodyFor(index), bodyFor(otherIndex));
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
      collisionBodies[index] = null;
      collisionBodies[otherIndex] = null;
      ship.speedPx = result.a.vx * Math.cos(ship.headingRad) + result.a.vy * Math.sin(ship.headingRad);
      other.speedPx = result.b.vx * Math.cos(other.headingRad) + result.b.vy * Math.sin(other.headingRad);
      if (ship.sideIndex === other.sideIndex) {
        separateFriendlyShips(state, ship, other);
        state.metrics.friendlyCollisionCorrections += 1;
        if (ship.squadronId === state.playerSquadronId ||
            other.squadronId === state.playerSquadronId) {
          state.metrics.playerSquadronFriendlyCollisionCorrections += 1;
        }
        continue;
      }
      if (ship.collisionCooldownSeconds > 0 || other.collisionCooldownSeconds > 0) continue;
      const shipDamage = collisionDamageAfterResistance(state, ship, result.a.damage);
      const otherDamage = collisionDamageAfterResistance(state, other, result.b.damage);
      if (shipDamage === 0 && otherDamage === 0) continue;
      ship.hitPoints = Math.max(0, ship.hitPoints - shipDamage);
      other.hitPoints = Math.max(0, other.hitPoints - otherDamage);
      if (shipDamage > 0) ship.lastDamageAtSeconds = state.elapsedSeconds;
      if (otherDamage > 0) other.lastDamageAtSeconds = state.elapsedSeconds;
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

function separateFriendlyShips(state, ship, other) {
  const dx = other.x - ship.x;
  const dy = other.y - ship.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1e-6) return;
  const nx = dx / distance;
  const ny = dy / distance;
  const shipShare = ship.playerControlled ? 0 : other.playerControlled ? 1 : 0.5;
  const otherShare = 1 - shipShare;
  const clearancePx = 14;
  const shipX = ship.x - nx * clearancePx * shipShare;
  const shipY = ship.y - ny * clearancePx * shipShare;
  const otherX = other.x + nx * clearancePx * otherShare;
  const otherY = other.y + ny * clearancePx * otherShare;
  if (shipShare > 0 && historicalBattleMapWaterAt(state.map, shipX, shipY, 5)) {
    ship.x = shipX;
    ship.y = shipY;
  }
  if (otherShare > 0 && historicalBattleMapWaterAt(state.map, otherX, otherY, 5)) {
    other.x = otherX;
    other.y = otherY;
  }
  if (!ship.playerControlled) {
    ship.friendlyYieldUntilTick = state.tick + FRIENDLY_COLLISION_YIELD_TICKS;
    ship.friendlyYieldHeadingRad = Math.atan2(-ny, -nx);
  }
  if (!other.playerControlled) {
    other.friendlyYieldUntilTick = state.tick + FRIENDLY_COLLISION_YIELD_TICKS;
    other.friendlyYieldHeadingRad = Math.atan2(ny, nx);
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

function historicalShipWorldProjectileSilhouette(state, ship) {
  const frames = state.shipFootprints?.get?.(ship.shipSlug);
  if (!frames) return historicalShipWorldFootprint(state, ship);
  const frame = shipFootprintFrame(frames, {
    x: Math.cos(ship.headingRad),
    y: Math.sin(ship.headingRad)
  });
  return translatedShipProjectileSilhouette(frame, ship.x, ship.y);
}

function initializeHistoricalShipCollisionRadii(state) {
  const radiusBySlug = new Map();
  let maximumRadius = 0;
  for (const ship of state.ships) {
    let radius = radiusBySlug.get(ship.shipSlug);
    if (radius === undefined) {
      const frames = state.shipFootprints?.get?.(ship.shipSlug);
      if (frames) {
        radius = frames.reduce((maximum, frame) => Math.max(
          maximum,
          shipFootprintRadius(frame),
          shipProjectileSilhouetteRadius(frame)
        ), 0);
      } else {
        const halfLength = ship.role === "galleass" ? 10 : 8;
        const halfWidth = ship.role === "galleass" ? 5 : 3;
        radius = Math.hypot(halfLength, halfWidth);
      }
      if (!Number.isFinite(radius) || radius <= 0) {
        throw new Error(`Historical ship has an invalid collision radius: ${ship.shipSlug}/${radius}`);
      }
      radiusBySlug.set(ship.shipSlug, radius);
    }
    ship.collisionRadius = radius;
    maximumRadius = Math.max(maximumRadius, radius);
  }
  if (maximumRadius <= 0) throw new Error("Historical battle has no collision radius");
  state.maxCollisionRadius = maximumRadius;
}

function historicalCollisionQueryRadius(state, ship) {
  if (!Number.isFinite(ship.collisionRadius) || ship.collisionRadius <= 0 ||
      !Number.isFinite(state.maxCollisionRadius) || state.maxCollisionRadius <= 0) {
    throw new Error(`Historical collision bounds are invalid: ${ship.id}`);
  }
  return ship.collisionRadius + state.maxCollisionRadius;
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
  return navalBroadsideSideForTarget(
    { x: Math.cos(ship.headingRad), y: Math.sin(ship.headingRad) },
    ship,
    target
  );
}

function fireShipBroadside(state, ship, target, sideName) {
  if (!ship.weapon || ship.cooldowns[sideName] > 0 || !ship.active ||
      (!ship.playerControlled && !target?.active)) return false;
  ship.cooldowns[sideName] = ship.weapon.reloadSeconds;
  const count = Math.max(1, Math.ceil(ship.stats.cannons / 2));
  const heading = { x: Math.cos(ship.headingRad), y: Math.sin(ship.headingRad) };
  const targetIndex = target ? state.ships.indexOf(target) : -1;
  const volley = createNavalBroadsideVolley({
    origin: ship,
    heading,
    hullFootprint: historicalShipWorldFootprint(state, ship),
    sideName,
    projectileCount: count,
    weapon: ship.weapon,
    targetPoint: target,
    aimAtTarget: !ship.playerControlled,
    randomUnit: () => nextRandom(state),
    seedForShot: (index) => (
      state.randomSeed ^ state.projectileSerial ^ Math.imul(index + 1, 0x9e3779b1)
    ) >>> 0
  });
  const smokeProjectiles = [];
  for (let index = 0; index < volley.length; index++) {
    const shot = volley[index];
    const projectile = {
      ...shot,
      id: state.projectileSerial++,
      ownerIndex: state.ships.indexOf(ship),
      targetIndex: shot.targetAimed ? targetIndex : -1
    };
    addProjectile(state, projectile);
    if (index === 0 || index === count - 1 || shot.trueShot) {
      smokeProjectiles.push(projectile);
    }
  }
  pushBattleEvent(state, {
    type: "fire",
    shipIndex: state.ships.indexOf(ship),
    sideName,
    weaponKind: "cannon",
    cannonCount: ship.stats.cannons,
    smokeProjectiles
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
      const aim = portableWeaponAimPoint({
        weapon,
        targetX: target.x,
        targetY: target.y,
        unitX: nextRandom(state),
        unitY: nextRandom(state),
        targetSilhouette: historicalShipWorldProjectileSilhouette(state, target)
      });
      const targetX = aim.x;
      const targetY = aim.y;
      const projectileSeed = (
        state.randomSeed ^ state.projectileSerial ^ Math.imul(index + 1, 0x85ebca6b)
      ) >>> 0;
      addProjectile(state, {
        ...createPortableNavalProjectile({
          weapon,
          startX: ship.x,
          startY: ship.y,
          targetX,
          targetY,
          seed: projectileSeed,
          arcHeightUnit: nextRandom(state),
          damageScale: share,
          hullDamageAttempts: share,
          crewDamageScale: share,
          operatorShare: share,
          launchDelaySeconds: portableWeaponVolleyLaunchDelaySeconds({
            shotIndex: index,
            shotCount: visualCount,
            unit: ((projectileSeed >>> 8) & 0xffffff) / 0x1000000
          })
        }),
        id: state.projectileSerial++,
        ownerIndex: state.ships.indexOf(ship),
        targetIndex: state.ships.indexOf(target),
      });
    }
  }
  return true;
}

function addProjectile(state, projectile) {
  if (projectile.ageSeconds !== undefined || projectile.durationSeconds !== undefined) {
    projectile.age = projectile.ageSeconds ?? 0;
    projectile.duration = projectile.durationSeconds;
    delete projectile.ageSeconds;
    delete projectile.durationSeconds;
  }
  state.projectiles.push(projectile);
  if (state.projectiles.length > MAX_PROJECTILES) {
    state.projectiles.splice(0, state.projectiles.length - MAX_PROJECTILES);
  }
}

function updateBattleProjectiles(state) {
  const survivors = [];
  for (const projectile of state.projectiles) {
    let activeDt = HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
    if (projectile.portable) {
      const launch = advancePortableProjectileLaunch(
        projectile,
        HISTORICAL_BATTLE_FIXED_STEP_SECONDS
      );
      activeDt = launch.activeDt;
      if (launch.justLaunched) {
        pushBattleEvent(state, {
          type: "fire",
          shipIndex: projectile.ownerIndex,
          weaponKind: projectile.kind,
          weaponId: projectile.weaponId,
          count: projectile.operatorShare || 1,
          cannonCount: 0,
          smokeProjectiles: projectile.smokeScale > 0 ? [projectile] : []
        });
      }
      if (activeDt <= 0) {
        survivors.push(projectile);
        continue;
      }
    }
    const previousPoint = navalProjectilePoint(projectile);
    projectile.age = Math.min(
      projectile.duration,
      projectile.age + activeDt
    );
    const point = navalProjectilePoint(projectile);
    const hit = projectile.kind === "cannon" && navalProjectileMayHitBystanders(projectile)
      ? firstHistoricalProjectileHit(state, projectile, previousPoint, point)
      : null;
    if (hit) {
      applyHistoricalProjectileHit(state, projectile, hit.target.shipIndex, hit);
      continue;
    }
    if (projectile.age < projectile.duration) {
      survivors.push(projectile);
      continue;
    }
    if (!navalProjectileMayHitBystanders(projectile)) {
      const target = state.ships[projectile.targetIndex];
      const hit = target?.active && pointInShipFootprint(
        { x: projectile.targetX, y: projectile.targetY },
        historicalShipWorldProjectileSilhouette(state, target)
      );
      if (hit) applyHistoricalProjectileHit(state, projectile, projectile.targetIndex, point);
      continue;
    }
    if (projectile.kind === "cannon") {
      state.splashes.push({
        x: Math.round(projectile.targetX),
        y: Math.round(projectile.targetY),
        age: 0,
        ttl: SPLASH_TTL_SECONDS,
        seed: projectile.seed
      });
    }
  }
  state.projectiles = survivors;
  trimHistoricalEffects(state);
}

function firstHistoricalProjectileHit(state, projectile, start, end) {
  const midpointX = (start.x + end.x) / 2;
  const midpointY = (start.y + end.y) / 2;
  const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2 + state.maxCollisionRadius;
  queryBattleSpatialGrid(state.spatialGrid, midpointX, midpointY, radius, state.spatialScratch);
  const targets = [];
  for (const shipIndex of state.spatialScratch) {
    if (shipIndex === projectile.ownerIndex) continue;
    const ship = state.ships[shipIndex];
    if (!ship?.active) continue;
    targets.push({
      id: ship.id,
      x: ship.x,
      y: ship.y,
      shipIndex,
      footprint: historicalShipWorldFootprint(state, ship),
      projectileSilhouette: historicalShipWorldProjectileSilhouette(state, ship)
    });
  }
  return firstNavalProjectileHit(start, end, targets);
}

function applyHistoricalProjectileHit(state, projectile, shipIndex, point) {
  const target = state.ships[shipIndex];
  if (!target?.active) return false;
  const result = resolveNavalProjectileImpact({
    projectile,
    target,
    random: () => nextRandom(state)
  });
  target.hitPoints = result.hitPoints;
  target.woundedCrew = result.woundedCrew;
  target.surrendered = result.surrendered;
  if (result.damage > 0 || result.newWounds > 0) {
    target.lastDamageAtSeconds = state.elapsedSeconds;
  }
  if (result.damage > 0 && target.hitPoints > 0 &&
      (projectile.kind === "cannon" || projectile.kind === "arrow")) {
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
  pushBattleEvent(state, {
    type: "hit",
    shipIndex,
    ownerIndex: projectile.ownerIndex,
    weaponKind: projectile.kind,
    weaponId: projectile.weaponId || null,
    damage: result.damage,
    newWounds: result.newWounds,
    resisted: result.resisted,
    surrendered: result.surrendered
  });
  resolveShipDefeat(state, target);
  return true;
}

function updateHistoricalBattleEffects(state) {
  state.hullSplinterBursts = advanceHullSplinterBursts(
    state.hullSplinterBursts,
    HISTORICAL_BATTLE_FIXED_STEP_SECONDS
  );
  for (const effect of state.splashes) effect.age += HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
  for (const effect of state.impacts) effect.age += HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
  state.splashes = state.splashes.filter((effect) => effect.age < effect.ttl);
  state.impacts = state.impacts.filter((effect) => effect.age < effect.ttl);
}

function updateHistoricalPlayerRepairs(state) {
  const repairCap = (ship) => Math.max(2, Math.ceil(ship.maxHitPoints * PLAYER_REPAIR_HULL_RATIO));
  for (let index = 0; index < state.ships.length; index++) {
    const ship = state.ships[index];
    if (!ship.playerControlled || !ship.active || ship.hitPoints >= repairCap(ship)) {
      ship.repairing = false;
      ship.repairProgressSeconds = 0;
      continue;
    }
    const damageCooldownComplete = state.elapsedSeconds - ship.lastDamageAtSeconds >=
      PLAYER_REPAIR_DAMAGE_COOLDOWN_SECONDS;
    const clearOfEnemies = damageCooldownComplete && historicalPlayerShipClearOfEnemies(
      state,
      index,
      PLAYER_REPAIR_SAFE_RADIUS_PX
    );
    ship.repairing = clearOfEnemies;
    if (!clearOfEnemies) {
      ship.repairProgressSeconds = 0;
      continue;
    }
    ship.repairProgressSeconds += HISTORICAL_BATTLE_FIXED_STEP_SECONDS;
    if (ship.repairProgressSeconds + 1e-9 < PLAYER_REPAIR_SECONDS_PER_HIT_POINT) continue;
    ship.repairProgressSeconds -= PLAYER_REPAIR_SECONDS_PER_HIT_POINT;
    ship.hitPoints = Math.min(repairCap(ship), ship.hitPoints + 1);
  }
}

function historicalPlayerShipClearOfEnemies(state, shipIndex, radiusPx) {
  const ship = state.ships[shipIndex];
  queryBattleSpatialGrid(state.spatialGrid, ship.x, ship.y, radiusPx, state.spatialScratch);
  const radiusSq = radiusPx ** 2;
  return !state.spatialScratch.some((candidateIndex) => {
    const candidate = state.ships[candidateIndex];
    return candidate.active && candidate.sideIndex !== ship.sideIndex &&
      (candidate.x - ship.x) ** 2 + (candidate.y - ship.y) ** 2 < radiusSq;
  });
}

function trimHistoricalEffects(state) {
  for (const effects of [state.hullSplinterBursts, state.splashes, state.impacts]) {
    if (effects.length > MAX_EFFECTS) effects.splice(0, effects.length - MAX_EFFECTS);
  }
}

function resolveShipDefeat(state, ship) {
  if (!ship.active) return;
  if (ship.hitPoints <= 0) {
    ship.active = false;
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

function updateBrokenBattleState(state) {
  if (state.brokenSideId !== null) return;
  const candidates = state.sides.filter((side) => (
    side.remainingShips === 0 || (
      state.elapsedSeconds >= BATTLE_BREAK_MINIMUM_SECONDS &&
      side.remainingShips <= side.startingShips * BATTLE_BREAK_REMAINING_RATIO
    )
  ));
  if (candidates.length === 0) return;
  candidates.sort((a, b) => (
    a.remainingShips / a.startingShips - b.remainingShips / b.startingShips
  ));
  if (candidates.length > 1 &&
      candidates[0].remainingShips / candidates[0].startingShips ===
        candidates[1].remainingShips / candidates[1].startingShips) {
    return;
  }
  const broken = candidates[0];
  state.brokenSideId = broken.id;
  state.brokenAtSeconds = state.elapsedSeconds;
  state.mopUpEndsAtSeconds = state.elapsedSeconds + BATTLE_MOP_UP_SECONDS;
  for (const squadron of state.squadrons) {
    if (squadron.sideId !== broken.id) continue;
    squadron.stance = "withdraw";
    squadron.strategicTargetIndex = -1;
  }
  for (const ship of state.ships) {
    if (ship.sideId === broken.id) ship.targetIndex = -1;
  }
  pushBattleEvent(state, { type: "side-broken", sideId: broken.id });
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
  if (state.brokenSideId !== null && state.elapsedSeconds >= state.mopUpEndsAtSeconds) {
    const winner = state.sides.find((side) => side.id !== state.brokenSideId);
    if (!winner) throw new Error(`Historical battle lost the opponent of ${state.brokenSideId}`);
    finishHistoricalBattle(state, winner.id === state.playerSideId ? "victory" : "defeat", winner.id);
    return;
  }
  if (state.elapsedSeconds >= BATTLE_TIME_LIMIT_SECONDS) {
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
      historicalCollisionQueryRadius(state, ship),
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

function bowAlignment(ship, target) {
  const direction = normalizedDirection(target.x - ship.x, target.y - ship.y);
  return direction.x * Math.cos(ship.headingRad) + direction.y * Math.sin(ship.headingRad);
}

function commandWithoutOneShotActions(command) {
  return Object.freeze({
    ...command,
    firePort: false,
    fireStarboard: false
  });
}

function appendCommandLog(state, command) {
  const previous = state.commandLog[state.commandLog.length - 1];
  const hasOneShotAction = command.firePort || command.fireStarboard;
  if (previous && !hasOneShotAction && commandsSharePersistentIntent(previous, command)) return;
  state.commandLog.push(command);
}

function commandsSharePersistentIntent(a, b) {
  return a.desiredHeadingQ === b.desiredHeadingQ &&
    a.rowingRequested === b.rowingRequested &&
    a.rowingMode === b.rowingMode;
}

function replayCommandAtTick(commands, tick) {
  let low = 0;
  let high = commands.length - 1;
  let found = null;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const command = commands[middle];
    if (command.tick <= tick) {
      found = command;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (!found) return createHistoricalBattleCommand(tick);
  return found.tick === tick
    ? found
    : Object.freeze({ ...commandWithoutOneShotActions(found), tick });
}

function validateHistoricalBattleCommand(command) {
  if (!command || typeof command !== "object" || !Number.isInteger(command.tick) || command.tick < 0) {
    throw new Error(`Historical battle replay has an invalid command tick: ${command?.tick}`);
  }
  if (command.desiredHeadingQ !== null &&
      (!Number.isInteger(command.desiredHeadingQ) || command.desiredHeadingQ < 0 ||
       command.desiredHeadingQ > 65535)) {
    throw new Error(`Historical battle replay has an invalid heading: ${command.desiredHeadingQ}`);
  }
  if (typeof command.rowingRequested !== "boolean" ||
      typeof command.firePort !== "boolean" || typeof command.fireStarboard !== "boolean") {
    throw new Error("Historical battle replay command flags are invalid");
  }
  normalizeShipRowingMode(command.rowingMode);
  return command;
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

function roundSnapshot(value) {
  return Math.round(value * 1000) / 1000;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function smoothstep01(value) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function assertBattle(state) {
  if (!state || state.version !== 2 || !Array.isArray(state.ships) || !Array.isArray(state.squadrons)) {
    throw new Error("Invalid historical battle state");
  }
}
