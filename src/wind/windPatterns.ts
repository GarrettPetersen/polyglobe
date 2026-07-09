/**
 * Seasonal wind patterns for globe visualization (trade winds, westerlies, polar easterlies).
 * Uses date for seasonal shift (ITCZ / pressure belts follow sun). Optional terrain modulation.
 */

import type { GeodesicTile } from "../core/geodesic.js";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";

/** Wind at a tile: direction in radians (0 = east, π/2 = north), strength in 0–1 or m/s scale. */
export interface TileWind {
  /** Direction wind is coming FROM (radians). 0 = from east, π/2 = from north. */
  directionRad: number;
  /** Strength (0–1 normalized, or use as relative scale). */
  strength: number;
}

export interface ComputeWindOptions {
  /** Subsolar latitude in degrees (from date). Default 0. */
  subsolarLatDeg?: number;
  /** Base strength multiplier. Default 1. */
  baseStrength?: number;
  /** Coherent field strength for direction (radians) and speed. Default 0.22 rad, 0.32. */
  noiseDirectionRad?: number;
  noiseStrength?: number;
  /** Seed for reproducible noise. Default 12345. */
  seed?: number;
  /** Simulated UTC minute for the coherent annual wind field. Default 0. */
  simMinute?: number;
  /** If provided, reduce wind strength over land and more over elevated tiles. */
  getTerrain?: (tileId: number) => { isWater?: boolean; elevation?: number } | undefined;
  /** Terrain: strength multiplier for water (default 1), land (default 0.6), mountain (default 0.3). */
  terrainStrengthWater?: number;
  terrainStrengthLand?: number;
  terrainStrengthMountain?: number;
}

/** Bump when the deterministic wind field changes in a way that invalidates baked wind-driven assets. */
export const WIND_FIELD_MODEL_VERSION = 2;

const WIND_YEAR_MINUTES = 365 * 1440;
const WIND_TIME_CELL_MINUTES = 5 * 1440;
const WIND_TIME_CELLS = WIND_YEAR_MINUTES / WIND_TIME_CELL_MINUTES;
const WIND_LAT_CELL_DEG = 12;
const WIND_LON_CELL_DEG = 20;
const WIND_LAT_CELLS = 180 / WIND_LAT_CELL_DEG;
const WIND_LON_CELLS = 360 / WIND_LON_CELL_DEG;
const MIN_WIND_STRENGTH = 0.025;
const MAX_BASE_WIND_STRENGTH = 0.78;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function positiveModulo(value: number, divisor: number): number {
  const m = value % divisor;
  return m < 0 ? m + divisor : m;
}

/**
 * Base wind direction and relative strength by latitude (no season), blended as vectors so pressure
 * belt boundaries become calmer transition zones instead of hard easterly/westerly flips.
 */
function baseWindAtLat(latDeg: number): { directionRad: number; strength: number } {
  const absLat = Math.min(90, Math.abs(latDeg));
  const hemisphere = latDeg >= 0 ? 1 : -1;

  const tradeWeight = 1 - smoothstep(18, 34, absLat);
  const westerlyWeight = smoothstep(18, 34, absLat) * (1 - smoothstep(52, 68, absLat));
  const polarWeight = smoothstep(52, 68, absLat);

  const tradeDir = hemisphere > 0 ? Math.PI * 0.25 : -Math.PI * 0.25;
  const westerlyDir = hemisphere > 0 ? -Math.PI * 0.75 : Math.PI * 0.75;
  const polarDir = hemisphere > 0 ? Math.PI * 0.12 : -Math.PI * 0.12;

  const tradeStrength = 0.34 + 0.22 * (1 - smoothstep(0, 22, absLat));
  const westerlyStrength = 0.4 + 0.22 * Math.exp(-Math.pow((absLat - 42) / 15, 2));
  const polarStrength = 0.2 + 0.13 * smoothstep(60, 85, absLat);

  let x = 0;
  let y = 0;
  x += Math.cos(tradeDir) * tradeWeight * tradeStrength;
  y += Math.sin(tradeDir) * tradeWeight * tradeStrength;
  x += Math.cos(westerlyDir) * westerlyWeight * westerlyStrength;
  y += Math.sin(westerlyDir) * westerlyWeight * westerlyStrength;
  x += Math.cos(polarDir) * polarWeight * polarStrength;
  y += Math.sin(polarDir) * polarWeight * polarStrength;

  const strength = Math.hypot(x, y);
  if (strength < 1e-6) {
    return { directionRad: hemisphere > 0 ? Math.PI * 0.25 : -Math.PI * 0.25, strength: MIN_WIND_STRENGTH };
  }

  return {
    directionRad: Math.atan2(y, x),
    strength: clamp(strength, MIN_WIND_STRENGTH, MAX_BASE_WIND_STRENGTH),
  };
}

/**
 * Shift latitude bands with season (ITCZ follows sun). Returns effective latitude for lookup.
 */
function effectiveLatForSeason(latDeg: number, subsolarLatDeg: number): number {
  // Shift bands by ~subsolarLatDeg so trades move N/S
  return latDeg - subsolarLatDeg * 0.4;
}

function computeWindForGeodesicTile(
  tile: GeodesicTile,
  options: {
    subsolarLatDeg: number;
    baseStrength: number;
    noiseDirectionRad: number;
    noiseStrength: number;
    seed: number;
    simMinute: number;
    getTerrain?: ComputeWindOptions["getTerrain"];
    terrainStrengthWater: number;
    terrainStrengthLand: number;
    terrainStrengthMountain: number;
  },
): TileWind {
  const {
    subsolarLatDeg,
    baseStrength,
    noiseDirectionRad,
    noiseStrength,
    seed,
    simMinute,
    getTerrain,
    terrainStrengthWater,
    terrainStrengthLand,
    terrainStrengthMountain,
  } = options;

  const { lat, lon } = tileCenterToLatLon(tile.center);
  const latDeg = (lat * 180) / Math.PI;
  const lonDeg = (lon * 180) / Math.PI;
  const wind = windAtLatLonDeg(latDeg, lonDeg, subsolarLatDeg, {
    baseStrength: 1,
    seed,
    simMinute,
    noiseDirectionRad,
    noiseStrength,
  });
  const { directionRad } = wind;
  let { strength } = wind;

  if (getTerrain) {
    const t = getTerrain(tile.id);
    if (t) {
      const elev = t.elevation ?? 0;
      const isMountain = elev > 0.15;
      if (t.isWater === true) {
        strength *= terrainStrengthWater;
      } else if (isMountain) {
        strength *= terrainStrengthMountain;
      } else {
        strength *= terrainStrengthLand;
      }
    }
  }

  strength = clamp(strength * baseStrength, MIN_WIND_STRENGTH, 1);

  return { directionRad, strength };
}

/**
 * Compute wind for each tile. Uses tile center lat/lon, optional terrain modulation, and coherent noise.
 */
export function computeWindForTiles(
  tiles: GeodesicTile[],
  options: ComputeWindOptions = {}
): Map<number, TileWind> {
  const {
    subsolarLatDeg = 0,
    baseStrength = 1,
    noiseDirectionRad = 0.22,
    noiseStrength = 0.32,
    seed = 12345,
    simMinute = 0,
    getTerrain,
    terrainStrengthWater = 1,
    terrainStrengthLand = 0.6,
    terrainStrengthMountain = 0.3,
  } = options;

  const out = new Map<number, TileWind>();
  const tileOpts = {
    subsolarLatDeg,
    baseStrength,
    noiseDirectionRad,
    noiseStrength,
    seed,
    simMinute,
    getTerrain,
    terrainStrengthWater,
    terrainStrengthLand,
    terrainStrengthMountain,
  };

  for (const tile of tiles) {
    out.set(tile.id, computeWindForGeodesicTile(tile, tileOpts));
  }

  return out;
}

/**
 * Wind for a subset of tiles only (e.g. near a ship). Uses the same coordinate field as
 * {@link computeWindForTiles}, so partial and full maps agree for a given date.
 */
export function computeWindForGlobeTileIds(
  globe: Globe,
  tileIds: Iterable<number>,
  options: ComputeWindOptions = {},
): Map<number, TileWind> {
  const {
    subsolarLatDeg = 0,
    baseStrength = 1,
    noiseDirectionRad = 0.22,
    noiseStrength = 0.32,
    seed = 12345,
    simMinute = 0,
    getTerrain,
    terrainStrengthWater = 1,
    terrainStrengthLand = 0.6,
    terrainStrengthMountain = 0.3,
  } = options;

  const tileOpts = {
    subsolarLatDeg,
    baseStrength,
    noiseDirectionRad,
    noiseStrength,
    seed,
    simMinute,
    getTerrain,
    terrainStrengthWater,
    terrainStrengthLand,
    terrainStrengthMountain,
  };

  const out = new Map<number, TileWind>();
  for (const id of tileIds) {
    const tile = globe.getTile(id);
    if (!tile) continue;
    out.set(id, computeWindForGeodesicTile(tile, tileOpts));
  }
  return out;
}

/** Deterministic mixing for {@link windAtLatLonDeg}. */
function u32Hash(parts: readonly number[]): number {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function unitFromHash(parts: readonly number[]): number {
  return u32Hash(parts) / 0xffffffff;
}

function windLatticeNoise(
  seed: number,
  latCell: number,
  lonCell: number,
  timeCell: number,
  salt: number,
): number {
  return unitFromHash([seed, latCell, lonCell, timeCell, salt]);
}

function coherentWindNoise(
  seed: number,
  latDeg: number,
  lonDeg: number,
  simMinute: number,
  salt: number,
): number {
  const latPos = clamp(latDeg + 90, 0, 180) / WIND_LAT_CELL_DEG;
  const lat0 = Math.min(WIND_LAT_CELLS, Math.floor(latPos));
  const lat1 = Math.min(WIND_LAT_CELLS, lat0 + 1);
  const latU = smoothstep(0, 1, latPos - lat0);

  const lonWrapped = positiveModulo(lonDeg + 180, 360);
  const lonPos = lonWrapped / WIND_LON_CELL_DEG;
  const lon0 = Math.floor(lonPos) % WIND_LON_CELLS;
  const lon1 = (lon0 + 1) % WIND_LON_CELLS;
  const lonU = smoothstep(0, 1, lonPos - Math.floor(lonPos));

  const minute = positiveModulo(Math.floor(simMinute), WIND_YEAR_MINUTES);
  const timePos = minute / WIND_TIME_CELL_MINUTES;
  const time0 = Math.floor(timePos) % WIND_TIME_CELLS;
  const time1 = (time0 + 1) % WIND_TIME_CELLS;
  const timeU = smoothstep(0, 1, timePos - Math.floor(timePos));

  const n000 = windLatticeNoise(seed, lat0, lon0, time0, salt);
  const n010 = windLatticeNoise(seed, lat1, lon0, time0, salt);
  const n100 = windLatticeNoise(seed, lat0, lon1, time0, salt);
  const n110 = windLatticeNoise(seed, lat1, lon1, time0, salt);
  const n001 = windLatticeNoise(seed, lat0, lon0, time1, salt);
  const n011 = windLatticeNoise(seed, lat1, lon0, time1, salt);
  const n101 = windLatticeNoise(seed, lat0, lon1, time1, salt);
  const n111 = windLatticeNoise(seed, lat1, lon1, time1, salt);

  const a0 = lerp(lerp(n000, n100, lonU), lerp(n010, n110, lonU), latU);
  const a1 = lerp(lerp(n001, n101, lonU), lerp(n011, n111, lonU), latU);
  return lerp(a0, a1, timeU);
}

function coherentSignedWindNoise(
  seed: number,
  latDeg: number,
  lonDeg: number,
  simMinute: number,
  salt: number,
): number {
  return coherentWindNoise(seed, latDeg, lonDeg, simMinute, salt) * 2 - 1;
}

/**
 * Wind at an arbitrary lat/lon (degrees), with smooth latitude belts and a coherent annual field for
 * gusts/lulls. Adjacent coordinates and adjacent times interpolate through the same field.
 */
export function windAtLatLonDeg(
  latDeg: number,
  lonDeg: number,
  subsolarLatDeg: number,
  options: {
    baseStrength?: number;
    seed?: number;
    simMinute?: number;
    noiseDirectionRad?: number;
    noiseStrength?: number;
  } = {}
): TileWind {
  const {
    baseStrength = 1,
    seed = 12345,
    simMinute = 0,
    noiseDirectionRad = 0.22,
    noiseStrength = 0.32,
  } = options;
  const effLat = effectiveLatForSeason(latDeg, subsolarLatDeg);
  let { directionRad, strength } = baseWindAtLat(effLat);
  const directionJitter = coherentSignedWindNoise(
    seed,
    latDeg,
    lonDeg,
    simMinute,
    0x7e3779b9,
  ) * noiseDirectionRad;
  const gust = coherentSignedWindNoise(seed, latDeg, lonDeg, simMinute, 0x9e3779b1);
  const lull = coherentWindNoise(seed, latDeg + 19.7, lonDeg - 73.3, simMinute + 997, 0x85ebca6b);
  const strengthMul = Math.max(0.18, 1 + gust * noiseStrength * 1.8);
  const lullCut = smoothstep(0.55, 1, lull) * noiseStrength * 1.25;

  directionRad += directionJitter;
  strength = clamp(strength * Math.max(0.14, strengthMul - lullCut) * baseStrength, MIN_WIND_STRENGTH, 1);
  return { directionRad, strength };
}
