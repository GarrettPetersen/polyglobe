import { MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS } from "../src/manualRiverHexChains.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CITY_DATA_YEAR,
  cityLabelText,
  loadCityCatalogFromCsv
} from "../src/cityCatalogData.js";
import {
  buildGeodesicGraph,
  createDirectionIndex,
  cross3,
  findNearestTileId,
  graphCenter,
  normalize3
} from "../src/geodesic.js";
import { applyManualTerrainOverrides } from "../src/manualTerrainOverrides.js";
import {
  TERRAIN_RENDER_FAMILY,
  TERRAIN_TRAIT,
  terrainHasAnyTrait,
  terrainHasTrait,
  terrainRenderFamily
} from "../src/terrainMetadata.js";
import { isWaterSurfaceRow } from "../src/terrainSurface.js";
import { buildWorldNavigationTopology } from "../src/worldNavigationTopology.js";
import {
  isChristianReligion,
  isIslamicReligion,
  religionCandidatesForHome
} from "../src/characterReligion.js";
import { cityBackgroundEnabled } from "../city-visualizer/cityBackground.js";
import { cityHorizonLandmarks } from "../city-visualizer/cityHorizonLandmarks.js";
import {
  deriveCityArchitectureProfile,
  deriveCityServiceProfile
} from "../city-visualizer/cityArchitecture.js";
import { cityPopulationProfileId } from "../city-visualizer/cityPeople.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";

const GEOGRAPHY_SUBDIVISIONS = 7;
const NEIGHBORHOOD_RINGS = 5;
const MAX_APPROACH_SEARCH_RINGS = 18;
const OPEN_RIVER_HORIZON_MAX_RINGS = 1;
const OPEN_RIVER_HORIZON_MAX_DISTANCE_KM = 30;
const EARTH_RADIUS_KM = 6371;
const CITY_VISUALIZER_FORMAT = "marque-city-visualizer-catalog";
const CITY_VISUALIZER_VERSION = 7;
const TREE_COVER_RENDER_FAMILIES = new Set([
  TERRAIN_RENDER_FAMILY.BROADLEAF,
  TERRAIN_RENDER_FAMILY.CONIFER,
  TERRAIN_RENDER_FAMILY.FOREST,
  TERRAIN_RENDER_FAMILY.TROPICAL
]);
const DEVELOPED_BOTH_BANKS_CITY_IDS = new Set([
  "budapest|hungary",
  "london|united kingdom"
]);

const toolRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolRoot, "..");
const repoRoot = resolve(appRoot, "../..");
const sharedRoot = resolve(repoRoot, "examples/globe-demo/public");
const outputPath = resolve(appRoot, "city-visualizer/data/cities.json");

const [earthText, cityCsv, mountainText, sailingText] = await Promise.all([
  readFile(resolve(sharedRoot, `earth-globe-cache-${GEOGRAPHY_SUBDIVISIONS}.json`), "utf8"),
  readFile(
    resolve(sharedRoot, "datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv"),
    "utf8"
  ),
  readFile(resolve(sharedRoot, "mountains.json"), "utf8"),
  readFile(resolve(appRoot, "public/assets/data/port-sailing-distances.json"), "utf8")
]);

const earthCache = JSON.parse(earthText);
if (earthCache.subdivisions !== GEOGRAPHY_SUBDIVISIONS) {
  throw new Error(
    `Expected geography subdivision ${GEOGRAPHY_SUBDIVISIONS}, got ${earthCache.subdivisions}`
  );
}
const earthRows = applyManualTerrainOverrides(earthCache.tiles, GEOGRAPHY_SUBDIVISIONS);
const graph = buildGeodesicGraph(GEOGRAPHY_SUBDIVISIONS);
if (graph.tileCount !== earthRows.length) {
  throw new Error(`City visualizer world mismatch: graph ${graph.tileCount}, terrain ${earthRows.length}`);
}
const directionIndex = createDirectionIndex(graph);
const navigation = buildWorldNavigationTopology({
  graph,
  earthRows,
  earthCache,
  subdivisions: GEOGRAPHY_SUBDIVISIONS
});
const mountains = JSON.parse(mountainText);
const sailing = JSON.parse(sailingText);
const sailingEarthCache = JSON.parse(await readFile(
  resolve(sharedRoot, `earth-globe-cache-${sailing.subdivisions}.json`),
  "utf8"
));
if (sailingEarthCache.subdivisions !== sailing.subdivisions) {
  throw new Error(
    `Expected sailing geography subdivision ${sailing.subdivisions}, got ${sailingEarthCache.subdivisions}`
  );
}
const sailingEarthRows = applyManualTerrainOverrides(
  sailingEarthCache.tiles,
  sailing.subdivisions
);
const sailingGraph = buildGeodesicGraph(sailing.subdivisions);
const sailingNavigation = buildWorldNavigationTopology({
  graph: sailingGraph,
  earthRows: sailingEarthRows,
  earthCache: sailingEarthCache,
  subdivisions: sailing.subdivisions
});
const cityCatalog = loadCityCatalogFromCsv(cityCsv, CITY_DATA_YEAR);
const cityByEndpointKey = indexCityCatalog(cityCatalog);
const colonyByEndpointKey = new Map(COLONIZATION_TARGETS.map((target) => [
  endpointKey(target.city, target.country),
  target
]));

const cities = sailing.endpoints.map((endpoint) => {
  const key = endpointKey(endpoint.name, endpoint.country);
  const city = endpoint.kind === "port"
    ? cityByEndpointKey.get(key)
    : endpoint.kind === "colony"
      ? colonizationVisualizerCity(colonyByEndpointKey.get(key), endpoint)
      : null;
  if (!city) throw new Error(`No city record for ${endpoint.kind} ${endpoint.name}, ${endpoint.country}`);
  return visualizerCityRecord({
    city,
    endpoint,
    graph,
    directionIndex,
    earthRows,
    navigation,
    mountains,
    sailingGraph,
    sailingEarthRows,
    sailingNavigation
  });
}).sort((a, b) => a.label.localeCompare(b.label) || a.country.localeCompare(b.country));

const output = Object.freeze({
  format: CITY_VISUALIZER_FORMAT,
  version: CITY_VISUALIZER_VERSION,
  year: CITY_DATA_YEAR,
  geography: Object.freeze({
    source: "production Earth terrain, peak, river, and navigation data",
    subdivisions: GEOGRAPHY_SUBDIVISIONS,
    earthCacheVersion: String(earthCache.version),
    neighborhoodRings: NEIGHBORHOOD_RINGS,
    mountainVisibility: "elevation-weighted horizon from named mountains and production peak heights"
  }),
  cityCount: cities.length,
  cities
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output)}\n`);
console.log(
  `[pixel-globe] baked ${cities.length} water-accessible city scenes to ${outputPath} ` +
  `(terrain subdivision ${GEOGRAPHY_SUBDIVISIONS}, source ports subdivision ${sailing.subdivisions})`
);

function visualizerCityRecord({
  city,
  endpoint,
  graph,
  directionIndex,
  earthRows,
  navigation,
  mountains,
  sailingGraph,
  sailingEarthRows,
  sailingNavigation
}) {
  const coordinates = city.placementLat === undefined
    ? { lat: city.lat, lon: city.lon }
    : { lat: city.placementLat, lon: city.placementLon };
  const nearestTileId = findNearestTileId(graph, directionIndex, latLonToDirection(coordinates.lat, coordinates.lon));
  const cityTileId = nearestTileMatching(graph, nearestTileId, (tileId) => !isWaterSurfaceRow(earthRows[tileId]));
  if (cityTileId === undefined) throw new Error(`No land terrain near ${cityLabelText(city)}`);
  const access = nearestAccessTile({ graph, earthRows, navigation, cityTileId });
  if (!access) throw new Error(`No water approach near ${cityLabelText(city)}`);
  // Authored city river approaches must use the sailing map that contains
  // those routes. Keep the existing coarse scenery policy for other ports.
  const sailingAccess = nearestAccessTile({ graph: sailingGraph, earthRows: sailingEarthRows,
    navigation: sailingNavigation, cityTileId: endpoint.tileId });
  if (!sailingAccess || sailingAccess.coarseFallback) {
    throw new Error(`City scene has no navigable sailing approach: ${city.cityId}`);
  }
  const authoredRiverApproach = Boolean(
    MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[sailingGraph.subdivisions]?.[city.cityId]
  );
  const approach = authoredRiverApproach
    ? approachKind(sailingAccess.tileId, sailingEarthRows, sailingNavigation)
    : approachKind(access.tileId, earthRows, navigation);
  const shorelineAxis = shorelineTangent(graph, cityTileId, access.tileId);
  const neighborhood = terrainNeighborhood({
    graph,
    earthRows,
    cityTileId,
    shorelineAxis
  });
  // Production peaks supply coverage between named landmarks. Their real
  // elevation still has to clear the same horizon test, so a low nearby hill
  // cannot turn into a mountain backdrop merely because it is a local maximum.
  const peakSides = visiblePeakTileSides({
    graph,
    cityTileId,
    shorelineAxis,
    peakEntries: earthCache.peaks || []
  });
  const mountainVisibility = visibleMountainSides({
    city,
    mountains,
    graph,
    cityTileId,
    shorelineAxis,
    nearbyPeakSides: peakSides
  });
  const dock = dockStyle(city, approach);
  const fortification = fortificationEstimate(city);
  const builtUpBothBanks = approach === "river" && DEVELOPED_BOTH_BANKS_CITY_IDS.has(city.cityId);
  const riverHorizon = cityRiverHorizon({
    coordinates,
    approach,
    endpointTileId: endpoint.tileId,
    sailingGraph,
    sailingNavigation
  });
  const architecture = deriveCityArchitectureProfile(city);
  const landmarks = religiousLandmarks(city, architecture);
  const horizonLandmarks = cityHorizonLandmarks(city);
  const services = deriveCityServiceProfile({ ...city, architecture });
  const populationProfileId = cityPopulationProfileId({
    cityId: city.cityId,
    cityType: city.cityType,
    country: city.country,
    factionId: city.factionId,
    religiousLandmarks: landmarks
  });
  return Object.freeze({
    id: city.cityId,
    cityId: city.cityId,
    tileId: endpoint.tileId,
    geographyTileId: cityTileId,
    label: cityLabelText(city),
    city: city.city,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    population: Math.round(city.population),
    cityType: city.cityType,
    settlementType: city.settlementType || "city",
    factionId: city.factionId,
    architecture,
    services,
    capital: Boolean(city.declaredCapitalFactionId),
    religiousLandmarks: landmarks,
    horizonLandmarks,
    populationProfileId,
    backgroundCity: backgroundCityProfile(city, landmarks),
    approach,
    riverHorizon,
    builtUpBothBanks,
    dock,
    fortified: fortification.fortified,
    fortificationConfidence: fortification.confidence,
    mountains: Object.freeze({
      left: mountainVisibility.left,
      right: mountainVisibility.right,
      nearest: mountainVisibility.nearest
    }),
    terrain: Object.freeze(neighborhood),
    defaultShip: defaultShipForCityType(city.cityType),
    rules: Object.freeze({
      approach: approachRule(authoredRiverApproach ? sailingAccess : access, approach),
      riverHorizon: riverHorizon === null
        ? "not a river scene"
        : riverHorizon === "open"
          ? `a river mouth lies within ${OPEN_RIVER_HORIZON_MAX_RINGS} high-resolution tile ring and ${OPEN_RIVER_HORIZON_MAX_DISTANCE_KM} km`
          : "no river mouth lies beside the high-resolution approach",
      banks: builtUpBothBanks
        ? "curated 1522 urban settlement on both sides of the river"
        : "single-bank fallback until city-specific scene data is curated",
      dock: dockRule(city, dock, approach),
      fortification: fortification.reason,
      mountains: mountainVisibility.reason,
      horizonLandmarks: "distance-bounded visibility from canonical world landmarks",
      terrain: `dominant land cover within ${NEIGHBORHOOD_RINGS} game-tile rings, split across the approach axis`
    })
  });
}

function cityRiverHorizon({ coordinates, approach, endpointTileId, sailingGraph, sailingNavigation }) {
  if (approach !== "river") return null;
  if (!Number.isInteger(endpointTileId) || endpointTileId < 0 || endpointTileId >= sailingGraph.tileCount) {
    throw new Error(`Invalid sailing endpoint tile for river horizon: ${endpointTileId}`);
  }
  const riverMouth = searchAccessTile(
    sailingGraph,
    endpointTileId,
    // Tile adjacency alone can put an upstream city at the mouth when its
    // nearest hex changes. Measure from the settlement's actual coordinates.
    (tileId) => sailingNavigation.riverToWaterMasks[tileId] !== 0 &&
      greatCircleDistanceKm(coordinates.lat, coordinates.lon,
        sailingGraph.latDeg[tileId], sailingGraph.lonDeg[tileId]) <= OPEN_RIVER_HORIZON_MAX_DISTANCE_KM,
    OPEN_RIVER_HORIZON_MAX_RINGS
  );
  return riverMouth ? "open" : "closed";
}

function colonizationVisualizerCity(target, endpoint) {
  if (!target || target.city !== endpoint.name || target.country !== endpoint.country) {
    throw new Error(`Unknown colonization scene endpoint: ${endpoint.name}, ${endpoint.country}`);
  }
  return Object.freeze({
    ...target,
    population: 2400,
    settlementType: "city",
    requiredTradePort: true,
    colonialFoundingType: target.type,
    declaredCapitalFactionId: null
  });
}

function religiousLandmarks(city, architecture) {
  const candidates = religionCandidatesForHome(city);
  const landmarks = [];
  if (candidates.some(({ id }) => isChristianReligion(id))) landmarks.push("church");
  if (candidates.some(({ id }) => isIslamicReligion(id))) landmarks.push("mosque");
  if (
    architecture.housingStyle === "japanese" ||
    architecture.housingStyle === "east-asian"
  ) landmarks.push("pagoda");
  return Object.freeze(landmarks);
}

function backgroundCityProfile(city, landmarks) {
  const population = Math.round(city.population);
  const density = population >= 50_000
    ? "dense"
    : population >= 8_000
      ? "moderate"
      : "sparse";
  const variation = hashString(city.cityId);
  const landmarkCount = (landmark) => (
    density !== "sparse" && landmarks.includes(landmark) && cityBackgroundEnabled(city)
  )
    ? population >= 100_000 ? 3 : population >= 50_000 ? 2 : 1
    : 0;
  return Object.freeze({
    enabled: cityBackgroundEnabled(city),
    density,
    buildingMix: Object.freeze({
      homeA: 3 + (variation & 1),
      homeB: 3 + (variation >>> 1 & 1),
      inn: 1,
      smith: population >= 50_000 ? 2 : 1
    }),
    landmarks: Object.freeze({
      church: landmarkCount("church"),
      mosque: landmarkCount("mosque"),
      pagoda: landmarkCount("pagoda")
    })
  });
}

function indexCityCatalog(cities) {
  const result = new Map();
  for (const city of cities) {
    for (const name of new Set([city.city, city.displayCity, city.portAlias, cityLabelText(city)].filter(Boolean))) {
      result.set(endpointKey(name, city.country), city);
    }
  }
  return result;
}

function endpointKey(name, country) {
  return `${String(name).trim().toLowerCase()}|${String(country).trim().toLowerCase()}`;
}

function nearestAccessTile({ graph, earthRows, navigation, cityTileId }) {
  const reachableRiver = searchAccessTile(graph, cityTileId, (tileId) => (
    navigation.reachableNavigationMask[tileId] && Boolean(navigation.riverMasks[tileId])
  ));
  const reachableOcean = searchAccessTile(graph, cityTileId, (tileId) => (
    navigation.reachableNavigationMask[tileId] &&
    (earthRows[tileId]?.t === "water" || earthRows[tileId]?.t === "beach")
  ));
  const reachableLake = searchAccessTile(graph, cityTileId, (tileId) => (
    navigation.reachableNavigationMask[tileId] && earthRows[tileId]?.t === "lake"
  ));
  const surface = nearestCandidate(reachableOcean, reachableLake);
  if (surface && (!reachableRiver || surface.distance <= reachableRiver.distance)) return surface;
  if (reachableRiver) return reachableRiver;
  if (surface) return surface;
  const coarseRiver = searchAccessTile(
    graph,
    cityTileId,
    (tileId) => Boolean(navigation.riverMasks[tileId])
  );
  if (coarseRiver) return { ...coarseRiver, coarseFallback: true };
  const coarseWater = searchAccessTile(graph, cityTileId, (tileId) => isWaterSurfaceRow(earthRows[tileId]));
  return coarseWater ? { ...coarseWater, coarseFallback: true } : null;
}

function nearestCandidate(...candidates) {
  return candidates.filter(Boolean).sort((a, b) => a.distance - b.distance)[0] || null;
}

function searchAccessTile(graph, cityTileId, predicate, maximumRings = MAX_APPROACH_SEARCH_RINGS) {
  const visited = new Set([cityTileId]);
  const queue = [{ tileId: cityTileId, distance: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (predicate(current.tileId)) return current;
    if (current.distance >= maximumRings) continue;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, distance: current.distance + 1 });
    }
  }
  return null;
}

function approachKind(tileId, earthRows, navigation) {
  if (earthRows[tileId]?.t === "lake") return "lake";
  if (earthRows[tileId]?.t === "water" || earthRows[tileId]?.t === "beach") return "ocean";
  if (navigation.riverMasks[tileId]) return "river";
  return "ocean";
}

function terrainNeighborhood({ graph, earthRows, cityTileId, shorelineAxis }) {
  const scores = {
    left: newTerrainScore(),
    right: newTerrainScore(),
    leftDistant: newTerrainScore(),
    rightDistant: newTerrainScore()
  };
  const cityDirection = graphCenter(graph, cityTileId);
  const treeCover = { left: false, right: false };
  const visited = new Set([cityTileId]);
  const queue = [{ tileId: cityTileId, ring: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const row = earthRows[current.tileId];
    if (!isWaterSurfaceRow(row)) {
      const direction = graphCenter(graph, current.tileId);
      const side = signedSide(cityDirection, direction, shorelineAxis) < 0 ? "left" : "right";
      const distanceWeight = 1 / (1 + current.ring * 0.7);
      scores[side][terrainFamily(row)] += distanceWeight;
      if (current.ring > 0 && terrainHasTreeCover(row)) treeCover[side] = true;
      if (current.ring >= 2) scores[`${side}Distant`][terrainFamily(row)] += distanceWeight;
    }
    if (current.ring >= NEIGHBORHOOD_RINGS) continue;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      queue.push({ tileId: neighborId, ring: current.ring + 1 });
    }
  }
  return {
    left: dominantTerrain(scores.left),
    right: dominantTerrain(scores.right),
    leftDistant: dominantTerrain(scores.leftDistant),
    rightDistant: dominantTerrain(scores.rightDistant),
    leftTreeCover: treeCover.left,
    rightTreeCover: treeCover.right
  };
}

function terrainHasTreeCover(row) {
  return TREE_COVER_RENDER_FAMILIES.has(terrainRenderFamily(row?.t || "land"));
}

function visiblePeakTileSides({ graph, cityTileId, shorelineAxis, peakEntries }) {
  const result = { left: false, right: false };
  const cityDirection = graphCenter(graph, cityTileId);
  for (const [tileId, elevationM] of peakEntries) {
    if (!Number.isFinite(elevationM) || elevationM <= 0) continue;
    const peakDirection = graphCenter(graph, tileId);
    const dot = clamp3Dot(
      cityDirection[0] * peakDirection[0] +
      cityDirection[1] * peakDirection[1] +
      cityDirection[2] * peakDirection[2]
    );
    const distanceKm = Math.acos(dot) * EARTH_RADIUS_KM;
    if (distanceKm > mountainVisibilityRadiusKm(elevationM)) continue;
    const side = signedSide(cityDirection, peakDirection, shorelineAxis) < 0 ? "left" : "right";
    result[side] = true;
  }
  return result;
}

function visibleMountainSides({ city, mountains, graph, cityTileId, shorelineAxis, nearbyPeakSides }) {
  const cityDirection = graphCenter(graph, cityTileId);
  const visible = [];
  for (const mountain of mountains) {
    if (!Number.isFinite(mountain.elevationM) || mountain.elevationM <= 0) continue;
    const distanceKm = greatCircleDistanceKm(city.lat, city.lon, mountain.lat, mountain.lon);
    const visibilityKm = mountainVisibilityRadiusKm(mountain.elevationM);
    if (distanceKm > visibilityKm) continue;
    const direction = latLonToDirection(mountain.lat, mountain.lon);
    const side = signedSide(cityDirection, direction, shorelineAxis) < 0 ? "left" : "right";
    visible.push({
      name: mountain.nameAlt || mountain.name,
      elevationM: Math.round(mountain.elevationM),
      distanceKm: Math.round(distanceKm),
      side
    });
  }
  visible.sort((a, b) => a.distanceKm - b.distanceKm || b.elevationM - a.elevationM);
  const left = nearbyPeakSides.left || visible.some((mountain) => mountain.side === "left");
  const right = nearbyPeakSides.right || visible.some((mountain) => mountain.side === "right");
  const nearest = visible[0] || null;
  return {
    left,
    right,
    nearest,
    reason: nearest
      ? `${nearest.name}, ${nearest.distanceKm} km away; visibility radius scales with its ${nearest.elevationM} m elevation`
      : (left || right
          ? "unnamed production peak clears the elevation-weighted sightline"
          : "no production peak clears the elevation-weighted sightline")
  };
}

function mountainVisibilityRadiusKm(elevationM) {
  const heightKm = elevationM / 1000;
  return Math.min(280, 25 + Math.sqrt(2 * EARTH_RADIUS_KM * heightKm));
}

function clamp3Dot(value) {
  return Math.max(-1, Math.min(1, value));
}

function shorelineTangent(graph, cityTileId, accessTileId) {
  const city = graphCenter(graph, cityTileId);
  const water = graphCenter(graph, accessTileId);
  const dot = city[0] * water[0] + city[1] * water[1] + city[2] * water[2];
  const approach = normalize3([
    water[0] - city[0] * dot,
    water[1] - city[1] * dot,
    water[2] - city[2] * dot
  ]);
  return normalize3(cross3(city, approach));
}

function signedSide(origin, target, axis) {
  const dot = origin[0] * target[0] + origin[1] * target[1] + origin[2] * target[2];
  return (target[0] - origin[0] * dot) * axis[0] +
    (target[1] - origin[1] * dot) * axis[1] +
    (target[2] - origin[2] * dot) * axis[2];
}

function terrainFamily(row) {
  const kind = row?.t || "land";
  if (terrainHasTrait(kind, TERRAIN_TRAIT.DESERT)) return "desert";
  if (terrainHasAnyTrait(kind, [TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.HIGHLAND, TERRAIN_TRAIT.ROCK])) {
    return "rocky";
  }
  if (terrainHasAnyTrait(kind, [TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.JUNGLE])) return "forest";
  return "grass";
}

function newTerrainScore() {
  return { grass: 0, forest: 0, desert: 0, rocky: 0 };
}

function dominantTerrain(scores) {
  return Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function dockStyle(city, approach) {
  if (city.settlementType === "village" || city.population < 3500) return "none";
  if (approach === "river") return city.population >= 80000 ? "stone" : "wood";
  if (city.requiredTradePort || city.declaredCapitalFactionId || city.population >= 25000) return "stone";
  return "wood";
}

function dockRule(city, dock, approach) {
  if (dock === "none") return "ship anchors offshore; boats and canoes use the beach landing";
  if (approach === "river" && dock === "wood") return "river landing uses the lighter timber structure";
  if (dock === "stone") {
    return city.requiredTradePort
      ? "major 1522 trade port receives the durable stone quay"
      : "capital or population scale supports a masonry quay";
  }
  return "water-accessible town receives the timber dock";
}

function fortificationEstimate(city) {
  if (city.settlementType === "village") {
    return { fortified: false, confidence: "high", reason: "1522 village catalog: no urban gatehouse" };
  }
  if (city.declaredCapitalFactionId) {
    return { fortified: true, confidence: "medium", reason: "1522 faction seat: defensive enclosure expected" };
  }
  if (city.requiredTradePort) {
    return { fortified: true, confidence: "medium", reason: "strategic 1522 trade-port record" };
  }
  if (city.population >= 25000) {
    return { fortified: true, confidence: "provisional", reason: "provisional 1522 large-city wall estimate" };
  }
  return { fortified: false, confidence: "provisional", reason: "provisional 1522 small-town open-settlement estimate" };
}

function approachRule(access, approach) {
  const rings = access.distance === 0 ? "on the city tile" : `${access.distance} tile ring${access.distance === 1 ? "" : "s"} away`;
  const source = access.coarseFallback ? "coarse geography fallback" : "ocean-reachable topology";
  if (approach === "river") return `${source} river channel ${rings}`;
  if (approach === "lake") return `${source} freshwater surface ${rings}`;
  return `${source} coastal water ${rings}`;
}

function defaultShipForCityType(cityType) {
  const shipSlug = ({
    "northern-european": "small-cog",
    mediterranean: "xebec",
    "islamic-desert": "dhow",
    "east-asian": "small-junk",
    "south-asian": "ocean-dhow",
    "southeast-asian": "javanese-jong",
    polynesian: "polynesian-voyaging-canoe",
    mesoamerican: "mesoamerican-dugout-canoe",
    andean: "mesoamerican-dugout-canoe",
    "sub-saharan": "dhow"
  })[cityType];
  if (!shipSlug) throw new Error(`No default city ship for city type: ${cityType}`);
  return shipSlug;
}

function nearestTileMatching(graph, startId, predicate) {
  const seen = new Set([startId]);
  const queue = [startId];
  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    if (predicate(tileId)) return tileId;
    for (const neighborId of graph.neighbors[tileId]) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return undefined;
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}

function greatCircleDistanceKm(latA, lonA, latB, lonB) {
  const directionA = latLonToDirection(latA, lonA);
  const directionB = latLonToDirection(latB, lonB);
  const dot = Math.max(-1, Math.min(1,
    directionA[0] * directionB[0] + directionA[1] * directionB[1] + directionA[2] * directionB[2]
  ));
  return Math.acos(dot) * EARTH_RADIUS_KM;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
