import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Lensflare,
  LensflareElement,
} from "three/examples/jsm/objects/Lensflare.js";
import * as topojson from "topojson-client";
import * as JSZipNS from "jszip";
const JSZip =
  (JSZipNS as unknown as { default: typeof JSZipNS }).default ?? JSZipNS;
import {
  Globe,
  Sun,
  Atmosphere,
  WaterSphere,
  Starfield,
  createGeodesicGeometryFlat,
  updateFlatGeometryFromTerrain,
  applyTerrainColorsToGeometry,
  applyLandSurfaceWeatherVertexColors,
  combinedLandSnowCover,
  applyVertexColorsByTileId,
  applyTerrainToGeometry,
  createCoastMaskTexture,
  createCoastLandMaskTexture,
  CoastFoamOverlay,
  buildTerrainFromEarthRaster,
  earthRasterFromImageData,
  applyCoastalBeach,
  parseKoppenAsciiGrid,
  applyPreset,
  getPreset,
  placeObject,
  getEdgeNeighbor,
  tileCenterToLatLon,
  latLonToDegrees,
  computeWindForTiles,
  createWindArrows,
  updateWindArrows,
  createFlowArrows,
  updateFlowArrows,
  traceRiverThroughTiles,
  getRiverEdgesByTile,
  getRiverFlowByTile,
  pruneThreeWayRiverJunctions,
  connectIsolatedRiverTiles,
  fillRiverGaps,
  forceRiverReciprocity,
  symmetrizeRiverNeighborEdgesUntilStable,
  createRiverTerrainMeshes,
  TERRAIN_STYLES,
  type TileTerrainData,
  type EarthRaster,
  type ClimateGrid,
  type GeodesicTile,
  type RegionScores,
  type RasterWindow,
  parseElevationBin,
  parseTemperatureMonthlyBin,
  attachMonthlyTemperatureToTerrainFromRaster,
  getPrecipitation,
  climateSurfaceSnowVisualForTerrain,
  createPrecipitationOverlay,
  updatePrecipitationOverlay,
  getPrecipitationByTile,
  getPrecipitationByTileWithMoisture,
  buildMoistureByTileFromTerrain,
  createCloudLayer,
  updateCloudLayer,
  sortLowPolyCloudsByCamera,
  CloudClipField,
  buildAnnualCloudSpawnTable,
  analyzePrecipClimatologyGap,
  createPrecipitationParticlesGroup,
  updatePrecipitationParticles,
  disposePrecipitationParticlesGroup,
  utcMinuteFromDate,
  type PrecipSubsolarForMinute,
} from "polyglobe";
import {
  EARTH_GLOBE_CACHE_VERSION,
  EARTH_STRAIT_TILE_IDS_SUBDIVISION_6,
  MAX_EARTH_GLOBE_SUBDIVISIONS,
  isEarthGlobeCacheVersionOk,
} from "./earthGlobeCacheVersion";
import {
  dateToSubsolarPoint,
  dateToSublunarPoint,
  dateToDatetimeLocalUTC,
  datetimeLocalUTCToDate,
  dateToGreenwichMeanSiderealTimeRad,
} from "./astronomy.js";
import { createPlanetsMesh } from "./planets.js";
import { createSkyDome } from "./skyDome.js";
import {
  logPerfDiagUrlHint,
  logPerfDiagHelp,
  createBuildPerfMarker,
  createFramePerfSamplerOrNoop,
} from "./perfDiag.js";

/** Plant assets live in public/plant-models/ so Vite serves them at /plant-models/. Run dev from examples/globe-demo. */
const PLANT_BASE =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) || "";
const _plantBase = (PLANT_BASE.replace(/\/?$/, "/") + "plant-models").replace(/^\/?/, "/");
const treeUrls = [
  `${_plantBase}/deciduous_round_A_Color1.gltf`,
  `${_plantBase}/deciduous_round_B_Color1.gltf`,
  `${_plantBase}/deciduous_round_C_Color1.gltf`,
  `${_plantBase}/acacia_A_Color1.gltf`,
  `${_plantBase}/acacia_B_Color1.gltf`,
  `${_plantBase}/acacia_C_Color1.gltf`,
  `${_plantBase}/pine_A_Color1.gltf`,
  `${_plantBase}/pine_B_Color1.gltf`,
  `${_plantBase}/pine_C_Color1.gltf`,
  `${_plantBase}/bamboo_stand.glb`,
  `${_plantBase}/deciduous_boxy_A_Color1.gltf`,
  `${_plantBase}/deciduous_boxy_B_Color1.gltf`,
  `${_plantBase}/deciduous_boxy_C_Color1.gltf`,
  `${_plantBase}/palm_A_Color1.glb`,
  `${_plantBase}/palm_B_Color1.glb`,
  `${_plantBase}/palm_C_Color1.glb`,
];
const bushUrls = [
  `${_plantBase}/bush_deciduous_round_A_Color1.gltf`,
  `${_plantBase}/bush_deciduous_round_B_Color1.gltf`,
  `${_plantBase}/bush_acacia_A_Color1.gltf`,
  `${_plantBase}/bush_pine_A_Color1.gltf`,
];
const grassUrls = [
  `${_plantBase}/grass_1_A_Color1.gltf`,
  `${_plantBase}/grass_1_B_Color1.gltf`,
  `${_plantBase}/grass_2_A_Color1.gltf`,
];
const rockUrls = [
  `${_plantBase}/rock_1_A_Color1.gltf`,
  `${_plantBase}/rock_1_B_Color1.gltf`,
  `${_plantBase}/rock_1_C_Color1.gltf`,
];

console.log("[globe-build] demo main.ts loaded");
logPerfDiagUrlHint();
logPerfDiagHelp();

/** Tree variant indices: 0–2 deciduous_round; 3–5 acacia; 6–8 pine; 9 bamboo; 10–12 deciduous_boxy; 13–15 palm. */
const TREE_VARIANT_DECIDUOUS_ROUND = [0, 1, 2];
const TREE_VARIANT_ACACIA = [3, 4, 5];
const TREE_VARIANT_PINE = [6, 7, 8];
const TREE_VARIANT_BAMBOO = 9;
const TREE_VARIANT_DECIDUOUS_BOXY = [10, 11, 12];
const TREE_VARIANT_PALM = [13, 14, 15];

/**
 * Monsoonal bamboo belt: East Asia and SE Asia (China, Japan, Korea, Vietnam, Thailand, Myanmar).
 * Excludes Indonesia (southern boundary 5°N) and India (western boundary 98°E — India is ~68–97°E).
 *
 * `tileCenterToLatLon` + `latLonToDegrees` match {@link latLonDegToDirection} / Earth raster:
 * **east longitude is positive** (e.g. Beijing ~+116°).
 */
function isBambooRegion(latDeg: number, lonDeg: number): boolean {
  return latDeg >= 5 && latDeg <= 45 && lonDeg >= 98 && lonDeg <= 152;
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

/**
 * Greater Antilles / Bahamas / Yucatán / Florida-ish — lots of palms; often `humid_subtropical_hot` (e.g. Cuba) not `Aw`.
 * Lon uses same east-positive convention as {@link latLonDegToDirection}.
 */
function isCaribbeanTropicalPalmBelt(latDeg: number, lonDeg: number): boolean {
  return latDeg >= 9 && latDeg <= 30 && lonDeg >= -98 && lonDeg <= -65;
}

/** Fraction of tree placements that are bamboo when in the bamboo region (rest use biome mix). */
const BAMBOO_REGION_BAMBOO_FRAC = 0.52;

function getTreeVariantIndex(biome: string, latDeg: number, lonDeg: number, rnd: () => number): number {
  const carib = isCaribbeanTropicalPalmBelt(latDeg, lonDeg);
  if (isBambooRegion(latDeg, lonDeg) && rnd() < BAMBOO_REGION_BAMBOO_FRAC) return TREE_VARIANT_BAMBOO;
  if (biome === "tropical_rainforest" || biome === "tropical_monsoon") {
    /** Slightly below half — Amazon canopy is mostly broadleaf; palms are common but not dominant. */
    if (rnd() < 0.38) return pick(TREE_VARIANT_PALM, rnd);
    return rnd() < 0.5 ? pick(TREE_VARIANT_DECIDUOUS_ROUND, rnd) : pick(TREE_VARIANT_DECIDUOUS_BOXY, rnd);
  }
  if (biome === "tropical_savanna") {
    /** Savanna has very few tree placements overall; when we do pick a tree, palms should be likely (Caribbean / NE South America Aw). */
    const palmFrac = carib ? 0.58 : 0.52;
    if (rnd() < palmFrac) return pick(TREE_VARIANT_PALM, rnd);
    return pick(TREE_VARIANT_ACACIA, rnd);
  }
  if (
    biome === "humid_subtropical" ||
    biome === "humid_subtropical_hot" ||
    biome === "swamp"
  ) {
    const palmFrac = carib ? 0.48 : 0.22;
    if (rnd() < palmFrac) return pick(TREE_VARIANT_PALM, rnd);
  }
  /**
   * Conifers: Köppen Dfc/Dfd, tundra — and **Cfb/Cfc/Dfb** etc., which cover most of BC, PNW, Rockies,
   * Scandinavia. Previously only Dwa/Dwb + "subarctic*" used pine; coastal BC was `oceanic` → all deciduous.
   */
  if (biome.startsWith("subarctic") || biome === "tundra") {
    return pick(TREE_VARIANT_PINE, rnd);
  }
  if (
    biome === "humid_continental_hot" ||
    biome === "humid_continental_warm" ||
    biome === "humid_continental" ||
    biome === "warm_summer_humid" ||
    biome === "hot_summer_continental" ||
    biome === "warm_summer_continental" ||
    biome === "oceanic" ||
    biome === "subpolar_oceanic" ||
    biome === "subtropical_highland_cold"
  ) {
    if (rnd() < 0.72) return pick(TREE_VARIANT_PINE, rnd);
    return rnd() < 0.5 ? pick(TREE_VARIANT_DECIDUOUS_ROUND, rnd) : pick(TREE_VARIANT_DECIDUOUS_BOXY, rnd);
  }
  return rnd() < 0.5 ? pick(TREE_VARIANT_DECIDUOUS_ROUND, rnd) : pick(TREE_VARIANT_DECIDUOUS_BOXY, rnd);
}

function getBushVariantIndex(biome: string, _latDeg: number, _lonDeg: number, rnd: () => number): number {
  if (biome === "tropical_savanna") return 2;
  if (biome.startsWith("subarctic") || biome === "tundra") return 3;
  if (
    biome === "oceanic" ||
    biome === "subpolar_oceanic" ||
    biome === "warm_summer_humid" ||
    biome === "humid_continental" ||
    biome === "humid_continental_hot" ||
    biome === "humid_continental_warm" ||
    biome === "hot_summer_continental" ||
    biome === "warm_summer_continental"
  ) {
    if (rnd() < 0.55) return 3;
  }
  return rnd() < 0.5 ? 0 : 1;
}

function getGrassVariantIndex(_biome: string, _latDeg: number, _lonDeg: number, rnd: () => number): number {
  return Math.min(2, Math.floor(rnd() * 3));
}

function getRockVariantIndex(_biome: string, _latDeg: number, _lonDeg: number, rnd: () => number): number {
  return Math.min(2, Math.floor(rnd() * 3));
}

type EarthGlobeCacheFile = {
  version: string;
  subdivisions: number;
  tileCount: number;
  tiles: Array<{ id: number; t: string; e: number; l?: number; h?: 1 }>;
  peaks: [number, number][];
  riverEdges: Record<string, number[]>;
  riverEdgeToWater: Record<string, number[]>;
};

function earthGlobeCacheFetchUrls(subdivisions: number): string[] {
  const urls = [`/earth-globe-cache-${subdivisions}.json`];
  if (subdivisions === 6) urls.push("/earth-globe-cache.json");
  return urls;
}

async function fetchEarthGlobeCache(
  subdivisions: number,
): Promise<EarthGlobeCacheFile | null> {
  if (
    typeof window !== "undefined" &&
    /[?&]noEarthCache=1/i.test(window.location.search)
  ) {
    return null;
  }
  for (const url of earthGlobeCacheFetchUrls(subdivisions)) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = (await res.json()) as EarthGlobeCacheFile;
      if (
        !isEarthGlobeCacheVersionOk(j.version, subdivisions) ||
        j.subdivisions !== subdivisions ||
        !Array.isArray(j.tiles)
      ) {
        continue;
      }
      return j;
    } catch {
      continue;
    }
  }
  return null;
}

/** All geography data is loaded from public/ (run npm run download-data once, then commit public/). */
const EARTH_LAND_TOPOLOGY_URL = "/land-50m.json";
const EARTH_REGION_GRID_BIN = "/earth-region-grid.bin";
const EARTH_LAKES_GEOJSON_URL = "/ne_110m_lakes.json";
const EARTH_MARINE_POLYS_URL = "/ne_110m_geography_marine_polys.json";
const KOPPEN_BIN_SAME_ORIGIN = "/koppen.bin";
/** WorldClim-style mean monthly tavg stack: {@link parseTemperatureMonthlyBin} (`PG12` + 12×W×H float32 °C). */
const TAVG_MONTHLY_BIN_SAME_ORIGIN = "/tavg_monthly.bin";
const KOPPEN_ZIP_SAME_ORIGIN = "/koppen_ascii.zip";
const KOPPEN_ZIP_REMOTE: string | null = null;
const ELEVATION_BIN_SAME_ORIGIN = "/elevation.bin";
const MOUNTAINS_JSON_SAME_ORIGIN = "/mountains.json";

/** Mountain entry: lat/lon in degrees, elevation in meters. Sorted by elevation (highest first). */
interface MountainEntry {
  name: string;
  lat: number;
  lon: number;
  elevationM: number;
}

/** Convert geographic lat/lon (degrees) to unit direction. Matches tileCenterToLatLon convention (lon = -atan2(z,x)) so getTileIdAtDirection finds the same tile the Earth raster uses. */
function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const dir = new THREE.Vector3(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad),
  );
  return dir.normalize();
}

export interface DemoState {
  useEarth: boolean;
  subdivisions: number;
  /** UTC date/time for sun/moon positions (YYYY-MM-DDTHH:mm). When set, sun/moon are derived from this. */
  dateTimeStr: string;
  /** Show wind arrows overlay (seasonal trade winds, westerlies, etc.). */
  showWinds: boolean;
  /** Show flow overlay (river flow + ocean currents). */
  showFlow: boolean;
  /** Show precipitation overlay (rain band). */
  showPrecipitation: boolean;
  /** Show cloud layer. */
  showClouds: boolean;
  /**
   * If set, cloud/precip simulation uses this UTC minute index instead of deriving from
   * {@link dateTimeStr} (for game clocks that tick separately from the sun/moon date).
   */
  gameClockUtcMinute: number | null;
  /** When true, the animation loop advances {@link dateTimeStr} from real frame delta × {@link timePlaySpeed}. */
  timePlaying: boolean;
  /** Simulated-time multiplier vs real time (1 = real-time). */
  timePlaySpeed: number;
  landFraction: number;
  blobiness: number;
  seed: number;
}

const DEFAULT_STATE: DemoState = {
  useEarth: true,
  /** Default 7 uses `public/earth-globe-cache-7.json` (run `npm run build-earth-globe-cache -- 7` if missing). */
  subdivisions: 7,
  dateTimeStr: "",
  showWinds: false,
  showFlow: false,
  showPrecipitation: true,
  showClouds: true,
  gameClockUtcMinute: null,
  timePlaying: false,
  timePlaySpeed: 3600,
  landFraction: 0.5,
  blobiness: 6,
  seed: 12345,
};

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function buildProceduralTerrain(
  tiles: GeodesicTile[],
  state: DemoState,
): Map<number, TileTerrainData> {
  const rnd = seededRandom(state.seed);
  const landMask = new Float32Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) landMask[i] = rnd();
  for (let iter = 0; iter < state.blobiness; iter++) {
    const next = new Float32Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let sum = landMask[i];
      let n = 1;
      for (const j of t.neighbors) {
        sum += landMask[j];
        n++;
      }
      next[i] = sum / n;
    }
    for (let i = 0; i < tiles.length; i++) landMask[i] = next[i];
  }
  const landThreshold = state.landFraction;
  const tileTerrain = new Map<number, TileTerrainData>();
  const midLandTypes: TileTerrainData["type"][] = [
    "land",
    "forest",
    "mountain",
    "grassland",
  ];
  for (let i = 0; i < tiles.length; i++) {
    const isLand = landMask[i] > landThreshold;
    const y = tiles[i].center.y;
    const absLat = Math.abs(y);
    let type: TileTerrainData["type"];
    let elevation: number;
    if (!isLand) {
      type = "water";
      elevation = MAX_SEA_BED_ELEVATION;
    } else {
      if (absLat > 0.82) {
        type = rnd() < 0.7 ? "ice" : "snow";
        elevation = 0.06;
      } else if (absLat < 0.32) {
        type = rnd() < 0.65 ? "desert" : rnd() < 0.6 ? "land" : "forest";
        elevation = type === "desert" ? 0.05 : 0.1;
      } else {
        type = midLandTypes[Math.floor(rnd() * midLandTypes.length)];
        elevation = type === "mountain" ? 0.28 : 0.1;
      }
    }
    tileTerrain.set(i, { tileId: i, type, elevation });
  }
  for (let i = 0; i < tiles.length; i++) {
    const data = tileTerrain.get(i)!;
    if (data.type !== "water") continue;
    const hasLandNeighbor = tiles[i].neighbors.some(
      (n) => tileTerrain.get(n)?.type !== "water",
    );
    if (hasLandNeighbor) tileTerrain.set(i, { ...data, type: "beach" });
  }
  return tileTerrain;
}

/** Build a simple land/water terrain map from a landMask (0..1) for progressive display. */
function terrainFromLandMask(
  landMask: Float32Array,
  tiles: GeodesicTile[],
  landFraction: number,
): Map<number, TileTerrainData> {
  const out = new Map<number, TileTerrainData>();
  for (let i = 0; i < tiles.length; i++) {
    const isLand = landMask[i] > landFraction;
    out.set(i, {
      tileId: i,
      type: isLand ? "land" : "water",
      elevation: isLand ? 0.1 : MAX_SEA_BED_ELEVATION,
    });
  }
  return out;
}

/** Build procedural terrain, calling onProgress after each blob iteration so the globe can render in progress. */
async function buildProceduralTerrainProgressive(
  tiles: GeodesicTile[],
  state: DemoState,
  onProgress: (intermediate: Map<number, TileTerrainData>) => Promise<void>,
): Promise<Map<number, TileTerrainData>> {
  const rnd = seededRandom(state.seed);
  const landMask = new Float32Array(tiles.length);
  for (let i = 0; i < tiles.length; i++) landMask[i] = rnd();
  for (let iter = 0; iter < state.blobiness; iter++) {
    const next = new Float32Array(tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      let sum = landMask[i];
      let n = 1;
      for (const j of t.neighbors) {
        sum += landMask[j];
        n++;
      }
      next[i] = sum / n;
    }
    for (let i = 0; i < tiles.length; i++) landMask[i] = next[i];
    console.log(
      BUILD_LOG,
      "Procedural: blob iteration",
      iter + 1,
      "/",
      state.blobiness,
    );
    const intermediate = terrainFromLandMask(
      landMask,
      tiles,
      state.landFraction,
    );
    await onProgress(intermediate);
  }
  console.log(BUILD_LOG, "Procedural: deriving final terrain types");
  const landThreshold = state.landFraction;
  const tileTerrain = new Map<number, TileTerrainData>();
  const midLandTypes: TileTerrainData["type"][] = [
    "land",
    "forest",
    "mountain",
    "grassland",
  ];
  for (let i = 0; i < tiles.length; i++) {
    const isLand = landMask[i] > landThreshold;
    const y = tiles[i].center.y;
    const absLat = Math.abs(y);
    let type: TileTerrainData["type"];
    let elevation: number;
    if (!isLand) {
      type = "water";
      elevation = MAX_SEA_BED_ELEVATION;
    } else {
      if (absLat > 0.82) {
        type = rnd() < 0.7 ? "ice" : "snow";
        elevation = 0.06;
      } else if (absLat < 0.32) {
        type = rnd() < 0.65 ? "desert" : rnd() < 0.6 ? "land" : "forest";
        elevation = type === "desert" ? 0.05 : 0.1;
      } else {
        type = midLandTypes[Math.floor(rnd() * midLandTypes.length)];
        elevation = type === "mountain" ? 0.28 : 0.1;
      }
    }
    tileTerrain.set(i, { tileId: i, type, elevation });
  }
  for (let i = 0; i < tiles.length; i++) {
    const data = tileTerrain.get(i)!;
    if (data.type !== "water") continue;
    const hasLandNeighbor = tiles[i].neighbors.some(
      (n) => tileTerrain.get(n)?.type !== "water",
    );
    if (hasLandNeighbor) tileTerrain.set(i, { ...data, type: "beach" });
  }
  return tileTerrain;
}

const TERRAIN_ANIMATION_FRAMES = 28;
const TERRAIN_ANIMATION_EASING = (t: number) => t * (2 - t); // ease-out quadratic

/** Return a set of tile IDs that have peaks (for geometry layout comparison). */
function getPeakTileSet(
  peakTiles: Map<number, number> | undefined,
): Set<number> {
  if (!peakTiles) return new Set();
  return new Set(peakTiles.keys());
}

/** Animate terrain from previous to next: lerp elevation and color over several frames. */
async function runTerrainTransition(
  globe: Globe,
  prevTerrain: Map<number, TileTerrainData>,
  nextTerrain: Map<number, TileTerrainData>,
  elevationScale: number,
  peakElevationScale: number,
  peakTilesPrev: Map<number, number> | undefined,
  peakTilesNext: Map<number, number> | undefined,
  yieldToMain: () => Promise<void>,
  minLandElevation?: number,
  riverEdgesByTile?: Map<number, Set<number>>,
  riverEdgeToWaterByTile?: Map<number, Set<number>>,
): Promise<void> {
  const peakSetPrev = getPeakTileSet(peakTilesPrev);
  const peakSetNext = getPeakTileSet(peakTilesNext);
  const peakSetChanged =
    peakSetPrev.size !== peakSetNext.size ||
    [...peakSetNext].some((id) => !peakSetPrev.has(id));

  const opts: {
    radius: number;
    elevationScale: number;
    peakElevationScale: number;
    minLandElevation?: number;
  } = {
    radius: globe.radius,
    elevationScale,
    peakElevationScale,
  };
  if (minLandElevation != null) opts.minLandElevation = minLandElevation;

  if (riverEdgesByTile != null && riverEdgesByTile.size > 0) {
    console.log(
      BUILD_LOG,
      "TerrainTransition: river bowls, setting geometry once (no animation)",
    );
    setGlobeGeometryFromTerrain(
      globe,
      nextTerrain,
      peakTilesNext ?? undefined,
      elevationScale,
      peakElevationScale,
      minLandElevation,
      riverEdgesByTile,
      riverEdgeToWaterByTile,
    );
    return;
  }

  if (peakSetChanged && peakTilesNext != null) {
    console.log(
      BUILD_LOG,
      "TerrainTransition: peak set changed, replacing geometry (no animation)",
    );
    const elevatedSeaTiles = new Map<number, number>();
    const nextOpts: Parameters<typeof createGeodesicGeometryFlat>[1] = {
      ...opts,
      getElevation: (id: number) => {
        const d = nextTerrain.get(id);
        const raw = d?.elevation ?? MAX_SEA_BED_ELEVATION;
        if (d && (d.type === "water" || d.type === "beach")) {
          if (raw > MAX_SEA_BED_ELEVATION) elevatedSeaTiles.set(id, raw);
          return Math.min(raw, MAX_SEA_BED_ELEVATION);
        }
        return raw;
      },
      getPeak: (id: number) => {
        const m = peakTilesNext.get(id);
        return m != null ? { apexElevationM: m } : undefined;
      },
    };
    const geom = createGeodesicGeometryFlat(globe.tiles, nextOpts);
    if (elevatedSeaTiles.size > 0) {
      const list = [...elevatedSeaTiles.entries()]
        .map(([tid, elev]) => `tile ${tid} elev ${elev.toFixed(4)}`)
        .join(", ");
      console.warn(
        BUILD_LOG,
        "Sea bottom hex(es) drawn above submerged level (",
        MAX_SEA_BED_ELEVATION,
        "):",
        list,
      );
    }
    applyTerrainColorsToGeometry(geom, nextTerrain);
    globe.mesh.geometry.dispose();
    globe.mesh.geometry = geom;
    applyGlobeTerrainShadowFlags(globe);
    return;
  }

  console.log(
    BUILD_LOG,
    "TerrainTransition: animating",
    TERRAIN_ANIMATION_FRAMES + 1,
    "frames",
  );
  const colorPrev = new THREE.Color();
  const colorNext = new THREE.Color();

  for (let frame = 0; frame <= TERRAIN_ANIMATION_FRAMES; frame++) {
    if (frame % 7 === 0 || frame === TERRAIN_ANIMATION_FRAMES) {
      console.log(
        BUILD_LOG,
        "TerrainTransition: frame",
        frame,
        "/",
        TERRAIN_ANIMATION_FRAMES,
      );
    }
    const t = TERRAIN_ANIMATION_EASING(frame / TERRAIN_ANIMATION_FRAMES);
    const getElevation = (id: number) => {
      const a = prevTerrain.get(id)?.elevation ?? MAX_SEA_BED_ELEVATION;
      const b = nextTerrain.get(id)?.elevation ?? MAX_SEA_BED_ELEVATION;
      return a + (b - a) * t;
    };
    const getPeakLerp =
      peakTilesNext && peakTilesNext.size > 0
        ? (id: number) => {
            const prevM = peakTilesPrev?.get(id) ?? 0;
            const nextM = peakTilesNext.get(id) ?? 0;
            const m = prevM + (nextM - prevM) * t;
            return m > 0 ? { apexElevationM: m } : undefined;
          }
        : undefined;
    const optsLerp = {
      ...opts,
      getElevation,
      getPeak: getPeakLerp,
    };
    updateFlatGeometryFromTerrain(globe.mesh.geometry, globe.tiles, optsLerp);
    applyVertexColorsByTileId(globe.mesh.geometry, (tid) => {
      if (Number(tid) < 0) return TERRAIN_STYLES.snow.color;
      const a = prevTerrain.get(tid);
      const b = nextTerrain.get(tid);
      const styleA = a
        ? TERRAIN_STYLES[a.type].color
        : TERRAIN_STYLES.water.color;
      const styleB = b
        ? TERRAIN_STYLES[b.type].color
        : TERRAIN_STYLES.water.color;
      colorPrev.set(styleA);
      colorNext.set(styleB);
      colorPrev.lerp(colorNext, t);
      return colorPrev;
    });
    await yieldToMain();
  }
}

type GeoJSONPolygon = { type: "Polygon"; coordinates: number[][][] };
type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};
type GeoJSONGeometry =
  | GeoJSONPolygon
  | GeoJSONMultiPolygon
  | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] };

/** Signed area of a ring in (lon, 90-lat) space; positive = counter-clockwise (exterior per GeoJSON). TopoJSON often uses CW for outer rings, which inverts fill. */
function ringSignedArea(ring: number[][]): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x0, ,] = ring[i];
    const [x1, ,] = ring[(i + 1) % n];
    const y0 = 90 - ring[i][1];
    const y1 = 90 - ring[(i + 1) % n][1];
    sum += (x1 - x0) * (y1 + y0);
  }
  return sum * 0.5;
}

function ringBounds(ring: number[][]): { latSpan: number; lonSpan: number } {
  let minLat = Infinity,
    maxLat = -Infinity,
    minLon = Infinity,
    maxLon = -Infinity;
  for (const [lon, lat] of ring) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }
  return { latSpan: maxLat - minLat, lonSpan: maxLon - minLon };
}

/** Skip dataset-boundary artifact: ring at constant latitude spanning ~360° (no real landmass). */
function isArtifactGlobeLine(ring: number[][]): boolean {
  if (ring.length < 3) return false;
  const { latSpan, lonSpan } = ringBounds(ring);
  return latSpan < 2 && lonSpan >= 350;
}

/** Rewind for canvas nonzero: exterior (first ring) = CCW so inside = land; holes (later rings) = CW so inside = empty. Fixes inverted holes (e.g. rings through Greenland, Brazil). */
function rewindRing(ring: number[][], isExterior: boolean): number[][] {
  const area = ringSignedArea(ring);
  const wantCcw = isExterior;
  const isCcw = area > 0;
  return isCcw !== wantCcw ? [...ring].reverse() : ring;
}

/**
/**
 * Choose longitude for the next point so the segment from currentLon to next is the short path
 * (no wrap-around). Returns nextLon in the range that minimizes |nextLon - currentLon|.
 */
function unwrapLon(currentLon: number, nextLon: number): number {
  let n = nextLon;
  const d = n - currentLon;
  if (d > 180) n -= 360;
  else if (d < -180) n += 360;
  return n;
}

/**
 * Draw a ring in "unwrapped" longitude space so each edge goes the short way. Used with a
 * canvas 3× wide (e.g. lon in [-540, 540] → x in [0, 1080]); shapes that cross the
 * antimeridian then draw into the extra hemisphere instead of looping the long way.
 */
function drawRingUnwrapped(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  isExterior: boolean,
  toX: (lon: number) => number,
  toY: (lat: number) => number,
): void {
  if (ring.length < 3) return;
  if (isExterior && isArtifactGlobeLine(ring)) return;
  const r = rewindRing(ring, isExterior);
  const [first, ...rest] = r;
  let currentLon = first[0];
  ctx.moveTo(toX(currentLon), toY(first[1]));
  for (const [lon, lat] of rest) {
    currentLon = unwrapLon(currentLon, lon);
    ctx.lineTo(toX(currentLon), toY(lat));
  }
  currentLon = unwrapLon(currentLon, first[0]);
  ctx.lineTo(toX(currentLon), toY(first[1]));
  ctx.closePath();
}

/** Legacy: draw segment with antimeridian split (used if not using wide canvas). */
function lineToLonLat(
  ctx: CanvasRenderingContext2D,
  fromLon: number,
  fromLat: number,
  toLon: number,
  toLat: number,
  toX: (lon: number) => number,
  toY: (lat: number) => number,
): void {
  const rawD = toLon - fromLon;
  if (rawD > 180) {
    const totalShort = 360 - rawD;
    const distToCross = fromLon - -180;
    const t = distToCross / totalShort;
    const latCross = fromLat + t * (toLat - fromLat);
    ctx.lineTo(toX(-180), toY(latCross));
    ctx.lineTo(toX(180), toY(latCross));
  } else if (rawD < -180) {
    const totalShort = 360 + rawD;
    const distToCross = 180 - fromLon;
    const t = distToCross / totalShort;
    const latCross = fromLat + t * (toLat - fromLat);
    ctx.lineTo(toX(180), toY(latCross));
    ctx.lineTo(toX(-180), toY(latCross));
  }
  ctx.lineTo(toX(toLon), toY(toLat));
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  isExterior: boolean,
  toX: (lon: number) => number,
  toY: (lat: number) => number,
): void {
  if (ring.length < 3) return;
  if (isExterior && isArtifactGlobeLine(ring)) return;
  const r = rewindRing(ring, isExterior);
  const [first, ...rest] = r;
  ctx.moveTo(toX(first[0]), toY(first[1]));
  let prevLon = first[0],
    prevLat = first[1];
  for (const [lon, lat] of rest) {
    lineToLonLat(ctx, prevLon, prevLat, lon, lat, toX, toY);
    prevLon = lon;
    prevLat = lat;
  }
  lineToLonLat(ctx, prevLon, prevLat, first[0], first[1], toX, toY);
  ctx.closePath();
}

function drawGeometry(
  ctx: CanvasRenderingContext2D,
  geom: GeoJSONGeometry,
  toX: (lon: number) => number,
  toY: (lat: number) => number,
): void {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometry(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    geom.coordinates.forEach((ring, i) =>
      drawRing(ctx, ring, i === 0, toX, toY),
    );
    ctx.fill("nonzero");
    return;
  }
  if (geom.type === "MultiPolygon") {
    ctx.beginPath();
    for (const polygon of geom.coordinates) {
      polygon.forEach((ring, i) => drawRing(ctx, ring, i === 0, toX, toY));
    }
    ctx.fill("nonzero");
  }
}

/** Same as drawGeometry but uses unwrapped rings (short path per edge) for a 3×-wide canvas. */
function drawGeometryUnwrapped(
  ctx: CanvasRenderingContext2D,
  geom: GeoJSONGeometry,
  toX: (lon: number) => number,
  toY: (lat: number) => number,
): void {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometryUnwrapped(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    geom.coordinates.forEach((ring, i) =>
      drawRingUnwrapped(ctx, ring, i === 0, toX, toY),
    );
    ctx.fill("nonzero");
    return;
  }
  if (geom.type === "MultiPolygon") {
    ctx.beginPath();
    for (const polygon of geom.coordinates) {
      polygon.forEach((ring, i) =>
        drawRingUnwrapped(ctx, ring, i === 0, toX, toY),
      );
    }
    ctx.fill("nonzero");
  }
}

/**
 * Point-in-polygon via ray casting. Edges that cross the antimeridian (|Δlon| > 180°) are
 * treated as the short path (two segments at ±180°) so land/water is correct for any lon.
 */
/** Test if horizontal ray from (px, py) eastward intersects segment (xa,ya)-(xb,yb); count once if so. */
function segmentCrossesRay(
  xa: number,
  ya: number,
  xb: number,
  yb: number,
  px: number,
  py: number,
): boolean {
  if (ya === yb) return false;
  if ((ya <= py && py < yb) || (yb <= py && py < ya)) {
    const t = (py - ya) / (yb - ya);
    if (t >= 0 && t <= 1) {
      const xHit = xa + t * (xb - xa);
      return xHit >= px;
    }
  }
  return false;
}

function rayCrossingCount(ring: number[][], px: number, py: number): number {
  const n = ring.length;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const rawD = x1 - x0;
    if (Math.abs(rawD) > 180) {
      const crossLon = rawD > 0 ? -180 : 180;
      const totalShort = 360 - Math.abs(rawD);
      const distToCross = rawD > 0 ? x0 - crossLon : crossLon - x0;
      const tCross = distToCross / totalShort;
      const yCross = y0 + tCross * (y1 - y0);
      const otherLon = crossLon === 180 ? -180 : 180;
      if (segmentCrossesRay(x0, y0, crossLon, yCross, px, py)) count++;
      if (segmentCrossesRay(otherLon, yCross, x1, y1, px, py)) count++;
    } else {
      if (segmentCrossesRay(x0, y0, x1, y1, px, py)) count++;
    }
  }
  return count;
}

function pointInRing(
  ring: number[][],
  lonDeg: number,
  latDeg: number,
): boolean {
  return rayCrossingCount(ring, lonDeg, latDeg) % 2 === 1;
}

function pointInPolygon(
  polygon: number[][][],
  lonDeg: number,
  latDeg: number,
): boolean {
  if (polygon.length === 0) return false;
  const exterior = polygon[0];
  if (!pointInRing(exterior, lonDeg, latDeg)) return false;
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(polygon[i], lonDeg, latDeg)) return false;
  }
  return true;
}

/** Collect polygons from land GeoJSON (MultiPolygon) with rewind. Skip dataset-boundary artifact (full-globe horizontal line). */
function collectLandPolygons(geom: GeoJSONGeometry): number[][][][] {
  const out: number[][][][] = [];
  const push = (g: GeoJSONGeometry) => {
    if (g.type === "Polygon") {
      const rings = g.coordinates.map((ring, i) => rewindRing(ring, i === 0));
      if (rings.length > 0 && !isArtifactGlobeLine(rings[0])) out.push(rings);
    } else if (g.type === "MultiPolygon") {
      for (const polygon of g.coordinates) {
        const rings = polygon.map((ring, i) => rewindRing(ring, i === 0));
        if (rings.length > 0 && !isArtifactGlobeLine(rings[0])) out.push(rings);
      }
    } else if (g.type === "GeometryCollection") {
      for (const child of g.geometries) push(child);
    }
  };
  push(geom);
  return out;
}

/** Same for lakes (no artifact skip; used as holes). */
function collectLakePolygons(geom: GeoJSONGeometry): number[][][][] {
  const out: number[][][][] = [];
  const push = (g: GeoJSONGeometry) => {
    if (g.type === "Polygon") {
      out.push(g.coordinates.map((ring, i) => rewindRing(ring, i === 0)));
    } else if (g.type === "MultiPolygon") {
      for (const polygon of g.coordinates) {
        out.push(polygon.map((ring, i) => rewindRing(ring, i === 0)));
      }
    } else if (g.type === "GeometryCollection") {
      for (const child of g.geometries) push(child);
    }
  };
  push(geom);
  return out;
}

/** Fetch Natural Earth marine polys and return polygons for sea/bay features only (Caspian, Black Sea, etc.). */
async function loadMarineSeaBayPolygons(): Promise<number[][][][]> {
  const out: number[][][][] = [];
  try {
    const res = await fetch(EARTH_MARINE_POLYS_URL);
    if (!res.ok) return out;
    const fc = (await res.json()) as {
      type: string;
      features?: Array<{
        geometry: GeoJSONGeometry;
        properties?: { featurecla?: string };
      }>;
    };
    if (fc.features) {
      for (const f of fc.features) {
        const cla = f.properties?.featurecla;
        if ((cla === "sea" || cla === "bay") && f.geometry) {
          out.push(...collectLakePolygons(f.geometry));
        }
      }
    }
  } catch {
    /* optional */
  }
  return out;
}

const SOUTH_POLE_CAP_LAT = -80;

function createLandSampler(
  landPolygons: number[][][][],
  lakePolygons: number[][][][],
): (latRad: number, lonRad: number) => boolean {
  return (latRad: number, lonRad: number) => {
    const latDeg = (latRad * 180) / Math.PI;
    if (latDeg <= SOUTH_POLE_CAP_LAT) return true;
    const lonDeg = (lonRad * 180) / Math.PI;
    for (const poly of lakePolygons) {
      if (pointInPolygon(poly, lonDeg, latDeg)) return false;
    }
    for (const poly of landPolygons) {
      if (pointInPolygon(poly, lonDeg, latDeg)) return true;
    }
    return false;
  };
}

const TOPO_GRID_W = 360;
const TOPO_GRID_H = 180;

/** Build water region ids: grid of land/water, then connected components of water (8-connect). */
function buildWaterRegions(
  landPolygons: number[][][][],
  lakePolygons: number[][][][],
): Uint32Array {
  const n = TOPO_GRID_W * TOPO_GRID_H;
  const isLand = new Uint8Array(n);
  for (let j = 0; j < TOPO_GRID_H; j++) {
    const lat = TOPO_GRID_H - 1 > 0 ? 90 - (180 * j) / (TOPO_GRID_H - 1) : 0;
    const inSouthCap = lat <= SOUTH_POLE_CAP_LAT;
    for (let i = 0; i < TOPO_GRID_W; i++) {
      const lon =
        TOPO_GRID_W - 1 > 0 ? -180 + (360 * i) / (TOPO_GRID_W - 1) : 0;
      if (inSouthCap) {
        isLand[j * TOPO_GRID_W + i] = 1;
        continue;
      }
      let inLake = false;
      for (const poly of lakePolygons) {
        if (pointInPolygon(poly, lon, lat)) {
          inLake = true;
          break;
        }
      }
      if (inLake) {
        isLand[j * TOPO_GRID_W + i] = 0;
        continue;
      }
      let onLand = false;
      for (const poly of landPolygons) {
        if (pointInPolygon(poly, lon, lat)) {
          onLand = true;
          break;
        }
      }
      isLand[j * TOPO_GRID_W + i] = onLand ? 1 : 0;
    }
  }
  const waterRegionId = new Uint32Array(n);
  let nextId = 1;
  const stack: number[] = [];
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (let idx = 0; idx < n; idx++) {
    if (isLand[idx] !== 0 || waterRegionId[idx] !== 0) continue;
    const id = nextId++;
    stack.length = 0;
    stack.push(idx);
    waterRegionId[idx] = id;
    while (stack.length > 0) {
      const c = stack.pop()!;
      const ci = c % TOPO_GRID_W;
      const cj = Math.floor(c / TOPO_GRID_W);
      for (let d = 0; d < 8; d++) {
        const ni = ci + dx[d];
        const nj = cj + dy[d];
        if (ni < 0 || ni >= TOPO_GRID_W || nj < 0 || nj >= TOPO_GRID_H)
          continue;
        const nidx = nj * TOPO_GRID_W + ni;
        if (isLand[nidx] !== 0 || waterRegionId[nidx] !== 0) continue;
        waterRegionId[nidx] = id;
        stack.push(nidx);
      }
    }
  }
  return waterRegionId;
}

/** Create topologySampler: (lat, lon) => land, landPolygonIndex, waterRegionId for hex topology. */
function createTopologySampler(
  landPolygons: number[][][][],
  lakePolygons: number[][][][],
  waterRegionId: Uint32Array,
): (
  latRad: number,
  lonRad: number,
) => { land: boolean; landPolygonIndex?: number; waterRegionId?: number } {
  return (latRad: number, lonRad: number) => {
    const latDeg = (latRad * 180) / Math.PI;
    const lonDeg = (lonRad * 180) / Math.PI;
    if (latDeg <= SOUTH_POLE_CAP_LAT) {
      return { land: true, landPolygonIndex: 0 };
    }
    for (const poly of lakePolygons) {
      if (pointInPolygon(poly, lonDeg, latDeg)) {
        const i = Math.max(
          0,
          Math.min(
            TOPO_GRID_W - 1,
            Math.round(((lonDeg + 180) / 360) * (TOPO_GRID_W - 1)),
          ),
        );
        const j = Math.max(
          0,
          Math.min(
            TOPO_GRID_H - 1,
            Math.round(((90 - latDeg) / 180) * (TOPO_GRID_H - 1)),
          ),
        );
        const wid = waterRegionId[j * TOPO_GRID_W + i];
        return { land: false, waterRegionId: wid || undefined };
      }
    }
    for (let pi = 0; pi < landPolygons.length; pi++) {
      if (pointInPolygon(landPolygons[pi], lonDeg, latDeg)) {
        return { land: true, landPolygonIndex: pi };
      }
    }
    const i = Math.max(
      0,
      Math.min(
        TOPO_GRID_W - 1,
        Math.round(((lonDeg + 180) / 360) * (TOPO_GRID_W - 1)),
      ),
    );
    const j = Math.max(
      0,
      Math.min(
        TOPO_GRID_H - 1,
        Math.round(((90 - latDeg) / 180) * (TOPO_GRID_H - 1)),
      ),
    );
    const wid = waterRegionId[j * TOPO_GRID_W + i];
    return { land: false, waterRegionId: wid || undefined };
  };
}

export type TopologySampler = (
  latRad: number,
  lonRad: number,
) => { land: boolean; landPolygonIndex?: number; waterRegionId?: number };

const REGION_GRID_W = 360;
const REGION_GRID_H = 180;

/** 8-connected components with x-wraparound (antimeridian). Filled cells (data[idx] !== 0) get id 1..N; rest 0. */
function connectedComponentsWrap(
  data: Uint8Array,
  width: number,
  height: number,
): Uint32Array {
  const n = width * height;
  const out = new Uint32Array(n);
  let nextId = 1;
  const stack: number[] = [];
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (let idx = 0; idx < n; idx++) {
    if (data[idx] === 0 || out[idx] !== 0) continue;
    const id = nextId++;
    stack.length = 0;
    stack.push(idx);
    out[idx] = id;
    while (stack.length > 0) {
      const c = stack.pop()!;
      const ci = c % width;
      const cj = Math.floor(c / width);
      for (let d = 0; d < 8; d++) {
        let ni = ci + dx[d];
        const nj = cj + dy[d];
        ni = ((ni % width) + width) % width;
        if (nj < 0 || nj >= height) continue;
        const nidx = nj * width + ni;
        if (data[nidx] === 0 || out[nidx] !== 0) continue;
        out[nidx] = id;
        stack.push(nidx);
      }
    }
  }
  return out;
}

/** Per-cell lake id from PIP (1..K); 0 = not lake. Only runs PIP for water pixels when landRaster is provided. */
function buildLakeIdGrid(
  lakePolygons: number[][][][],
  width: number,
  height: number,
  landRaster?: Uint8Array,
): Uint32Array {
  const out = new Uint32Array(width * height);
  for (let j = 0; j < height; j++) {
    const lat = height - 1 > 0 ? 90 - (180 * j) / (height - 1) : 0;
    if (lat <= SOUTH_POLE_CAP_LAT) continue;
    for (let i = 0; i < width; i++) {
      const idx = j * width + i;
      if (landRaster != null && landRaster[idx] !== 0) continue;
      const lon = width - 1 > 0 ? -180 + (360 * i) / (width - 1) : 0;
      for (let k = 0; k < lakePolygons.length; k++) {
        if (pointInPolygon(lakePolygons[k], lon, lat)) {
          out[idx] = k + 1;
          break;
        }
      }
    }
  }
  return out;
}

/** Build getRegionScores from precomputed landmass/ocean/lake grids. Scores each hex by sampling grid at tile center + vertices. */
function createRegionScorer(
  landmassId: Uint32Array,
  oceanRegionId: Uint32Array,
  lakeId: Uint32Array,
  width: number,
  height: number,
): (tile: GeodesicTile) => RegionScores {
  return (tile: GeodesicTile) => {
    const points: { lat: number; lon: number }[] = [
      tileCenterToLatLon(tile.center),
    ];
    for (const v of tile.vertices) {
      points.push(tileCenterToLatLon(v));
    }
    const landmassCounts = new Map<number, number>();
    const oceanCounts = new Map<number, number>();
    const lakeCounts = new Map<number, number>();
    let landTotal = 0;
    for (const { lat, lon } of points) {
      const latDeg = (lat * 180) / Math.PI;
      const lonDeg = (lon * 180) / Math.PI;
      const i = Math.max(
        0,
        Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))),
      );
      const j = Math.max(
        0,
        Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))),
      );
      const idx = j * width + i;
      const lm = landmassId[idx];
      const oc = oceanRegionId[idx];
      const lk = lakeId[idx];
      if (lm !== 0) {
        landTotal++;
        landmassCounts.set(lm, (landmassCounts.get(lm) ?? 0) + 1);
      }
      if (oc !== 0) oceanCounts.set(oc, (oceanCounts.get(oc) ?? 0) + 1);
      if (lk !== 0) lakeCounts.set(lk, (lakeCounts.get(lk) ?? 0) + 1);
    }
    const n = points.length;
    const landmassFractions = new Map<number, number>();
    for (const [id, count] of landmassCounts)
      landmassFractions.set(id, count / n);
    const oceanFractions = new Map<number, number>();
    for (const [id, count] of oceanCounts) oceanFractions.set(id, count / n);
    const lakeFractions = new Map<number, number>();
    for (const [id, count] of lakeCounts) lakeFractions.set(id, count / n);
    return {
      landFraction: landTotal / n,
      landmassFractions,
      oceanFractions,
      lakeFractions,
    };
  };
}

/** Build getRasterWindow for isthmus vs strait: cutout around tile in raster, 255=land 0=water. */
function createGetRasterWindow(
  width: number,
  height: number,
  landData: Uint8Array,
): (tile: GeodesicTile) => RasterWindow | null {
  const PAD = 4;
  return (tile: GeodesicTile) => {
    const points = [tileCenterToLatLon(tile.center)];
    for (const v of tile.vertices) points.push(tileCenterToLatLon(v));
    let iMin = width;
    let iMax = -1;
    let jMin = height;
    let jMax = -1;
    for (const { lat, lon } of points) {
      const latDeg = (lat * 180) / Math.PI;
      const lonDeg = (lon * 180) / Math.PI;
      const i = Math.round(((lonDeg + 180) / 360) * (width - 1));
      const j = Math.round(((90 - latDeg) / 180) * (height - 1));
      iMin = Math.min(iMin, i);
      iMax = Math.max(iMax, i);
      jMin = Math.min(jMin, j);
      jMax = Math.max(jMax, j);
    }
    iMin = Math.max(0, iMin - PAD);
    iMax = Math.min(width - 1, iMax + PAD);
    jMin = Math.max(0, jMin - PAD);
    jMax = Math.min(height - 1, jMax + PAD);
    const w = iMax - iMin + 1;
    const h = jMax - jMin + 1;
    if (w < 2 || h < 2) return null;
    const data = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const si = iMin + i;
        const sj = jMin + j;
        data[j * w + i] = (landData[sj * width + si] ?? 0) >= 128 ? 255 : 0;
      }
    }
    return { width: w, height: h, data };
  };
}

/** Same as createRegionScorer but lakes come from on-demand point-in-polygon (for precomputed bin; no lake grid). */
function createRegionScorerFromBin(
  landmassId: Uint32Array,
  oceanRegionId: Uint32Array,
  width: number,
  height: number,
  lakePolygons: number[][][][],
): (tile: GeodesicTile) => RegionScores {
  return (tile: GeodesicTile) => {
    const points: { lat: number; lon: number }[] = [
      tileCenterToLatLon(tile.center),
    ];
    for (const v of tile.vertices) {
      points.push(tileCenterToLatLon(v));
    }
    const landmassCounts = new Map<number, number>();
    const oceanCounts = new Map<number, number>();
    const lakeCounts = new Map<number, number>();
    let landTotal = 0;
    for (const { lat, lon } of points) {
      const latDeg = (lat * 180) / Math.PI;
      const lonDeg = (lon * 180) / Math.PI;
      const i = Math.max(
        0,
        Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))),
      );
      const j = Math.max(
        0,
        Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))),
      );
      const idx = j * width + i;
      const lm = landmassId[idx];
      const oc = oceanRegionId[idx];
      if (lm !== 0) {
        landTotal++;
        landmassCounts.set(lm, (landmassCounts.get(lm) ?? 0) + 1);
      }
      if (oc !== 0) oceanCounts.set(oc, (oceanCounts.get(oc) ?? 0) + 1);
      for (let k = 0; k < lakePolygons.length; k++) {
        if (pointInPolygon(lakePolygons[k], lonDeg, latDeg)) {
          lakeCounts.set(k + 1, (lakeCounts.get(k + 1) ?? 0) + 1);
          break;
        }
      }
    }
    const n = points.length;
    const landmassFractions = new Map<number, number>();
    for (const [id, count] of landmassCounts)
      landmassFractions.set(id, count / n);
    const oceanFractions = new Map<number, number>();
    for (const [id, count] of oceanCounts) oceanFractions.set(id, count / n);
    const lakeFractions = new Map<number, number>();
    for (const [id, count] of lakeCounts) lakeFractions.set(id, count / n);
    return {
      landFraction: landTotal / n,
      landmassFractions,
      oceanFractions,
      lakeFractions,
    };
  };
}

/** Fetch world-atlas land TopoJSON, build raster, land sampler, topology sampler, and region scorer (per-landmass resolution). */
async function loadEarthLandRaster(): Promise<{
  raster: EarthRaster;
  landSampler: (latRad: number, lonRad: number) => boolean;
  topologySampler: TopologySampler;
  getRegionScores: (tile: GeodesicTile) => RegionScores;
  getRasterWindow?: (tile: GeodesicTile) => RasterWindow | null;
}> {
  const binRes = await fetch(EARTH_REGION_GRID_BIN);
  if (binRes.ok) {
    const buf = await binRes.arrayBuffer();
    const dv = new DataView(buf);
    const width = dv.getUint32(0, true);
    const height = dv.getUint32(4, true);
    const n = width * height;
    const landmassId = new Uint32Array(buf, 8, n);
    const oceanRegionId = new Uint32Array(buf, 8 + n * 4, n);
    let lakePolygons: number[][][][] = [];
    try {
      const lakesRes = await fetch(EARTH_LAKES_GEOJSON_URL);
      if (lakesRes.ok) {
        const lakes = (await lakesRes.json()) as {
          features?: Array<{ geometry: GeoJSONGeometry }>;
        };
        if (lakes.features) {
          for (const f of lakes.features) {
            if (f.geometry)
              lakePolygons = lakePolygons.concat(
                collectLakePolygons(f.geometry),
              );
          }
        }
      }
    } catch {
      /* optional */
    }
    const marinePolygons = await loadMarineSeaBayPolygons();
    lakePolygons = lakePolygons.concat(marinePolygons);
    const getRegionScores = createRegionScorerFromBin(
      landmassId,
      oceanRegionId,
      width,
      height,
      lakePolygons,
    );
    const landSampler = (latRad: number, lonRad: number) => {
      const latDeg = (latRad * 180) / Math.PI;
      const lonDeg = (lonRad * 180) / Math.PI;
      const i = Math.max(
        0,
        Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))),
      );
      const j = Math.max(
        0,
        Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))),
      );
      return landmassId[j * width + i] !== 0;
    };
    const topologySampler: TopologySampler = (
      latRad: number,
      lonRad: number,
    ) => {
      const land = landSampler(latRad, lonRad);
      const latDeg = (latRad * 180) / Math.PI;
      const lonDeg = (lonRad * 180) / Math.PI;
      const i = Math.max(
        0,
        Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))),
      );
      const j = Math.max(
        0,
        Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))),
      );
      const oceanId = oceanRegionId[j * width + i];
      return {
        land,
        landPolygonIndex: land ? 0 : undefined,
        waterRegionId: land ? undefined : oceanId || 1,
      };
    };
    const rasterData = new Uint8Array(n);
    for (let idx = 0; idx < n; idx++)
      rasterData[idx] = landmassId[idx] !== 0 ? 255 : 0;
    const raster: EarthRaster = { width, height, data: rasterData };
    const getRasterWindow = createGetRasterWindow(width, height, rasterData);
    console.log(
      "[Earth raster] Loaded precomputed region grid",
      width,
      "×",
      height,
      "(sample only where needed)",
    );
    return {
      raster,
      landSampler,
      topologySampler,
      getRegionScores,
      getRasterWindow,
    };
  }

  const res = await fetch(EARTH_LAND_TOPOLOGY_URL);
  const topology = (await res.json()) as Parameters<
    typeof topojson.feature
  >[0] & {
    objects?: Record<string, unknown>;
    bbox?: number[];
  };
  const objNames = topology.objects ? Object.keys(topology.objects) : [];
  console.log(
    "[Earth raster] Topology objects:",
    objNames,
    "bbox:",
    topology.bbox ?? "(none)",
  );
  const land = topojson.feature(topology, topology.objects.land) as {
    type: string;
    geometry?: GeoJSONGeometry;
    features?: Array<{ geometry: GeoJSONGeometry }>;
  };

  const landGeom = land.features
    ? ({
        type: "GeometryCollection" as const,
        geometries: land.features.map((f) => f.geometry),
      } as GeoJSONGeometry)
    : land.geometry!;
  const landPolygons = collectLandPolygons(landGeom);

  let lakePolygons: number[][][][] = [];
  try {
    const lakesRes = await fetch(EARTH_LAKES_GEOJSON_URL);
    if (lakesRes.ok) {
      const lakes = (await lakesRes.json()) as {
        type: string;
        features?: Array<{ geometry: GeoJSONGeometry }>;
      };
      if (lakes.features) {
        for (const f of lakes.features) {
          if (f.geometry)
            lakePolygons = lakePolygons.concat(collectLakePolygons(f.geometry));
        }
      }
    }
  } catch {
    // Lakes optional
  }
  const marinePolygons = await loadMarineSeaBayPolygons();
  lakePolygons = lakePolygons.concat(marinePolygons);

  const landSampler = createLandSampler(landPolygons, lakePolygons);
  let topologySampler: TopologySampler;
  try {
    const waterRegionId = buildWaterRegions(landPolygons, lakePolygons);
    topologySampler = createTopologySampler(
      landPolygons,
      lakePolygons,
      waterRegionId,
    );
  } catch (e) {
    console.warn(
      "[loadEarthLandRaster] topologySampler build failed, using landSampler only:",
      e,
    );
    topologySampler = (latRad: number, lonRad: number) => {
      const land = landSampler(latRad, lonRad);
      return {
        land,
        landPolygonIndex: land ? 0 : undefined,
        waterRegionId: land ? undefined : 1,
      };
    };
  }

  // Fallback in-browser raster (bin missing): lower res than precomputed bin.
  const width = 3600;
  const height = 1800;
  const wideWidth = 10800;
  const canvas = document.createElement("canvas");
  canvas.width = wideWidth;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, wideWidth, height);
  ctx.fillStyle = "white";
  const toX = (lon: number) =>
    Math.max(
      0,
      Math.min(wideWidth - 1, ((lon + 540) * (wideWidth - 1)) / 1080),
    );
  const toY = (lat: number) =>
    Math.max(0, Math.min(height - 1, ((90 - lat) / 180) * (height - 1)));
  if (land.features) {
    for (const f of land.features)
      drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
  } else if (land.geometry) {
    drawGeometryUnwrapped(ctx, land.geometry, toX, toY);
  }
  try {
    const lakesRes = await fetch(EARTH_LAKES_GEOJSON_URL);
    if (lakesRes.ok) {
      const lakes = (await lakesRes.json()) as {
        type: string;
        features?: Array<{ geometry: GeoJSONGeometry }>;
      };
      ctx.fillStyle = "black";
      if (lakes.features) {
        for (const f of lakes.features) {
          if (f.geometry) drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
        }
      }
    }
  } catch {
    // optional
  }
  ctx.fillStyle = "black";
  for (const poly of await loadMarineSeaBayPolygons()) {
    drawGeometryUnwrapped(
      ctx,
      { type: "Polygon", coordinates: poly } as GeoJSONGeometry,
      toX,
      toY,
    );
  }
  const wideData = ctx.getImageData(0, 0, wideWidth, height);
  const collapsed = new ImageData(width, height);
  const scale = (wideWidth - 1) / 1080;
  for (let j = 0; j < height; j++) {
    const lat = height - 1 > 0 ? 90 - (180 * j) / (height - 1) : 0;
    const inSouthCap = lat <= SOUTH_POLE_CAP_LAT;
    for (let i = 0; i < width; i++) {
      const lon = width - 1 > 0 ? -180 + (360 * i) / (width - 1) : 0;
      const xLeft = Math.max(
        0,
        Math.min(wideWidth - 1, Math.round((lon + 180) * scale)),
      );
      const xCenter = Math.max(
        0,
        Math.min(wideWidth - 1, Math.round((lon + 540) * scale)),
      );
      const xRight = Math.max(
        0,
        Math.min(wideWidth - 1, Math.round((lon + 900) * scale)),
      );
      const landLeft = (wideData.data[(j * wideWidth + xLeft) * 4] ?? 0) >= 128;
      const landCenter =
        (wideData.data[(j * wideWidth + xCenter) * 4] ?? 0) >= 128;
      const landRight =
        (wideData.data[(j * wideWidth + xRight) * 4] ?? 0) >= 128;
      const land = inSouthCap || landLeft || landCenter || landRight;
      const outIdx = (j * width + i) * 4;
      const v = land ? 255 : 0;
      collapsed.data[outIdx] = v;
      collapsed.data[outIdx + 1] = v;
      collapsed.data[outIdx + 2] = v;
      collapsed.data[outIdx + 3] = 255;
    }
  }
  const imageData = collapsed;
  const raster = earthRasterFromImageData(imageData, 128);

  const landmassId = connectedComponentsWrap(raster.data, width, height);
  const lakeIdGrid = buildLakeIdGrid(lakePolygons, width, height, raster.data);
  const oceanMask = new Uint8Array(width * height);
  for (let idx = 0; idx < width * height; idx++) {
    oceanMask[idx] = raster.data[idx] === 0 && lakeIdGrid[idx] === 0 ? 255 : 0;
  }
  const oceanRegionId = connectedComponentsWrap(oceanMask, width, height);
  const getRegionScores = createRegionScorer(
    landmassId,
    oceanRegionId,
    lakeIdGrid,
    width,
    height,
  );

  if (
    typeof window !== "undefined" &&
    /[?&]showRaster=1/i.test(window.location.search)
  ) {
    const debugCanvas = document.createElement("canvas");
    debugCanvas.width = width;
    debugCanvas.height = height;
    debugCanvas.title =
      "Land raster (white=land, black=water). Close or remove ?showRaster=1.";
    debugCanvas.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);max-width:90vw;max-height:90vh;border:2px solid #6b9b5c;z-index:9999;cursor:pointer;";
    const dctx = debugCanvas.getContext("2d")!;
    const id = dctx.createImageData(width, height);
    for (let i = 0; i < raster.data.length; i++) {
      const v = raster.data[i] > 0 ? 255 : 0;
      id.data[i * 4] = v;
      id.data[i * 4 + 1] = v;
      id.data[i * 4 + 2] = v;
      id.data[i * 4 + 3] = 255;
    }
    dctx.putImageData(id, 0, 0);
    debugCanvas.onclick = () => debugCanvas.remove();
    document.body.appendChild(debugCanvas);
    console.log(
      "[Earth raster] Debug view visible. Remove ?showRaster=1 to hide.",
    );
  }
  const getRasterWindow = createGetRasterWindow(
    raster.width,
    raster.height,
    raster.data,
  );
  return {
    raster,
    landSampler,
    topologySampler,
    getRegionScores,
    getRasterWindow,
  };
}

const KOPPEN_BIN_WIDTH = 360;
const KOPPEN_BIN_HEIGHT = 180;

/** Load pre-built 360×180 Köppen binary (run `npm run build-koppen` to generate). */
async function loadKoppenFromBinary(): Promise<ClimateGrid | null> {
  try {
    const res = await fetch(KOPPEN_BIN_SAME_ORIGIN);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength !== KOPPEN_BIN_WIDTH * KOPPEN_BIN_HEIGHT) return null;
    return {
      width: KOPPEN_BIN_WIDTH,
      height: KOPPEN_BIN_HEIGHT,
      data: new Uint8Array(buf),
    };
  } catch {
    return null;
  }
}

/** Load Köppen–Geiger climate: try bundled koppen.bin first, then zip. */
async function loadKoppenClimate(): Promise<ClimateGrid | null> {
  const fromBin = await loadKoppenFromBinary();
  if (fromBin) return fromBin;

  const tryFetch = async (url: string): Promise<ArrayBuffer | null> => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.arrayBuffer();
  };
  const buf: ArrayBuffer | null = await tryFetch(KOPPEN_ZIP_SAME_ORIGIN);
  if (!buf) return null;
  try {
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((n) => /\.(asc|txt)$/i.test(n));
    const name = names[0] ?? Object.keys(zip.files)[0];
    if (!name) return null;
    const blob = await zip.files[name].async("blob");
    const text = await new Response(blob).text();
    return parseKoppenAsciiGrid(text);
  } catch {
    return null;
  }
}

/** Load elevation.bin: legacy 360×180 or PGEL 1440×720 (see parseElevationBin). */
async function loadElevation() {
  try {
    const res = await fetch(ELEVATION_BIN_SAME_ORIGIN);
    if (!res.ok) return null;
    return parseElevationBin(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Global 2D monthly means (not latitude-only): each cell is lon/lat on an equirectangular grid. */
async function loadTemperatureMonthlyBin() {
  try {
    const res = await fetch(TAVG_MONTHLY_BIN_SAME_ORIGIN);
    if (!res.ok) return null;
    return parseTemperatureMonthlyBin(await res.arrayBuffer());
  } catch {
    return null;
  }
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030508);

const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.01,
  4000,
);
camera.layers.set(0);
let starfield: InstanceType<typeof Starfield> = new Starfield({
  density: 70,
  sparsity: 0.12,
  twinkleSpeed: 0.5,
  twinkleAmount: 0.5,
  color: 0xf0f4ff,
});
starfield.attachToCamera(camera);
/** When using catalog starfield, updates planet positions each frame. */
let planetsUpdate: ((date: Date) => void) | null = null;
const skyDome = createSkyDome({ radius: 4000 });
scene.add(skyDome.mesh);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/**
 * Above this tile count, skip terrain casting shadows (main fill-rate killer on subdiv 7).
 * Earth occluder + clouds still participate in the shadow map.
 */
const GLOBE_TERRAIN_CAST_SHADOW_TILE_THRESHOLD = 100_000;

function applyGlobeTerrainShadowFlags(globe: Globe): void {
  const cast =
    globe.tileCount <= GLOBE_TERRAIN_CAST_SHADOW_TILE_THRESHOLD;
  (globe.mesh as THREE.Mesh).receiveShadow = true;
  (globe.mesh as THREE.Mesh).castShadow = cast;
}

/**
 * Tiered when tile count is high (~40k subdiv 6, ~160k subdiv 7):
 * DPR cap, shadow map size, shadow filter (Basic is cheaper than PCFSoft).
 */
let lastGlobePerfBucket: "normal" | "dense" | "veryDense" | null = null;
/** Sun lensflare (extra draw cost); hidden on subdiv 7 for GPU headroom. */
let sunLensflareRef: Lensflare | null = null;

function applyGlobeRenderingPerf(tileCount: number): void {
  const bucket =
    tileCount > 100_000
      ? "veryDense"
      : tileCount > 70_000
        ? "dense"
        : "normal";
  if (lastGlobePerfBucket !== bucket) {
    lastGlobePerfBucket = bucket;
    const cap =
      bucket === "veryDense"
        ? 0.85
        : bucket === "dense"
          ? 1.35
          : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    renderer.shadowMap.type =
      bucket === "veryDense"
        ? THREE.BasicShadowMap
        : THREE.PCFSoftShadowMap;
  }
  const dir = sun?.directional;
  if (dir?.castShadow && dir.shadow) {
    const mapSz =
      bucket === "veryDense" ? 512 : bucket === "dense" ? 2048 : 4096;
    if (dir.shadow.mapSize.width !== mapSz) {
      dir.shadow.mapSize.set(mapSz, mapSz);
      dir.shadow.map?.dispose();
      dir.shadow.map = null;
      dir.shadow.needsUpdate = true;
    }
  }
  if (sunLensflareRef) {
    sunLensflareRef.visible = bucket !== "veryDense";
  }
}

/** Initialized after first `scheduleRebuild` / `buildWorldAsync` (must default so animate() can run before build finishes). */
let globe: Globe | undefined = undefined;
let water: WaterSphere | undefined = undefined;
let coastFoamOverlay: CoastFoamOverlay | undefined = undefined;
let coastMaskTexture: THREE.DataTexture | undefined = undefined;
let coastLandMaskTexture: THREE.DataTexture | undefined = undefined;
let controls: OrbitControls;
let marker: THREE.Mesh | null = null;
let earthRaster: EarthRaster | null = null;
let earthLandSampler: ((latRad: number, lonRad: number) => boolean) | null =
  null;
let earthTopologySampler: TopologySampler | null = null;
let earthGetRegionScores: ((tile: GeodesicTile) => RegionScores) | null = null;
let earthGetRasterWindow: ((tile: GeodesicTile) => RasterWindow | null) | null =
  null;
/** Loaded from /mountains.json; used for 3D peak geometry (pyramid tiles) in Earth mode. */
let mountainsList: MountainEntry[] | null = null;
/** River/lake centerline polylines [lon, lat] in degrees; from ne_10m_rivers_lake_centerlines.json. Used for river channel in Earth mode. */
let riverLinesLonLat: number[][][] | null = null;
/** Parallel to riverLinesLonLat: true if that line is a delta branch (e.g. Rosetta/Damietta) and should prefer sea over other river. */
let riverLineIsDelta: boolean[] | null = null;
/** River terrain (banks/bed) in Earth mode. Water provided by terrain-following water table. */
/** U-shaped river banks + bed (land mesh); separate from transparent water ribbon. */
let riverTerrainGroup: THREE.Group | null = null;

/** Re-run {@link applyLandSurfaceWeatherVertexColors} on globe + river banks when true. */
let landWeatherColorsDirty = true;
let lastLandWeatherVisualMinute = Number.NaN;
/** {@link climateSurfaceSnowVisualForTerrain} uses full date/subsolar — repaint land at least once per sim second, not only on UTC minute floor. */
let lastLandWeatherPaintEpochSec = Number.NaN;
/** Black sphere inside the globe to prevent seeing through geometry gaps. */
let innerBlackSphere: THREE.Mesh | null = null;
let windArrowsGroup: THREE.Group | null = null;
/** River flow arrows (green, lower). */
let riverFlowArrowsGroup: THREE.Group | null = null;
/** Ocean current arrows (blue, higher). */
let currentArrowsGroup: THREE.Group | null = null;
/** Precipitation overlay (per-tile rain intensity). */
let precipitationOverlayGroup: THREE.Group | null = null;
/** Cloud layer (low-poly clouds). */
let cloudGroup: THREE.Group | null = null;
/** Falling rain/snow streaks under active cloud precip. */
let precipFxGroup: THREE.Group | null = null;
/** Köppen/terrain moisture multipliers for cloud + precip potential (null before terrain build). */
let globalMoistureByTile: Map<number, number> | null = null;

function getCloudSimTargetUtcMinute(state: DemoState): number {
  if (
    state.gameClockUtcMinute != null &&
    Number.isFinite(state.gameClockUtcMinute)
  ) {
    return Math.floor(state.gameClockUtcMinute);
  }
  const date = datetimeLocalUTCToDate(
    state.dateTimeStr || dateToDatetimeLocalUTC(new Date())
  );
  return utcMinuteFromDate(date);
}

/** Fractional UTC minutes for cloud lifecycle lerping and sub-minute drift. */
function getCloudVisualUtcMinutes(state: DemoState, date: Date): number {
  if (
    state.gameClockUtcMinute != null &&
    Number.isFinite(state.gameClockUtcMinute)
  ) {
    return state.gameClockUtcMinute;
  }
  return date.getTime() / 60000;
}

/** Clip-based cloud field + precip overlay (see {@link CloudClipField}). */
let cloudClipField: CloudClipField | null = null;
/** Sun light (module-level so panel can force shadow update on cloud toggle). */
let sun: InstanceType<typeof Sun> | null = null;
/** Invisible sphere that casts shadow so Earth blocks light to night-side clouds (shadow map always sees globe bulk). */
let earthOccluder: THREE.Mesh | null = null;
/** Lake water now provided by terrain-following water table (no separate meshes). */
/** Module-level terrain data for debug panel access. */
let globalTileTerrain: Map<number, TileTerrainData> | null = null;
/** Module-level wind data for debug panel access (direction rad, strength 0–1). */
let globalWindByTile: Map<number, { directionRad: number; strength: number }> | null = null;
/** Module-level flow (river + current): direction of flow, strength; for overlay and debug. */
let globalFlowByTile: Map<number, { directionRad: number; strength: number }> | null = null;
/** Module-level river edges for debug panel access. */
let globalRiverEdgesByTile: Map<number, Set<number>> | null = null;
/** Module-level river flow (exit edge + direction) for debug panel; from elevation + mouth. */
let globalRiverFlowByTile: Map<number, { exitEdge: number; directionRad: number }> | null = null;
/** Last UTC minute index used for wind/flow/cloud sync (expensive; skip within the same minute). */
let lastWindUtcMinute: number | null = null;
/** UTC ms anchor for time playback (advanced while {@link DemoState.timePlaying}). */
let playbackEpochMs = 0;
/** Panel datetime input; updated while time is playing. */
let panelDateTimeInput: HTMLInputElement | null = null;
/** Biome vegetation (instanced plants, distance-culled). */
let vegetationLayer: {
  group: THREE.Group;
  update: (camera: THREE.Camera) => void;
  dispose: () => void;
} | null = null;

const BUILD_LOG = "[globe-build]";

/** Ocean water surface elevation (globe units). */
const OCEAN_WATER_LEVEL = -0.18;
/** Max sea-bed elevation so it stays fully submerged (slightly below water surface). */
const MAX_SEA_BED_ELEVATION = OCEAN_WATER_LEVEL - 0.01;

/** Delay (ms) after each resolution iteration so the browser can render and the user can watch. ~40ms ≈ 25 updates/sec. */
const RESOLVE_ITERATION_DELAY_MS = 40;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Wait for the next paint and optionally a short delay so rendering keeps up and iterations are watchable. */
function yieldForRender(
  delayMs: number = RESOLVE_ITERATION_DELAY_MS,
): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (delayMs <= 0) resolve();
        else setTimeout(resolve, delayMs);
      });
    });
  });
}

let buildInProgress = false;
let pendingState: DemoState | null = null;
let setLoading: (visible: boolean) => void = () => {};

function sunDirectionFromState(s: DemoState): THREE.Vector3 {
  const date = datetimeLocalUTCToDate(s.dateTimeStr || dateToDatetimeLocalUTC(new Date()));
  return sunDirectionFromDate(date);
}

function moonPositionFromState(s: DemoState, distance: number): THREE.Vector3 {
  const date = datetimeLocalUTCToDate(s.dateTimeStr || dateToDatetimeLocalUTC(new Date()));
  return moonPositionFromDate(date, distance);
}

function sunDirectionFromDate(date: Date): THREE.Vector3 {
  const p = dateToSubsolarPoint(date);
  return latLonDegToDirection(p.latDeg, p.lonDeg);
}

function moonPositionFromDate(date: Date, distance: number): THREE.Vector3 {
  const p = dateToSublunarPoint(date);
  return latLonDegToDirection(p.latDeg, p.lonDeg).multiplyScalar(distance);
}

/** Recompute wind from date and terrain, update arrow overlay. No-op if globe/wind group not ready. */
function updateWindFromState(state: DemoState, dateTimeStr?: string): void {
  if (!globe || !windArrowsGroup || !globalTileTerrain) return;
  const str = dateTimeStr ?? state.dateTimeStr ?? dateToDatetimeLocalUTC(new Date());
  const date = datetimeLocalUTCToDate(str);
  const subsolar = dateToSubsolarPoint(date);
  const windByTile = computeWindForTiles(globe.tiles, {
    subsolarLatDeg: subsolar.latDeg,
    baseStrength: 1,
    noiseDirectionRad: 0.12,
    noiseStrength: 0.08,
    seed: 45678,
    getTerrain: (id) => {
      const t = globalTileTerrain!.get(id);
      if (!t) return undefined;
      const isWater = t.type === "water" || t.type === "beach";
      return { isWater, elevation: t.elevation };
    },
  });
  globalWindByTile = windByTile;
  updateWindArrows(windArrowsGroup, globe, windByTile, {
    heightOffset: 0.08,
    arrowScale: 0.065,
    color: 0x88ccff,
    minStrength: 0.06,
  });
  windArrowsGroup.visible = state.showWinds;
}

const RIVER_FLOW_OPTIONS = {
  heightOffset: 0.05,
  arrowScale: 0.055,
  color: 0x66aa44,
  minStrength: 0.08,
};

const CURRENT_FLOW_OPTIONS = {
  heightOffset: 0.12,
  arrowScale: 0.08,
  color: 0x2288cc,
  minStrength: 0.03,
};

/** River flow: direction from elevation + mouth; strength scaled by seasonal precipitation. */
function buildRiverFlowByTile(
  subsolarLatDeg: number
): Map<number, { directionRad: number; strength: number }> {
  const flow = new Map<number, { directionRad: number; strength: number }>();
  if (!globe || !globalTileTerrain || !globalRiverFlowByTile) return flow;

  for (const tile of globe.tiles) {
    const id = tile.id;
    const r = globalRiverFlowByTile.get(id);
    if (!r) continue;
    const { lat } = tileCenterToLatLon(tile.center);
    const latDeg = (lat * 180) / Math.PI;
    const precip = getPrecipitation(latDeg, subsolarLatDeg);
    const strength = 0.35 + 0.55 * precip;
    flow.set(id, { directionRad: r.directionRad, strength });
  }
  return flow;
}

/** Ocean currents: wind-driven, Ekman deflection, water tiles only. */
function buildCurrentFlowByTile(): Map<number, { directionRad: number; strength: number }> {
  const flow = new Map<number, { directionRad: number; strength: number }>();
  if (!globe || !globalTileTerrain || !globalWindByTile) return flow;

  for (const tile of globe.tiles) {
    const id = tile.id;
    const terrain = globalTileTerrain.get(id);
    const isWater = terrain?.type === "water" || terrain?.type === "beach";
    if (!isWater) continue;

    const w = globalWindByTile.get(id);
    if (!w) continue;

    const { lat } = tileCenterToLatLon(tile.center);
    const blow = w.directionRad + Math.PI;
    const ekman = lat > 0 ? -Math.PI / 4 : Math.PI / 4;
    const strength = Math.min(0.6, w.strength * 0.2);
    flow.set(id, { directionRad: blow + ekman, strength });
  }
  return flow;
}

/** Merge river + current for hex debug. */
function mergeFlowByTile(
  river: Map<number, { directionRad: number; strength: number }>,
  current: Map<number, { directionRad: number; strength: number }>
): Map<number, { directionRad: number; strength: number }> {
  const out = new Map<number, { directionRad: number; strength: number }>();
  for (const [id, f] of river) out.set(id, f);
  for (const [id, f] of current) out.set(id, f);
  return out;
}

/** Recompute river + current flow, update both arrow groups, sync visibility. */
function updateFlowFromState(state: DemoState): void {
  if (!globe || !globalTileTerrain) return;
  const date = datetimeLocalUTCToDate(state.dateTimeStr || dateToDatetimeLocalUTC(new Date()));
  const subsolar = dateToSubsolarPoint(date);

  const riverFlow = buildRiverFlowByTile(subsolar.latDeg);
  const currentFlow = buildCurrentFlowByTile();
  globalFlowByTile = mergeFlowByTile(riverFlow, currentFlow);

  if (riverFlowArrowsGroup) {
    updateFlowArrows(riverFlowArrowsGroup, globe, riverFlow, RIVER_FLOW_OPTIONS);
    riverFlowArrowsGroup.visible = state.showFlow;
  }
  if (currentArrowsGroup) {
    updateFlowArrows(currentArrowsGroup, globe, currentFlow, CURRENT_FLOW_OPTIONS);
    currentArrowsGroup.visible = state.showFlow;
  }
}

function getLandWeatherVertexPaintContext(state: DemoState): {
  waterIds: Set<number>;
  wetness: ReadonlyMap<number, number>;
  snow: ReadonlyMap<number, number>;
  subsolarLatDeg: number;
  calendarUtc: Date;
} | null {
  if (!globe || !globalTileTerrain) return null;
  const waterIds = new Set<number>();
  for (const [id, t] of globalTileTerrain) {
    if (t.type === "water") waterIds.add(id);
  }
  const date = datetimeLocalUTCToDate(
    state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
  );
  const subsolarLatDeg = dateToSubsolarPoint(date).latDeg;
  const surf = cloudClipField?.getTileSurfaceState();
  return {
    waterIds,
    wetness: surf?.wetness ?? new Map<number, number>(),
    snow: surf?.snow ?? new Map<number, number>(),
    subsolarLatDeg,
    calendarUtc: date,
  };
}

function markLandWeatherColorsDirty(): void {
  landWeatherColorsDirty = true;
}

/** Main globe hex mesh (excludes full river-hex tops — those use {@link syncRiverTerrainLandWeatherVertexColors}). */
function syncGlobeLandWeatherVertexColors(state: DemoState): boolean {
  const ctx = getLandWeatherVertexPaintContext(state);
  if (!ctx || !globe) return false;
  const geom = globe.mesh.geometry;
  if (!(geom instanceof THREE.BufferGeometry)) return false;
  return applyLandSurfaceWeatherVertexColors(
    geom,
    globalTileTerrain,
    ctx.waterIds,
    ctx.wetness,
    ctx.snow,
    { globe, subsolarLatDeg: ctx.subsolarLatDeg, calendarUtc: ctx.calendarUtc },
  );
}

/**
 * River hex tops are omitted from the main geodesic mesh; banks carry the visible land surface.
 * Without this pass, trees (tile-matched) look snowy while ground stays static green.
 */
function syncRiverTerrainLandWeatherVertexColors(state: DemoState): boolean {
  const ctx = getLandWeatherVertexPaintContext(state);
  if (!ctx || !riverTerrainGroup || !globe) return true;
  let ok = true;
  riverTerrainGroup.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (obj.name !== "RiverBanks") return;
    const g = obj.geometry;
    if (!(g instanceof THREE.BufferGeometry)) return;
    if (!g.getAttribute("tileId") || !g.getAttribute("color")) return;
    if (
      !applyLandSurfaceWeatherVertexColors(
        g,
        globalTileTerrain,
        ctx.waterIds,
        ctx.wetness,
        ctx.snow,
        { globe, subsolarLatDeg: ctx.subsolarLatDeg, calendarUtc: ctx.calendarUtc },
      )
    ) {
      ok = false;
    }
  });
  return ok;
}

function flushLandWeatherVertexColorsIfDirty(state: DemoState): void {
  if (!landWeatherColorsDirty) return;
  if (!globe || !globalTileTerrain) return;
  const globeOk = syncGlobeLandWeatherVertexColors(state);
  const riverOk = syncRiverTerrainLandWeatherVertexColors(state);
  if (globeOk && riverOk) {
    landWeatherColorsDirty = false;
  }
}

let lastSnowDiagLogMs = 0;

/** `?snowDiag=1` in the URL: periodic console stats for sim snow map vs climate snow (subarctic sample). */
function maybeLogSnowSurfaceDiagnostic(date: Date): void {
  if (typeof window === "undefined") return;
  if (!new URLSearchParams(window.location.search).get("snowDiag")) return;
  if (!globe || !globalTileTerrain) return;
  const now = performance.now();
  if (now - lastSnowDiagLogMs < 5000) return;
  lastSnowDiagLogMs = now;
  const subsolar = dateToSubsolarPoint(date).latDeg;
  const snowMap = cloudClipField?.getTileSurfaceState().snow;
  let simTilesOver002 = 0;
  let simMax = 0;
  if (snowMap) {
    for (const v of snowMap.values()) {
      if (v > 0.02) simTilesOver002++;
      simMax = Math.max(simMax, v);
    }
  }
  const SAMPLE_CAP = 2500;
  let nSample = 0;
  let subarcticLand = 0;
  let sumClim = 0;
  let sumSim = 0;
  for (const t of globe.tiles) {
    const data = globalTileTerrain.get(t.id);
    if (!data || data.type === "water") continue;
    const p = globe.getTileCenter(t.id);
    if (!p) continue;
    const latDegSigned = (tileCenterToLatLon(p).lat * 180) / Math.PI;
    if (Math.abs(latDegSigned) < 55) continue;
    subarcticLand++;
    if (nSample >= SAMPLE_CAP) continue;
    nSample++;
    sumClim += climateSurfaceSnowVisualForTerrain(
      latDegSigned,
      subsolar,
      data?.type,
      data?.monthlyMeanTempC,
      date,
    );
    sumSim += snowMap?.get(t.id) ?? 0;
  }
  console.log("[snowDiag]", {
    simSnowTilesOver002: simTilesOver002,
    simSnowMax: simMax.toFixed(3),
    hasCloudClipField: !!cloudClipField,
    subarcticLandTiles55lat: subarcticLand,
    sampleSize: nSample,
    meanClimateSnowVisualSampled: nSample ? (sumClim / nSample).toFixed(3) : "n/a",
    meanSimSnowSampled: nSample ? (sumSim / nSample).toFixed(4) : "n/a",
    hint: "Add ?precipGapDiag=1 for target vs cloud climatology tables (polar deficits).",
  });
}

/** Recompute precipitation overlay (from cloud sim rain) and sync cloud meshes from sim. */
function updatePrecipitationAndCloudsFromState(state: DemoState): void {
  if (!globe || !cloudClipField) return;
  const targetMin = getCloudSimTargetUtcMinute(state);
  const getPS: PrecipSubsolarForMinute = (utcMin) => {
    const d = new Date(utcMin * 60000);
    const subsolar = dateToSubsolarPoint(d);
    return {
      precipByTile: getPrecipitationByTileWithMoisture(
        globe.tiles,
        subsolar.latDeg,
        globalMoistureByTile
      ),
      subsolarLatDeg: subsolar.latDeg,
    };
  };
  const nowDate = datetimeLocalUTCToDate(
    state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
  );
  cloudClipField.syncToTargetMinute(targetMin, globe, getPS, {
    moisture: globalMoistureByTile!,
    nowDate,
  });
  if (cloudGroup) {
    cloudClipField.syncThreeGroup(cloudGroup, globe, targetMin, camera);
    cloudGroup.visible = state.showClouds;
  }

  if (precipitationOverlayGroup) {
    updatePrecipitationOverlay(
      precipitationOverlayGroup,
      globe,
      cloudClipField.getPrecipOverlayMap(),
      {
        heightOffset: 0.06,
        quadSize: 0.08,
        opacity: 0.55,
        minPrecip: 0.03,
      }
    );
    precipitationOverlayGroup.visible = state.showPrecipitation;
  }
  markLandWeatherColorsDirty();
}

/** Bumped at each globe rebuild so in-flight cloud bootstrap aborts before touching stale globals. */
let cloudPrecipBuildGeneration = 0;

let cloudPrecipBootstrapPromise: Promise<void> | null = null;

/**
 * Clip-based cumulus field (lifecycle templates + wind advection). Skipped when both clouds and
 * precip are off; toggles call `requestCloudPrecipBootstrap`.
 */
async function ensureCloudWeatherAndPrecipMeshes(
  state: DemoState,
  buildPerf?: ReturnType<typeof createBuildPerfMarker> | null,
): Promise<void> {
  if (!globe || !globalMoistureByTile) return;
  if (cloudClipField && precipitationOverlayGroup && cloudGroup) {
    cloudGroup.visible = state.showClouds;
    precipitationOverlayGroup.visible = state.showPrecipitation;
    if (precipFxGroup) precipFxGroup.visible = state.showPrecipitation;
    return;
  }
  const gen = cloudPrecipBuildGeneration;
  const targetUtcMin = getCloudSimTargetUtcMinute(state);
  const hugeGlobe = globe.tileCount > 85_000;
  const getPrecipSubsolar: PrecipSubsolarForMinute = (utcMin) => {
    const d = new Date(utcMin * 60000);
    const subsolar = dateToSubsolarPoint(d);
    return {
      precipByTile: getPrecipitationByTileWithMoisture(
        globe!.tiles,
        subsolar.latDeg,
        globalMoistureByTile!
      ),
      subsolarLatDeg: subsolar.latDeg,
    };
  };
  const waterTileIds = new Set<number>();
  if (globalTileTerrain) {
    for (const [id, t] of globalTileTerrain) {
      if (t.type === "water") waterTileIds.add(id);
    }
  }
  const field = new CloudClipField({
    maxClouds: hugeGlobe ? 72 : 96,
    cloudScale: 0.038,
    cloudCastShadows: false,
    maxCloudMeshOpsPerSync: hugeGlobe ? 56 : 80,
    maxCatchUpMinutes: 720,
    waterTileIds,
    getTerrainTypeForTile: (id) => globalTileTerrain?.get(id)?.type,
    getMonthlyMeanTempCForTile: (id) =>
      globalTileTerrain?.get(id)?.monthlyMeanTempC,
    getSubsolarLatDegForUtcMinute: (utcMin) =>
      dateToSubsolarPoint(new Date(utcMin * 60000)).latDeg,
  });
  const maxSlots = Math.min(field.config.maxClouds, globe.tileCount);
  const annualSpawnTable = buildAnnualCloudSpawnTable(
    globe,
    globalMoistureByTile,
    field.config,
    maxSlots,
    (utcMin) => dateToSubsolarPoint(new Date(utcMin * 60000)).latDeg,
  );
  field.setAnnualSpawnTable(annualSpawnTable);

  if (typeof window !== "undefined") {
    const wPoly = window as unknown as {
      __polyglobePrecipGap?: () => ReturnType<typeof analyzePrecipClimatologyGap>;
    };
    wPoly.__polyglobePrecipGap = () =>
      analyzePrecipClimatologyGap(
        globe,
        annualSpawnTable,
        globalMoistureByTile,
        (utcMin) => dateToSubsolarPoint(new Date(utcMin * 60000)).latDeg,
        { waterTileIds },
      );

    if (new URLSearchParams(window.location.search).get("precipGapDiag")) {
      const runGap = () => {
        const rep = wPoly.__polyglobePrecipGap!();
        console.log("[precipGapDiag] seasonal×Köppen target vs annual cloud climatology (spawn-tile proxy).");
        console.log("[precipGapDiag] medians", {
          medianScaleFactor: +rep.medianScaleFactor.toFixed(4),
          medianTargetLand: +rep.medianTargetLand.toFixed(4),
          medianCloudRawLand: +rep.medianCloudRawLand.toFixed(6),
        });
        console.log("[precipGapDiag] worst wet-tile deficits (add clouds upwind / boost polar spawn):");
        console.table(
          rep.worstDeficits.slice(0, 35).map((r) => ({
            tileId: r.tileId,
            lat: +r.latDeg.toFixed(1),
            lon: +r.lonDeg.toFixed(1),
            targetMean: +r.targetMean.toFixed(3),
            ratio: +r.ratio.toFixed(2),
          })),
        );
        console.log("[precipGapDiag] polar |lat|≥58, largest target−scaledCloud gap:");
        console.table(
          rep.polarUnderCloudVsTarget.slice(0, 24).map((r) => ({
            tileId: r.tileId,
            lat: +r.latDeg.toFixed(1),
            lon: +r.lonDeg.toFixed(1),
            targetMean: +r.targetMean.toFixed(3),
            scaledCloud: +r.scaledCloudMean.toFixed(5),
            ratio: +r.ratio.toFixed(2),
          })),
        );
      };
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => runGap(), { timeout: 8000 });
      } else {
        setTimeout(runGap, 100);
      }
    }
  }
  const nowDate = datetimeLocalUTCToDate(
    state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
  );
  field.initToMinute(
    globe,
    targetUtcMin,
    globalMoistureByTile,
    nowDate,
    getPrecipSubsolar,
  );
  if (gen !== cloudPrecipBuildGeneration) return;
  cloudClipField = field;

  if (!precipitationOverlayGroup) {
    const precipGrp = createPrecipitationOverlay(
      globe,
      field.getPrecipOverlayMap(),
      {
        heightOffset: 0.06,
        quadSize: 0.08,
        opacity: 0.55,
        minPrecip: 0.03,
      }
    );
    precipitationOverlayGroup = precipGrp;
    precipGrp.visible = state.showPrecipitation;
    precipGrp.traverse((o) => {
      if (o instanceof THREE.Mesh) o.receiveShadow = true;
    });
    scene.add(precipGrp);
  }

  if (!cloudGroup) {
    cloudGroup = new THREE.Group();
    cloudGroup.name = "LowPolyClouds";
    field.syncThreeGroup(cloudGroup, globe, targetUtcMin, camera);
    cloudGroup.visible = state.showClouds;
    cloudGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) o.receiveShadow = true;
    });
    scene.add(cloudGroup);
  } else {
    field.syncThreeGroup(cloudGroup, globe, targetUtcMin, camera);
    cloudGroup.visible = state.showClouds;
  }

  if (!precipFxGroup) {
    precipFxGroup = createPrecipitationParticlesGroup({
      maxStreaks: hugeGlobe ? 240 : 440,
    });
    scene.add(precipFxGroup);
  }
  precipFxGroup.visible = state.showPrecipitation;

  markLandWeatherColorsDirty();
  buildPerf?.mark("cloudClipFieldPrecipMesh");
}

function requestCloudPrecipBootstrap(state: DemoState): void {
  if (!globe || !globalMoistureByTile) return;
  if (cloudClipField && precipitationOverlayGroup && cloudGroup) {
    cloudGroup.visible = state.showClouds;
    precipitationOverlayGroup.visible = state.showPrecipitation;
    if (precipFxGroup) precipFxGroup.visible = state.showPrecipitation;
    return;
  }
  if (cloudPrecipBootstrapPromise) return;
  cloudPrecipBootstrapPromise = (async () => {
    try {
      await ensureCloudWeatherAndPrecipMeshes(state, null);
    } catch (e) {
      console.error(BUILD_LOG, "cloud/precip bootstrap failed", e);
    } finally {
      cloudPrecipBootstrapPromise = null;
    }
  })();
}

function createFlareTexture(
  size: number,
  soft: boolean = true,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(soft ? 0.2 : 0.4, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function baseWaterTerrain(tileCount: number): Map<number, TileTerrainData> {
  const m = new Map<number, TileTerrainData>();
  for (let i = 0; i < tileCount; i++) {
    m.set(i, { tileId: i, type: "water", elevation: MAX_SEA_BED_ELEVATION });
  }
  return m;
}

function setGlobeGeometryFromTerrain(
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  peakTiles: Map<number, number> | undefined,
  elevationScale: number,
  peakElevationScale: number,
  minLandElevation?: number,
  riverEdgesByTile?: Map<number, Set<number>>,
  riverEdgeToWaterByTile?: Map<number, Set<number>>,
): void {
  const elevatedSeaTiles = new Map<number, number>();
  const opts: Parameters<typeof createGeodesicGeometryFlat>[1] = {
    radius: globe.radius,
    getElevation: (id) => {
      const d = tileTerrain.get(id);
      const raw = d?.elevation ?? MAX_SEA_BED_ELEVATION;
      if (d && (d.type === "water" || d.type === "beach")) {
        if (raw > MAX_SEA_BED_ELEVATION) elevatedSeaTiles.set(id, raw);
        return Math.min(raw, MAX_SEA_BED_ELEVATION);
      }
      return raw;
    },
    elevationScale,
    peakElevationScale,
  };
  if (minLandElevation != null) opts.minLandElevation = minLandElevation;
  if (peakTiles != null && peakTiles.size > 0) {
    opts.getPeak = (id) => {
      const m = peakTiles.get(id);
      return m != null ? { apexElevationM: m } : undefined;
    };
  }
  // Add hilly terrain bumps
  opts.getHilly = (id) => tileTerrain.get(id)?.isHilly ?? false;

  if (riverEdgesByTile != null && riverEdgesByTile.size > 0) {
    opts.getRiverEdges = (id) => riverEdgesByTile.get(id);
    opts.getRiverEdgeToWater = riverEdgeToWaterByTile
      ? (id) => riverEdgeToWaterByTile.get(id)
      : undefined;
    opts.riverBowlDepth = 0.012;
    opts.riverBowlInnerScale = 0.48;
  }
  const geom = createGeodesicGeometryFlat(globe.tiles, opts);
  if (elevatedSeaTiles.size > 0) {
    const list = [...elevatedSeaTiles.entries()]
      .map(([tid, elev]) => `tile ${tid} elev ${elev.toFixed(4)}`)
      .join(", ");
    console.warn(
      BUILD_LOG,
      "Sea bottom hex(es) drawn above submerged level (",
      MAX_SEA_BED_ELEVATION,
      "):",
      list,
    );
  }
  applyTerrainColorsToGeometry(geom, tileTerrain);
  if (globe.mesh.geometry) globe.mesh.geometry.dispose();
  globe.mesh.geometry = geom;
  globe.mesh.renderOrder = 0;
  applyGlobeTerrainShadowFlags(globe);
}

async function buildWorldAsync(state: DemoState): Promise<void> {
  const buildPerf = createBuildPerfMarker();
  console.log(
    BUILD_LOG,
    "buildWorldAsync start",
    state.useEarth ? "Earth" : "procedural",
    "subdivisions:",
    state.subdivisions,
  );
  setLoading(true);
  try {
    cloudPrecipBuildGeneration++;
    landWeatherColorsDirty = true;
    lastLandWeatherVisualMinute = Number.NaN;
    lastLandWeatherPaintEpochSec = Number.NaN;
    if (globe) {
      console.log(BUILD_LOG, "teardown previous globe/water/overlay");
      scene.remove(globe.mesh);
      globe.mesh.geometry.dispose();
      (globe.mesh as THREE.Mesh).material.dispose();
    }
    if (water) {
      scene.remove(water.mesh);
      water.dispose();
    }
    if (coastFoamOverlay) {
      scene.remove(coastFoamOverlay.mesh);
      coastFoamOverlay.dispose();
    }
    // River water now provided by water table (no separate river mesh to clean up)
    if (riverTerrainGroup) {
      scene.remove(riverTerrainGroup);
      riverTerrainGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      riverTerrainGroup = null;
    }
    if (innerBlackSphere) {
      scene.remove(innerBlackSphere);
      innerBlackSphere.geometry.dispose();
      (innerBlackSphere.material as THREE.Material).dispose();
      innerBlackSphere = null;
    }
    if (windArrowsGroup) {
      scene.remove(windArrowsGroup);
      windArrowsGroup.traverse((c) => {
        if (c instanceof THREE.InstancedMesh) {
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
      });
      windArrowsGroup = null;
    }
    if (riverFlowArrowsGroup) {
      scene.remove(riverFlowArrowsGroup);
      riverFlowArrowsGroup.traverse((c) => {
        if (c instanceof THREE.InstancedMesh) {
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
      });
      riverFlowArrowsGroup = null;
    }
    if (currentArrowsGroup) {
      scene.remove(currentArrowsGroup);
      currentArrowsGroup.traverse((c) => {
        if (c instanceof THREE.InstancedMesh) {
          c.geometry.dispose();
          (c.material as THREE.Material).dispose();
        }
      });
      currentArrowsGroup = null;
    }
    if (precipitationOverlayGroup) {
      scene.remove(precipitationOverlayGroup);
      precipitationOverlayGroup.traverse((c) => {
        if (c instanceof THREE.InstancedMesh) {
          c.geometry.dispose();
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      });
      precipitationOverlayGroup = null;
    }
    if (cloudGroup) {
      scene.remove(cloudGroup);
      cloudGroup.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
      cloudGroup = null;
    }
    if (precipFxGroup) {
      scene.remove(precipFxGroup);
      disposePrecipitationParticlesGroup(precipFxGroup);
      precipFxGroup = null;
    }
    cloudClipField?.dispose();
    cloudClipField = null;
    globalMoistureByTile = null;
    if (vegetationLayer) {
      scene.remove(vegetationLayer.group);
      vegetationLayer.dispose();
      vegetationLayer = null;
    }
    // Lake water now provided by water table (no separate lake meshes to clean up)
    if (marker) {
      scene.remove(marker);
      marker = null;
    }
    await yieldToMain();
    buildPerf?.mark("teardownYield");

    console.log(BUILD_LOG, "create Globe, add base water terrain");
    globe = new Globe({ radius: 1, subdivisions: state.subdivisions });
    (globe.mesh as THREE.Mesh).material.dispose();
    (globe.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      /** FrontSide lets the GPU cull back-facing land triangles (~half the globe from orbit). */
      side: THREE.FrontSide,
    });
    applyGlobeTerrainShadowFlags(globe);
    scene.add(globe.mesh);
    const elevationScale = 0.08;
    const peakElevationScale = 0.000006;

    // Sea level: land at 0 m must sit just above the water sphere's max wave height so coast isn't submerged.
    // Water sphere radius 0.995, waveAmplitude 0.0007 × (1 + 0.85 + 0.6) → max wave ≈ 0.00171. Min land radius ≈ 0.9967.
    // Vertex radius = 1 + landElevation * elevationScale, so landElevation >= (0.9967 - 1) / 0.08 ≈ -0.041.
    const SEA_LEVEL_LAND_ELEVATION = -0.042;
    /** Lake surface elevation (above ocean -0.18) so rivers flow into lakes; matches buildTerrainFromEarthRaster lakeElevation. */
    const LAKE_ELEVATION = -0.04;

    const baseTerrain = baseWaterTerrain(globe.tileCount);
    setGlobeGeometryFromTerrain(
      globe,
      baseTerrain,
      undefined,
      elevationScale,
      peakElevationScale,
    );
    await yieldToMain();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    let tileTerrain: Map<number, TileTerrainData>;
    let lastDisplayedTerrain = baseTerrain;
    let peakTiles: Map<number, number> | undefined;

    let riverEdgesByTile: Map<number, Set<number>> | undefined;
    let riverEdgeToWaterByTile: Map<number, Set<number>> | undefined;

    if (state.useEarth && earthRaster) {
      const cache = await fetchEarthGlobeCache(state.subdivisions);
      const cacheOk =
        cache != null &&
        cache.tileCount === globe.tileCount &&
        cache.tiles.length === globe.tileCount;

      if (cacheOk) {
        console.log(
          BUILD_LOG,
          "Earth: using precomputed cache (subdivisions",
          cache.subdivisions,
          "version",
          cache.version,
          ")",
        );
        tileTerrain = new Map();
        for (const row of cache.tiles) {
          tileTerrain.set(row.id, {
            tileId: row.id,
            type: row.t as TileTerrainData["type"],
            elevation: row.e,
            ...(row.l != null ? { lakeId: row.l } : {}),
            ...(row.h ? { isHilly: true } : {}),
          });
        }
        /** Cache JSON has no per-tile monthly temps; sample tavg stack here so snow/rain matches gridded climate. */
        if (earthRaster.temperatureMonthly) {
          attachMonthlyTemperatureToTerrainFromRaster(
            globe.tiles,
            tileTerrain,
            earthRaster.temperatureMonthly,
          );
          console.log(
            BUILD_LOG,
            "Earth: attached mean monthly °C to cached terrain (tavg_monthly.bin)",
          );
        }
        peakTiles = new Map(cache.peaks);
        riverEdgesByTile = new Map();
        for (const [k, arr] of Object.entries(cache.riverEdges)) {
          riverEdgesByTile.set(Number(k), new Set(arr));
        }
        // Cache already has processed river data - skip re-processing
        console.log(
          BUILD_LOG,
          "river edges loaded from cache:",
          riverEdgesByTile.size,
          "tiles",
        );
        if (riverEdgesByTile.size === 0) {
          riverEdgesByTile = undefined;
        } else {
          riverEdgeToWaterByTile = new Map();
          for (const [k, arr] of Object.entries(cache.riverEdgeToWater)) {
            riverEdgeToWaterByTile.set(Number(k), new Set(arr));
          }
          if (riverEdgeToWaterByTile.size === 0)
            riverEdgeToWaterByTile = undefined;
        }
      } else {
        if (cache == null) {
          console.log(
            BUILD_LOG,
            `Earth: no matching cache for subdivisions=${state.subdivisions} (need public/earth-globe-cache-${state.subdivisions}.json` +
              (state.subdivisions === 6 ? " or legacy earth-globe-cache.json" : "") +
              `, version ${EARTH_GLOBE_CACHE_VERSION}). Run: npm run build-earth-globe-cache -- ${state.subdivisions}`,
          );
          console.log(
            BUILD_LOG,
            "Or use ?noEarthCache=1 to force full recompute in the browser.",
          );
        }
        console.log(
          BUILD_LOG,
          "Earth: buildTerrainFromEarthRaster start (tiles:",
          globe.tileCount,
          ")",
        );
        try {
          tileTerrain = await buildTerrainFromEarthRaster(
            globe.tiles,
            earthRaster,
            {
              waterElevation: -0.18,
              lakeElevation: LAKE_ELEVATION,
              landElevation: SEA_LEVEL_LAND_ELEVATION,
              elevationScale: 0.00004,
              latitudeTerrain: true,
              getRegionScores: earthGetRegionScores ?? undefined,
              onFirstPassProgress: async () => {
                await yieldForRender(20);
              },
              resolveOptions: {
                useGreedyLandmassPlacement: true,
                getRasterWindow: earthGetRasterWindow ?? undefined,
                knownStraitTileIds:
                  globe.subdivisions === 6
                    ? new Set(EARTH_STRAIT_TILE_IDS_SUBDIVISION_6)
                    : undefined,
                onIteration: async (_iteration, landByTile) => {
                  const terrain = new Map<number, TileTerrainData>();
                  for (const [tid, lw] of landByTile) {
                    const isLand = lw.isLand;
                    const elev = isLand
                      ? SEA_LEVEL_LAND_ELEVATION
                      : lw.lakeId != null
                        ? LAKE_ELEVATION - 0.01
                        : MAX_SEA_BED_ELEVATION;
                    terrain.set(tid, {
                      tileId: tid,
                      type: isLand ? "land" : "water",
                      elevation: elev,
                    });
                  }
                  setGlobeGeometryFromTerrain(
                    globe,
                    terrain,
                    undefined,
                    elevationScale,
                    peakElevationScale,
                    SEA_LEVEL_LAND_ELEVATION,
                  );
                  await yieldForRender();
                },
              },
            },
          );
          applyCoastalBeach(globe.tiles, tileTerrain);
          console.log(BUILD_LOG, "Earth: buildTerrainFromEarthRaster done");
        } catch (e) {
          console.error(BUILD_LOG, "buildTerrainFromEarthRaster", e);
          throw e;
        }
        if (mountainsList && mountainsList.length > 0) {
          console.log(
            BUILD_LOG,
            "Earth: computing peak tiles from mountain list",
          );
          /** Distinct tiles that get pyramid peaks — scan further into mountains.json than older tileCount/20. */
          const targetDistinctTiles = Math.max(
            48,
            Math.floor(globe.tileCount / 10),
          );
          peakTiles = new Map<number, number>();
          for (const m of mountainsList) {
            if (peakTiles.size >= targetDistinctTiles) break;
            const dir = latLonDegToDirection(m.lat, m.lon);
            const tileId = globe.getTileIdAtDirection(dir);
            const existing = peakTiles.get(tileId) ?? 0;
            if (m.elevationM > existing) peakTiles.set(tileId, m.elevationM);
          }
          console.log(
            BUILD_LOG,
            "Earth: peaks done, count:",
            peakTiles?.size ?? 0,
          );
        }
        riverEdgesByTile = undefined;
        riverEdgeToWaterByTile = undefined;
        if (riverLinesLonLat && riverLinesLonLat.length > 0) {
          const riverSegments: ReturnType<typeof traceRiverThroughTiles> = [];
          const isDeltaByLine =
            riverLineIsDelta ?? riverLinesLonLat.map(() => false);
          for (let i = 0; i < riverLinesLonLat.length; i++) {
            const line = riverLinesLonLat[i];
            if (line.length >= 2) {
              const segs = traceRiverThroughTiles(globe, line);
              const isDelta = isDeltaByLine[i] ?? false;
              for (const s of segs) riverSegments.push({ ...s, isDelta });
            }
          }
          if (riverSegments.length > 0) {
            const raw = getRiverEdgesByTile(riverSegments, {
              tiles: globe.tiles,
              isWater: (id) => tileTerrain.get(id)?.type === "water",
            });
            const jn2 = pruneThreeWayRiverJunctions(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            if (jn2 > 0)
              console.log(
                BUILD_LOG,
                "pruned",
                jn2,
                "3-way river junction edges",
              );
            let symR = symmetrizeRiverNeighborEdgesUntilStable(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            const gaps2 = fillRiverGaps(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            if (gaps2 > 0)
              console.log(BUILD_LOG, "filled", gaps2, "river gap tiles");
            symR += symmetrizeRiverNeighborEdgesUntilStable(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            const iso2 = connectIsolatedRiverTiles(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            if (iso2 > 0)
              console.log(
                BUILD_LOG,
                "connected",
                iso2,
                "orphan river tile edges",
              );
            symR += symmetrizeRiverNeighborEdgesUntilStable(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            const forced2 = forceRiverReciprocity(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            if (forced2 > 0)
              console.log(
                BUILD_LOG,
                "forced",
                forced2,
                "reciprocal river edges",
              );
            symR += symmetrizeRiverNeighborEdgesUntilStable(
              raw,
              globe.tiles,
              (id) => tileTerrain.get(id)?.type === "water",
            );
            if (symR > 0)
              console.log(
                BUILD_LOG,
                "symmetrized",
                symR,
                "river neighbor edges",
              );
            riverEdgesByTile = new Map<number, Set<number>>();
            for (const [tid, set] of raw) {
              const type = tileTerrain.get(tid)?.type;
              if (type === "water" || type === "beach") continue;
              riverEdgesByTile.set(tid, set);
            }
            if (riverEdgesByTile.size === 0) {
              riverEdgesByTile = undefined;
            } else {
              riverEdgeToWaterByTile = new Map<number, Set<number>>();
              const tileById = new Map(globe.tiles.map((t) => [t.id, t]));
              const isWater = (id: number) => {
                const t = tileTerrain.get(id)?.type;
                return t === "water" || t === "beach";
              };
              for (const [tid, set] of riverEdgesByTile) {
                const tile = tileById.get(tid);
                if (!tile) continue;
                const toWater = new Set<number>();
                for (const e of set) {
                  const nid = getEdgeNeighbor(tile, e, globe.tiles);
                  if (nid !== undefined && isWater(nid)) toWater.add(e);
                }
                if (toWater.size > 0) riverEdgeToWaterByTile.set(tid, toWater);
              }
            }
          }
        }
      }
      // Every mountains.json point marks its own tile isHilly (rounded bump). Pyramid peaks are a larger
      // subset (targetDistinctTiles above). We do not mark neighbor tiles — that over-smoothed whole ranges.
      if (mountainsList && mountainsList.length > 0) {
        const hillyFromMountains = new Set<number>();
        for (const m of mountainsList) {
          const dir = latLonDegToDirection(m.lat, m.lon);
          const tileId = globe.getTileIdAtDirection(dir);
          hillyFromMountains.add(tileId);
        }
        let addedHills = 0;
        for (const tileId of hillyFromMountains) {
          const existing = tileTerrain.get(tileId);
          if (
            existing &&
            existing.type !== "water" &&
            existing.type !== "beach" &&
            !existing.isHilly
          ) {
            tileTerrain.set(tileId, { ...existing, isHilly: true });
            addedHills++;
          }
        }
        console.log(
          BUILD_LOG,
          "Earth: marked",
          addedHills,
          "tiles as hilly from mountains dataset",
        );
      }

      console.log(BUILD_LOG, "Earth: runTerrainTransition start");
      await runTerrainTransition(
        globe,
        lastDisplayedTerrain,
        tileTerrain,
        elevationScale,
        peakElevationScale,
        undefined,
        peakTiles,
        yieldToMain,
        SEA_LEVEL_LAND_ELEVATION,
        riverEdgesByTile,
        riverEdgeToWaterByTile,
      );
      console.log(BUILD_LOG, "Earth: runTerrainTransition done");
      lastDisplayedTerrain = tileTerrain;
      // Expose for debug panel
      globalTileTerrain = tileTerrain;
      globalRiverEdgesByTile = riverEdgesByTile ?? null;
      globalRiverFlowByTile =
        riverEdgesByTile && riverEdgesByTile.size > 0
          ? getRiverFlowByTile(riverEdgesByTile, globe.tiles, {
              getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
              isWater: (id) => tileTerrain.get(id)?.type === "water",
            })
          : null;
    } else {
      console.log(
        BUILD_LOG,
        "Procedural: buildProceduralTerrainProgressive start, blobiness:",
        state.blobiness,
      );
      tileTerrain = await buildProceduralTerrainProgressive(
        globe.tiles,
        state,
        async (intermediate) => {
          setGlobeGeometryFromTerrain(
            globe,
            intermediate,
            undefined,
            elevationScale,
            peakElevationScale,
          );
          lastDisplayedTerrain = intermediate;
          await yieldToMain();
        },
      );
      console.log(
        BUILD_LOG,
        "Procedural: buildProceduralTerrainProgressive done, runTerrainTransition start",
      );
      await runTerrainTransition(
        globe,
        lastDisplayedTerrain,
        tileTerrain,
        elevationScale,
        peakElevationScale,
        undefined,
        undefined,
        yieldToMain,
        undefined,
        undefined,
        undefined,
      );
      console.log(BUILD_LOG, "Procedural: runTerrainTransition done");
    }

    globalMoistureByTile = buildMoistureByTileFromTerrain(tileTerrain);

    await yieldToMain();

    console.log(BUILD_LOG, "create coast masks");
    const coastMaskRes =
      globe.tileCount > 100_000
        ? { w: 192, h: 96 }
        : globe.tileCount > 70_000
          ? { w: 224, h: 112 }
          : { w: 256, h: 128 };
    coastMaskTexture = createCoastMaskTexture(
      globe,
      tileTerrain,
      coastMaskRes.w,
      coastMaskRes.h,
    );
    coastLandMaskTexture = createCoastLandMaskTexture(
      globe,
      tileTerrain,
      coastMaskRes.w,
      coastMaskRes.h,
    );
    await yieldToMain();

    console.log(
      BUILD_LOG,
      "create WaterSphere with terrain-following water table",
    );
    water = new WaterSphere({
      radius: 0.995,
      color: 0x1a5a6a,
      colorPole: 0x2a3548,
      sunDirection: sunDirectionFromState(state),
      sunColor: 0xffffff,
      coastMask: coastMaskTexture,
      shorelineRadius: 1.0,
      size: 1.5,
      timeScale: 0.4,
      waveAmplitude: 0.0007,
    });
    // Replace sphere with terrain-following water table:
    // Water sits just below each tile's elevation, filling rivers/lakes through cutouts
    // while staying invisible under solid land hexes.
    const waterTableElevationScale = 0.08;
    // Build tile lookup for getEdgeNeighbor
    const tileById = new Map(globe.tiles.map((t) => [t.id, t]));

    const waterInteriorOceanSeg =
      globe.tileCount > 100_000
        ? { widthSegments: 28, heightSegments: 20 }
        : { widthSegments: 44, heightSegments: 30 };

    water.setWaterTableGeometry(
      globe.tiles,
      (id) => tileTerrain.get(id)?.elevation ?? 0,
      {
        baseRadius: globe.radius,
        elevationScale: waterTableElevationScale,
        depthBelowSurface: -0.006, // Slightly below land surface
        oceanLevel: 0.995,
        // Lakes use terrain elevation for the water surface; only open ocean / beach use fixed level.
        isOcean: (id) => {
          const d = tileTerrain.get(id);
          if (!d) return false;
          if (d.lakeId != null) return false;
          return d.type === "water" || d.type === "beach";
        },
        isLake: (id) => tileTerrain.get(id)?.lakeId != null,
        isRiver: (id) => riverEdgesByTile?.has(id) ?? false,
        getEdgeNeighbor: (id, edge) => {
          const tile = tileById.get(id);
          return tile ? getEdgeNeighbor(tile, edge, globe.tiles) : undefined;
        },
        interiorOceanSphere: waterInteriorOceanSeg,
      },
    );
    scene.add(water.mesh);
    console.log(
      BUILD_LOG,
      "water table geometry applied, vertices:",
      water.mesh.geometry.getAttribute("position")?.count ?? 0,
    );

    // Add black inner sphere to prevent seeing through any geometry gaps
    const innerSegW = globe.tileCount > 100_000 ? 24 : 64;
    const innerSegH = globe.tileCount > 100_000 ? 12 : 32;
    const innerSphereGeom = new THREE.SphereGeometry(
      0.98,
      innerSegW,
      innerSegH,
    );
    const innerSphereMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.BackSide,
    });
    innerBlackSphere = new THREE.Mesh(innerSphereGeom, innerSphereMat);
    innerBlackSphere.name = "InnerBlackSphere";
    innerBlackSphere.renderOrder = -10;
    scene.add(innerBlackSphere);
    console.log(BUILD_LOG, "added inner black sphere at radius 0.98");
    buildPerf?.mark("terrainWaterRiversCoast");

    // Wind arrows (seasonal trade winds, westerlies, polar easterlies + noise)
    const dateForWind = datetimeLocalUTCToDate(state.dateTimeStr || dateToDatetimeLocalUTC(new Date()));
    const subsolar = dateToSubsolarPoint(dateForWind);
    const windByTile = computeWindForTiles(globe.tiles, {
      subsolarLatDeg: subsolar.latDeg,
      baseStrength: 1,
      noiseDirectionRad: 0.12,
      noiseStrength: 0.08,
      seed: 45678,
      getTerrain: (id) => {
        const t = tileTerrain.get(id);
        if (!t) return undefined;
        const isWater = t.type === "water" || t.type === "beach";
        return { isWater, elevation: t.elevation };
      },
    });
    globalWindByTile = windByTile;
    windArrowsGroup = createWindArrows(globe, windByTile, {
      heightOffset: 0.08,
      arrowScale: 0.065,
      color: 0x88ccff,
      minStrength: 0.06,
    });
    windArrowsGroup.visible = state.showWinds;
    scene.add(windArrowsGroup!);
    lastWindUtcMinute = Math.floor(
      datetimeLocalUTCToDate(
        state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
      ).getTime() / 60000,
    );

    const dateForFlow = datetimeLocalUTCToDate(state.dateTimeStr || dateToDatetimeLocalUTC(new Date()));
    const subsolarFlow = dateToSubsolarPoint(dateForFlow);
    const riverFlow = buildRiverFlowByTile(subsolarFlow.latDeg);
    const currentFlow = buildCurrentFlowByTile();
    globalFlowByTile = mergeFlowByTile(riverFlow, currentFlow);
    riverFlowArrowsGroup = createFlowArrows(globe, riverFlow, RIVER_FLOW_OPTIONS);
    riverFlowArrowsGroup!.visible = state.showFlow;
    scene.add(riverFlowArrowsGroup!);
    currentArrowsGroup = createFlowArrows(globe, currentFlow, CURRENT_FLOW_OPTIONS);
    currentArrowsGroup!.visible = state.showFlow;
    scene.add(currentArrowsGroup!);
    buildPerf?.mark("windFlowArrows");

    if (state.showClouds || state.showPrecipitation) {
      await ensureCloudWeatherAndPrecipMeshes(state, buildPerf);
    } else {
      if (precipFxGroup) {
        scene.remove(precipFxGroup);
        disposePrecipitationParticlesGroup(precipFxGroup);
        precipFxGroup = null;
      }
      cloudClipField?.dispose();
      cloudClipField = null;
    }

    coastFoamOverlay = new CoastFoamOverlay(coastLandMaskTexture, {
      radius: 0.995,
      speed: 0.073,
      timeScale: 0.4,
      ...(globe.tileCount > 100_000
        ? { widthSegments: 24, heightSegments: 24 }
        : globe.tileCount > 70_000
          ? { widthSegments: 28, heightSegments: 28 }
          : {}),
    });
    scene.add(coastFoamOverlay.mesh);

    // Skip river re-processing if already loaded from cache
    if (
      state.useEarth &&
      riverLinesLonLat &&
      riverLinesLonLat.length > 0 &&
      !riverEdgesByTile
    ) {
      const elevationScale = 0.08;
      const riverSegments: ReturnType<typeof traceRiverThroughTiles> = [];
      const isDeltaByLine =
        riverLineIsDelta ?? riverLinesLonLat.map(() => false);
      for (let i = 0; i < riverLinesLonLat.length; i++) {
        const line = riverLinesLonLat[i];
        if (line.length >= 2) {
          const segs = traceRiverThroughTiles(globe, line);
          const isDelta = isDeltaByLine[i] ?? false;
          for (const s of segs) riverSegments.push({ ...s, isDelta });
        }
      }
      const totalPoints = riverLinesLonLat.reduce((s, l) => s + l.length, 0);
      console.log(
        BUILD_LOG,
        "river:",
        riverLinesLonLat.length,
        "lines,",
        totalPoints,
        "points →",
        riverSegments.length,
        "segments",
      );
      if (riverSegments.length > 0) {
        const raw = getRiverEdgesByTile(riverSegments, {
          tiles: globe.tiles,
          isWater: (id) => tileTerrain.get(id)?.type === "water",
        });
        const jn3 = pruneThreeWayRiverJunctions(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        if (jn3 > 0)
          console.log(BUILD_LOG, "pruned", jn3, "3-way river junction tiles");
        let sym3 = symmetrizeRiverNeighborEdgesUntilStable(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        const gaps3 = fillRiverGaps(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        if (gaps3 > 0)
          console.log(BUILD_LOG, "filled", gaps3, "river gap tiles");
        sym3 += symmetrizeRiverNeighborEdgesUntilStable(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        const iso3 = connectIsolatedRiverTiles(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        if (iso3 > 0)
          console.log(BUILD_LOG, "connected", iso3, "orphan river tile edges");
        sym3 += symmetrizeRiverNeighborEdgesUntilStable(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        const forced3 = forceRiverReciprocity(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        if (forced3 > 0)
          console.log(BUILD_LOG, "forced", forced3, "reciprocal river edges");
        sym3 += symmetrizeRiverNeighborEdgesUntilStable(
          raw,
          globe.tiles,
          (id) => tileTerrain.get(id)?.type === "water",
        );
        if (sym3 > 0)
          console.log(BUILD_LOG, "symmetrized", sym3, "river neighbor edges");
        riverEdgesByTile = new Map<number, Set<number>>();
        const DEBUG_TILES = [17543];
        for (const [tid, set] of raw) {
          const type = tileTerrain.get(tid)?.type;
          if (DEBUG_TILES.includes(tid)) {
            console.log(
              BUILD_LOG,
              `DEBUG tile ${tid}: in raw with edges [${[...set].join(",")}], type="${type}"`,
            );
          }
          if (type === "water" || type === "beach") continue;
          riverEdgesByTile.set(tid, set);
        }
        console.log(
          BUILD_LOG,
          "rivers placed on hex tile IDs:",
          riverEdgesByTile.size,
          "tiles (land only)",
        );
        if (riverEdgesByTile.size > 0) {
          // River water now provided by terrain-following water table
          const { banks, bed } = createRiverTerrainMeshes(
            globe,
            riverEdgesByTile,
            {
              radius: globe.radius,
              getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
              elevationScale,
              riverBedDepth: 0.016,
              riverVoidInnerRadiusFraction: 0.52,
              bankTopLift: 0,
              riverBankChannelWallInset: 0,
              getBankVertexRgb: (id) => {
                const t = tileTerrain.get(id)?.type ?? "land";
                const col =
                  TERRAIN_STYLES[t]?.color ?? TERRAIN_STYLES.land.color;
                const c = new THREE.Color(col);
                return [c.r, c.g, c.b];
              },
            },
          );
          riverTerrainGroup = new THREE.Group();
          riverTerrainGroup.name = "RiverTerrain";
          riverTerrainGroup.add(bed, banks);
          riverTerrainGroup.traverse((o) => {
            if (o instanceof THREE.Mesh) o.receiveShadow = true;
          });
          scene.add(riverTerrainGroup);
          const bv = banks.geometry.getAttribute("position")?.count ?? 0;
          const dv = bed.geometry.getAttribute("position")?.count ?? 0;
          console.log(
            BUILD_LOG,
            "river: U-banks/bed vertices",
            bv + dv,
            "(banks",
            bv,
            ", bed",
            dv,
            ")",
          );
        }
      }
    }

    // Create river terrain from cached data (water provided by water table)
    const elevationScaleRiver = 0.08;
    if (riverEdgesByTile && riverEdgesByTile.size > 0 && !riverTerrainGroup) {
      const { banks, bed } = createRiverTerrainMeshes(globe, riverEdgesByTile, {
        radius: globe.radius,
        getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
        elevationScale: elevationScaleRiver,
        riverBedDepth: 0.016,
        riverVoidInnerRadiusFraction: 0.52,
        bankTopLift: 0,
        riverBankChannelWallInset: 0,
        getBankVertexRgb: (id) => {
          const t = tileTerrain.get(id)?.type ?? "land";
          const col = TERRAIN_STYLES[t]?.color ?? TERRAIN_STYLES.land.color;
          const c = new THREE.Color(col);
          return [c.r, c.g, c.b];
        },
      });
      riverTerrainGroup = new THREE.Group();
      riverTerrainGroup.name = "RiverTerrain";
      riverTerrainGroup.add(bed, banks);
      riverTerrainGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) o.receiveShadow = true;
      });
      scene.add(riverTerrainGroup);
      const bv = banks.geometry.getAttribute("position")?.count ?? 0;
      const dv = bed.geometry.getAttribute("position")?.count ?? 0;
      console.log(
        BUILD_LOG,
        "river: U-banks/bed vertices (from cache)",
        bv + dv,
        "(banks",
        bv,
        ", bed",
        dv,
        ")",
      );
    }

    // Biome vegetation (low-poly plants, draw-distance culled) — load real plant assets
    buildPerf?.mark("preVegetationAssetLoad");
    const { createVegetationLayer } = await import("./vegetation.js");

    const TREE_LOG = "[tree-debug]";

    /** Height axis = axis with largest bbox extent (works for Y-up, Z-up, etc.). */
    function getHeightAxis(box: THREE.Box3): 0 | 1 | 2 {
      const dx = box.max.x - box.min.x;
      const dy = box.max.y - box.min.y;
      const dz = box.max.z - box.min.z;
      if (dy >= dx && dy >= dz) return 1;
      if (dz >= dx && dz >= dy) return 2;
      return 0;
    }

    /** Split tree geometry into trunk (lower fraction along height axis) and foliage. Robust to any up-axis. */
    function splitTreeTrunkFoliageByHeight(
      geom: THREE.BufferGeometry,
      trunkHeightFrac = 0.32
    ): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } | null {
      const pos = geom.getAttribute("position");
      if (!pos) return null;
      geom.computeBoundingBox();
      const box = geom.boundingBox!;
      const axis = getHeightAxis(box);
      const minH = axis === 0 ? box.min.x : axis === 1 ? box.min.y : box.min.z;
      const maxH = axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z;
      const range = maxH - minH;
      if (range <= 0) return null;
      const threshold = minH + trunkHeightFrac * range;
      const getH = (i: number) => (axis === 0 ? pos.getX(i) : axis === 1 ? pos.getY(i) : pos.getZ(i));
      const index = geom.index;
      const trunkIndices: number[] = [];
      const foliageIndices: number[] = [];

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const i0 = index.getX(i)!;
          const i1 = index.getX(i + 1)!;
          const i2 = index.getX(i + 2)!;
          const h0 = getH(i0);
          const h1 = getH(i1);
          const h2 = getH(i2);
          const triMax = Math.max(h0, h1, h2);
          const triMin = Math.min(h0, h1, h2);
          if (triMax < threshold) trunkIndices.push(i0, i1, i2);
          else if (triMin >= threshold) foliageIndices.push(i0, i1, i2);
          else {
            trunkIndices.push(i0, i1, i2);
            foliageIndices.push(i0, i1, i2);
          }
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          const h0 = getH(i);
          const h1 = getH(i + 1);
          const h2 = getH(i + 2);
          const triMax = Math.max(h0, h1, h2);
          const triMin = Math.min(h0, h1, h2);
          if (triMax < threshold) trunkIndices.push(i, i + 1, i + 2);
          else if (triMin >= threshold) foliageIndices.push(i, i + 1, i + 2);
          else {
            trunkIndices.push(i, i + 1, i + 2);
            foliageIndices.push(i, i + 1, i + 2);
          }
        }
      }
      if (trunkIndices.length === 0 || foliageIndices.length === 0) return null;
      const trunk = geom.clone();
      trunk.setIndex(new THREE.BufferAttribute(new Uint32Array(trunkIndices), 1));
      trunk.computeBoundingSphere();
      trunk.computeBoundingBox();
      const foliage = geom.clone();
      foliage.setIndex(new THREE.BufferAttribute(new Uint32Array(foliageIndices), 1));
      foliage.computeBoundingSphere();
      foliage.computeBoundingBox();
      return { trunk, foliage };
    }

    /** Prefer mesh name hints; fallback to lower half of bbox along height axis = trunk. */
    const TRUNK_NAME = /trunk|bark|stem|branch|wood|log|bamboo/i;
    const FOLIAGE_NAME = /leaf|leaves|foliage|crown|canopy|needle|frond|palm/i;

    /**
     * GLB/GLTF both parse to the same scene graph; `.glb` is binary packaging only.
     * Meshes often have scale/rotation on parents — geometry is in **local** space until we bake
     * `matrixWorld` (otherwise bamboo/palm can be microscopic or huge vs `.gltf` trees).
     */
    function bakeMeshWorldMatrix(mesh: THREE.Mesh, geom: THREE.BufferGeometry): void {
      geom.applyMatrix4(mesh.matrixWorld);
    }

    /** Scale trunk+foliage together so the tallest extent = 1 — keeps species visually comparable. */
    function normalizeTrunkFoliagePair(trunk: THREE.BufferGeometry, foliage: THREE.BufferGeometry): void {
      trunk.computeBoundingBox();
      foliage.computeBoundingBox();
      const tb = trunk.boundingBox;
      const fb = foliage.boundingBox;
      if (!tb || !fb) return;
      const box = new THREE.Box3().copy(tb).union(fb);
      const size = new THREE.Vector3();
      box.getSize(size);
      const axis = getHeightAxis(box);
      const h = axis === 0 ? size.x : axis === 1 ? size.y : size.z;
      if (h < 1e-8) return;
      const s = 1 / h;
      trunk.scale(s, s, s);
      foliage.scale(s, s, s);
      trunk.computeVertexNormals();
      foliage.computeVertexNormals();
    }

    function splitTreeFromGltfScene(
      gltf: { scene: THREE.Group },
      trunkHeightFrac = 0.32
    ): { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry } | null {
      gltf.scene.updateMatrixWorld(true);
      const meshes: { name: string; geom: THREE.BufferGeometry; box: THREE.Box3 }[] = [];
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && !(child instanceof THREE.SkinnedMesh)) {
          const geom = child.geometry.clone();
          bakeMeshWorldMatrix(child, geom);
          geom.computeBoundingBox();
          const box = geom.boundingBox!;
          meshes.push({ name: (child.name || "").toLowerCase(), geom, box });
        }
      });
      if (meshes.length === 0) return null;
      if (meshes.length === 1) return splitTreeTrunkFoliageByHeight(meshes[0]!.geom, trunkHeightFrac);

      const sceneBox = new THREE.Box3().setFromObject(gltf.scene);
      const axis = getHeightAxis(sceneBox);
      const getCenterH = (box: THREE.Box3) =>
        axis === 0 ? (box.min.x + box.max.x) / 2 : axis === 1 ? (box.min.y + box.max.y) / 2 : (box.min.z + box.max.z) / 2;

      const trunkGeoms: THREE.BufferGeometry[] = [];
      const foliageGeoms: THREE.BufferGeometry[] = [];
      for (const m of meshes) {
        const isTrunkName = TRUNK_NAME.test(m.name);
        const isFoliageName = FOLIAGE_NAME.test(m.name);
        if (isTrunkName && !isFoliageName) trunkGeoms.push(m.geom);
        else if (isFoliageName && !isTrunkName) foliageGeoms.push(m.geom);
        else {
          const centerH = getCenterH(m.box);
          const allCenters = meshes.map((x) => getCenterH(x.box));
          const minC = Math.min(...allCenters);
          const maxC = Math.max(...allCenters);
          const t = maxC > minC ? (centerH - minC) / (maxC - minC) : 0;
          if (t < 0.5) trunkGeoms.push(m.geom);
          else foliageGeoms.push(m.geom);
        }
      }
      if (trunkGeoms.length === 0 || foliageGeoms.length === 0) {
        return splitTreeTrunkFoliageByHeight(mergeBufferGeometries(meshes.map((m) => m.geom)), trunkHeightFrac);
      }
      const trunk = trunkGeoms.length === 1 ? trunkGeoms[0]! : mergeBufferGeometries(trunkGeoms);
      const foliage = foliageGeoms.length === 1 ? foliageGeoms[0]! : mergeBufferGeometries(foliageGeoms);
      return { trunk, foliage };
    }

    function mergeBufferGeometries(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
      const merged = new THREE.BufferGeometry();
      const positions: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];
      let offset = 0;
      for (const g of geoms) {
        const pos = g.getAttribute("position");
        const norm = g.getAttribute("normal");
        const idx = g.index;
        if (!pos) continue;
        for (let i = 0; i < pos.count; i++) {
          positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
          if (norm) normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        }
        if (idx) for (let i = 0; i < idx.count; i++) indices.push(offset + idx.getX(i)!);
        else for (let i = 0; i < pos.count; i++) indices.push(offset + i);
        offset += pos.count;
      }
      merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      if (normals.length === positions.length) merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      merged.setIndex(indices);
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      return merged;
    }

    const loadingManager = new THREE.LoadingManager();
    loadingManager.setURLModifier((url: string) => {
      if (url.endsWith("forest_texture.png"))
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
      return url;
    });
    const gltfLoader = new GLTFLoader(loadingManager);
    const fullUrl = (path: string) =>
      typeof location !== "undefined" ? `${location.origin}${path.startsWith("/") ? path : `/${path}`}` : path;
    type TreeTrunkFoliage = { trunk: THREE.BufferGeometry; foliage: THREE.BufferGeometry };

    const loadTreeGeometry = (url: string): Promise<TreeTrunkFoliage | undefined> =>
      new Promise((resolve) => {
        const resourceDir = url.replace(/\/[^/]+$/, "/");
        const filename = url.slice(resourceDir.length);
        /** Bamboo clump: slightly more trunk band so stalks tint brown. */
        const trunkFrac = /bamboo/i.test(url) ? 0.42 : 0.32;
        gltfLoader.setPath(resourceDir);
        gltfLoader.setResourcePath(resourceDir);
        gltfLoader.load(
          filename,
          (gltf) => {
            const split = splitTreeFromGltfScene(gltf, trunkFrac);
            if (split) {
              normalizeTrunkFoliagePair(split.trunk, split.foliage);
              resolve(split);
              return;
            }
            let geom: THREE.BufferGeometry | undefined;
            gltf.scene.updateMatrixWorld(true);
            gltf.scene.traverse((child) => {
              if (geom == null && child instanceof THREE.Mesh && child.geometry && !(child instanceof THREE.SkinnedMesh)) {
                const g = child.geometry.clone();
                bakeMeshWorldMatrix(child, g);
                geom = g;
              }
            });
            if (geom) {
              const fallback = splitTreeTrunkFoliageByHeight(geom, trunkFrac);
              if (fallback) {
                normalizeTrunkFoliagePair(fallback.trunk, fallback.foliage);
              }
              resolve(fallback ?? undefined);
            } else resolve(undefined);
          },
          undefined,
          (err) => {
            console.warn(TREE_LOG, "GLTF load failed", url, "full URL:", fullUrl(url), err);
            resolve(undefined);
          }
        );
      });

    const loadPlantGeometry = (url: string): Promise<THREE.BufferGeometry | undefined> =>
      new Promise((resolve) => {
        const resourceDir = url.replace(/\/[^/]+$/, "/");
        const filename = url.slice(resourceDir.length);
        gltfLoader.setPath(resourceDir);
        gltfLoader.setResourcePath(resourceDir);
        gltfLoader.load(
          filename,
          (gltf) => {
            let geom: THREE.BufferGeometry | undefined;
            gltf.scene.traverse((child) => {
              if (geom == null && child instanceof THREE.Mesh && child.geometry) geom = child.geometry.clone();
            });
            resolve(geom ?? undefined);
          },
          undefined,
          (err) => {
            console.warn(TREE_LOG, "GLTF load failed", url, "full URL:", fullUrl(url), err);
            resolve(undefined);
          }
        );
      });
    if (treeUrls.length > 0) {
      console.log(TREE_LOG, "plant asset base", { firstTreeUrl: treeUrls[0], full: fullUrl(treeUrls[0]!), origin: typeof location !== "undefined" ? location.origin : "" });
    }
    const [treeTrunkFoliageGeoms, bushGeoms, grassGeoms, rockGeoms] = await Promise.all([
      Promise.all(treeUrls.map((url) => loadTreeGeometry(url))),
      Promise.all(bushUrls.map((url) => loadPlantGeometry(url))),
      Promise.all(grassUrls.map((url) => loadPlantGeometry(url))),
      Promise.all(rockUrls.map((url) => loadPlantGeometry(url))),
    ]);

    /** Fixed index alignment with `treeUrls` / `getTreeVariantIndex` — do not compact (would remap species). */
    const treeTrunkFoliageSlots: (TreeTrunkFoliage | undefined)[] = treeTrunkFoliageGeoms;
    const treesLoadedCount = treeTrunkFoliageSlots.filter((g): g is TreeTrunkFoliage => g != null).length;
    const bushes = bushGeoms.filter((g): g is THREE.BufferGeometry => g != null);
    const grass = grassGeoms.filter((g): g is THREE.BufferGeometry => g != null);
    const rocks = rockGeoms.filter((g): g is THREE.BufferGeometry => g != null);

    console.log(TREE_LOG, "plant variants loaded", {
      treeSlots: treeTrunkFoliageSlots.length,
      treesLoaded: treesLoadedCount,
      treeGeomsNulls: treeTrunkFoliageGeoms.filter((g) => g == null).length,
      bushes: bushes.length,
      grass: grass.length,
      rocks: rocks.length,
    });
    treeTrunkFoliageSlots.forEach((g, i) => {
      if (g == null) console.warn(TREE_LOG, "tree variant missing", { index: i, url: treeUrls[i] });
    });
    if (treesLoadedCount > 0) {
      const t0 = treeTrunkFoliageSlots.find((g) => g != null)!;
      console.log(TREE_LOG, "first loaded tree trunk/foliage", {
        trunkVerts: t0.trunk.getAttribute("position")?.count ?? 0,
        foliageVerts: t0.foliage.getAttribute("position")?.count ?? 0,
      });
    }
    const bambooLoaded = treeTrunkFoliageSlots[TREE_VARIANT_BAMBOO];
    if (bambooLoaded) {
      bambooLoaded.trunk.computeBoundingBox();
      bambooLoaded.foliage.computeBoundingBox();
      const u = new THREE.Box3().copy(bambooLoaded.trunk.boundingBox!).union(bambooLoaded.foliage.boundingBox!);
      const sz = new THREE.Vector3();
      u.getSize(sz);
      console.log(TREE_LOG, "bamboo variant (index 9) after normalize — bbox size (tallest axis ≈1)", {
        sx: Number(sz.x.toFixed(4)),
        sy: Number(sz.y.toFixed(4)),
        sz: Number(sz.z.toFixed(4)),
        trunkVerts: bambooLoaded.trunk.getAttribute("position")?.count ?? 0,
        foliageVerts: bambooLoaded.foliage.getAttribute("position")?.count ?? 0,
      });
    } else {
      console.warn(TREE_LOG, "bamboo (index 9) failed to load — East Asia will fall back to other trees");
    }

    /** Globe radius ≈1; bushes/grass stay readable; trees get TREE_SIZE_MUL on top. */
    const VEG_BASE_SCALE = 0.00175;
    const TREE_SIZE_MUL = 3.1;
    const denseGlobe = globe.tileCount > 70_000;
    const veryDenseGlobe = globe.tileCount > 100_000;
    vegetationLayer = createVegetationLayer(globe, tileTerrain, {
      maxDrawDistance: veryDenseGlobe ? 1.45 : denseGlobe ? 2.65 : Infinity,
      /** From orbit, skip plant fill; zoom inside ~2.35 globe-units for biome detail. */
      orbitViewCameraDistance: 2.35,
      orbitViewMaxDrawDistance: 0.18,
      elevationScale,
      maxPlantsPerHex: veryDenseGlobe ? 3 : denseGlobe ? 8 : 16,
      baseScale: VEG_BASE_SCALE,
      maxInstancesPerType: veryDenseGlobe ? 896 : denseGlobe ? 3072 : 4096,
      updateEveryNFrames: veryDenseGlobe ? 12 : denseGlobe ? 2 : 1,
      hemisphereCullDot: veryDenseGlobe ? -0.02 : denseGlobe ? -0.15 : -0.22,
      hillyBumpHeight: 0.003,
      getPeak: peakTiles
        ? (id: number) => {
            const m = peakTiles!.get(id);
            return m != null ? { apexElevationM: m } : undefined;
          }
        : undefined,
      peakElevationScale,
      getRiverEdges: (id: number) => riverEdgesByTile?.get(id),
      geometries:
        treesLoadedCount > 0 || bushes.length > 0 || grass.length > 0 || rocks.length > 0
          ? {
              ...(treesLoadedCount > 0 && { treeTrunkFoliage: treeTrunkFoliageSlots }),
              ...(bushes.length > 0 && { bushes }),
              ...(grass.length > 0 && { grass }),
              ...(rocks.length > 0 && { rocks }),
            }
          : {},
      getTreeVariantScale: (v: number) =>
        TREE_SIZE_MUL * (v === TREE_VARIANT_BAMBOO ? 2.35 : 1),
      getTreeVariantIndex: treesLoadedCount > 0 ? getTreeVariantIndex : undefined,
      getBushVariantIndex: bushes.length > 0 ? getBushVariantIndex : undefined,
      getGrassVariantIndex: grass.length > 0 ? getGrassVariantIndex : undefined,
      getRockVariantIndex: rocks.length > 0 ? getRockVariantIndex : undefined,
      getDate: () =>
        datetimeLocalUTCToDate(state.dateTimeStr || dateToDatetimeLocalUTC(new Date())),
      getTileWetness: (tileId: number) =>
        cloudClipField?.getTileSurfaceState().getWetness(tileId) ?? 0,
      getTileSnowCover: (tileId: number) => {
        const p = globe.getTileCenter(tileId);
        if (!p) return 0;
        const latDeg = (tileCenterToLatLon(p).lat * 180) / Math.PI;
        const d = datetimeLocalUTCToDate(
          state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
        );
        const snSim =
          cloudClipField?.getTileSurfaceState().snow.get(tileId) ?? 0;
        const row = globalTileTerrain?.get(tileId);
        const snClim = climateSurfaceSnowVisualForTerrain(
          latDeg,
          dateToSubsolarPoint(d).latDeg,
          row?.type,
          row?.monthlyMeanTempC,
          d,
        );
        return combinedLandSnowCover(snSim, snClim);
      },
    });
    vegetationLayer.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.receiveShadow = true;
        /** Plant shadows are expensive with many instances; skip on dense globes. */
        o.castShadow = !denseGlobe;
      }
    });
    scene.add(vegetationLayer.group);
    buildPerf?.mark("vegetationGltf");
    const vegGroup = vegetationLayer.group;
    const treeChildren = vegGroup.children.filter((c) => c.name?.includes("tree"));
    console.log(TREE_LOG, "vegetation layer added to scene", {
      groupChildren: vegGroup.children.length,
      groupInScene: scene.children.includes(vegGroup),
      treeMeshNames: treeChildren.map((c) => c.name),
    });

    /** Debug marker at tile 42 — only meaningful at subdivision 6 (IDs differ at other scales). */
    if (globe.subdivisions === 6 && globe.tileCount > 42) {
      marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xff4444 }),
      );
      placeObject(marker, globe, { tileId: 42, heightOffset: 0.06 });
      scene.add(marker);
    }
    applyGlobeRenderingPerf(globe.tileCount);
    flushLandWeatherVertexColorsIfDirty(state);
    {
      const paintDate = datetimeLocalUTCToDate(
        state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
      );
      lastLandWeatherVisualMinute = Math.floor(
        getCloudVisualUtcMinutes(state, paintDate),
      );
      lastLandWeatherPaintEpochSec = Math.floor(paintDate.getTime() / 1000);
    }
    console.log(BUILD_LOG, "buildWorldAsync done");
  } finally {
    buildPerf?.finish();
    setLoading(false);
  }
}

function scheduleRebuild(state: DemoState) {
  if (buildInProgress) {
    console.log(
      BUILD_LOG,
      "scheduleRebuild: build already in progress, queuing state",
    );
    pendingState = { ...state };
    return;
  }
  console.log(BUILD_LOG, "scheduleRebuild: starting build");
  buildInProgress = true;
  pendingState = null;
  buildWorldAsync(state)
    .then(() => {
      buildInProgress = false;
      if (pendingState) {
        const next = pendingState;
        pendingState = null;
        scheduleRebuild(next);
      }
    })
    .catch((e) => {
      console.error("[buildWorldAsync]", e);
      buildInProgress = false;
    });
}

function createPanel(state: DemoState, onRebuild: () => void) {
  const panel = document.getElementById("panel")!;
  panel.innerHTML = "";

  const h3 = document.createElement("h3");
  h3.textContent = "Globe controls";
  panel.appendChild(h3);

  const loadingEl = document.createElement("div");
  loadingEl.className = "loading";
  loadingEl.textContent = "Building globe…";
  panel.appendChild(loadingEl);
  setLoading = (visible: boolean) =>
    loadingEl.classList.toggle("visible", visible);

  const addSection = (title: string) => {
    const sec = document.createElement("section");
    sec.innerHTML = `<label>${title}</label>`;
    panel.appendChild(sec);
    return sec;
  };

  const addSlider = (
    parent: HTMLElement,
    label: string,
    key: keyof DemoState,
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
    triggerRebuild: boolean = true,
  ) => {
    const row = document.createElement("div");
    row.className = "row";
    const valSpan = document.createElement("span");
    valSpan.className = "value";
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String((state as Record<string, number>)[key]);
    valSpan.textContent = format(Number(input.value));
    input.addEventListener("input", () => {
      (state as Record<string, number>)[key] = Number(input.value);
      valSpan.textContent = format(Number(input.value));
      if (triggerRebuild) onRebuild();
    });
    row.appendChild(document.createTextNode(label));
    row.appendChild(valSpan);
    parent.appendChild(row);
    parent.appendChild(input);
  };

  const addToggle = (
    parent: HTMLElement,
    label: string,
    key: keyof DemoState,
    onRebuild: () => void,
  ) => {
    const row = document.createElement("div");
    row.className = "row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = (state as Record<string, boolean>)[key] as boolean;
    cb.addEventListener("change", () => {
      (state as Record<string, boolean>)[key] = cb.checked;
      onRebuild();
    });
    row.appendChild(cb);
    row.appendChild(document.createTextNode(label));
    parent.appendChild(row);
  };

  let sec = addSection("World");
  addToggle(sec, "Use Earth map", "useEarth", () => {
    onRebuild();
    const proc = panel.querySelector(".procedural-options");
    if (proc)
      (proc as HTMLElement).style.display = state.useEarth ? "none" : "";
  });
  addSlider(
    sec,
    "Scale (subdivisions)",
    "subdivisions",
    1,
    MAX_EARTH_GLOBE_SUBDIVISIONS,
    1,
    (v) => `${v} (~${2 + 10 * Math.pow(4, v)} tiles)`,
  );

  sec = addSection("Date & time (UTC)");
  const dateTimeRow = document.createElement("div");
  dateTimeRow.className = "row";
  const dateTimeInput = document.createElement("input");
  dateTimeInput.type = "datetime-local";
  dateTimeInput.step = "1";
  dateTimeInput.value =
    state.dateTimeStr || dateToDatetimeLocalUTC(new Date());
  if (!state.dateTimeStr) state.dateTimeStr = dateTimeInput.value;
  panelDateTimeInput = dateTimeInput;
  playbackEpochMs = datetimeLocalUTCToDate(state.dateTimeStr).getTime();

  function applyDateTimeAndWinds() {
    state.dateTimeStr = dateTimeInput.value;
    playbackEpochMs = datetimeLocalUTCToDate(state.dateTimeStr).getTime();
    lastWindUtcMinute = Math.floor(playbackEpochMs / 60000);
    updateWindFromState(state, dateTimeInput.value);
    if (riverFlowArrowsGroup || currentArrowsGroup) updateFlowFromState(state);
    if (precipitationOverlayGroup || cloudGroup) updatePrecipitationAndCloudsFromState(state);
  }
  dateTimeInput.addEventListener("change", applyDateTimeAndWinds);
  dateTimeInput.addEventListener("input", applyDateTimeAndWinds);

  const playRow = document.createElement("div");
  playRow.className = "row";
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.textContent = state.timePlaying ? "Pause" : "Play";
  playBtn.addEventListener("click", () => {
    state.timePlaying = !state.timePlaying;
    playBtn.textContent = state.timePlaying ? "Pause" : "Play";
    dateTimeInput.disabled = state.timePlaying;
    if (state.timePlaying) {
      playbackEpochMs = datetimeLocalUTCToDate(
        state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
      ).getTime();
    }
  });

  const speedSelect = document.createElement("select");
  speedSelect.setAttribute("aria-label", "Time play speed");
  const speedPresets: { label: string; value: number }[] = [
    { label: "1× (real-time)", value: 1 },
    { label: "60× (1 sim min / sec)", value: 60 },
    { label: "360× (6 sim min / sec)", value: 360 },
    { label: "3600× (1 sim hour / sec)", value: 3600 },
    { label: "86400× (1 sim day / sec)", value: 86400 },
  ];
  for (const { label, value } of speedPresets) {
    const opt = document.createElement("option");
    opt.value = String(value);
    opt.textContent = label;
    speedSelect.appendChild(opt);
  }
  speedSelect.value = String(
    speedPresets.some((p) => p.value === state.timePlaySpeed)
      ? state.timePlaySpeed
      : 3600,
  );
  if (!speedPresets.some((p) => p.value === state.timePlaySpeed)) {
    state.timePlaySpeed = 3600;
  }
  speedSelect.addEventListener("change", () => {
    state.timePlaySpeed = Number(speedSelect.value);
  });

  const nowBtn = document.createElement("button");
  nowBtn.type = "button";
  nowBtn.textContent = "Now (UTC)";
  nowBtn.title = "Set date and time to the current instant (UTC)";
  nowBtn.addEventListener("click", () => {
    const d = new Date();
    state.dateTimeStr = dateToDatetimeLocalUTC(d);
    dateTimeInput.value = state.dateTimeStr;
    playbackEpochMs = d.getTime();
    lastWindUtcMinute = Math.floor(playbackEpochMs / 60000);
    updateWindFromState(state, state.dateTimeStr);
    if (riverFlowArrowsGroup || currentArrowsGroup) updateFlowFromState(state);
    if (precipitationOverlayGroup || cloudGroup)
      updatePrecipitationAndCloudsFromState(state);
  });

  playRow.appendChild(playBtn);
  playRow.appendChild(document.createTextNode("Speed"));
  playRow.appendChild(speedSelect);
  playRow.appendChild(nowBtn);
  sec.appendChild(playRow);

  const dateTimeLabel = document.createElement("label");
  dateTimeLabel.textContent = "Sun & moon position:";
  dateTimeRow.appendChild(dateTimeLabel);
  dateTimeRow.appendChild(dateTimeInput);
  sec.appendChild(dateTimeRow);

  const windRow = document.createElement("div");
  windRow.className = "row";
  const windCheck = document.createElement("input");
  windCheck.type = "checkbox";
  windCheck.checked = state.showWinds;
  windCheck.addEventListener("change", () => {
    state.showWinds = windCheck.checked;
    if (windArrowsGroup) windArrowsGroup.visible = state.showWinds;
  });
  const windLabel = document.createElement("label");
  windLabel.textContent = "Show winds (arrows)";
  windRow.appendChild(windCheck);
  windRow.appendChild(windLabel);
  sec.appendChild(windRow);

  const flowRow = document.createElement("div");
  flowRow.className = "row";
  const flowCheck = document.createElement("input");
  flowCheck.type = "checkbox";
  flowCheck.checked = state.showFlow;
  flowCheck.addEventListener("change", () => {
    state.showFlow = flowCheck.checked;
    if (riverFlowArrowsGroup) riverFlowArrowsGroup.visible = state.showFlow;
    if (currentArrowsGroup) currentArrowsGroup.visible = state.showFlow;
  });
  const flowLabel = document.createElement("label");
  flowLabel.textContent = "Show flow (rivers & currents)";
  flowRow.appendChild(flowCheck);
  flowRow.appendChild(flowLabel);
  sec.appendChild(flowRow);

  const precipRow = document.createElement("div");
  precipRow.className = "row";
  const precipCheck = document.createElement("input");
  precipCheck.type = "checkbox";
  precipCheck.checked = state.showPrecipitation;
  precipCheck.addEventListener("change", () => {
    state.showPrecipitation = precipCheck.checked;
    if (state.showPrecipitation) requestCloudPrecipBootstrap(state);
    if (precipitationOverlayGroup)
      precipitationOverlayGroup.visible = state.showPrecipitation;
  });
  const precipLabel = document.createElement("label");
  precipLabel.textContent = "Show precipitation";
  precipRow.appendChild(precipCheck);
  precipRow.appendChild(precipLabel);
  sec.appendChild(precipRow);

  const cloudsRow = document.createElement("div");
  cloudsRow.className = "row";
  const cloudsCheck = document.createElement("input");
  cloudsCheck.type = "checkbox";
  cloudsCheck.checked = state.showClouds;
  cloudsCheck.addEventListener("change", () => {
    state.showClouds = cloudsCheck.checked;
    if (state.showClouds) requestCloudPrecipBootstrap(state);
    if (cloudGroup) {
      cloudGroup.visible = state.showClouds;
      cloudGroup.updateMatrixWorld(true);
      if (sun?.directional?.castShadow && sun.directional.shadow) {
        sun.directional.shadow.needsUpdate = true;
      }
    }
  });
  const cloudsLabel = document.createElement("label");
  cloudsLabel.textContent = "Show clouds";
  cloudsRow.appendChild(cloudsCheck);
  cloudsRow.appendChild(cloudsLabel);
  sec.appendChild(cloudsRow);

  sec = addSection("Procedural (when Earth off)");
  sec.classList.add("procedural", "procedural-options");
  sec.style.display = state.useEarth ? "none" : "";
  addSlider(
    sec,
    "Land fraction",
    "landFraction",
    0.2,
    0.8,
    0.02,
    (v) => (v * 100).toFixed(0) + "%",
  );
  addSlider(sec, "Blobiness (smoothing)", "blobiness", 0, 12, 1, (v) =>
    String(v),
  );
  addSlider(sec, "Seed", "seed", 1, 99999, 1, (v) => String(v));
}

async function init() {
  console.log(BUILD_LOG, "init start");
  try {
    const starsRes = await fetch("/stars.json");
    if (starsRes.ok) {
      const catalog = (await starsRes.json()) as Array<{ ra: number; dec: number; mag: number }>;
      if (Array.isArray(catalog) && catalog.length > 0) {
        camera.remove(starfield.mesh);
        starfield.dispose();
        starfield = new Starfield({ catalog, color: 0xf0f4ff });
        scene.add(starfield.catalogGroup!);
        const catalogRadius = 800;
        const { points, update } = createPlanetsMesh(catalogRadius);
        starfield.catalogGroup!.add(points);
        planetsUpdate = update;
        console.log(BUILD_LOG, "starfield: using real star catalog,", catalog.length, "stars; planets added");
      }
    }
  } catch {
    // keep procedural starfield
  }
  console.log(BUILD_LOG, "init: loading Earth land raster…");
  const landResult = await loadEarthLandRaster();
  earthRaster = landResult.raster;
  earthLandSampler = landResult.landSampler;
  earthTopologySampler = landResult.topologySampler;
  earthGetRegionScores = landResult.getRegionScores;
  earthGetRasterWindow = landResult.getRasterWindow ?? null;
  console.log(BUILD_LOG, "init: land raster done, fetching mountains.json…");
  const res = await fetch(MOUNTAINS_JSON_SAME_ORIGIN);
  if (res.ok) {
    const raw = (await res.json()) as unknown;
    mountainsList =
      Array.isArray(raw) &&
      raw.every(
        (e: unknown) =>
          e != null &&
          typeof e === "object" &&
          "lat" in e &&
          "lon" in e &&
          "elevationM" in e &&
          typeof (e as MountainEntry).lat === "number" &&
          typeof (e as MountainEntry).lon === "number" &&
          typeof (e as MountainEntry).elevationM === "number",
      )
        ? (raw as MountainEntry[])
        : null;
  } else {
    mountainsList = null;
  }
  /** Natural Earth rivers: scalerank 0–2 = major (Amazon, Mississippi, Yangtze, Ganges, Nile, etc.), 3 = still major, 4+ = smaller. We keep scalerank <= 3 so we get navigable/famous rivers without every stream. */
  const RIVER_MAX_SCALERANK = 3;
  console.log(
    BUILD_LOG,
    "init: loading rivers (scalerank <=",
    RIVER_MAX_SCALERANK,
    ")…",
  );
  try {
    const riversRes = await fetch("/ne_10m_rivers_lake_centerlines.json");
    if (riversRes.ok) {
      const rivers = (await riversRes.json()) as {
        type: string;
        features?: Array<{
          properties?: {
            name_en?: string;
            name?: string;
            featurecla?: string;
            scalerank?: number;
          };
          geometry?: { type: string; coordinates: number[][] | number[][][] };
        }>;
      };
      const lines: number[][][] = [];
      const lineIsDelta: boolean[] = [];
      const alwaysIncludeRiverNames =
        /\b(saint\s*lawrence|st\.?\s*lawrence)\b/i;
      for (const f of rivers.features ?? []) {
        const cla = f.properties?.featurecla ?? "";
        if (cla !== "River" && cla !== "Lake Centerline") continue;
        const name = f.properties?.name_en ?? f.properties?.name ?? "";
        const sr = f.properties?.scalerank;
        const withinScale = sr == null || sr <= RIVER_MAX_SCALERANK;
        if (!withinScale && !alwaysIncludeRiverNames.test(name)) continue;
        const isDelta = /\b(rosetta|damietta)\b/i.test(name);
        const g = f.geometry;
        if (!g?.coordinates) continue;
        if (g.type === "LineString" && Array.isArray(g.coordinates)) {
          if (g.coordinates.length >= 2) {
            lines.push(g.coordinates as number[][]);
            lineIsDelta.push(isDelta);
          }
        } else if (
          g.type === "MultiLineString" &&
          Array.isArray(g.coordinates)
        ) {
          for (const ring of g.coordinates as number[][][]) {
            if (ring.length >= 2) {
              lines.push(ring);
              lineIsDelta.push(isDelta);
            }
          }
        }
      }
      riverLinesLonLat = lines.length > 0 ? lines : null;
      riverLineIsDelta =
        riverLinesLonLat && lineIsDelta.length === riverLinesLonLat.length
          ? lineIsDelta
          : null;
      const totalPoints =
        riverLinesLonLat?.reduce((s, l) => s + l.length, 0) ?? 0;
      console.log(
        BUILD_LOG,
        "init: rivers loaded (scalerank <=",
        RIVER_MAX_SCALERANK,
        "),",
        riverLinesLonLat?.length ?? 0,
        "lines,",
        totalPoints,
        "total points",
      );
    } else {
      riverLinesLonLat = null;
      riverLineIsDelta = null;
      console.warn(BUILD_LOG, "init: rivers fetch failed", riversRes?.status);
    }
  } catch (e) {
    riverLinesLonLat = null;
    riverLineIsDelta = null;
    console.warn(BUILD_LOG, "init: rivers load error", e);
  }
  console.log(BUILD_LOG, "init: loading Koppen climate…");
  const climate = await loadKoppenClimate();
  if (climate) earthRaster.climate = climate;
  console.log(BUILD_LOG, "init: loading elevation…");
  const elevation = await loadElevation();
  if (elevation) earthRaster.elevation = elevation;
  console.log(BUILD_LOG, "init: loading mean monthly temperature (optional)…");
  const tavgMonthly = await loadTemperatureMonthlyBin();
  if (tavgMonthly && earthRaster) {
    earthRaster.temperatureMonthly = tavgMonthly;
    console.log(
      BUILD_LOG,
      "init: tavg monthly",
      tavgMonthly.width,
      "×",
      tavgMonthly.height,
      "(°C × 12 layers)",
    );
  } else {
    console.log(
      BUILD_LOG,
      "init: no tavg_monthly.bin — run `npm run build-tavg-monthly` in examples/globe-demo for gridded temps",
    );
  }
  console.log(
    BUILD_LOG,
    "init: assets done, creating panel and scheduling build",
  );

  const state: DemoState = { ...DEFAULT_STATE };
  createPanel(state, () => scheduleRebuild(state));
  scheduleRebuild(state);

  applyPreset(camera, getPreset("strategy"), 1);
  camera.position.multiplyScalar(2.8);

  sun = new Sun({
    direction: sunDirectionFromState(state),
    distance: 3500,
    intensity: 2.2,
    /** Slightly higher fill so night-side terrain / subdiv-7 mesh stay readable (was 0.025 → nearly black). */
    ambientIntensity: 0.055,
    ambientColor: 0x1a2230,
    sphereRadius: 90,
    sphereColor: 0xfff5e0,
    castShadow: true,
    shadowIntensity: 0.82,
  });
  sun.addTo(scene);
  const lensflare = new Lensflare();
  lensflare.addElement(
    new LensflareElement(
      createFlareTexture(64, true),
      120,
      0,
      new THREE.Color(0xffffee),
    ),
  );
  lensflare.addElement(
    new LensflareElement(
      createFlareTexture(32, true),
      80,
      0.4,
      new THREE.Color(0xffffee),
    ),
  );
  lensflare.addElement(
    new LensflareElement(
      createFlareTexture(128, false),
      200,
      0.6,
      new THREE.Color(0xffffff),
    ),
  );
  sun.directional.add(lensflare);
  sunLensflareRef = lensflare;

  {
    /** Low segment count: only casts a bulk shadow silhouette for clouds. */
    const occluderGeom = new THREE.SphereGeometry(1, 20, 20);
    const occluderMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    earthOccluder = new THREE.Mesh(occluderGeom, occluderMat);
    earthOccluder.name = "EarthOccluder";
    earthOccluder.castShadow = true;
    earthOccluder.receiveShadow = false;
    earthOccluder.layers.set(1);
    earthOccluder.renderOrder = -10000;
    scene.add(earthOccluder);
  }

  const atmosphere = new Atmosphere(scene, { timeOfDay: 0.5 });
  scene.background = new THREE.Color(0x030508);

  /** Earth colors by terrain type (TERRAIN_STYLES), not by sampling a color image. Moon uses a single equirectangular texture sampled at each tile center, then the same vertex-color-by-tileId path (applyVertexColorsByTileId). Prefer local public/ so we are not always fetching from the web (npm run download-data writes public/lroc_color_2k.jpg); fallback to NASA URL if local file is missing. */
  const MOON_TEXTURE_LOCAL = "/lroc_color_2k.jpg";
  const MOON_TEXTURE_FALLBACK =
    "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg";

  async function loadImageAsImageData(
    url: string,
  ): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return {
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
      };
    } catch (e) {
      console.warn(BUILD_LOG, "Moon texture load failed:", e);
      return null;
    }
  }

  function sampleEquirectangular(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    latDeg: number,
    lonDeg: number,
  ): number {
    const x = Math.max(
      0,
      Math.min(width - 1, ((lonDeg + 180) / 360) * width),
    );
    const y = Math.max(
      0,
      Math.min(height - 1, ((90 - latDeg) / 180) * height),
    );
    const i = (Math.floor(y) * width + Math.floor(x)) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    return (r << 16) | (g << 8) | b;
  }

  function applyMoonTextureFromImageData(
    moon: Globe,
    imageData: { data: Uint8ClampedArray; width: number; height: number },
  ): void {
    const { data, width, height } = imageData;
    const getColor = (tileId: number): number => {
      const tile = moon.tiles.find((t) => t.id === tileId);
      if (!tile) return 0x888888;
      const { lat, lon } = tileCenterToLatLon(tile.center);
      const { latDeg, lonDeg } = latLonToDegrees(lat, lon);
      return sampleEquirectangular(data, width, height, latDeg, lonDeg);
    };
    applyVertexColorsByTileId(moon.mesh.geometry, getColor);
  }

  const moonRadius = 0.14;
  const moonDistance = 2.6;
  /** Same hex scale as Earth: linear hex size ∝ R/√(tile count). Earth subdiv 6 → ~40k tiles; moon needs ~800 tiles so 0.14/√N ≈ 1/√40k → N ≈ 800. Subdiv 3 = 642 tiles (hexes ~same size). */
  const moonSubdivisions = 3;
  const moon = new Globe({ radius: moonRadius, subdivisions: moonSubdivisions });
  const moonTerrain = new Map<number, TileTerrainData>();
  for (let i = 0; i < moon.tileCount; i++) {
    moonTerrain.set(i, {
      tileId: i,
      type: i % 2 === 0 ? "snow" : "mountain",
      elevation: 0.02,
    });
  }
  applyTerrainToGeometry(moon.mesh.geometry, moonTerrain, 0.04);
  (moon.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    side: THREE.FrontSide,
  });
  scene.add(moon.mesh);
  void loadImageAsImageData(MOON_TEXTURE_LOCAL)
    .then((img) => (img ? img : loadImageAsImageData(MOON_TEXTURE_FALLBACK)))
    .then((img) => {
      if (img) applyMoonTextureFromImageData(moon, img);
    });
  const moonLight = new THREE.PointLight(
    0xb0b8c8,
    0.5,
    moonDistance * 2.5,
    1.5,
  );
  scene.add(moonLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.2;
  controls.maxDistance = 6;
  controls.enableRotate = true;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  /** Throttle expensive per-frame work on subdiv 7 (~163k tiles). */
  let animTick = 0;
  let lastAnimRealMs = 0;
  /** First perf report ~1s at 60fps; dense globes use longer averaging window. */
  const framePerf = createFramePerfSamplerOrNoop(
    lastGlobePerfBucket === "veryDense" ? 120 : 60,
  );

  function animate() {
    requestAnimationFrame(animate);
    animTick++;
    const veryDenseAnim = lastGlobePerfBucket === "veryDense";
    framePerf.startFrame();
    controls.update();
    framePerf.slice("controls");

    const realNow = performance.now();
    if (lastAnimRealMs === 0) lastAnimRealMs = realNow;
    const dtRealSec = Math.min((realNow - lastAnimRealMs) / 1000, 0.25);
    lastAnimRealMs = realNow;

    if (state.timePlaying) {
      playbackEpochMs += dtRealSec * state.timePlaySpeed * 1000;
      const wd = new Date(playbackEpochMs);
      state.dateTimeStr = dateToDatetimeLocalUTC(wd);
      if (panelDateTimeInput) panelDateTimeInput.value = state.dateTimeStr;
    }
    framePerf.slice("timePlayback");

    let date = datetimeLocalUTCToDate(
      state.dateTimeStr || dateToDatetimeLocalUTC(new Date()),
    );
    if (Number.isNaN(date.getTime())) {
      date = new Date();
      state.dateTimeStr = dateToDatetimeLocalUTC(date);
      if (panelDateTimeInput) panelDateTimeInput.value = state.dateTimeStr;
    }
    const gmstRad = dateToGreenwichMeanSiderealTimeRad(date);
    starfield.update(camera, gmstRad);
    if (planetsUpdate) planetsUpdate(date);
    framePerf.slice("starfieldPlanets");
    const sunDir = sunDirectionFromDate(date);
    skyDome.update(sunDir, camera.position);
    sun.directional.position.copy(sunDir).multiplyScalar(3500);
    sun.directional.target.position.set(0, 0, 0);
    const camUp = camera.position.lengthSq() < 1e-6
      ? new THREE.Vector3(0, 1, 0)
      : camera.position.clone().normalize();
    const sunAltitudeFromCamera = sunDir.dot(camUp);
    const sunriseRed = 1 - Math.max(0, Math.min(1, (sunAltitudeFromCamera + 0.1) / 0.5));
    sun.directional.color.lerpColors(
      new THREE.Color(0xfff5e6),
      new THREE.Color(0xff6b2b),
      sunriseRed,
    );
    if (sun.sphere) {
      sun.sphere.position.copy(sun.directional.position);
      (sun.sphere.material as THREE.MeshBasicMaterial).color.lerpColors(
        new THREE.Color(0xfff5e0),
        new THREE.Color(0xff8844),
        sunriseRed,
      );
    }
    if (sun.directional.castShadow && sun.directional.shadow) {
      const sc = sun.directional.shadow.camera;
      sc.position.copy(sun.directional.position);
      sc.lookAt(0, 0, 0);
      const sunDist = sun.directional.position.length();
      sc.near = 1;
      sc.far = sunDist + 10;
      sc.updateMatrixWorld(true);
    }
    const moonPos = moonPositionFromDate(date, moonDistance);
    moon.mesh.position.copy(moonPos);
    moonLight.position.copy(moonPos);
    framePerf.slice("sunSkyMoonShadowCam");
    if (water) {
      water.setCameraWorldPosition(camera.position);
      water.setSunDirection(sunDir);
      if (!veryDenseAnim || animTick % 2 === 0) water.update();
    }
    framePerf.slice("water");
    vegetationLayer?.update(camera);
    if (coastFoamOverlay) {
      coastFoamOverlay.setSunDirection(sunDir);
      if (!veryDenseAnim || animTick % 2 === 0) coastFoamOverlay.update();
    }
    framePerf.slice("vegetation");
    framePerf.slice("coastFoam");
    // Recompute wind and flow whenever date changes (currents follow wind)
    const windUtcMin = Math.floor(date.getTime() / 60000);
    if (
      globe &&
      windArrowsGroup &&
      globalTileTerrain &&
      windUtcMin !== lastWindUtcMinute
    ) {
      const tMinute0 = performance.now();
      lastWindUtcMinute = windUtcMin;
      updateWindFromState(state);
      if (riverFlowArrowsGroup || currentArrowsGroup) updateFlowFromState(state);
      if (precipitationOverlayGroup || cloudGroup)
        updatePrecipitationAndCloudsFromState(state);
      framePerf.addMinuteTickCpuMs(performance.now() - tMinute0);
    }
    framePerf.slice("windFlowPrecipCloudMinute");
    /** Visual-only cloud sync (physics runs on wind/precip minute tick + batched catch-up). */
    if (globe && cloudClipField && cloudGroup && state.showClouds) {
      const visUtc = getCloudVisualUtcMinutes(state, date);
      cloudClipField.syncThreeGroup(cloudGroup, globe, visUtc, camera);
    }
    framePerf.slice("cloudClipMeshSync");
    if (
      globe &&
      precipFxGroup &&
      cloudClipField &&
      state.showPrecipitation
    ) {
      const subsolar = dateToSubsolarPoint(date);
      updatePrecipitationParticles(
        precipFxGroup,
        globe,
        cloudClipField.getPrecipOverlayMap(),
        subsolar.latDeg,
        getCloudVisualUtcMinutes(state, date),
        performance.now() * 0.001,
        (id) => globalTileTerrain?.get(id)?.type,
        (id) => globalTileTerrain?.get(id)?.monthlyMeanTempC,
      );
      precipFxGroup.visible = true;
    } else if (precipFxGroup) {
      precipFxGroup.visible = false;
    }
    if (cloudGroup && (!veryDenseAnim || animTick % 4 === 0)) {
      sortLowPolyCloudsByCamera(cloudGroup, camera);
    }
    framePerf.slice("cloudDepthSort");
    if (sun.directional.castShadow && sun.directional.shadow) {
      sun.directional.shadow.camera.layers.enable(0);
      sun.directional.shadow.camera.layers.enable(1);
      sun.directional.shadow.needsUpdate = true;
    }
    framePerf.slice("shadowUniforms");
    /**
     * Land vertex weather (snow/wet/climate) must track the same clock as vegetation.
     * Floored UTC minutes alone miss subsolar changes within a minute during time playback —
     * trees refresh from {@link getTileSnowCover} while hexes stayed green until the minute rolled.
     */
    if (globe && globalTileTerrain) {
      const visInt = Math.floor(getCloudVisualUtcMinutes(state, date));
      if (visInt !== lastLandWeatherVisualMinute) {
        lastLandWeatherVisualMinute = visInt;
        markLandWeatherColorsDirty();
      }
      const epochSec = Math.floor(date.getTime() / 1000);
      if (epochSec !== lastLandWeatherPaintEpochSec) {
        lastLandWeatherPaintEpochSec = epochSec;
        markLandWeatherColorsDirty();
      }
    }
    flushLandWeatherVertexColorsIfDirty(state);
    framePerf.slice("landWeatherVertexColors");
    // Render directly to screen so shadow maps are applied (EffectComposer path can skip shadows).
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
    framePerf.slice("render");
    framePerf.endFrame(renderer, animTick);
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Collect all meshes to raycast against (globe + river geometry)
  function getClickTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = [];
    if (globe?.mesh) targets.push(globe.mesh);
    // River water now part of water table, raycast against terrain instead
    if (riverTerrainGroup) targets.push(riverTerrainGroup);
    return targets;
  }

  renderer.domElement.addEventListener("click", (event: MouseEvent) => {
    if (!globe?.mesh) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Raycast against all relevant meshes and take the nearest hit
    const targets = getClickTargets();
    const allIntersects: THREE.Intersection[] = [];
    for (const target of targets) {
      const hits = raycaster.intersectObject(target, true);
      allIntersects.push(...hits);
    }
    // Sort by distance to get nearest
    allIntersects.sort((a, b) => a.distance - b.distance);

    if (allIntersects.length > 0) {
      const dir = allIntersects[0].point.clone().normalize();
      const tileId = globe.getTileIdAtDirection(dir);
      const scale = globe.subdivisions;
      // Convert direction to lat/lon for verification
      const latRad = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      const lonRad = Math.atan2(dir.z, dir.x);
      const latDeg = (latRad * 180) / Math.PI;
      const lonDeg = (lonRad * 180) / Math.PI;
      const tileType = globalTileTerrain?.get(tileId)?.type ?? "unknown";
      const inRiverData = globalRiverEdgesByTile?.has(tileId) ?? false;
      console.log(
        "[globe-build] Hex clicked: tileId =",
        tileId,
        ", lat/lon =",
        latDeg.toFixed(2) + "°," + lonDeg.toFixed(2) + "°",
        ", type =",
        tileType,
        ", inRiverData =",
        inRiverData,
        ", scale =",
        scale,
      );
    }
  });

  // ========== DEBUG: Hex ID lookup panel ==========
  let highlightMesh: THREE.Mesh | null = null;
  let highlightedTileId: number | null = null;

  function createHighlightMesh(tile: GeodesicTile): THREE.Mesh {
    const n = tile.vertices.length;
    const center = tile.center.clone().normalize();
    const positions: number[] = [];
    const indices: number[] = [];

    // Lift slightly above the tile surface
    const lift = 1.008;

    // Center vertex
    positions.push(center.x * lift, center.y * lift, center.z * lift);

    // Edge vertices
    for (let i = 0; i < n; i++) {
      const v = tile.vertices[i].clone().normalize().multiplyScalar(lift);
      positions.push(v.x, v.y, v.z);
    }

    // Triangles (fan from center)
    for (let i = 0; i < n; i++) {
      indices.push(0, i + 1, ((i + 1) % n) + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });

    return new THREE.Mesh(geo, mat);
  }

  function zoomToTile(tileId: number) {
    const tile = globe.tiles.find((t) => t.id === tileId);
    if (!tile) {
      console.warn("[debug] Tile not found:", tileId);
      return;
    }

    // Remove old highlight
    if (highlightMesh) {
      scene.remove(highlightMesh);
      highlightMesh.geometry.dispose();
      (highlightMesh.material as THREE.Material).dispose();
    }

    // Add new highlight
    highlightMesh = createHighlightMesh(tile);
    scene.add(highlightMesh);
    highlightedTileId = tileId;

    // Calculate camera target position
    const center = tile.center.clone().normalize();
    const cameraDistance = 1.5; // Distance from globe center
    const targetPos = center.clone().multiplyScalar(cameraDistance);

    // Animate camera
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);
    const duration = 800; // ms
    const startTime = performance.now();

    function animateCamera() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    }
    animateCamera();

    // Log tile info
    const tileType = globalTileTerrain?.get(tileId)?.type ?? "unknown";
    const inRiverData = globalRiverEdgesByTile?.has(tileId) ?? false;
    const riverEdges = globalRiverEdgesByTile?.get(tileId);
    const latRad = Math.asin(THREE.MathUtils.clamp(center.y, -1, 1));
    const lonRad = Math.atan2(center.z, center.x);
    const latDeg = (latRad * 180) / Math.PI;
    const lonDeg = (lonRad * 180) / Math.PI;

    console.log(
      "[debug] Zoomed to tile:",
      tileId,
      "\n  lat/lon:",
      latDeg.toFixed(2) + "°, " + lonDeg.toFixed(2) + "°",
      "\n  type:",
      tileType,
      "\n  inRiverData:",
      inRiverData,
      riverEdges ? "\n  riverEdges: [" + [...riverEdges].join(", ") + "]" : "",
    );
  }

  // Create debug panel UI
  const debugPanel = document.createElement("div");
  debugPanel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 14px;
    z-index: 1000;
  `;
  debugPanel.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: bold;">Hex Debug</div>
    <input type="number" id="hexIdInput" placeholder="Enter hex ID" 
      style="width: 120px; padding: 6px; border: none; border-radius: 4px; margin-right: 8px;">
    <button id="hexGoBtn" style="padding: 6px 12px; border: none; border-radius: 4px; background: #ff00ff; color: white; cursor: pointer;">
      Go
    </button>
    <div id="hexInfo" style="margin-top: 8px; font-size: 12px; color: #aaa;"></div>
  `;
  document.body.appendChild(debugPanel);

  const hexIdInput = document.getElementById("hexIdInput") as HTMLInputElement;
  const hexGoBtn = document.getElementById("hexGoBtn") as HTMLButtonElement;
  const hexInfo = document.getElementById("hexInfo") as HTMLDivElement;

  /** Format hex debug line: elevation, wind, river flow (when in river). */
  function formatHexInfo(tileId: number): string {
    const terrain = globalTileTerrain?.get(tileId);
    const tileType = terrain?.type ?? "?";
    const inRiver = globalRiverEdgesByTile?.has(tileId) ?? false;
    const elev = terrain?.elevation;
    const elevStr = elev != null ? `${elev.toFixed(3)} (globe)` : "—";
    const wind = globalWindByTile?.get(tileId);
    let windStr = "—";
    if (wind) {
      const compassDeg = (90 - (wind.directionRad * 180) / Math.PI + 360) % 360;
      const dirLabel = compassDeg < 22.5 ? "N" : compassDeg < 67.5 ? "NE" : compassDeg < 112.5 ? "E" : compassDeg < 157.5 ? "SE" : compassDeg < 202.5 ? "S" : compassDeg < 247.5 ? "SW" : compassDeg < 292.5 ? "W" : compassDeg < 337.5 ? "NW" : "N";
      windStr = `from ${compassDeg.toFixed(0)}° (${dirLabel}), ${(wind.strength * 15).toFixed(1)} m/s`;
    }
    const flow = globalFlowByTile?.get(tileId);
    const flowStr = flow
      ? `${((flow.directionRad * 180) / Math.PI).toFixed(0)}°, str ${flow.strength.toFixed(2)}`
      : "—";
    return `ID: ${tileId}<br>Type: ${tileType}<br>River: ${inRiver}<br>Flow: ${flowStr}<br>Elevation: ${elevStr}<br>Wind: ${windStr}`;
  }

  function goToHex() {
    const id = parseInt(hexIdInput.value, 10);
    if (isNaN(id)) {
      hexInfo.textContent = "Invalid ID";
      return;
    }
    const tile = globe.tiles.find((t) => t.id === id);
    if (!tile) {
      hexInfo.textContent = `Tile ${id} not found (max: ${globe.tiles.length - 1})`;
      return;
    }
    zoomToTile(id);
    hexInfo.innerHTML = formatHexInfo(id);
  }

  hexGoBtn.addEventListener("click", goToHex);
  hexIdInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") goToHex();
  });

  // Also update highlight when clicking on a tile
  renderer.domElement.addEventListener("click", (event: MouseEvent) => {
    if (!globe?.mesh) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Raycast against all relevant meshes
    const targets = getClickTargets();
    const allIntersects: THREE.Intersection[] = [];
    for (const target of targets) {
      const hits = raycaster.intersectObject(target, true);
      allIntersects.push(...hits);
    }
    allIntersects.sort((a, b) => a.distance - b.distance);

    if (allIntersects.length > 0) {
      const dir = allIntersects[0].point.clone().normalize();
      const tileId = globe.getTileIdAtDirection(dir);
      // Update input and highlight
      hexIdInput.value = String(tileId);
      const tile = globe.tiles.find((t) => t.id === tileId);
      if (tile && highlightedTileId !== tileId) {
        if (highlightMesh) {
          scene.remove(highlightMesh);
          highlightMesh.geometry.dispose();
          (highlightMesh.material as THREE.Material).dispose();
        }
        highlightMesh = createHighlightMesh(tile);
        scene.add(highlightMesh);
        highlightedTileId = tileId;
      }
      hexInfo.innerHTML = formatHexInfo(tileId);
    }
  });
  // ========== END DEBUG PANEL ==========

  window.addEventListener("resize", () => {
    const w = innerWidth;
    const h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const cap =
      lastGlobePerfBucket === "veryDense"
        ? 0.85
        : lastGlobePerfBucket === "dense"
          ? 1.35
          : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    renderer.setSize(w, h);
  });
  animate();
}
init().catch((e) => {
  console.error("[Earth init]", e);
});
