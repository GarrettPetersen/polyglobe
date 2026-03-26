/**
 * Annual sea-ice cycle bake for ocean tiles.
 *
 * Strategy:
 * - Precompute daily (0..364) frozen state from monthly climatology (°C) and seawater freeze point.
 * - Enforce contiguous polar sheets by keeping only tiles connected to a polar seed each day.
 * - Coerce noisy multi-crossing tiles into one annual freeze/thaw interval (longest plausible run).
 *
 * Runtime then updates a compact per-tile mask once per day change (no geometry rebuild).
 */

import type { Globe } from "../core/Globe.js";
import type { TileTerrainData } from "../terrain/terrainMaterial.js";
import {
  resolveMonthlyClimatologySampleContext,
  sampleMonthlyClimatologyC,
} from "./seasonalClimate.js";

const DAYS = 365;

export interface SeaIceCycleBuildOptions {
  /** Seawater freezing point in °C. */
  freezeTempC?: number;
  /** Ignore low-latitude oceans. */
  minAbsLatitudeDeg?: number;
  /** Polar seed for connectivity in each hemisphere. */
  connectivitySeedAbsLatitudeDeg?: number;
  /** Ignore tiny seasonal blips shorter than this many days. */
  minSeasonalRunDays?: number;
  /**
   * If climatology is missing this far poleward, force always-frozen (likely sparse source data near poles).
   */
  missingDataAlwaysFrozenAbsLatitudeDeg?: number;
  /**
   * Keep active tiles this far poleward even if not connected to seed component (avoid over-pruning split seas).
   */
  keepDisconnectedAboveAbsLatitudeDeg?: number;
}

export interface SeaIceAnnualCycle {
  readonly tileCount: number;
  readonly northAlwaysTileIds: Uint32Array;
  readonly northSeasonalTileIds: Uint32Array;
  readonly northFreezeDayOfYear: Uint16Array;
  readonly northThawDayOfYear: Uint16Array;
  readonly southAlwaysTileIds: Uint32Array;
  readonly southSeasonalTileIds: Uint32Array;
  readonly southFreezeDayOfYear: Uint16Array;
  readonly southThawDayOfYear: Uint16Array;
}

interface RunSeg {
  start: number;
  endExclusive: number;
  length: number;
}

function dayUtcMidpointMs(dayIdx: number): number {
  // 2001 = non-leap year; keep fixed 365-day cycle for bake and runtime lookup.
  return Date.UTC(2001, 0, 1 + dayIdx, 12, 0, 0);
}

function circularDayDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, DAYS - d);
}

function runMidpoint(run: RunSeg): number {
  return (run.start + Math.floor(run.length * 0.5)) % DAYS;
}

function enumerateTrueRunsCircular(flags: Uint8Array): RunSeg[] {
  const runs: RunSeg[] = [];
  let i = 0;
  while (i < DAYS) {
    while (i < DAYS && flags[i] === 0) i++;
    if (i >= DAYS) break;
    const s = i;
    while (i < DAYS && flags[i] !== 0) i++;
    runs.push({ start: s, endExclusive: i, length: i - s });
  }
  if (runs.length <= 1) return runs;
  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  if (first.start === 0 && last.endExclusive === DAYS) {
    const merged: RunSeg = {
      start: last.start,
      endExclusive: first.endExclusive,
      length: last.length + first.length,
    };
    return [merged, ...runs.slice(1, runs.length - 1)];
  }
  return runs;
}

function pickBestRunForHemisphere(
  flags: Uint8Array,
  northHemisphere: boolean,
): RunSeg | null {
  const runs = enumerateTrueRunsCircular(flags);
  if (runs.length === 0) return null;
  const preferredCenter = northHemisphere ? 10 : 196;
  let best: RunSeg | null = null;
  let bestScore = -Infinity;
  for (const r of runs) {
    const mid = runMidpoint(r);
    const dist = circularDayDistance(mid, preferredCenter);
    // Prefer longer runs, but bias toward seasonally plausible center.
    const score = r.length - dist * 0.22;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/**
 * Interval is active for day `d` when:
 * - non-wrap: freeze <= d < thaw
 * - wrap:     d >= freeze || d < thaw
 */
export function isSeaIceActiveOnDay(
  freezeDay: number,
  thawDay: number,
  dayOfYear: number,
): boolean {
  if (freezeDay === thawDay) return false;
  if (freezeDay < thawDay) {
    return dayOfYear >= freezeDay && dayOfYear < thawDay;
  }
  return dayOfYear >= freezeDay || dayOfYear < thawDay;
}

function normalizeDay(day: number): number {
  const d = Math.floor(day) % DAYS;
  return d < 0 ? d + DAYS : d;
}

/**
 * Fill per-tile mask (0/255) for one day. Caller owns `outMask`.
 */
export function fillSeaIceMaskForDay(
  cycle: SeaIceAnnualCycle,
  dayOfYear: number,
  outMask: Uint8Array,
): void {
  outMask.fill(0);
  const d = normalizeDay(dayOfYear);

  for (let i = 0; i < cycle.northAlwaysTileIds.length; i++) {
    outMask[cycle.northAlwaysTileIds[i]!] = 255;
  }
  for (let i = 0; i < cycle.southAlwaysTileIds.length; i++) {
    outMask[cycle.southAlwaysTileIds[i]!] = 255;
  }

  for (let i = 0; i < cycle.northSeasonalTileIds.length; i++) {
    if (
      isSeaIceActiveOnDay(
        cycle.northFreezeDayOfYear[i]!,
        cycle.northThawDayOfYear[i]!,
        d,
      )
    ) {
      outMask[cycle.northSeasonalTileIds[i]!] = 255;
    }
  }
  for (let i = 0; i < cycle.southSeasonalTileIds.length; i++) {
    if (
      isSeaIceActiveOnDay(
        cycle.southFreezeDayOfYear[i]!,
        cycle.southThawDayOfYear[i]!,
        d,
      )
    ) {
      outMask[cycle.southSeasonalTileIds[i]!] = 255;
    }
  }
}

/**
 * Build annual sea-ice schedule from tile monthly means.
 */
export function buildAnnualSeaIceCycle(
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  opts: SeaIceCycleBuildOptions = {},
): SeaIceAnnualCycle {
  const freezeTempC = opts.freezeTempC ?? -1.8;
  const minAbsLat = opts.minAbsLatitudeDeg ?? 50;
  const seedAbsLat = opts.connectivitySeedAbsLatitudeDeg ?? 76;
  const minRun = Math.max(1, opts.minSeasonalRunDays ?? 14);
  const missingDataAlwaysFrozenAbsLat =
    opts.missingDataAlwaysFrozenAbsLatitudeDeg ?? 80;
  const keepDisconnectedAboveAbsLat =
    opts.keepDisconnectedAboveAbsLatitudeDeg ?? 82;

  const dayCtx = new Array(DAYS);
  for (let d = 0; d < DAYS; d++) {
    dayCtx[d] = resolveMonthlyClimatologySampleContext(new Date(dayUtcMidpointMs(d)));
  }

  const northIds: number[] = [];
  const southIds: number[] = [];
  const northSeedSet = new Set<number>();
  const southSeedSet = new Set<number>();
  const idToFlags = new Map<number, Uint8Array>();

  for (let tid = 0; tid < globe.tileCount; tid++) {
    const terr = tileTerrain.get(tid);
    if (!terr) continue;
    const oceanLike =
      terr.type === "water" ||
      terr.type === "beach" ||
      // Backward-compat: old terrain caches used `ice` for both frozen ocean and polar land.
      // Treat `ice` as sea-ice candidate only when it sits at/under sea level.
      (terr.type === "ice" && terr.elevation <= -0.005);
    if (!oceanLike) continue;
    if (terr.lakeId != null) continue;
    const lat = globe.tileCenterLatDeg[tid]!;
    const absLat = Math.abs(lat);
    if (absLat < minAbsLat) continue;

    const flags = new Uint8Array(DAYS);
    const monthly = terr.monthlyMeanTempC;
    if (!monthly || monthly.length !== 12) {
      if (absLat >= missingDataAlwaysFrozenAbsLat) {
        flags.fill(1);
      } else {
        continue;
      }
    } else {
      for (let d = 0; d < DAYS; d++) {
        const ctx = dayCtx[d];
        if (!ctx) continue;
        const tc = sampleMonthlyClimatologyC(monthly, ctx);
        if (Number.isFinite(tc) && tc <= freezeTempC) flags[d] = 1;
      }
    }
    idToFlags.set(tid, flags);

    if (lat >= 0) {
      northIds.push(tid);
      if (lat >= seedAbsLat) northSeedSet.add(tid);
    } else {
      southIds.push(tid);
      if (-lat >= seedAbsLat) southSeedSet.add(tid);
    }
  }

  const filterConnectedPerDay = (
    hemiTileIds: number[],
    seedIds: Set<number>,
  ): Map<number, Uint8Array> => {
    const localIdx = new Map<number, number>();
    for (let i = 0; i < hemiTileIds.length; i++) localIdx.set(hemiTileIds[i]!, i);
    const filteredByTile = new Map<number, Uint8Array>();
    for (const id of hemiTileIds) filteredByTile.set(id, new Uint8Array(DAYS));
    if (hemiTileIds.length === 0) return filteredByTile;

    const queue: number[] = [];
    const seen = new Uint8Array(hemiTileIds.length);
    for (let d = 0; d < DAYS; d++) {
      seen.fill(0);
      queue.length = 0;

      for (const seed of seedIds) {
        const sIdx = localIdx.get(seed);
        if (sIdx == null) continue;
        const f = idToFlags.get(seed);
        if (!f || f[d] === 0) continue;
        seen[sIdx] = 1;
        queue.push(seed);
      }

      // If canonical polar seed tiles are absent/inactive this day, pick the coldest-lat active tile
      // in this hemisphere as a stable fallback seed so connectivity filtering does not wipe out all ice.
      if (queue.length === 0) {
        let bestId = -1;
        let bestAbsLat = -Infinity;
        for (let i = 0; i < hemiTileIds.length; i++) {
          const id = hemiTileIds[i]!;
          const f = idToFlags.get(id);
          if (!f || f[d] === 0) continue;
          const absLat = Math.abs(globe.tileCenterLatDeg[id]!);
          if (absLat > bestAbsLat) {
            bestAbsLat = absLat;
            bestId = id;
          }
        }
        if (bestId >= 0) {
          const sIdx = localIdx.get(bestId);
          if (sIdx != null) {
            seen[sIdx] = 1;
            queue.push(bestId);
          }
        }
      }

      for (let qi = 0; qi < queue.length; qi++) {
        const cur = queue[qi]!;
        const tile = globe.getTile(cur);
        if (!tile) continue;
        for (let ni = 0; ni < tile.neighbors.length; ni++) {
          const nId = tile.neighbors[ni]!;
          const nIdx = localIdx.get(nId);
          if (nIdx == null || seen[nIdx]) continue;
          const nf = idToFlags.get(nId);
          if (!nf || nf[d] === 0) continue;
          seen[nIdx] = 1;
          queue.push(nId);
        }
      }

      for (let i = 0; i < hemiTileIds.length; i++) {
        const id = hemiTileIds[i]!;
        // Keep extreme-polar active tiles even when land separation breaks graph connectivity.
        if (
          seen[i] === 0 &&
          Math.abs(globe.tileCenterLatDeg[id]!) < keepDisconnectedAboveAbsLat
        ) {
          continue;
        }
        const f = idToFlags.get(id);
        if (!f || f[d] === 0) continue;
        filteredByTile.get(id)![d] = 1;
      }
    }
    return filteredByTile;
  };

  const northFiltered = filterConnectedPerDay(northIds, northSeedSet);
  const southFiltered = filterConnectedPerDay(southIds, southSeedSet);

  const northAlways: number[] = [];
  const southAlways: number[] = [];
  const northSeasonal: number[] = [];
  const northFreeze: number[] = [];
  const northThaw: number[] = [];
  const southSeasonal: number[] = [];
  const southFreeze: number[] = [];
  const southThaw: number[] = [];

  const classifyHemisphere = (
    ids: number[],
    filtered: Map<number, Uint8Array>,
    northHemisphere: boolean,
  ): void => {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const flags = filtered.get(id);
      if (!flags) continue;
      let nOn = 0;
      for (let d = 0; d < DAYS; d++) nOn += flags[d] !== 0 ? 1 : 0;
      if (nOn === DAYS) {
        if (northHemisphere) northAlways.push(id);
        else southAlways.push(id);
        continue;
      }
      if (nOn === 0) continue;
      const best = pickBestRunForHemisphere(flags, northHemisphere);
      if (!best || best.length < minRun) continue;

      const freeze = best.start;
      const thaw = best.endExclusive % DAYS;
      if (northHemisphere) {
        northSeasonal.push(id);
        northFreeze.push(freeze);
        northThaw.push(thaw);
      } else {
        southSeasonal.push(id);
        southFreeze.push(freeze);
        southThaw.push(thaw);
      }
    }
  };

  classifyHemisphere(northIds, northFiltered, true);
  classifyHemisphere(southIds, southFiltered, false);

  return {
    tileCount: globe.tileCount,
    northAlwaysTileIds: Uint32Array.from(northAlways),
    northSeasonalTileIds: Uint32Array.from(northSeasonal),
    northFreezeDayOfYear: Uint16Array.from(northFreeze),
    northThawDayOfYear: Uint16Array.from(northThaw),
    southAlwaysTileIds: Uint32Array.from(southAlways),
    southSeasonalTileIds: Uint32Array.from(southSeasonal),
    southFreezeDayOfYear: Uint16Array.from(southFreeze),
    southThawDayOfYear: Uint16Array.from(southThaw),
  };
}

