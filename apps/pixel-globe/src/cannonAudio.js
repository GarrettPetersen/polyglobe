const FULL_VOLUME_RADIUS_PX = 10;
const QUIET_RADIUS_PX = 96;
const DISTANT_GAIN = 0.16;

export function cannonShotDistanceGain(distancePx) {
  if (!Number.isFinite(distancePx) || distancePx < 0) {
    throw new Error(`Invalid cannon sound distance: ${distancePx}`);
  }
  if (distancePx <= FULL_VOLUME_RADIUS_PX) return 1;
  const distanceT = clamp(
    (distancePx - FULL_VOLUME_RADIUS_PX) / (QUIET_RADIUS_PX - FULL_VOLUME_RADIUS_PX),
    0,
    1
  );
  return DISTANT_GAIN + (1 - DISTANT_GAIN) * (1 - distanceT) ** 2;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
