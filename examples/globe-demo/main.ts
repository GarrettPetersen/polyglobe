import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/Lensflare.js";
import * as topojson from "topojson-client";
import * as JSZipNS from "jszip";
const JSZip = (JSZipNS as unknown as { default: typeof JSZipNS }).default ?? JSZipNS;
import {
  Globe,
  Sun,
  Atmosphere,
  WaterSphere,
  Starfield,
  createGeodesicGeometryFlat,
  updateFlatGeometryFromTerrain,
  applyTerrainColorsToGeometry,
  applyVertexColorsByTileId,
  applyTerrainToGeometry,
  createCoastMaskTexture,
  createCoastLandMaskTexture,
  CoastFoamOverlay,
  buildTerrainFromEarthRaster,
  earthRasterFromImageData,
  applyCoastalBeach,
  computeWaterLevelsByBody,
  geometryWaterSurfacePatch,
  parseKoppenAsciiGrid,
  applyPreset,
  getPreset,
  placeObject,
  getEdgeNeighbor,
  tileCenterToLatLon,
  traceRiverThroughTiles,
  getRiverEdgesByTile,
  pruneThreeWayRiverJunctions,
  connectIsolatedRiverTiles,
  symmetrizeRiverNeighborEdgesUntilStable,
  createRiverMeshFromTileEdges,
  createRiverTerrainMeshes,
  updateRiverMaterialTime,
  TERRAIN_STYLES,
  type TileTerrainData,
  type EarthRaster,
  type ClimateGrid,
  type GeodesicTile,
  type RegionScores,
  type RasterWindow,
  parseElevationBin,
} from "polyglobe";
import { EARTH_GLOBE_CACHE_VERSION } from "./earthGlobeCacheVersion";

console.log("[globe-build] demo main.ts loaded");

const EARTH_GLOBE_CACHE_URL = "/earth-globe-cache.json";

type EarthGlobeCacheFile = {
  version: string;
  subdivisions: number;
  tileCount: number;
  tiles: Array<{ id: number; t: string; e: number; l?: number }>;
  peaks: [number, number][];
  riverEdges: Record<string, number[]>;
  riverEdgeToWater: Record<string, number[]>;
};

async function fetchEarthGlobeCache(): Promise<EarthGlobeCacheFile | null> {
  if (typeof window !== "undefined" && /[?&]noEarthCache=1/i.test(window.location.search)) {
    return null;
  }
  try {
    const res = await fetch(EARTH_GLOBE_CACHE_URL);
    if (!res.ok) return null;
    const j = (await res.json()) as EarthGlobeCacheFile;
    if (j.version !== EARTH_GLOBE_CACHE_VERSION || j.subdivisions !== 6 || !Array.isArray(j.tiles)) {
      return null;
    }
    return j;
  } catch {
    return null;
  }
}

/** All geography data is loaded from public/ (run npm run download-data once, then commit public/). */
const EARTH_LAND_TOPOLOGY_URL = "/land-50m.json";
const EARTH_REGION_GRID_BIN = "/earth-region-grid.bin";
const EARTH_LAKES_GEOJSON_URL = "/ne_110m_lakes.json";
const EARTH_MARINE_POLYS_URL = "/ne_110m_geography_marine_polys.json";
const KOPPEN_BIN_SAME_ORIGIN = "/koppen.bin";
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
    -cosLat * Math.sin(lonRad)
  );
  return dir.normalize();
}

export interface DemoState {
  useEarth: boolean;
  subdivisions: number;
  sunLongitude: number;
  sunLatitude: number;
  moonLongitude: number;
  moonLatitude: number;
  landFraction: number;
  blobiness: number;
  seed: number;
}

const DEFAULT_STATE: DemoState = {
  useEarth: true,
  subdivisions: 6,
  sunLongitude: 0.6,
  sunLatitude: 0.35,
  moonLongitude: -0.6,
  moonLatitude: -0.5,
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
  state: DemoState
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
  const midLandTypes: TileTerrainData["type"][] = ["land", "forest", "mountain", "grassland"];
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
    const hasLandNeighbor = tiles[i].neighbors.some((n) => tileTerrain.get(n)?.type !== "water");
    if (hasLandNeighbor) tileTerrain.set(i, { ...data, type: "beach" });
  }
  return tileTerrain;
}

/** Build a simple land/water terrain map from a landMask (0..1) for progressive display. */
function terrainFromLandMask(
  landMask: Float32Array,
  tiles: GeodesicTile[],
  landFraction: number
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
  onProgress: (intermediate: Map<number, TileTerrainData>) => Promise<void>
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
    console.log(BUILD_LOG, "Procedural: blob iteration", iter + 1, "/", state.blobiness);
    const intermediate = terrainFromLandMask(landMask, tiles, state.landFraction);
    await onProgress(intermediate);
  }
  console.log(BUILD_LOG, "Procedural: deriving final terrain types");
  const landThreshold = state.landFraction;
  const tileTerrain = new Map<number, TileTerrainData>();
  const midLandTypes: TileTerrainData["type"][] = ["land", "forest", "mountain", "grassland"];
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
    const hasLandNeighbor = tiles[i].neighbors.some((n) => tileTerrain.get(n)?.type !== "water");
    if (hasLandNeighbor) tileTerrain.set(i, { ...data, type: "beach" });
  }
  return tileTerrain;
}

const TERRAIN_ANIMATION_FRAMES = 28;
const TERRAIN_ANIMATION_EASING = (t: number) => t * (2 - t); // ease-out quadratic

/** Return a set of tile IDs that have peaks (for geometry layout comparison). */
function getPeakTileSet(
  peakTiles: Map<number, number> | undefined
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
  riverEdgeToWaterByTile?: Map<number, Set<number>>
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
    console.log(BUILD_LOG, "TerrainTransition: river bowls, setting geometry once (no animation)");
    setGlobeGeometryFromTerrain(
      globe,
      nextTerrain,
      peakTilesNext ?? undefined,
      elevationScale,
      peakElevationScale,
      minLandElevation,
      riverEdgesByTile,
      riverEdgeToWaterByTile
    );
    return;
  }

  if (peakSetChanged && peakTilesNext != null) {
    console.log(BUILD_LOG, "TerrainTransition: peak set changed, replacing geometry (no animation)");
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
      const list = [...elevatedSeaTiles.entries()].map(([tid, elev]) => `tile ${tid} elev ${elev.toFixed(4)}`).join(", ");
      console.warn(BUILD_LOG, "Sea bottom hex(es) drawn above submerged level (", MAX_SEA_BED_ELEVATION, "):", list);
    }
    applyTerrainColorsToGeometry(geom, nextTerrain);
    globe.mesh.geometry.dispose();
    globe.mesh.geometry = geom;
    return;
  }

  console.log(BUILD_LOG, "TerrainTransition: animating", TERRAIN_ANIMATION_FRAMES + 1, "frames");
  const colorPrev = new THREE.Color();
  const colorNext = new THREE.Color();

  for (let frame = 0; frame <= TERRAIN_ANIMATION_FRAMES; frame++) {
    if (frame % 7 === 0 || frame === TERRAIN_ANIMATION_FRAMES) {
      console.log(BUILD_LOG, "TerrainTransition: frame", frame, "/", TERRAIN_ANIMATION_FRAMES);
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
      const styleA = a ? TERRAIN_STYLES[a.type].color : TERRAIN_STYLES.water.color;
      const styleB = b ? TERRAIN_STYLES[b.type].color : TERRAIN_STYLES.water.color;
      colorPrev.set(styleA);
      colorNext.set(styleB);
      colorPrev.lerp(colorNext, t);
      return colorPrev;
    });
    await yieldToMain();
  }
}

type GeoJSONPolygon = { type: "Polygon"; coordinates: number[][][] };
type GeoJSONMultiPolygon = { type: "MultiPolygon"; coordinates: number[][][][] };
type GeoJSONGeometry = GeoJSONPolygon | GeoJSONMultiPolygon | { type: "GeometryCollection"; geometries: GeoJSONGeometry[] };

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
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
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
  toY: (lat: number) => number
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
  toY: (lat: number) => number
): void {
  const rawD = toLon - fromLon;
  if (rawD > 180) {
    const totalShort = 360 - rawD;
    const distToCross = fromLon - (-180);
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
  toY: (lat: number) => number
): void {
  if (ring.length < 3) return;
  if (isExterior && isArtifactGlobeLine(ring)) return;
  const r = rewindRing(ring, isExterior);
  const [first, ...rest] = r;
  ctx.moveTo(toX(first[0]), toY(first[1]));
  let prevLon = first[0], prevLat = first[1];
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
  toY: (lat: number) => number
): void {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometry(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    geom.coordinates.forEach((ring, i) => drawRing(ctx, ring, i === 0, toX, toY));
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
  toY: (lat: number) => number
): void {
  if (geom.type === "GeometryCollection") {
    for (const g of geom.geometries) drawGeometryUnwrapped(ctx, g, toX, toY);
    return;
  }
  if (geom.type === "Polygon") {
    ctx.beginPath();
    geom.coordinates.forEach((ring, i) => drawRingUnwrapped(ctx, ring, i === 0, toX, toY));
    ctx.fill("nonzero");
    return;
  }
  if (geom.type === "MultiPolygon") {
    ctx.beginPath();
    for (const polygon of geom.coordinates) {
      polygon.forEach((ring, i) => drawRingUnwrapped(ctx, ring, i === 0, toX, toY));
    }
    ctx.fill("nonzero");
  }
}

/**
 * Point-in-polygon via ray casting. Edges that cross the antimeridian (|Δlon| > 180°) are
 * treated as the short path (two segments at ±180°) so land/water is correct for any lon.
 */
/** Test if horizontal ray from (px, py) eastward intersects segment (xa,ya)-(xb,yb); count once if so. */
function segmentCrossesRay(xa: number, ya: number, xb: number, yb: number, px: number, py: number): boolean {
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

function pointInRing(ring: number[][], lonDeg: number, latDeg: number): boolean {
  return rayCrossingCount(ring, lonDeg, latDeg) % 2 === 1;
}

function pointInPolygon(polygon: number[][][], lonDeg: number, latDeg: number): boolean {
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
    const fc = (await res.json()) as { type: string; features?: Array<{ geometry: GeoJSONGeometry; properties?: { featurecla?: string } }> };
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
  lakePolygons: number[][][][]
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
  lakePolygons: number[][][][]
): Uint32Array {
  const n = TOPO_GRID_W * TOPO_GRID_H;
  const isLand = new Uint8Array(n);
  for (let j = 0; j < TOPO_GRID_H; j++) {
    const lat = (TOPO_GRID_H - 1) > 0 ? 90 - (180 * j) / (TOPO_GRID_H - 1) : 0;
    const inSouthCap = lat <= SOUTH_POLE_CAP_LAT;
    for (let i = 0; i < TOPO_GRID_W; i++) {
      const lon = (TOPO_GRID_W - 1) > 0 ? -180 + (360 * i) / (TOPO_GRID_W - 1) : 0;
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
        if (ni < 0 || ni >= TOPO_GRID_W || nj < 0 || nj >= TOPO_GRID_H) continue;
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
  waterRegionId: Uint32Array
): (latRad: number, lonRad: number) => { land: boolean; landPolygonIndex?: number; waterRegionId?: number } {
  return (latRad: number, lonRad: number) => {
    const latDeg = (latRad * 180) / Math.PI;
    const lonDeg = (lonRad * 180) / Math.PI;
    if (latDeg <= SOUTH_POLE_CAP_LAT) {
      return { land: true, landPolygonIndex: 0 };
    }
    for (const poly of lakePolygons) {
      if (pointInPolygon(poly, lonDeg, latDeg)) {
        const i = Math.max(0, Math.min(TOPO_GRID_W - 1, Math.round(((lonDeg + 180) / 360) * (TOPO_GRID_W - 1))));
        const j = Math.max(0, Math.min(TOPO_GRID_H - 1, Math.round(((90 - latDeg) / 180) * (TOPO_GRID_H - 1))));
        const wid = waterRegionId[j * TOPO_GRID_W + i];
        return { land: false, waterRegionId: wid || undefined };
      }
    }
    for (let pi = 0; pi < landPolygons.length; pi++) {
      if (pointInPolygon(landPolygons[pi], lonDeg, latDeg)) {
        return { land: true, landPolygonIndex: pi };
      }
    }
    const i = Math.max(0, Math.min(TOPO_GRID_W - 1, Math.round(((lonDeg + 180) / 360) * (TOPO_GRID_W - 1))));
    const j = Math.max(0, Math.min(TOPO_GRID_H - 1, Math.round(((90 - latDeg) / 180) * (TOPO_GRID_H - 1))));
    const wid = waterRegionId[j * TOPO_GRID_W + i];
    return { land: false, waterRegionId: wid || undefined };
  };
}

export type TopologySampler = (
  latRad: number,
  lonRad: number
) => { land: boolean; landPolygonIndex?: number; waterRegionId?: number };

const REGION_GRID_W = 360;
const REGION_GRID_H = 180;

/** 8-connected components with x-wraparound (antimeridian). Filled cells (data[idx] !== 0) get id 1..N; rest 0. */
function connectedComponentsWrap(
  data: Uint8Array,
  width: number,
  height: number
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
  landRaster?: Uint8Array
): Uint32Array {
  const out = new Uint32Array(width * height);
  for (let j = 0; j < height; j++) {
    const lat = (height - 1) > 0 ? 90 - (180 * j) / (height - 1) : 0;
    if (lat <= SOUTH_POLE_CAP_LAT) continue;
    for (let i = 0; i < width; i++) {
      const idx = j * width + i;
      if (landRaster != null && landRaster[idx] !== 0) continue;
      const lon = (width - 1) > 0 ? -180 + (360 * i) / (width - 1) : 0;
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
  height: number
): (tile: GeodesicTile) => RegionScores {
  return (tile: GeodesicTile) => {
    const points: { lat: number; lon: number }[] = [tileCenterToLatLon(tile.center)];
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
      const i = Math.max(0, Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))));
      const j = Math.max(0, Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))));
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
    for (const [id, count] of landmassCounts) landmassFractions.set(id, count / n);
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
  landData: Uint8Array
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
  lakePolygons: number[][][][]
): (tile: GeodesicTile) => RegionScores {
  return (tile: GeodesicTile) => {
    const points: { lat: number; lon: number }[] = [tileCenterToLatLon(tile.center)];
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
      const i = Math.max(0, Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))));
      const j = Math.max(0, Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))));
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
    for (const [id, count] of landmassCounts) landmassFractions.set(id, count / n);
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
        const lakes = (await lakesRes.json()) as { features?: Array<{ geometry: GeoJSONGeometry }> };
        if (lakes.features) {
          for (const f of lakes.features) {
            if (f.geometry) lakePolygons = lakePolygons.concat(collectLakePolygons(f.geometry));
          }
        }
      }
    } catch {
      /* optional */
    }
    const marinePolygons = await loadMarineSeaBayPolygons();
    lakePolygons = lakePolygons.concat(marinePolygons);
    const getRegionScores = createRegionScorerFromBin(landmassId, oceanRegionId, width, height, lakePolygons);
    const landSampler = (latRad: number, lonRad: number) => {
      const latDeg = (latRad * 180) / Math.PI;
      const lonDeg = (lonRad * 180) / Math.PI;
      const i = Math.max(0, Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))));
      const j = Math.max(0, Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))));
      return landmassId[j * width + i] !== 0;
    };
    const topologySampler: TopologySampler = (latRad: number, lonRad: number) => {
      const land = landSampler(latRad, lonRad);
      const latDeg = (latRad * 180) / Math.PI;
      const lonDeg = (lonRad * 180) / Math.PI;
      const i = Math.max(0, Math.min(width - 1, Math.round(((lonDeg + 180) / 360) * (width - 1))));
      const j = Math.max(0, Math.min(height - 1, Math.round(((90 - latDeg) / 180) * (height - 1))));
      const oceanId = oceanRegionId[j * width + i];
      return { land, landPolygonIndex: land ? 0 : undefined, waterRegionId: land ? undefined : oceanId || 1 };
    };
    const rasterData = new Uint8Array(n);
    for (let idx = 0; idx < n; idx++) rasterData[idx] = landmassId[idx] !== 0 ? 255 : 0;
    const raster: EarthRaster = { width, height, data: rasterData };
    const getRasterWindow = createGetRasterWindow(width, height, rasterData);
    console.log("[Earth raster] Loaded precomputed region grid", width, "×", height, "(sample only where needed)");
    return { raster, landSampler, topologySampler, getRegionScores, getRasterWindow };
  }

  const res = await fetch(EARTH_LAND_TOPOLOGY_URL);
  const topology = (await res.json()) as Parameters<typeof topojson.feature>[0] & {
    objects?: Record<string, unknown>;
    bbox?: number[];
  };
  const objNames = topology.objects ? Object.keys(topology.objects) : [];
  console.log("[Earth raster] Topology objects:", objNames, "bbox:", topology.bbox ?? "(none)");
  const land = topojson.feature(topology, topology.objects.land) as {
    type: string;
    geometry?: GeoJSONGeometry;
    features?: Array<{ geometry: GeoJSONGeometry }>;
  };

  const landGeom = land.features
    ? ({ type: "GeometryCollection" as const, geometries: land.features.map((f) => f.geometry) } as GeoJSONGeometry)
    : land.geometry!;
  const landPolygons = collectLandPolygons(landGeom);

  let lakePolygons: number[][][][] = [];
  try {
    const lakesRes = await fetch(EARTH_LAKES_GEOJSON_URL);
    if (lakesRes.ok) {
      const lakes = (await lakesRes.json()) as { type: string; features?: Array<{ geometry: GeoJSONGeometry }> };
      if (lakes.features) {
        for (const f of lakes.features) {
          if (f.geometry) lakePolygons = lakePolygons.concat(collectLakePolygons(f.geometry));
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
    topologySampler = createTopologySampler(landPolygons, lakePolygons, waterRegionId);
  } catch (e) {
    console.warn("[loadEarthLandRaster] topologySampler build failed, using landSampler only:", e);
    topologySampler = (latRad: number, lonRad: number) => {
      const land = landSampler(latRad, lonRad);
      return { land, landPolygonIndex: land ? 0 : undefined, waterRegionId: land ? undefined : 1 };
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
    Math.max(0, Math.min(wideWidth - 1, (lon + 540) * (wideWidth - 1) / 1080));
  const toY = (lat: number) =>
    Math.max(0, Math.min(height - 1, ((90 - lat) / 180) * (height - 1)));
  if (land.features) {
    for (const f of land.features) drawGeometryUnwrapped(ctx, f.geometry, toX, toY);
  } else if (land.geometry) {
    drawGeometryUnwrapped(ctx, land.geometry, toX, toY);
  }
  try {
    const lakesRes = await fetch(EARTH_LAKES_GEOJSON_URL);
    if (lakesRes.ok) {
      const lakes = (await lakesRes.json()) as { type: string; features?: Array<{ geometry: GeoJSONGeometry }> };
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
    drawGeometryUnwrapped(ctx, { type: "Polygon", coordinates: poly } as GeoJSONGeometry, toX, toY);
  }
  const wideData = ctx.getImageData(0, 0, wideWidth, height);
  const collapsed = new ImageData(width, height);
  const scale = (wideWidth - 1) / 1080;
  for (let j = 0; j < height; j++) {
    const lat = (height - 1) > 0 ? 90 - (180 * j) / (height - 1) : 0;
    const inSouthCap = lat <= SOUTH_POLE_CAP_LAT;
    for (let i = 0; i < width; i++) {
      const lon = (width - 1) > 0 ? -180 + (360 * i) / (width - 1) : 0;
      const xLeft = Math.max(0, Math.min(wideWidth - 1, Math.round((lon + 180) * scale)));
      const xCenter = Math.max(0, Math.min(wideWidth - 1, Math.round((lon + 540) * scale)));
      const xRight = Math.max(0, Math.min(wideWidth - 1, Math.round((lon + 900) * scale)));
      const landLeft = (wideData.data[(j * wideWidth + xLeft) * 4] ?? 0) >= 128;
      const landCenter = (wideData.data[(j * wideWidth + xCenter) * 4] ?? 0) >= 128;
      const landRight = (wideData.data[(j * wideWidth + xRight) * 4] ?? 0) >= 128;
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
  const getRegionScores = createRegionScorer(landmassId, oceanRegionId, lakeIdGrid, width, height);

  if (typeof window !== "undefined" && /[?&]showRaster=1/i.test(window.location.search)) {
    const debugCanvas = document.createElement("canvas");
    debugCanvas.width = width;
    debugCanvas.height = height;
    debugCanvas.title = "Land raster (white=land, black=water). Close or remove ?showRaster=1.";
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
    console.log("[Earth raster] Debug view visible. Remove ?showRaster=1 to hide.");
  }
  const getRasterWindow = createGetRasterWindow(raster.width, raster.height, raster.data);
  return { raster, landSampler, topologySampler, getRegionScores, getRasterWindow };
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030508);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
const starfield = new Starfield({
  density: 70,
  sparsity: 0.12,
  twinkleSpeed: 0.5,
  twinkleAmount: 0.5,
  color: 0xf0f4ff,
});
starfield.attachToCamera(camera);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
document.body.appendChild(renderer.domElement);

let globe: Globe;
let water: WaterSphere;
let coastFoamOverlay: CoastFoamOverlay;
let coastMaskTexture: THREE.DataTexture;
let coastLandMaskTexture: THREE.DataTexture;
let controls: OrbitControls;
let marker: THREE.Mesh;
let earthRaster: EarthRaster | null = null;
let earthLandSampler: ((latRad: number, lonRad: number) => boolean) | null = null;
let earthTopologySampler: TopologySampler | null = null;
let earthGetRegionScores: ((tile: GeodesicTile) => RegionScores) | null = null;
let earthGetRasterWindow: ((tile: GeodesicTile) => RasterWindow | null) | null = null;
/** Loaded from /mountains.json; used for 3D peak geometry (pyramid tiles) in Earth mode. */
let mountainsList: MountainEntry[] | null = null;
/** River/lake centerline polylines [lon, lat] in degrees; from ne_10m_rivers_lake_centerlines.json. Used for river channel in Earth mode. */
let riverLinesLonLat: number[][][] | null = null;
/** Parallel to riverLinesLonLat: true if that line is a delta branch (e.g. Rosetta/Damietta) and should prefer sea over other river. */
let riverLineIsDelta: boolean[] | null = null;
/** River mesh in Earth mode; updated each frame for wave animation. */
let riverMesh: THREE.Mesh | null = null;
/** U-shaped river banks + bed (land mesh); separate from transparent water ribbon. */
let riverTerrainGroup: THREE.Group | null = null;
/** Lake water surfaces (share ocean water material) in Earth mode. */
let lakeWaterMeshes: THREE.Mesh[] = [];

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
function yieldForRender(delayMs: number = RESOLVE_ITERATION_DELAY_MS): Promise<void> {
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
  const lon = s.sunLongitude * Math.PI;
  const lat = s.sunLatitude * Math.PI * 0.5;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  ).normalize();
}

function moonPositionFromState(s: DemoState, distance: number): THREE.Vector3 {
  const lon = s.moonLongitude * Math.PI;
  const lat = s.moonLatitude * Math.PI * 0.5;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon)
  ).normalize().multiplyScalar(distance);
}

function createFlareTexture(size: number, soft: boolean = true): THREE.CanvasTexture {
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
  riverEdgeToWaterByTile?: Map<number, Set<number>>
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
  if (riverEdgesByTile != null && riverEdgesByTile.size > 0) {
    opts.getRiverEdges = (id) => riverEdgesByTile.get(id);
    opts.getRiverEdgeToWater = riverEdgeToWaterByTile ? (id) => riverEdgeToWaterByTile.get(id) : undefined;
    opts.riverBowlDepth = 0.012;
    opts.riverBowlInnerScale = 0.48;
  }
  const geom = createGeodesicGeometryFlat(globe.tiles, opts);
  if (elevatedSeaTiles.size > 0) {
    const list = [...elevatedSeaTiles.entries()].map(([tid, elev]) => `tile ${tid} elev ${elev.toFixed(4)}`).join(", ");
    console.warn(BUILD_LOG, "Sea bottom hex(es) drawn above submerged level (", MAX_SEA_BED_ELEVATION, "):", list);
  }
  applyTerrainColorsToGeometry(geom, tileTerrain);
  if (globe.mesh.geometry) globe.mesh.geometry.dispose();
  globe.mesh.geometry = geom;
  globe.mesh.renderOrder = 0;
}

async function buildWorldAsync(state: DemoState): Promise<void> {
  console.log(BUILD_LOG, "buildWorldAsync start", state.useEarth ? "Earth" : "procedural", "subdivisions:", state.subdivisions);
  setLoading(true);
  try {
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
    if (riverMesh) {
      scene.remove(riverMesh);
      riverMesh.geometry.dispose();
      (riverMesh.material as THREE.Material).dispose();
      riverMesh = null;
    }
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
    for (const m of lakeWaterMeshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    lakeWaterMeshes = [];
    if (marker) scene.remove(marker);
    await yieldToMain();

    console.log(BUILD_LOG, "create Globe, add base water terrain");
    globe = new Globe({ radius: 1, subdivisions: state.subdivisions });
    (globe.mesh as THREE.Mesh).material.dispose();
    (globe.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide,
    });
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
    setGlobeGeometryFromTerrain(globe, baseTerrain, undefined, elevationScale, peakElevationScale);
    await yieldToMain();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    let tileTerrain: Map<number, TileTerrainData>;
    let lastDisplayedTerrain = baseTerrain;
    let peakTiles: Map<number, number> | undefined;

    let riverEdgesByTile: Map<number, Set<number>> | undefined;
    let riverEdgeToWaterByTile: Map<number, Set<number>> | undefined;

    if (state.useEarth && earthRaster) {
      const cache = state.subdivisions === 6 ? await fetchEarthGlobeCache() : null;
      const cacheOk =
        cache != null &&
        cache.tileCount === globe.tileCount &&
        cache.tiles.length === globe.tileCount;

      if (cacheOk) {
        console.log(BUILD_LOG, "Earth: using", EARTH_GLOBE_CACHE_URL, "(version", cache.version, ")");
        tileTerrain = new Map();
        for (const row of cache.tiles) {
          tileTerrain.set(row.id, {
            tileId: row.id,
            type: row.t as TileTerrainData["type"],
            elevation: row.e,
            ...(row.l != null ? { lakeId: row.l } : {}),
          });
        }
        peakTiles = new Map(cache.peaks);
        riverEdgesByTile = new Map();
        for (const [k, arr] of Object.entries(cache.riverEdges)) {
          riverEdgesByTile.set(Number(k), new Set(arr));
        }
        const jn = pruneThreeWayRiverJunctions(riverEdgesByTile, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        if (jn > 0) console.log(BUILD_LOG, "pruned", jn, "3-way river junction edges (cache)");
        let sym = symmetrizeRiverNeighborEdgesUntilStable(riverEdgesByTile, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        const iso = connectIsolatedRiverTiles(riverEdgesByTile, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        if (iso > 0) console.log(BUILD_LOG, "connected", iso, "orphan river tile edges (cache)");
        sym += symmetrizeRiverNeighborEdgesUntilStable(riverEdgesByTile, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        if (sym > 0) console.log(BUILD_LOG, "symmetrized", sym, "river neighbor edges (cache)");
        if (riverEdgesByTile.size === 0) {
          riverEdgesByTile = undefined;
        } else {
          riverEdgeToWaterByTile = new Map();
          for (const [k, arr] of Object.entries(cache.riverEdgeToWater)) {
            riverEdgeToWaterByTile.set(Number(k), new Set(arr));
          }
          if (riverEdgeToWaterByTile.size === 0) riverEdgeToWaterByTile = undefined;
        }
      } else {
        if (state.subdivisions === 6 && cache == null) {
          console.log(
            BUILD_LOG,
            "Earth: no matching cache (run npm run build-earth-globe-cache); use ?noEarthCache=1 to force full recompute"
          );
        }
        console.log(BUILD_LOG, "Earth: buildTerrainFromEarthRaster start (tiles:", globe.tileCount, ")");
        try {
          tileTerrain = await buildTerrainFromEarthRaster(globe.tiles, earthRaster, {
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
              knownStraitTileIds: globe.subdivisions === 6 ? new Set([40361, 24757, 4129, 25328]) : undefined,
              onIteration: async (_iteration, landByTile) => {
                const terrain = new Map<number, TileTerrainData>();
                for (const [tid, lw] of landByTile) {
                  const isLand = lw.isLand;
                  const elev = isLand ? SEA_LEVEL_LAND_ELEVATION : (lw.lakeId != null ? LAKE_ELEVATION - 0.01 : MAX_SEA_BED_ELEVATION);
                  terrain.set(tid, {
                    tileId: tid,
                    type: isLand ? "land" : "water",
                    elevation: elev,
                  });
                }
                setGlobeGeometryFromTerrain(globe, terrain, undefined, elevationScale, peakElevationScale, SEA_LEVEL_LAND_ELEVATION);
                await yieldForRender();
              },
            },
          });
          applyCoastalBeach(globe.tiles, tileTerrain);
          console.log(BUILD_LOG, "Earth: buildTerrainFromEarthRaster done");
        } catch (e) {
          console.error(BUILD_LOG, "buildTerrainFromEarthRaster", e);
          throw e;
        }
        if (mountainsList && mountainsList.length > 0) {
          console.log(BUILD_LOG, "Earth: computing peak tiles from mountain list");
          const targetDistinctTiles = Math.max(24, Math.floor(globe.tileCount / 20));
          peakTiles = new Map<number, number>();
          for (const m of mountainsList) {
            if (peakTiles.size >= targetDistinctTiles) break;
            const dir = latLonDegToDirection(m.lat, m.lon);
            const tileId = globe.getTileIdAtDirection(dir);
            const existing = peakTiles.get(tileId) ?? 0;
            if (m.elevationM > existing) peakTiles.set(tileId, m.elevationM);
          }
          console.log(BUILD_LOG, "Earth: peaks done, count:", peakTiles?.size ?? 0);
        }
        riverEdgesByTile = undefined;
        riverEdgeToWaterByTile = undefined;
        if (riverLinesLonLat && riverLinesLonLat.length > 0) {
          const riverSegments: ReturnType<typeof traceRiverThroughTiles> = [];
          const isDeltaByLine = riverLineIsDelta ?? riverLinesLonLat.map(() => false);
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
            const jn2 = pruneThreeWayRiverJunctions(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
            if (jn2 > 0) console.log(BUILD_LOG, "pruned", jn2, "3-way river junction edges");
            let symR = symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
            const iso2 = connectIsolatedRiverTiles(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
            if (iso2 > 0) console.log(BUILD_LOG, "connected", iso2, "orphan river tile edges");
            symR += symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
            if (symR > 0) console.log(BUILD_LOG, "symmetrized", symR, "river neighbor edges");
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
        riverEdgeToWaterByTile
      );
      console.log(BUILD_LOG, "Earth: runTerrainTransition done");
      lastDisplayedTerrain = tileTerrain;
    } else {
      console.log(BUILD_LOG, "Procedural: buildProceduralTerrainProgressive start, blobiness:", state.blobiness);
      tileTerrain = await buildProceduralTerrainProgressive(
        globe.tiles,
        state,
        async (intermediate) => {
          setGlobeGeometryFromTerrain(
            globe,
            intermediate,
            undefined,
            elevationScale,
            peakElevationScale
          );
          lastDisplayedTerrain = intermediate;
          await yieldToMain();
        }
      );
      console.log(BUILD_LOG, "Procedural: buildProceduralTerrainProgressive done, runTerrainTransition start");
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
        undefined
      );
      console.log(BUILD_LOG, "Procedural: runTerrainTransition done");
    }

    await yieldToMain();

    console.log(BUILD_LOG, "create coast masks");
    coastMaskTexture = createCoastMaskTexture(globe, tileTerrain, 256, 128);
    coastLandMaskTexture = createCoastLandMaskTexture(globe, tileTerrain, 256, 128);
    await yieldToMain();

    console.log(BUILD_LOG, "create WaterSphere, coast foam, marker");
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
    scene.add(water.mesh);

    const waterLevels = computeWaterLevelsByBody(globe.tiles, tileTerrain);
    const elevationScaleForLakes = 0.08;
    for (const [key, tileIds] of waterLevels.tileIdsByBody) {
      if (key === "ocean") continue;
      const level = waterLevels.levels.get(key);
      if (level == null || tileIds.size === 0) continue;
      const surfaceRadius = globe.radius + level * elevationScaleForLakes;
      const geom = geometryWaterSurfacePatch(globe.mesh.geometry, tileIds, surfaceRadius);
      const mesh = new THREE.Mesh(geom, water.material);
      mesh.name = `LakeWater-${key}`;
      mesh.renderOrder = 1;
      scene.add(mesh);
      lakeWaterMeshes.push(mesh);
    }
    if (lakeWaterMeshes.length > 0) {
      console.log(BUILD_LOG, "lake water meshes:", lakeWaterMeshes.length);
    }

    coastFoamOverlay = new CoastFoamOverlay(coastLandMaskTexture, {
      radius: 0.995,
      speed: 0.073,
      timeScale: 0.4,
    });
    scene.add(coastFoamOverlay.mesh);

    if (state.useEarth && riverLinesLonLat && riverLinesLonLat.length > 0) {
      const elevationScale = 0.08;
      const riverSegments: ReturnType<typeof traceRiverThroughTiles> = [];
      const isDeltaByLine = riverLineIsDelta ?? riverLinesLonLat.map(() => false);
      for (let i = 0; i < riverLinesLonLat.length; i++) {
        const line = riverLinesLonLat[i];
        if (line.length >= 2) {
          const segs = traceRiverThroughTiles(globe, line);
          const isDelta = isDeltaByLine[i] ?? false;
          for (const s of segs) riverSegments.push({ ...s, isDelta });
        }
      }
      const totalPoints = riverLinesLonLat.reduce((s, l) => s + l.length, 0);
      console.log(BUILD_LOG, "river:", riverLinesLonLat.length, "lines,", totalPoints, "points →", riverSegments.length, "segments");
      if (riverSegments.length > 0) {
        const raw = getRiverEdgesByTile(riverSegments, {
          tiles: globe.tiles,
          isWater: (id) => tileTerrain.get(id)?.type === "water",
        });
        const jn3 = pruneThreeWayRiverJunctions(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        if (jn3 > 0) console.log(BUILD_LOG, "pruned", jn3, "3-way river junction tiles");
        let sym3 = symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        const iso3 = connectIsolatedRiverTiles(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        if (iso3 > 0) console.log(BUILD_LOG, "connected", iso3, "orphan river tile edges");
        sym3 += symmetrizeRiverNeighborEdgesUntilStable(raw, globe.tiles, (id) => tileTerrain.get(id)?.type === "water");
        if (sym3 > 0) console.log(BUILD_LOG, "symmetrized", sym3, "river neighbor edges");
        const riverEdgesByTile = new Map<number, Set<number>>();
        for (const [tid, set] of raw) {
          const type = tileTerrain.get(tid)?.type;
          if (type === "water" || type === "beach") continue;
          riverEdgesByTile.set(tid, set);
        }
        console.log(BUILD_LOG, "rivers placed on hex tile IDs:", riverEdgesByTile.size, "tiles (land only)");
        if (riverEdgesByTile.size > 0) {
          riverMesh = createRiverMeshFromTileEdges(globe, riverEdgesByTile, {
            radius: globe.radius,
            getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
            elevationScale,
            /** Wider inner fill + ribbons so neighboring hex water overlaps and doesn’t leave cracks. */
            riverBowlInnerScale: 0.48,
            sunDirection: sunDirectionFromState(state),
            waterSurfaceRadius: 0.995,
            isWater: (id) => tileTerrain.get(id)?.type === "water",
          });
          scene.add(riverMesh);
          console.log(BUILD_LOG, "river: mesh added, vertices", (riverMesh.geometry as THREE.BufferGeometry).getAttribute("position")?.count ?? 0);

          const { banks, bed } = createRiverTerrainMeshes(globe, riverEdgesByTile, {
            radius: globe.radius,
            getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
            elevationScale,
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
          scene.add(riverTerrainGroup);
          const bv = banks.geometry.getAttribute("position")?.count ?? 0;
          const dv = bed.geometry.getAttribute("position")?.count ?? 0;
          console.log(BUILD_LOG, "river: U-banks/bed vertices", bv + dv, "(banks", bv, ", bed", dv, ")");
        } else {
          riverMesh = null;
        }
      } else {
        riverMesh = null;
      }
    } else {
      if (state.useEarth && (!riverLinesLonLat || riverLinesLonLat.length === 0))
        console.warn(BUILD_LOG, "river data not loaded", riverLinesLonLat?.length ?? 0);
      riverMesh = null;
    }

    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xff4444 })
    );
    const tileId = Math.min(42, globe.tileCount - 1);
    placeObject(marker, globe, { tileId, heightOffset: 0.06 });
    scene.add(marker);
    console.log(BUILD_LOG, "buildWorldAsync done");
  } finally {
    setLoading(false);
  }
}

function scheduleRebuild(state: DemoState) {
  if (buildInProgress) {
    console.log(BUILD_LOG, "scheduleRebuild: build already in progress, queuing state");
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
  setLoading = (visible: boolean) => loadingEl.classList.toggle("visible", visible);

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
    triggerRebuild: boolean = true
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

  const addToggle = (parent: HTMLElement, label: string, key: keyof DemoState, onRebuild: () => void) => {
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
    if (proc) (proc as HTMLElement).style.display = state.useEarth ? "none" : "";
  });
  addSlider(sec, "Scale (subdivisions)", "subdivisions", 1, 6, 1, (v) => `${v} (~${2 + 10 * Math.pow(4, v)} tiles)`);

  sec = addSection("Sun");
  addSlider(sec, "Longitude", "sunLongitude", -1, 1, 0.02, (v) => (v * 180).toFixed(0) + "°", false);
  addSlider(sec, "Latitude", "sunLatitude", -0.5, 0.5, 0.02, (v) => (v * 90).toFixed(0) + "°", false);

  sec = addSection("Moon");
  addSlider(sec, "Longitude", "moonLongitude", -1, 1, 0.02, (v) => (v * 180).toFixed(0) + "°", false);
  addSlider(sec, "Latitude", "moonLatitude", -0.5, 0.5, 0.02, (v) => (v * 90).toFixed(0) + "°", false);

  sec = addSection("Procedural (when Earth off)");
  sec.classList.add("procedural", "procedural-options");
  sec.style.display = state.useEarth ? "none" : "";
  addSlider(sec, "Land fraction", "landFraction", 0.2, 0.8, 0.02, (v) => (v * 100).toFixed(0) + "%");
  addSlider(sec, "Blobiness (smoothing)", "blobiness", 0, 12, 1, (v) => String(v));
  addSlider(sec, "Seed", "seed", 1, 99999, 1, (v) => String(v));
}

async function init() {
  console.log(BUILD_LOG, "init start");
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
          typeof (e as MountainEntry).elevationM === "number"
      )
        ? (raw as MountainEntry[])
        : null;
  } else {
    mountainsList = null;
  }
  /** Natural Earth rivers: scalerank 0–2 = major (Amazon, Mississippi, Yangtze, Ganges, Nile, etc.), 3 = still major, 4+ = smaller. We keep scalerank <= 3 so we get navigable/famous rivers without every stream. */
  const RIVER_MAX_SCALERANK = 3;
  console.log(BUILD_LOG, "init: loading rivers (scalerank <=", RIVER_MAX_SCALERANK, ")…");
  try {
    const riversRes = await fetch("/ne_10m_rivers_lake_centerlines.json");
    if (riversRes.ok) {
      const rivers = (await riversRes.json()) as {
        type: string;
        features?: Array<{
          properties?: { name_en?: string; name?: string; featurecla?: string; scalerank?: number };
          geometry?: { type: string; coordinates: number[][] | number[][][] };
        }>;
      };
      const lines: number[][][] = [];
      const lineIsDelta: boolean[] = [];
      const alwaysIncludeRiverNames = /\b(saint\s*lawrence|st\.?\s*lawrence)\b/i;
      for (const f of rivers.features ?? []) {
        const cla = f.properties?.featurecla ?? "";
        if (cla !== "River" && cla !== "Lake Centerline") continue;
        const name = (f.properties?.name_en ?? f.properties?.name ?? "");
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
        } else if (g.type === "MultiLineString" && Array.isArray(g.coordinates)) {
          for (const ring of g.coordinates as number[][][]) {
            if (ring.length >= 2) {
              lines.push(ring);
              lineIsDelta.push(isDelta);
            }
          }
        }
      }
      riverLinesLonLat = lines.length > 0 ? lines : null;
      riverLineIsDelta = riverLinesLonLat && lineIsDelta.length === riverLinesLonLat.length ? lineIsDelta : null;
      const totalPoints = riverLinesLonLat?.reduce((s, l) => s + l.length, 0) ?? 0;
      console.log(BUILD_LOG, "init: rivers loaded (scalerank <=", RIVER_MAX_SCALERANK, "),", riverLinesLonLat?.length ?? 0, "lines,", totalPoints, "total points");
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
  console.log(BUILD_LOG, "init: assets done, creating panel and scheduling build");

  const state: DemoState = { ...DEFAULT_STATE };
  createPanel(state, () => scheduleRebuild(state));

  scheduleRebuild(state);

  applyPreset(camera, getPreset("strategy"), 1);
  camera.position.multiplyScalar(2.8);

  const sun = new Sun({
    direction: sunDirectionFromState(state),
    distance: 3500,
    intensity: 2.2,
    ambientIntensity: 0.15,
    ambientColor: 0x202830,
    sphereRadius: 90,
    sphereColor: 0xfff5e0,
  });
  sun.addTo(scene);
  const lensflare = new Lensflare();
  lensflare.addElement(new LensflareElement(createFlareTexture(64, true), 120, 0, new THREE.Color(0xffffee)));
  lensflare.addElement(new LensflareElement(createFlareTexture(32, true), 80, 0.4, new THREE.Color(0xffffee)));
  lensflare.addElement(new LensflareElement(createFlareTexture(128, false), 200, 0.6, new THREE.Color(0xffffff)));
  sun.directional.add(lensflare);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.9,
    0.4,
    0.55
  ));

  const atmosphere = new Atmosphere(scene, { timeOfDay: 0.5 });
  scene.background = new THREE.Color(0x030508);

  const moonRadius = 0.14;
  const moonDistance = 2.6;
  const moon = new Globe({ radius: moonRadius, subdivisions: 2 });
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
  const moonLight = new THREE.PointLight(0xb0b8c8, 0.5, moonDistance * 2.5, 1.5);
  scene.add(moonLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.2;
  controls.maxDistance = 6;
  controls.enableRotate = true;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    starfield.update(camera);
    const sunDir = sunDirectionFromState(state);
    sun.directional.position.copy(sunDir).multiplyScalar(3500);
    if (sun.sphere) sun.sphere.position.copy(sun.directional.position);
    const moonPos = moonPositionFromState(state, moonDistance);
    moon.mesh.position.copy(moonPos);
    moonLight.position.copy(moonPos);
    if (water) {
      water.setSunDirection(sunDir);
      water.update();
    }
    if (coastFoamOverlay) {
      coastFoamOverlay.setSunDirection(sunDir);
      coastFoamOverlay.update();
    }
    if (riverMesh) {
      const mat = riverMesh.material as THREE.ShaderMaterial;
      if (mat.uniforms?.uSunDirection) mat.uniforms.uSunDirection.value.copy(sunDir);
      updateRiverMaterialTime(riverMesh, performance.now() * 0.001 * 0.4);
    }
    composer.render();
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener("click", (event: MouseEvent) => {
    if (!globe?.mesh) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(globe.mesh);
    if (intersects.length > 0) {
      const dir = intersects[0].point.clone().normalize();
      const tileId = globe.getTileIdAtDirection(dir);
      const scale = globe.subdivisions;
      console.log("[globe-build] Hex clicked: tileId =", tileId, ", scale (subdivisions) =", scale);
    }
  });

  window.addEventListener("resize", () => {
    const w = innerWidth;
    const h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
  });
  animate();
}
init().catch((e) => {
  console.error("[Earth init]", e);
});
