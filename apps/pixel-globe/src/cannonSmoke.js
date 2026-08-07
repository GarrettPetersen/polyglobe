import { NAVAL_WEAPON_CANNON } from "./navalWeapons.js";

export const CANNON_SMOKE_TTL_SECONDS = 2.2;

const PARTICLE_COUNT = 30;
const MUZZLE_PARTICLE_COUNT = 6;

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
    seed: projectile.seed >>> 0,
    scale: projectile.smokeScale || 1
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
  const particleCount = Math.max(4, Math.round(PARTICLE_COUNT * burst.scale));
  for (let index = 0; index < particleCount; index++) {
    const random = smokeRandom(burst.seed, index);
    const delay = index < MUZZLE_PARTICLE_COUNT ? 0 : random[0] * 0.2;
    if (burst.age < delay) continue;
    const life = clamp((burst.age - delay) / (burst.ttl - delay), 0, 1);
    const outward = (2 + life * 7 + (random[1] * 2 - 1) * (2 + life * 13)) * burst.scale;
    const sideways = (random[2] * 2 - 1) * (2 + life * 11) * burst.scale;
    const rise = life * (4 + random[3] * 9) * burst.scale;
    const size = Math.max(1, Math.round(smokeParticleSize(life, random[1], index) * burst.scale));
    pixels.push({
      x: Math.round(burst.x + burst.directionX * outward - burst.directionY * sideways - size / 2),
      y: Math.round(burst.y + burst.directionY * outward + burst.directionX * sideways - rise - size / 2),
      size,
      alpha: Math.pow(1 - life, 0.92) * (0.78 + random[0] * 0.2),
      shade: random[3] < 0.12 ? 0 : random[3] < 0.48 ? 1 : 2
    });
  }
  return pixels;
}

function smokeParticleSize(life, sizeNoise, index) {
  if (life < 0.08) return index < MUZZLE_PARTICLE_COUNT ? 4 : 3;
  if (life < 0.68) return sizeNoise > 0.64 ? 6 : sizeNoise > 0.24 ? 5 : 4;
  return sizeNoise > 0.58 ? 4 : 3;
}

function validateCannonProjectile(projectile) {
  if (!projectile || (projectile.kind !== NAVAL_WEAPON_CANNON && !(projectile.smokeScale > 0))) {
    throw new Error(`Cannon smoke requires a cannon projectile: ${projectile?.kind}`);
  }
  for (const key of ["startX", "startY", "targetX", "targetY", "seed"]) {
    if (!Number.isFinite(projectile[key])) throw new Error(`Invalid cannon smoke projectile ${key}: ${projectile[key]}`);
  }
}

function validateCannonSmokeBurst(burst) {
  if (!burst || typeof burst !== "object") throw new Error("Invalid cannon smoke burst");
  for (const key of ["x", "y", "directionX", "directionY", "age", "ttl", "seed", "scale"]) {
    if (!Number.isFinite(burst[key])) throw new Error(`Invalid cannon smoke burst ${key}: ${burst[key]}`);
  }
  if (burst.age < 0 || burst.ttl <= 0 || burst.age > burst.ttl) {
    throw new Error(`Invalid cannon smoke lifetime: ${burst.age}/${burst.ttl}`);
  }
  if (burst.scale <= 0 || burst.scale > 1) throw new Error(`Invalid cannon smoke scale: ${burst.scale}`);
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
