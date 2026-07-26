export const CLOUD_RECEIVER_OCEAN = 0;
export const CLOUD_RECEIVER_LAND = 1;
export const CLOUD_RECEIVER_ELEVATED = 2;
export const CLOUD_RECEIVER_TIER_COUNT = 3;

export const CLOUD_RECEIVER_PROFILES = Object.freeze([
  Object.freeze({ heightRatio: 0, screenLiftPx: 0 }),
  Object.freeze({ heightRatio: 0.12, screenLiftPx: 2 }),
  Object.freeze({ heightRatio: 0.38, screenLiftPx: 7 })
]);

export const CLOUD_SHADOW_HEIGHT_PX = 22;
export const CLOUD_SHADOW_MAX_DISTANCE_PX = 76;

export function cloudLifecycleAlpha(lifecycleU, fadeRatio = 0.22) {
  if (!Number.isFinite(lifecycleU)) {
    throw new Error(`Cloud lifecycle position must be finite: ${lifecycleU}`);
  }
  if (!Number.isFinite(fadeRatio) || fadeRatio <= 0 || fadeRatio >= 0.5) {
    throw new Error(`Cloud fade ratio must be between zero and one half: ${fadeRatio}`);
  }
  const x = clamp(lifecycleU, 0, 1);
  if (x < fadeRatio) return smoothstep(0, fadeRatio, x);
  if (x > 1 - fadeRatio) return 1 - smoothstep(1 - fadeRatio, 1, x);
  return 1;
}

export function cloudShadowOffset({
  sunAltitude,
  awayFromSun,
  receiverTier,
  cloudHeightPx = CLOUD_SHADOW_HEIGHT_PX,
  maximumDistancePx = CLOUD_SHADOW_MAX_DISTANCE_PX
}) {
  if (!Number.isFinite(sunAltitude)) {
    throw new Error(`Cloud shadow sun altitude must be finite: ${sunAltitude}`);
  }
  if (!Number.isFinite(awayFromSun?.x) || !Number.isFinite(awayFromSun?.y)) {
    throw new Error("Cloud shadow direction must contain finite x and y values");
  }
  if (!Number.isInteger(receiverTier) ||
      receiverTier < 0 ||
      receiverTier >= CLOUD_RECEIVER_TIER_COUNT) {
    throw new Error(`Unknown cloud shadow receiver tier: ${receiverTier}`);
  }
  if (!Number.isFinite(cloudHeightPx) || cloudHeightPx <= 0) {
    throw new Error(`Cloud shadow height must be positive: ${cloudHeightPx}`);
  }
  if (!Number.isFinite(maximumDistancePx) || maximumDistancePx <= 0) {
    throw new Error(`Cloud shadow maximum distance must be positive: ${maximumDistancePx}`);
  }

  const directionLength = Math.hypot(awayFromSun.x, awayFromSun.y);
  if (directionLength <= 1e-8) throw new Error("Cloud shadow direction cannot be zero");
  const directionX = awayFromSun.x / directionLength;
  const directionY = awayFromSun.y / directionLength;
  const profile = CLOUD_RECEIVER_PROFILES[receiverTier];
  const altitude = clamp(sunAltitude, 0.08, 1);
  const horizontalSunRatio = Math.sqrt(Math.max(0, 1 - altitude * altitude)) / altitude;
  const effectiveHeight = cloudHeightPx * (1 - profile.heightRatio);
  const distance = Math.min(maximumDistancePx, effectiveHeight * horizontalSunRatio);
  return Object.freeze({
    x: directionX * distance,
    y: directionY * distance - profile.screenLiftPx,
    distance
  });
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
