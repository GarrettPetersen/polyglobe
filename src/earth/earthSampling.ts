/**
 * Sample real Earth geography onto geodesic hex/pentagon tiles.
 * Works at any subdivision: each tile center is converted to lat/lon and
 * sampled against a raster (land/sea, elevation) or a custom sampler.
 *
 * Data sources you can use:
 * - Natural Earth 1:110m land raster (rasterize land polygon to 360×180 PNG)
 * - NASA GSHHG / GMT Earth mask grids (various resolutions)
 * - ETOPO1/ETOPO2 elevation: negative = ocean, positive = land (elevation in m)
 * - Any GeoTIFF or PNG you load and pass as EarthRaster
 */

import * as THREE from "three";
import type { GeodesicTile } from "../core/geodesic.js";
import type { TileTerrainData } from "../terrain/terrainMaterial.js";
import type { TerrainType } from "../terrain/types.js";

/** Convert tile center (unit vector) to latitude and longitude in radians. Longitude matches equirectangular convention (e.g. raster x=0 is -180°). */
export function tileCenterToLatLon(center: THREE.Vector3): { lat: number; lon: number } {
  const x = center.x;
  const y = center.y;
  const z = center.z;
  const lat = Math.asin(THREE.MathUtils.clamp(y, -1, 1));
  const lon = -Math.atan2(z, x);
  return { lat, lon };
}

/** Latitude in radians to degrees. */
export function latLonToDegrees(lat: number, lon: number): { latDeg: number; lonDeg: number } {
  return {
    latDeg: (lat * 180) / Math.PI,
    lonDeg: (lon * 180) / Math.PI,
  };
}

/** Maximum absolute latitude (degrees) over a tile's center and vertices. Used so polar cap applies to any tile that extends into the cap. */
export function tileMaxAbsLatDeg(tile: GeodesicTile): number {
  let maxAbs = 0;
  const add = (v: THREE.Vector3) => {
    const lat = Math.asin(THREE.MathUtils.clamp(v.y, -1, 1));
    const deg = Math.abs((lat * 180) / Math.PI);
    if (deg > maxAbs) maxAbs = deg;
  };
  add(tile.center);
  for (const v of tile.vertices) add(v);
  return maxAbs;
}

/**
 * Raster image of the globe in equirectangular projection.
 * - (0, 0) = top-left = lon -180°, lat +90°
 * - (width-1, height-1) = bottom-right = lon +180°, lat -90°
 * So x = (lon + 180) / 360 * (width - 1), y = (90 - lat) / 180 * (height - 1).
 */
/** Optional climate grid (e.g. Köppen–Geiger). Can be different resolution from main raster. */
export interface ClimateGrid {
  width: number;
  height: number;
  /** Köppen class 0 = water/nodata, 1–30 = Af, Am, Aw, BWh, … ET, EF. */
  data: Uint8Array;
}

export interface EarthRaster {
  width: number;
  height: number;
  /** Land/sea: 0 = water, non-zero = land. Or use as elevation byte 0–255. */
  data: Uint8Array;
  /**
   * If provided, elevation in meters at each pixel (negative = below sea level).
   * Same dimensions as data (width * height).
   */
  elevation?: Float32Array;
  /**
   * If provided, climate classification (e.g. Köppen–Geiger 1–30).
   * Best source for desert vs rainforest; sampled at same lat/lon as land/elevation.
   */
  climate?: ClimateGrid;
  /**
   * If provided, temperature in °C (e.g. mean annual or winter min).
   * Same dimensions as data. Used for frozen water (ice) when below freezeThresholdC.
   */
  temperatureC?: Float32Array;
}

/** Result of sampling at one point (before mapping to TerrainType). */
export interface SampleResult {
  land: boolean;
  /** Elevation in meters if available (negative = ocean). */
  elevationM?: number;
  /** Köppen climate class 1–30 if climate grid provided. 0 = water/nodata. */
  climateCode?: number;
  /** Temperature in °C if temperature grid provided. Used for frozen water. */
  temperatureC?: number;
}

/**
 * Build an EarthRaster from canvas ImageData (e.g. after loading a PNG).
 * Uses the first channel (red) or luminance; pixels with value >= landThreshold become land.
 */
export function earthRasterFromImageData(
  imageData: { data: Uint8ClampedArray; width: number; height: number },
  landThreshold: number = 128
): EarthRaster {
  const { width, height, data } = imageData;
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4] ?? data[i];
    out[i] = r >= landThreshold ? 255 : 0;
  }
  return { width, height, data: out };
}

/**
 * Sample the raster at a given lat/lon (radians).
 * Uses nearest-neighbor for land/sea; elevation and climate use their own grid dimensions.
 */
export function sampleRasterAtLatLon(
  raster: EarthRaster,
  latRad: number,
  lonRad: number
): SampleResult {
  const latDeg = (latRad * 180) / Math.PI;
  const lonDeg = (lonRad * 180) / Math.PI;
  const { width, height } = raster;
  const x = ((lonDeg + 180) / 360) * (width - 1);
  const y = ((90 - latDeg) / 180) * (height - 1);
  const xi = Math.round(x);
  const yi = Math.round(y);
  const i = Math.max(0, Math.min(yi, height - 1)) * width + Math.max(0, Math.min(xi, width - 1));
  const land = raster.data[i] > 0;
  let elevationM: number | undefined;
  if (raster.elevation) {
    elevationM = raster.elevation[i];
  }
  let climateCode: number | undefined;
  if (raster.climate) {
    const cw = raster.climate.width;
    const ch = raster.climate.height;
    const cx = ((lonDeg + 180) / 360) * (cw - 1);
    const cy = ((90 - latDeg) / 180) * (ch - 1);
    const ci = Math.max(0, Math.min(Math.round(cy), ch - 1)) * cw + Math.max(0, Math.min(Math.round(cx), cw - 1));
    const v = raster.climate.data[ci];
    if (v > 0) climateCode = v;
  }
  let temperatureC: number | undefined;
  if (raster.temperatureC) {
    const t = raster.temperatureC[i];
    if (Number.isFinite(t)) temperatureC = t;
  }
  return { land, elevationM, climateCode, temperatureC };
}

/** How to sample the raster for each tile: center only, or many points in the interior (majority land). */
export type TerrainSampleMode = "center" | "tile";

export interface BuildTerrainFromRasterOptions {
  /** Scale for elevation in meters → globe units (added to landElevation). Default 0.00004. */
  elevationScale?: number;
  /** Elevation in meters above which to consider "mountain" type. Default 1200. */
  mountainThresholdM?: number;
  /** Minimum meters this tile must stand above its highest neighbor to count as mountain (tracks relief, not just altitude). Default 400. */
  mountainReliefM?: number;
  /** Use latitude for ice/snow near poles and desert near equator. Default true. */
  latitudeTerrain?: boolean;
  /** Water tile elevation (globe units, below surface). Default -0.18. */
  waterElevation?: number;
  /** Land base elevation (globe units). Default 0.1. */
  landElevation?: number;
  /** When temperatureC < this, water tiles become ice (frozen). °C. Default 1.5. */
  freezeThresholdC?: number;
  /** Latitude (degrees) beyond which water tiles are shown as ice (covers pole ocean gaps where land rasters cut off). Land tiles above this latitude are left as land (e.g. northern Russia/Canada). Default 70. */
  polarCapLat?: number;
  /** "center" = sample only tile center. "tile" = sample many points inside the hex/pentagon, majority land. Default "tile". */
  sampleMode?: TerrainSampleMode;
  /** When sampleMode is "tile", number of sample points per tile (distributed inside the polygon). Default 24. */
  sampleCount?: number;
}

const DEFAULT_OPTS: Required<BuildTerrainFromRasterOptions> = {
  elevationScale: 0.00004,
  mountainThresholdM: 1200,
  mountainReliefM: 400,
  latitudeTerrain: true,
  waterElevation: -0.18,
  landElevation: 0.1,
  freezeThresholdC: 1.5,
  polarCapLat: 70,
  sampleMode: "tile",
  sampleCount: 24,
};

/** Barycentric coords (u, v) with u,v >= 0 and u+v <= 1 for sampling inside a triangle. */
const BARY_SAMPLES: [number, number][] = [
  [1 / 3, 1 / 3],
  [0.2, 0.2],
  [0.2, 0.5],
  [0.5, 0.2],
  [0.15, 0.15],
  [0.15, 0.4],
  [0.4, 0.15],
  [0.25, 0.5],
  [0.5, 0.25],
];

/** Return sample points inside the tile (on the unit sphere). Triangulate from center to each edge, sample in each triangle. */
function samplePointsInTile(tile: GeodesicTile, count: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const c = tile.center;
  const verts = tile.vertices;
  const n = verts.length;
  const perTri = Math.max(1, Math.min(BARY_SAMPLES.length, Math.floor(count / n)));
  const bary = BARY_SAMPLES.slice(0, perTri);
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v0.copy(verts[i]).sub(c);
    v1.copy(verts[(i + 1) % n]).sub(c);
    for (const [u, v] of bary) {
      const p = new THREE.Vector3()
        .copy(c)
        .add(v0.clone().multiplyScalar(u))
        .add(v1.clone().multiplyScalar(v));
      p.normalize();
      out.push(p);
    }
  }
  return out;
}

/** Map Köppen–Geiger code (1–30) to terrain type. Desert from BWh/BWk, forest from Af/Am/Cfa/Cfb, etc. */
function koppenToTerrainType(code: number): TerrainType {
  switch (code) {
    case 1: // Af – tropical rainforest
    case 2: // Am – tropical monsoon
    case 14: // Cfa – humid subtropical
    case 15: // Cfb – oceanic
      return "forest";
    case 3: // Aw – tropical savanna
    case 6: // BSh – hot steppe
    case 7: // BSk – cold steppe
      return "grassland";
    case 4: // BWh – hot desert
    case 5: // BWk – cold desert
      return "desert";
    case 29: // ET – tundra
      return "snow";
    case 30: // EF – ice cap
      return "ice";
    default:
      // Cs, Cw, Cfc, D* – temperate/continental
      return "land";
  }
}

function terrainFromSample(
  result: SampleResult,
  latRad: number,
  opts: Required<BuildTerrainFromRasterOptions>,
  neighborMaxElevM?: number,
  /** If set, max absolute latitude (deg) over the tile; used so water tiles that extend into the polar cap become ice and avoid an ocean donut. */
  maxAbsLatDeg?: number
): Pick<TileTerrainData, "type" | "elevation"> {
  const absLat = Math.abs(latRad);
  const latDeg = (absLat * 180) / Math.PI;
  const inPolarCap = maxAbsLatDeg != null ? maxAbsLatDeg >= opts.polarCapLat : latDeg >= opts.polarCapLat;

  if (!result.land) {
    const frozen =
      (result.temperatureC != null &&
        Number.isFinite(result.temperatureC) &&
        result.temperatureC < opts.freezeThresholdC) ||
      inPolarCap;
    return {
      type: frozen ? "ice" : "water",
      elevation: opts.waterElevation,
    };
  }

  let type: TerrainType = "land";
  let elevation = opts.landElevation;

  // Prefer climate (Köppen) when available – correct source for desert vs rainforest
  if (result.climateCode != null && result.climateCode >= 1 && result.climateCode <= 30) {
    type = koppenToTerrainType(result.climateCode);
    if (type === "desert") elevation = 0.05;
    else if (type === "forest" || type === "grassland") elevation = 0.1;
    else if (type === "snow" || type === "ice") elevation = 0.06;
  } else if (opts.latitudeTerrain) {
    // Fallback when no climate data: subtropical bands = desert, tropics = land
    if (latDeg > 70) {
      type = Math.random() < 0.6 ? "ice" : "snow";
      elevation = 0.06;
    } else if (latDeg > 55) {
      type = "snow";
      elevation = 0.08;
    } else if (latDeg >= 15 && latDeg <= 35) {
      type = "desert";
      elevation = 0.05;
    } else if (latDeg < 15) {
      type = "land";
      elevation = 0.1;
    }
  }

  // Mountain only where elevation is high AND stands above neighbors (relief), not just high plateaus
  if (result.elevationM != null && result.elevationM > opts.mountainThresholdM) {
    const relief =
      neighborMaxElevM != null ? result.elevationM - neighborMaxElevM : result.elevationM;
    if (relief >= opts.mountainReliefM) {
      type = "mountain";
      const t = (result.elevationM - opts.mountainThresholdM) / 3500;
      elevation = 0.1 + THREE.MathUtils.clamp(t, 0, 1) * 0.18;
    }
  }

  return { type, elevation };
}

function sampleTile(
  tile: GeodesicTile,
  raster: EarthRaster,
  opts: Required<BuildTerrainFromRasterOptions>
): { land: boolean; elevationM?: number; climateCode?: number; temperatureC?: number; latRad: number; maxAbsLatDeg: number } {
  const centerLatLon = tileCenterToLatLon(tile.center);
  const maxAbsLatDeg = tileMaxAbsLatDeg(tile);
  const points: { lat: number; lon: number }[] = [centerLatLon];
  if (opts.sampleMode === "tile") {
    const interior = samplePointsInTile(tile, opts.sampleCount);
    for (const p of interior) {
      points.push(tileCenterToLatLon(p));
    }
  }
  let landCount = 0;
  let elevSum = 0;
  let elevCount = 0;
  let tempSum = 0;
  let tempCount = 0;
  const climateCounts = new Map<number, number>();
  for (const { lat, lon } of points) {
    const r = sampleRasterAtLatLon(raster, lat, lon);
    if (r.land) landCount++;
    if (r.elevationM != null) {
      elevSum += r.elevationM;
      elevCount++;
    }
    if (r.temperatureC != null && Number.isFinite(r.temperatureC)) {
      tempSum += r.temperatureC;
      tempCount++;
    }
    if (r.climateCode != null) {
      climateCounts.set(r.climateCode, (climateCounts.get(r.climateCode) ?? 0) + 1);
    }
  }
  const land = opts.sampleMode === "center" ? landCount > 0 : landCount > points.length / 2;
  const elevationM = elevCount > 0 ? elevSum / elevCount : undefined;
  const temperatureC = tempCount > 0 ? tempSum / tempCount : undefined;
  let climateCode: number | undefined;
  if (climateCounts.size > 0) {
    let maxCount = 0;
    for (const [code, count] of climateCounts) {
      if (count > maxCount) {
        maxCount = count;
        climateCode = code;
      }
    }
  }
  return { land, elevationM, climateCode, temperatureC, latRad: centerLatLon.lat, maxAbsLatDeg };
}

/**
 * Build a tileId → TileTerrainData map by sampling the raster (center only or center + vertices).
 * Works at any subdivision: more tiles = finer sampling of the same raster.
 */
export function buildTerrainFromEarthRaster(
  tiles: GeodesicTile[],
  raster: EarthRaster,
  options: BuildTerrainFromRasterOptions = {}
): Map<number, TileTerrainData> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const out = new Map<number, TileTerrainData>();

  // First pass: sample every tile, store elevation per tile for neighbor relief
  const elevationByTile = new Map<number, number>();
  const resultsByTile = new Map<number, ReturnType<typeof sampleTile>>();
  for (const tile of tiles) {
    const result = sampleTile(tile, raster, opts);
    resultsByTile.set(tile.id, result);
    const elevM =
      result.land && result.elevationM != null && result.elevationM > 0 ? result.elevationM : 0;
    elevationByTile.set(tile.id, elevM);
  }

  for (const tile of tiles) {
    const result = resultsByTile.get(tile.id)!;
    let neighborMaxElevM = 0;
    for (const neighborId of tile.neighbors) {
      const nElev = elevationByTile.get(neighborId) ?? 0;
      if (nElev > neighborMaxElevM) neighborMaxElevM = nElev;
    }
    const { type, elevation } = terrainFromSample(
      result,
      result.latRad,
      opts,
      neighborMaxElevM,
      result.maxAbsLatDeg
    );
    let elev = elevation;
    if (result.land && result.elevationM != null && result.elevationM > 0) {
      elev = opts.landElevation + result.elevationM * opts.elevationScale;
    } else if (!result.land) {
      elev = opts.waterElevation;
    }
    out.set(tile.id, { tileId: tile.id, type, elevation: elev });
  }

  return out;
}

/**
 * Set water tiles that border land to type "beach" (so coast edges read as shoreline).
 * Mutates the map in place.
 */
export function applyCoastalBeach(
  tiles: GeodesicTile[],
  terrain: Map<number, TileTerrainData>
): void {
  for (const tile of tiles) {
    const data = terrain.get(tile.id);
    if (!data || data.type !== "water") continue;
    const hasLandNeighbor = tile.neighbors.some((n) => {
      const d = terrain.get(n);
      return d && d.type !== "water";
    });
    if (hasLandNeighbor) {
      terrain.set(tile.id, { ...data, type: "beach" });
    }
  }
}

/**
 * Sampler function: (lat, lon) in radians → land, optional elevation, temperature, climate.
 * Use this to plug in your own GIS (e.g. point-in-polygon on GeoJSON, or a different raster).
 */
export type EarthTerrainSampler = (
  latRad: number,
  lonRad: number
) => { land: boolean; elevationM?: number; temperatureC?: number; climateCode?: number };

/**
 * Build terrain from a custom sampler. Same as buildTerrainFromEarthRaster but
 * you provide a function so you can use vector data, APIs, or any source.
 */
export function buildTerrainFromSampler(
  tiles: GeodesicTile[],
  sampler: EarthTerrainSampler,
  options: BuildTerrainFromRasterOptions = {}
): Map<number, TileTerrainData> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const out = new Map<number, TileTerrainData>();

  for (const tile of tiles) {
    const { lat, lon } = tileCenterToLatLon(tile.center);
    const result = sampler(lat, lon);
    const { type, elevation } = terrainFromSample(
      {
        land: result.land,
        elevationM: result.elevationM,
        temperatureC: result.temperatureC,
        climateCode: result.climateCode,
      },
      lat,
      opts
    );
    let elev = elevation;
    if (result.land && result.elevationM != null && result.elevationM > 0) {
      elev = opts.landElevation + result.elevationM * opts.elevationScale;
    } else if (!result.land) {
      elev = opts.waterElevation;
    }
    out.set(tile.id, { tileId: tile.id, type, elevation: elev });
  }

  return out;
}

/**
 * Parse an ArcGIS ASCII raster (e.g. Köppen–Geiger from Vienna or Peel).
 * Header: ncols, nrows, xllcorner, yllcorner, cellsize, [NODATA_value], then space-separated numbers.
 * Returns a ClimateGrid with row 0 = north (lat 90°), compatible with sampleRasterAtLatLon.
 */
export function parseKoppenAsciiGrid(content: string): ClimateGrid {
  const lines = content.trim().split(/\r?\n/);
  const header: Record<string, number> = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^\s*(\w+)\s+(-?\d+(?:\.\d*)?)\s*$/);
    if (match) {
      header[match[1].toLowerCase()] = Number(match[2]);
      i++;
    } else {
      break;
    }
  }
  const width = header.ncols ?? 0;
  const height = header.nrows ?? 0;
  const nodata = header.nodata_value ?? -9999;
  if (width <= 0 || height <= 0) {
    throw new Error("parseKoppenAsciiGrid: missing or invalid ncols/nrows");
  }
  const data = new Uint8Array(width * height);
  let idx = 0;
  for (; i < lines.length && idx < data.length; i++) {
    const tokens = lines[i].trim().split(/\s+/);
    for (const t of tokens) {
      if (idx >= data.length) break;
      const v = Number(t);
      data[idx++] = Number.isFinite(v) && v !== nodata && v >= 0 && v <= 31 ? Math.round(v) : 0;
    }
  }
  return { width, height, data };
}

/**
 * Create elevation Float32Array from image data (e.g. PNG).
 * Uses red channel: elevationM = (r / 255) * scale + offset.
 * Common: scale 10000, offset -500 for 0–255 → -500m to ~9450m.
 */
export function elevationFromImageData(
  imageData: { data: Uint8ClampedArray; width: number; height: number },
  scale: number = 10000,
  offset: number = -500
): Float32Array {
  const { width, height, data } = imageData;
  const out = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4] ?? data[i] ?? 0;
    out[i] = (r / 255) * scale + offset;
  }
  return out;
}
