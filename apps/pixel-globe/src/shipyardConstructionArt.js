const SHIPYARD_OUTLINE_RGBA = Object.freeze([62, 48, 34, 255]);

export function shipyardConstructionPixels(sourcePixels, width, height, progress) {
  return constructionPixels(sourcePixels, width, height, progress, { outline: true });
}

export function shipyardConstructionFillPixels(sourcePixels, width, height, progress) {
  return constructionPixels(sourcePixels, width, height, progress, { outline: false });
}

function constructionPixels(sourcePixels, width, height, progress, { outline }) {
  if (!(sourcePixels instanceof Uint8ClampedArray) || sourcePixels.length !== width * height * 4) {
    throw new Error("Shipyard construction art requires complete RGBA source pixels");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid shipyard construction art size: ${width}x${height}`);
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new Error(`Invalid shipyard construction progress: ${progress}`);
  }

  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!pixelIsOpaque(sourcePixels, width, x, y)) continue;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxY < minY) throw new Error("Shipyard side-view art has no opaque pixels");

  const output = new Uint8ClampedArray(sourcePixels.length);
  const fillY = maxY - Math.round((maxY - minY + 1) * progress) + 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      if (pixelIsOpaque(sourcePixels, width, x, y)) {
        if (y >= fillY) output.set(sourcePixels.subarray(offset, offset + 4), offset);
        continue;
      }
      if (!outline || !transparentPixelTouchesShip(sourcePixels, width, height, x, y)) continue;
      output.set(SHIPYARD_OUTLINE_RGBA, offset);
    }
  }
  return output;
}

function transparentPixelTouchesShip(pixels, width, height, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const neighborX = x + dx;
      const neighborY = y + dy;
      if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
      if (pixelIsOpaque(pixels, width, neighborX, neighborY)) return true;
    }
  }
  return false;
}

function pixelIsOpaque(pixels, width, x, y) {
  return pixels[(y * width + x) * 4 + 3] > 0;
}
