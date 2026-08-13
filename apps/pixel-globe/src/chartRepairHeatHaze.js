import { interpolateChartRepairPlan } from "./chartReframe.js";
import { TERRAIN_TRAIT, terrainHasAnyTrait } from "./terrainMetadata.js";

const HEAT_HAZE_FORMATION_DURATION_MS = 18_000;
const HEAT_HAZE_HOLD_DURATION_MS = 24_000;
const HEAT_HAZE_CLEARING_DURATION_MS = 18_000;
const HEAT_HAZE_PERIOD_MS = 14_000;
const HEAT_HAZE_WAVELENGTH_PX = 72;
const HEAT_HAZE_MAX_AMPLITUDE_PX = 2;
const HEAT_HAZE_REPAIR_STRENGTH = 0.42;

export function createChartRepairHeatHaze({ nowMs }) {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Chart repair heat haze has invalid start time: ${nowMs}`);
  }
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: HEAT_HAZE_FORMATION_DURATION_MS +
      HEAT_HAZE_HOLD_DURATION_MS + HEAT_HAZE_CLEARING_DURATION_MS,
    formationDurationMs: HEAT_HAZE_FORMATION_DURATION_MS,
    holdDurationMs: HEAT_HAZE_HOLD_DURATION_MS,
    clearingDurationMs: HEAT_HAZE_CLEARING_DURATION_MS,
    periodMs: HEAT_HAZE_PERIOD_MS,
    wavelengthPx: HEAT_HAZE_WAVELENGTH_PX,
    amplitudePx: HEAT_HAZE_MAX_AMPLITUDE_PX
  });
}

export function chartRepairHeatHazeFrame(haze, nowMs, release = null) {
  if (!haze || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair heat haze frame requires state and time");
  }
  if (release !== null && (
    !Number.isFinite(release.startedAtMs) ||
    !Number.isFinite(release.startStrength) ||
    release.startStrength < 0 ||
    release.startStrength > 1
  )) {
    throw new Error("Chart repair heat haze release requires a valid start time and strength");
  }
  const elapsedMs = Math.max(0, nowMs - haze.startedAtMs);
  const automaticReleaseAtMs = haze.formationDurationMs + haze.holdDurationMs;
  let strength;
  let finished = false;
  if (release) {
    const progress = clamp01((nowMs - release.startedAtMs) / haze.clearingDurationMs);
    strength = release.startStrength * (1 - smoothstep01(progress));
    finished = progress >= 1;
  } else if (elapsedMs <= haze.formationDurationMs) {
    strength = smoothstep01(elapsedMs / haze.formationDurationMs);
  } else if (elapsedMs <= automaticReleaseAtMs) {
    strength = 1;
  } else {
    const progress = clamp01(
      (elapsedMs - automaticReleaseAtMs) / haze.clearingDurationMs
    );
    strength = 1 - smoothstep01(progress);
    finished = progress >= 1;
  }
  return Object.freeze({
    strength,
    phaseRad: elapsedMs / haze.periodMs * Math.PI * 2,
    wavelengthPx: haze.wavelengthPx,
    amplitudePx: haze.amplitudePx,
    repairReady: strength >= HEAT_HAZE_REPAIR_STRENGTH && !finished,
    finished
  });
}

export function chartRepairHeatHazePixelOffset(frame, screenY) {
  if (!frame || !Number.isFinite(screenY)) {
    throw new Error("Chart repair heat haze offset requires a frame and screen row");
  }
  for (const [label, value] of Object.entries({
    strength: frame.strength,
    phaseRad: frame.phaseRad,
    wavelengthPx: frame.wavelengthPx,
    amplitudePx: frame.amplitudePx
  })) {
    if (!Number.isFinite(value)) throw new Error(`Chart repair heat haze has invalid ${label}`);
  }
  return Math.round(
    Math.sin(screenY / frame.wavelengthPx * Math.PI * 2 + frame.phaseRad) *
      frame.amplitudePx * frame.strength
  );
}

export function chartRepairHeatHazeIsPlausible({
  terrainKind,
  latitudeDeg,
  raining,
  snowing,
  stormIntensity
}) {
  if (typeof terrainKind !== "string" || terrainKind.length === 0) {
    throw new Error("Chart repair heat haze requires a terrain kind");
  }
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(stormIntensity)) {
    throw new Error("Chart repair heat haze requires finite climate values");
  }
  if (typeof raining !== "boolean" || typeof snowing !== "boolean") {
    throw new Error("Chart repair heat haze requires explicit precipitation state");
  }
  if (raining || snowing || stormIntensity >= 0.25 || Math.abs(latitudeDeg) > 42) {
    return false;
  }
  return terrainHasAnyTrait(terrainKind, [TERRAIN_TRAIT.DESERT]) || (
    terrainHasAnyTrait(terrainKind, [TERRAIN_TRAIT.STEPPE]) && Math.abs(latitudeDeg) <= 35
  );
}

export function planChartHeatHazeSettlement({
  positions,
  targetsById,
  tileIds,
  screenOffsetY,
  frame,
  maximumStepPx = 1
}) {
  if (!(positions instanceof Map) || !(targetsById instanceof Map) || !(tileIds instanceof Set)) {
    throw new Error("Chart repair heat haze settlement requires maps and a tile set");
  }
  if (!Number.isFinite(screenOffsetY) || !Number.isFinite(maximumStepPx) || maximumStepPx <= 0) {
    throw new Error("Chart repair heat haze settlement requires finite motion bounds");
  }
  if (!frame?.repairReady) return new Map();
  const eligibleTileIds = new Set();
  for (const id of tileIds) {
    const position = positions.get(id);
    const target = targetsById.get(id);
    if (!position || !target) continue;
    if (chartRepairHeatHazePixelOffset(frame, position.y + screenOffsetY) === 0) continue;
    eligibleTileIds.add(id);
  }
  return interpolateChartRepairPlan({
    positions,
    targetsById,
    tileIds: eligibleTileIds,
    maximumStepPx: Math.max(1, Math.floor(maximumStepPx))
  }).nextPositions;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}
