/**
 * Deterministic cloud weather on a fixed UTC-minute timeline: sparse spawning (including
 * below nominal precip threshold), wind advection, merging, finite water/precip lifecycle.
 *
 * Callers advance with `precipByTile` + subsolar for each minute (e.g. replay last 48h from
 * {@link CLOUD_HISTORY_MINUTES} for continuity after date jumps).
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import { windAtLatLonDeg } from "../wind/windPatterns.js";
import {
  createLowPolyCloudGroupAtAnchor,
  setLowPolyCloudGroupShellPose,
  type SimCloudVisualSpec,
} from "./cloudLayer.js";

const DEG = Math.PI / 180;

/** Minutes of history that affect the current field (replay after big jumps). */
export const CLOUD_HISTORY_MINUTES = 48 * 60;

const POLAR_LAT = 62;

function u32Hash(parts: readonly number[]): number {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    h ^= p >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function unitFloat(h: number): number {
  return (h >>> 0) / 0xffffffff;
}

export interface CloudSimConfig {
  /** Master seed (spawn layout, mesh seeds). */
  seed: number;
  /** Independent spawn rolls per simulated minute (each picks a random tile). Default 24. */
  spawnTriesPerMinute: number;
  /** Base spawn try per minute (any tile). Default ~0.004 */
  spawnProbLow: number;
  /** Extra spawn probability per unit climate precip (0–1). Default ~0.12 */
  spawnProbPrecipScale: number;
  maxClouds: number;
  /** Max simulated age in minutes (dissipation). Default 48h. */
  lifecycleMinutes: number;
  /** Globe-radius-relative wind step per minute at full strength. Default ~1.1e-4 */
  windStepScale: number;
  /** Cosine of max angular separation (rad) for merge. Default cos(7°). */
  mergeCos: number;
  /** Spatial hash bucket size in degrees. */
  bucketDeg: number;
  /** Per-minute overlay decay when no active rain. Default 0.92 */
  precipOverlayDecay: number;
  /** Base water loss per minute. */
  waterDrainBase: number;
  /** Extra drain scaled by climate precip (dries faster in dry columns). */
  waterDrainDryScale: number;
  /** Mesh rebuild at most every N simulated minutes. Default 12 */
  visualResimIntervalMinutes: number;
  /** Default cloud scale passed to marching cubes. */
  cloudScale: number;
  flatDeckScaleMul: number;
  windSeed: number;
  /**
   * Low-poly marching-cubes clouds cast shadows (expensive with hundreds of clouds).
   * Default false for performance; set true for close-up shots.
   */
  cloudCastShadows: boolean;
  /**
   * Max marching-cubes cloud builds/rebuilds per {@link syncThreeGroup} call. Spreads GPU work
   * across frames so hundreds of clouds do not freeze the tab or lose the WebGL context.
   */
  maxCloudMeshOpsPerSync: number;
  /** Multiplier on each rain overlay increment from {@link CloudWeatherSimulator} lifecycle bursts. */
  precipOverlayBurstScale: number;
}

export const DEFAULT_CLOUD_SIM_CONFIG: CloudSimConfig = {
  seed: 0x4b4c4452,
  spawnTriesPerMinute: 24,
  spawnProbLow: 0.0042,
  spawnProbPrecipScale: 0.12,
  maxClouds: 560,
  lifecycleMinutes: CLOUD_HISTORY_MINUTES,
  windStepScale: 1.05e-4,
  /** Stricter than 7° — fewer merges so more distinct puffs stay on screen. */
  mergeCos: Math.cos(2.8 * DEG),
  bucketDeg: 5,
  precipOverlayDecay: 0.92,
  /** ~×8 slower than legacy so clouds can last many hours toward the 48h lifecycle cap. */
  waterDrainBase: 0.00035,
  waterDrainDryScale: 0.00055,
  /** Fewer marching-cubes rebuilds when many clouds (pose still updates every frame). */
  visualResimIntervalMinutes: 24,
  cloudScale: 0.05,
  flatDeckScaleMul: 2.0,
  windSeed: 90210,
  cloudCastShadows: false,
  maxCloudMeshOpsPerSync: 36,
  precipOverlayBurstScale: 2.0,
};

export interface SimCloud {
  id: number;
  birthMinute: number;
  ax: number;
  ay: number;
  az: number;
  water: number;
  baseScale: number;
  meshSeed: number;
  spawnTileId: number;
  flatDeck: boolean;
}

const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _blow = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

export class CloudWeatherSimulator {
  readonly config: CloudSimConfig;
  /** Next UTC minute index to simulate (Unix ms / 60000 floor convention). */
  simMinute = 0;
  private clouds: SimCloud[] = [];
  private nextId = 1;
  private precipOverlay = new Map<number, number>();
  private lastVisualSimMinute = -1;
  private meshScratch = new Map<number, THREE.Group>();

  constructor(config: Partial<CloudSimConfig> = {}) {
    this.config = { ...DEFAULT_CLOUD_SIM_CONFIG, ...config };
  }

  getClouds(): readonly SimCloud[] {
    return this.clouds;
  }

  /** Active rain overlay intensities 0–1 per tile (decays each minute). */
  getPrecipOverlayMap(): Map<number, number> {
    return this.precipOverlay;
  }

  /**
   * Clear state and set the next minute to simulate. Use `endMinute - CLOUD_HISTORY_MINUTES`
   * before replaying forward.
   */
  resetForReplay(startSimMinute: number): void {
    this.simMinute = startSimMinute;
    this.clouds = [];
    this.nextId = 1;
    this.precipOverlay.clear();
    this.lastVisualSimMinute = -1;
    for (const g of this.meshScratch.values()) {
      g.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
    }
    this.meshScratch.clear();
  }

  /**
   * Advance one UTC minute: spawn, move, merge, precip, lifecycle, overlay decay.
   */
  advanceOneMinute(
    globe: Globe,
    precipByTile: Map<number, number>,
    subsolarLatDeg: number
  ): void {
    const m = this.simMinute;
    const cfg = this.config;

    // Decay existing precip overlay
    for (const [tid, v] of this.precipOverlay) {
      const nv = v * cfg.precipOverlayDecay;
      if (nv < 0.02) this.precipOverlay.delete(tid);
      else this.precipOverlay.set(tid, nv);
    }

    this.trySpawn(globe, precipByTile, m);
    this.advectClouds(globe, subsolarLatDeg, m);
    this.mergeClouds();
    this.applyLifecycleAndPrecip(globe, precipByTile, m);

    this.simMinute = m + 1;
  }

  /** Tile under cloud anchor (drifting rain footprint). */
  private tileUnderCloud(globe: Globe, c: SimCloud): number {
    _anchor.set(c.ax, c.ay, c.az);
    const id = globe.getTileIdAtDirection(_anchor);
    return id > 0 ? id : c.spawnTileId;
  }

  private addPrecipBurstAtCloud(globe: Globe, c: SimCloud, amount: number): void {
    const tid = this.tileUnderCloud(globe, c);
    const cur = this.precipOverlay.get(tid) ?? 0;
    const a = amount * this.config.precipOverlayBurstScale;
    this.precipOverlay.set(tid, Math.min(1, cur + a));
  }

  private trySpawn(globe: Globe, precipByTile: Map<number, number>, utcMinute: number): void {
    const cfg = this.config;
    const tiles = globe.tiles;
    if (tiles.length === 0) return;

    const tries = Math.max(1, Math.floor(cfg.spawnTriesPerMinute));
    for (let t = 0; t < tries; t++) {
      if (this.clouds.length >= cfg.maxClouds) return;

      const h = u32Hash([cfg.seed, utcMinute, t, 0x5057414e]);
      const tileIdx = h % tiles.length;
      const tile = tiles[tileIdx]!;
      const precip = precipByTile.get(tile.id) ?? 0;
      const { lat } = tileCenterToLatLon(tile.center);
      const latDeg = (lat * 180) / Math.PI;
      const absLat = Math.abs(latDeg);
      const polar = absLat >= POLAR_LAT;
      const effPrecip = polar ? Math.max(precip, 0.12) : precip;

      const pSpawn =
        cfg.spawnProbLow + effPrecip * cfg.spawnProbPrecipScale * (polar ? 1.15 : 1);
      const u = unitFloat(u32Hash([h, t, 0x2f21]));
      if (u > pSpawn) continue;

      const center = globe.getTileCenter(tile.id);
      if (!center) continue;
      const ax = center.x;
      const ay = center.y;
      const az = center.z;
      const len = Math.hypot(ax, ay, az) || 1;
      const id = this.nextId++;
      const meshSeed = u32Hash([cfg.seed, id, utcMinute, t, 0x4d5348]);
      const baseScale =
        cfg.cloudScale *
        (0.72 + unitFloat(u32Hash([meshSeed, 1])) * 0.55) *
        (0.85 + effPrecip * 0.35);

      const sc: SimCloud = {
        id,
        birthMinute: utcMinute,
        ax: ax / len,
        ay: ay / len,
        az: az / len,
        water: 0.55 + unitFloat(u32Hash([meshSeed, 2])) * 0.35,
        baseScale,
        meshSeed,
        spawnTileId: tile.id,
        flatDeck: false,
      };
      sc.flatDeck = sc.baseScale > cfg.cloudScale * cfg.flatDeckScaleMul;
      this.clouds.push(sc);
    }
  }

  private advectClouds(globe: Globe, subsolarLatDeg: number, utcMinute: number): void {
    const cfg = this.config;
    const R = globe.radius;

    for (const c of this.clouds) {
      _anchor.set(c.ax, c.ay, c.az);
      const latDeg = Math.asin(Math.max(-1, Math.min(1, c.ay))) * (180 / Math.PI);
      const lonDeg = Math.atan2(c.ax, c.az) * (180 / Math.PI);

      const w = windAtLatLonDeg(latDeg, lonDeg, subsolarLatDeg, {
        seed: cfg.windSeed,
        simMinute: utcMinute,
      });
      const blow = w.directionRad + Math.PI;
      const up = _anchor;
      _east.copy(_worldUp).cross(up);
      if (_east.lengthSq() < 1e-10) _east.set(1, 0, 0).cross(up);
      _east.normalize();
      _north.copy(up).cross(_east).normalize();
      _blow
        .copy(_east)
        .multiplyScalar(Math.cos(blow))
        .addScaledVector(_north, Math.sin(blow))
        .normalize();

      const step = cfg.windStepScale * R * w.strength;
      _anchor.addScaledVector(_blow, step).normalize();
      c.ax = _anchor.x;
      c.ay = _anchor.y;
      c.az = _anchor.z;
    }
  }

  private mergeClouds(): void {
    const cfg = this.config;
    const cosLim = cfg.mergeCos;
    const bd = cfg.bucketDeg;
    type Bucket = number[];
    const buckets = new Map<number, Bucket>();

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i]!;
      const latDeg = Math.asin(Math.max(-1, Math.min(1, c.ay))) * (180 / Math.PI);
      const lonDeg = Math.atan2(c.ax, c.az) * (180 / Math.PI);
      const key =
        (Math.floor((latDeg + 90) / bd) << 16) ^
        (Math.floor((lonDeg + 180) / bd) & 0xffff);
      let b = buckets.get(key);
      if (!b) {
        b = [];
        buckets.set(key, b);
      }
      b.push(i);
    }

    const removeIdx = new Set<number>();

    for (const [, idxs] of buckets) {
      for (let a = 0; a < idxs.length; a++) {
        const ia = idxs[a]!;
        if (removeIdx.has(ia)) continue;
        const ca = this.clouds[ia]!;
        for (let b = a + 1; b < idxs.length; b++) {
          const ib = idxs[b]!;
          if (removeIdx.has(ib)) continue;
          const cb = this.clouds[ib]!;
          const dot = ca.ax * cb.ax + ca.ay * cb.ay + ca.az * cb.az;
          if (dot < cosLim) continue;

          const wa = ca.water;
          const wb = cb.water;
          const wsum = wa + wb + 1e-6;
          const nx = (ca.ax * wa + cb.ax * wb) / wsum;
          const ny = (ca.ay * wa + cb.ay * wb) / wsum;
          const nz = (ca.az * wa + cb.az * wb) / wsum;
          const nlen = Math.hypot(nx, ny, nz) || 1;
          const vol = Math.cbrt(ca.baseScale ** 3 + cb.baseScale ** 3);
          const older = ca.birthMinute <= cb.birthMinute ? ca : cb;
          ca.ax = nx / nlen;
          ca.ay = ny / nlen;
          ca.az = nz / nlen;
          ca.water = Math.min(1.85, wa + wb * 0.92);
          ca.baseScale = Math.min(cfg.cloudScale * 4.5, vol);
          ca.meshSeed = u32Hash([cfg.seed, ca.id, cb.id, 0x4d5247]);
          ca.birthMinute = older.birthMinute;
          ca.spawnTileId = older.spawnTileId;
          ca.flatDeck = ca.baseScale > cfg.cloudScale * cfg.flatDeckScaleMul;
          removeIdx.add(ib);
        }
      }
    }

    if (removeIdx.size === 0) return;
    this.clouds = this.clouds.filter((_, i) => !removeIdx.has(i));
  }

  private applyLifecycleAndPrecip(
    globe: Globe,
    precipByTile: Map<number, number>,
    utcMinute: number
  ): void {
    const cfg = this.config;
    const next: SimCloud[] = [];

    for (const c of this.clouds) {
      const age = utcMinute - c.birthMinute;
      if (age >= cfg.lifecycleMinutes) {
        this.addPrecipBurstAtCloud(globe, c, c.water * 0.55);
        continue;
      }

      const footTile = this.tileUnderCloud(globe, c);
      let colPrecip = precipByTile.get(footTile) ?? 0;
      const h = u32Hash([cfg.seed, c.id, utcMinute, 0x434f4c]);
      colPrecip *= 0.85 + 0.3 * unitFloat(h);

      const drain =
        cfg.waterDrainBase +
        cfg.waterDrainDryScale * (1 - Math.min(1, colPrecip + 0.15));
      c.water -= drain;

      if (c.water > 0.18) {
        const rate = 0.06 + 0.14 * Math.min(1, c.water);
        this.addPrecipBurstAtCloud(globe, c, rate * c.water * 0.04);
      }

      if (c.water <= 0.04) {
        this.addPrecipBurstAtCloud(
          globe,
          c,
          0.12 + unitFloat(u32Hash([c.id, utcMinute])) * 0.2
        );
        continue;
      }

      c.flatDeck = c.baseScale > cfg.cloudScale * cfg.flatDeckScaleMul;
      next.push(c);
    }
    this.clouds = next;
  }

  /**
   * Sync `root` with simulation: cheap shell pose every call; marching-cubes rebuild throttled
   * or when cloud ids / count change.
   */
  syncThreeGroup(root: THREE.Group, globe: Globe, utcMinuteForVisual: number): void {
    const cfg = this.config;
    const seen = new Set<number>();
    const heightOff = 0.04;

    let needMeshPass =
      this.lastVisualSimMinute < 0 ||
      root.children.length !== this.clouds.length ||
      utcMinuteForVisual - this.lastVisualSimMinute >= cfg.visualResimIntervalMinutes;

    const prevIds = new Set(this.meshScratch.keys());
    for (const c of this.clouds) {
      if (!prevIds.has(c.id)) needMeshPass = true;
      seen.add(c.id);
    }
    for (const id of prevIds) {
      if (!seen.has(id)) needMeshPass = true;
    }

    let meshOpsLeft = Math.max(1, Math.floor(cfg.maxCloudMeshOpsPerSync));
    let deferredMeshWork = false;

    _anchor.set(0, 0, 0);
    for (const c of this.clouds) {
      let grp = this.meshScratch.get(c.id);
      const w = Math.max(0.2, Math.min(1.6, c.water));
      const scale = c.baseScale * (0.38 + 0.62 * Math.sqrt(w));

      if (!grp) {
        if (meshOpsLeft <= 0) {
          deferredMeshWork = true;
          continue;
        }
        meshOpsLeft--;
        const spec: SimCloudVisualSpec = {
          anchor: new THREE.Vector3(c.ax, c.ay, c.az),
          scale,
          meshSeed: c.meshSeed,
          flatDeck: c.flatDeck,
        };
        grp = createLowPolyCloudGroupAtAnchor(globe, spec, {
          opacity: 0.9,
          castShadows: cfg.cloudCastShadows,
          clipBottomToGlobe: true,
          heightOffset: heightOff,
        });
        grp.userData.simScale = scale;
        this.meshScratch.set(c.id, grp);
      } else if (needMeshPass) {
        const prevScale = grp.userData.simScale as number | undefined;
        if (prevScale === undefined || Math.abs(prevScale - scale) > 1e-4) {
          if (meshOpsLeft <= 0) {
            deferredMeshWork = true;
          } else {
            meshOpsLeft--;
            grp.traverse((ch) => {
              if (ch instanceof THREE.Mesh) {
                ch.geometry.dispose();
                if (ch.material instanceof THREE.Material) ch.material.dispose();
              }
            });
            grp.clear();
            const spec: SimCloudVisualSpec = {
              anchor: new THREE.Vector3(c.ax, c.ay, c.az),
              scale,
              meshSeed: c.meshSeed,
              flatDeck: c.flatDeck,
            };
            const fresh = createLowPolyCloudGroupAtAnchor(globe, spec, {
              opacity: 0.9,
              castShadows: cfg.cloudCastShadows,
              clipBottomToGlobe: true,
              heightOffset: heightOff,
            });
            for (const ch of fresh.children) grp.add(ch);
            fresh.traverse((ch) => {
              if (ch instanceof THREE.Mesh) {
                ch.geometry.dispose();
                if (ch.material instanceof THREE.Material) ch.material.dispose();
              }
            });
            grp.userData.simScale = scale;
          }
        }
      }

      grp = this.meshScratch.get(c.id);
      if (!grp) continue;
      _anchor.set(c.ax, c.ay, c.az);
      setLowPolyCloudGroupShellPose(globe, grp, _anchor, heightOff);
    }

    if (needMeshPass && !deferredMeshWork) {
      this.lastVisualSimMinute = utcMinuteForVisual;
    }

    for (const [id, grp] of this.meshScratch) {
      if (!seen.has(id)) {
        grp.traverse((ch) => {
          if (ch instanceof THREE.Mesh) {
            ch.geometry.dispose();
            if (ch.material instanceof THREE.Material) ch.material.dispose();
          }
        });
        this.meshScratch.delete(id);
      }
    }

    root.clear();
    for (const c of this.clouds) {
      const grp = this.meshScratch.get(c.id);
      if (grp) root.add(grp);
    }
  }
}

/**
 * UTC minute index = floor(date.getTime() / 60000).
 */
export function utcMinuteFromDate(d: Date): number {
  return Math.floor(d.getTime() / 60000);
}

export type PrecipSubsolarForMinute = (utcMin: number) => {
  precipByTile: Map<number, number>;
  subsolarLatDeg: number;
};

/** Synchronous full replay of {@link CLOUD_HISTORY_MINUTES} ending at `endUtcMinute` (may hitch). */
export function replayCloudSimToUtcMinute(
  sim: CloudWeatherSimulator,
  endUtcMinute: number,
  globe: Globe,
  getPrecipSubsolar: PrecipSubsolarForMinute
): void {
  const start = endUtcMinute - CLOUD_HISTORY_MINUTES;
  sim.resetForReplay(start);
  for (let m = start; m < endUtcMinute; m++) {
    const { precipByTile, subsolarLatDeg } = getPrecipSubsolar(m);
    sim.advanceOneMinute(globe, precipByTile, subsolarLatDeg);
  }
}

/**
 * Same as {@link replayCloudSimToUtcMinute} but yields between chunks so the tab stays responsive.
 */
export async function replayCloudSimToUtcMinuteChunked(
  sim: CloudWeatherSimulator,
  endUtcMinute: number,
  globe: Globe,
  getPrecipSubsolar: PrecipSubsolarForMinute,
  chunkMinutes = 240
): Promise<void> {
  const start = endUtcMinute - CLOUD_HISTORY_MINUTES;
  sim.resetForReplay(start);
  let m = start;
  while (m < endUtcMinute) {
    const endChunk = Math.min(endUtcMinute, m + chunkMinutes);
    while (m < endChunk) {
      const { precipByTile, subsolarLatDeg } = getPrecipSubsolar(m);
      sim.advanceOneMinute(globe, precipByTile, subsolarLatDeg);
      m++;
    }
    await new Promise<void>((r) => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => r(), { timeout: 48 });
      } else {
        requestAnimationFrame(() => r());
      }
    });
  }
}

/** If the sim is behind/ahead of `targetUtcMinute`, catch up or re-run the 48h window. */
export function syncCloudSimToUtcMinute(
  sim: CloudWeatherSimulator,
  targetUtcMinute: number,
  globe: Globe,
  getPrecipSubsolar: PrecipSubsolarForMinute,
  maxCatchUpMinutes = 360
): boolean {
  if (sim.simMinute === targetUtcMinute) return false;
  if (sim.simMinute > targetUtcMinute || targetUtcMinute - sim.simMinute > maxCatchUpMinutes) {
    replayCloudSimToUtcMinute(sim, targetUtcMinute, globe, getPrecipSubsolar);
    return true;
  }
  while (sim.simMinute < targetUtcMinute) {
    const m = sim.simMinute;
    const { precipByTile, subsolarLatDeg } = getPrecipSubsolar(m);
    sim.advanceOneMinute(globe, precipByTile, subsolarLatDeg);
  }
  return false;
}
