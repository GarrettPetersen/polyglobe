export const CHART_PROTECTION_DIRECT = 255;
export const CHART_PROTECTION_RING_ONE = 192;
export const CHART_PROTECTION_RING_TWO = 128;

const PROTECTION_BY_DEPTH = Object.freeze([
  CHART_PROTECTION_DIRECT,
  CHART_PROTECTION_RING_ONE,
  CHART_PROTECTION_RING_TWO
]);

export function buildChartTileProtection({
  graph,
  terrainClassForTile,
  featureTileIds = [],
  protectionRings = 2
}) {
  validateInputs(graph, terrainClassForTile, protectionRings);
  const terrainClasses = Array.from(
    { length: graph.tileCount },
    (_, tileId) => {
      const terrainClass = terrainClassForTile(tileId);
      if (typeof terrainClass !== "string" || terrainClass === "") {
        throw new Error(`Chart protection terrain class is invalid for tile ${tileId}`);
      }
      return terrainClass;
    }
  );
  const distance = new Int16Array(graph.tileCount);
  distance.fill(-1);
  const queue = [];

  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (graph.isPentagon[tileId]) protectDirectly(tileId, distance, queue);
    for (const neighborId of graph.neighbors[tileId]) {
      if (terrainClasses[neighborId] !== terrainClasses[tileId]) {
        protectDirectly(tileId, distance, queue);
        protectDirectly(neighborId, distance, queue);
      }
    }
  }

  for (const tileId of featureTileIds) {
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Chart protection feature tile is invalid: ${tileId}`);
    }
    protectDirectly(tileId, distance, queue);
  }

  let head = 0;
  while (head < queue.length) {
    const tileId = queue[head++];
    const nextDistance = distance[tileId] + 1;
    if (nextDistance > protectionRings) continue;
    for (const neighborId of graph.neighbors[tileId]) {
      if (distance[neighborId] >= 0 && distance[neighborId] <= nextDistance) continue;
      distance[neighborId] = nextDistance;
      queue.push(neighborId);
    }
  }

  const protection = new Uint8Array(graph.tileCount);
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const depth = distance[tileId];
    if (depth < 0) continue;
    protection[tileId] = PROTECTION_BY_DEPTH[Math.min(depth, PROTECTION_BY_DEPTH.length - 1)];
  }
  return protection;
}

export function chartProtectionStats(protection) {
  if (!(protection instanceof Uint8Array)) {
    throw new Error("Chart protection stats require a Uint8Array");
  }
  let direct = 0;
  let buffered = 0;
  let elastic = 0;
  for (const weight of protection) {
    if (weight === CHART_PROTECTION_DIRECT) direct++;
    else if (weight > 0) buffered++;
    else elastic++;
  }
  return Object.freeze({ direct, buffered, elastic, total: protection.length });
}

function protectDirectly(tileId, distance, queue) {
  if (distance[tileId] === 0) return;
  distance[tileId] = 0;
  queue.push(tileId);
}

function validateInputs(graph, terrainClassForTile, protectionRings) {
  if (
    !graph ||
    !Number.isInteger(graph.tileCount) ||
    graph.tileCount <= 0 ||
    !Array.isArray(graph.neighbors) ||
    graph.neighbors.length !== graph.tileCount ||
    !graph.isPentagon ||
    graph.isPentagon.length !== graph.tileCount
  ) {
    throw new Error("Chart protection requires a complete geodesic graph");
  }
  if (typeof terrainClassForTile !== "function") {
    throw new Error("Chart protection requires a terrain classifier");
  }
  if (!Number.isInteger(protectionRings) || protectionRings < 0 || protectionRings > 2) {
    throw new Error(`Chart protection rings must be between zero and two: ${protectionRings}`);
  }
}
