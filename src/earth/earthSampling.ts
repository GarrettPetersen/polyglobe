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
  /** Latitude (degrees) beyond which every tile is forced to ice (solid polar ice caps, no holes in Antarctica/Arctic). Uses tile extent (max of center and vertices). Default 70. */
  polarCapLat?: number;
  /** "center" = sample only tile center. "tile" = sample many points inside the hex/pentagon, majority land. Default "tile". */
  sampleMode?: TerrainSampleMode;
  /** When sampleMode is "tile", number of sample points per tile (distributed inside the polygon). Default 24. */
  sampleCount?: number;
  /** If set, land/water is taken from this (e.g. point-in-polygon on vector data) instead of the raster. Avoids rasterization artifacts at the antimeridian. */
  landSampler?: (latRad: number, lonRad: number) => boolean;
  /**
   * When set, used to compute hex topology from vector data: samples points inside the hex and uses
   * land polygon index and water region id to detect isthmuses (samples in ≥2 land polygons → land)
   * and channels (samples in ≥2 water regions → water). Takes precedence over landSampler for topology resolution.
   */
  topologySampler?: (
    latRad: number,
    lonRad: number
  ) => { land: boolean; landPolygonIndex?: number; waterRegionId?: number };
  /**
   * When true (default), tiles with mixed land/water samples are resolved by topology:
   * - If the hex connects two land masses (isthmus, e.g. Panama), assign land.
   * - If the hex connects two water bodies (strait, e.g. Dardanelles), assign water.
   * Avoids splitting continents or seas by a single misclassified hex.
   */
  topologyResolve?: boolean;
  /** Fraction of land samples above which a tile is treated as definite land for topology. Default 0.7. */
  topologyLandThreshold?: number;
  /** Fraction of land samples below which a tile is treated as definite water for topology. Default 0.3. */
  topologyWaterThreshold?: number;
  /**
   * When a tile touches no other land (isolated / potential island), treat as land if land fraction >= this.
   * Biases towards including small islands (e.g. Hawaii) rather than losing them. Default 0.2.
   */
  topologyIslandLandThreshold?: number;
  /**
   * When set, land/water is resolved per contiguous landmass/ocean/lake from precomputed region rasters
   * instead of per-hex topology. More efficient: rasterize each region once, score every hex from grids,
   * then satisfy contiguity and no-landmass-touch constraints. Takes precedence over topologyResolve.
   */
  getRegionScores?: (tile: GeodesicTile) => RegionScores;
  /** Options passed to resolveLandWaterByRegions when getRegionScores is set (e.g. onIteration for progressive display). */
  resolveOptions?: ResolveLandWaterByRegionsOptions;
  /** Called periodically during first-pass tile sampling; if it returns a Promise, it is awaited (lets the UI update). */
  onFirstPassProgress?: (sampled: number, total: number) => void | Promise<void>;
}

/** Per-hex scores from sampling region rasters (one per landmass, ocean components, lakes). */
export interface RegionScores {
  /** Fraction of samples in any landmass (0..1). */
  landFraction: number;
  /** Landmass id (1..N) → fraction of samples in that landmass. */
  landmassFractions: Map<number, number>;
  /** Ocean region id (1..M) → fraction of samples in that ocean component. */
  oceanFractions: Map<number, number>;
  /** Lake id (1..K) → fraction of samples in that lake. */
  lakeFractions: Map<number, number>;
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
  landSampler: undefined!,
  topologySampler: undefined!,
  topologyResolve: true,
  topologyLandThreshold: 0.7,
  topologyWaterThreshold: 0.3,
  topologyIslandLandThreshold: 0.2,
  getRegionScores: undefined!,
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

  // Tiles in the polar cap are always ice (solid ice caps, no holes in Antarctica/Arctic)
  if (inPolarCap) {
    return { type: "ice", elevation: opts.landElevation };
  }

  if (!result.land) {
    const frozen =
      result.temperatureC != null &&
      Number.isFinite(result.temperatureC) &&
      result.temperatureC < opts.freezeThresholdC;
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
): { land: boolean; landCount: number; sampleCount: number; elevationM?: number; climateCode?: number; temperatureC?: number; latRad: number; maxAbsLatDeg: number } {
  const centerLatLon = tileCenterToLatLon(tile.center);
  const maxAbsLatDeg = tileMaxAbsLatDeg(tile);
  const points: { lat: number; lon: number }[] = [centerLatLon];
  if (opts.sampleMode === "tile") {
    const interior = samplePointsInTile(tile, opts.sampleCount);
    for (const p of interior) {
      points.push(tileCenterToLatLon(p));
    }
  }
  const sampleCount = points.length;
  let landCount = 0;
  let elevSum = 0;
  let elevCount = 0;
  let tempSum = 0;
  let tempCount = 0;
  const climateCounts = new Map<number, number>();
  const useLandSampler = opts.landSampler != null;
  for (const { lat, lon } of points) {
    const r = sampleRasterAtLatLon(raster, lat, lon);
    const land = useLandSampler ? opts.landSampler!(lat, lon) : r.land;
    if (land) landCount++;
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
  const land = opts.sampleMode === "center" ? landCount > 0 : landCount > sampleCount / 2;
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
  return { land, landCount, sampleCount, elevationM, climateCode, temperatureC, latRad: centerLatLon.lat, maxAbsLatDeg };
}

/** Full result of sampling a tile (sampleTile return type); used for topology resolution. */
type TileSampleResult = ReturnType<typeof sampleTile>;

/**
 * Resolve ambiguous (mixed land/water) tiles by topology so that:
 * - Isthmuses (hex has samples in ≥2 land polygons) → land — do not split a landmass.
 * - Channels (hex has samples in ≥2 water regions) → water — do not split a seaway.
 *
 * When opts.topologySampler is provided, we sample the hex interior (center + points in tile)
 * and use landPolygonIndex / waterRegionId from vector data. Otherwise uses component-based
 * heuristics and opts.landSampler for tie-breaking. Returns a map of tileId -> land (true) or water (false).
 */
function resolveLandWaterByTopology(
  tiles: GeodesicTile[],
  resultsByTile: Map<number, TileSampleResult>,
  opts: Required<
    Pick<
      BuildTerrainFromRasterOptions,
      "topologyLandThreshold" | "topologyWaterThreshold" | "topologyIslandLandThreshold" | "sampleMode" | "sampleCount"
    >
  > & {
    landSampler?: (latRad: number, lonRad: number) => boolean;
    topologySampler?: (
      latRad: number,
      lonRad: number
    ) => { land: boolean; landPolygonIndex?: number; waterRegionId?: number };
  }
): Map<number, boolean> {
  const tileById = new Map<number, GeodesicTile>();
  for (const t of tiles) tileById.set(t.id, t);

  const landThresh = opts.topologyLandThreshold;
  const waterThresh = opts.topologyWaterThreshold;
  const islandLandThresh = opts.topologyIslandLandThreshold;
  const landSampler = opts.landSampler;
  const topologySampler = opts.topologySampler;

  /** Sample hex with topologySampler; return distinct land polygon indices, water region ids, and counts. */
  function sampleHexTopology(tile: GeodesicTile): { landPolygonIndices: Set<number>; waterRegionIds: Set<number>; landCount: number; sampleCount: number } {
    const landPolygonIndices = new Set<number>();
    const waterRegionIds = new Set<number>();
    let landCount = 0;
    const points: { lat: number; lon: number }[] = [tileCenterToLatLon(tile.center)];
    if (opts.sampleMode === "tile") {
      const interior = samplePointsInTile(tile, opts.sampleCount);
      for (const p of interior) points.push(tileCenterToLatLon(p));
    }
    for (const { lat, lon } of points) {
      let s: { land: boolean; landPolygonIndex?: number; waterRegionId?: number };
      try {
        s = topologySampler!(lat, lon);
      } catch {
        continue;
      }
      if (s.land) {
        landCount++;
        if (s.landPolygonIndex !== undefined) landPolygonIndices.add(s.landPolygonIndex);
      } else {
        if (s.waterRegionId !== undefined) waterRegionIds.add(s.waterRegionId);
      }
    }
    return { landPolygonIndices, waterRegionIds, landCount, sampleCount: points.length };
  }

  const landByTile = new Map<number, boolean>();
  const definiteLand = new Set<number>();
  const definiteWater = new Set<number>();
  let ambiguous = new Set<number>();

  for (const tile of tiles) {
    const r = resultsByTile.get(tile.id);
    if (!r) continue;
    const frac = r.sampleCount > 0 ? r.landCount / r.sampleCount : 0;
    if (frac >= landThresh) {
      definiteLand.add(tile.id);
      landByTile.set(tile.id, true);
    } else if (frac <= waterThresh) {
      definiteWater.add(tile.id);
      landByTile.set(tile.id, false);
    } else {
      ambiguous.add(tile.id);
    }
  }

  function getLandComponents(landSet: Set<number>): Map<number, number> {
    const compId = new Map<number, number>();
    let id = 0;
    const stack: number[] = [];
    for (const tid of landSet) {
      if (compId.has(tid)) continue;
      id++;
      stack.length = 0;
      stack.push(tid);
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (compId.has(current)) continue;
        compId.set(current, id);
        const t = tileById.get(current);
        if (!t) continue;
        for (const n of t.neighbors) {
          if (landSet.has(n) && !compId.has(n)) stack.push(n);
        }
      }
    }
    return compId;
  }

  function getWaterComponents(waterSet: Set<number>): Map<number, number> {
    return getLandComponents(waterSet);
  }

  function componentSizes(compId: Map<number, number>): Map<number, number> {
    const sizes = new Map<number, number>();
    for (const cid of compId.values()) {
      sizes.set(cid, (sizes.get(cid) ?? 0) + 1);
    }
    return sizes;
  }

  let iterations = 0;
  const maxIterations = 100;

  while (ambiguous.size > 0 && iterations < maxIterations) {
    iterations++;
    let landCompId: Map<number, number> | undefined;
    let waterCompId: Map<number, number> | undefined;
    let landSizes: Map<number, number> | undefined;
    let waterSizes: Map<number, number> | undefined;
    if (!topologySampler) {
      const landSet = new Set(definiteLand);
      const waterSet = new Set(definiteWater);
      for (const [tid, isLand] of landByTile) {
        if (isLand) landSet.add(tid);
        else waterSet.add(tid);
      }
      landCompId = getLandComponents(landSet);
      waterCompId = getWaterComponents(waterSet);
      landSizes = componentSizes(landCompId);
      waterSizes = componentSizes(waterCompId);
    }

    const toResolve: { id: number; land: boolean }[] = [];

    for (const tid of ambiguous) {
      const t = tileById.get(tid);
      const r = resultsByTile.get(tid);
      if (!t || !r) continue;

      let assignLand: boolean;
      let shouldResolve = false;

      if (topologySampler) {
        const topo = sampleHexTopology(t);
        if (topo.landPolygonIndices.size >= 2) {
          assignLand = true;
          shouldResolve = true;
        } else if (topo.waterRegionIds.size >= 2) {
          assignLand = false;
          shouldResolve = true;
        } else {
          assignLand = topo.landCount > topo.sampleCount / 2;
          shouldResolve = true;
        }
      } else {
        const landNeighbors = t.neighbors.filter((n) => landCompId!.has(n));
        const waterNeighbors = t.neighbors.filter((n) => waterCompId!.has(n));
        const landCompIds = new Set<number>();
        const waterCompIds = new Set<number>();
        for (const n of landNeighbors) {
          const c = landCompId!.get(n);
          if (c !== undefined) landCompIds.add(c);
        }
        for (const n of waterNeighbors) {
          const c = waterCompId!.get(n);
          if (c !== undefined) waterCompIds.add(c);
        }
        const nLandComp = landCompIds.size;
        const nWaterComp = waterCompIds.size;

        if (nLandComp >= 2 && nWaterComp < 2) {
          assignLand = true;
          shouldResolve = true;
        } else if (nWaterComp >= 2 && nLandComp < 2) {
          assignLand = false;
          shouldResolve = true;
        } else if (nLandComp >= 2 && nWaterComp >= 2) {
          if (landSampler) {
            const { lat, lon } = tileCenterToLatLon(t.center);
            assignLand = landSampler(lat, lon);
          } else {
            const sumLand = [...landCompIds].reduce((s, c) => s + (landSizes!.get(c) ?? 0), 0);
            const sumWater = [...waterCompIds].reduce((s, c) => s + (waterSizes!.get(c) ?? 0), 0);
            assignLand = sumLand >= sumWater;
          }
          shouldResolve = true;
        } else if (landNeighbors.length >= 2 && waterNeighbors.length < 2) {
          assignLand = true;
          shouldResolve = true;
        } else if (waterNeighbors.length >= 2 && landNeighbors.length < 2) {
          assignLand = false;
          shouldResolve = true;
        } else if (landNeighbors.length >= 2 || waterNeighbors.length >= 2) {
          assignLand = landNeighbors.length >= waterNeighbors.length;
          shouldResolve = true;
        } else if (
          landNeighbors.length === 0 &&
          r.sampleCount > 0 &&
          r.landCount / r.sampleCount >= islandLandThresh
        ) {
          assignLand = true;
          shouldResolve = true;
        } else {
          if (landSampler) {
            const { lat, lon } = tileCenterToLatLon(t.center);
            assignLand = landSampler(lat, lon);
            shouldResolve = true;
          } else {
            assignLand = r.landCount > r.sampleCount / 2;
            shouldResolve = false;
          }
        }
      }
      if (shouldResolve) toResolve.push({ id: tid, land: assignLand });
    }

    for (const { id, land } of toResolve) {
      landByTile.set(id, land);
      ambiguous.delete(id);
      if (land) definiteLand.add(id);
      else definiteWater.add(id);
    }
    if (toResolve.length === 0) break;
  }

  for (const tid of ambiguous) {
    const t = tileById.get(tid);
    const r = resultsByTile.get(tid);
    let land: boolean;
    if (t && r) {
      if (topologySampler) {
        const topo = sampleHexTopology(t);
        if (topo.landPolygonIndices.size >= 2) land = true;
        else if (topo.waterRegionIds.size >= 2) land = false;
        else land = topo.landCount > topo.sampleCount / 2;
      } else {
        const landNeighbors = t.neighbors.filter((n) => landByTile.get(n));
        if (
          landNeighbors.length === 0 &&
          r.sampleCount > 0 &&
          r.landCount / r.sampleCount >= islandLandThresh
        ) {
          land = true;
        } else if (landSampler) {
          const { lat, lon } = tileCenterToLatLon(t.center);
          land = landSampler(lat, lon);
        } else {
          land = r.landCount > r.sampleCount / 2;
        }
      }
    } else {
      land = true;
    }
    landByTile.set(tid, land);
  }

  return landByTile;
}

/** Connected components of a set of tile ids using the hex graph (neighbors). Returns component id -> set of tile ids. */
function getHexComponents(
  tileIds: Set<number>,
  tileById: Map<number, GeodesicTile>
): Map<number, Set<number>> {
  const compId = new Map<number, number>();
  let id = 0;
  const stack: number[] = [];
  for (const tid of tileIds) {
    if (compId.has(tid)) continue;
    id++;
    stack.length = 0;
    stack.push(tid);
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (compId.has(current)) continue;
      compId.set(current, id);
      const t = tileById.get(current);
      if (!t) continue;
      for (const n of t.neighbors) {
        if (tileIds.has(n) && !compId.has(n)) stack.push(n);
      }
    }
  }
  const byComp = new Map<number, Set<number>>();
  for (const [tid, cid] of compId) {
    let s = byComp.get(cid);
    if (!s) {
      s = new Set();
      byComp.set(cid, s);
    }
    s.add(tid);
  }
  return byComp;
}

/** Depth-limited BFS: tiles reachable from `from` by traversing only water (isLand=false), not through `exclude`, within maxDepth steps. */
function reachableThroughWater(
  from: number,
  exclude: number,
  maxDepth: number,
  isLand: (tid: number) => boolean,
  tileById: Map<number, GeodesicTile>
): Set<number> {
  const out = new Set<number>();
  const queue: { tid: number; d: number }[] = [{ tid: from, d: 0 }];
  const seen = new Set<number>([exclude]);
  while (queue.length > 0) {
    const { tid, d } = queue.shift()!;
    if (out.has(tid)) continue;
    out.add(tid);
    if (d >= maxDepth) continue;
    const t = tileById.get(tid);
    if (!t) continue;
    for (const n of t.neighbors) {
      if (seen.has(n) || isLand(n)) continue;
      seen.add(n);
      queue.push({ tid: n, d: d + 1 });
    }
  }
  return out;
}

/** Depth-limited BFS: tiles reachable from `from` by traversing only land (isLand=true), not through `exclude`, within maxDepth steps. */
function reachableThroughLand(
  from: number,
  exclude: number,
  maxDepth: number,
  isLand: (tid: number) => boolean,
  tileById: Map<number, GeodesicTile>
): Set<number> {
  const out = new Set<number>();
  const queue: { tid: number; d: number }[] = [{ tid: from, d: 0 }];
  const seen = new Set<number>([exclude]);
  while (queue.length > 0) {
    const { tid, d } = queue.shift()!;
    if (out.has(tid)) continue;
    out.add(tid);
    if (d >= maxDepth) continue;
    const t = tileById.get(tid);
    if (!t) continue;
    for (const n of t.neighbors) {
      if (seen.has(n) || !isLand(n)) continue;
      seen.add(n);
      queue.push({ tid: n, d: d + 1 });
    }
  }
  return out;
}

/** Articulation points (cut vertices) of the subgraph induced by tileIds. O(|tileIds| + edges). */
function getArticulationPoints(
  tileIds: Set<number>,
  tileById: Map<number, GeodesicTile>
): Set<number> {
  const points = new Set<number>();
  const depth = new Map<number, number>();
  const low = new Map<number, number>();
  const parent = new Map<number, number>();
  const list = [...tileIds];
  let d = 0;
  const stack: number[] = [];
  const roots: number[] = [];
  for (const start of list) {
    if (depth.has(start)) continue;
    roots.push(start);
    depth.set(start, ++d);
    low.set(start, d);
    parent.set(start, start);
    stack.push(start);
    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      const t = tileById.get(cur);
      if (!t) {
        stack.pop();
        continue;
      }
      let next: number | undefined;
      for (const n of t.neighbors) {
        if (!tileIds.has(n)) continue;
        if (!depth.has(n)) {
          if (next === undefined) next = n;
          continue;
        }
        if (n !== parent.get(cur)) {
          low.set(cur, Math.min(low.get(cur)!, depth.get(n)!));
        }
      }
      if (next !== undefined) {
        depth.set(next, ++d);
        low.set(next, d);
        parent.set(next, cur);
        stack.push(next);
      } else {
        stack.pop();
        const par = parent.get(cur)!;
        if (par !== cur) {
          low.set(par, Math.min(low.get(par)!, low.get(cur)!));
          if (low.get(cur)! >= depth.get(par)!) points.add(par);
        }
      }
    }
  }
  for (const root of roots) {
    let children = 0;
    const t = tileById.get(root);
    if (!t) continue;
    for (const n of t.neighbors) {
      if (tileIds.has(n) && parent.get(n) === root) children++;
    }
    if (children > 1) points.add(root);
  }
  return points;
}

export interface ResolveLandWaterByRegionsOptions {
  /** Only enforce landmass contiguity for landmasses with at least this many hexes. Default 2. */
  minLandmassSize?: number;
  /** Min landmass fraction to consider flipping a water hex to land for bridging. Default 0.08. */
  bridgeThreshold?: number;
  /** Max water-hex "gap" to consider for bridging (1 = only direct neighbors, 2 = allow one water hex between components). Default 2. */
  bridgeMaxGap?: number;
  /** Min ocean fraction to flip a land hex to water for straits (connect seas or open Malacca-style gap). Default 0.25. */
  straitOceanThreshold?: number;
  /** Min ocean fraction to flip land to water when connecting two ocean components. Default 0.12. */
  oceanConnectThreshold?: number;
  /** Max iterations for constraint satisfaction. Default 50. */
  maxIterations?: number;
  /** Depth limit for local strait/isthmus flood fill (boundary hexes only). Default 150. */
  localStraitDepthLimit?: number;
  /** Land components smaller than this that are islands (one ocean) become water. Keep larger (e.g. Hawaii). Default 3 = only remove 1–2 hex islands. */
  minIslandSize?: number;
  /** Water components (lakes) smaller than this become land. Default 2 = only remove 1-hex lakes (keeps each Great Lake). */
  minLakeSize?: number;
  /** Landmass size below which we are land-biased on neutral boundary hexes (keep small islands). Default 25. */
  smallLandmassSize?: number;
  /** Landmass size above which we are sea-biased on neutral boundary hexes (trim coasts). Default 8000. */
  largeLandmassSize?: number;
  /** Called after each main-loop iteration with (iteration, landByTile). If it returns a Promise, it is awaited so the UI can update. */
  onIteration?: (iteration: number, landByTile: Map<number, boolean>) => void | Promise<void>;
  /** If true, place landmasses greedily by size (largest first); new land cannot touch already-placed land, so islands never link to continents. */
  useGreedyLandmassPlacement?: boolean;
}

/**
 * Resolve land/water per contiguous landmass and ocean/lakes. Uses precomputed region scores
 * (from rasters per landmass, ocean, lake). Ensures: (1) each sufficiently large landmass is
 * contiguous, (2) ocean and each lake remain contiguous, (3) no two distinct landmasses touch.
 * When constraints don't apply, uses majority (landFraction > 0.5). Returns tileId -> isLand.
 */
export async function resolveLandWaterByRegions(
  tiles: GeodesicTile[],
  getRegionScores: (tile: GeodesicTile) => RegionScores,
  options: ResolveLandWaterByRegionsOptions = {}
): Promise<Map<number, boolean>> {
  console.log("[polyglobe] resolveLandWaterByRegions: start, tiles:", tiles.length);
  const minLandmassSize = options.minLandmassSize ?? 2;
  const bridgeThreshold = options.bridgeThreshold ?? 0.08;
  const bridgeMaxGap = options.bridgeMaxGap ?? 2;
  const straitOceanThreshold = options.straitOceanThreshold ?? 0.25;
  const oceanConnectThreshold = options.oceanConnectThreshold ?? 0.12;
  const maxIterations = options.maxIterations ?? 50;
  const onIteration = options.onIteration;
  const useGreedyLandmassPlacement = options.useGreedyLandmassPlacement === true;
  const localStraitDepthLimit = options.localStraitDepthLimit ?? 150;
  const minIslandSize = options.minIslandSize ?? 3;
  const minLakeSize = options.minLakeSize ?? 2;
  const smallLandmassSize = options.smallLandmassSize ?? 25;
  const largeLandmassSize = options.largeLandmassSize ?? 8000;

  /** True if removing `tid` from `landSet` would increase the number of connected components (cut vertex). */
  function isCutVertex(tid: number, landSet: Set<number>): boolean {
    if (!landSet.has(tid)) return false;
    const without = new Set(landSet);
    without.delete(tid);
    if (without.size === 0) return false;
    const comps = getHexComponents(without, tileById);
    return comps.size > 1;
  }

  /** True if water hex `nid` is adjacent to `comp` or reachable from `nid` by a path of only water hexes of length <= bridgeMaxGap. */
  function waterReachesComponent(nid: number, comp: Set<number>): boolean {
    if (comp.has(nid)) return true;
    const neighbor = tileById.get(nid);
    if (!neighbor) return false;
    if (neighbor.neighbors.some((n) => comp.has(n))) return true;
    if (bridgeMaxGap < 2) return false;
    for (const w of neighbor.neighbors) {
      if (assign.get(w)?.isLand) continue;
      const wTile = tileById.get(w);
      if (wTile?.neighbors.some((m) => comp.has(m))) return true;
    }
    return false;
  }

  const tileById = new Map<number, GeodesicTile>();
  for (const t of tiles) tileById.set(t.id, t);

  type Assignment = {
    isLand: boolean;
    landmassId?: number;
    oceanRegionId?: number;
    lakeId?: number;
  };
  const assign = new Map<number, Assignment>();
  const scoresCache = new Map<number, RegionScores>();

  function scores(t: GeodesicTile): RegionScores {
    let s = scoresCache.get(t.id);
    if (!s) {
      s = getRegionScores(t);
      scoresCache.set(t.id, s);
    }
    return s;
  }

  if (useGreedyLandmassPlacement) {
    console.log("[polyglobe] resolveLandWaterByRegions: using greedy landmass placement (largest first, no touching already-placed)");
    // Include a small island iff it can be placed without touching a larger already-placed landmass. We only add
    // candidates that have no neighbor in placedLand, so we place exactly the hexes that are not coast-adjacent to
    // a larger continent/island; if part of an island touches, we place the rest (the part that doesn't touch).
    const landmassSizes = new Map<number, number>();
    for (const tile of tiles) {
      const s = scores(tile);
      for (const [id, f] of s.landmassFractions) {
        if (id > 0) landmassSizes.set(id, (landmassSizes.get(id) ?? 0) + f);
      }
    }
    const landmassIdsBySize = [...landmassSizes.entries()]
      .filter(([, size]) => size > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    const placedLand = new Set<number>();
    const smallIslandLandmassFraction = 0.1; // only used when strict rule gives 0 hexes (tiny islands)
    for (const landmassId of landmassIdsBySize) {
      let candidates = new Set<number>();
      for (const tile of tiles) {
        const s = scores(tile);
        let bestId = 0;
        let bestF = 0;
        for (const [id, f] of s.landmassFractions) {
          if (f > bestF) {
            bestF = f;
            bestId = id;
          }
        }
        if (bestId !== landmassId) continue;
        if (s.landFraction <= 0.5) continue;
        if (tile.neighbors.some((n) => placedLand.has(n))) continue;
        candidates.add(tile.id);
      }
      if (candidates.size === 0) {
        for (const tile of tiles) {
          const s = scores(tile);
          let bestId = 0;
          let bestF = 0;
          for (const [id, f] of s.landmassFractions) {
            if (f > bestF) {
              bestF = f;
              bestId = id;
            }
          }
          if (bestId !== landmassId) continue;
          const fThis = s.landmassFractions.get(landmassId) ?? 0;
          if (fThis < smallIslandLandmassFraction) continue;
          if (tile.neighbors.some((n) => placedLand.has(n))) continue;
          candidates.add(tile.id);
        }
      }
      if (candidates.size === 0) continue;

      // Require one connected landmass: if disjoint, find bridge hexes on the raster to connect components.
      const landmassBridgeFraction = 0.15; // min raster fraction for this landmass to allow a hex as bridge
      let components = getHexComponents(candidates, tileById);
      while (components.size > 1) {
        const compList = [...components.values()].sort((a, b) => b.size - a.size);
        const main = compList[0];
        let path: number[] | null = null;
        let otherComp: Set<number> | null = null;
        for (let i = 1; i < compList.length; i++) {
          const other = compList[i];
          // BFS from main to other through allowed hexes: raster says this landmass (fraction >= threshold) and no neighbor in placedLand
          const allowed = new Set<number>();
          for (const tile of tiles) {
            if (tile.neighbors.some((n) => placedLand.has(n))) continue;
            const f = scores(tile).landmassFractions.get(landmassId) ?? 0;
            if (f >= landmassBridgeFraction || candidates.has(tile.id)) allowed.add(tile.id);
          }
          const prev = new Map<number, number>();
          const queue: number[] = [...main];
          const seen = new Set(main);
          while (queue.length > 0) {
            const tid = queue.shift()!;
            if (other.has(tid)) {
              otherComp = other;
              path = [];
              for (let p: number | undefined = tid; p != null; p = prev.get(p)) path.push(p);
              break;
            }
            const t = tileById.get(tid)!;
            for (const nid of t.neighbors) {
              if (!allowed.has(nid) || seen.has(nid)) continue;
              seen.add(nid);
              prev.set(nid, tid);
              queue.push(nid);
            }
          }
          if (path != null) break;
        }
        if (path == null) break; // cannot connect; keep all components that don't touch placedLand (all small islands)
        for (const tid of path) candidates.add(tid);
        components = getHexComponents(candidates, tileById);
      }

      const toAssign = new Set<number>();
      for (const comp of components.values()) {
        for (const tid of comp) toAssign.add(tid);
      }
      for (const tid of toAssign) {
        assign.set(tid, { isLand: true, landmassId });
        placedLand.add(tid);
      }
    }
    for (const tile of tiles) {
      if (assign.has(tile.id)) continue;
      const s = scores(tile);
      let oceanSum = 0;
      let lakeSum = 0;
      for (const f of s.oceanFractions.values()) oceanSum += f;
      for (const f of s.lakeFractions.values()) lakeSum += f;
      if (lakeSum > oceanSum) {
        let bestLake = 0;
        let bestF = 0;
        for (const [id, f] of s.lakeFractions) {
          if (f > bestF) {
            bestF = f;
            bestLake = id;
          }
        }
        assign.set(tile.id, { isLand: false, lakeId: bestLake || undefined });
      } else {
        let bestOcean = 0;
        let bestF = 0;
        for (const [id, f] of s.oceanFractions) {
          if (f > bestF) {
            bestF = f;
            bestOcean = id;
          }
        }
        assign.set(tile.id, { isLand: false, oceanRegionId: bestOcean || undefined });
      }
    }
  } else {
    // Initial assignment: majority rule
    for (const tile of tiles) {
      const s = scores(tile);
      const landFraction = s.landFraction;
      if (landFraction > 0.5) {
        let bestLandmass = 0;
        let bestF = 0;
        for (const [id, f] of s.landmassFractions) {
          if (f > bestF) {
            bestF = f;
            bestLandmass = id;
          }
        }
        assign.set(tile.id, { isLand: true, landmassId: bestLandmass || undefined });
      } else {
        let oceanSum = 0;
        let lakeSum = 0;
        for (const f of s.oceanFractions.values()) oceanSum += f;
        for (const f of s.lakeFractions.values()) lakeSum += f;
        if (lakeSum > oceanSum) {
          let bestLake = 0;
          let bestF = 0;
          for (const [id, f] of s.lakeFractions) {
            if (f > bestF) {
              bestF = f;
              bestLake = id;
            }
          }
          assign.set(tile.id, { isLand: false, lakeId: bestLake || undefined });
        } else {
          let bestOcean = 0;
          let bestF = 0;
          for (const [id, f] of s.oceanFractions) {
            if (f > bestF) {
              bestF = f;
              bestOcean = id;
            }
          }
          assign.set(tile.id, { isLand: false, oceanRegionId: bestOcean || undefined });
        }
      }
    }
  }

  const isLandFn = (tid: number) => assign.get(tid)?.isLand ?? false;
  const getBoundaryTiles = (): Set<number> => {
    const out = new Set<number>();
    for (const tile of tiles) {
      const a = assign.get(tile.id);
      if (!a) continue;
      let hasLand = false;
      let hasWater = false;
      for (const nid of tile.neighbors) {
        if (assign.get(nid)?.isLand) hasLand = true;
        else hasWater = true;
        if (hasLand && hasWater) break;
      }
      if (hasLand && hasWater) out.add(tile.id);
    }
    return out;
  };

  // Do not remove small islands (keep Hawaii, etc.) or fill small lakes (keep all Great Lakes).
  // minIslandSize / minLakeSize remain as options for callers who want that behavior.

  let iterations = 0;
  while (iterations < maxIterations) {
    iterations++;
    if (iterations === 1 || iterations % 10 === 0) {
      console.log("[polyglobe] resolveLandWaterByRegions: main loop iteration", iterations);
    }
    if (onIteration) {
      const landByTileStart = new Map<number, boolean>();
      for (const [tid, a] of assign) landByTileStart.set(tid, a.isLand);
      const result = onIteration(iterations, landByTileStart);
      if (result && typeof (result as Promise<unknown>).then === "function") await result;
    }
    let changed = false;

    const byLandmass = new Map<number, Set<number>>();
    for (const [tid, a] of assign) {
      if (!a.isLand || a.landmassId == null) continue;
      let set = byLandmass.get(a.landmassId);
      if (!set) {
        set = new Set();
        byLandmass.set(a.landmassId, set);
      }
      set.add(tid);
    }
    const cutByLandmass = new Map<number, Set<number>>();
    for (const [landmassId, tileSet] of byLandmass) {
      if (tileSet.size < 2) continue;
      cutByLandmass.set(landmassId, getArticulationPoints(tileSet, tileById));
    }

    // Validate: each landmass must be one connected component; no two landmasses may be adjacent.
    for (const [landmassId, tileSet] of byLandmass) {
      const components = getHexComponents(tileSet, tileById);
      if (components.size > 1) {
        throw new Error(
          `[resolveLandWaterByRegions] Landmass ${landmassId} disconnected (${components.size} components) at iteration ${iterations}`
        );
      }
    }
    for (const [tid, a] of assign) {
      if (!a.isLand || a.landmassId == null) continue;
      const t = tileById.get(tid);
      if (!t) continue;
      for (const nid of t.neighbors) {
        const b = assign.get(nid);
        if (!b?.isLand || b.landmassId == null) continue;
        if (b.landmassId !== a.landmassId) {
          throw new Error(
            `[resolveLandWaterByRegions] Landmasses ${a.landmassId} and ${b.landmassId} connected (tiles ${tid}, ${nid}) at iteration ${iterations}`
          );
        }
      }
    }

    // (0) Strait opening (local): boundary land hex that is the only link between two water bodies → water.
    // Assign to the LARGER body so enclosed seas (Med, Black, Baltic, Red) merge into the ocean.
    const boundary = getBoundaryTiles();
    for (const tid of boundary) {
      const a = assign.get(tid);
      if (!a?.isLand || a.landmassId == null) continue;
      if (cutByLandmass.get(a.landmassId)?.has(tid)) continue;
      const t = tileById.get(tid)!;
      const waterNeighbors: number[] = [];
      for (const nid of t.neighbors) {
        if (!assign.get(nid)?.isLand) waterNeighbors.push(nid);
      }
      if (waterNeighbors.length < 2) continue;
      const reachableA = reachableThroughWater(
        waterNeighbors[0],
        tid,
        localStraitDepthLimit,
        isLandFn,
        tileById
      );
      const inOtherComponent = waterNeighbors.find((w) => !reachableA.has(w));
      if (inOtherComponent == null) continue;
      const reachableB = reachableThroughWater(
        inOtherComponent,
        tid,
        localStraitDepthLimit,
        isLandFn,
        tileById
      );
      const oceanIdA = assign.get(waterNeighbors[0])?.oceanRegionId ?? 1;
      const oceanIdB = assign.get(inOtherComponent)?.oceanRegionId ?? 1;
      const sizeA = reachableA.size;
      const sizeB = reachableB.size;
      const oceanId = sizeA >= sizeB ? oceanIdA : oceanIdB;
      assign.set(tid, { isLand: false, oceanRegionId: oceanId });
      changed = true;
      break;
    }
    if (changed) continue;

    // (0b) Isthmus (local): boundary water hex where land neighbors connect through landmass → land
    for (const tid of boundary) {
      const a = assign.get(tid);
      if (a?.isLand) continue;
      const t = tileById.get(tid)!;
      const landNeighbors: number[] = [];
      for (const nid of t.neighbors) {
        if (assign.get(nid)?.isLand) landNeighbors.push(nid);
      }
      if (landNeighbors.length < 2) continue;
      const reachable = reachableThroughLand(
        landNeighbors[0],
        tid,
        localStraitDepthLimit,
        isLandFn,
        tileById
      );
      const another = landNeighbors.find((l) => l !== landNeighbors[0] && reachable.has(l));
      if (another == null) continue;
      const landmassId = assign.get(landNeighbors[0])?.landmassId ?? 0;
      assign.set(tid, { isLand: true, landmassId });
      changed = true;
      break;
    }
    if (changed) continue;

    // (1a) Isthmus between different landmasses: water hex between two landmasses (e.g. Panama) → land
    for (const tile of tiles) {
      const a = assign.get(tile.id);
      if (a?.isLand) continue;
      const neighborLandmassIds = new Set<number>();
      for (const nid of tile.neighbors) {
        const na = assign.get(nid);
        if (na?.isLand && na.landmassId != null) neighborLandmassIds.add(na.landmassId);
      }
      for (const idA of neighborLandmassIds) {
        if (changed) break;
        const setA = byLandmass.get(idA)!;
        if (!tile.neighbors.some((n) => setA.has(n))) continue;
        for (const [idB, setB] of byLandmass) {
          if (idB === idA) continue;
          if (!waterReachesComponent(tile.id, setB)) continue;
          const s = scores(tile);
          if (s.landFraction < bridgeThreshold) continue;
          const fA = s.landmassFractions.get(idA) ?? 0;
          const fB = s.landmassFractions.get(idB) ?? 0;
          if (fA + fB < bridgeThreshold) continue;
          const assignTo = fA >= fB ? idA : idB;
          const mergeFrom = assignTo === idA ? idB : idA;
          assign.set(tile.id, { isLand: true, landmassId: assignTo });
          for (const [tid, aa] of assign) {
            if (aa.isLand && aa.landmassId === mergeFrom) assign.set(tid, { ...aa, landmassId: assignTo });
          }
          changed = true;
          break;
        }
      }
    }
    if (changed) continue;

    // (1) Landmass contiguity: for each landmass with >= minLandmassSize hexes, ensure one component
    for (const [landmassId, tileSet] of byLandmass) {
      if (tileSet.size < minLandmassSize) continue;
      const components = getHexComponents(tileSet, tileById);
      if (components.size <= 1) continue;
      // Find a water hex adjacent to two different components with high fraction for this landmass
      const compList = [...components.values()];
      for (let i = 0; i < compList.length; i++) {
        for (let j = i + 1; j < compList.length; j++) {
          const cA = compList[i];
          const cB = compList[j];
          let best: { tid: number; f: number } | null = null;
          for (const tid of cA) {
            const t = tileById.get(tid);
            if (!t) continue;
            for (const nid of t.neighbors) {
              if (assign.get(nid)?.isLand) continue;
              const neighbor = tileById.get(nid);
              if (!neighbor) continue;
              const touchesA = cA.has(nid) || neighbor.neighbors.some((n) => cA.has(n));
              if (!touchesA) continue;
              if (!waterReachesComponent(nid, cB)) continue;
              const s = scores(neighbor);
              const f = s.landmassFractions.get(landmassId) ?? 0;
              if (f < bridgeThreshold) continue;
              const neighborLandmassIds = new Set<number>();
              for (const n of neighbor.neighbors) {
                const a = assign.get(n);
                if (a?.isLand && a.landmassId != null) neighborLandmassIds.add(a.landmassId);
              }
              if (neighborLandmassIds.size > 1) continue;
              if (!best || f > best.f) best = { tid: nid, f };
            }
          }
          if (best) {
            const t = tileById.get(best.tid)!;
            const s = scores(t);
            let bestLm = 0;
            let bestF = 0;
            for (const [id, f] of s.landmassFractions) {
              if (f > bestF) {
                bestF = f;
                bestLm = id;
              }
            }
            assign.set(best.tid, { isLand: true, landmassId: bestLm || landmassId });
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
      if (changed) break;
    }
    if (changed) continue;

    // (2) Ocean contiguity: open straits by flipping land to water so two parts of the same water body connect.
    // Only flip land that is not an articulation point (isthmus): strait land can be removed without disconnecting a landmass.
    const oceanTiles = new Set<number>();
    for (const [tid, a] of assign) {
      if (!a.isLand && a.oceanRegionId != null) oceanTiles.add(tid);
    }
    if (oceanTiles.size >= minLandmassSize) {
      const components = getHexComponents(oceanTiles, tileById);
      if (components.size > 1) {
        const compList = [...components.values()];
        for (let i = 0; i < compList.length && !changed; i++) {
          for (let j = i + 1; j < compList.length; j++) {
            const boundary = new Set<number>();
            for (const tid of compList[i]) {
              const t = tileById.get(tid)!;
              for (const nid of t.neighbors) boundary.add(nid);
            }
            for (const tid of compList[j]) {
              const t = tileById.get(tid)!;
              for (const nid of t.neighbors) boundary.add(nid);
            }
            const toFlip: { tid: number; bestOcean: number }[] = [];
            for (const tid of boundary) {
              const a = assign.get(tid);
              if (!a?.isLand || a.landmassId == null) continue;
              if (cutByLandmass.get(a.landmassId)?.has(tid)) continue;
              const t = tileById.get(tid)!;
              const s = scores(t);
              let oceanF = 0;
              for (const f of s.oceanFractions.values()) oceanF += f;
              if (oceanF < oceanConnectThreshold) continue;
              const hasA = t.neighbors.some((n) => compList[i].has(n));
              const hasB = t.neighbors.some((n) => compList[j].has(n));
              if (!hasA || !hasB) continue;
              let bestOcean = 0;
              let bestF = 0;
              for (const [id, f] of s.oceanFractions) {
                if (f > bestF) {
                  bestF = f;
                  bestOcean = id;
                }
              }
              toFlip.push({ tid, bestOcean: bestOcean || 1 });
            }
            for (const { tid, bestOcean } of toFlip) {
              assign.set(tid, { isLand: false, oceanRegionId: bestOcean });
              changed = true;
            }
            if (changed) break;
          }
        }
      }
    }
    if (changed) continue;

    // (3) Lake contiguity: each lake one component (similar)
    const byLake = new Map<number, Set<number>>();
    for (const [tid, a] of assign) {
      if (!a.isLand && a.lakeId != null) {
        let set = byLake.get(a.lakeId);
        if (!set) {
          set = new Set();
          byLake.set(a.lakeId, set);
        }
        set.add(tid);
      }
    }
    for (const [lakeId, tileSet] of byLake) {
      if (tileSet.size < 2) continue;
      const components = getHexComponents(tileSet, tileById);
      if (components.size <= 1) continue;
      const compList = [...components.values()];
      for (let i = 0; i < compList.length && !changed; i++) {
        for (let j = i + 1; j < compList.length; j++) {
          let best: { tid: number; f: number } | null = null;
          const boundary = new Set<number>();
          for (const tid of compList[i]) {
            for (const nid of tileById.get(tid)!.neighbors) boundary.add(nid);
          }
          for (const tid of compList[j]) {
            for (const nid of tileById.get(tid)!.neighbors) boundary.add(nid);
          }
          for (const tid of boundary) {
            const a = assign.get(tid);
            if (!a?.isLand || a.landmassId == null) continue;
            if (cutByLandmass.get(a.landmassId)?.has(tid)) continue;
            const s = scores(tileById.get(tid)!);
            const f = s.lakeFractions.get(lakeId) ?? 0;
            if (f < 0.2) continue;
            const t = tileById.get(tid)!;
            const hasA = t.neighbors.some((n) => compList[i].has(n));
            const hasB = t.neighbors.some((n) => compList[j].has(n));
            if (hasA && hasB && (!best || f > best.f)) best = { tid, f };
          }
          if (best) {
            assign.set(best.tid, { isLand: false, lakeId });
            changed = true;
            break;
          }
        }
      }
    }
    if (changed) continue;

    // (4) No two landmasses touch: flip one of two adjacent hexes (different landmasses) to water. Use articulation points so we only flip non–cut vertices (O(tiles) per iteration).
    for (const tid of boundary) {
      const a = assign.get(tid);
      if (!a?.isLand || a.landmassId == null) continue;
      const t = tileById.get(tid)!;
      for (const nid of t.neighbors) {
        const b = assign.get(nid);
        if (!b?.isLand || b.landmassId == null || b.landmassId === a.landmassId) continue;
        const cutA = cutByLandmass.get(a.landmassId);
        const cutB = cutByLandmass.get(b.landmassId!);
        const tileCut = cutA?.has(tid);
        const neighborCut = cutB?.has(nid);
        let flipId: number;
        if (!tileCut && !neighborCut) {
          const sA = scores(tile);
          const sB = scores(tileById.get(nid)!);
          const fracA = sA.landmassFractions.get(a.landmassId) ?? 0;
          const fracB = sB.landmassFractions.get(b.landmassId!) ?? 0;
          flipId = fracA <= fracB ? tid : nid;
        } else if (!tileCut) flipId = tid;
        else if (!neighborCut) flipId = nid;
        else continue;
        const oceanId = 1;
        assign.set(flipId, { isLand: false, oceanRegionId: oceanId });
        changed = true;
        break;
      }
      if (changed) break;
    }

    // (5) Size bias on neutral boundary hexes: land-biased if landmass small (keep Hawaii, small islands), sea-biased if landmass big (trim coasts).
    const cutByLandmassForBias = new Map<number, Set<number>>();
    for (const [landmassId, tileSet] of byLandmass) {
      if (tileSet.size < 2) continue;
      cutByLandmassForBias.set(landmassId, getArticulationPoints(tileSet, tileById));
    }
    for (const tid of boundary) {
      const a = assign.get(tid);
      const t = tileById.get(tid)!;
      if (a?.isLand) {
        const landmassId = a.landmassId;
        if (landmassId == null) continue;
        const tileSet = byLandmass.get(landmassId);
        if (!tileSet) continue;
        if (cutByLandmassForBias.get(landmassId)?.has(tid)) continue;
        const size = tileSet.size;
        if (size > largeLandmassSize) {
          const waterNeighbor = t.neighbors.find((n) => !assign.get(n)?.isLand);
          if (waterNeighbor != null) {
            const oceanId = assign.get(waterNeighbor)?.oceanRegionId ?? 1;
            assign.set(tid, { isLand: false, oceanRegionId: oceanId });
            changed = true;
            break;
          }
        }
      } else {
        const landNeighbors: number[] = [];
        for (const nid of t.neighbors) {
          if (assign.get(nid)?.isLand) landNeighbors.push(nid);
        }
        if (landNeighbors.length === 0) continue;
        const reachable = reachableThroughLand(
          landNeighbors[0],
          tid,
          localStraitDepthLimit,
          isLandFn,
          tileById
        );
        const inOther = landNeighbors.find((l) => !reachable.has(l));
        if (inOther != null) continue;
        const landmassId = assign.get(landNeighbors[0])?.landmassId;
        if (landmassId == null) continue;
        const tileSet = byLandmass.get(landmassId);
        if (!tileSet || tileSet.size >= smallLandmassSize) continue;
        assign.set(tid, { isLand: true, landmassId });
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }
  console.log("[polyglobe] resolveLandWaterByRegions: main loop done, iterations:", iterations);

  const out = new Map<number, boolean>();
  for (const [tid, a] of assign) out.set(tid, a.isLand);
  return out;
}

/**
 * Build a tileId → TileTerrainData map by sampling the raster (center only or center + vertices).
 * Works at any subdivision: more tiles = finer sampling of the same raster.
 * When topologyResolve is true, mixed land/water tiles are resolved to preserve straits and isthmuses.
 */
export async function buildTerrainFromEarthRaster(
  tiles: GeodesicTile[],
  raster: EarthRaster,
  options: BuildTerrainFromRasterOptions = {}
): Promise<Map<number, TileTerrainData>> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const out = new Map<number, TileTerrainData>();

  // First pass: sample every tile, store elevation per tile for neighbor relief
  const elevationByTile = new Map<number, number>();
  const resultsByTile = new Map<number, ReturnType<typeof sampleTile>>();
  const onFirstPassProgress = opts.onFirstPassProgress;
  const progressInterval = 2000;
  console.log("[polyglobe] buildTerrainFromEarthRaster: first pass sampling", tiles.length, "tiles");
  let sampled = 0;
  for (const tile of tiles) {
    const result = sampleTile(tile, raster, opts);
    resultsByTile.set(tile.id, result);
    const elevM =
      result.land && result.elevationM != null && result.elevationM > 0 ? result.elevationM : 0;
    elevationByTile.set(tile.id, elevM);
    sampled++;
    if (onFirstPassProgress && sampled % progressInterval === 0) {
      const p = onFirstPassProgress(sampled, tiles.length);
      if (p && typeof (p as Promise<unknown>).then === "function") await p;
    }
  }
  console.log("[polyglobe] buildTerrainFromEarthRaster: first pass done, resolving land/water");

  const landByTile = opts.getRegionScores
    ? await resolveLandWaterByRegions(tiles, opts.getRegionScores, opts.resolveOptions ?? {})
    : opts.topologyResolve && opts.sampleMode === "tile"
      ? resolveLandWaterByTopology(tiles, resultsByTile, opts)
      : null;

  console.log("[polyglobe] buildTerrainFromEarthRaster: land/water done, building output");

  for (const tile of tiles) {
    const result = resultsByTile.get(tile.id)!;
    const land = landByTile ? (landByTile.get(tile.id) ?? result.land) : result.land;
    const effectiveResult = { ...result, land };
    let neighborMaxElevM = 0;
    for (const neighborId of tile.neighbors) {
      const nElev = elevationByTile.get(neighborId) ?? 0;
      if (nElev > neighborMaxElevM) neighborMaxElevM = nElev;
    }
    const { type, elevation } = terrainFromSample(
      effectiveResult,
      result.latRad,
      opts,
      neighborMaxElevM,
      result.maxAbsLatDeg
    );
    let elev = elevation;
    if (land && result.elevationM != null && result.elevationM > 0) {
      elev = opts.landElevation + result.elevationM * opts.elevationScale;
    } else if (!land) {
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
