/**
 * One **pre-baked UTC calendar year** (365 rows) of **discrete** per-tile weather for cheap runtime
 * playback. Built once from annual precip potential + temperature; no per-minute cloud physics at play.
 *
 * Flags are bitmasks (games can test with `&`). “Rain/snow today” is binary; ground uses the same
 * packed byte for wet / snow-on-ground persistence from a simple day-stepped carry model at bake time.
 *
 * **Circular carry:** Wet/snow carry is relaxed to a **periodic** fixed point so Dec 31 → Jan 1 does
 * not reset latent ground state — the same row-0 bake is consistent with coming after row 364.
 */

import type { Globe } from "../core/Globe.js";
import type { GeodesicTile } from "../core/geodesic.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import type { TerrainType } from "../terrain/types.js";
import { getTileTemperature01 } from "./seasonalClimate.js";
import type { AnnualTileWeatherTables } from "./annualWeatherTables.js";
import type { TileSurfaceState } from "./tileSurfaceState.js";

const DAYS = 365;
const REF_YEAR = 2023;

function u32Hash(parts: readonly number[]): number {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function unitFloat(h: number): number {
  return (h >>> 0) / 0xffffffff;
}

function baseNoonUtcMinuteForDayIndex(dayIndex: number): number {
  const base = Math.floor(Date.UTC(REF_YEAR, 0, 1, 12, 0, 0) / 60000);
  return base + dayIndex * 1440;
}

/** No active precip today. */
export const TILE_DAY_CLEAR = 0;
/** Liquid precip (discrete on). */
export const TILE_DAY_RAIN = 1;
/** Frozen precip (discrete on). */
export const TILE_DAY_SNOW_FALL = 2;
/** Damp soil / wet canopy (carried). */
export const TILE_DAY_WET_SOIL = 4;
/** Snow lying on ground (carried). */
export const TILE_DAY_SNOW_GROUND = 8;

export interface DiscreteWeatherYearBake {
  readonly tileIds: readonly number[];
  readonly tileCount: number;
  /** `dayIndex * tileCount + tileOrdinal` */
  readonly packed: Uint8Array;
}

export interface BuildDiscreteWeatherYearOptions {
  seed?: number;
  /** Same 0–1 scale as {@link getTileTemperature01} freezing threshold. */
  freezeTemperatureThreshold?: number;
  /** Probability scale vs daily precip potential (0–1). */
  precipChanceScale?: number;
  /** Max full-year passes for periodic wet/snow carry (default 16). */
  circularCarryMaxIterations?: number;
  /** Stop when max tile |Δwet|+|Δsnow| vs year start falls below this (default 0.004). */
  circularCarryTolerance?: number;
  getTerrainTypeForTile?: (tileId: number) => TerrainType | undefined;
  getMonthlyMeanTempCForTile?: (tileId: number) => Float32Array | undefined;
}

function simulateDiscreteYearIntoPacked(
  tileIds: readonly number[],
  tileCount: number,
  precipPacked: Float32Array,
  packed: Uint8Array,
  wet: Float32Array,
  snowG: Float32Array,
  idToTile: Map<number, GeodesicTile>,
  waterTileIds: ReadonlySet<number>,
  seed: number,
  freezeTh: number,
  chanceScale: number,
  getSub: (utcMinute: number) => number,
  options: BuildDiscreteWeatherYearOptions,
): void {
  for (let d = 0; d < DAYS; d++) {
    const utcMin = baseNoonUtcMinuteForDayIndex(d);
    const cal = new Date(utcMin * 60000);
    const subsolarLatDeg = getSub(utcMin);
    const pBase = d * tileCount;

    for (let i = 0; i < tileCount; i++) {
      const tid = tileIds[i]!;
      if (waterTileIds.has(tid)) {
        wet[i] = 0;
        snowG[i] = 0;
        packed[pBase + i] = TILE_DAY_CLEAR;
        continue;
      }

      const tile = idToTile.get(tid);
      if (!tile) {
        packed[pBase + i] = TILE_DAY_CLEAR;
        continue;
      }

      const { lat } = tileCenterToLatLon(tile.center);
      const latDeg = (lat * 180) / Math.PI;
      const pot = precipPacked[pBase + i] ?? 0;
      const u = unitFloat(u32Hash([seed, tid, d, 0x504443]));
      const precipToday = pot > 0.02 && u < pot * chanceScale;

      const terrain = options.getTerrainTypeForTile?.(tid);
      const monthly = options.getMonthlyMeanTempCForTile?.(tid);
      const temp = getTileTemperature01(
        latDeg,
        subsolarLatDeg,
        terrain,
        monthly,
        cal,
      );
      const frozen = temp < freezeTh;

      let w = wet[i]!;
      let s = snowG[i]!;
      let flags = TILE_DAY_CLEAR;

      if (precipToday) {
        if (frozen) {
          flags |= TILE_DAY_SNOW_FALL;
          s = Math.min(1, s + 0.5);
          w = Math.min(1, w + 0.06);
        } else {
          flags |= TILE_DAY_RAIN;
          w = Math.min(1, w + 0.55);
          s *= 0.82;
        }
      } else {
        if (!frozen) {
          const melt = s * 0.5;
          s *= 0.5;
          w = Math.min(1, w + melt * 0.35);
          w *= 0.78;
        } else {
          w *= 0.9;
        }
      }

      if (w > 0.32) flags |= TILE_DAY_WET_SOIL;
      if (s > 0.28) flags |= TILE_DAY_SNOW_GROUND;

      wet[i] = w < 0.02 ? 0 : w;
      snowG[i] = s < 0.02 ? 0 : s;

      packed[pBase + i] = flags;
    }
  }
}

/**
 * Sequential day-by-day bake using {@link AnnualTileWeatherTables.precipPacked} (UTC noon columns).
 * Skips water tiles in the carry model (packed stays {@link TILE_DAY_CLEAR}).
 * Repeats full **365-day** passes until wet/snow carry is **periodic** (year end ≈ year start) or
 * iteration budget is hit, so Jan 1 row matches following Dec 31.
 */
export function buildDiscreteWeatherYearBake(
  globe: Globe,
  annual: AnnualTileWeatherTables,
  waterTileIds: ReadonlySet<number>,
  getSubsolarLatDegForUtcMinute: (utcMinute: number) => number,
  options: BuildDiscreteWeatherYearOptions = {},
): DiscreteWeatherYearBake {
  const seed = options.seed ?? 0x57a7e;
  const freezeTh = options.freezeTemperatureThreshold ?? 0.41;
  const chanceScale = options.precipChanceScale ?? 0.52;
  const maxRing = Math.max(1, options.circularCarryMaxIterations ?? 16);
  const tol = options.circularCarryTolerance ?? 0.004;
  const getSub = getSubsolarLatDegForUtcMinute;

  const { tileIds, tileCount, precipPacked } = annual;
  const packed = new Uint8Array(DAYS * tileCount);
  const tiles = globe.tiles;
  const idToTile = new Map(tiles.map((t) => [t.id, t]));

  const wet = new Float32Array(tileCount);
  const snowG = new Float32Array(tileCount);

  for (let ring = 0; ring < maxRing; ring++) {
    const wet0 = new Float32Array(wet);
    const snow0 = new Float32Array(snowG);

    simulateDiscreteYearIntoPacked(
      tileIds,
      tileCount,
      precipPacked,
      packed,
      wet,
      snowG,
      idToTile,
      waterTileIds,
      seed,
      freezeTh,
      chanceScale,
      getSub,
      options,
    );

    let maxDelta = 0;
    for (let i = 0; i < tileCount; i++) {
      const dw = Math.abs(wet[i]! - wet0[i]!);
      const ds = Math.abs(snowG[i]! - snow0[i]!);
      if (dw + ds > maxDelta) maxDelta = dw + ds;
    }
    if (maxDelta < tol) break;
  }

  return { tileIds, tileCount, packed };
}

export function discreteDayIndexFromPacked(
  bake: DiscreteWeatherYearBake,
  dayIndex: number,
  tileOrdinal: number,
): number {
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const ti = Math.max(0, Math.min(bake.tileCount - 1, tileOrdinal));
  return bake.packed[di * bake.tileCount + ti]!;
}

/** Tile id → ordinal in bake (O(1) after first map build). */
export function discreteTileOrdinalMap(
  bake: DiscreteWeatherYearBake,
): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = 0; i < bake.tileCount; i++) {
    m.set(bake.tileIds[i]!, i);
  }
  return m;
}

export function queryDiscreteWeatherForTileId(
  bake: DiscreteWeatherYearBake,
  tileIdToOrdinal: Map<number, number>,
  tileId: number,
  dayIndex: number,
): number {
  const ord = tileIdToOrdinal.get(tileId);
  if (ord === undefined) return TILE_DAY_CLEAR;
  return discreteDayIndexFromPacked(bake, dayIndex, ord);
}

export interface DiscreteWeatherClipSink {
  getPrecipOverlayMap(): Map<number, number>;
  getTileSurfaceState(): TileSurfaceState;
}

const PRECIP_OVERLAY_ON = 0.52;
const WET_LEVEL = 0.78;
const SNOW_LEVEL = 0.72;

/**
 * Push one calendar day into clip precip overlay + tile surface (discrete levels). Bumps
 * {@link TileSurfaceState.revision}.
 */
export function applyDiscreteWeatherDayToClipField(
  bake: DiscreteWeatherYearBake,
  dayIndex: number,
  waterTileIds: ReadonlySet<number>,
  sink: DiscreteWeatherClipSink,
): void {
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const overlay = sink.getPrecipOverlayMap();
  const surf = sink.getTileSurfaceState();
  overlay.clear();
  surf.wetness.clear();
  surf.snow.clear();

  const base = di * bake.tileCount;
  for (let i = 0; i < bake.tileCount; i++) {
    const tid = bake.tileIds[i]!;
    if (waterTileIds.has(tid)) continue;

    const b = bake.packed[base + i]!;
    if (b === TILE_DAY_CLEAR) continue;

    if ((b & TILE_DAY_RAIN) !== 0 || (b & TILE_DAY_SNOW_FALL) !== 0) {
      overlay.set(tid, PRECIP_OVERLAY_ON);
    }
    if ((b & TILE_DAY_WET_SOIL) !== 0) {
      surf.wetness.set(tid, WET_LEVEL);
    }
    if ((b & TILE_DAY_SNOW_GROUND) !== 0) {
      surf.snow.set(tid, SNOW_LEVEL);
    }
  }
  surf.revision++;
}

/** ASCII magic `PLYW` — polyglobe discrete **y**ear **w**eather. */
const FILE_MAGIC = new Uint8Array([0x50, 0x4c, 0x59, 0x57]);

/** Increment when on-disk layout or bake semantics change (invalidate old .bin files). */
export const DISCRETE_WEATHER_BAKE_FILE_VERSION = 1;

const HEADER_BYTE_LENGTH = 20;

function readHeaderMagic(buf: Uint8Array): boolean {
  return (
    buf[0] === FILE_MAGIC[0] &&
    buf[1] === FILE_MAGIC[1] &&
    buf[2] === FILE_MAGIC[2] &&
    buf[3] === FILE_MAGIC[3]
  );
}

export interface DiscreteWeatherBakeFileMeta {
  fileVersion: number;
  earthGlobeCacheVersion: number;
  subdivisions: number;
  tileCount: number;
}

/**
 * Binary layout: magic `PLYW`, then little-endian
 * `fileVersion`, `earthGlobeCacheVersion`, `subdivisions`, `tileCount`, `tileCount` int32 tile ids,
 * then `365 * tileCount` packed flags.
 */
export function encodeDiscreteWeatherYearBakeFile(
  bake: DiscreteWeatherYearBake,
  earthGlobeCacheVersion: number,
  subdivisions: number,
): Uint8Array {
  const n = bake.tileCount;
  const payload = 365 * n;
  const out = new Uint8Array(HEADER_BYTE_LENGTH + n * 4 + payload);
  out.set(FILE_MAGIC, 0);
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let o = 4;
  dv.setUint32(o, DISCRETE_WEATHER_BAKE_FILE_VERSION, true);
  o += 4;
  dv.setUint32(o, earthGlobeCacheVersion >>> 0, true);
  o += 4;
  dv.setUint32(o, subdivisions >>> 0, true);
  o += 4;
  dv.setUint32(o, n >>> 0, true);
  o += 4;
  for (let i = 0; i < n; i++) {
    dv.setInt32(o, bake.tileIds[i]!, true);
    o += 4;
  }
  out.set(bake.packed, o);
  return out;
}

export function decodeDiscreteWeatherYearBakeFile(
  buffer: ArrayBuffer,
  globeTileIds: readonly number[],
  expectedEarthGlobeCacheVersion: number,
  expectedSubdivisions: number,
): { bake: DiscreteWeatherYearBake; meta: DiscreteWeatherBakeFileMeta } | null {
  const u8 = new Uint8Array(buffer);
  if (u8.byteLength < HEADER_BYTE_LENGTH) return null;
  if (!readHeaderMagic(u8)) return null;
  const dv = new DataView(buffer);
  let o = 4;
  const fileVersion = dv.getUint32(o, true);
  o += 4;
  const earthGlobeCacheVersion = dv.getUint32(o, true);
  o += 4;
  const subdivisions = dv.getUint32(o, true);
  o += 4;
  const tileCount = dv.getUint32(o, true);
  o += 4;

  if (fileVersion !== DISCRETE_WEATHER_BAKE_FILE_VERSION) return null;
  if (earthGlobeCacheVersion !== expectedEarthGlobeCacheVersion) return null;
  if (subdivisions !== expectedSubdivisions) return null;
  if (tileCount !== globeTileIds.length) return null;
  if (tileCount > 2_000_000) return null;

  const idsEnd = o + tileCount * 4;
  const payloadBytes = DAYS * tileCount;
  if (u8.byteLength !== idsEnd + payloadBytes) return null;

  for (let i = 0; i < tileCount; i++) {
    if (dv.getInt32(o + i * 4, true) !== globeTileIds[i]!) return null;
  }

  const packed = new Uint8Array(buffer, idsEnd, payloadBytes);
  const tileIds = globeTileIds.slice();
  return {
    bake: {
      tileIds,
      tileCount,
      packed: new Uint8Array(packed),
    },
    meta: {
      fileVersion,
      earthGlobeCacheVersion,
      subdivisions,
      tileCount,
    },
  };
}
