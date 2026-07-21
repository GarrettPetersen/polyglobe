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

function validateBounds(bounds) {
  if (!bounds || !Number.isInteger(bounds.x) || !Number.isInteger(bounds.y) ||
    !Number.isInteger(bounds.w) || !Number.isInteger(bounds.h) || bounds.w <= 0 || bounds.h <= 0) {
    throw new Error("Ship terrain occlusion requires positive integer bounds");
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
