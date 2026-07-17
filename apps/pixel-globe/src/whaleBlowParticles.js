export const WHALE_BLOW_DURATION_SECONDS = 2.3;
export const WHALE_BLOW_PARTICLE_COUNT = 52;
export const WHALE_BLOW_GRAVITY_PX_PER_SECOND = 44;

export function createWhaleBlowParticles(seed) {
  if (!Number.isInteger(seed)) throw new Error(`Invalid whale blow seed: ${seed}`);
  return Object.freeze(Array.from({ length: WHALE_BLOW_PARTICLE_COUNT }, (_, index) => {
    const hash = hashInt(seed ^ Math.imul(index + 1, 0x9e3779b1));
    const verticalSpeed = range(hash, 0, 65, 69);
    const mistDirection = ((hash >>> 29) & 1) === 0 ? -1 : 1;
    return Object.freeze({
      delaySeconds: range(hash, 8, 0, 0.24),
      sourceOffsetX: range(hash, 16, -1.5, 1.5),
      lateralSpeed: range(hash, 24, -2.5, 2.5),
      verticalSpeed,
      mistStartsAtSeconds: range(hash, 4, 1.18, 1.34),
      fadeStartsAtSeconds: range(hash, 12, 1.38, 1.54),
      fadeEndsAtSeconds: range(hash, 20, 1.92, 2.05),
      mistDirection,
      mistAcceleration: range(hashInt(hash ^ 0x85ebca6b), 8, 7, 13),
      hazeVariant: (hash >>> 27) & 3,
      peakHeightPx: verticalSpeed * verticalSpeed / (2 * WHALE_BLOW_GRAVITY_PX_PER_SECOND)
    });
  }));
}

export function whaleBlowParticleFrame(particle, burstAgeSeconds) {
  validateParticle(particle);
  if (!Number.isFinite(burstAgeSeconds) || burstAgeSeconds < 0) {
    throw new Error(`Invalid whale blow age: ${burstAgeSeconds}`);
  }
  const age = burstAgeSeconds - particle.delaySeconds;
  if (age < 0 || age >= particle.fadeEndsAtSeconds) return null;

  const mistAge = Math.max(0, age - particle.mistStartsAtSeconds);
  const mistSpan = particle.fadeEndsAtSeconds - particle.mistStartsAtSeconds;
  const mist = clamp(mistAge / mistSpan, 0, 1);
  const fadeSpan = particle.fadeEndsAtSeconds - particle.fadeStartsAtSeconds;
  const fade = clamp((age - particle.fadeStartsAtSeconds) / fadeSpan, 0, 1);
  const height = particle.verticalSpeed * age -
    WHALE_BLOW_GRAVITY_PX_PER_SECOND * age * age / 2;
  const mistSpread = particle.mistDirection * particle.mistAcceleration * mistAge * mistAge / 2;

  return Object.freeze({
    x: particle.sourceOffsetX + particle.lateralSpeed * age + mistSpread,
    y: -height,
    alpha: 0.94 * (1 - smoothstep(fade)),
    mist,
    hazeOffsetX: particle.mistDirection * (1 + particle.hazeVariant),
    hazeOffsetY: 1 + (particle.hazeVariant & 1)
  });
}

function validateParticle(particle) {
  if (!particle || !Number.isFinite(particle.delaySeconds) ||
      !Number.isFinite(particle.sourceOffsetX) || !Number.isFinite(particle.lateralSpeed) ||
      !Number.isFinite(particle.verticalSpeed) || !Number.isFinite(particle.mistStartsAtSeconds) ||
      !Number.isFinite(particle.fadeStartsAtSeconds) || !Number.isFinite(particle.fadeEndsAtSeconds) ||
      !Number.isFinite(particle.mistAcceleration) || !Number.isInteger(particle.mistDirection) ||
      !Number.isInteger(particle.hazeVariant)) {
    throw new Error("Malformed whale blow particle");
  }
  if (particle.mistStartsAtSeconds >= particle.fadeEndsAtSeconds ||
      particle.fadeStartsAtSeconds >= particle.fadeEndsAtSeconds ||
      Math.abs(particle.mistDirection) !== 1) {
    throw new Error("Invalid whale blow particle timing");
  }
}

function range(hash, shift, minimum, maximum) {
  const unit = ((hash >>> shift) & 0xff) / 255;
  return minimum + (maximum - minimum) * unit;
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hashInt(value) {
  let hash = value | 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
