/**
 * Compare **seasonal + Köppen precipitation potential** (ITCZ × moisture) to the **precomputed
 * clip-cloud annual climatology** ({@link buildAnnualPrecipClimatology}). Units differ; we scale
 * cloud proxy so land medians match, then flag tiles where scaled cloud delivery is low vs target
 * — useful for placing extra upwind cloud sources. Cloud values are **spawn-tile attributed**
 * (advection not modeled here).
 */

import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import {
  buildAnnualPrecipClimatology,
  type AnnualSpawnSpec,
} from "./cloudClipSystem.js";
import { getPrecipitationByTileWithMoisture } from "./precipitationOverlay.js";

const REF_YEAR = 2023;
const BASE_NOON_UTC_MIN = Math.floor(
  Date.UTC(REF_YEAR, 0, 1, 12, 0, 0) / 60000,
);

function mean365(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < 365; i++) s += a[i]!;
  return s / 365;
}

/**
 * Per-tile daily target precip potential (0–1) at UTC noon each day of a reference year,
 * matching the sampling grid used by {@link buildAnnualCloudSpawnTable}.
 */
export function buildSeasonalTargetPrecipByTile365(
  globe: Globe,
  moistureByTile: Map<number, number> | null | undefined,
  getSubsolarLatDegForUtcMinute: (utcMinute: number) => number
): Map<number, Float32Array> {
  const tiles = globe.tiles;
  const byTile = new Map<number, Float32Array>();
  for (const t of tiles) {
    byTile.set(t.id, new Float32Array(365));
  }
  for (let doy = 1; doy <= 365; doy++) {
    const utcMin = BASE_NOON_UTC_MIN + (doy - 1) * 1440;
    const sub = getSubsolarLatDegForUtcMinute(utcMin);
    const precip = getPrecipitationByTileWithMoisture(tiles, sub, moistureByTile);
    const di = doy - 1;
    for (const t of tiles) {
      byTile.get(t.id)![di] = precip.get(t.id) ?? 0;
    }
  }
  return byTile;
}

export interface PrecipGapTileRow {
  tileId: number;
  latDeg: number;
  lonDeg: number;
  /** Mean daily seasonal×moisture potential (0–1). */
  targetMean: number;
  /** Mean daily cloud climatology proxy at spawn tile (arbitrary units). */
  cloudProxyMean: number;
  /** After scaling cloud land median to target land median. */
  scaledCloudMean: number;
  /** `scaledCloudMean / targetMean` (high if target ~0). */
  ratio: number;
}

export interface PrecipClimatologyGapResult {
  /** `medianTargetLand / medianCloudRawLand` (1 if cloud median ~0). */
  medianScaleFactor: number;
  medianTargetLand: number;
  medianCloudRawLand: number;
  /** Wet tiles (target above quantile) with ratio well below 1 — add clouds upwind / boost spawn. */
  worstDeficits: PrecipGapTileRow[];
  /** |lat| ≥ polarLatDeg, sorted by largest `targetMean - scaledCloudMean`. */
  polarUnderCloudVsTarget: PrecipGapTileRow[];
}

export interface AnalyzePrecipClimatologyGapOptions {
  waterTileIds?: ReadonlySet<number>;
  worstN?: number;
  /** Land tiles with `targetMean` below this fraction of all-land targets are ignored for worstDeficits. Default 0.65. */
  deficitMinTargetQuantile?: number;
  /** |latitude| threshold for polar list. Default 58. */
  polarLatDeg?: number;
}

/**
 * Scale annual cloud proxy so its land median matches target land median, then compare per tile.
 */
export function analyzePrecipClimatologyGap(
  globe: Globe,
  annualTable: AnnualSpawnSpec[][],
  moistureByTile: Map<number, number> | null | undefined,
  getSubsolarLatDegForUtcMinute: (utcMinute: number) => number,
  options?: AnalyzePrecipClimatologyGapOptions
): PrecipClimatologyGapResult {
  const target365 = buildSeasonalTargetPrecipByTile365(
    globe,
    moistureByTile,
    getSubsolarLatDegForUtcMinute
  );
  const cloud365 = buildAnnualPrecipClimatology(annualTable);

  const worstN = options?.worstN ?? 80;
  const water = options?.waterTileIds;
  const polarLat = options?.polarLatDeg ?? 58;

  const rows: PrecipGapTileRow[] = [];
  const targetsL: number[] = [];
  const cloudsL: number[] = [];

  for (const t of globe.tiles) {
    if (water?.has(t.id)) continue;
    const center = globe.getTileCenter(t.id);
    if (!center) continue;
    const { lat, lon } = tileCenterToLatLon(center);
    const latDeg = (lat * 180) / Math.PI;
    const lonDeg = (lon * 180) / Math.PI;

    const tArr = target365.get(t.id);
    const cArr = cloud365.get(t.id);
    const targetMean = tArr ? mean365(tArr) : 0;
    const cloudProxyMean = cArr ? mean365(cArr) : 0;
    rows.push({
      tileId: t.id,
      latDeg,
      lonDeg,
      targetMean,
      cloudProxyMean,
      scaledCloudMean: 0,
      ratio: 0,
    });
    targetsL.push(targetMean);
    cloudsL.push(cloudProxyMean);
  }

  targetsL.sort((a, b) => a - b);
  cloudsL.sort((a, b) => a - b);
  const landMedian = (sorted: number[]) =>
    sorted.length ? sorted[Math.floor(sorted.length * 0.5)]! : 0;
  const medianTargetLand = landMedian(targetsL);
  const medianCloudRawLand = landMedian(cloudsL);
  const medianScaleFactor =
    medianCloudRawLand > 1e-12
      ? medianTargetLand / medianCloudRawLand
      : 1;

  for (const r of rows) {
    r.scaledCloudMean = r.cloudProxyMean * medianScaleFactor;
    r.ratio =
      r.targetMean > 1e-6
        ? r.scaledCloudMean / r.targetMean
        : r.scaledCloudMean > 1e-6
          ? 99
          : 1;
  }

  const q = options?.deficitMinTargetQuantile ?? 0.65;
  const targetThreshold =
    targetsL.length > 0
      ? targetsL[Math.min(targetsL.length - 1, Math.floor(targetsL.length * q))]!
      : 0;

  const worstDeficits = rows
    .filter((r) => r.targetMean >= targetThreshold && r.ratio < 0.82)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, worstN);

  const polarUnderCloudVsTarget = rows
    .filter((r) => Math.abs(r.latDeg) >= polarLat)
    .sort(
      (a, b) =>
        b.targetMean -
        b.scaledCloudMean -
        (a.targetMean - a.scaledCloudMean)
    )
    .slice(0, Math.min(48, worstN));

  return {
    medianScaleFactor,
    medianTargetLand,
    medianCloudRawLand,
    worstDeficits,
    polarUnderCloudVsTarget,
  };
}
