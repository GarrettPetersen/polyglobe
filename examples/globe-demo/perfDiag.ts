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
      "Slice times are main-thread CPU; Three.js line is draw calls + triangles (not real GPU ms). " +
      "Frame line is JSON sorted by cost; _unattributedMs is wall time minus summed slices (browser/GC). " +
      "Vegetation tree logs: ?treeDebug=1. " +
      "Auto-run sim clock after build: ?autoTimeSpeed=3600 (omit or 0 = paused until Play). " +
      "Land wet/snow: GPU data texture; ?landWeatherSample=0.12 stochastic land updates per flush (1 = full). " +
      "Wind/flow/precip: ?hydroField=off skips hydro; focus/sailing recomputes a tile ring only; minute tick skips full wind/river when overlays off (except focus mode); precip overlay updates reuse InstancedMesh (no geometry churn); wall-time coalesce ≥60×.",
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
      addMinuteTickCpuMs: () => {},
      endFrame: () => {},
    };
  }
  return createFramePerfSampler(logEvery);
}

export function createFramePerfSampler(logEvery: number): FramePerfSampler {
  const sums: Record<string, number> = {};
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
      console.log(PERF_LOG, "Three.js render info (last frame before reset)", gpuHint);

      for (const k of Object.keys(sums)) delete sums[k];
      minuteTickCount = 0;
      minuteTickMsSum = 0;
    },
  };
}
