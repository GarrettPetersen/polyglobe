// Rasterize nearest tile ownership once per chart window. Rendering slots are
// spatial observations, not persisted entity IDs. Every pixel in a tile's
// Voronoi cell stores its tile center; sprite alpha then supplies the visible
// ownership, so a ragged coast is never cut by a geometric cell boundary.
export function buildHexDaylightMap(centers, { x, y, width, height, radiusPx, sprites = [], connectors = [] }) {
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
  // A connector belongs only to its two attached tiles, even if an unrelated
  // tile happens to be closer on a distorted chart. Use its actual ragged spans.
  if (!Array.isArray(connectors)) throw new Error("Daylight connectors require an array");
  const indexById = new Map(ordered.map((center, index) => [center.id, index]));
  for (const {a, b, spans} of connectors) {
    const ai = indexById.get(a), bi = indexById.get(b);
    if (ai === undefined || bi === undefined || !Array.isArray(spans)) throw new Error(`Invalid daylight connector: ${a}/${b}`);
    const ac = ordered[ai], bc = ordered[bi];
    for (const span of spans) {
      if (![span.x, span.y, span.width].every(Number.isInteger) || span.width <= 0) throw new Error(`Invalid daylight connector span: ${a}/${b}`);
      const py = span.y - y;
      if (py < 0 || py >= height) continue;
      for (let px = Math.max(0, span.x - x); px < Math.min(width, span.x - x + span.width); px++) {
        const da = (px + x + 0.5 - ac.x) ** 2 + (py + y + 0.5 - ac.y) ** 2;
        const db = (px + x + 0.5 - bc.x) ** 2 + (py + y + 0.5 - bc.y) ** 2;
        owners[py * width + px] = da < db || (da === db && a < b) ? ai : bi;
      }
    }
  }
  // Terrain artwork overlays connectors in the same painter order as the scene.
  if (!Array.isArray(sprites)) throw new Error("Daylight sprite ownership requires an array");
  const ownerById = new Map(ordered.map((center, index) => [center.id, index]));
  for (const sprite of sprites) {
    const owner = ownerById.get(sprite.id);
    const mask = sprite.mask;
    if (owner === undefined || ![sprite.x, sprite.y, sprite.width, sprite.height].every(Number.isFinite) ||
        sprite.width <= 0 || sprite.height <= 0 || !mask || !Number.isInteger(mask.width) || !Number.isInteger(mask.height) ||
        mask.width <= 0 || mask.height <= 0 || mask.alpha?.length !== mask.width * mask.height) {
      throw new Error(`Invalid daylight sprite ownership: ${sprite.id}`);
    }
    const left = Math.max(0, Math.ceil(sprite.x - x));
    const right = Math.min(width, Math.ceil(sprite.x - x + sprite.width));
    const top = Math.max(0, Math.ceil(sprite.y - y));
    const bottom = Math.min(height, Math.ceil(sprite.y - y + sprite.height));
    for (let py = top; py < bottom; py++) {
      const sy = Math.floor((py + y + 0.5 - sprite.y) * mask.height / sprite.height);
      for (let px = left; px < right; px++) {
        const sx = Math.floor((px + x + 0.5 - sprite.x) * mask.width / sprite.width);
        if (mask.alpha[sy * mask.width + sx] > 0) owners[py * width + px] = owner;
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
