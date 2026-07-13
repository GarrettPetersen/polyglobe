export const FISHING_NET_FRAME_SIZE = 30;
export const FISHING_NET_FRAME_COUNT = 15;
export const FISHING_NET_FRAME_MS = 75;
export const FISHING_NET_CYCLE_COUNT = 3;

export function fishingAnimationState(startMs, nowMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) {
    throw new Error("Fishing animation requires finite times");
  }
  const elapsedMs = Math.max(0, nowMs - startMs);
  const cycleDurationMs = FISHING_NET_FRAME_COUNT * FISHING_NET_FRAME_MS;
  const totalDurationMs = cycleDurationMs * FISHING_NET_CYCLE_COUNT;
  const complete = elapsedMs >= totalDurationMs;
  const animationMs = Math.min(elapsedMs, totalDurationMs - 1);
  const cycleIndex = Math.floor(animationMs / cycleDurationMs);
  const frameIndex = Math.floor((animationMs % cycleDurationMs) / FISHING_NET_FRAME_MS);
  return {
    complete,
    cycleIndex,
    frameIndex,
    elapsedMs,
    totalDurationMs
  };
}

export function fishingCatchChance(visibleFishCount, netCatchRateMultiplier = 1) {
  if (!Number.isInteger(visibleFishCount) || visibleFishCount <= 0) {
    throw new Error(`Invalid visible fish count: ${visibleFishCount}`);
  }
  if (!Number.isFinite(netCatchRateMultiplier) || netCatchRateMultiplier <= 0) {
    throw new Error(`Invalid fishing net catch rate: ${netCatchRateMultiplier}`);
  }
  const fishPopulationChance = clamp(0.16 + Math.min(8, visibleFishCount) * 0.0825, 0.24, 0.82);
  return clamp(fishPopulationChance * netCatchRateMultiplier, 0.12, 0.95);
}

export function fishingCatchSucceeds(randomValue, chance) {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new Error(`Invalid fishing random value: ${randomValue}`);
  }
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid fishing catch chance: ${chance}`);
  }
  return randomValue < chance;
}

export function fishingActionPresentation(speciesLabel, chance) {
  if (typeof speciesLabel !== "string" || speciesLabel.trim().length === 0) {
    throw new Error("Fishing action label requires a species name");
  }
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid fishing catch chance: ${chance}`);
  }
  return {
    label: `FISH FOR ${speciesLabel.trim().toUpperCase()}`,
    chanceLabel: `${Math.round(chance * 100)}%`
  };
}

export function canStartFishing(freeCargoSpace) {
  if (!Number.isFinite(freeCargoSpace)) {
    throw new Error(`Invalid free cargo space: ${freeCargoSpace}`);
  }
  return freeCargoSpace > 0;
}

export function fishingSideForTarget(shipX, targetX) {
  if (!Number.isFinite(shipX) || !Number.isFinite(targetX)) {
    throw new Error("Fishing side requires finite screen positions");
  }
  return targetX < shipX ? -1 : 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
