export const CLOUD_SPRITE_ASSET_VERSION = "cloud-sprites-2";
export const CLOUD_SPRITE_FRAME_SIZE = 64;
export const CLOUD_SPRITE_VARIANT_COUNT = 5;
export const CLOUD_SPRITE_SHEET_PATH = "assets/clouds/clouds-Sheet.png";
export const CLOUD_SPRITE_SHEET_WIDTH = CLOUD_SPRITE_FRAME_SIZE * CLOUD_SPRITE_VARIANT_COUNT;
export const CLOUD_SPRITE_SHEET_HEIGHT = CLOUD_SPRITE_FRAME_SIZE;
export const CLOUD_MAX_ALPHA = 0.6;

export function cloudSpriteFrameIndex(templateIndex) {
  if (!Number.isInteger(templateIndex)) {
    throw new Error(`Cloud sprite template index must be an integer: ${templateIndex}`);
  }
  return ((templateIndex % CLOUD_SPRITE_VARIANT_COUNT) + CLOUD_SPRITE_VARIANT_COUNT) %
    CLOUD_SPRITE_VARIANT_COUNT;
}

export function cloudSpriteSourceRect(templateIndex) {
  const frameIndex = cloudSpriteFrameIndex(templateIndex);
  return Object.freeze({
    x: frameIndex * CLOUD_SPRITE_FRAME_SIZE,
    y: 0,
    width: CLOUD_SPRITE_FRAME_SIZE,
    height: CLOUD_SPRITE_FRAME_SIZE
  });
}

export function cloudLifecycleAlpha(lifecycleU, fadeRatio = 0.22) {
  if (!Number.isFinite(lifecycleU)) {
    throw new Error(`Cloud lifecycle position must be finite: ${lifecycleU}`);
  }
  if (!Number.isFinite(fadeRatio) || fadeRatio <= 0 || fadeRatio >= 0.5) {
    throw new Error(`Cloud fade ratio must be between zero and one half: ${fadeRatio}`);
  }
  const x = clamp(lifecycleU, 0, 1);
  let envelope = 1;
  if (x < fadeRatio) envelope = smoothstep(0, fadeRatio, x);
  if (x > 1 - fadeRatio) envelope = 1 - smoothstep(1 - fadeRatio, 1, x);
  return envelope * CLOUD_MAX_ALPHA;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
