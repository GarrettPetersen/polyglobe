export const DEMO_GIBRALTAR_MESSAGE =
  "The full version has many adventures and riches to be found on the high seas.";
export const DEMO_ESCAPE_GRACE_HEXES = 10;

export function startMenuEditionLabel(buildEditionId) {
  if (buildEditionId === "full") return null;
  if (buildEditionId === "demo") return "DEMO";
  throw new Error(`Unknown build edition for start menu: ${buildEditionId}`);
}

export function buildDemoMediterraneanAccessMask({
  graph,
  seedTileId,
  blockedTileIds,
  isNavigableTile,
  canTraverseEdge
}) {
  validateNavigationGraph(graph);
  if (!Number.isInteger(seedTileId) || seedTileId < 0 || seedTileId >= graph.tileCount) {
    throw new Error(`Invalid Mediterranean demo seed tile: ${seedTileId}`);
  }
  if (typeof isNavigableTile !== "function" || typeof canTraverseEdge !== "function") {
    throw new Error("Mediterranean demo access requires navigation predicates");
  }
  const blocked = new Set(blockedTileIds || []);
  if (blocked.has(seedTileId) || !isNavigableTile(seedTileId)) {
    throw new Error(`Mediterranean demo seed tile ${seedTileId} is not navigable`);
  }

  const mask = new Uint8Array(graph.tileCount);
  const queue = [seedTileId];
  mask[seedTileId] = 1;
  for (let head = 0; head < queue.length; head++) {
    const fromTileId = queue[head];
    for (const toTileId of graph.neighbors[fromTileId]) {
      if (
        mask[toTileId] === 1 ||
        blocked.has(toTileId) ||
        !isNavigableTile(toTileId) ||
        !canTraverseEdge(fromTileId, toTileId)
      ) {
        continue;
      }
      mask[toTileId] = 1;
      queue.push(toTileId);
    }
  }
  return mask;
}

export function navigationDistanceFromAccessMask(graph, accessMask) {
  validateNavigationGraph(graph);
  if (!(accessMask instanceof Uint8Array) || accessMask.length !== graph.tileCount) {
    throw new Error("Demo access-distance calculation requires a complete access mask");
  }
  const unreachable = 0xffff;
  const distances = new Uint16Array(graph.tileCount);
  distances.fill(unreachable);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (accessMask[tileId] !== 1) continue;
    distances[tileId] = 0;
    queue.push(tileId);
  }
  if (queue.length === 0) throw new Error("Demo access mask contains no navigable tiles");
  for (let head = 0; head < queue.length; head++) {
    const fromTileId = queue[head];
    const nextDistance = distances[fromTileId] + 1;
    for (const toTileId of graph.neighbors[fromTileId]) {
      if (distances[toTileId] <= nextDistance) continue;
      distances[toTileId] = nextDistance;
      queue.push(toTileId);
    }
  }
  return distances;
}

export function demoEscapeRequiresRecovery(
  tileId,
  distanceFromAccessMask,
  graceHexes = DEMO_ESCAPE_GRACE_HEXES
) {
  if (!(distanceFromAccessMask instanceof Uint16Array)) {
    throw new Error("Demo escape recovery requires navigation distances");
  }
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= distanceFromAccessMask.length) {
    return true;
  }
  if (!Number.isInteger(graceHexes) || graceHexes < 0) {
    throw new Error(`Invalid demo escape grace distance: ${graceHexes}`);
  }
  return distanceFromAccessMask[tileId] > graceHexes;
}

function validateNavigationGraph(graph) {
  if (
    !graph ||
    !Number.isInteger(graph.tileCount) ||
    !Array.isArray(graph.neighbors) ||
    graph.neighbors.length !== graph.tileCount
  ) {
    throw new Error("Mediterranean demo access requires a complete navigation graph");
  }
}
