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
import {
  getTileTemperature01,
  resolveMonthlyClimatologySampleContextForUtcMinute,
} from "./seasonalClimate.js";

const SURFACE_VALUE_EPS = 1e-7;

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

  /** Tile center latitude (°); stable for a globe instance — avoids recomputing every sim minute. */
  private readonly tileLatDegById = new Map<number, number>();
  private readonly climateTileScratch = new Set<number>();

  clear(): void {
    this.wetness.clear();
    this.snow.clear();
    this.tileLatDegById.clear();
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
    const monthlyCtx =
      resolveMonthlyClimatologySampleContextForUtcMinute(utcMinute);
    const keys = this.climateTileScratch;
    keys.clear();
    for (const tid of this.wetness.keys()) keys.add(tid);
    for (const tid of this.snow.keys()) keys.add(tid);
    const latCache = this.tileLatDegById;
    let anyMutated = false;
    for (const tid of keys) {
      let latDeg = latCache.get(tid);
      if (latDeg === undefined) {
        const p = globe.getTileCenter(tid);
        if (!p) continue;
        const { lat } = tileCenterToLatLon(p);
        latDeg = (lat * 180) / Math.PI;
        latCache.set(tid, latDeg);
      }
      const terrain = climate.getTerrainTypeForTile?.(tid);
      const monthly = climate.getMonthlyMeanTempCForTile?.(tid);
      const temp = getTileTemperature01(
        latDeg,
        subsolarLatDeg,
        terrain,
        monthly,
        cal,
        monthlyCtx
      );
      const frozen = temp < climate.freezeTemperatureThreshold;

      const hadW = this.wetness.has(tid);
      const hadS = this.snow.has(tid);
      const w0 = this.wetness.get(tid) ?? 0;
      const s0 = this.snow.get(tid) ?? 0;

      let w = w0;
      let s = s0;

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

      const keepW = w >= 0.012;
      const keepS = s >= 0.008;
      const w1 = keepW ? w : 0;
      const s1 = keepS ? s : 0;
      if (
        keepW !== hadW ||
        keepS !== hadS ||
        (keepW && Math.abs(w1 - w0) > SURFACE_VALUE_EPS) ||
        (keepS && Math.abs(s1 - s0) > SURFACE_VALUE_EPS)
      ) {
        anyMutated = true;
      }

      if (keepW) this.wetness.set(tid, w);
      else this.wetness.delete(tid);
      if (keepS) this.snow.set(tid, s);
      else this.snow.delete(tid);
    }
    if (anyMutated) this.revision++;
  }

  /**
   * Add precip from a cloud hit. `amount` is 0–1 scale (same order as overlay bursts).
   * Snow fills `snow`; rain fills `wetness` (liquid rain erodes snow when it falls).
   */
  addPrecip(tileId: number, amount: number, asSnow: boolean): void {
    const a = Math.max(0, Math.min(1, amount));
    if (a < 1e-6) return;
    if (asSnow) {
      const s0 = this.snow.get(tileId) ?? 0;
      const w0 = this.wetness.get(tileId) ?? 0;
      const s1 = Math.min(1, s0 + a * 1.1);
      const w1 = Math.min(1, w0 + a * 0.08);
      if (
        Math.abs(s1 - s0) <= SURFACE_VALUE_EPS &&
        Math.abs(w1 - w0) <= SURFACE_VALUE_EPS
      ) {
        return;
      }
      this.snow.set(tileId, s1);
      this.wetness.set(tileId, w1);
      this.revision++;
    } else {
      const w0 = this.wetness.get(tileId) ?? 0;
      const s0 = this.snow.get(tileId) ?? 0;
      const w1 = Math.min(1, w0 + a * 1.05);
      let s1 = s0;
      if (s0 > 0) {
        s1 = Math.max(0, s0 - a * 0.35);
      }
      if (
        Math.abs(w1 - w0) <= SURFACE_VALUE_EPS &&
        Math.abs(s1 - s0) <= SURFACE_VALUE_EPS
      ) {
        return;
      }
      this.wetness.set(tileId, w1);
      if (s0 > 0) {
        this.snow.set(tileId, s1);
      }
      this.revision++;
    }
  }
}
