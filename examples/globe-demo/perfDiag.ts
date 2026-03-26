/**
 * Optional CPU/GPU-ish diagnostics for the globe demo.
 *
 * Enable with **`?perf=1`** or **`?diag=1`** on the URL, or
 * `localStorage.setItem("polyglobePerf", "1")` then reload.
 *
 * **CPU:** `performance.now()` slices in the animation loop and coarse build phases.
 * **GPU:** Three.js `renderer.info.render` (draw calls, triangle count for the *last* frame —
 * not wall GPU time; use the browser Performance panel + GPU for real GPU timing).
 */

import type * as THREE from "three";

export const PERF_LOG = "[globe-perf]";

function queryFlagOn(q: URLSearchParams, key: string): boolean {
  if (!q.has(key)) return false;
  const v = (q.get(key) ?? "").toLowerCase().trim();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  /** `?perf`, `?perf=1`, `?perf=true` all enable. */
  return true;
}

export function isPerfDiagEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (queryFlagOn(q, "perf") || queryFlagOn(q, "diag")) return true;
    return window.localStorage?.getItem("polyglobePerf") === "1";
  } catch {
    return false;
  }
}

/** Always log once so users know perf mode exists (does not require ?perf=1). */
export function logPerfDiagUrlHint(): void {
  if (typeof window === "undefined") return;
  console.info(
    PERF_LOG,
    "CPU/GPU-ish timings: add ?perf=1 to the URL and reload (or localStorage polyglobePerf = \"1\"). " +
      "Then filter the console by \"globe-perf\".",
  );
}

export function logPerfDiagHelp(): void {
  if (!isPerfDiagEnabled()) return;
  console.info(
    PERF_LOG,
      "ENABLED — build phases log when the globe finishes building; frame averages every N animation frames. " +
      "If `public/discrete-weather-bake-{subdiv}.bin` loads, the demo skips building 365× annual wind/precip tables (large CPU save). " +
      "Slice times are main-thread CPU; Three.js line is draw calls + triangles (not real GPU ms). " +
      "Frame line is JSON sorted by cost; _unattributedMs is wall time minus summed slices (browser/GC). " +
      "Vegetation GLTF loads after the globe is ready (deferred); perf logs `deferred vegetation GLTF+instancing (ms)` when ?perf=1. Vegetation tree logs: ?treeDebug=1. " +
      "15s sim day: ?dayLengthSec=15 (same as autoTimeSpeed=5760). Coarse cloud/wind quantum: ?cloudTick=60|120 — large values skip most per-frame cloud sync; omit ?cloudCoarseDriftMul for auto 0.5 when tick≥60. Preset ?lowLatencyClouds=1 → 120 min + drift 0.5 + simple ITCZ-only clip precip (override ?simpleClipPrecip=0|1). " +
      "Auto-run sim clock after build: ?autoTimeSpeed=3600 (omit or 0 = paused until Play). " +
      "Land wet/snow: GPU data texture; ?landWeatherSample=0.01 default (stochastic land tiles per flush; 1 = full). ?landWeatherCloudStride=N (default 4 when sampling) throttles dirty from cloud-surface rev bumps. " +
      "Wind/flow/precip: default ?hydroField=game (no global wind/current minute refresh; sample via __polyglobeSampleHydroForTiles). ?hydroField=full for global overlays; focus/sailing = regional ring; off/train = no hydro. `cloudPhysicsCatchUp` = discrete day apply + sync toward quantized `cloudTick` target; with long ticks most frames skip sync when caught up. Spikes: sim-day boundary (applyDiscreteWeatherDayToClipField) and multi-minute catch-up bursts. Frame slices: `windFlowMinuteTick` vs `cloudPhysicsCatchUp`. " +
      "Live precip map refill: default `?clipPrecipHoldMin` (minutes) = max(360, 8×`cloudTick`) capped 1440; subsolar for wind/spawn stays exact per minute. " +
      "Cloud sync sub-slices (avg ms, summed inside catch-up): `cloudPhys_discreteDayApply`, `cloudPhys_overlayDecay`, `cloudPhys_tileSurfaceSteps`, `cloudPhys_precipMapBuild`, `cloudPhys_advect`, `cloudPhys_respawn`, `cloudPhys_cloudPrecipApply`.",
  );
}

/** Sequential build segments: call `mark` between major phases, `finish` in `finally`. */
export function createBuildPerfMarker():
  | { mark: (label: string) => void; finish: () => void }
  | null {
  if (!isPerfDiagEnabled()) return null;
  const t0 = performance.now();
  let last = t0;
  const segments: { label: string; ms: number }[] = [];
  return {
    mark(label: string) {
      const t = performance.now();
      segments.push({ label, ms: t - last });
      last = t;
    },
    finish() {
      const end = performance.now();
      segments.push({ label: "_tail", ms: end - last });
      const total = end - t0;
      const rounded = segments.map((s) => ({
        label: s.label,
        ms: +s.ms.toFixed(1),
      }));
      rounded.sort((a, b) => b.ms - a.ms);
      console.log(
        PERF_LOG,
        "buildWorldAsync CPU (ms)",
        JSON.stringify({ total: +total.toFixed(1), segmentsByCost: rounded }),
      );
    },
  };
}

export interface FramePerfSampler {
  startFrame: () => void;
  slice: (label: string) => void;
  /** Add CPU ms to a slice without advancing the sequential `slice` cursor (for nested timers). */
  addAccumulatedMs: (label: string, ms: number) => void;
  addMinuteTickCpuMs: (ms: number) => void;
  endFrame: (renderer: THREE.WebGLRenderer, frameIndex: number) => void;
}

/**
 * Accumulates per-section CPU time and logs every `logEvery` frames.
 * `addMinuteTickCpuMs` records rare expensive work (wind + cloud sim on UTC minute change).
 */
/** No-op when diagnostics off (zero overhead in hot path). */
export function createFramePerfSamplerOrNoop(logEvery: number): FramePerfSampler {
  if (!isPerfDiagEnabled()) {
    return {
      startFrame: () => {},
      slice: () => {},
      addAccumulatedMs: () => {},
      addMinuteTickCpuMs: () => {},
      endFrame: () => {},
    };
  }
  return createFramePerfSampler(logEvery);
}

/** Nested timers inside `cloudPhysicsCatchUp` — not added to top-level slice sum (avoids double count). */
const CLOUD_PHYS_SUB_PREFIX = "cloudPhys_";

export function createFramePerfSampler(logEvery: number): FramePerfSampler {
  const sums: Record<string, number> = {};
  const cloudPhysSubs: Record<string, number> = {};
  let last = 0;
  let frameT0 = 0;
  let minuteTickCount = 0;
  let minuteTickMsSum = 0;
  let wallAccum = 0;
  let announced = false;

  return {
    startFrame() {
      frameT0 = performance.now();
      last = frameT0;
    },
    slice(label: string) {
      const t = performance.now();
      sums[label] = (sums[label] ?? 0) + (t - last);
      last = t;
    },
    addAccumulatedMs(label: string, ms: number) {
      if (!(ms > 0) || !Number.isFinite(ms)) return;
      if (label.startsWith(CLOUD_PHYS_SUB_PREFIX)) {
        cloudPhysSubs[label] = (cloudPhysSubs[label] ?? 0) + ms;
        return;
      }
      sums[label] = (sums[label] ?? 0) + ms;
    },
    addMinuteTickCpuMs(ms: number) {
      minuteTickCount += 1;
      minuteTickMsSum += ms;
    },
    endFrame(renderer: THREE.WebGLRenderer, frameIndex: number) {
      wallAccum += performance.now() - frameT0;

      if (!announced && frameIndex >= 1) {
        announced = true;
        console.info(
          PERF_LOG,
          `recording… first full report in up to ${logEvery} frames (~${Math.max(1, Math.round(logEvery / 60))}s at 60fps).`,
        );
      }

      if (logEvery <= 1) {
        /* fall through to log every frame */
      } else if (frameIndex % logEvery !== 0) {
        return;
      }

      const n = logEvery <= 1 ? 1 : logEvery;
      const wallAvg = wallAccum / n;
      const avg: Record<string, string> = {
        _frameWallMs: wallAvg.toFixed(2),
      };
      wallAccum = 0;
      let sliceSum = 0;
      for (const k of Object.keys(sums)) {
        const v = sums[k]! / n;
        sliceSum += v;
        avg[k] = v.toFixed(2);
      }
      if (minuteTickCount > 0) {
        avg._minuteTick_events = String(minuteTickCount);
        avg._minuteTick_avgMs = (minuteTickMsSum / minuteTickCount).toFixed(2);
      }
      avg._unattributedMs = Math.max(0, wallAvg - sliceSum).toFixed(2);

      const r = renderer.info.render;
      const mem = renderer.info.memory;
      const gpuHint = {
        calls: r.calls,
        triangles: r.triangles,
        points: r.points,
        lines: r.lines,
        geometries: mem.geometries,
        textures: mem.textures,
      };

      const info = renderer.info as { reset?: () => void };
      info.reset?.();

      const sorted = Object.entries(avg).sort(
        (a, b) => parseFloat(b[1]) - parseFloat(a[1]),
      );
      console.log(
        PERF_LOG,
        `frame CPU avg ms (last ${n} frames, sorted high→low)`,
        JSON.stringify(Object.fromEntries(sorted)),
      );

      const subKeys = Object.keys(cloudPhysSubs);
      if (subKeys.length > 0) {
        const subAvg: Record<string, string> = {};
        for (const k of subKeys) {
          subAvg[k] = (cloudPhysSubs[k]! / n).toFixed(2);
        }
        const subSorted = Object.entries(subAvg).sort(
          (a, b) => parseFloat(b[1]) - parseFloat(a[1]),
        );
        console.log(
          PERF_LOG,
          `cloud physics sub-avg ms (inside cloudPhysicsCatchUp, last ${n} frames)`,
          JSON.stringify(Object.fromEntries(subSorted)),
        );
        for (const k of subKeys) delete cloudPhysSubs[k];
      }

      console.log(PERF_LOG, "Three.js render info (last frame before reset)", gpuHint);

      for (const k of Object.keys(sums)) delete sums[k];
      minuteTickCount = 0;
      minuteTickMsSum = 0;
    },
  };
}
