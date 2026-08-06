import { NAVAL_WEAPON_ARROW, NAVAL_WEAPON_CANNON } from "./navalWeapons.js";

export const HULL_SPLINTER_TTL_SECONDS = 0.58;

export function createHullSplinterBurst(projectile, point) {
  validateProjectile(projectile);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Invalid hull splinter impact point: ${point?.x}, ${point?.y}`);
  }
  const dx = projectile.targetX - projectile.startX;
  const dy = projectile.targetY - projectile.startY;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) throw new Error("Hull splinter projectile has no direction");
  return {
    x: point.x,
    y: point.y,
    incomingX: dx / length,
    incomingY: dy / length,
    age: 0,
    ttl: HULL_SPLINTER_TTL_SECONDS,
    seed: projectile.seed >>> 0,
    kind: projectile.kind,
    damage: projectile.damage,
    incendiary: projectile.incendiary === true
  };
}

export function advanceHullSplinterBursts(bursts, dt) {
  if (!Array.isArray(bursts)) throw new Error("Hull splinter bursts must be an array");
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.25) {
    throw new Error(`Invalid hull splinter timestep: ${dt}`);
  }
  const active = [];
  for (const burst of bursts) {
    validateBurst(burst);
    burst.age = Math.min(burst.ttl, burst.age + dt);
    if (burst.age < burst.ttl) active.push(burst);
  }
  return active;
}

export function hullSplinterPixels(burst) {
  validateBurst(burst);
  const cannon = burst.kind === NAVAL_WEAPON_CANNON;
  const count = cannon
    ? Math.min(10, 6 + Math.ceil(burst.damage * 1.5))
    : burst.incendiary
      ? 5
      : 3;
  const pixels = [];
  for (let index = 0; index < count; index++) {
    const random = splinterRandom(burst.seed, index);
    const speed = (cannon ? 8 : 5) + random[0] * (cannon ? 13 : 7);
    const spread = (random[1] * 2 - 1) * (cannon ? 1.15 : 0.72);
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const directionX = burst.incomingX * cos - burst.incomingY * sin;
    const directionY = burst.incomingX * sin + burst.incomingY * cos;
    const upwardSpeed = (cannon ? 8 : 5) + random[2] * (cannon ? 14 : 8);
    const z = Math.max(0, upwardSpeed * burst.age - 25 * burst.age * burst.age);
    pixels.push({
      x: Math.round(burst.x + directionX * speed * burst.age),
      y: Math.round(burst.y + directionY * speed * burst.age - z),
      alpha: Math.pow(1 - burst.age / burst.ttl, 0.8),
      shade: Math.min(2, Math.floor(random[3] * 3))
    });
  }
  return pixels;
}

function validateProjectile(projectile) {
  if (!projectile || (projectile.kind !== NAVAL_WEAPON_CANNON && projectile.kind !== NAVAL_WEAPON_ARROW)) {
    throw new Error(`Hull splinters require a naval projectile: ${projectile?.kind}`);
  }
  for (const key of ["startX", "startY", "targetX", "targetY", "seed", "damage"]) {
    if (!Number.isFinite(projectile[key])) throw new Error(`Invalid hull splinter projectile ${key}: ${projectile[key]}`);
  }
  if (projectile.damage <= 0) throw new Error(`Hull splinter damage must be positive: ${projectile.damage}`);
}

function validateBurst(burst) {
  if (!burst || typeof burst !== "object") throw new Error("Invalid hull splinter burst");
  for (const key of ["x", "y", "incomingX", "incomingY", "age", "ttl", "seed", "damage"]) {
    if (!Number.isFinite(burst[key])) throw new Error(`Invalid hull splinter burst ${key}: ${burst[key]}`);
  }
  if (burst.kind !== NAVAL_WEAPON_CANNON && burst.kind !== NAVAL_WEAPON_ARROW) {
    throw new Error(`Invalid hull splinter weapon: ${burst.kind}`);
  }
  if (typeof burst.incendiary !== "boolean") {
    throw new Error(`Invalid hull splinter incendiary state: ${burst.incendiary}`);
  }
  if (burst.age < 0 || burst.ttl <= 0 || burst.age > burst.ttl || burst.damage <= 0) {
    throw new Error(`Invalid hull splinter lifetime or damage: ${burst.age}/${burst.ttl}, ${burst.damage}`);
  }
  const directionLength = Math.hypot(burst.incomingX, burst.incomingY);
  if (Math.abs(directionLength - 1) > 1e-6) {
    throw new Error(`Hull splinter direction must be normalized: ${directionLength}`);
  }
}

function splinterRandom(seed, index) {
  const values = [];
  for (let channel = 0; channel < 4; channel++) {
    let value = seed ^ Math.imul(index + 1, 0x632be5ab) ^ Math.imul(channel + 1, 0x85157af5);
    value = Math.imul(value ^ value >>> 16, 0x7feb352d);
    value = Math.imul(value ^ value >>> 15, 0x846ca68b);
    values.push(((value ^ value >>> 16) >>> 0) / 0xffffffff);
  }
  return values;
}
