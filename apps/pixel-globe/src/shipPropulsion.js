import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_PROPULSION_SAIL
} from "./shipStats.js";

export const HYBRID_ROWING_SPEED_RATIO = 0.36;
export const HYBRID_ROWING_ACCELERATION_RATIO = 0.42;
export const HYBRID_ROUTE_PROGRESS_FLOOR = 0.34;

export function shipPropulsionPerformance(stats, {
  windStrength,
  sailEfficiency,
  minimumSailSpeed = 0,
  rowerRatio = 1
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

  const rowingPower = Math.sqrt(rowerRatio);

  if (stats.propulsion === SHIP_PROPULSION_OAR) {
    return Object.freeze({
      accelerationFactor: rowingPower,
      maxSpeedRad: stats.topSpeedRad * rowingPower,
      stalled: rowingPower <= 0,
      rowing: rowingPower > 0
    });
  }

  const windFactor = 0.28 + windStrength * 0.72;
  const sailMaxSpeed = sailEfficiency <= 0
    ? 0
    : minimumSailSpeed + (stats.topSpeedRad - minimumSailSpeed) * windFactor * sailEfficiency;
  const sailAcceleration = windStrength * sailEfficiency;

  if (stats.propulsion === SHIP_PROPULSION_OAR_SAIL) {
    const rowingMaxSpeed = stats.topSpeedRad * HYBRID_ROWING_SPEED_RATIO * rowingPower;
    const rowing = rowingPower > 0 && rowingMaxSpeed >= sailMaxSpeed;
    return Object.freeze({
      accelerationFactor: rowing
        ? HYBRID_ROWING_ACCELERATION_RATIO * rowingPower
        : sailAcceleration,
      maxSpeedRad: Math.max(sailMaxSpeed, rowingMaxSpeed),
      stalled: sailMaxSpeed <= 0 && rowingMaxSpeed <= 0,
      rowing
    });
  }

  if (stats.propulsion !== SHIP_PROPULSION_SAIL) {
    throw new Error(`Unknown ship propulsion: ${stats.propulsion}`);
  }
  return Object.freeze({
    accelerationFactor: sailAcceleration,
    maxSpeedRad: sailEfficiency <= 0 ? Infinity : sailMaxSpeed,
    stalled: sailEfficiency <= 0,
    rowing: false
  });
}

export function shipHasWindDeadZone(stats) {
  if (!stats || typeof stats !== "object") throw new Error("Ship propulsion requires ship stats");
  return stats.propulsion === SHIP_PROPULSION_SAIL;
}
