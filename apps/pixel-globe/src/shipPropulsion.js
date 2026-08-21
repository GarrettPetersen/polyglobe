import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_PROPULSION_SAIL
} from "./shipStats.js";

export const HYBRID_ROWING_SPEED_RATIO = 0.36;
export const HYBRID_ROWING_ACCELERATION_RATIO = 0.42;
export const ROWING_ASTERN_SPEED_RATIO = 0.62;
export const ROWING_ASTERN_ACCELERATION_RATIO = 0.72;
export const HYBRID_ROUTE_PROGRESS_FLOOR = 0.34;
export const MAX_EFFECTIVE_ROWERS = 20;
export const ROWING_FOOD_CONSUMPTION_MULTIPLIER = 1.15;
export const SHIP_DRAG_PER_SECOND = 0.62;
export const SHIP_STALLED_DRAG_MULTIPLIER = 1.35;
export const SHIP_MINIMUM_POWERED_SPEED_RAD = 0.006;
export const SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD = Math.PI / 15;
export const SAIL_CLOSE_HAULED_EFFICIENCY = 0.46;

export function sailWindSpeedFactor(windStrength) {
  if (!Number.isFinite(windStrength) || windStrength < 0) {
    throw new Error(`Invalid sailing wind strength: ${windStrength}`);
  }
  return Math.min(1, 0.28 + windStrength * 0.72);
}

export function sailingEfficiencyForAlignment(stats, alignment) {
  if (!stats || !Number.isFinite(stats.upwindStallAngleRad)) {
    throw new Error("Sailing efficiency requires valid ship stats");
  }
  if (!Number.isFinite(alignment) || alignment < -1 || alignment > 1) {
    throw new Error(`Invalid sailing alignment: ${alignment}`);
  }
  const angleFromWind = Math.acos(clamp(-alignment, -1, 1));
  const stallAngle = stats.upwindStallAngleRad;
  const closeHauledAngle = Math.min(
    Math.PI / 2 - 0.01,
    stallAngle + SAIL_CLOSE_HAULED_ANGLE_RANGE_RAD
  );
  if (angleFromWind <= stallAngle) return 0;
  if (angleFromWind <= closeHauledAngle) {
    return SAIL_CLOSE_HAULED_EFFICIENCY * smoothstep(
      (angleFromWind - stallAngle) / (closeHauledAngle - stallAngle)
    );
  }
  if (angleFromWind <= Math.PI / 2) {
    const t = smoothstep((angleFromWind - closeHauledAngle) / (Math.PI / 2 - closeHauledAngle));
    return SAIL_CLOSE_HAULED_EFFICIENCY + (1 - SAIL_CLOSE_HAULED_EFFICIENCY) * t;
  }
  if (angleFromWind <= Math.PI * 0.75) {
    return 1 - (angleFromWind - Math.PI / 2) / (Math.PI * 0.25) * 0.15;
  }
  return 0.85 - (angleFromWind - Math.PI * 0.75) / (Math.PI * 0.25) * 0.3;
}

export function shipDragFactor(stalled, dt) {
  if (typeof stalled !== "boolean") throw new Error("Ship drag requires a stalled state");
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid ship drag timestep: ${dt}`);
  const drag = SHIP_DRAG_PER_SECOND * (stalled ? SHIP_STALLED_DRAG_MULTIPLIER : 1);
  return Math.exp(-drag * dt);
}

export function shipPoweredAccelerationRad({
  baseAccelerationRad,
  speedTowardThrustRad,
  poweredSpeedLimitRad
}) {
  if (!Number.isFinite(baseAccelerationRad) || baseAccelerationRad < 0) {
    throw new Error(`Invalid powered ship acceleration: ${baseAccelerationRad}`);
  }
  if (!Number.isFinite(speedTowardThrustRad)) {
    throw new Error(`Invalid ship speed toward thrust: ${speedTowardThrustRad}`);
  }
  if (!(Number.isFinite(poweredSpeedLimitRad) || poweredSpeedLimitRad === Infinity) ||
      poweredSpeedLimitRad < 0) {
    throw new Error(`Invalid powered ship speed limit: ${poweredSpeedLimitRad}`);
  }
  if (baseAccelerationRad === 0 || poweredSpeedLimitRad === 0 || poweredSpeedLimitRad === Infinity) {
    return baseAccelerationRad;
  }
  const forwardSpeed = Math.min(poweredSpeedLimitRad, Math.max(0, speedTowardThrustRad));
  return baseAccelerationRad + forwardSpeed * SHIP_DRAG_PER_SECOND;
}

export function shipVelocityLimitAfterPropulsion({
  poweredSpeedLimitRad,
  priorSpeedRad,
  dragFactor
}) {
  if (!(Number.isFinite(poweredSpeedLimitRad) || poweredSpeedLimitRad === Infinity) ||
      poweredSpeedLimitRad < 0) {
    throw new Error(`Invalid powered ship speed limit: ${poweredSpeedLimitRad}`);
  }
  if (!Number.isFinite(priorSpeedRad) || priorSpeedRad < 0) {
    throw new Error(`Invalid prior ship speed: ${priorSpeedRad}`);
  }
  if (!Number.isFinite(dragFactor) || dragFactor < 0 || dragFactor > 1) {
    throw new Error(`Invalid ship propulsion drag factor: ${dragFactor}`);
  }
  if (poweredSpeedLimitRad === Infinity) return Infinity;
  return Math.max(poweredSpeedLimitRad, priorSpeedRad * dragFactor);
}

export function shipPropulsionPerformance(stats, {
  windStrength,
  sailEfficiency,
  minimumSailSpeed = 0,
  rowerRatio = 1,
  rowingRequested = true,
  rowingDirection = 1
}) {
  if (!stats || !Number.isFinite(stats.topSpeedRad) || !Number.isFinite(stats.accelerationRad)) {
    throw new Error("Ship propulsion requires valid ship stats");
  }
  if (!Number.isFinite(windStrength) || windStrength < 0) {
    throw new Error(`Invalid propulsion wind strength: ${windStrength}`);
  }
  if (!Number.isFinite(sailEfficiency) || sailEfficiency < 0) {
    throw new Error(`Invalid sail efficiency: ${sailEfficiency}`);
  }
  if (!Number.isFinite(minimumSailSpeed) || minimumSailSpeed < 0) {
    throw new Error(`Invalid minimum sail speed: ${minimumSailSpeed}`);
  }
  if (!Number.isFinite(rowerRatio) || rowerRatio < 0 || rowerRatio > 1) {
    throw new Error(`Invalid rower ratio: ${rowerRatio}`);
  }
  if (typeof rowingRequested !== "boolean") {
    throw new Error(`Invalid rowing request: ${rowingRequested}`);
  }
  if (rowingDirection !== 1 && rowingDirection !== -1) {
    throw new Error(`Invalid rowing direction: ${rowingDirection}`);
  }

  const rowingPower = rowingRequested ? Math.sqrt(rowerRatio) : 0;
  const asternSpeedScale = rowingDirection < 0 ? ROWING_ASTERN_SPEED_RATIO : 1;
  const asternAccelerationScale = rowingDirection < 0 ? ROWING_ASTERN_ACCELERATION_RATIO : 1;

  if (stats.propulsion === SHIP_PROPULSION_OAR) {
    return Object.freeze({
      accelerationFactor: rowingPower * asternAccelerationScale,
      maxSpeedRad: stats.topSpeedRad * rowingPower * asternSpeedScale,
      stalled: rowingPower <= 0,
      rowing: rowingPower > 0,
      propulsionDirection: rowingPower > 0 ? rowingDirection : 0
    });
  }

  const windFactor = sailWindSpeedFactor(windStrength);
  const sailSpeedFloor = stats.propulsion === SHIP_PROPULSION_OAR_SAIL
    ? 0
    : minimumSailSpeed;
  const uncappedSailMaxSpeed = sailEfficiency <= 0
    ? 0
    : sailSpeedFloor + (stats.topSpeedRad - sailSpeedFloor) * windFactor * sailEfficiency;
  const sailMaxSpeed = Math.min(stats.topSpeedRad, uncappedSailMaxSpeed);
  const sailAcceleration = windStrength * sailEfficiency;

  if (stats.propulsion === SHIP_PROPULSION_OAR_SAIL) {
    const backing = rowingDirection < 0 && rowingPower > 0;
    const rowingMaxSpeed = stats.topSpeedRad * HYBRID_ROWING_SPEED_RATIO * rowingPower * asternSpeedScale;
    const rowingAcceleration = HYBRID_ROWING_ACCELERATION_RATIO * rowingPower * asternAccelerationScale;
    const rowing = rowingPower > 0;
    return Object.freeze({
      accelerationFactor: backing ? rowingAcceleration : sailAcceleration + rowingAcceleration,
      maxSpeedRad: backing
        ? rowingMaxSpeed
        : Math.min(stats.topSpeedRad, sailMaxSpeed + rowingMaxSpeed),
      stalled: backing ? rowingMaxSpeed <= 0 : sailMaxSpeed <= 0 && rowingMaxSpeed <= 0,
      rowing,
      propulsionDirection: backing ? -1 : 1
    });
  }

  if (stats.propulsion !== SHIP_PROPULSION_SAIL) {
    throw new Error(`Unknown ship propulsion: ${stats.propulsion}`);
  }
  return Object.freeze({
    accelerationFactor: sailAcceleration,
    maxSpeedRad: sailEfficiency <= 0 ? Infinity : sailMaxSpeed,
    stalled: sailEfficiency <= 0,
    rowing: false,
    propulsionDirection: 1
  });
}

export function shipHasWindDeadZone(stats) {
  if (!stats || typeof stats !== "object") throw new Error("Ship propulsion requires ship stats");
  return stats.propulsion === SHIP_PROPULSION_SAIL;
}

export function shipCanUseOars(stats) {
  if (!stats || typeof stats !== "object") throw new Error("Ship propulsion requires ship stats");
  return stats.propulsion === SHIP_PROPULSION_OAR ||
    stats.propulsion === SHIP_PROPULSION_OAR_SAIL;
}

export function shipDirectionalTranslationAllowed(stats, headingAlignment) {
  if (!Number.isFinite(headingAlignment) || headingAlignment < -1 || headingAlignment > 1) {
    throw new Error(`Invalid directional translation alignment: ${headingAlignment}`);
  }
  return shipCanUseOars(stats) || headingAlignment >= 0;
}

export function rowingCrewRatio(activeCrew, shipCrewCapacity) {
  if (!Number.isInteger(activeCrew) || activeCrew < 0) {
    throw new Error(`Invalid active rowing crew: ${activeCrew}`);
  }
  if (!Number.isInteger(shipCrewCapacity) || shipCrewCapacity <= 0) {
    throw new Error(`Invalid rowing crew capacity: ${shipCrewCapacity}`);
  }
  const effectiveCeiling = Math.min(shipCrewCapacity, MAX_EFFECTIVE_ROWERS);
  return clamp(activeCrew / effectiveCeiling, 0, 1);
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
