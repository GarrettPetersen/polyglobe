export function navalProjectileSeed(sequence, index, sideSalt, origin) {
  if (!Number.isInteger(sequence) || !Number.isInteger(index) || !Number.isInteger(sideSalt)) {
    throw new Error("Naval projectile seed requires integer sequence values");
  }
  if (!origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new Error("Naval projectile seed requires a finite origin");
  }
  const ox = Math.round(origin.x * 8);
  const oy = Math.round(origin.y * 8);
  return hashInt(
    Math.imul(sequence, 0x9e3779b1) ^
    Math.imul(index + 1, 0x85ebca6b) ^
    Math.imul(ox, 0x45d9f3b) ^
    Math.imul(oy, 0x27d4eb2d) ^
    sideSalt
  );
}

export function navalProjectileUnit(seed, salt) {
  if (!Number.isInteger(seed) || !Number.isInteger(salt)) {
    throw new Error("Naval projectile random unit requires integer inputs");
  }
  const value = hashInt(seed ^ Math.imul(salt + 1, 0x7f4a7c15)) & 0xffff;
  return value / 0x10000;
}

function hashInt(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}
