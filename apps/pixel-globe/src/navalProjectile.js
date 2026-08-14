import { firstSegmentShipFootprintHit } from "./shipFootprint.js";

export function navalProjectilePoint(projectile, age = projectile?.age) {
  validateProjectile(projectile, age);
  const t = clamp(age / projectile.duration, 0, 1);
  return {
    x: projectile.startX + (projectile.targetX - projectile.startX) * t,
    y: projectile.startY + (projectile.targetY - projectile.startY) * t,
    z: t === 0 || t === 1 ? 0 : Math.sin(Math.PI * t) * projectile.arcHeight
  };
}

export function navalProjectileMayHitBystanders(projectile) {
  if (!projectile || typeof projectile !== "object") {
    throw new Error("Naval projectile bystander policy requires a projectile");
  }
  return projectile.portable !== true;
}

export function navalProjectileScreenPoint(point) {
  validatePoint(point, "screen projection");
  if (point.z !== undefined && !Number.isFinite(point.z)) {
    throw new Error(`Invalid naval projectile screen projection height: ${point.z}`);
  }
  return {
    x: point.x,
    y: point.y - (point.z || 0)
  };
}

export function firstNavalProjectileHit(start, end, targets) {
  validatePoint(start, "start");
  validatePoint(end, "end");
  if (!Array.isArray(targets)) throw new Error("Naval projectile targets must be an array");

  let firstHit = null;
  const screenStart = navalProjectileScreenPoint(start);
  const screenEnd = navalProjectileScreenPoint(end);
  for (const target of targets) {
    validateTarget(target);
    const planeHit = target.footprint
      ? firstSegmentShipFootprintHit(start, end, target.footprint)
      : segmentCircleEntry(start, end, target);
    const projectedHit = target.projectileSilhouette
      ? firstSegmentShipFootprintHit(screenStart, screenEnd, target.projectileSilhouette)
      : null;
    const hit = earlierHit(planeHit, projectedHit);
    if (!hit || (firstHit && hit.fraction >= firstHit.fraction)) continue;
    firstHit = {
      target,
      ...hit
    };
  }
  return firstHit;
}

function earlierHit(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.fraction <= b.fraction ? a : b;
}

function segmentCircleEntry(start, end, target) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const offsetX = start.x - target.x;
  const offsetY = start.y - target.y;
  const radiusSquared = target.radius * target.radius;
  if (offsetX * offsetX + offsetY * offsetY <= radiusSquared) {
    return { fraction: 0, x: start.x, y: start.y };
  }

  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-12) return null;
  const b = 2 * (offsetX * dx + offsetY * dy);
  const c = offsetX * offsetX + offsetY * offsetY - radiusSquared;
  const discriminant = b * b - 4 * lengthSquared * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const entry = (-b - root) / (2 * lengthSquared);
  const exit = (-b + root) / (2 * lengthSquared);
  if (exit < 0 || entry > 1) return null;
  const fraction = clamp(entry, 0, 1);
  return {
    fraction,
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction
  };
}

function validateProjectile(projectile, age) {
  if (!projectile || typeof projectile !== "object") {
    throw new Error("Naval projectile point requires a projectile");
  }
  for (const key of ["startX", "startY", "targetX", "targetY", "duration", "arcHeight"]) {
    if (!Number.isFinite(projectile[key])) {
      throw new Error(`Invalid naval projectile ${key}: ${projectile[key]}`);
    }
  }
  if (projectile.duration <= 0) {
    throw new Error(`Invalid naval projectile duration: ${projectile.duration}`);
  }
  if (projectile.arcHeight < 0) {
    throw new Error(`Invalid naval projectile arc height: ${projectile.arcHeight}`);
  }
  if (!Number.isFinite(age) || age < 0) throw new Error(`Invalid naval projectile age: ${age}`);
}

function validatePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Invalid naval projectile ${label} point`);
  }
}

function validateTarget(target) {
  if (
    !target ||
    typeof target.id !== "string" ||
    target.id.length === 0 ||
    !Number.isFinite(target.x) ||
    !Number.isFinite(target.y) ||
    !validTargetShape(target)
  ) {
    throw new Error("Invalid naval projectile target");
  }
}

function validTargetShape(target) {
  if (Array.isArray(target.footprint)) {
    return target.footprint.length >= 3 && (
      target.projectileSilhouette === undefined ||
      (Array.isArray(target.projectileSilhouette) && target.projectileSilhouette.length >= 3)
    );
  }
  return Number.isFinite(target.radius) && target.radius > 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
