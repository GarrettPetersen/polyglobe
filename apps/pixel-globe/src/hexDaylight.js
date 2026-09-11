// Rasterize nearest tile ownership once per chart window. Rendering slots are
// spatial observations, not persisted entity IDs. Every pixel in a tile's
// Voronoi cell stores the same tile center; the sun never cuts through a cell.
export function buildHexDaylightMap(centers, { x, y, width, height, radiusPx }) {
  if (!Array.isArray(centers) || centers.length === 0 ||
      ![x, y, width, height, radiusPx].every(Number.isFinite) ||
      !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 ||
      width >= 65536 || height >= 65536 || radiusPx <= 0) {
    throw new Error("Hex daylight map requires centers and valid raster bounds");
  }
  const ordered = [...centers].sort((a, b) => a.id - b.id);
  const ids = new Set();
  for (const center of ordered) {
    if (!Number.isInteger(center.id) || ids.has(center.id) || ![center.x, center.y].every(Number.isFinite)) {
      throw new Error(`Invalid hex daylight center: ${center.id}`);
    }
    ids.add(center.id);
  }
  const distances = new Float64Array(width * height).fill(Infinity);
  const owners = new Int32Array(width * height).fill(-1);
  const radiusSquared = radiusPx * radiusPx;
  for (let index = 0; index < ordered.length; index++) {
    const center = ordered[index];
    const cx = center.x - x, cy = center.y - y;
    const minX = Math.max(0, Math.floor(cx - radiusPx));
    const maxX = Math.min(width - 1, Math.ceil(cx + radiusPx));
    const minY = Math.max(0, Math.floor(cy - radiusPx));
    const maxY = Math.min(height - 1, Math.ceil(cy + radiusPx));
    for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
      const distance = (px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2;
      const at = py * width + px;
      if (distance <= radiusSquared && distance < distances[at]) {
        distances[at] = distance;
        owners[at] = index;
      }
    }
  }
  const pixels = new Uint8ClampedArray(width * height * 4);
  // Centers outside the raster can own its edge. Encode against an independent
  // origin so offscreen centers stay signed correctly without clamping.
  const centerOrigin = { x: Math.floor(Math.min(x, ...ordered.map(c => c.x))),
    y: Math.floor(Math.min(y, ...ordered.map(c => c.y))) };
  for (let at = 0; at < owners.length; at++) {
    if (owners[at] < 0) {
      // Voronoi cells on a sparse chart's perimeter are unbounded.
      const px = at % width + x + 0.5, py = Math.floor(at / width) + y + 0.5;
      for (let index = 0; index < ordered.length; index++) {
        const center = ordered[index];
        const distance = (px - center.x) ** 2 + (py - center.y) ** 2;
        if (distance < distances[at]) { distances[at] = distance; owners[at] = index; }
      }
    }
    const center = ordered[owners[at]];
    const cx = Math.round(center.x - centerOrigin.x), cy = Math.round(center.y - centerOrigin.y);
    if (cx > 65535 || cy > 65535) throw new Error("Hex daylight center exceeds raster encoding");
    pixels[at * 4] = cx >>> 8;
    pixels[at * 4 + 1] = cx & 255;
    pixels[at * 4 + 2] = cy >>> 8;
    pixels[at * 4 + 3] = cy & 255;
  }
  return { x, y, width, height, centerOrigin, pixels };
}
