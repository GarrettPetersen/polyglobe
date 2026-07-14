import { NAVAL_WEAPON_CANNON } from "./navalWeapons.js";

export const CANNON_SMOKE_TTL_SECONDS = 0.72;

const PARTICLE_COUNT = 7;

export function createCannonSmokeBurst(projectile) {
  validateCannonProjectile(projectile);
  const dx = projectile.targetX - projectile.startX;
  const dy = projectile.targetY - projectile.startY;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) throw new Error("Cannon smoke projectile has no direction");
  return {
    x: projectile.startX,
    y: projectile.startY,
    directionX: dx / length,
    directionY: dy / length,
    age: 0,
    ttl: CANNON_SMOKE_TTL_SECONDS,
    seed: projectile.seed >>> 0
  };
}

export function advanceCannonSmokeBursts(bursts, dt) {
  if (!Array.isArray(bursts)) throw new Error("Cannon smoke bursts must be an array");
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.25) {
    throw new Error(`Invalid cannon smoke timestep: ${dt}`);
  }
  const active = [];
  for (const burst of bursts) {
    validateCannonSmokeBurst(burst);
    burst.age = Math.min(burst.ttl, burst.age + dt);
    if (burst.age < burst.ttl) active.push(burst);
  }
  return active;
}

export function cannonSmokePixels(burst) {
  validateCannonSmokeBurst(burst);
  const pixels = [];
  for (let index = 0; index < PARTICLE_COUNT; index++) {
    const random = smokeRandom(burst.seed, index);
    const delay = index === 0 ? 0 : random[0] * 0.18;
    if (burst.age < delay) continue;
    const life = clamp((burst.age - delay) / (burst.ttl - delay), 0, 1);
    const outward = 1 + life * (3 + random[1] * 4);
    const sideways = (random[2] * 2 - 1) * (0.5 + life * 3.5);
    const rise = life * (1.5 + random[3] * 3.5);
    const size = life >= 0.16 && life <= 0.62 && random[1] > 0.34 ? 2 : 1;
    pixels.push({
      x: Math.round(burst.x + burst.directionX * outward - burst.directionY * sideways),
      y: Math.round(burst.y + burst.directionY * outward + burst.directionX * sideways - rise),
      size,
      alpha: Math.pow(1 - life, 1.35) * (0.48 + random[0] * 0.34),
      shade: Math.min(2, Math.floor(random[3] * 3))
    });
  }
  return pixels;
}

function validateCannonProjectile(projectile) {
  if (!projectile || projectile.kind !== NAVAL_WEAPON_CANNON) {
    throw new Error(`Cannon smoke requires a cannon projectile: ${projectile?.kind}`);
  }
  for (const key of ["startX", "startY", "targetX", "targetY", "seed"]) {
    if (!Number.isFinite(projectile[key])) throw new Error(`Invalid cannon smoke projectile ${key}: ${projectile[key]}`);
  }
}

function validateCannonSmokeBurst(burst) {
  if (!burst || typeof burst !== "object") throw new Error("Invalid cannon smoke burst");
  for (const key of ["x", "y", "directionX", "directionY", "age", "ttl", "seed"]) {
    if (!Number.isFinite(burst[key])) throw new Error(`Invalid cannon smoke burst ${key}: ${burst[key]}`);
  }
  if (burst.age < 0 || burst.ttl <= 0 || burst.age > burst.ttl) {
    throw new Error(`Invalid cannon smoke lifetime: ${burst.age}/${burst.ttl}`);
  }
  const directionLength = Math.hypot(burst.directionX, burst.directionY);
  if (Math.abs(directionLength - 1) > 1e-6) {
    throw new Error(`Cannon smoke direction must be normalized: ${directionLength}`);
  }
}

function smokeRandom(seed, index) {
  const values = [];
  for (let channel = 0; channel < 4; channel++) {
    let value = seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b);
    value = Math.imul(value ^ value >>> 16, 0x7feb352d);
    value = Math.imul(value ^ value >>> 15, 0x846ca68b);
    values.push(((value ^ value >>> 16) >>> 0) / 0xffffffff);
  }
  return values;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
