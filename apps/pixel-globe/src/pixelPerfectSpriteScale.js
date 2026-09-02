export function requirePixelPerfectSpriteScale(scale, label = "Sprite") {
  if (!Number.isInteger(scale) || scale <= 0) {
    throw new Error(`${label} requires a positive integer scale: ${scale}`);
  }
  return scale;
}
