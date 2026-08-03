import { SHIP_STATS } from "./shipStats.js";

export const MINIMUM_CREW_WORK_MULTIPLIER = 0.5;
export const STANDARD_CREW_WORK_MULTIPLIER = 1;
export const MAXIMUM_CREW_WORK_MULTIPLIER = 2;
export const STANDARD_CREW_WORK_COUNT = 5;
export const MAXIMUM_CREW_WORK_COUNT = Math.max(...SHIP_STATS.map((stats) => stats.crewCapacity));

export function crewWorkMultiplier(activeCrew) {
  if (!Number.isInteger(activeCrew) || activeCrew < 0) {
    throw new Error(`Invalid active crew for ship work: ${activeCrew}`);
  }
  if (activeCrew > MAXIMUM_CREW_WORK_COUNT) {
    throw new Error(`Active crew exceeds world ship capacity: ${activeCrew}/${MAXIMUM_CREW_WORK_COUNT}`);
  }
  if (activeCrew === 0) return 0;
  if (activeCrew <= STANDARD_CREW_WORK_COUNT) {
    return lerp(
      MINIMUM_CREW_WORK_MULTIPLIER,
      STANDARD_CREW_WORK_MULTIPLIER,
      smoothstep((activeCrew - 1) / (STANDARD_CREW_WORK_COUNT - 1))
    );
  }
  return lerp(
    STANDARD_CREW_WORK_MULTIPLIER,
    MAXIMUM_CREW_WORK_MULTIPLIER,
    smoothstep(
      (activeCrew - STANDARD_CREW_WORK_COUNT)
      / (MAXIMUM_CREW_WORK_COUNT - STANDARD_CREW_WORK_COUNT)
    )
  );
}

export function crewScaledSuccessChance(chance, multiplier, minimum = 0, maximum = 0.98) {
  requireProbabilityScale(chance, multiplier, minimum, maximum, "success");
  if (chance === 0 || multiplier === 0) return 0;
  return clamp(chance * multiplier, minimum, maximum);
}

export function crewScaledFailureChance(chance, multiplier, minimum = 0.01, maximum = 0.98) {
  requireProbabilityScale(chance, multiplier, minimum, maximum, "failure");
  if (chance === 0) return 0;
  if (multiplier === 0) return maximum;
  return clamp(chance / multiplier, minimum, maximum);
}

function requireProbabilityScale(chance, multiplier, minimum, maximum, label) {
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid crew-scaled ${label} chance: ${chance}`);
  }
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new Error(`Invalid crew activity multiplier: ${multiplier}`);
  }
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum > 1 || minimum > maximum) {
    throw new Error(`Invalid crew-scaled ${label} bounds: ${minimum}-${maximum}`);
  }
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
