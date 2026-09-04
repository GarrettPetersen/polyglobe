import { PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS } from "../src/portAssaultBattle.js";

export const CITY_MATCHLOCK_SMOKE_MAX_PUFFS = 7;

const EMPTY_PARTICLES = Object.freeze([]);
const SMOKE_COLORS = Object.freeze([
  "#c7dcd0",
  "#9babb2",
  "#7f708a"
]);

export function cityMatchlockSmokeParticles({
  shotId,
  ageMs,
  facingRight,
  wind
}) {
  if (typeof shotId !== "string" || shotId === "") {
    throw new Error("Matchlock smoke requires a stable shot id");
  }
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    throw new Error(`Invalid matchlock smoke age: ${ageMs}`);
  }
  if (typeof facingRight !== "boolean") {
    throw new Error("Matchlock smoke requires a firing direction");
  }
  if (
    !Number.isFinite(wind?.flowX) ||
    !Number.isFinite(wind?.flowY) ||
    !Number.isFinite(wind?.strength) ||
    wind.strength < 0
  ) {
    throw new Error("Matchlock smoke requires valid screen wind");
  }
  if (ageMs >= PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS) return EMPTY_PARTICLES;

  const particles = [];
  const shotSeed = hashString32(shotId);
  const firingDirection = facingRight ? 1 : -1;
  for (let index = 0; index < CITY_MATCHLOCK_SMOKE_MAX_PUFFS; index++) {
    const seed = hashInt(shotSeed ^ Math.imul(index + 1, 0x9e3779b1));
    const emissionDelayMs = index === 0
      ? 0
      : 35 + index * 28 + Math.floor(random(seed, 0) * 70);
    const puffAgeMs = ageMs - emissionDelayMs;
    if (puffAgeMs < 0) continue;
    const lifetimeMs = PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS - emissionDelayMs;
    const life = puffAgeMs / lifetimeMs;
    if (life >= 1) continue;

    const windDistance = life * (5 + wind.strength * 9);
    const initialJet = (1 - Math.min(1, life * 1.8)) * (1 + random(seed, 1) * 3);
    const wobble = Math.sin(life * Math.PI * 3 + random(seed, 2) * Math.PI * 2) *
      (0.5 + life * 1.5);
    const size = life < 0.18 ? 1 : life < 0.58 ? 2 : 3;
    const fade = life <= 0.58 ? 1 : 1 - (life - 0.58) / 0.42;
    particles.push(Object.freeze({
      x: Math.round(
        firingDirection * initialJet + wind.flowX * windDistance + wobble
      ),
      y: Math.round(
        signedRandom(seed, 3) - life * (5 + random(seed, 4) * 5) +
          wind.flowY * windDistance * 0.32
      ),
      size,
      shape: Math.floor(random(seed, 5) * 4),
      color: SMOKE_COLORS[Math.min(
        SMOKE_COLORS.length - 1,
        Math.floor(life * SMOKE_COLORS.length)
      )],
      alpha: Math.max(0, 0.88 * fade)
    }));
  }
  return Object.freeze(particles);
}

function hashString32(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashInt(value) {
  let hash = value >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function random(seed, channel) {
  return hashInt(seed ^ Math.imul(channel + 1, 0x85ebca6b)) / 0x100000000;
}

function signedRandom(seed, channel) {
  return random(seed, channel) * 2 - 1;
}
