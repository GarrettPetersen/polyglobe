export const RIVER_BANK_NONE = 0;
export const RIVER_BANK_UPPER = 1;
export const RIVER_BANK_LOWER = 2;

export function terrainRiverBankDepthY(tileDepthY, tileHalfSize, bank) {
  if (!Number.isFinite(tileDepthY) || !Number.isFinite(tileHalfSize) || tileHalfSize <= 0) {
    throw new Error("River terrain bank depth requires a finite tile depth and positive half-size");
  }
  if (bank === RIVER_BANK_UPPER) return tileDepthY - tileHalfSize;
  if (bank === RIVER_BANK_LOWER) return tileDepthY + tileHalfSize;
  throw new Error(`Unknown river terrain bank: ${bank}`);
}

export function splitRiverTerrainBanks(riverAlpha, width, height) {
  if (!(riverAlpha instanceof Uint8Array) || !Number.isInteger(width) || !Number.isInteger(height) ||
    width <= 0 || height <= 0 || riverAlpha.length !== width * height) {
    throw new Error("River terrain bank split requires a matching alpha mask and dimensions");
  }

  const centerYByColumn = new Float64Array(width);
  centerYByColumn.fill(Number.NaN);
  const occupiedColumns = [];
  for (let x = 0; x < width; x++) {
    let yTotal = 0;
    let count = 0;
    for (let y = 0; y < height; y++) {
      if (riverAlpha[x + y * width] === 0) continue;
      yTotal += y + 0.5;
      count++;
    }
    if (count === 0) continue;
    centerYByColumn[x] = yTotal / count;
    occupiedColumns.push(x);
  }
  if (occupiedColumns.length === 0) throw new Error("River terrain bank split received an empty river mask");

  fillRiverCenterlineGaps(centerYByColumn, occupiedColumns);
  const banks = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = x + y * width;
      if (riverAlpha[index] !== 0) continue;
      banks[index] = y + 0.5 < centerYByColumn[x]
        ? RIVER_BANK_UPPER
        : RIVER_BANK_LOWER;
    }
  }
  return Object.freeze({ width, height, banks });
}

function fillRiverCenterlineGaps(centerYByColumn, occupiedColumns) {
  const firstX = occupiedColumns[0];
  const lastX = occupiedColumns[occupiedColumns.length - 1];
  const sampleOffset = Math.min(4, occupiedColumns.length - 1);
  const leftSampleX = occupiedColumns[sampleOffset];
  const rightSampleX = occupiedColumns[occupiedColumns.length - 1 - sampleOffset];
  const leftSlope = riverCenterlineSlope(centerYByColumn, firstX, leftSampleX);
  const rightSlope = riverCenterlineSlope(centerYByColumn, rightSampleX, lastX);
  for (let x = 0; x < firstX; x++) {
    centerYByColumn[x] = clampRiverCenterY(
      centerYByColumn[firstX] + leftSlope * (x - firstX),
      centerYByColumn.length
    );
  }
  for (let x = lastX + 1; x < centerYByColumn.length; x++) {
    centerYByColumn[x] = clampRiverCenterY(
      centerYByColumn[lastX] + rightSlope * (x - lastX),
      centerYByColumn.length
    );
  }

  for (let index = 1; index < occupiedColumns.length; index++) {
    const leftX = occupiedColumns[index - 1];
    const rightX = occupiedColumns[index];
    const gap = rightX - leftX;
    if (gap <= 1) continue;
    const leftY = centerYByColumn[leftX];
    const rightY = centerYByColumn[rightX];
    for (let x = leftX + 1; x < rightX; x++) {
      const progress = (x - leftX) / gap;
      centerYByColumn[x] = leftY + (rightY - leftY) * progress;
    }
  }
}

function riverCenterlineSlope(centerYByColumn, leftX, rightX) {
  if (leftX === rightX) return 0;
  const slope = (centerYByColumn[rightX] - centerYByColumn[leftX]) / (rightX - leftX);
  return Math.max(-2, Math.min(2, slope));
}

function clampRiverCenterY(value, height) {
  return Math.max(0.5, Math.min(height - 0.5, value));
}

export function createTerrainOcclusionIndex(occluders, bucketSize = 48) {
  if (!Array.isArray(occluders)) throw new Error("Terrain occlusion index requires an occluder list");
  if (!Number.isInteger(bucketSize) || bucketSize < 1) {
    throw new Error(`Invalid terrain occlusion bucket size: ${bucketSize}`);
  }
  const buckets = new Map();
  for (const occluder of occluders) {
    validateOccluder(occluder);
    const minBucketX = Math.floor(occluder.x / bucketSize);
    const maxBucketX = Math.floor((occluder.x + occluder.width - 1) / bucketSize);
    const minBucketY = Math.floor(occluder.y / bucketSize);
    const maxBucketY = Math.floor((occluder.y + occluder.height - 1) / bucketSize);
    for (let bucketY = minBucketY; bucketY <= maxBucketY; bucketY++) {
      for (let bucketX = minBucketX; bucketX <= maxBucketX; bucketX++) {
        const key = `${bucketX}:${bucketY}`;
        const entries = buckets.get(key);
        if (entries) entries.push(occluder);
        else buckets.set(key, [occluder]);
      }
    }
  }
  return Object.freeze({ bucketSize, buckets });
}

export function terrainOccludersForScreenBounds(index, screenBounds, offset) {
  if (!index?.buckets || !(index.buckets instanceof Map) || !Number.isInteger(index.bucketSize)) {
    throw new Error("Invalid terrain occlusion index");
  }
  validateBounds(screenBounds);
  if (!offset || !Number.isInteger(offset.x) || !Number.isInteger(offset.y)) {
    throw new Error("Terrain occlusion query requires an integer screen offset");
  }
  const localBounds = {
    x: screenBounds.x - offset.x,
    y: screenBounds.y - offset.y,
    w: screenBounds.w,
    h: screenBounds.h
  };
  const minBucketX = Math.floor(localBounds.x / index.bucketSize);
  const maxBucketX = Math.floor((localBounds.x + localBounds.w - 1) / index.bucketSize);
  const minBucketY = Math.floor(localBounds.y / index.bucketSize);
  const maxBucketY = Math.floor((localBounds.y + localBounds.h - 1) / index.bucketSize);
  const nearby = new Set();
  for (let bucketY = minBucketY; bucketY <= maxBucketY; bucketY++) {
    for (let bucketX = minBucketX; bucketX <= maxBucketX; bucketX++) {
      for (const occluder of index.buckets.get(`${bucketX}:${bucketY}`) || []) {
        if (!rectanglesOverlap(localBounds, occluder)) continue;
        nearby.add(occluder);
      }
    }
  }
  return [...nearby].map((occluder) => ({
    ...occluder,
    x: occluder.x + offset.x,
    y: occluder.y + offset.y,
    depthY: occluder.depthY + offset.y
  }));
}

export function shipOcclusionDepthY(spriteY, bottomOpaqueY, clearancePixels) {
  if (!Number.isInteger(spriteY) || !Number.isInteger(bottomOpaqueY) || bottomOpaqueY < 0 ||
    !Number.isInteger(clearancePixels) || clearancePixels < 0) {
    throw new Error("Ship terrain depth requires integer sprite, bottom-pixel, and clearance values");
  }
  return spriteY + bottomOpaqueY + clearancePixels;
}

export function terrainOccluderMaskIntersection(
  occluder,
  maskDestinationRect,
  maskSourceRect
) {
  validateOccluder(occluder);
  validatePositiveRect(maskDestinationRect, "terrain occlusion mask destination");
  validatePositiveRect(maskSourceRect, "terrain occlusion mask source");

  const left = Math.max(occluder.x, maskDestinationRect.x);
  const top = Math.max(occluder.y, maskDestinationRect.y);
  const right = Math.min(occluder.x + occluder.width, maskDestinationRect.x + maskDestinationRect.width);
  const bottom = Math.min(occluder.y + occluder.height, maskDestinationRect.y + maskDestinationRect.height);
  if (right <= left || bottom <= top) return null;

  const width = right - left;
  const height = bottom - top;
  const maskScaleX = maskSourceRect.width / maskDestinationRect.width;
  const maskScaleY = maskSourceRect.height / maskDestinationRect.height;
  return Object.freeze({
    sourceRect: Object.freeze({
      x: left - occluder.x,
      y: top - occluder.y,
      width,
      height
    }),
    maskSourceRect: Object.freeze({
      x: maskSourceRect.x + (left - maskDestinationRect.x) * maskScaleX,
      y: maskSourceRect.y + (top - maskDestinationRect.y) * maskScaleY,
      width: width * maskScaleX,
      height: height * maskScaleY
    }),
    destinationRect: Object.freeze({ x: left, y: top, width, height })
  });
}

export function eraseTerrainOccludersFromShipLayer(context, occluders) {
  if (!context || typeof context.save !== "function" || typeof context.restore !== "function" ||
    typeof context.drawImage !== "function") {
    throw new Error("Ship terrain masking requires a canvas context");
  }
  if (!Array.isArray(occluders)) {
    throw new Error("Ship terrain masking requires an occluder list");
  }
  context.save();
  try {
    context.globalCompositeOperation = "destination-out";
    for (const occluder of occluders) {
      validateOccluder(occluder);
      if (!occluder.drawLayer.image) {
        occluder.drawLayer.image = occluder.drawLayer.create();
        occluder.drawLayer.create = null;
      }
      if (!occluder.drawLayer.image) {
        throw new Error(`Terrain foreground layer at ${occluder.x},${occluder.y} has no image`);
      }
      context.drawImage(occluder.drawLayer.image, occluder.x, occluder.y);
    }
  } finally {
    context.restore();
  }
}

function validateBounds(bounds) {
  if (!bounds || !Number.isInteger(bounds.x) || !Number.isInteger(bounds.y) ||
    !Number.isInteger(bounds.w) || !Number.isInteger(bounds.h) || bounds.w <= 0 || bounds.h <= 0) {
    throw new Error("Ship terrain occlusion requires positive integer bounds");
  }
}

function validatePositiveRect(rect, label) {
  if (!rect || !Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
    rect.width <= 0 || rect.height <= 0) {
    throw new Error(`${label} requires a positive finite rectangle`);
  }
}

function validateOccluder(occluder) {
  if (!occluder || !Number.isInteger(occluder.x) || !Number.isInteger(occluder.y) ||
    !Number.isInteger(occluder.width) || !Number.isInteger(occluder.height) ||
    occluder.width <= 0 || occluder.height <= 0 || !Number.isFinite(occluder.depthY) ||
    !occluder.drawLayer ||
    (!occluder.drawLayer.image && typeof occluder.drawLayer.create !== "function")) {
    throw new Error("Ship terrain occlusion received an invalid draw layer");
  }
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.w > b.x &&
    a.y < b.y + b.height &&
    a.y + a.h > b.y;
}
