export const WHALE_KILL_EFFECT_DURATION_MS = 1900;

const WHALE_KILL_BLAST_MS = 320;
const WHALE_KILL_SUCTION_START_MS = 220;
const WHALE_KILL_MAX_SUCTION_DELAY_MS = 560;

export function createWhaleKillEffect({
  id,
  pixels,
  centerX,
  centerY,
  startedAtMs,
  seed
}) {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Whale kill effect requires an id");
  }
  if (!Array.isArray(pixels) || pixels.length === 0) {
    throw new Error(`Whale kill effect ${id} requires visible sprite pixels`);
  }
  for (const [label, value] of Object.entries({ centerX, centerY, startedAtMs, seed })) {
    if (!Number.isFinite(value)) {
      throw new Error(`Whale kill effect ${id} has invalid ${label}: ${value}`);
    }
  }

  const particles = pixels.map((pixel, index) => createParticle(
    validatePixel(pixel, index, id),
    index,
    centerX,
    centerY,
    seed
  ));
  return Object.freeze({
    id,
    startedAtMs,
    seed: seed >>> 0,
    particles: Object.freeze(particles)
  });
}

export function whaleKillEffectFrame(effect, nowMs, target) {
  validateEffect(effect);
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid whale kill frame time: ${nowMs}`);
  const targetX = target?.x;
  const targetY = target?.y;
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    throw new Error("Whale kill effect requires a finite ship target");
  }

  const elapsedMs = Math.max(0, nowMs - effect.startedAtMs);
  if (elapsedMs >= WHALE_KILL_EFFECT_DURATION_MS) {
    return Object.freeze({ complete: true, particles: Object.freeze([]) });
  }

  const blastProgress = smootherstep(clamp(elapsedMs / WHALE_KILL_BLAST_MS, 0, 1));
  const particles = effect.particles.map((particle) => {
    const blastX = particle.x + particle.blastX * blastProgress;
    const blastY = particle.y + particle.blastY * blastProgress + 4 * blastProgress * blastProgress;
    const suctionStartMs = WHALE_KILL_SUCTION_START_MS + particle.suctionDelayMs;
    const rawSuctionProgress = clamp(
      (elapsedMs - suctionStartMs) / (WHALE_KILL_EFFECT_DURATION_MS - suctionStartMs),
      0,
      1
    );
    const suctionProgress = smootherstep(Math.pow(rawSuctionProgress, particle.suctionPower));
    const targetDx = targetX - blastX;
    const targetDy = targetY - blastY;
    const targetDistance = Math.max(1, Math.hypot(targetDx, targetDy));
    const curl = Math.sin(suctionProgress * Math.PI) * particle.curl * (1 - suctionProgress * 0.35);
    const x = lerp(blastX, targetX, suctionProgress) - targetDy / targetDistance * curl;
    const y = lerp(blastY, targetY, suctionProgress) + targetDx / targetDistance * curl;
    const arrivalFade = 1 - smoothstep(clamp((suctionProgress - 0.9) / 0.1, 0, 1));
    return Object.freeze({
      x: Math.round(x),
      y: Math.round(y),
      color: particle.color,
      alpha: particle.alpha * arrivalFade
    });
  });

  return Object.freeze({ complete: false, particles: Object.freeze(particles) });
}

export function whaleKillEffectComplete(effect, nowMs) {
  validateEffect(effect);
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid whale kill completion time: ${nowMs}`);
  return nowMs - effect.startedAtMs >= WHALE_KILL_EFFECT_DURATION_MS;
}

function createParticle(pixel, index, centerX, centerY, seed) {
  const sourceDx = pixel.x - centerX;
  const sourceDy = pixel.y - centerY;
  const baseAngle = Math.atan2(sourceDy, sourceDx);
  const angle = baseAngle + (unitRandom(seed, pixel.x, pixel.y, index, 0x4a495454) - 0.5) * 1.25;
  const distance = 5 + unitRandom(seed, pixel.x, pixel.y, index, 0x44495354) * 13;
  const curlDirection = unitRandom(seed, pixel.x, pixel.y, index, 0x4355524c) < 0.5 ? -1 : 1;
  return Object.freeze({
    ...pixel,
    blastX: Math.cos(angle) * distance,
    blastY: Math.sin(angle) * distance - 3 - unitRandom(seed, pixel.x, pixel.y, index, 0x4c494654) * 4,
    curl: curlDirection * (2 + unitRandom(seed, pixel.x, pixel.y, index, 0x5350494e) * 7),
    suctionPower: 0.7 + unitRandom(seed, pixel.x, pixel.y, index, 0x50554c4c) * 1.1,
    suctionDelayMs: Math.floor(
      unitRandom(seed, pixel.x, pixel.y, index, 0x44454c59) * WHALE_KILL_MAX_SUCTION_DELAY_MS
    )
  });
}

function validatePixel(pixel, index, id) {
  if (!pixel || !Number.isFinite(pixel.x) || !Number.isFinite(pixel.y) ||
      typeof pixel.color !== "string" || pixel.color.length === 0 ||
      !Number.isFinite(pixel.alpha) || pixel.alpha <= 0 || pixel.alpha > 1) {
    throw new Error(`Whale kill effect ${id} has invalid pixel ${index}`);
  }
  return Object.freeze({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    alpha: pixel.alpha
  });
}

function validateEffect(effect) {
  if (!effect || !Array.isArray(effect.particles) || effect.particles.length === 0 ||
      !Number.isFinite(effect.startedAtMs)) {
    throw new Error("Invalid whale kill effect state");
  }
}

function unitRandom(seed, x, y, index, salt) {
  return hash32(
    (seed >>> 0) ^
    Math.imul(Math.round(x) + 257, 0x9e3779b1) ^
    Math.imul(Math.round(y) + 263, 0x85ebca6b) ^
    Math.imul(index + 1, 0xc2b2ae35) ^
    salt
  ) / 0x100000000;
}

function hash32(value) {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x7feb352d);
  result ^= result >>> 15;
  result = Math.imul(result, 0x846ca68b);
  result ^= result >>> 16;
  return result >>> 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function smootherstep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
