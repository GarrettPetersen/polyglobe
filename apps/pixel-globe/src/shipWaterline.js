export const SHIP_WATERLINE_DEPTH_BYTE = 128;
export const SHIP_WATERLINE_LEVEL = SHIP_WATERLINE_DEPTH_BYTE / 255;
export const SHIP_SUBMERGED_ALPHA = 0.38;
export const SHIP_REFRACTION_BAND_HEIGHT = 3;
export const SHIP_DECK_NORMAL_Y = 0.35;
const MAX_UNSUPPORTED_SUBMERGED_COLUMN_HEIGHT = 2;

export function shipPixelIsAboveWater(sinkHeight) {
  validateSinkHeight(sinkHeight);
  return sinkHeight > SHIP_WATERLINE_LEVEL;
}

export function floatingShipSubmergedPixelKeys(pixels, frameSize) {
  if (!Array.isArray(pixels) || pixels.length === 0) {
    throw new Error("Floating ship waterline requires opaque sprite pixels");
  }
  if (!Number.isInteger(frameSize) || frameSize <= 0) {
    throw new Error(`Floating ship waterline has invalid frame size: ${frameSize}`);
  }

  const pixelKinds = new Uint8Array(frameSize * frameSize);
  for (const pixel of pixels) {
    if (!pixel || !Number.isInteger(pixel.x) || !Number.isInteger(pixel.y)) {
      throw new Error("Floating ship waterline pixel has invalid coordinates");
    }
    if (pixel.x < 0 || pixel.x >= frameSize || pixel.y < 0 || pixel.y >= frameSize) {
      throw new Error(`Floating ship waterline pixel is outside its frame: ${pixel.x},${pixel.y}`);
    }
    const key = pixel.y * frameSize + pixel.x;
    if (pixelKinds[key] !== 0) {
      throw new Error(`Floating ship waterline has duplicate pixel coordinates: ${pixel.x},${pixel.y}`);
    }
    pixelKinds[key] = shipPixelIsAboveWater(pixel.sinkHeight) ? 1 : 2;
  }

  const rawSubmerged = new Set();
  for (let x = 0; x < frameSize; x++) {
    let reachedSilhouette = false;
    for (let y = frameSize - 1; y >= 0; y--) {
      const key = y * frameSize + x;
      const kind = pixelKinds[key];
      if (kind === 0) {
        if (reachedSilhouette) break;
        continue;
      }
      reachedSilhouette = true;
      if (kind === 1) break;
      rawSubmerged.add(key);
    }
  }
  return removeUnsupportedSubmergedColumns(rawSubmerged, frameSize);
}

function removeUnsupportedSubmergedColumns(rawSubmerged, frameSize) {
  const submerged = new Set(rawSubmerged);
  for (let x = 0; x < frameSize; x++) {
    let pixelsAboveColumnBottom = 0;
    for (let y = frameSize - 1; y >= 0; y--) {
      const key = y * frameSize + x;
      if (!rawSubmerged.has(key)) continue;
      if (
        pixelsAboveColumnBottom >= MAX_UNSUPPORTED_SUBMERGED_COLUMN_HEIGHT &&
        !hasNeighboringSubmergedSupport(rawSubmerged, frameSize, x, y)
      ) {
        submerged.delete(key);
      }
      pixelsAboveColumnBottom++;
    }
  }
  return submerged;
}

function hasNeighboringSubmergedSupport(submerged, frameSize, x, y) {
  for (const neighborX of [x - 1, x + 1]) {
    if (neighborX < 0 || neighborX >= frameSize) continue;
    for (let neighborY = Math.max(0, y - 1); neighborY <= Math.min(frameSize - 1, y + 1); neighborY++) {
      if (submerged.has(neighborY * frameSize + neighborX)) return true;
    }
  }
  return false;
}

export function encodedShipWaterlineY(waterlineY, minHeight, maxHeight) {
  for (const [label, value] of Object.entries({ waterlineY, minHeight, maxHeight })) {
    if (!Number.isFinite(value)) throw new Error(`Ship waterline has invalid ${label}: ${value}`);
  }
  if (maxHeight <= minHeight) {
    throw new Error(`Ship waterline has invalid visible height range: ${minHeight}..${maxHeight}`);
  }

  const rasterPadding = (maxHeight - minHeight) / (SHIP_WATERLINE_DEPTH_BYTE - 1);
  return Math.max(minHeight + rasterPadding, Math.min(maxHeight - rasterPadding, waterlineY));
}

export function shipPixelBakeHeight(height, normalY, waterlineY, rasterPadding) {
  for (const [label, value] of Object.entries({ height, normalY, waterlineY, rasterPadding })) {
    if (!Number.isFinite(value)) throw new Error(`Ship sink pixel has invalid ${label}: ${value}`);
  }
  if (rasterPadding <= 0) {
    throw new Error(`Ship sink pixel has invalid rasterPadding: ${rasterPadding}`);
  }
  if (height >= waterlineY || normalY < SHIP_DECK_NORMAL_Y) return height;
  return waterlineY + rasterPadding;
}

export function liveShipRefractionOffset(pixelY, nowMs, seed) {
  if (!Number.isInteger(pixelY) || pixelY < 0) {
    throw new Error(`Ship refraction requires a non-negative integer pixel Y: ${pixelY}`);
  }
  if (!Number.isFinite(nowMs)) throw new Error(`Ship refraction requires a finite time: ${nowMs}`);
  if (!Number.isFinite(seed)) throw new Error(`Ship refraction requires a finite seed: ${seed}`);
  const band = Math.floor(pixelY / SHIP_REFRACTION_BAND_HEIGHT);
  const phase = nowMs / 420 + band * 1.17 + (seed & 1023) * 0.017;
  return Math.round(Math.sin(phase));
}

function validateSinkHeight(sinkHeight) {
  if (!Number.isFinite(sinkHeight) || sinkHeight < 0 || sinkHeight > 1) {
    throw new Error(`Ship pixel has an invalid sink height: ${sinkHeight}`);
  }
}
