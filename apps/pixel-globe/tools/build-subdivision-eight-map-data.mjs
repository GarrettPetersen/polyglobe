import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { decodeGeodesicGraphBake } from "../src/geodesicBake.js";
import {
  buildGeodesicGraph,
  createDirectionIndex,
  findNearestTileId,
  graphCenter
} from "../src/geodesic.js";
import { MANUAL_CITY_RECORDS_1522 } from "../src/cityCatalogSelection.js";
import {
  MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS,
  MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS
} from "../src/manualTerrainOverrides.js";
import {
  MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
  MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS
} from "../src/manualRiverHexChains.js";

const toolsRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolsRoot, "..");
const sharedRoot = resolve(appRoot, "../../examples/globe-demo/public");
const outputPath = resolve(appRoot, "src/subdivisionEightMapData.js");
const coarseGraph = buildGeodesicGraph(7);
const fineGraphBytes = await readFile(resolve(sharedRoot, "geodesic-graph-8.bin"));
const fineGraph = decodeGeodesicGraphBake(
  fineGraphBytes.buffer.slice(
    fineGraphBytes.byteOffset,
    fineGraphBytes.byteOffset + fineGraphBytes.byteLength
  ),
  8
);
const fineDirectionIndex = createDirectionIndex(fineGraph);
const earth = JSON.parse(await readFile(resolve(sharedRoot, "earth-globe-cache-8.json"), "utf8"));

const shallowWaterGroups = [
  [38891],
  [38903],
  [98867, 24803, 98890],
  [88775],
  [31618, 125890, 125896]
];
const manualMouthChains = MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[7].map(({ tile, edge }) => (
  refineChain([tile, requiredCoarseEdgeNeighbor(tile, edge)])
));
const saveRiverApproach = routeThroughCoordinates([
  { lat: -20.95, lon: 35.55 },
  { lat: -20.75, lon: 34.6 },
  { lat: -20.45, lon: 33.6 },
  { lat: -20.2, lon: 32.35 }
]);
const delhiYamunaApproach = routeThroughCoordinates([
  { lat: 28.65381, lon: 77.22897 },
  { lat: 27.85, lon: 77.55 },
  { lat: 27.18, lon: 78.02 }
]);
const nigerRiverRoute = routeThroughCoordinates([
  { lat: 3.8, lon: 6.2 },
  { lat: 5.25, lon: 6.45 },
  { lat: 8.1, lon: 6.65 },
  { lat: 13.5, lon: 2.15 },
  { lat: 16.25, lon: -0.05 },
  { lat: 16.45, lon: -1.65 },
  { lat: 14.55, lon: -3.8 },
  { lat: 16.77, lon: -3.0 }
]);
const rhoneRiverRoute = routeThroughCoordinates([
  { lat: 45.764, lon: 4.8357 },
  { lat: 44.9, lon: 4.82 },
  { lat: 43.8, lon: 4.72 },
  { lat: 42.75, lon: 4.65 }
]);
const panganiRiverApproach = routeThroughCoordinates([
  { lat: -5.5, lon: 39.3 },
  { lat: -5.35, lon: 38.95 },
  { lat: -4.6, lon: 38.4 },
  { lat: -3.6, lon: 37.5 }
]);
const sanJoaquinRiverApproach = routeThroughCoordinates([
  { lat: 37.7, lon: -123.0 },
  { lat: 37.75, lon: -122.5 },
  { lat: 38.0, lon: -121.5 },
  { lat: 37.3, lon: -121.0 },
  { lat: 36.7, lon: -120.4 },
  { lat: 36.5, lon: -119.8 }
]);
const chorokhiRiverApproach = routeThroughCoordinates([
  { lat: 41.8, lon: 41.2 },
  { lat: 41.6, lon: 41.8 },
  { lat: 41.1, lon: 42.5 },
  { lat: 40.5, lon: 43.0 }
]);
// At subdivision seven, one graph ring covered enough ground for these cities
// to touch their authored or baked river. Subdivision eight halves that physical
// tolerance, so give each historic river port an explicit route instead of
// globally widening port access and accidentally making nearby inland cities
// into seaports.
const cuttackMahanadiRoute = routeThroughCoordinates([
  { lat: 20.46497, lon: 85.87927 },
  { lat: 20.35, lon: 86.35 },
  { lat: 20.15, lon: 87.0 }
]);
const nanchangGanRoute = routeThroughCoordinates([
  { lat: 28.68333, lon: 115.88333 },
  { lat: 29.2, lon: 116.2 },
  { lat: 29.75, lon: 116.25 },
  { lat: 30.5, lon: 117.2 },
  { lat: 31.0, lon: 119.0 },
  { lat: 31.3, lon: 121.8 }
]);
const chengduMinYangtzeRoute = routeThroughCoordinates([
  { lat: 30.66667, lon: 104.06667 },
  { lat: 29.4, lon: 104.2 },
  { lat: 29.55, lon: 106.55 },
  { lat: 30.5, lon: 111.3 },
  { lat: 30.6, lon: 114.3 },
  { lat: 31.0, lon: 119.0 },
  { lat: 31.3, lon: 121.8 }
]);
const xianWeiYellowRoute = routeThroughCoordinates([
  { lat: 34.341485, lon: 108.940404 },
  { lat: 34.6, lon: 110.0 },
  { lat: 35.5, lon: 110.7 },
  { lat: 34.8, lon: 112.6 },
  { lat: 34.9, lon: 114.5 },
  { lat: 36.0, lon: 117.0 },
  { lat: 37.0, lon: 118.5 },
  { lat: 37.5, lon: 119.5 }
]);
const peguBagoRoute = routeThroughCoordinates([
  { lat: 17.333333, lon: 96.483333 },
  { lat: 16.8, lon: 96.4 },
  { lat: 16.0, lon: 96.3 },
  { lat: 15.7, lon: 96.2 }
]);
const jaunpurGomtiGangesRoute = routeThroughCoordinates([
  { lat: 25.75506, lon: 82.68361 },
  { lat: 25.3, lon: 83.0 },
  { lat: 25.3, lon: 85.0 },
  { lat: 25.4, lon: 87.0 },
  { lat: 24.5, lon: 89.0 },
  { lat: 22.3, lon: 90.0 },
  { lat: 21.3, lon: 90.5 }
]);
const cremonaPoRoute = routeThroughCoordinates([
  { lat: 45.13617, lon: 10.02797 },
  { lat: 45.0, lon: 11.5 },
  { lat: 44.9, lon: 12.3 },
  { lat: 44.75, lon: 12.9 }
]);
const toursLoireRoute = routeThroughCoordinates([
  { lat: 47.38333, lon: 0.68333 },
  { lat: 47.46667, lon: -0.55 },
  { lat: 47.22, lon: -1.55 },
  { lat: 47.27, lon: -2.25 },
  { lat: 47.2, lon: -2.7 }
]);
const angersLoireRoute = routeThroughCoordinates([
  { lat: 47.46667, lon: -0.55 },
  { lat: 47.22, lon: -1.55 },
  { lat: 47.27, lon: -2.25 },
  { lat: 47.2, lon: -2.7 }
]);
const coimbraMondegoRoute = routeThroughCoordinates([
  { lat: 40.20564, lon: -8.41955 },
  { lat: 40.18, lon: -8.8 },
  { lat: 40.1, lon: -9.05 }
]);
const riverChains = [
  ...MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[7].map(refineChain),
  ...manualMouthChains,
  saveRiverApproach,
  delhiYamunaApproach,
  nigerRiverRoute,
  rhoneRiverRoute,
  panganiRiverApproach,
  sanJoaquinRiverApproach,
  chorokhiRiverApproach,
  cuttackMahanadiRoute,
  nanchangGanRoute,
  chengduMinYangtzeRoute,
  xianWeiYellowRoute,
  peguBagoRoute,
  jaunpurGomtiGangesRoute,
  cremonaPoRoute,
  toursLoireRoute,
  angersLoireRoute,
  coimbraMondegoRoute
];
const cityRiverChains = Object.fromEntries(Object.entries(
  MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[7]
).map(([cityId, chain]) => [cityId, refineChain(chain)]));
cityRiverChains["delhi|india"] = delhiYamunaApproach;
cityRiverChains["gao|mali"] = nigerRiverRoute;
cityRiverChains["tombouctou|mali"] = nigerRiverRoute;
cityRiverChains["lyon|france"] = rhoneRiverRoute;
cityRiverChains["cuttack|india"] = cuttackMahanadiRoute;
cityRiverChains["nanchang|china"] = nanchangGanRoute;
cityRiverChains["chengdu|china"] = chengduMinYangtzeRoute;
cityRiverChains["xian|china"] = xianWeiYellowRoute;
cityRiverChains["pegu|myanmar"] = peguBagoRoute;
cityRiverChains["jaunpur|india"] = jaunpurGomtiGangesRoute;
cityRiverChains["cremona|italy"] = cremonaPoRoute;
cityRiverChains["tours|france"] = toursLoireRoute;
cityRiverChains["angers|france"] = angersLoireRoute;
cityRiverChains["coimbra|portugal"] = coimbraMondegoRoute;
const shallowWaterTileIdSet = new Set(shallowWaterGroups.flatMap(refineChain));
// The fine globe's land mask exaggerates the small island at the Loire mouth
// into a blocking coastal hex. Keep the authored river route but restore this
// estuary tile to navigable shallows.
shallowWaterTileIdSet.add(160967);
const lakeMalawiCorridor = routeThroughCoordinates([
  { lat: -9.5, lon: 34.3 },
  { lat: -10.5, lon: 34.35 },
  { lat: -11.5, lon: 34.45 },
  { lat: -12.5, lon: 34.55 },
  { lat: -13.5, lon: 34.75 },
  { lat: -14.4, lon: 35.2 }
]);
const lakeOverrides = unique([
  ...MANUAL_LAKE_TILE_OVERRIDES_BY_SUBDIVISIONS[7].map(({ tileId }) => tileId),
  ...lakeMalawiCorridor
]).map((tileId) => ({
  tileId,
  sourceTerrain: earth.tiles[tileId].t
}));
const landmassIdByCoarseOverride = new Map();
const inheritedLandOverrides = MANUAL_LAND_TILE_OVERRIDES_BY_SUBDIVISIONS[7].map((override) => {
  const source = earth.tiles[override.tileId];
  const sourceIsWater = source.t === "water" || source.t === "lake" || source.t === "beach";
  if (sourceIsWater && !landmassIdByCoarseOverride.has(override.landmassId)) {
    landmassIdByCoarseOverride.set(override.landmassId, 2000 + landmassIdByCoarseOverride.size);
  }
  return {
    ...override,
    sourceTerrain: source.t,
    landmassId: sourceIsWater ? landmassIdByCoarseOverride.get(override.landmassId) : source.m
  };
});
const northMalukuIslandCities = new Set(["Ternate", "Tidore", "Makian Village"]);
const islandCities = MANUAL_CITY_RECORDS_1522.filter((record) => (
  record.islandSettlement ||
  (record.country === "Indonesia" && northMalukuIslandCities.has(record.city))
));
const islandDirections = islandCities.map(cityPlacementDirection);
const mozambique = MANUAL_CITY_RECORDS_1522.find((record) => (
  record.city === "Mozambique" && record.country === "Mozambique"
));
if (!mozambique) throw new Error("Mozambique is missing from the manual city catalog");
const mozambiqueDirection = latLonToDirection(mozambique.lat, mozambique.lon);
const landOverrideByTileId = new Map(inheritedLandOverrides
  .filter((override) => {
    const center = graphCenter(fineGraph, override.tileId);
    const settlementDistance = Math.min(
      ...islandDirections.map((direction) => greatCircleDistanceKm(center, direction)),
      greatCircleDistanceKm(center, mozambiqueDirection)
    );
    return settlementDistance > 100 && isWaterSurface(earth.tiles[override.tileId]);
  })
  .map((override) => [override.tileId, override]));
for (const city of islandCities) {
  const tileId = findNearestTileId(
    fineGraph,
    fineDirectionIndex,
    cityPlacementDirection(city)
  );
  const source = earth.tiles[tileId];
  if (!isWaterSurface(source) || landOverrideByTileId.has(tileId)) continue;
  const template = nearestInheritedLandOverride(tileId, inheritedLandOverrides);
  landOverrideByTileId.set(tileId, {
    ...template,
    tileId,
    sourceTerrain: source.t,
    landmassId: 3000 + landOverrideByTileId.size
  });
}
const mozambiqueTileId = findNearestTileId(
  fineGraph,
  fineDirectionIndex,
  mozambiqueDirection
);
if (!landOverrideByTileId.has(mozambiqueTileId)) {
  const source = earth.tiles[mozambiqueTileId];
  const template = nearestInheritedLandOverride(mozambiqueTileId, inheritedLandOverrides);
  landOverrideByTileId.set(mozambiqueTileId, {
    ...template,
    tileId: mozambiqueTileId,
    sourceTerrain: source.t,
    terrainType: "tropical_savanna",
    landmassId: 3999
  });
}
for (const neighborId of fineGraph.neighbors[mozambiqueTileId]) {
  if (!isWaterSurface(earth.tiles[neighborId])) shallowWaterTileIdSet.add(neighborId);
}
const rapaVillage = islandCities.find((record) => record.city === "Rapa Nui Village");
if (!rapaVillage) throw new Error("Rapa Nui Village is missing from the manual city catalog");
const rapaVillageTileId = findNearestTileId(
  fineGraph,
  fineDirectionIndex,
  latLonToDirection(rapaVillage.lat, rapaVillage.lon)
);
const moaiDirection = latLonToDirection(-27.1258, -109.2767);
const moaiTileId = [...fineGraph.neighbors[rapaVillageTileId]].sort((a, b) => (
  directionDot(b, moaiDirection) - directionDot(a, moaiDirection)
))[0];
if (!landOverrideByTileId.has(moaiTileId)) {
  const source = earth.tiles[moaiTileId];
  const template = nearestInheritedLandOverride(moaiTileId, inheritedLandOverrides);
  landOverrideByTileId.set(moaiTileId, {
    ...template,
    tileId: moaiTileId,
    sourceTerrain: source.t,
    terrainType: "tropical_savanna",
    landmassId: landOverrideByTileId.get(rapaVillageTileId)?.landmassId ?? 3998
  });
}
const shallowWaterTileIds = [...shallowWaterTileIdSet].sort((a, b) => a - b);
const landOverrides = [...landOverrideByTileId.values()].sort((a, b) => a.tileId - b.tileId);
const blockedRiverEdges = MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS[7]
  .flatMap(([a, b]) => adjacentPairs(refineChain([a, b])))
  .filter(([a, b]) => baseRiverEdgeIsSet(a, b) && baseRiverEdgeIsSet(b, a));
const blockedRiverMouths = MANUAL_BLOCKED_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[7]
  .flatMap(({ tile, edge }) => blockedMouthsAlong(
    refineChain([tile, requiredCoarseEdgeNeighbor(tile, edge)])
  ));
const saltwaterPassageTileIds = unique([
  ...refineChain([98820, 98676, 98678, 24757]),
  ...refineChain([98682, 6233, 98694, 98704])
]);

const output = {
  shallowWaterTileIds,
  lakeOverrides,
  landOverrides,
  cityRiverChains,
  riverChains,
  blockedRiverEdges,
  blockedRiverMouths,
  riverMouths: [],
  saltwaterPassageTileIds
};
const source = `// Generated by tools/build-subdivision-eight-map-data.mjs.\n` +
  `// Authored subdivision-seven routes are split at their exact subdivision-eight edge midpoints.\n` +
  `function freezeDeep(value) {\n` +
  `  if (value && typeof value === "object" && !Object.isFrozen(value)) {\n` +
  `    for (const child of Object.values(value)) freezeDeep(child);\n` +
  `    Object.freeze(value);\n` +
  `  }\n` +
  `  return value;\n` +
  `}\n\n` +
  `export const SUBDIVISION_EIGHT_MAP_DATA = freezeDeep(${JSON.stringify(output, null, 2)});\n`;
await writeFile(outputPath, source);
console.info(
  `Wrote ${outputPath}: ${riverChains.length} river chains, ` +
  `${shallowWaterTileIds.length} shallow-water tiles, ${landOverrides.length} island corrections`
);

function refineChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) throw new Error("Cannot refine an empty hex chain");
  const refined = [chain[0]];
  for (let index = 1; index < chain.length; index++) {
    const a = chain[index - 1];
    const b = chain[index];
    if (!coarseGraph.neighbors[a]?.includes(b)) {
      throw new Error(`Subdivision-seven correction contains nonadjacent tiles ${a}/${b}`);
    }
    const neighborsOfA = new Set(fineGraph.neighbors[a]);
    const midpoints = [...fineGraph.neighbors[b]].filter((tileId) => neighborsOfA.has(tileId));
    if (midpoints.length !== 1) {
      throw new Error(`Expected one subdivision-eight midpoint for ${a}/${b}; got ${midpoints}`);
    }
    refined.push(midpoints[0], b);
  }
  return refined;
}

function routeThroughCoordinates(coordinates) {
  const tileIds = coordinates.map(({ lat, lon }) => findNearestTileId(
    fineGraph,
    fineDirectionIndex,
    latLonToDirection(lat, lon)
  ));
  const route = [tileIds[0]];
  for (let index = 1; index < tileIds.length; index++) {
    route.push(...shortestFinePath(route.at(-1), tileIds[index]).slice(1));
  }
  return route;
}

function shortestFinePath(startTileId, destinationTileId) {
  if (startTileId === destinationTileId) return [startTileId];
  const previous = new Map([[startTileId, -1]]);
  const queue = [startTileId];
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of fineGraph.neighbors[tileId]) {
      if (previous.has(neighborId)) continue;
      previous.set(neighborId, tileId);
      if (neighborId === destinationTileId) {
        const path = [neighborId];
        for (let current = tileId; current !== -1; current = previous.get(current)) {
          path.push(current);
        }
        return path.reverse();
      }
      queue.push(neighborId);
    }
  }
  throw new Error(`No subdivision-eight path between ${startTileId}/${destinationTileId}`);
}

function requiredCoarseEdgeNeighbor(tileId, edge) {
  const neighborId = coarseGraph.edgeNeighbors[tileId]?.[edge];
  if (!Number.isInteger(neighborId)) {
    throw new Error(`Subdivision-seven tile ${tileId} has no edge ${edge}`);
  }
  return neighborId;
}

function blockedMouthsAlong(chain) {
  const mouths = [];
  for (const [a, b] of adjacentPairs(chain)) {
    const aWater = isWaterSurface(earth.tiles[a]);
    const bWater = isWaterSurface(earth.tiles[b]);
    if (aWater === bWater) continue;
    const landTileId = aWater ? b : a;
    const waterTileId = aWater ? a : b;
    if (!baseRiverEdgeIsSet(landTileId, waterTileId)) continue;
    mouths.push({
      tile: landTileId,
      edge: fineGraph.edgeNeighbors[landTileId].indexOf(waterTileId)
    });
  }
  return mouths;
}

function baseRiverEdgeIsSet(fromTileId, toTileId) {
  const edge = fineGraph.edgeNeighbors[fromTileId].indexOf(toTileId);
  return edge >= 0 && earth.riverEdges[fromTileId]?.includes(edge);
}

function isWaterSurface(row) {
  return row?.t === "water" || row?.t === "lake" || row?.t === "beach";
}

function adjacentPairs(chain) {
  return chain.slice(1).map((tileId, index) => [chain[index], tileId]);
}

function unique(values) {
  return [...new Set(values)];
}

function nearestInheritedLandOverride(tileId, overrides) {
  const target = graphCenter(fineGraph, tileId);
  let best = null;
  let bestDot = -Infinity;
  for (const override of overrides) {
    const candidate = graphCenter(fineGraph, override.tileId);
    const dot = target[0] * candidate[0] + target[1] * candidate[1] + target[2] * candidate[2];
    if (dot <= bestDot) continue;
    best = override;
    bestDot = dot;
  }
  if (!best) throw new Error(`No island terrain template is available for tile ${tileId}`);
  return best;
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}

function cityPlacementDirection(city) {
  const hasPlacementLat = city.placementLat !== undefined;
  const hasPlacementLon = city.placementLon !== undefined;
  if (hasPlacementLat !== hasPlacementLon) {
    throw new Error(`Island placement requires both authored coordinates: ${city.city}`);
  }
  return latLonToDirection(
    hasPlacementLat ? city.placementLat : city.lat,
    hasPlacementLon ? city.placementLon : city.lon
  );
}

function directionDot(tileId, direction) {
  const center = graphCenter(fineGraph, tileId);
  return center[0] * direction[0] + center[1] * direction[1] + center[2] * direction[2];
}

function greatCircleDistanceKm(a, b) {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * 6371.0088;
}
