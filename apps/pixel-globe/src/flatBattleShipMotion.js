import { activeCombatCrew } from "./combatWounds.js";
import {
  SHIP_ROWING_MODE_AHEAD,
  SHIP_ROWING_MODE_IDLE,
  SHIP_ROWING_MODE_PIVOT_PORT,
  SHIP_ROWING_MODE_PIVOT_STARBOARD,
  normalizeShipRowingMode,
  shipRowingModeIsActive,
  shipRowingModeIsPivot,
  shipRowingModeThrustDirection
} from "./shipRowingAnimation.js";
import {
  SHIP_MINIMUM_POWERED_SPEED_RAD,
  rowingCrewRatio,
  sailingEfficiencyForAlignment,
  shipCanUseOars,
  shipDragFactor,
  shipPoweredAccelerationRad,
  shipPropulsionPerformance
} from "./shipPropulsion.js";
import { oarPivotTurnRate, shipTurnRate } from "./shipTurning.js";
import { WORLD_PIXELS_PER_RADIAN } from "./worldScale.js";

export const FLAT_BATTLE_PIXELS_PER_RADIAN = WORLD_PIXELS_PER_RADIAN;

const AUTO_PIVOT_MINIMUM_TURN_RAD = 20 * Math.PI / 180;
const AUTO_PIVOT_REVERSE_CONE_RAD = 35 * Math.PI / 180;
const AUTO_PIVOT_MAXIMUM_SPEED_RATIO = 0.2;

export function advanceFlatBattleShipKinematics({
  ship,
  dt,
  desiredHeadingRad,
  rowingMode,
  windDirectionRad,
  windStrength,
  speedCapPx = Number.POSITIVE_INFINITY,
  autoPivot = true
}) {
  validateKinematicsInput({
    ship,
    dt,
    desiredHeadingRad,
    windDirectionRad,
    windStrength,
    speedCapPx,
    autoPivot
  });
  const canRow = shipCanUseOars(ship.stats);
  let resolvedRowingMode = canRow
    ? normalizeShipRowingMode(rowingMode)
    : SHIP_ROWING_MODE_IDLE;
  if (autoPivot) {
    resolvedRowingMode = automaticFlatBattleRowingMode({
      stats: ship.stats,
      headingRad: ship.headingRad,
      speedPx: ship.speedPx,
      desiredHeadingRad,
      rowingMode: resolvedRowingMode
    });
  }
  const rowerRatio = rowingCrewRatio(
    activeCombatCrew(ship.crew, ship.woundedCrew),
    ship.stats.crewCapacity
  );
  if (desiredHeadingRad !== null) {
    const turnRate = shipRowingModeIsPivot(resolvedRowingMode)
      ? oarPivotTurnRate({
          turnRateRad: ship.stats.turnRateRad,
          mass: ship.stats.mass,
          rowerRatio
        })
      : shipTurnRate({
          turnRateRad: ship.stats.turnRateRad,
          speedRad: Math.abs(ship.speedPx) / FLAT_BATTLE_PIXELS_PER_RADIAN,
          topSpeedRad: ship.stats.topSpeedRad
        });
    ship.headingRad = turnAngleToward(ship.headingRad, desiredHeadingRad, turnRate * dt);
  }

  const windFlowDirectionRad = signedAngle(windDirectionRad + Math.PI);
  const alignment = clamp(Math.cos(ship.headingRad - windFlowDirectionRad), -1, 1);
  const pivoting = shipRowingModeIsPivot(resolvedRowingMode);
  const sailEfficiency = pivoting
    ? 0
    : sailingEfficiencyForAlignment(ship.stats, alignment);
  const thrustDirection = shipRowingModeThrustDirection(resolvedRowingMode);
  const propulsion = shipPropulsionPerformance(ship.stats, {
    windStrength,
    sailEfficiency,
    minimumSailSpeed: SHIP_MINIMUM_POWERED_SPEED_RAD,
    rowerRatio,
    rowingRequested: thrustDirection !== 0,
    rowingDirection: thrustDirection < 0 ? -1 : 1
  });
  ship.rowingMode = propulsion.rowing || pivoting
    ? resolvedRowingMode
    : SHIP_ROWING_MODE_IDLE;
  ship.rowing = shipRowingModeIsActive(ship.rowingMode);
  const poweredAccelerationRad = shipPoweredAccelerationRad({
    baseAccelerationRad: ship.stats.accelerationRad * propulsion.accelerationFactor,
    speedTowardThrustRad:
      ship.speedPx / FLAT_BATTLE_PIXELS_PER_RADIAN * propulsion.propulsionDirection,
    poweredSpeedLimitRad: propulsion.maxSpeedRad
  });
  ship.speedPx += poweredAccelerationRad * FLAT_BATTLE_PIXELS_PER_RADIAN *
    propulsion.propulsionDirection * dt;
  ship.speedPx *= shipDragFactor(propulsion.stalled, dt);
  const propulsionMaxSpeedPx = propulsion.stalled
    ? 0
    : propulsion.maxSpeedRad * FLAT_BATTLE_PIXELS_PER_RADIAN;
  const maximumSpeedPx = Math.min(propulsionMaxSpeedPx, Math.max(0, speedCapPx));
  ship.speedPx = clamp(ship.speedPx, -maximumSpeedPx, maximumSpeedPx);

  return Object.freeze({
    distancePx: ship.speedPx * dt,
    movementHeadingRad: signedAngle(ship.headingRad + (ship.speedPx < 0 ? Math.PI : 0)),
    rowerRatio,
    propulsion
  });
}

export function automaticFlatBattleRowingMode({
  stats,
  headingRad,
  speedPx,
  desiredHeadingRad,
  rowingMode
}) {
  if (!stats || typeof stats !== "object" || !Number.isFinite(headingRad) ||
      !Number.isFinite(speedPx) ||
      (desiredHeadingRad !== null && !Number.isFinite(desiredHeadingRad))) {
    throw new Error("Automatic flat-battle rowing requires valid ship motion");
  }
  const normalized = shipCanUseOars(stats)
    ? normalizeShipRowingMode(rowingMode)
    : SHIP_ROWING_MODE_IDLE;
  if (normalized !== SHIP_ROWING_MODE_AHEAD || desiredHeadingRad === null) return normalized;
  const speedRatio = Math.abs(speedPx) /
    (stats.topSpeedRad * FLAT_BATTLE_PIXELS_PER_RADIAN);
  if (speedRatio > AUTO_PIVOT_MAXIMUM_SPEED_RATIO) return normalized;
  const turn = signedAngle(desiredHeadingRad - headingRad);
  if (Math.abs(turn) <= AUTO_PIVOT_MINIMUM_TURN_RAD ||
      Math.cos(turn) <= -Math.cos(AUTO_PIVOT_REVERSE_CONE_RAD)) {
    return normalized;
  }
  return turn > 0 ? SHIP_ROWING_MODE_PIVOT_STARBOARD : SHIP_ROWING_MODE_PIVOT_PORT;
}

function validateKinematicsInput({
  ship,
  dt,
  desiredHeadingRad,
  windDirectionRad,
  windStrength,
  speedCapPx,
  autoPivot
}) {
  if (!ship?.stats || !Number.isFinite(ship.headingRad) || !Number.isFinite(ship.speedPx)) {
    throw new Error("Flat-battle kinematics require a valid ship");
  }
  if (!Number.isInteger(ship.crew) || !Number.isInteger(ship.woundedCrew)) {
    throw new Error("Flat-battle kinematics require integer crew counts");
  }
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid flat-battle timestep: ${dt}`);
  if (desiredHeadingRad !== null && !Number.isFinite(desiredHeadingRad)) {
    throw new Error(`Invalid flat-battle desired heading: ${desiredHeadingRad}`);
  }
  if (!Number.isFinite(windDirectionRad) || !Number.isFinite(windStrength) || windStrength < 0) {
    throw new Error("Flat-battle kinematics require valid wind");
  }
  if (!(Number.isFinite(speedCapPx) || speedCapPx === Number.POSITIVE_INFINITY) || speedCapPx < 0) {
    throw new Error(`Invalid flat-battle speed cap: ${speedCapPx}`);
  }
  if (typeof autoPivot !== "boolean") throw new Error("Flat-battle auto-pivot flag must be boolean");
}

function turnAngleToward(current, target, maximumDelta) {
  const delta = signedAngle(target - current);
  return signedAngle(current + clamp(delta, -maximumDelta, maximumDelta));
}

function signedAngle(value) {
  return Math.atan2(Math.sin(value), Math.cos(value));
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
