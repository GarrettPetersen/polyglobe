/**
 * Per-tile wet ground and snow cover from cloud-driven precip.
 *
 * **Calendar year:** Wetness and snow are continuous simulation state in RAM. They **carry across
 * 1 Jan** (and any day boundary). Only {@link CloudClipField.initToMinute} / {@link CloudClipField.dispose}
 * clears them. The annual cloud spawn table only precomputes *where* clouds appear by day-of-year;
 * it does not reset ground moisture.
 *
 * **Snow vs thaw:** Below {@link GroundSurfaceClimateParams.freezeTemperatureThreshold} (same 0–1 scale
 * as {@link getTileTemperature01}), snow depth is preserved indefinitely. Above that, snow melts into
 * wetness each minute; wetness then decays toward dry.
 */

import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import type { TerrainType } from "../terrain/types.js";
import { getTileTemperature01 } from "./seasonalClimate.js";

export interface GroundSurfaceClimateParams {
  /**
   * {@link getTileTemperature01} strictly below this → “freezing”: snow does not melt; wetness dries slowly.
   */
  freezeTemperatureThreshold: number;
  /** When set, temperature uses Köppen/terrain modifiers (same as cloud precip snow vs rain). */
  getTerrainTypeForTile?: (tileId: number) => TerrainType | undefined;
  /** Twelve monthly means (°C) per land tile when a global monthly layer was loaded. */
  getMonthlyMeanTempCForTile?: (tileId: number) => Float32Array | undefined;
  /** Wetness multiplier per minute when thawed (evaporation). */
  wetGroundDecayPerMinute: number;
  /** Wetness multiplier per minute when frozen (slow drying / sublimation). */
  wetGroundDecayPerMinuteCold: number;
  /** When thawed, snow depth multiplier per minute (remainder becomes meltwater → wetness). */
  snowMeltPerMinuteWhenThawed: number;
}

export class TileSurfaceState {
  /** Damp soil / wet canopy strength 0–1. */
  readonly wetness = new Map<number, number>();
  /** Snow lying on ground 0–1 (visual depth proxy). */
  readonly snow = new Map<number, number>();
  /**
   * Incremented when wetness/snow change so consumers can avoid full-terrain repaints when maps are
   * unchanged (e.g. cloud visual lerp every frame without new physics).
   */
  revision = 0;

  clear(): void {
    this.wetness.clear();
    this.snow.clear();
    this.revision++;
  }

  getWetness(tileId: number): number {
    return this.wetness.get(tileId) ?? 0;
  }

  getSnow(tileId: number): number {
    return this.snow.get(tileId) ?? 0;
  }

  /**
   * One simulated minute: thaw-dependent snow melt and wet decay, using {@link getTileTemperature01}
   * at `subsolarLatDeg` for each occupied tile.
   */
  stepClimateMinute(
    globe: Globe,
    subsolarLatDeg: number,
    climate: GroundSurfaceClimateParams,
    utcMinute: number
  ): void {
    const cal = new Date(utcMinute * 60000);
    const keys = new Set<number>([...this.wetness.keys(), ...this.snow.keys()]);
    for (const tid of keys) {
      const p = globe.getTileCenter(tid);
      if (!p) continue;
      const { lat } = tileCenterToLatLon(p);
      const latDeg = (lat * 180) / Math.PI;
      const terrain = climate.getTerrainTypeForTile?.(tid);
      const monthly = climate.getMonthlyMeanTempCForTile?.(tid);
      const temp = getTileTemperature01(
        latDeg,
        subsolarLatDeg,
        terrain,
        monthly,
        cal
      );
      const frozen = temp < climate.freezeTemperatureThreshold;

      let w = this.wetness.get(tid) ?? 0;
      let s = this.snow.get(tid) ?? 0;

      if (frozen) {
        w *= climate.wetGroundDecayPerMinuteCold;
      } else {
        if (s > 0) {
          const retain = climate.snowMeltPerMinuteWhenThawed;
          const melted = s * (1 - retain);
          s = s * retain;
          w = Math.min(1, w + melted * 0.92);
        }
        w *= climate.wetGroundDecayPerMinute;
      }

      if (w < 0.012) this.wetness.delete(tid);
      else this.wetness.set(tid, w);
      if (s < 0.008) this.snow.delete(tid);
      else this.snow.set(tid, s);
    }
  }

  /**
   * Add precip from a cloud hit. `amount` is 0–1 scale (same order as overlay bursts).
   * Snow fills `snow`; rain fills `wetness` (liquid rain erodes snow when it falls).
   */
  addPrecip(tileId: number, amount: number, asSnow: boolean): void {
    const a = Math.max(0, Math.min(1, amount));
    if (a < 1e-6) return;
    if (asSnow) {
      const s = this.snow.get(tileId) ?? 0;
      this.snow.set(tileId, Math.min(1, s + a * 1.1));
      const w = this.wetness.get(tileId) ?? 0;
      this.wetness.set(tileId, Math.min(1, w + a * 0.08));
    } else {
      const w = this.wetness.get(tileId) ?? 0;
      this.wetness.set(tileId, Math.min(1, w + a * 1.05));
      const s = this.snow.get(tileId) ?? 0;
      if (s > 0) {
        this.snow.set(tileId, Math.max(0, s - a * 0.35));
      }
    }
  }
}
