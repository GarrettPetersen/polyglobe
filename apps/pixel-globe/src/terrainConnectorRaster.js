const CONNECTOR_EDGE_NOISE_PX = 1;

export function terrainConnectorRasterSpans(points, seed) {
  assertPolygon(points);
  if (!Number.isInteger(seed)) throw new Error(`Terrain connector raster requires an integer seed: ${seed}`);

  const minY = Math.ceil(Math.min(...points.map((point) => point.y)) - 0.5);
  const maxY = Math.floor(Math.max(...points.map((point) => point.y)) - 0.5);
  const spans = [];

  for (let y = minY; y <= maxY; y++) {
    const scanY = y + 0.5;
    const intersections = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const crosses = (a.y <= scanY && b.y > scanY) || (b.y <= scanY && a.y > scanY);
      if (!crosses) continue;
      const t = (scanY - a.y) / (b.y - a.y);
      intersections.push(a.x + (b.x - a.x) * t);
    }
    intersections.sort((a, b) => a - b);
    if (intersections.length % 2 !== 0) {
      throw new Error(`Terrain connector polygon has an odd scanline intersection count at y=${y}`);
    }

    for (let pair = 0; pair < intersections.length; pair += 2) {
      const left = intersections[pair];
      const right = intersections[pair + 1];
      const baseStartX = Math.ceil(left - 0.5);
      const baseEndX = Math.ceil(right - 0.5) - 1;
      if (baseEndX < baseStartX) continue;
      const startX = baseStartX - connectorEdgeExpansion(seed, y, pair, 0);
      const endX = baseEndX + connectorEdgeExpansion(seed, y, pair, 1);
      spans.push({ x: startX, y, width: endX - startX + 1 });
    }
  }

  if (spans.length === 0) throw new Error("Terrain connector polygon produced no raster spans");
  return spans;
}

function connectorEdgeExpansion(seed, y, pair, side) {
  let value = seed ^ Math.imul(y, 0x9e3779b1) ^ Math.imul(pair + 1, 0x85ebca6b);
  value ^= Math.imul(side + 1, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return (value >>> 0) % (CONNECTOR_EDGE_NOISE_PX + 1);
}

function assertPolygon(points) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error("Terrain connector raster requires at least three polygon points");
  }
  points.forEach((point, index) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error(`Terrain connector polygon has an invalid point at index ${index}`);
    }
  });
}
