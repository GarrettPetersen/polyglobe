import { broadsideHullEdgeDistance } from "./broadsideControls.js";
import {
  NAVAL_BROADSIDE_HALF_ANGLE_RAD,
  NAVAL_CANNON_AIM_SPREAD_RAD,
  NAVAL_CANNON_ARC_HEIGHT_PX,
  NAVAL_CANNON_RANGE_JITTER_PX,
  NAVAL_CANNON_RANGE_PX,
  NAVAL_CANNON_SPEED_PX,
  accurateBroadsideShotIndex,
  cannonMuzzleForeAftSpan
} from "./navalWeapons.js";

const AIMED_RANGE_JITTER_PX = 7;
const MUZZLE_SIDE_JITTER_PX = 0.75;

export function createNavalBroadsideVolley({
  origin,
  heading,
  hullFootprint,
  sideName,
  projectileCount,
  weapon,
  randomUnit,
  seedForShot,
  targetPoint = null,
  aimAtTarget = false,
  spreadRad = NAVAL_CANNON_AIM_SPREAD_RAD
}) {
  validateVolleyInput({
    origin,
    heading,
    hullFootprint,
    sideName,
    projectileCount,
    weapon,
    randomUnit,
    seedForShot,
    targetPoint,
    aimAtTarget,
    spreadRad
  });
  const normalizedHeading = normalizeDirection(heading);
  const sideDirection = navalBroadsideDirection(normalizedHeading, sideName);
  const muzzleSideOffset = broadsideHullEdgeDistance(
    hullFootprint,
    origin,
    sideDirection
  );
  const muzzleSpan = cannonMuzzleForeAftSpan(projectileCount);
  const trueShotIndex = accurateBroadsideShotIndex(projectileCount);
  const range = NAVAL_CANNON_RANGE_PX * weapon.rangeScale;
  const targetDirection = targetPoint
    ? normalizeDirection({ x: targetPoint.x - origin.x, y: targetPoint.y - origin.y })
    : null;
  const targetDistance = targetPoint
    ? Math.hypot(targetPoint.x - origin.x, targetPoint.y - origin.y)
    : Number.POSITIVE_INFINITY;
  const targetIsAimed = aimAtTarget && targetPoint !== null &&
    targetDistance <= range * 1.08 &&
    dot(sideDirection, targetDirection) >= Math.cos(NAVAL_BROADSIDE_HALF_ANGLE_RAD);

  return Object.freeze(Array.from({ length: projectileCount }, (_, shotIndex) => {
    const trueShot = shotIndex === trueShotIndex;
    const lineT = projectileCount === 1 ? 0 : shotIndex / (projectileCount - 1) - 0.5;
    const sideJitter = trueShot
      ? 0
      : (unit(randomUnit, shotIndex, 3) * 2 - 1) * MUZZLE_SIDE_JITTER_PX;
    const startX = origin.x + normalizedHeading.x * lineT * muzzleSpan +
      sideDirection.x * (muzzleSideOffset + sideJitter);
    const startY = origin.y + normalizedHeading.y * lineT * muzzleSpan +
      sideDirection.y * (muzzleSideOffset + sideJitter);
    const spread = trueShot
      ? 0
      : (unit(randomUnit, shotIndex, 1) * 2 - 1) * spreadRad;
    const baseAim = targetIsAimed ? targetDirection : sideDirection;
    const aim = rotate(baseAim, spread);
    const projectileRange = targetIsAimed
      ? targetDistance + (unit(randomUnit, shotIndex, 2) - 0.5) * AIMED_RANGE_JITTER_PX
      : (NAVAL_CANNON_RANGE_PX +
          (unit(randomUnit, shotIndex, 2) * 2 - 1) * NAVAL_CANNON_RANGE_JITTER_PX) *
        weapon.rangeScale;
    const targetX = targetIsAimed && trueShot
      ? targetPoint.x
      : startX + aim.x * projectileRange;
    const targetY = targetIsAimed && trueShot
      ? targetPoint.y
      : startY + aim.y * projectileRange;
    const actualRange = Math.hypot(targetX - startX, targetY - startY);
    return Object.freeze({
      kind: weapon.kind,
      startX,
      startY,
      targetX,
      targetY,
      age: 0,
      duration: Math.max(0.1, actualRange / (NAVAL_CANNON_SPEED_PX * weapon.speedScale)),
      arcHeight: (NAVAL_CANNON_ARC_HEIGHT_PX + unit(randomUnit, shotIndex, 4) * 4) *
        weapon.arcHeightScale,
      damage: weapon.damage,
      crewDamage: 0,
      crewHitChance: 0,
      crewProtectionPenetration: 0,
      projectileSize: 2,
      seed: seedForShot(shotIndex) >>> 0,
      trueShot,
      targetAimed: targetIsAimed
    });
  }));
}

export function navalBroadsideDirection(heading, sideName) {
  if (sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown naval broadside: ${sideName}`);
  }
  const normalized = normalizeDirection(heading);
  return sideName === "port"
    ? { x: normalized.y, y: -normalized.x }
    : { x: -normalized.y, y: normalized.x };
}

export function navalBroadsideSideForTarget(heading, origin, targetPoint) {
  const normalizedHeading = normalizeDirection(heading);
  const direction = normalizeDirection({
    x: targetPoint.x - origin.x,
    y: targetPoint.y - origin.y
  });
  const forwardAlignment = dot(normalizedHeading, direction);
  if (Math.abs(forwardAlignment) > Math.sin(NAVAL_BROADSIDE_HALF_ANGLE_RAD)) return null;
  const cross = normalizedHeading.x * direction.y - normalizedHeading.y * direction.x;
  return cross > 0 ? "starboard" : "port";
}

function validateVolleyInput(values) {
  for (const [label, point] of [
    ["origin", values.origin],
    ["heading", values.heading],
    ["target", values.targetPoint]
  ]) {
    if (point === null && label === "target") continue;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`Naval broadside has invalid ${label}`);
    }
  }
  if (!Array.isArray(values.hullFootprint) || values.hullFootprint.length < 3) {
    throw new Error("Naval broadside requires a hull footprint");
  }
  if (!Number.isInteger(values.projectileCount) || values.projectileCount <= 0) {
    throw new Error(`Invalid naval broadside projectile count: ${values.projectileCount}`);
  }
  if (!values.weapon || typeof values.weapon.kind !== "string" ||
      !Number.isFinite(values.weapon.rangeScale) || !Number.isFinite(values.weapon.speedScale) ||
      !Number.isFinite(values.weapon.arcHeightScale) || !Number.isFinite(values.weapon.damage)) {
    throw new Error("Naval broadside requires a complete weapon");
  }
  if (typeof values.randomUnit !== "function" || typeof values.seedForShot !== "function") {
    throw new Error("Naval broadside requires deterministic random callbacks");
  }
  if (typeof values.aimAtTarget !== "boolean") throw new Error("Naval broadside aim flag must be boolean");
  if (!Number.isFinite(values.spreadRad) || values.spreadRad < 0 || values.spreadRad >= Math.PI / 2) {
    throw new Error(`Invalid naval broadside spread: ${values.spreadRad}`);
  }
}

function unit(randomUnit, shotIndex, salt) {
  const value = randomUnit(shotIndex, salt);
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`Naval broadside random unit is out of range: ${value}`);
  }
  return value;
}

function normalizeDirection(direction) {
  const length = Math.hypot(direction.x, direction.y);
  if (!Number.isFinite(length) || length <= 1e-9) {
    throw new Error("Naval broadside direction has zero length");
  }
  return { x: direction.x / length, y: direction.y / length };
}

function rotate(direction, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: direction.x * cosine - direction.y * sine,
    y: direction.x * sine + direction.y * cosine
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}
