import type { Globe } from "../core/Globe.js";
import type { TileTerrainData } from "../terrain/terrainMaterial.js";
import {
  resolveMonthlyClimatologySampleContext,
  sampleMonthlyClimatologyC,
} from "./seasonalClimate.js";
import type { SeaIceAnnualCycle } from "./seaIceCycle.js";

const DAYS = 365;

export interface FreshwaterIceCycleBuildOptions {
  /** Freshwater freezing point in degC. */
  freezeTempC?: number;
  /** Ignore very low-lat freshwater for stability. */
  minAbsLatitudeDeg?: number;
  /** Ignore tiny seasonal blips shorter than this many days. */
  minSeasonalRunDays?: number;
  /** If climatology is missing this far poleward, force always-frozen. */
  missingDataAlwaysFrozenAbsLatitudeDeg?: number;
}

interface RunSeg {
  start: number;
  endExclusive: number;
  length: number;
}

function dayUtcMidpointMs(dayIdx: number): number {
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
    const score = r.length - dist * 0.22;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/**
 * Build annual lake/river ice schedule from tile monthly means.
 * Returns the same packed structure used by sea ice overlays/mask updates.
 */
export function buildAnnualFreshwaterIceCycle(
  globe: Globe,
  tileTerrain: Map<number, TileTerrainData>,
  freshwaterCandidateTileIds: ReadonlySet<number>,
  opts: FreshwaterIceCycleBuildOptions = {},
): SeaIceAnnualCycle {
  const freezeTempC = opts.freezeTempC ?? 0.0;
  const minAbsLat = opts.minAbsLatitudeDeg ?? 30;
  const minRun = Math.max(1, opts.minSeasonalRunDays ?? 10);
  const missingDataAlwaysFrozenAbsLat =
    opts.missingDataAlwaysFrozenAbsLatitudeDeg ?? 74;

  const dayCtx = new Array(DAYS);
  for (let d = 0; d < DAYS; d++) {
    dayCtx[d] = resolveMonthlyClimatologySampleContext(
      new Date(dayUtcMidpointMs(d)),
    );
  }

  const northIds: number[] = [];
  const southIds: number[] = [];
  const idToFlags = new Map<number, Uint8Array>();

  for (const tid of freshwaterCandidateTileIds) {
    if (tid < 0 || tid >= globe.tileCount) continue;
    const terr = tileTerrain.get(tid);
    if (!terr) continue;
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
    if (lat >= 0) northIds.push(tid);
    else southIds.push(tid);
  }

  const northAlways: number[] = [];
  const southAlways: number[] = [];
  const northSeasonal: number[] = [];
  const northFreeze: number[] = [];
  const northThaw: number[] = [];
  const southSeasonal: number[] = [];
  const southFreeze: number[] = [];
  const southThaw: number[] = [];

  const classifyHemisphere = (ids: number[], northHemisphere: boolean): void => {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const flags = idToFlags.get(id);
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

  classifyHemisphere(northIds, true);
  classifyHemisphere(southIds, false);

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
