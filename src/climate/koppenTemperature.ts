/**
 * Köppen-linked adjustments to the 0–1 temperature field from {@link getTemperature}.
 *
 * The base model is latitude + subsolar only (no continentality). These modifiers add:
 * - **Maritime damping** — lower seasonal variance, milder winters (e.g. oceanic vs interior).
 * - **Continental winters** — colder when the seasonal model is in a cold phase (e.g. Dfb vs Cfb).
 * - **Desert warmth** — extra heat when the base field is already warm.
 * - **Polar / alpine level** — slight cold bias for tundra, ice, high mountains.
 */

import type { TerrainType } from "../terrain/types.js";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Weight in [0, 1]: 1 when lat is poorly aligned with subsolar (cold season for the simplified model).
 */
export function coldSeasonWeight(
  latDeg: number,
  subsolarLatDeg: number
): number {
  const season = Math.exp(-Math.pow((latDeg - subsolarLatDeg) / 40, 2));
  return 1 - season;
}

/** Reference “neutral” temperature in 0–1 space for variance damping (warmer tropics, cooler poles). */
function latitudeTempMid(latDeg: number): number {
  const a = Math.abs(latDeg) / 90;
  return 0.36 + 0.22 * (1 - a);
}

export interface TerrainTemperatureTraits {
  /** Scale on (base − mid): &lt;1 damps seasonal swing (maritime), &gt;1 amplifies (continental). */
  varianceMul: number;
  /**
   * Added when {@link coldSeasonWeight} is high. Positive = milder winter, negative = harsher winter.
   */
  winterSeasonalDelta: number;
  /** Added when base temperature is warm; strongest outside the cold season (deserts, steppe). */
  summerWarmDelta: number;
  /** Constant bias (polar, ice, elevation). */
  levelOffset: number;
}

export function koppenTerrainTemperatureTraits(
  type: TerrainType
): TerrainTemperatureTraits {
  switch (type) {
    case "oceanic":
    case "subpolar_oceanic":
      return {
        varianceMul: 0.78,
        winterSeasonalDelta: 0.048,
        summerWarmDelta: -0.014,
        levelOffset: 0,
      };
    case "beach":
      return {
        varianceMul: 0.82,
        winterSeasonalDelta: 0.042,
        summerWarmDelta: -0.01,
        levelOffset: 0,
      };
    case "humid_subtropical_hot":
    case "humid_subtropical":
      return {
        varianceMul: 0.88,
        winterSeasonalDelta: 0.028,
        summerWarmDelta: 0.006,
        levelOffset: 0,
      };
    case "humid_continental":
    case "warm_summer_humid":
    case "humid_continental_hot":
    case "humid_continental_warm":
      return {
        varianceMul: 1.08,
        winterSeasonalDelta: -0.05,
        summerWarmDelta: 0.024,
        levelOffset: 0,
      };
    case "hot_summer_continental":
    case "warm_summer_continental":
    case "subarctic_dry":
    case "subarctic_very_cold_dry":
    case "subarctic_dry_winter":
    case "subarctic_very_cold_dry_winter":
      return {
        varianceMul: 1.1,
        winterSeasonalDelta: -0.056,
        summerWarmDelta: 0.028,
        levelOffset: -0.012,
      };
    case "subarctic":
    case "subarctic_very_cold":
      return {
        varianceMul: 1.06,
        winterSeasonalDelta: -0.048,
        summerWarmDelta: 0.018,
        levelOffset: -0.032,
      };
    case "hot_desert":
    case "cold_desert":
      return {
        varianceMul: 1.12,
        winterSeasonalDelta: -0.012,
        summerWarmDelta: 0.058,
        levelOffset: 0.018,
      };
    case "hot_steppe":
    case "cold_steppe":
      return {
        varianceMul: 1.06,
        winterSeasonalDelta: -0.022,
        summerWarmDelta: 0.042,
        levelOffset: 0.008,
      };
    case "tundra":
      return {
        varianceMul: 0.94,
        winterSeasonalDelta: -0.032,
        summerWarmDelta: -0.018,
        levelOffset: -0.042,
      };
    case "ice_cap":
    case "ice":
      return {
        varianceMul: 0.9,
        winterSeasonalDelta: -0.024,
        summerWarmDelta: -0.045,
        levelOffset: -0.075,
      };
    case "tropical_rainforest":
    case "tropical_monsoon":
      return {
        varianceMul: 0.72,
        winterSeasonalDelta: 0.018,
        summerWarmDelta: 0.008,
        levelOffset: 0.035,
      };
    case "tropical_savanna":
      return {
        varianceMul: 0.88,
        winterSeasonalDelta: 0.008,
        summerWarmDelta: 0.022,
        levelOffset: 0.02,
      };
    case "mediterranean_hot":
    case "mediterranean_warm":
    case "mediterranean_cold":
      return {
        varianceMul: 0.96,
        winterSeasonalDelta: 0.012,
        summerWarmDelta: 0.032,
        levelOffset: 0,
      };
    case "subtropical_highland":
    case "subtropical_highland_cold":
      return {
        varianceMul: 0.92,
        winterSeasonalDelta: -0.008,
        summerWarmDelta: -0.006,
        levelOffset: -0.028,
      };
    case "mountain":
      return {
        varianceMul: 1.02,
        winterSeasonalDelta: -0.018,
        summerWarmDelta: -0.012,
        levelOffset: -0.038,
      };
    case "water":
      return {
        varianceMul: 0.76,
        winterSeasonalDelta: 0.035,
        summerWarmDelta: -0.018,
        levelOffset: 0,
      };
    case "land":
    case "forest":
    case "grassland":
    case "desert":
    case "swamp":
    case "snow":
    default:
      return {
        varianceMul: 1,
        winterSeasonalDelta: 0,
        summerWarmDelta: 0,
        levelOffset: 0,
      };
  }
}

/**
 * Applies terrain/Köppen traits to the normalized temperature from {@link getTemperature}.
 * Unknown or null terrain leaves the base value unchanged (aside from clamping).
 */
export function applyKoppenTerrainTemperatureModifier(
  baseTemp01: number,
  latDeg: number,
  subsolarLatDeg: number,
  terrainType: TerrainType | undefined | null
): number {
  if (terrainType == null) {
    return clamp01(baseTemp01);
  }
  const {
    varianceMul,
    winterSeasonalDelta,
    summerWarmDelta,
    levelOffset,
  } = koppenTerrainTemperatureTraits(terrainType);
  const mid = latitudeTempMid(latDeg);
  let t = mid + (baseTemp01 - mid) * varianceMul;
  const cw = coldSeasonWeight(latDeg, subsolarLatDeg);
  const ww = cw * cw;
  t += winterSeasonalDelta * ww;
  const warmExcess = Math.max(0, baseTemp01 - 0.52);
  const summerGate = 1 - cw * 0.38;
  t += summerWarmDelta * warmExcess * summerGate;
  t += levelOffset;
  return clamp01(t);
}
