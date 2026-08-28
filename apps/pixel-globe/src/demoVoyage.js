export const DEMO_GIBRALTAR_MESSAGE =
  "The full version has many adventures and riches to be found on the high seas.";
export const DEMO_ESCAPE_GRACE_HEXES = 10;
export const DEMO_VOYAGE_SCOPE_MEDITERRANEAN = "mediterranean";
export const DEMO_VOYAGE_SCOPE_WORLDWIDE = "worldwide-grandfathered";
export const LAST_WORLDWIDE_DEMO_GAME_STATE_VERSION = 51;
export const DEMO_MEDITERRANEAN_SEED = Object.freeze({ lat: 36, lon: 15 });
export const DEMO_GIBRALTAR_BARRIER_COORDINATES = Object.freeze([
  Object.freeze({ lat: 35.82, lon: -5.68 }),
  Object.freeze({ lat: 36.25, lon: -5.37 })
]);
export const DEMO_GIBRALTAR_RECOVERY_COORDINATES = Object.freeze({ lat: 36, lon: -3.5 });

export function demoAccessiblePortsForMask({ ports, accessMask, accessTileIdsForPort }) {
  if (!Array.isArray(ports)) throw new Error("Demo accessible ports require a port catalog");
  if (!(accessMask instanceof Uint8Array) || accessMask.length === 0) {
    throw new Error("Demo accessible ports require a navigation mask");
  }
  if (typeof accessTileIdsForPort !== "function") {
    throw new Error("Demo accessible ports require a harbor access resolver");
  }
  return ports.filter((port) => {
    const accessTileIds = accessTileIdsForPort(port);
    if (!Array.isArray(accessTileIds) || accessTileIds.length === 0) {
      throw new Error(`Demo port has no harbor access tiles: ${port?.city || "unknown"}`);
    }
    for (const tileId of accessTileIds) {
      if (!Number.isInteger(tileId) || tileId < 0 || tileId >= accessMask.length) {
        throw new Error(`Demo port has invalid harbor access tile: ${port?.city || "unknown"}`);
      }
    }
    return accessTileIds.some((tileId) => accessMask[tileId] === 1);
  });
}

export function demoVoyageScopeForSavedGame({
  buildEditionId,
  savedScope,
  savedGameStateVersion
}) {
  if (buildEditionId === "full") return null;
  if (buildEditionId !== "demo") {
    throw new Error(`Unknown build edition for saved demo voyage: ${buildEditionId}`);
  }
  if (savedScope !== undefined) {
    if (![DEMO_VOYAGE_SCOPE_MEDITERRANEAN, DEMO_VOYAGE_SCOPE_WORLDWIDE].includes(savedScope)) {
      throw new Error(`Unknown saved demo voyage scope: ${savedScope}`);
    }
    return savedScope;
  }
  return Number.isInteger(savedGameStateVersion) &&
    savedGameStateVersion <= LAST_WORLDWIDE_DEMO_GAME_STATE_VERSION
    ? DEMO_VOYAGE_SCOPE_WORLDWIDE
    : DEMO_VOYAGE_SCOPE_MEDITERRANEAN;
}

export function isMediterraneanDemoVoyage(buildEditionId, voyageScope) {
  if (buildEditionId === "full") return false;
  if (buildEditionId !== "demo") {
    throw new Error(`Unknown build edition for demo voyage scope: ${buildEditionId}`);
  }
  if (![DEMO_VOYAGE_SCOPE_MEDITERRANEAN, DEMO_VOYAGE_SCOPE_WORLDWIDE].includes(voyageScope)) {
    throw new Error(`Unknown demo voyage scope: ${voyageScope}`);
  }
  return voyageScope === DEMO_VOYAGE_SCOPE_MEDITERRANEAN;
}

export function startMenuEditionLabel(buildEditionId) {
  if (buildEditionId === "full") return null;
  if (buildEditionId === "demo") return "DEMO";
  throw new Error(`Unknown build edition for start menu: ${buildEditionId}`);
}

export function demoNaturalistAnimalIdsForLandfalls({
  graph,
  accessMask,
  earthRows,
  riverMasks,
  animalCatalog,
  isWaterSurfaceRow
}) {
  validateNavigationGraph(graph);
  if (!(accessMask instanceof Uint8Array) || accessMask.length !== graph.tileCount) {
    throw new Error("Demo naturalist roster requires a complete access mask");
  }
  if (!Array.isArray(earthRows) || earthRows.length !== graph.tileCount) {
    throw new Error("Demo naturalist roster requires complete terrain rows");
  }
  if (!riverMasks || riverMasks.length !== graph.tileCount) {
    throw new Error("Demo naturalist roster requires complete river masks");
  }
  if (!Array.isArray(animalCatalog) || animalCatalog.length === 0 ||
      typeof isWaterSurfaceRow !== "function") {
    throw new Error("Demo naturalist roster requires animals and a water predicate");
  }
  const animalIds = new Set();
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const row = earthRows[tileId];
    if (isWaterSurfaceRow(row)) continue;
    const accessibleLandfall = accessMask[tileId] === 1 ||
      graph.neighbors[tileId].some((neighborId) => accessMask[neighborId] === 1);
    if (!accessibleLandfall) continue;
    const terrain = row?.t || "";
    const habitat = {
      latitudeDeg: graph.latDeg[tileId],
      longitudeDeg: graph.lonDeg[tileId],
      terrain,
      isSurfaceIce: terrain === "ice_cap",
      isRiver: Boolean(riverMasks[tileId]),
      isLake: terrain === "lake",
      isCoast: true
    };
    for (const animal of animalCatalog) {
      if (!animal || typeof animal.id !== "string" || typeof animal.matches !== "function") {
        throw new Error("Demo naturalist roster contains an invalid animal");
      }
      if (animal.matches(habitat)) animalIds.add(animal.id);
    }
  }
  const orderedIds = animalCatalog
    .map((animal) => animal.id)
    .filter((animalId) => animalIds.has(animalId));
  if (orderedIds.length === 0) {
    throw new Error("Mediterranean demo landfalls contain no naturalist animals");
  }
  return Object.freeze(orderedIds);
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
    !isGraphRowCollection(graph.neighbors) ||
    graph.neighbors.length !== graph.tileCount
  ) {
    throw new Error("Mediterranean demo access requires a complete navigation graph");
  }
}
import { isGraphRowCollection } from "./geodesicBake.js";
