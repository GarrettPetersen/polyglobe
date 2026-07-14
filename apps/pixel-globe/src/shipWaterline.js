export const SHIP_WATERLINE_DEPTH_BYTE = 128;
export const SHIP_WATERLINE_LEVEL = SHIP_WATERLINE_DEPTH_BYTE / 255;
export const SHIP_SUBMERGED_ALPHA = 0.38;
export const SHIP_REFRACTION_BAND_HEIGHT = 3;
export const SHIP_DECK_NORMAL_Y = 0.35;

export function shipPixelIsAboveWater(sinkHeight) {
  validateSinkHeight(sinkHeight);
  return sinkHeight > SHIP_WATERLINE_LEVEL;
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
