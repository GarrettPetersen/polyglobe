export function foregroundTerrainOcclusionSpans(shipBounds, shipDepthY, occluders, isWater, riverDepthY) {
  validateBounds(shipBounds);
  if (!Number.isFinite(shipDepthY)) throw new Error(`Invalid ship terrain depth: ${shipDepthY}`);
  if (!Array.isArray(occluders)) throw new Error("Ship terrain occlusion requires an occluder list");
  if (typeof isWater !== "function") throw new Error("Ship terrain occlusion requires a water-mask callback");
  if (riverDepthY !== null && !Number.isFinite(riverDepthY)) {
    throw new Error(`Invalid ship river depth: ${riverDepthY}`);
  }

  const occupied = new Uint8Array(shipBounds.w * shipBounds.h);
  for (const occluder of occluders) {
    validateOccluder(occluder);
    const splitByRiverBank = riverDepthY !== null && occluder.containsRiver;
    if (!splitByRiverBank && occluder.depthY <= shipDepthY) continue;
    const left = Math.max(shipBounds.x, occluder.x);
    const top = Math.max(shipBounds.y, occluder.y);
    const right = Math.min(shipBounds.x + shipBounds.w, occluder.x + occluder.width);
    const bottom = Math.min(shipBounds.y + shipBounds.h, occluder.y + occluder.height);
    if (left >= right || top >= bottom) continue;

    for (let y = top; y < bottom; y++) {
      const sourceRow = (y - occluder.y) * occluder.width;
      const targetRow = (y - shipBounds.y) * shipBounds.w;
      for (let x = left; x < right; x++) {
        if (occluder.alpha[sourceRow + x - occluder.x] === 0) continue;
        if (isWater(x, y)) continue;
        if (splitByRiverBank && y < riverDepthY) continue;
        occupied[targetRow + x - shipBounds.x] = 1;
      }
    }
  }

  const spans = [];
  for (let localY = 0; localY < shipBounds.h; localY++) {
    const row = localY * shipBounds.w;
    let localX = 0;
    while (localX < shipBounds.w) {
      while (localX < shipBounds.w && occupied[row + localX] === 0) localX++;
      if (localX >= shipBounds.w) break;
      const startX = localX;
      while (localX < shipBounds.w && occupied[row + localX] !== 0) localX++;
      spans.push({
        x: shipBounds.x + startX,
        y: shipBounds.y + localY,
        width: localX - startX
      });
    }
  }
  return spans;
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
    typeof occluder.containsRiver !== "boolean" ||
    !(occluder.alpha instanceof Uint8Array) ||
    occluder.alpha.length !== occluder.width * occluder.height) {
    throw new Error("Ship terrain occlusion received an invalid terrain mask");
  }
}
