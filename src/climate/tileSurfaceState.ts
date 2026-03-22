/**
 * Per-tile wet ground and snow cover from cloud-driven precip.
 *
 * **Calendar year:** Wetness and snow are continuous simulation state in RAM. They **carry across
 * 1 Jan** (and any day boundary). Only {@link CloudClipField.initToMinute} / {@link CloudClipField.dispose}
 * clears them. The annual cloud spawn table only precomputes *where* clouds appear by day-of-year;
 * it does not reset ground moisture.
 *
 * **Snow vs thaw:** Below {@link GroundSurfaceClimateParams.freezeTemperatureThreshold} (same 0–1 scale
 * as {@link getTemperature}), snow depth is preserved indefinitely. Above that, snow melts into
 * wetness each minute; wetness then decays toward dry.
 */

import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import { getTemperature } from "./seasonalClimate.js";

export interface GroundSurfaceClimateParams {
  /**
   * {@link getTemperature} strictly below this → “freezing”: snow does not melt; wetness dries slowly.
   */
  freezeTemperatureThreshold: number;
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

  clear(): void {
    this.wetness.clear();
    this.snow.clear();
  }

  getWetness(tileId: number): number {
    return this.wetness.get(tileId) ?? 0;
  }

  getSnow(tileId: number): number {
    return this.snow.get(tileId) ?? 0;
  }

  /**
   * One simulated minute: thaw-dependent snow melt and wet decay, using {@link getTemperature} at
   * `subsolarLatDeg` for each occupied tile.
   */
  stepClimateMinute(
    globe: Globe,
    subsolarLatDeg: number,
    climate: GroundSurfaceClimateParams
  ): void {
    const keys = new Set<number>([...this.wetness.keys(), ...this.snow.keys()]);
    for (const tid of keys) {
      const p = globe.getTileCenter(tid);
      if (!p) continue;
      const { lat } = tileCenterToLatLon(p);
      const latDeg = (lat * 180) / Math.PI;
      const temp = getTemperature(latDeg, subsolarLatDeg);
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
