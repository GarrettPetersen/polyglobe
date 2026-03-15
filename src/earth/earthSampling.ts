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

/**
 * Raster image of the globe in equirectangular projection.
 * - (0, 0) = top-left = lon -180°, lat +90°
 * - (width-1, height-1) = bottom-right = lon +180°, lat -90°
 * So x = (lon + 180) / 360 * (width - 1), y = (90 - lat) / 180 * (height - 1).
 */
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
}

/** Result of sampling at one point (before mapping to TerrainType). */
export interface SampleResult {
  land: boolean;
  /** Elevation in meters if available (negative = ocean). */
  elevationM?: number;
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
 * Uses nearest-neighbor for land/sea; elevation is bilinear if present.
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
  return { land, elevationM };
}

/** How to sample the raster for each tile: center only, or many points in the interior (majority land). */
export type TerrainSampleMode = "center" | "tile";

export interface BuildTerrainFromRasterOptions {
  /** Scale for elevation in meters → globe units (added to landElevation). Default 0.00004. */
  elevationScale?: number;
  /** Elevation in meters above which to use "mountain" type. Default 1500. */
  mountainThresholdM?: number;
  /** Use latitude for ice/snow near poles and desert near equator. Default true. */
  latitudeTerrain?: boolean;
  /** Water tile elevation (globe units, below surface). Default -0.18. */
  waterElevation?: number;
  /** Land base elevation (globe units). Default 0.1. */
  landElevation?: number;
  /** "center" = sample only tile center. "tile" = sample many points inside the hex/pentagon, majority land. Default "tile". */
  sampleMode?: TerrainSampleMode;
  /** When sampleMode is "tile", number of sample points per tile (distributed inside the polygon). Default 24. */
  sampleCount?: number;
}

const DEFAULT_OPTS: Required<BuildTerrainFromRasterOptions> = {
  elevationScale: 0.00004,
  mountainThresholdM: 1500,
  latitudeTerrain: true,
  waterElevation: -0.18,
  landElevation: 0.1,
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

function terrainFromSample(
  result: SampleResult,
  latRad: number,
  opts: Required<BuildTerrainFromRasterOptions>
): Pick<TileTerrainData, "type" | "elevation"> {
  const absLat = Math.abs(latRad);
  const latDeg = (absLat * 180) / Math.PI;

  if (!result.land) {
    return {
      type: "water",
      elevation: opts.waterElevation,
    };
  }

  let type: TerrainType = "land";
  let elevation = opts.landElevation;

  if (opts.latitudeTerrain) {
    if (latDeg > 70) {
      type = Math.random() < 0.6 ? "ice" : "snow";
      elevation = 0.06;
    } else if (latDeg > 55) {
      type = "snow";
      elevation = 0.08;
    } else if (latDeg < 25) {
      type = Math.random() < 0.5 ? "desert" : "land";
      elevation = type === "desert" ? 0.05 : 0.1;
    }
  }

  if (result.elevationM != null && result.elevationM > opts.mountainThresholdM) {
    type = "mountain";
    const t = (result.elevationM - opts.mountainThresholdM) / 3500;
    elevation = 0.1 + THREE.MathUtils.clamp(t, 0, 1) * 0.18;
  }

  return { type, elevation };
}

function sampleTile(
  tile: GeodesicTile,
  raster: EarthRaster,
  opts: Required<BuildTerrainFromRasterOptions>
): { land: boolean; elevationM?: number; latRad: number } {
  const centerLatLon = tileCenterToLatLon(tile.center);
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
  for (const { lat, lon } of points) {
    const r = sampleRasterAtLatLon(raster, lat, lon);
    if (r.land) landCount++;
    if (r.elevationM != null) {
      elevSum += r.elevationM;
      elevCount++;
    }
  }
  const land = opts.sampleMode === "center" ? landCount > 0 : landCount > points.length / 2;
  const elevationM = elevCount > 0 ? elevSum / elevCount : undefined;
  return { land, elevationM, latRad: centerLatLon.lat };
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

  for (const tile of tiles) {
    const result = sampleTile(tile, raster, opts);
    const { type, elevation } = terrainFromSample(result, result.latRad, opts);
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
 * Sampler function: (lat, lon) in radians → land (boolean) and optional elevation in meters.
 * Use this to plug in your own GIS (e.g. point-in-polygon on GeoJSON, or a different raster).
 */
export type EarthTerrainSampler = (
  latRad: number,
  lonRad: number
) => { land: boolean; elevationM?: number };

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
      { land: result.land, elevationM: result.elevationM },
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
