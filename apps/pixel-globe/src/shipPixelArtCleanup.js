function colorKey(rgba, pixel) {
  const offset = pixel * 4;
  return (rgba[offset] << 16) | (rgba[offset + 1] << 8) | rgba[offset + 2];
}

function assertCleanupInput(rgba, width, height, minimumRegionPixels, passes) {
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray)) {
    throw new Error("Ship pixel-art cleanup requires an 8-bit RGBA buffer");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Ship pixel-art cleanup requires positive integer dimensions: ${width}x${height}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new Error(
      `Ship pixel-art cleanup RGBA length ${rgba.length} does not match ${width}x${height}`
    );
  }
  if (!Number.isInteger(minimumRegionPixels) || minimumRegionPixels <= 1) {
    throw new Error(
      `Ship pixel-art cleanup requires a region threshold greater than one: ${minimumRegionPixels}`
    );
  }
  if (!Number.isInteger(passes) || passes <= 0) {
    throw new Error(`Ship pixel-art cleanup requires positive integer passes: ${passes}`);
  }
}

function collectColorRegion(rgba, width, height, start, visited) {
  const targetColor = colorKey(rgba, start);
  const region = [start];
  visited[start] = 1;
  for (let cursor = 0; cursor < region.length; cursor++) {
    const pixel = region[cursor];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (const [offsetX, offsetY] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const neighborX = x + offsetX;
      const neighborY = y + offsetY;
      if (
        neighborX < 0 || neighborX >= width ||
        neighborY < 0 || neighborY >= height
      ) continue;
      const neighbor = neighborX + neighborY * width;
      if (visited[neighbor] || rgba[neighbor * 4 + 3] === 0) continue;
      if (colorKey(rgba, neighbor) !== targetColor) continue;
      visited[neighbor] = 1;
      region.push(neighbor);
    }
  }
  return region;
}

function replacementColorForRegion(rgba, width, height, region) {
  const regionPixels = new Set(region);
  const counts = new Map();
  let opaqueBorderPixels = 0;
  for (const pixel of region) {
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        if (offsetX === 0 && offsetY === 0) continue;
        const neighborX = x + offsetX;
        const neighborY = y + offsetY;
        if (
          neighborX < 0 || neighborX >= width ||
          neighborY < 0 || neighborY >= height
        ) continue;
        const neighbor = neighborX + neighborY * width;
        if (regionPixels.has(neighbor) || rgba[neighbor * 4 + 3] === 0) continue;
        opaqueBorderPixels++;
        const key = colorKey(rgba, neighbor);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  let bestColor = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count <= bestCount) continue;
    bestColor = key;
    bestCount = count;
  }
  const requiredBorderAgreement = Math.max(2, Math.ceil(opaqueBorderPixels * 0.45));
  return bestCount >= requiredBorderAgreement ? bestColor : null;
}

function writeColor(rgba, pixel, color) {
  const offset = pixel * 4;
  rgba[offset] = (color >> 16) & 0xff;
  rgba[offset + 1] = (color >> 8) & 0xff;
  rgba[offset + 2] = color & 0xff;
}

export function coalesceShipPixelArtColors(
  rgba,
  width,
  height,
  { minimumRegionPixels, passes = 1 }
) {
  assertCleanupInput(rgba, width, height, minimumRegionPixels, passes);
  let current = new Uint8ClampedArray(rgba);
  let recoloredRegions = 0;
  let recoloredPixels = 0;
  let completedPasses = 0;
  for (let pass = 0; pass < passes; pass++) {
    const visited = new Uint8Array(width * height);
    const next = new Uint8ClampedArray(current);
    let passPixels = 0;
    for (let start = 0; start < visited.length; start++) {
      if (visited[start] || current[start * 4 + 3] === 0) continue;
      const region = collectColorRegion(current, width, height, start, visited);
      if (region.length >= minimumRegionPixels) continue;
      const replacement = replacementColorForRegion(current, width, height, region);
      if (replacement === null || replacement === colorKey(current, start)) continue;
      for (const pixel of region) writeColor(next, pixel, replacement);
      recoloredRegions++;
      recoloredPixels += region.length;
      passPixels += region.length;
    }
    current = next;
    completedPasses++;
    if (passPixels === 0) break;
  }
  return {
    rgba: current,
    metadata: Object.freeze({
      minimumRegionPixels,
      requestedPasses: passes,
      completedPasses,
      recoloredRegions,
      recoloredPixels
    })
  };
}
