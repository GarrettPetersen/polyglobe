import { clamp, dot3, normalize3 } from "./geodesic.js";

const DIRECTION_EPSILON = 1e-10;
const TENSION_SPEED_EPSILON = 1e-12;

export function whaleTowKinematics({
  shipPosition,
  shipVelocity,
  whalePosition,
  whaleHeading,
  whaleSpeedRad,
  maximumRopeLengthRad,
  tautToleranceRad
}) {
  assertVector(shipPosition, "whale tow ship position");
  assertVector(shipVelocity, "whale tow ship velocity");
  assertVector(whalePosition, "whale tow whale position");
  assertVector(whaleHeading, "whale tow whale heading");
  assertPositiveFinite(whaleSpeedRad, "whale tow speed");
  if (!Number.isFinite(maximumRopeLengthRad) || maximumRopeLengthRad <= 0 ||
      maximumRopeLengthRad >= Math.PI) {
    throw new Error(`Invalid whale tow rope length: ${maximumRopeLengthRad}`);
  }
  if (!Number.isFinite(tautToleranceRad) || tautToleranceRad < 0 ||
      tautToleranceRad >= maximumRopeLengthRad) {
    throw new Error(`Invalid whale tow taut tolerance: ${tautToleranceRad}`);
  }

  const shipNormal = normalize3(shipPosition);
  const whaleNormal = normalize3(whalePosition);
  const distanceRad = Math.acos(clamp(dot3(shipNormal, whaleNormal), -1, 1));
  const spareLineRad = Math.max(0, maximumRopeLengthRad - distanceRad);
  const towardWhale = normalizeTangentOrNull(whaleNormal, shipNormal);
  if (!towardWhale) {
    return {
      distanceRad,
      spareLineRad,
      separationSpeedRad: 0,
      hasTension: false,
      towardWhale: null
    };
  }

  const towardShip = normalizeTangentOrNull(shipNormal, whaleNormal);
  if (!towardShip) throw new Error("Whale tow has no direction at the whale");
  const awayFromShip = scaleVector(towardShip, -1);
  const normalizedWhaleHeading = normalizeRequiredTangent(
    whaleHeading,
    whaleNormal,
    "whale tow heading"
  );
  const whaleAwaySpeedRad = dot3(normalizedWhaleHeading, awayFromShip) * whaleSpeedRad;
  const shipTowardSpeedRad = dot3(shipVelocity, towardWhale);
  const separationSpeedRad = whaleAwaySpeedRad - shipTowardSpeedRad;
  const ropeIsAtLimit = distanceRad >= maximumRopeLengthRad - tautToleranceRad;

  return {
    distanceRad,
    spareLineRad,
    separationSpeedRad,
    hasTension: ropeIsAtLimit && separationSpeedRad > TENSION_SPEED_EPSILON,
    towardWhale
  };
}

export function applyWhaleTowPull(shipVelocity, kinematics, response) {
  assertVector(shipVelocity, "whale tow ship velocity");
  if (!kinematics || typeof kinematics !== "object") {
    throw new Error("Whale tow pull requires kinematics");
  }
  if (!Number.isFinite(response) || response < 0 || response > 1) {
    throw new Error(`Invalid whale tow response: ${response}`);
  }
  if (!kinematics.hasTension) return shipVelocity.slice();
  assertVector(kinematics.towardWhale, "whale tow pull direction");
  assertPositiveFinite(kinematics.separationSpeedRad, "whale tow separation speed");
  const pullSpeedRad = kinematics.separationSpeedRad * response;
  return [
    shipVelocity[0] + kinematics.towardWhale[0] * pullSpeedRad,
    shipVelocity[1] + kinematics.towardWhale[1] * pullSpeedRad,
    shipVelocity[2] + kinematics.towardWhale[2] * pullSpeedRad
  ];
}

function normalizeTangentOrNull(vector, normal) {
  const alongNormal = dot3(vector, normal);
  const projected = [
    vector[0] - normal[0] * alongNormal,
    vector[1] - normal[1] * alongNormal,
    vector[2] - normal[2] * alongNormal
  ];
  const length = Math.hypot(projected[0], projected[1], projected[2]);
  if (length <= DIRECTION_EPSILON) return null;
  return scaleVector(projected, 1 / length);
}

function normalizeRequiredTangent(vector, normal, label) {
  const tangent = normalizeTangentOrNull(vector, normal);
  if (!tangent) throw new Error(`${label} has no tangent direction`);
  return tangent;
}

function scaleVector(vector, scale) {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function assertPositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${label}: ${value}`);
}

function assertVector(vector, label) {
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} must be a finite 3D vector`);
  }
}
