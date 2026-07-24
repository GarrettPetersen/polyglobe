export function portraitBottomTransparentRows(rgba, width, height) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Portrait frame requires positive integer dimensions: ${width}x${height}`);
  }
  if (!rgba || typeof rgba.length !== "number" || rgba.length !== width * height * 4) {
    throw new Error("Portrait frame RGBA data does not match its dimensions");
  }

  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > 0) return height - y - 1;
    }
  }
  throw new Error("Portrait frame contains no visible pixels");
}
