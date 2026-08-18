const CHROMA_MATTE_COLORS = new Set([
  "165a4c",
  "374e4a",
  "547e64",
  "92a984"
]);

const PORTRAIT_OUTLINE_COLORS = new Set([
  "2e222f",
  "313638",
  "3e3546"
]);

export function cleanPortraitChromaMatte({ data, width, height }) {
  if (!(data instanceof Uint8Array)) {
    throw new Error("Portrait matte cleanup requires RGBA bytes");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Portrait matte cleanup requires valid dimensions: ${width}x${height}`);
  }
  if (data.length !== width * height * 4) {
    throw new Error(`Portrait matte cleanup expected ${width * height * 4} bytes, got ${data.length}`);
  }

  const cleaned = new Uint8Array(data);
  const replacements = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] !== 255 || !CHROMA_MATTE_COLORS.has(pixelHex(data, offset))) continue;
      if (!hasTransparentCardinalNeighbor(data, width, height, x, y)) continue;

      const outlineCounts = new Map();
      let opaqueNeighbors = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighborOffset = (ny * width + nx) * 4;
          if (data[neighborOffset + 3] !== 255) continue;
          opaqueNeighbors += 1;
          const color = pixelHex(data, neighborOffset);
          if (!PORTRAIT_OUTLINE_COLORS.has(color)) continue;
          outlineCounts.set(color, (outlineCounts.get(color) || 0) + 1);
        }
      }
      // Flat garment edges can legitimately use green. Convex flecks with a
      // dark neighbor are the chroma-key remnants visible outside the outline.
      if (opaqueNeighbors > 4 || outlineCounts.size === 0) continue;
      replacements.push({ offset, color: mostCommonOutline(outlineCounts) });
    }
  }

  for (const { offset, color } of replacements) {
    cleaned[offset] = Number.parseInt(color.slice(0, 2), 16);
    cleaned[offset + 1] = Number.parseInt(color.slice(2, 4), 16);
    cleaned[offset + 2] = Number.parseInt(color.slice(4, 6), 16);
  }
  return Object.freeze({ data: cleaned, changedPixels: replacements.length });
}

function hasTransparentCardinalNeighbor(data, width, height, x, y) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
    if (data[(ny * width + nx) * 4 + 3] === 0) return true;
  }
  return false;
}

function mostCommonOutline(counts) {
  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))[0][0];
}

function pixelHex(data, offset) {
  return [data[offset], data[offset + 1], data[offset + 2]]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
}
