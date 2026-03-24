/**
 * Simple seasonal climate: precipitation (ITCZ band) and temperature.
 * Used to scale river flow by "rainy season" and to support future snow/ice.
 */

import type { TerrainType } from "../terrain/types.js";
import { applyKoppenTerrainTemperatureModifier } from "./koppenTemperature.js";

/** Latitude (degrees) above which we add extended polar precip. */
const POLAR_PRECIP_LAT = 52;

/**
 * Deterministic "noise" in [0, 1] from lat/lon for variation without a seed.
 */
function latLonNoise(latDeg: number, lonDeg: number): number {
  const x = Math.sin(latDeg * 0.01745) * 7.3 + Math.cos(lonDeg * 0.01745) * 5.1;
  const y = Math.cos(latDeg * 0.021) * 4.7 + Math.sin(lonDeg * 0.013) * 6.2;
  const n = Math.sin(x) * 0.5 + Math.sin(y) * 0.5 + 0.5;
  return Math.max(0, Math.min(1, n));
}

/**
 * Precipitation factor 0–1: ITCZ band (high near subsolar) plus extended
 * precipitation toward the poles with deterministic randomization so high
 * latitudes still get clouds and precip overlay.
 * @param lonDeg Optional longitude in degrees for spatial variation in polar precip.
 */
export function getPrecipitation(
  latDeg: number,
  subsolarLatDeg: number,
  lonDeg?: number
): number {
  const dist = Math.abs(latDeg - subsolarLatDeg);
  const halfWidth = 18;
  const itcz = Math.exp(-(dist * dist) / (2 * halfWidth * halfWidth));
  let precip = Math.max(0, Math.min(1, itcz * 1.2));

  const absLat = Math.abs(latDeg);
  if (absLat > POLAR_PRECIP_LAT) {
    const t = (absLat - POLAR_PRECIP_LAT) / (90 - POLAR_PRECIP_LAT);
    const ramp = t * t;
    const lon = lonDeg ?? subsolarLatDeg;
    const noise = latLonNoise(latDeg, lon);
    const polarAdd = ramp * 0.38 * (0.45 + 0.55 * noise);
    precip = Math.max(precip, Math.min(1, polarAdd));
  }

  return Math.max(0, Math.min(1, precip));
}

/**
 * Rough temperature factor 0–1 (1 = warm, 0 = cold). Colder at poles and when far from sun.
 * Can drive snow line / freeze in future.
 */
export function getTemperature(latDeg: number, subsolarLatDeg: number): number {
  const pole = Math.abs(latDeg) > 75 ? 0.3 : 1 - Math.abs(latDeg) / 90;
  const season = Math.exp(-Math.pow((latDeg - subsolarLatDeg) / 40, 2));
  let t = Math.max(0, Math.min(1, 0.4 * pole + 0.6 * season));
  const absLat = Math.abs(latDeg);
  if (absLat > 58) {
    const u = Math.min(1, (absLat - 58) / 32);
    t *= 1 - 0.24 * u * u;
  }
  return Math.max(0, Math.min(1, t));
}

/**
 * Same 0–1 temperature as {@link getTemperature}, then Köppen/terrain modifiers when `terrainType`
 * is set (Earth tiles). Procedural legacy types (`land`, `forest`, …) use neutral traits.
 */
export function getTemperatureForTerrain(
  latDeg: number,
  subsolarLatDeg: number,
  terrainType?: TerrainType | null
): number {
  const base = getTemperature(latDeg, subsolarLatDeg);
  return applyKoppenTerrainTemperatureModifier(
    base,
    latDeg,
    subsolarLatDeg,
    terrainType ?? null
  );
}

/**
 * Map climatological monthly mean (°C) into the same 0–1 band as {@link getTemperature}.
 * Cold anchor −28 °C (not −38) so **0 °C monthly mean ≈ 0.40**, i.e. near‑freezing climates read
 * cold enough for snow when blended with the seasonal model (see {@link getTileTemperature01}).
 */
const MONTHLY_MEAN_TEMP_C_ANCHOR_COLD = -28;
const MONTHLY_MEAN_TEMP_C_ANCHOR_HOT = 42;

export function meanMonthlyTempCToTemperature01(tempC: number): number {
  const span = MONTHLY_MEAN_TEMP_C_ANCHOR_HOT - MONTHLY_MEAN_TEMP_C_ANCHOR_COLD;
  return Math.max(
    0,
    Math.min(
      1,
      (tempC - MONTHLY_MEAN_TEMP_C_ANCHOR_COLD) / span,
    ),
  );
}

/**
 * Snow / rain from clouds and precip particles: {@link getTileTemperature01} must be **below** this (0–1).
 * Slightly above old 0.44 so marginal cold months still produce snow with real monthly climatology.
 */
export const SNOW_PRECIPITATION_TEMPERATURE_THRESHOLD_01 = 0.48;

/**
 * Ground freeze / snowpack preservation: same 0–1 scale as {@link getTileTemperature01}.
 */
export const GROUND_FREEZE_TEMPERATURE_THRESHOLD_01 = 0.44;

/**
 * Smooth climatological temperature (°C) from twelve monthly means.
 *
 * Uses **piecewise linear** interpolation between **mid-month anchors** (UTC 15th 12:00 of each month).
 * At each anchor, the value equals that month’s tabulated mean; between anchors it ramps toward the
 * next month, so there is no step on the 1st.
 */
export function interpolateMonthlyClimatologyC(
  monthlyMeanC: Float32Array,
  calendarUtc: Date
): number {
  if (!monthlyMeanC || monthlyMeanC.length !== 12) return NaN;

  const midMonthUtcMs = (year: number, monthIndex: number): number =>
    Date.UTC(year, monthIndex, 15, 12, 0, 0);

  const t = calendarUtc.getTime();
  if (Number.isNaN(t)) return NaN;
  const y = calendarUtc.getUTCFullYear();

  /** Ordered mid-month times surrounding calendar year `y`, each tied to a month index 0–11. */
  const anchors: { ms: number; mon: number }[] = [
    { ms: midMonthUtcMs(y - 1, 11), mon: 11 },
  ];
  for (let m = 0; m < 12; m++) {
    anchors.push({ ms: midMonthUtcMs(y, m), mon: m });
  }
  anchors.push(
    { ms: midMonthUtcMs(y + 1, 0), mon: 0 },
    { ms: midMonthUtcMs(y + 1, 1), mon: 1 },
  );

  for (let i = 0; i < anchors.length - 1; i++) {
    const t0 = anchors[i]!.ms;
    const t1 = anchors[i + 1]!.ms;
    const lastSeg = i === anchors.length - 2;
    if (t >= t0 && (lastSeg ? t <= t1 : t < t1)) {
      const v0 = monthlyMeanC[anchors[i]!.mon];
      const v1 = monthlyMeanC[anchors[i + 1]!.mon];
      if (!Number.isFinite(v0) || !Number.isFinite(v1)) return NaN;
      const span = t1 - t0;
      const a = span <= 0 ? 0 : (t - t0) / span;
      return v0 + a * (v1 - v0);
    }
  }

  const fallback = monthlyMeanC[calendarUtc.getUTCMonth()];
  return Number.isFinite(fallback) ? fallback : NaN;
}

/** Weight on WorldClim-style monthly means vs latitude/subsolar model (remainder). */
const TILE_TEMP_CLIMATOLOGY_WEIGHT = 0.85;

/**
 * Effective 0–1 temperature for a tile: blends **regional monthly climatology °C** (per lon/lat cell,
 * smoothed day-to-day via {@link interpolateMonthlyClimatologyC}) with the subsolar + Köppen model so
 * playback still responds to sun geometry. Monthly data dominates so mid‑latitude winters match Earth.
 */
export function getTileTemperature01(
  latDeg: number,
  subsolarLatDeg: number,
  terrainType: TerrainType | null | undefined,
  monthlyMeanTempC: Float32Array | null | undefined,
  calendarUtc: Date | null | undefined
): number {
  const model = getTemperatureForTerrain(latDeg, subsolarLatDeg, terrainType);
  if (
    !monthlyMeanTempC ||
    monthlyMeanTempC.length !== 12 ||
    !calendarUtc ||
    Number.isNaN(calendarUtc.getTime())
  ) {
    return model;
  }
  const tc = interpolateMonthlyClimatologyC(monthlyMeanTempC, calendarUtc);
  if (!Number.isFinite(tc)) return model;
  const clim = meanMonthlyTempCToTemperature01(tc);
  const w = TILE_TEMP_CLIMATOLOGY_WEIGHT;
  return Math.max(0, Math.min(1, w * clim + (1 - w) * model));
}

/**
 * Visual snow strength 0–1 from latitude and seasonal cold, independent of cloud sim snow depth.
 * Used for ground/vegetation so subarctic winter reads as snowy even when precip hits are sparse.
 */
export function climateSurfaceSnowVisual(
  latDeg: number,
  subsolarLatDeg: number
): number {
  const temp = getTemperature(latDeg, subsolarLatDeg);
  const cold = Math.max(0, Math.min(1, (0.38 - temp) / 0.26));
  const polar = Math.max(0, Math.min(1, (Math.abs(latDeg) - 44) / 38));
  return Math.max(0, Math.min(1, cold * (0.22 + 0.78 * polar)));
}

/**
 * Like {@link climateSurfaceSnowVisual} but uses {@link getTileTemperature01} when terrain and optional
 * monthly means + calendar are known.
 */
export function climateSurfaceSnowVisualForTerrain(
  latDeg: number,
  subsolarLatDeg: number,
  terrainType?: TerrainType | null,
  monthlyMeanTempC?: Float32Array | null,
  calendarUtc?: Date | null
): number {
  const temp = getTileTemperature01(
    latDeg,
    subsolarLatDeg,
    terrainType,
    monthlyMeanTempC ?? null,
    calendarUtc ?? null
  );
  const cold = Math.max(0, Math.min(1, (0.47 - temp) / 0.28));
  const polar = Math.max(0, Math.min(1, (Math.abs(latDeg) - 35) / 45));
  return Math.max(0, Math.min(1, cold * (0.15 + 0.85 * polar)));
}
