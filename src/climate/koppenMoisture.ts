/**
 * Moisture multipliers for climate-aware clouds/precipitation.
 *
 * **Why Köppen (already in the project)?** It encodes long-term temperature + precipitation
 * regimes, so it separates deserts from rainforests far better than latitude-only ITCZ models.
 * For *hourly* weather you'd add reanalysis or radar; for strategic / seasonal globe games,
 * Köppen-scaled seasonal potential is a strong default — no new dataset required unless you
 * need real-time or sub-monthly fidelity.
 */

import type { TileTerrainData } from "../terrain/terrainMaterial.js";
import type { TerrainType } from "../terrain/types.js";

/** Max land Köppen multiplier in this table (Af); open ocean is above this — endless moisture flux. */
export const OCEAN_MOISTURE_FACTOR = 1.24;

/** Köppen–Geiger class 1–30 (0 = ocean / no land class). Same numbering as earth raster comments. */
export function moistureFactorForKoppenCode(code: number | undefined | null): number {
  if (code === 0) return OCEAN_MOISTURE_FACTOR;
  if (code == null || code < 0 || code > 30) return 0.65;
  switch (code) {
    case 1:
      return 1.12; // Af
    case 2:
      return 1.05; // Am
    case 3:
      return 0.72; // Aw
    case 4:
      return 0.07; // BWh
    case 5:
      return 0.11; // BWk
    case 6:
      return 0.28; // BSh
    case 7:
      return 0.32; // BSk
    case 8:
      return 0.4; // Csa
    case 9:
      return 0.46; // Csb
    case 10:
      return 0.38; // Csc
    case 11:
      return 0.84; // Cwa
    case 12:
      return 0.66; // Cwb
    case 13:
      return 0.54; // Cwc
    case 14:
      return 0.96; // Cfa
    case 15:
      return 0.88; // Cfb
    case 16:
      return 0.61; // Cfc
    case 17:
      return 0.56; // Dsa
    case 18:
      return 0.58; // Dsb
    case 19:
      return 0.52; // Dsc
    case 20:
      return 0.48; // Dsd
    case 21:
      return 0.74; // Dwa
    case 22:
      return 0.7; // Dwb
    case 23:
      return 0.58; // Dwc
    case 24:
      return 0.52; // Dwd
    case 25:
      return 0.8; // Dfa
    case 26:
      return 0.76; // Dfb
    case 27:
      return 0.55; // Dfc
    case 28:
      return 0.5; // Dfd
    case 29:
      return 0.36; // ET
    case 30:
      return 0.17; // EF
    default:
      return 0.65;
  }
}

/** When terrain type came from Köppen (Earth mode), use this as the precip/cloud multiplier. */
export function moistureFactorForTerrainType(type: TerrainType): number {
  switch (type) {
    case "tropical_rainforest":
      return 1.12;
    case "tropical_monsoon":
      return 1.05;
    case "tropical_savanna":
      return 0.72;
    case "hot_desert":
      return 0.07;
    case "cold_desert":
      return 0.11;
    case "hot_steppe":
      return 0.28;
    case "cold_steppe":
      return 0.32;
    case "mediterranean_hot":
      return 0.4;
    case "mediterranean_warm":
      return 0.46;
    case "mediterranean_cold":
      return 0.38;
    case "humid_subtropical":
      return 0.84;
    case "subtropical_highland":
      return 0.66;
    case "subtropical_highland_cold":
      return 0.54;
    case "humid_subtropical_hot":
      return 0.96;
    case "oceanic":
      return 0.88;
    case "subpolar_oceanic":
      return 0.61;
    case "hot_summer_continental":
      return 0.56;
    case "warm_summer_continental":
      return 0.58;
    case "subarctic_dry":
      return 0.52;
    case "subarctic_very_cold_dry":
      return 0.48;
    case "humid_continental_hot":
      return 0.74;
    case "humid_continental_warm":
      return 0.7;
    case "subarctic_dry_winter":
      return 0.58;
    case "subarctic_very_cold_dry_winter":
      return 0.52;
    case "humid_continental":
      return 0.8;
    case "warm_summer_humid":
      return 0.76;
    case "subarctic":
      return 0.55;
    case "subarctic_very_cold":
      return 0.5;
    case "tundra":
      return 0.36;
    case "ice_cap":
      return 0.17;
    /** Open ocean: no Köppen land class; evaporation keeps columns moister than any rainforest tile. */
    case "water":
      return OCEAN_MOISTURE_FACTOR;
    /** Shoreline: still strongly maritime vs interior land. */
    case "beach":
      return 1.02;
    case "mountain":
      return 0.7;
    case "desert":
      return 0.1;
    case "forest":
      return 0.85;
    case "grassland":
      return 0.62;
    case "swamp":
      return 0.92;
    case "snow":
      return 0.4;
    case "ice":
      return 0.2;
    case "land":
    default:
      return 0.65;
  }
}

/** One moisture multiplier per tile from resolved terrain (Earth Köppen types or procedural). */
export function buildMoistureByTileFromTerrain(
  tileTerrain: Map<number, TileTerrainData>
): Map<number, number> {
  const out = new Map<number, number>();
  for (const [id, d] of tileTerrain) {
    out.set(id, moistureFactorForTerrainType(d.type));
  }
  return out;
}
