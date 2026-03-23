/**
 * Cloud field: lifecycle template clips (marching-cubes), moisture + seasonal spawn,
 * fixed birth-wind drift, fractional-minute visual lerp between frames, power-law size spread.
 */

import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { tileCenterToLatLon } from "../earth/earthSampling.js";
import { windAtLatLonDeg } from "../wind/windPatterns.js";
import {
  createLowPolyCloudGroupAtAnchor,
  DEFAULT_CLOUD_SDF_GRID_RES,
  setLowPolyCloudGroupShellPose,
  updateLowPolyCloudGroupVisualScaleOpacity,
  updateLowPolyCloudGroupHemisphereShade,
  type SimCloudVisualSpec,
} from "./cloudLayer.js";
import type { PrecipSubsolarForMinute } from "./cloudSimulation.js";
import { getTileTemperature01 } from "./seasonalClimate.js";
import {
  TileSurfaceState,
  type GroundSurfaceClimateParams,
} from "./tileSurfaceState.js";
import type { TerrainType } from "../terrain/types.js";

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

export interface CloudClipFrame {
  /** Multiplies instance base scale (globe-relative). */
  scaleMul: number;
  /** Cloud material opacity this frame. */
  opacity: number;
  /** Seeds marching-cubes puff layout (stable per frame index). */
  meshSeed: number;
  flatDeck: boolean;
  /** Per-minute rain contribution to tile under cloud (0–1 scale). */
  precipWeight: number;
}

export interface CloudClipTemplate {
  readonly frames: readonly CloudClipFrame[];
}

function makeTemplate(seedBase: number, flatLate: boolean): CloudClipTemplate {
  const n = 14;
  const frames: CloudClipFrame[] = [];
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1);
    const envelope = Math.sin(t * Math.PI);
    const scaleMul = 0.34 + envelope * 0.92;
    const opacity = 0.48 + envelope * 0.46;
    const precipWeight = envelope * 0.24;
    frames.push({
      scaleMul,
      opacity,
      meshSeed: u32Hash([seedBase, i, 0x434c50]),
      flatDeck: flatLate && t > 0.62,
      precipWeight,
    });
  }
  return { frames };
}

/** Fewer templates ⇒ more clouds share the same lifecycle frame mesh key (helps CPU cache); still varied. */
const CLIP_TEMPLATES: readonly CloudClipTemplate[] = [
  makeTemplate(0x01c10d01, false),
  makeTemplate(0x02c20d02, true),
  makeTemplate(0x03c30d03, false),
];

export interface CloudClipFieldConfig {
  maxClouds: number;
  cloudScale: number;
  cloudCastShadows: boolean;
  /**
   * When true and {@link CloudClipField.syncThreeGroup} receives `sunDirectionTowardSun`, cloud puff
   * color follows a simple terminator (avoids shadow-map sampling on clouds).
   */
  cloudHemisphereShading: boolean;
  /**
   * Marching-cubes grid resolution per axis for each cloud mesh (see {@link DEFAULT_CLOUD_SDF_GRID_RES}).
   * Lower = fewer triangles and faster SDF sampling (~O(n³)).
   */
  cloudMarchingCubesGrid: number;
  maxCloudMeshOpsPerSync: number;
  /** Skip physics catch-up past this many minutes (re-init field). */
  maxCatchUpMinutes: number;
  seed: number;
  windSeed: number;
  /** Drift per simulated minute, × globe radius × birth wind strength (fixed at spawn). */
  windStepScale: number;
  precipOverlayDecay: number;
  /** Real minutes per lifecycle template frame (smooth lerp between frames). */
  lifecycleMinutesPerFrame: number;
  /** Power-law size: `minMul * pow(maxMul/minMul, u^exponent)` with u∈(0,1] — many small, rare huge. */
  sizePowerMinMul: number;
  sizePowerMaxMul: number;
  sizePowerExponent: number;
  /**
   * When a lifecycle frame can produce precip, this is the probability (0–1) that a hit actually
   * registers (rain/snow + overlay). Keeps clouds from always raining.
   */
  cloudPrecipHitChance: number;
  /**
   * Multiplies each precip burst before it is split into overlay vs tile wetness/snow (stacked with
   * {@link cloudScale} and per-frame {@link CloudClipFrame.precipWeight}).
   */
  cloudPrecipBurstScale: number;
  /** {@link getTileTemperature01} below this (0–1) → snow on the ground; above → rain / wetness. */
  snowTemperatureThreshold: number;
  /** Multiplicative wetness decay per simulated minute when thawed. */
  wetGroundDecayPerMinute: number;
  /** Multiplicative wetness decay per simulated minute when frozen (slow). */
  wetGroundDecayPerMinuteCold: number;
  /**
   * {@link getTileTemperature01} below this → snowpack depth is preserved; wetness decays slowly.
   * At/above → snow melts into wetness each minute, then wetness uses {@link wetGroundDecayPerMinute}.
   */
  groundFreezeTemperatureThreshold: number;
  /**
   * When set, snow vs rain and ground freeze use Köppen / terrain (see {@link getTileTemperature01}).
   */
  getTerrainTypeForTile?: (tileId: number) => TerrainType | undefined;
  /** Optional twelve monthly mean °C per tile (global raster sampled per tile). */
  getMonthlyMeanTempCForTile?: (tileId: number) => Float32Array | undefined;
  /** When thawed, retained snow fraction per minute (1 − retain becomes meltwater → wetness). */
  snowMeltPerMinuteWhenThawed: number;
  /**
   * Optional: subsolar latitude for ground climate only (cheap). If set, bulk catch-up steps snow/wet
   * per minute without calling {@link PrecipSubsolarForMinute} every minute (which rebuilds full precip maps).
   */
  getSubsolarLatDegForUtcMinute?: (utcMinute: number) => number;
  /** Optional: skip surface + overlay accumulation on ocean tiles. */
  waterTileIds?: ReadonlySet<number>;
  /**
   * When {@link CloudClipField.syncThreeGroup} is called with a camera, hide clouds on the far side
   * of the globe: `anchor·camDir < this` (camDir from origin toward camera). Typical −0.08…−0.15.
   * Set `null` to disable culling even when a camera is passed.
   */
  cloudBackfaceCullDot: number | null;
}

const DEFAULT_CLIP_CONFIG: CloudClipFieldConfig = {
  maxClouds: 96,
  cloudScale: 0.038,
  cloudCastShadows: false,
  cloudHemisphereShading: true,
  cloudMarchingCubesGrid: DEFAULT_CLOUD_SDF_GRID_RES,
  maxCloudMeshOpsPerSync: 72,
  maxCatchUpMinutes: 720,
  seed: 0x4b4c4452,
  windSeed: 90210,
  windStepScale: 2.4e-3,
  precipOverlayDecay: 0.92,
  lifecycleMinutesPerFrame: 2.25,
  sizePowerMinMul: 0.2,
  sizePowerMaxMul: 4.5,
  sizePowerExponent: 2.05,
  cloudPrecipHitChance: 0.88,
  cloudPrecipBurstScale: 2.1,
  snowTemperatureThreshold: 0.44,
  wetGroundDecayPerMinute: 0.987,
  wetGroundDecayPerMinuteCold: 0.9972,
  groundFreezeTemperatureThreshold: 0.41,
  snowMeltPerMinuteWhenThawed: 0.991,
  cloudBackfaceCullDot: -0.11,
};

interface ClipInstance {
  id: number;
  /** Index into {@link CloudClipField}'s annual table when set (0 … maxClouds−1). */
  annualSlot: number;
  templateIndex: number;
  birthUtcMinute: number;
  ax: number;
  ay: number;
  az: number;
  spawnTileId: number;
  baseScale: number;
  /** Meteorological wind direction (rad); drift uses downwind = this + π in local east/north frame. */
  birthWindDirectionRad: number;
  birthWindStrength: number;
}

const _anchor = new THREE.Vector3();
const _renderAnchor = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _blow = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _camWorld = new THREE.Vector3();

function sampleSizePowerMul(h: number, cfg: CloudClipFieldConfig): number {
  const u = Math.max(1e-6, unitFloat(h));
  const w = Math.pow(u, cfg.sizePowerExponent);
  return cfg.sizePowerMinMul * Math.pow(cfg.sizePowerMaxMul / cfg.sizePowerMinMul, w);
}

function sampleBirthWind(
  _globe: Globe,
  inst: ClipInstance,
  subsolarLatDeg: number,
  utcMinute: number,
  cfg: CloudClipFieldConfig
): void {
  _anchor.set(inst.ax, inst.ay, inst.az);
  const latDeg = Math.asin(Math.max(-1, Math.min(1, inst.ay))) * (180 / Math.PI);
  const lonDeg = Math.atan2(inst.ax, inst.az) * (180 / Math.PI);
  const w = windAtLatLonDeg(latDeg, lonDeg, subsolarLatDeg, {
    seed: cfg.windSeed,
    simMinute: utcMinute,
  });
  inst.birthWindDirectionRad = w.directionRad;
  inst.birthWindStrength = Math.max(0.16, Math.min(1, w.strength));
}

function dayOfYearUtc(d: Date): number {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const y0 = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((t - y0) / 86400000);
}

/** Extra spawn acceptance in tropics / summer mid-lats (very coarse). */
function seasonalSpawnBias(latDeg: number, day: number): number {
  const phase = (day / 365.25) * Math.PI * 2;
  let mul = 1;
  if (Math.abs(latDeg) < 28) {
    mul *= 1.08 + 0.12 * Math.sin(phase);
  } else if (latDeg > 32) {
    mul *= 1 + 0.1 * Math.sin(phase - 0.4);
  } else if (latDeg < -32) {
    mul *= 1 + 0.1 * Math.sin(phase + Math.PI - 0.4);
  }
  return Math.max(0.38, mul);
}

function pickSpawnTileId(
  globe: Globe,
  moisture: Map<number, number>,
  salt: number,
  day: number,
  seed: number
): number {
  const tiles = globe.tiles;
  if (tiles.length === 0) return 0;
  for (let attempt = 0; attempt < 64; attempt++) {
    const h = u32Hash([seed, salt, attempt, 0x50494b]);
    const idx = h % tiles.length;
    const tile = tiles[idx]!;
    const m = moisture.get(tile.id) ?? 0;
    const { lat } = tileCenterToLatLon(tile.center);
    const latDeg = (lat * 180) / Math.PI;
    const absLat = Math.abs(latDeg);
    const polar = absLat >= POLAR_LAT;
    const effM = polar ? Math.max(m, 0.12) : m;
    const seasonal = seasonalSpawnBias(latDeg, day);
    const p = Math.min(1, (0.02 + effM * 0.62) * seasonal * (polar ? 1.28 : 1));
    const u = unitFloat(u32Hash([h, attempt, 0x4143]));
    if (u < p) return tile.id;
  }
  return tiles[u32Hash([salt, 0x46414c]) % tiles.length]!.id;
}

function normalizeAnchorFromTile(globe: Globe, tileId: number): THREE.Vector3 | null {
  const p = globe.getTileCenter(tileId);
  if (!p) return null;
  const len = p.length();
  if (len < 1e-8) return null;
  return _anchor.set(p.x / len, p.y / len, p.z / len).clone();
}

function applyCloudPrecipToOverlayAndSurface(
  globe: Globe,
  cfg: CloudClipFieldConfig,
  foot: number,
  framePrecipWeight: number,
  col: number,
  baseScale: number,
  utcMinute: number,
  instId: number,
  frameIndex: number,
  subsolarLatDeg: number,
  precipOverlay: Map<number, number>,
  surface: TileSurfaceState
): void {
  if (cfg.waterTileIds?.has(foot)) return;
  const gate = unitFloat(
    u32Hash([cfg.seed, foot, utcMinute, instId, frameIndex, 0x504e47])
  );
  if (gate >= cfg.cloudPrecipHitChance) return;
  const burst =
    cfg.cloudPrecipBurstScale *
    framePrecipWeight *
    (0.35 + 0.65 * Math.min(1, col + 0.2)) *
    baseScale *
    42;
  const cur = precipOverlay.get(foot) ?? 0;
  precipOverlay.set(foot, Math.min(1, cur + burst * 0.018));

  const tc = globe.getTileCenter(foot);
  if (!tc) return;
  const { lat } = tileCenterToLatLon(tc);
  const latDeg = (lat * 180) / Math.PI;
  const terrain = cfg.getTerrainTypeForTile?.(foot);
  const monthly = cfg.getMonthlyMeanTempCForTile?.(foot);
  const cal = new Date(utcMinute * 60000);
  const temp = getTileTemperature01(
    latDeg,
    subsolarLatDeg,
    terrain,
    monthly,
    cal
  );
  const asSnow = temp < cfg.snowTemperatureThreshold;
  surface.addPrecip(foot, burst * 0.015, asSnow);
}

function groundClimateParamsFromCfg(
  cfg: CloudClipFieldConfig
): GroundSurfaceClimateParams {
  return {
    freezeTemperatureThreshold: cfg.groundFreezeTemperatureThreshold,
    wetGroundDecayPerMinute: cfg.wetGroundDecayPerMinute,
    wetGroundDecayPerMinuteCold: cfg.wetGroundDecayPerMinuteCold,
    snowMeltPerMinuteWhenThawed: cfg.snowMeltPerMinuteWhenThawed,
    getTerrainTypeForTile: cfg.getTerrainTypeForTile,
    getMonthlyMeanTempCForTile: cfg.getMonthlyMeanTempCForTile,
  };
}

function subsolarLatForClimateMinute(
  cfg: CloudClipFieldConfig,
  utcMinute: number,
  getPrecipSubsolar: PrecipSubsolarForMinute
): number {
  return (
    cfg.getSubsolarLatDegForUtcMinute?.(utcMinute) ??
    getPrecipSubsolar(utcMinute).subsolarLatDeg
  );
}

/** Move along birth-wind downwind in the tangent plane; `deltaMinutes` may be fractional. */
function advectInstanceFixed(
  globe: Globe,
  inst: ClipInstance,
  deltaMinutes: number,
  cfg: CloudClipFieldConfig
): void {
  if (deltaMinutes <= 0) return;
  _anchor.set(inst.ax, inst.ay, inst.az);
  const up = _anchor;
  _east.copy(_worldUp).cross(up);
  if (_east.lengthSq() < 1e-10) _east.set(1, 0, 0).cross(up);
  _east.normalize();
  _north.copy(up).cross(_east).normalize();

  const blow = inst.birthWindDirectionRad + Math.PI;
  _blow
    .copy(_east)
    .multiplyScalar(Math.cos(blow))
    .addScaledVector(_north, Math.sin(blow))
    .normalize();

  const R = globe.radius;
  const step = cfg.windStepScale * R * inst.birthWindStrength * deltaMinutes;
  _anchor.addScaledVector(_blow, step).normalize();
  inst.ax = _anchor.x;
  inst.ay = _anchor.y;
  inst.az = _anchor.z;
}

function extrapolateRenderAnchor(
  globe: Globe,
  inst: ClipInstance,
  extraMinutes: number,
  cfg: CloudClipFieldConfig,
  out: THREE.Vector3
): void {
  if (extraMinutes <= 1e-9) {
    out.set(inst.ax, inst.ay, inst.az);
    return;
  }
  _anchor.set(inst.ax, inst.ay, inst.az);
  const up = _anchor;
  _east.copy(_worldUp).cross(up);
  if (_east.lengthSq() < 1e-10) _east.set(1, 0, 0).cross(up);
  _east.normalize();
  _north.copy(up).cross(_east).normalize();
  const blow = inst.birthWindDirectionRad + Math.PI;
  _blow
    .copy(_east)
    .multiplyScalar(Math.cos(blow))
    .addScaledVector(_north, Math.sin(blow))
    .normalize();
  const R = globe.radius;
  const step = cfg.windStepScale * R * inst.birthWindStrength * extraMinutes;
  _anchor.addScaledVector(_blow, step).normalize();
  out.copy(_anchor);
}

/** One row per calendar day (365 entries, non-leap reference year) for a fixed cloud slot. */
export interface AnnualSpawnSpec {
  spawnTileId: number;
  templateIndex: number;
  baseScale: number;
  birthWindDirectionRad: number;
  birthWindStrength: number;
  /** Template frame index at spawn (0 … template length − 1). */
  lifecyclePhase: number;
}

export function annualSpawnDayIndex(dayOfYear: number): number {
  const d = Math.min(365, Math.max(1, dayOfYear));
  return d - 1;
}

/**
 * Calendar year and annual-table column from one UTC instant (`utcSimMinute`). Both values come
 * from the same {@link Date}, so around 1 Jan you never pair day 365 with the next year (or vice
 * versa), including when `initToMinute`’s `date` disagrees slightly from `targetUtc`.
 */
function utcMinuteToAnnualContext(utcSimMinute: number): {
  calendarYear: number;
  dayOfYear: number;
  dayIndex: number;
} {
  const d = new Date(utcSimMinute * 60000);
  const dayOfYear = dayOfYearUtc(d);
  return {
    calendarYear: d.getUTCFullYear(),
    dayOfYear,
    dayIndex: annualSpawnDayIndex(dayOfYear),
  };
}

/** Per-year + per-slot shift of template family and overall size (table stores a neutral baseline). */
function modulateAnnualSpecForCalendarYear(
  spec: AnnualSpawnSpec,
  cfg: CloudClipFieldConfig,
  calendarYear: number,
  slot: number
): AnnualSpawnSpec {
  const templateRot =
    u32Hash([cfg.seed, calendarYear, slot, 0x595254]) % CLIP_TEMPLATES.length;
  const yearSizeMul =
    0.86 + unitFloat(u32Hash([cfg.seed, calendarYear, slot, 0x595332])) * 0.26;
  return {
    ...spec,
    templateIndex: (spec.templateIndex + templateRot) % CLIP_TEMPLATES.length,
    baseScale: spec.baseScale * yearSizeMul,
  };
}

function applyAnnualSpawnSpec(
  globe: Globe,
  inst: ClipInstance,
  spec: AnnualSpawnSpec,
  targetUtc: number,
  cfg: CloudClipFieldConfig
): boolean {
  const anchor = normalizeAnchorFromTile(globe, spec.spawnTileId);
  if (!anchor) return false;
  inst.ax = anchor.x;
  inst.ay = anchor.y;
  inst.az = anchor.z;
  inst.spawnTileId = spec.spawnTileId;
  inst.templateIndex = spec.templateIndex % CLIP_TEMPLATES.length;
  inst.baseScale = spec.baseScale;
  inst.birthWindDirectionRad = spec.birthWindDirectionRad;
  inst.birthWindStrength = spec.birthWindStrength;
  const tpl = CLIP_TEMPLATES[inst.templateIndex]!;
  const dur = tpl.frames.length;
  const minPer = cfg.lifecycleMinutesPerFrame;
  const phase = Math.max(0, Math.min(dur - 1, spec.lifecyclePhase));
  inst.birthUtcMinute = targetUtc - phase * minPer;
  return true;
}

/**
 * Precompute spawn parameters at **UTC noon** each day of a non-leap reference year (2023).
 * Use {@link annualSpawnDayIndex} with the runtime day-of-year to index each row.
 * At runtime, {@link CloudClipField} applies deterministic per-calendar-year template rotation and
 * size scaling (from the same UTC minute as the day index) so seasons repeat while years differ.
 * `maxSlots` should match `min(config.maxClouds, globe.tiles.length)` used in {@link CloudClipField.initToMinute}.
 *
 * **Ground wetness/snow** are not stored in this table; {@link TileSurfaceState} persists in memory across
 * 1 Jan and is only cleared on field re-init or dispose.
 */
export function buildAnnualCloudSpawnTable(
  globe: Globe,
  moisture: Map<number, number>,
  cfg: CloudClipFieldConfig,
  maxSlots: number,
  getSubsolarLatDegForUtcMinute: (utcMinute: number) => number
): AnnualSpawnSpec[][] {
  const REF_YEAR = 2023;
  const baseNoonMin = Math.floor(Date.UTC(REF_YEAR, 0, 1, 12, 0, 0) / 60000);
  const n = Math.max(0, Math.min(maxSlots, globe.tiles.length));
  const rows: AnnualSpawnSpec[][] = [];
  for (let slot = 0; slot < n; slot++) {
    const perDay: AnnualSpawnSpec[] = [];
    for (let doy = 1; doy <= 365; doy++) {
      const utcMin = baseNoonMin + (doy - 1) * 1440;
      const sub = getSubsolarLatDegForUtcMinute(utcMin);
      const saltSpawn = u32Hash([cfg.seed, slot, doy, 0x50494b]);
      const tid = pickSpawnTileId(globe, moisture, saltSpawn, doy, cfg.seed);
      const tplIdx = u32Hash([cfg.seed, slot, doy, 0x54504c]) % CLIP_TEMPLATES.length;
      const tpl = CLIP_TEMPLATES[tplIdx]!;
      const dur = tpl.frames.length;
      const h = u32Hash([cfg.seed, utcMin, tid, slot]);
      const phase = h % dur;
      const sizeMul = sampleSizePowerMul(u32Hash([h, 0x53495a]), cfg);
      const m0 = moisture.get(tid) ?? 0;
      const baseScale =
        cfg.cloudScale *
        sizeMul *
        (0.78 + unitFloat(u32Hash([h, 1])) * 0.44) *
        (0.82 + Math.min(1, m0) * 0.38);

      const anchor = normalizeAnchorFromTile(globe, tid);
      const stub: ClipInstance = {
        id: 0,
        annualSlot: slot,
        templateIndex: tplIdx,
        birthUtcMinute: 0,
        ax: anchor?.x ?? 0,
        ay: anchor?.y ?? 1,
        az: anchor?.z ?? 0,
        spawnTileId: tid,
        baseScale,
        birthWindDirectionRad: 0,
        birthWindStrength: 0.5,
      };
      if (anchor) {
        sampleBirthWind(globe, stub, sub, utcMin, cfg);
      }
      perDay.push({
        spawnTileId: tid,
        templateIndex: tplIdx,
        baseScale,
        birthWindDirectionRad: stub.birthWindDirectionRad,
        birthWindStrength: stub.birthWindStrength,
        lifecyclePhase: phase,
      });
    }
    rows.push(perDay);
  }
  return rows;
}

/**
 * Climatological cloud-precip **potential** per tile per day-of-year (365), summed from annual spawn
 * specs (peak lifecycle precip × scale). Use for diagnostics, seeding, or UI; runtime sim uses
 * {@link CloudClipField}'s overlay + {@link TileSurfaceState}.
 * Compare to seasonal×Köppen targets: `analyzePrecipClimatologyGap` (`cloudPrecipDiagnostics.js`).
 */
export function buildAnnualPrecipClimatology(
  annualTable: AnnualSpawnSpec[][]
): Map<number, Float32Array> {
  const byTile = new Map<number, Float32Array>();
  const nSlot = annualTable.length;
  if (nSlot === 0) return byTile;
  for (let doy = 1; doy <= 365; doy++) {
    const di = doy - 1;
    for (let s = 0; s < nSlot; s++) {
      const spec = annualTable[s]![di]!;
      const tpl = CLIP_TEMPLATES[spec.templateIndex % CLIP_TEMPLATES.length]!;
      let peak = 0;
      for (const fr of tpl.frames) {
        if (fr.precipWeight > peak) peak = fr.precipWeight;
      }
      const tid = spec.spawnTileId;
      let acc = byTile.get(tid);
      if (!acc) {
        acc = new Float32Array(365);
        byTile.set(tid, acc);
      }
      acc[di] += peak * (0.06 + spec.baseScale * 2.4);
    }
  }
  return byTile;
}

export class CloudClipField {
  readonly config: CloudClipFieldConfig;
  private instances: ClipInstance[] = [];
  private nextId = 1;
  private precipOverlay = new Map<number, number>();
  private tileSurface = new TileSurfaceState();
  private meshScratch = new Map<number, THREE.Group>();
  /** Reused in {@link CloudClipField.syncThreeGroup} to avoid per-frame Set allocation. */
  private readonly _syncSeenInstanceIds = new Set<number>();
  private lastPhysicsMinute = 0;
  private annualSpawnTable: AnnualSpawnSpec[][] | null = null;

  constructor(config: Partial<CloudClipFieldConfig> = {}) {
    this.config = { ...DEFAULT_CLIP_CONFIG, ...config };
  }

  /**
   * When set (365 days × slot rows, built e.g. by {@link buildAnnualCloudSpawnTable}), init and
   * respawns use stored spawn tile, template, scale, wind, and lifecycle phase instead of sampling.
   */
  setAnnualSpawnTable(table: AnnualSpawnSpec[][] | null): void {
    this.annualSpawnTable = table;
  }

  private annualSpawnTableValidForSlots(slots: number): boolean {
    const t = this.annualSpawnTable;
    return (
      t !== null &&
      t.length >= slots &&
      t[0] !== undefined &&
      t[0].length === 365
    );
  }

  private canUseAnnualForInstance(inst: ClipInstance): boolean {
    const t = this.annualSpawnTable;
    if (!t || inst.annualSlot < 0 || inst.annualSlot >= t.length) return false;
    const row = t[inst.annualSlot];
    return row !== undefined && row.length === 365;
  }

  getPrecipOverlayMap(): Map<number, number> {
    return this.precipOverlay;
  }

  /** Wet ground + snow cover from recent cloud precip (decays each sim minute). */
  getTileSurfaceState(): TileSurfaceState {
    return this.tileSurface;
  }

  /**
   * Full reset + spawn + wind catch-up to `targetUtc` (call on globe rebuild).
   * Seasonal spawn / annual column / year modulation use the **UTC calendar day of `targetUtc`**, not `_date`,
   * so they stay aligned across year boundaries.
   */
  initToMinute(
    globe: Globe,
    targetUtc: number,
    moisture: Map<number, number>,
    _date: Date,
    getPrecipSubsolar: PrecipSubsolarForMinute
  ): void {
    this.disposeMeshes();
    this.instances = [];
    this.precipOverlay.clear();
    this.tileSurface.clear();
    this.nextId = 1;

    const cfg = this.config;
    const maxC = Math.min(cfg.maxClouds, globe.tiles.length);
    const simCtx = utcMinuteToAnnualContext(targetUtc);
    const dayIdx = simCtx.dayIndex;
    const simDay = simCtx.dayOfYear;
    const useAnnual = this.annualSpawnTableValidForSlots(maxC);

    const sub0 = getPrecipSubsolar(targetUtc).subsolarLatDeg;
    for (let i = 0; i < maxC; i++) {
      if (useAnnual) {
        const baseSpec = this.annualSpawnTable![i]![dayIdx]!;
        const spec = modulateAnnualSpecForCalendarYear(
          baseSpec,
          cfg,
          simCtx.calendarYear,
          i
        );
        const inst: ClipInstance = {
          id: this.nextId++,
          annualSlot: i,
          templateIndex: spec.templateIndex,
          birthUtcMinute: 0,
          ax: 0,
          ay: 0,
          az: 0,
          spawnTileId: spec.spawnTileId,
          baseScale: spec.baseScale,
          birthWindDirectionRad: spec.birthWindDirectionRad,
          birthWindStrength: spec.birthWindStrength,
        };
        if (!applyAnnualSpawnSpec(globe, inst, spec, targetUtc, cfg)) continue;
        this.instances.push(inst);
        continue;
      }

      const tid = pickSpawnTileId(
        globe,
        moisture,
        u32Hash([cfg.seed, targetUtc, i]),
        simDay,
        cfg.seed
      );
      const anchor = normalizeAnchorFromTile(globe, tid);
      if (!anchor) continue;

      const tplIdx = u32Hash([cfg.seed, i, 0x54504c]) % CLIP_TEMPLATES.length;
      const tpl = CLIP_TEMPLATES[tplIdx]!;
      const dur = tpl.frames.length;
      const h = u32Hash([cfg.seed, targetUtc, tid, i]);
      const lifeSpanMin = Math.max(dur * cfg.lifecycleMinutesPerFrame, dur);
      const birth = targetUtc - (h % Math.max(1, Math.ceil(lifeSpanMin)));
      const m0 = moisture.get(tid) ?? 0;
      const sizeMul = sampleSizePowerMul(u32Hash([h, 0x53495a]), cfg);
      const baseScale =
        cfg.cloudScale *
        sizeMul *
        (0.78 + unitFloat(u32Hash([h, 1])) * 0.44) *
        (0.82 + Math.min(1, m0) * 0.38);

      const inst: ClipInstance = {
        id: this.nextId++,
        annualSlot: i,
        templateIndex: tplIdx,
        birthUtcMinute: birth,
        ax: anchor.x,
        ay: anchor.y,
        az: anchor.z,
        spawnTileId: tid,
        baseScale,
        birthWindDirectionRad: 0,
        birthWindStrength: 0.5,
      };
      sampleBirthWind(globe, inst, sub0, targetUtc, cfg);
      this.instances.push(inst);
    }

    for (const inst of this.instances) {
      for (let m = inst.birthUtcMinute; m < targetUtc; m++) {
        advectInstanceFixed(globe, inst, 1, cfg);
      }
    }

    this.lastPhysicsMinute = targetUtc;
  }

  /**
   * Advance overlay + positions to `targetUtc` (cheap vs full replay).
   * If the gap exceeds `maxCatchUpMinutes`, re-initializes when `moisture` and `nowDate` are passed.
   */
  syncToTargetMinute(
    targetUtc: number,
    globe: Globe,
    getPrecipSubsolar: PrecipSubsolarForMinute,
    reinit?: { moisture: Map<number, number>; nowDate: Date }
  ): void {
    if (targetUtc < this.lastPhysicsMinute) {
      return;
    }
    if (targetUtc === this.lastPhysicsMinute) {
      return;
    }
    if (targetUtc - this.lastPhysicsMinute > this.config.maxCatchUpMinutes) {
      if (reinit) {
        this.initToMinute(
          globe,
          targetUtc,
          reinit.moisture,
          reinit.nowDate,
          getPrecipSubsolar
        );
      }
      return;
    }

    const endCtx = utcMinuteToAnnualContext(targetUtc);
    const day = endCtx.dayOfYear;
    const cfg = this.config;
    const gClimate = groundClimateParamsFromCfg(cfg);
    const minPer = cfg.lifecycleMinutesPerFrame;
    const delta = targetUtc - this.lastPhysicsMinute;

    if (delta > 1) {
      const decayPow = Math.pow(cfg.precipOverlayDecay, delta);
      for (const [tid, v] of this.precipOverlay) {
        const nv = v * decayPow;
        if (nv < 0.02) this.precipOverlay.delete(tid);
        else this.precipOverlay.set(tid, nv);
      }
      for (let u = this.lastPhysicsMinute + 1; u <= targetUtc; u++) {
        this.tileSurface.stepClimateMinute(
          globe,
          subsolarLatForClimateMinute(cfg, u, getPrecipSubsolar),
          gClimate,
          u
        );
      }

      const { precipByTile, subsolarLatDeg } = getPrecipSubsolar(targetUtc);
      for (const inst of this.instances) {
        advectInstanceFixed(globe, inst, delta, cfg);

        let tpl = CLIP_TEMPLATES[inst.templateIndex]!;
        let dur = tpl.frames.length;
        let useAnnualRespawn = this.canUseAnnualForInstance(inst);
        while (Math.floor((targetUtc - inst.birthUtcMinute) / minPer) >= dur) {
          if (useAnnualRespawn) {
            const baseSpec = this.annualSpawnTable![inst.annualSlot]![endCtx.dayIndex]!;
            const spec = modulateAnnualSpecForCalendarYear(
              baseSpec,
              cfg,
              endCtx.calendarYear,
              inst.annualSlot
            );
            if (applyAnnualSpawnSpec(globe, inst, spec, targetUtc, cfg)) {
              useAnnualRespawn = false;
              tpl = CLIP_TEMPLATES[inst.templateIndex]!;
              dur = tpl.frames.length;
              continue;
            }
            useAnnualRespawn = false;
          }
          const newTid = pickSpawnTileId(
            globe,
            precipByTile,
            u32Hash([cfg.seed, inst.id, targetUtc, 0x525350]),
            day,
            cfg.seed
          );
          const na = normalizeAnchorFromTile(globe, newTid);
          if (!na) {
            inst.birthUtcMinute = targetUtc - (dur - 1) * minPer;
            break;
          }
          inst.ax = na.x;
          inst.ay = na.y;
          inst.az = na.z;
          inst.spawnTileId = newTid;
          const phase = u32Hash([cfg.seed, inst.id, targetUtc, 0x5048]) % dur;
          inst.birthUtcMinute = targetUtc - phase * minPer;
          inst.templateIndex =
            (inst.templateIndex + 1 + (u32Hash([targetUtc, inst.id]) % 3)) %
            CLIP_TEMPLATES.length;
          const pm = precipByTile.get(newTid) ?? 0;
          const sizeMul = sampleSizePowerMul(u32Hash([targetUtc, inst.id, 0x53495a]), cfg);
          inst.baseScale =
            cfg.cloudScale *
            sizeMul *
            (0.78 + unitFloat(u32Hash([targetUtc, inst.id, 2])) * 0.44) *
            (0.82 + Math.min(1, pm) * 0.38);
          sampleBirthWind(globe, inst, subsolarLatDeg, targetUtc, cfg);
          tpl = CLIP_TEMPLATES[inst.templateIndex]!;
          dur = tpl.frames.length;
        }

        const ageFrames = Math.floor((targetUtc - inst.birthUtcMinute) / minPer);
        const fi = Math.max(0, Math.min(dur - 1, ageFrames));
        const frame = tpl.frames[fi]!;
        if (frame.precipWeight > 0.008) {
          _anchor.set(inst.ax, inst.ay, inst.az);
          const under = globe.getTileIdAtDirection(_anchor);
          const foot = under > 0 ? under : inst.spawnTileId;
          const col = precipByTile.get(foot) ?? 0;
          applyCloudPrecipToOverlayAndSurface(
            globe,
            cfg,
            foot,
            frame.precipWeight,
            col,
            inst.baseScale,
            targetUtc,
            inst.id,
            fi,
            subsolarLatDeg,
            this.precipOverlay,
            this.tileSurface
          );
        }
      }
    } else {
      for (let m = this.lastPhysicsMinute; m < targetUtc; m++) {
        const { precipByTile, subsolarLatDeg } = getPrecipSubsolar(m);

        for (const [tid, v] of this.precipOverlay) {
          const nv = v * cfg.precipOverlayDecay;
          if (nv < 0.02) this.precipOverlay.delete(tid);
          else this.precipOverlay.set(tid, nv);
        }
        this.tileSurface.stepClimateMinute(
          globe,
          subsolarLatForClimateMinute(cfg, m + 1, getPrecipSubsolar),
          gClimate,
          m + 1
        );

        for (const inst of this.instances) {
          advectInstanceFixed(globe, inst, 1, cfg);

          let tpl = CLIP_TEMPLATES[inst.templateIndex]!;
          let dur = tpl.frames.length;
          let ageFrames = Math.floor((m + 1 - inst.birthUtcMinute) / minPer);
          if (ageFrames >= dur) {
            const respawnCtx = utcMinuteToAnnualContext(m + 1);
            let respawned = false;
            if (this.canUseAnnualForInstance(inst)) {
              const baseSpec =
                this.annualSpawnTable![inst.annualSlot]![respawnCtx.dayIndex]!;
              const spec = modulateAnnualSpecForCalendarYear(
                baseSpec,
                cfg,
                respawnCtx.calendarYear,
                inst.annualSlot
              );
              respawned = applyAnnualSpawnSpec(globe, inst, spec, m + 1, cfg);
            }
            if (!respawned) {
              const newTid = pickSpawnTileId(
                globe,
                precipByTile,
                u32Hash([cfg.seed, inst.id, m, 0x525350]),
                respawnCtx.dayOfYear,
                cfg.seed
              );
              const na = normalizeAnchorFromTile(globe, newTid);
              if (na) {
                inst.ax = na.x;
                inst.ay = na.y;
                inst.az = na.z;
                inst.spawnTileId = newTid;
                inst.birthUtcMinute = m + 1;
                inst.templateIndex =
                  (inst.templateIndex + 1 + (u32Hash([m, inst.id]) % 3)) %
                  CLIP_TEMPLATES.length;
                const pm = precipByTile.get(newTid) ?? 0;
                const sizeMul = sampleSizePowerMul(u32Hash([m, inst.id, 0x53495a]), cfg);
                inst.baseScale =
                  cfg.cloudScale *
                  sizeMul *
                  (0.78 + unitFloat(u32Hash([m, inst.id, 2])) * 0.44) *
                  (0.82 + Math.min(1, pm) * 0.38);
                sampleBirthWind(globe, inst, subsolarLatDeg, m + 1, cfg);
              }
            }
            tpl = CLIP_TEMPLATES[inst.templateIndex]!;
            dur = tpl.frames.length;
            ageFrames = Math.floor((m + 1 - inst.birthUtcMinute) / minPer);
          }

          const fi = Math.max(0, Math.min(dur - 1, ageFrames));
          const frame = tpl.frames[fi]!;
          if (frame.precipWeight > 0.008) {
            _anchor.set(inst.ax, inst.ay, inst.az);
            const under = globe.getTileIdAtDirection(_anchor);
            const foot = under > 0 ? under : inst.spawnTileId;
            const col = precipByTile.get(foot) ?? 0;
            applyCloudPrecipToOverlayAndSurface(
              globe,
              cfg,
              foot,
              frame.precipWeight,
              col,
              inst.baseScale,
              m + 1,
              inst.id,
              fi,
              subsolarLatDeg,
              this.precipOverlay,
              this.tileSurface
            );
          }
        }
      }
    }

    this.tileSurface.revision++;
    this.lastPhysicsMinute = targetUtc;
  }

  /**
   * Sync Three.js groups. Pass **fractional** `utcMinuteVisual` (e.g. `Date.now()/60000`) for smooth
   * lifecycle lerping and sub-minute wind extrapolation past `lastPhysicsMinute`.
   * Optional `camera` enables back-face culling (see {@link CloudClipFieldConfig.cloudBackfaceCullDot}).
   * Optional `sunDirectionTowardSun` (unit, planet center → sun) enables {@link CloudClipFieldConfig.cloudHemisphereShading}.
   */
  syncThreeGroup(
    root: THREE.Group,
    globe: Globe,
    utcMinuteVisual: number,
    camera?: THREE.Camera,
    sunDirectionTowardSun?: THREE.Vector3
  ): void {
    const cfg = this.config;
    const heightOff = 0.04;
    const seen = this._syncSeenInstanceIds;
    seen.clear();
    const minPer = cfg.lifecycleMinutesPerFrame;

    for (const inst of this.instances) {
      seen.add(inst.id);
    }

    let meshOpsLeft = Math.max(1, Math.floor(cfg.maxCloudMeshOpsPerSync));
    const extraMin = Math.max(0, utcMinuteVisual - this.lastPhysicsMinute);
    const cullDot = cfg.cloudBackfaceCullDot;
    const doCull = camera != null && cullDot != null;
    if (doCull) {
      camera!.getWorldPosition(_camWorld);
      if (_camWorld.lengthSq() < 1e-16) {
        _camWorld.set(0, 0, 1);
      } else {
        _camWorld.normalize();
      }
    }

    for (const inst of this.instances) {
      const tpl = CLIP_TEMPLATES[inst.templateIndex]!;
      const dur = tpl.frames.length;
      const lifeSpanMin = Math.max(dur * minPer, 1e-6);
      let ageMin = utcMinuteVisual - inst.birthUtcMinute;
      ageMin = ((ageMin % lifeSpanMin) + lifeSpanMin) % lifeSpanMin;
      const frameFloat = ageMin / minPer;
      const i0 = Math.min(dur - 1, Math.floor(frameFloat));
      const i1 = (i0 + 1) % dur;
      const t = frameFloat - Math.floor(frameFloat);
      const f0 = tpl.frames[i0]!;
      const f1 = tpl.frames[i1]!;
      const scaleMul = f0.scaleMul * (1 - t) + f1.scaleMul * t;
      const opacity = f0.opacity * (1 - t) + f1.opacity * t;
      const meshFrameKey = `${inst.templateIndex}:${i0}:r${cfg.cloudMarchingCubesGrid}`;

      const builtRefScale = inst.baseScale * f0.scaleMul;
      const displayScale = inst.baseScale * scaleMul;

      let grp = this.meshScratch.get(inst.id);
      const needNewMesh =
        !grp || (grp.userData.clipMeshKey as string | undefined) !== meshFrameKey;

      if (!grp) {
        if (meshOpsLeft <= 0) {
          continue;
        }
        meshOpsLeft--;
        const spec: SimCloudVisualSpec = {
          anchor: new THREE.Vector3(inst.ax, inst.ay, inst.az),
          scale: builtRefScale,
          meshSeed: f0.meshSeed,
          flatDeck: f0.flatDeck,
        };
        grp = createLowPolyCloudGroupAtAnchor(globe, spec, {
          opacity: f0.opacity,
          castShadows: cfg.cloudCastShadows,
          clipBottomToGlobe: true,
          heightOffset: heightOff,
          marchingCubesGridRes: cfg.cloudMarchingCubesGrid,
        });
        grp.userData.clipMeshKey = meshFrameKey;
        grp.userData.builtRefScale = builtRefScale;
        grp.scale.setScalar(1);
        delete grp.userData.clipVisScale;
        delete grp.userData.clipVisOp;
        delete grp.userData.clipAx;
        delete grp.userData.clipAy;
        delete grp.userData.clipAz;
        delete grp.userData.clipHemiDot;
        grp.userData.clipInstanceId = inst.id;
        this.meshScratch.set(inst.id, grp);
      } else if (needNewMesh) {
        if (meshOpsLeft <= 0) {
          // skip rebuild this frame; budget picks up next frame
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
            anchor: new THREE.Vector3(inst.ax, inst.ay, inst.az),
            scale: builtRefScale,
            meshSeed: f0.meshSeed,
            flatDeck: f0.flatDeck,
          };
          const fresh = createLowPolyCloudGroupAtAnchor(globe, spec, {
            opacity: f0.opacity,
            castShadows: cfg.cloudCastShadows,
            clipBottomToGlobe: true,
            heightOffset: heightOff,
            marchingCubesGridRes: cfg.cloudMarchingCubesGrid,
          });
          for (const ch of fresh.children) grp.add(ch);
          fresh.traverse((ch) => {
            if (ch instanceof THREE.Mesh) {
              ch.geometry.dispose();
              if (ch.material instanceof THREE.Material) ch.material.dispose();
            }
          });
          grp.userData.clipMeshKey = meshFrameKey;
          grp.userData.builtRefScale = builtRefScale;
          grp.scale.setScalar(1);
          delete grp.userData.clipVisScale;
          delete grp.userData.clipVisOp;
          delete grp.userData.clipAx;
          delete grp.userData.clipAy;
          delete grp.userData.clipAz;
          delete grp.userData.clipHemiDot;
          grp.userData.clipInstanceId = inst.id;
        }
      }

      grp = this.meshScratch.get(inst.id);
      if (!grp) continue;

      const refS = (grp.userData.builtRefScale as number) ?? builtRefScale;
      const ls = grp.userData.clipVisScale as number | undefined;
      const lo = grp.userData.clipVisOp as number | undefined;
      if (
        ls === undefined ||
        lo === undefined ||
        Math.abs(ls - displayScale) > 1e-5 ||
        Math.abs(lo - opacity) > 1.5e-4
      ) {
        updateLowPolyCloudGroupVisualScaleOpacity(grp, refS, displayScale, opacity);
        grp.userData.clipVisScale = displayScale;
        grp.userData.clipVisOp = opacity;
      }

      extrapolateRenderAnchor(globe, inst, extraMin, cfg, _renderAnchor);
      const lax = grp.userData.clipAx as number | undefined;
      const lay = grp.userData.clipAy as number | undefined;
      const laz = grp.userData.clipAz as number | undefined;
      if (
        lax === undefined ||
        lay === undefined ||
        laz === undefined ||
        Math.abs(lax - _renderAnchor.x) +
          Math.abs(lay - _renderAnchor.y) +
          Math.abs(laz - _renderAnchor.z) >
          2e-5
      ) {
        setLowPolyCloudGroupShellPose(globe, grp, _renderAnchor, heightOff);
        grp.userData.clipAx = _renderAnchor.x;
        grp.userData.clipAy = _renderAnchor.y;
        grp.userData.clipAz = _renderAnchor.z;
      }

      if (doCull && cullDot != null) {
        grp.visible = _renderAnchor.dot(_camWorld) > cullDot;
      } else {
        grp.visible = true;
      }

      if (
        cfg.cloudHemisphereShading &&
        sunDirectionTowardSun != null &&
        sunDirectionTowardSun.lengthSq() > 1e-12
      ) {
        const hemiDot = Math.round(
          _renderAnchor.dot(sunDirectionTowardSun) * 400,
        );
        if ((grp.userData.clipHemiDot as number | undefined) !== hemiDot) {
          grp.userData.clipHemiDot = hemiDot;
          updateLowPolyCloudGroupHemisphereShade(
            grp,
            _renderAnchor,
            sunDirectionTowardSun,
          );
        }
      }
    }

    for (const [id, grp] of this.meshScratch) {
      if (!seen.has(id)) {
        if (grp.parent === root) {
          root.remove(grp);
        }
        grp.traverse((ch) => {
          if (ch instanceof THREE.Mesh) {
            ch.geometry.dispose();
            if (ch.material instanceof THREE.Material) ch.material.dispose();
          }
        });
        this.meshScratch.delete(id);
      }
    }

    for (const inst of this.instances) {
      const grp = this.meshScratch.get(inst.id);
      if (!grp) continue;
      grp.userData.clipInstanceId = inst.id;
      if (grp.parent !== root) {
        root.add(grp);
      }
    }
  }

  private disposeMeshes(): void {
    for (const grp of this.meshScratch.values()) {
      grp.traverse((ch) => {
        if (ch instanceof THREE.Mesh) {
          ch.geometry.dispose();
          if (ch.material instanceof THREE.Material) ch.material.dispose();
        }
      });
    }
    this.meshScratch.clear();
  }

  dispose(): void {
    this.disposeMeshes();
    this.instances = [];
    this.precipOverlay.clear();
    this.tileSurface.clear();
    this.annualSpawnTable = null;
  }
}
