/**
 * Precomputed **365-day** (UTC noon, reference calendar) weather samples per globe tile: wind arrows,
 * precipitation potential for cloud drivers, and river flow strength. Runtime picks the row from
 * **calendar day-of-year** (same indexing as {@link buildAnnualCloudSpawnTable}).
 */

import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import { getPrecipitation } from "./seasonalClimate.js";
import { getPrecipitationByTileWithMoisture } from "./precipitationOverlay.js";
import {
  computeWindForTiles,
  type ComputeWindOptions,
  type TileWind,
} from "../wind/windPatterns.js";

const REF_YEAR = 2023;
const DAYS = 365;

function baseNoonUtcMinuteForRefYear(): number {
  return Math.floor(Date.UTC(REF_YEAR, 0, 1, 12, 0, 0) / 60000);
}

/** 0-based row index (0 = Jan 1) from a UTC calendar date. */
export function annualDayIndexFromDate(d: Date): number {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = Math.floor((t - y0) / 86400000);
  const clamped = Math.min(DAYS, Math.max(1, doy));
  return clamped - 1;
}

export interface AnnualTileWeatherTables {
  readonly tileIds: readonly number[];
  readonly tileCount: number;
  /** `(dayIndex * tileCount + i) * 2` → directionRad, strength */
  readonly windPacked: Float32Array;
  /** `dayIndex * tileCount + i` → precip 0–1 with moisture */
  readonly precipPacked: Float32Array;
}

export type BuildAnnualWindOptions = Omit<ComputeWindOptions, "subsolarLatDeg">;

/**
 * For each day 1…365, sample at **UTC noon** on that calendar day in {@link REF_YEAR}: full-tile wind
 * and moisture-scaled precip potential (same formulas as live {@link computeWindForTiles} /
 * {@link getPrecipitationByTileWithMoisture}).
 */
export function buildAnnualTileWeatherTables(
  globe: Globe,
  moisture: Map<number, number>,
  getSubsolarLatDegForUtcMinute: (utcMinute: number) => number,
  windOptions: BuildAnnualWindOptions,
): AnnualTileWeatherTables {
  const tiles = globe.tiles;
  const n = tiles.length;
  const tileIds = tiles.map((t) => t.id);

  const windPacked = new Float32Array(DAYS * n * 2);
  const precipPacked = new Float32Array(DAYS * n);
  const baseMin = baseNoonUtcMinuteForRefYear();

  for (let doy = 1; doy <= DAYS; doy++) {
    const utcMin = baseMin + (doy - 1) * 1440;
    const sub = getSubsolarLatDegForUtcMinute(utcMin);
    const wind = computeWindForTiles(tiles, {
      ...windOptions,
      subsolarLatDeg: sub,
    });
    const precip = getPrecipitationByTileWithMoisture(tiles, sub, moisture);
    const di = doy - 1;
    const wBase = di * n * 2;
    const pBase = di * n;
    for (let i = 0; i < n; i++) {
      const tid = tileIds[i]!;
      const w = wind.get(tid);
      windPacked[wBase + i * 2] = w?.directionRad ?? 0;
      windPacked[wBase + i * 2 + 1] = w?.strength ?? 0.1;
      precipPacked[pBase + i] = precip.get(tid) ?? 0;
    }
  }

  return { tileIds, tileCount: n, windPacked, precipPacked };
}

export function fillWindMapFromAnnual(
  t: AnnualTileWeatherTables,
  dayIndex: number,
  out: Map<number, TileWind>,
): void {
  out.clear();
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const base = di * t.tileCount * 2;
  for (let i = 0; i < t.tileCount; i++) {
    const id = t.tileIds[i]!;
    const o = base + i * 2;
    out.set(id, {
      directionRad: t.windPacked[o]!,
      strength: t.windPacked[o + 1]!,
    });
  }
}

/** O(n) once per annual table; reuse for {@link fillWindMapFromAnnualForTileIds}. */
export function createAnnualWindTileIndexById(
  t: AnnualTileWeatherTables,
): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = 0; i < t.tileCount; i++) {
    m.set(t.tileIds[i]!, i);
  }
  return m;
}

/**
 * Writes wind only for the given tile IDs (does not clear `out`). Matches full-table sampling for those ids.
 */
export function fillWindMapFromAnnualForTileIds(
  t: AnnualTileWeatherTables,
  dayIndex: number,
  out: Map<number, TileWind>,
  tileIds: Iterable<number>,
  tileIndexById: ReadonlyMap<number, number>,
): void {
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const base = di * t.tileCount * 2;
  for (const id of tileIds) {
    const i = tileIndexById.get(id);
    if (i === undefined) continue;
    const o = base + i * 2;
    out.set(id, {
      directionRad: t.windPacked[o]!,
      strength: t.windPacked[o + 1]!,
    });
  }
}

export function fillPrecipMapFromAnnual(
  t: AnnualTileWeatherTables,
  dayIndex: number,
  out: Map<number, number>,
): void {
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const base = di * t.tileCount;
  /**
   * Avoid `clear()` when the map already holds exactly one entry per tile — clearing ~160k keys is very
   * expensive; overwriting the same keys is enough when the tile set matches {@link t.tileIds}.
   */
  if (out.size !== t.tileCount) {
    out.clear();
  }
  for (let i = 0; i < t.tileCount; i++) {
    out.set(t.tileIds[i]!, t.precipPacked[base + i]!);
  }
}

export interface AnnualRiverFlowStrength {
  readonly riverTileIds: readonly number[];
  /** `dayIndex * riverTileIds.length + i` */
  readonly strengthPacked: Float32Array;
}

export function buildAnnualRiverFlowStrength(
  globe: Globe,
  riverFlowByTile: Map<number, { exitEdge: number; directionRad: number }>,
  getSubsolarLatDegForUtcMinute: (utcMinute: number) => number,
): AnnualRiverFlowStrength {
  const riverTileIds = [...riverFlowByTile.keys()].sort((a, b) => a - b);
  const nr = riverTileIds.length;
  const strengthPacked = new Float32Array(DAYS * nr);
  const tileById = new Map(globe.tiles.map((t) => [t.id, t]));
  const baseMin = baseNoonUtcMinuteForRefYear();

  for (let doy = 1; doy <= DAYS; doy++) {
    const utcMin = baseMin + (doy - 1) * 1440;
    const sub = getSubsolarLatDegForUtcMinute(utcMin);
    const di = doy - 1;
    const row = di * nr;
    for (let i = 0; i < nr; i++) {
      const tid = riverTileIds[i]!;
      const tile = tileById.get(tid);
      if (!tile) {
        strengthPacked[row + i] = 0.35;
        continue;
      }
      const { lat } = tileCenterToLatLon(tile.center);
      const latDeg = (lat * 180) / Math.PI;
      const precip = getPrecipitation(latDeg, sub);
      strengthPacked[row + i] = 0.35 + 0.55 * precip;
    }
  }

  return { riverTileIds, strengthPacked };
}

export function fillRiverFlowMapFromAnnual(
  annual: AnnualRiverFlowStrength,
  riverFlowByTile: Map<number, { exitEdge: number; directionRad: number }>,
  dayIndex: number,
  out: Map<number, { directionRad: number; strength: number }>,
): void {
  out.clear();
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const { riverTileIds, strengthPacked } = annual;
  const nr = riverTileIds.length;
  const base = di * nr;
  for (let i = 0; i < nr; i++) {
    const id = riverTileIds[i]!;
    const r = riverFlowByTile.get(id);
    if (!r) continue;
    out.set(id, {
      directionRad: r.directionRad,
      strength: strengthPacked[base + i]!,
    });
  }
}

export function createAnnualRiverStrengthTileIndexById(
  annual: AnnualRiverFlowStrength,
): Map<number, number> {
  const m = new Map<number, number>();
  const { riverTileIds } = annual;
  for (let i = 0; i < riverTileIds.length; i++) {
    m.set(riverTileIds[i]!, i);
  }
  return m;
}

/**
 * River flow strengths for a subset of tiles (does not clear `out`). Skips ids that are not river tiles.
 */
export function fillRiverFlowMapFromAnnualForTileIds(
  annual: AnnualRiverFlowStrength,
  riverFlowByTile: Map<number, { exitEdge: number; directionRad: number }>,
  dayIndex: number,
  out: Map<number, { directionRad: number; strength: number }>,
  tileIds: Iterable<number>,
  riverStrengthIndexById: ReadonlyMap<number, number>,
): void {
  const di = Math.max(0, Math.min(DAYS - 1, dayIndex));
  const { strengthPacked } = annual;
  const nr = annual.riverTileIds.length;
  const row = di * nr;
  for (const id of tileIds) {
    const r = riverFlowByTile.get(id);
    if (!r) continue;
    const idx = riverStrengthIndexById.get(id);
    if (idx === undefined) continue;
    out.set(id, {
      directionRad: r.directionRad,
      strength: strengthPacked[row + idx]!,
    });
  }
}
