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
  /** Noise strength (Gaussian std dev for direction in rad, and for strength). Default 0.15 rad, 0.1. */
  noiseDirectionRad?: number;
  noiseStrength?: number;
  /** Seed for reproducible noise. Default 12345. */
  seed?: number;
  /** If provided, reduce wind strength over land and more over elevated tiles. */
  getTerrain?: (tileId: number) => { isWater?: boolean; elevation?: number } | undefined;
  /** Terrain: strength multiplier for water (default 1), land (default 0.6), mountain (default 0.3). */
  terrainStrengthWater?: number;
  terrainStrengthLand?: number;
  terrainStrengthMountain?: number;
}

/** Simple seeded random for reproducible noise. */
function seededRandom(seed: number): () => number {
  return function next() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}

/** Box-Muller for Gaussian. */
function gaussian(rng: () => number, mean: number, std: number): number {
  const u1 = rng();
  const u2 = rng();
  if (u1 < 1e-10) return mean;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

/**
 * Base wind direction and relative strength by latitude (no season).
 * - Trade winds: 0–30° → from east (easterly); 30–60° westerlies; 60–90° polar easterlies.
 * - Strength peaks in mid-latitudes (westerlies) and trades.
 */
function baseWindAtLat(latDeg: number): { directionRad: number; strength: number } {
  const absLat = Math.abs(latDeg);
  let directionRad: number; // direction wind is coming FROM
  let strength: number;
  if (absLat <= 25) {
    // Trade winds: from east (blow westward)
    directionRad = 0; // from east
    strength = 0.5 + 0.4 * (1 - absLat / 25);
  } else if (absLat <= 55) {
    // Westerlies: from west (blow eastward)
    directionRad = Math.PI;
    const mid = 40;
    strength = 0.6 + 0.35 * Math.exp(-Math.pow((absLat - mid) / 20, 2));
  } else {
    // Polar easterlies: from east
    directionRad = 0;
    strength = 0.3 + 0.2 * (1 - (absLat - 55) / 35);
  }
  return { directionRad, strength };
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
    getTerrain?: ComputeWindOptions["getTerrain"];
    terrainStrengthWater: number;
    terrainStrengthLand: number;
    terrainStrengthMountain: number;
  },
  rng: () => number,
): TileWind {
  const {
    subsolarLatDeg,
    baseStrength,
    noiseDirectionRad,
    noiseStrength,
    getTerrain,
    terrainStrengthWater,
    terrainStrengthLand,
    terrainStrengthMountain,
  } = options;

  const { lat } = tileCenterToLatLon(tile.center);
  const latDeg = (lat * 180) / Math.PI;
  const effLat = effectiveLatForSeason(latDeg, subsolarLatDeg);
  let { directionRad, strength } = baseWindAtLat(effLat);

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

  directionRad += gaussian(rng, 0, noiseDirectionRad);
  strength *= 1 + gaussian(rng, 0, noiseStrength);
  strength = Math.max(0.05, Math.min(1, strength)) * baseStrength;

  return { directionRad, strength };
}

/**
 * Compute wind for each tile. Uses tile center lat/lon, optional terrain modulation, and Gaussian noise.
 */
export function computeWindForTiles(
  tiles: GeodesicTile[],
  options: ComputeWindOptions = {}
): Map<number, TileWind> {
  const {
    subsolarLatDeg = 0,
    baseStrength = 1,
    noiseDirectionRad = 0.15,
    noiseStrength = 0.1,
    seed = 12345,
    getTerrain,
    terrainStrengthWater = 1,
    terrainStrengthLand = 0.6,
    terrainStrengthMountain = 0.3,
  } = options;

  const rng = seededRandom(seed);
  const out = new Map<number, TileWind>();
  const tileOpts = {
    subsolarLatDeg,
    baseStrength,
    noiseDirectionRad,
    noiseStrength,
    getTerrain,
    terrainStrengthWater,
    terrainStrengthLand,
    terrainStrengthMountain,
  };

  for (const tile of tiles) {
    out.set(tile.id, computeWindForGeodesicTile(tile, tileOpts, rng));
  }

  return out;
}

/**
 * Wind for a subset of tiles only (e.g. near a ship). Per-tile RNG is derived from `(seed, tileId)` so
 * values differ from {@link computeWindForTiles} (order-dependent stream) but are stable for a given id.
 */
export function computeWindForGlobeTileIds(
  globe: Globe,
  tileIds: Iterable<number>,
  options: ComputeWindOptions = {},
): Map<number, TileWind> {
  const {
    subsolarLatDeg = 0,
    baseStrength = 1,
    noiseDirectionRad = 0.15,
    noiseStrength = 0.1,
    seed = 12345,
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
    getTerrain,
    terrainStrengthWater,
    terrainStrengthLand,
    terrainStrengthMountain,
  };

  const out = new Map<number, TileWind>();
  for (const id of tileIds) {
    const tile = globe.getTile(id);
    if (!tile) continue;
    const rng = seededRandom((seed ^ Math.imul(id, 2654435761)) >>> 0);
    out.set(id, computeWindForGeodesicTile(tile, tileOpts, rng));
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

/**
 * Wind at an arbitrary lat/lon (degrees), same latitude bands as {@link computeWindForTiles} but with
 * deterministic jitter from (seed, position, sim minute) — no tile loop, for cloud advection.
 */
export function windAtLatLonDeg(
  latDeg: number,
  lonDeg: number,
  subsolarLatDeg: number,
  options: { baseStrength?: number; seed?: number; simMinute?: number } = {}
): TileWind {
  const { baseStrength = 1, seed = 12345, simMinute = 0 } = options;
  const effLat = effectiveLatForSeason(latDeg, subsolarLatDeg);
  let { directionRad, strength } = baseWindAtLat(effLat);
  const la = Math.round(latDeg * 500);
  const lo = Math.round(lonDeg * 500);
  const h1 = u32Hash([seed, la, lo, simMinute, 0x7e3779b9]);
  const h2 = u32Hash([seed, la, lo, simMinute, 0x9e3779b1]);
  const dirJitter = ((h1 & 0xffff) / 0xffff - 0.5) * 2 * 0.12;
  const strMul = 0.85 + ((h2 & 0xffff) / 0xffff) * 0.3;
  directionRad += dirJitter;
  strength = Math.max(0.05, Math.min(1, strength * strMul * baseStrength));
  return { directionRad, strength };
}
