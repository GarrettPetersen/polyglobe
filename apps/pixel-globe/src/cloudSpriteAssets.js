export const CLOUD_SPRITE_ASSET_VERSION = "cloud-sprites-2";
export const CLOUD_SPRITE_FRAME_SIZE = 64;
export const CLOUD_SPRITE_VARIANT_COUNT = 5;
export const CLOUD_SPRITE_SHEET_PATH = "assets/clouds/clouds-Sheet.png";
export const CLOUD_SPRITE_SHEET_WIDTH = CLOUD_SPRITE_FRAME_SIZE * CLOUD_SPRITE_VARIANT_COUNT;
export const CLOUD_SPRITE_SHEET_HEIGHT = CLOUD_SPRITE_FRAME_SIZE;

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
