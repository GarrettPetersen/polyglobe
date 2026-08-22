import { overboardFlightLiftPx } from "./stormWave.js";

export const CREW_DEATH_SURFACE_SEA = "sea";
export const CREW_DEATH_SURFACE_LAND = "land";
export const CREW_DEATH_SINK_SECONDS = 1.2;
export const CREW_DEATH_LAND_BURST_SECONDS = 0.65;

export function createCrewDeathEffect({
  id,
  startPosition,
  position,
  flightSeconds,
  landingSurface,
  cause,
  arrowEmbedded = false,
  incomingDirection,
  seed,
  variant
}) {
  if (typeof id !== "string" || id === "") throw new Error("Crew death effect requires an id");
  validateVector(startPosition, "start");
  validateVector(position, "landing");
  if (!Number.isFinite(flightSeconds) || flightSeconds <= 0) {
    throw new Error(`Invalid crew death flight duration: ${flightSeconds}`);
  }
  if (![CREW_DEATH_SURFACE_SEA, CREW_DEATH_SURFACE_LAND].includes(landingSurface)) {
    throw new Error(`Invalid crew death landing surface: ${landingSurface}`);
  }
  if (typeof cause !== "string" || cause === "") throw new Error("Crew death effect requires a cause");
  if (typeof arrowEmbedded !== "boolean") throw new Error("Invalid embedded-arrow state");
  validateDirection(incomingDirection);
  if (!Number.isInteger(seed) || seed < 0) throw new Error(`Invalid crew death seed: ${seed}`);
  if (variant !== 0 && variant !== 1) throw new Error(`Invalid crew death sprite variant: ${variant}`);
  return {
    id,
    startPosition: startPosition.slice(),
    position: position.slice(),
    flightSeconds,
    landingSurface,
    cause,
    arrowEmbedded,
    incomingDirection: { ...incomingDirection },
    seed: seed >>> 0,
    variant,
    ageSeconds: 0
  };
}

export function advanceCrewDeathEffects(effects, dt) {
  if (!Array.isArray(effects)) throw new Error("Crew death effect update requires an array");
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid crew death elapsed time: ${dt}`);
  for (const effect of effects) {
    validateCrewDeathEffect(effect);
    effect.ageSeconds += dt;
  }
  return effects.filter((effect) => crewDeathEffectFrame(effect).phase !== "done");
}

export function crewDeathEffectFrame(effect) {
  validateCrewDeathEffect(effect);
  const flightProgress = clamp(effect.ageSeconds / effect.flightSeconds, 0, 1);
  if (flightProgress < 1) {
    return Object.freeze({
      phase: "flight",
      flightProgress,
      resolutionProgress: 0,
      liftPx: overboardFlightLiftPx(effect.ageSeconds, effect.flightSeconds)
    });
  }
  const duration = effect.landingSurface === CREW_DEATH_SURFACE_SEA
    ? CREW_DEATH_SINK_SECONDS
    : CREW_DEATH_LAND_BURST_SECONDS;
  const resolutionProgress = (effect.ageSeconds - effect.flightSeconds) / duration;
  if (resolutionProgress >= 1 - 1e-9) {
    return Object.freeze({ phase: "done", flightProgress: 1, resolutionProgress: 1, liftPx: 0 });
  }
  return Object.freeze({
    phase: effect.landingSurface === CREW_DEATH_SURFACE_SEA ? "sink" : "burst",
    flightProgress: 1,
    resolutionProgress: clamp(resolutionProgress, 0, 1),
    liftPx: 0
  });
}

export function crewDeathLandBurstPixels(effect) {
  validateCrewDeathEffect(effect);
  if (effect.landingSurface !== CREW_DEATH_SURFACE_LAND) {
    throw new Error("Sea casualty cannot produce a land burst");
  }
  const pixels = [];
  for (let index = 0; index < 12; index++) {
    const hash = hash32(effect.seed ^ Math.imul(index + 1, 0x9e3779b1));
    const angle = (hash & 0xffff) / 0xffff * Math.PI * 2;
    const distance = 2 + ((hash >>> 16) & 7);
    pixels.push(Object.freeze({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.65,
      colorIndex: (hash >>> 24) % 3
    }));
  }
  return Object.freeze(pixels);
}

function validateCrewDeathEffect(effect) {
  if (!effect || typeof effect !== "object") throw new Error("Crew death effect is missing");
  if (!Number.isFinite(effect.ageSeconds) || effect.ageSeconds < 0) {
    throw new Error(`Invalid crew death age: ${effect.ageSeconds}`);
  }
  if (typeof effect.id !== "string" || effect.id === "") throw new Error("Crew death effect requires an id");
  validateVector(effect.startPosition, "start");
  validateVector(effect.position, "landing");
  if (!Number.isFinite(effect.flightSeconds) || effect.flightSeconds <= 0) {
    throw new Error(`Invalid crew death flight duration: ${effect.flightSeconds}`);
  }
  if (![CREW_DEATH_SURFACE_SEA, CREW_DEATH_SURFACE_LAND].includes(effect.landingSurface)) {
    throw new Error(`Invalid crew death landing surface: ${effect.landingSurface}`);
  }
  if (typeof effect.arrowEmbedded !== "boolean") throw new Error("Invalid embedded-arrow state");
  validateDirection(effect.incomingDirection);
  if (!Number.isInteger(effect.seed) || effect.seed < 0) throw new Error(`Invalid crew death seed: ${effect.seed}`);
  if (effect.variant !== 0 && effect.variant !== 1) {
    throw new Error(`Invalid crew death sprite variant: ${effect.variant}`);
  }
}

function validateVector(vector, label) {
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid crew death ${label} position`);
  }
}

function validateDirection(direction) {
  if (!direction || !Number.isFinite(direction.x) || !Number.isFinite(direction.y)) {
    throw new Error("Invalid crew death incoming direction");
  }
  const length = Math.hypot(direction.x, direction.y);
  if (Math.abs(length - 1) > 1e-6) {
    throw new Error(`Crew death incoming direction is not normalized: ${length}`);
  }
}

function hash32(value) {
  let hash = value >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
