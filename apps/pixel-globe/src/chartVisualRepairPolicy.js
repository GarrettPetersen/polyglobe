import {
  CHART_CLOUD_REPAIR_MAX_DISTORTION_PX,
  CHART_CLOUD_REPAIR_RMS_PX,
  CHART_CLOUD_REPAIR_ROTATION_DEG,
  CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX
} from "./chartVisualFault.js";

export const CHART_REPAIR_CLOSING_FOG_TEAR_PX = 32;
export const CHART_WEATHER_REPAIR_CONFIRMATION_MS = 10_000;
export const CHART_SEVERE_REPAIR_CONFIRMATION_MS = 3_000;
export const CHART_IMMEDIATE_REPAIR_FAULT_PX = 32;

export function chartVisualRepairMayEnterCooldown({ pendingTileRepairs, faultRemains }) {
  if (typeof pendingTileRepairs !== "boolean" || typeof faultRemains !== "boolean") {
    throw new Error("Chart repair cooldown requires explicit repair state");
  }
  return !pendingTileRepairs && !faultRemains;
}

export function chooseChartVisualRepair({
  drift,
  terrainTear,
  distortionPoint,
  viewportWidth,
  viewportHeight,
  swellRepairAvailable,
  distortionSurface,
  polarFogCoversFault = false,
  heatHazeAvailable = false
}) {
  if (!drift || !terrainTear || !distortionPoint) {
    throw new Error("Chart visual repair policy requires drift, tear, and distortion metrics");
  }
  for (const [label, value] of Object.entries({
    distortionX: distortionPoint.x,
    distortionY: distortionPoint.y,
    viewportWidth,
    viewportHeight
  })) {
    if (!Number.isFinite(value) || (label.startsWith("viewport") && value <= 0)) {
      throw new Error(`Chart visual repair policy has invalid ${label}: ${value}`);
    }
  }
  if (typeof swellRepairAvailable !== "boolean") {
    throw new Error("Chart visual repair policy requires an explicit swell-repair state");
  }
  if (typeof heatHazeAvailable !== "boolean") {
    throw new Error("Chart visual repair policy requires an explicit heat-haze state");
  }
  if (![null, "water", "land", "coast"].includes(distortionSurface)) {
    throw new Error(`Chart visual repair policy has invalid distortion surface: ${distortionSurface}`);
  }

  if (swellRepairAvailable) return Object.freeze({ kind: "none" });

  const tear = terrainTear.extraPx >= CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX;
  const rotation = Math.abs(drift.rotationDeg) >= CHART_CLOUD_REPAIR_ROTATION_DEG;
  const distortion = drift.rmsDistortionPx >= CHART_CLOUD_REPAIR_RMS_PX ||
    drift.maxDistortionPx >= CHART_CLOUD_REPAIR_MAX_DISTORTION_PX;
  if (!tear && !rotation && !distortion) return Object.freeze({ kind: "none" });

  const fault = tear
    ? {
        x: terrainTear.screenX,
        y: terrainTear.screenY,
        sizePx: terrainTear.extraPx,
        surface: terrainTear.surface
      }
    : {
        x: distortionPoint.x,
        y: distortionPoint.y,
        sizePx: drift.maxDistortionPx,
        surface: distortionSurface
      };
  const frameWide = !tear;
  const confirmationMs = fault.sizePx >= CHART_IMMEDIATE_REPAIR_FAULT_PX
    ? 0
    : frameWide || fault.sizePx >= CHART_CLOUD_REPAIR_MAX_DISTORTION_PX
    ? CHART_SEVERE_REPAIR_CONFIRMATION_MS
    : CHART_WEATHER_REPAIR_CONFIRMATION_MS;

  // Open water is corrected by the swell presentation. Protected waterways
  // can still need weather cover when the swell solver explicitly declined
  // the fault.
  if (fault.surface === null) {
    return Object.freeze({ kind: "none" });
  }

  if (polarFogCoversFault) {
    return chartVisualRepairCandidate("polar-fog", fault, { frameWide, confirmationMs: 0 });
  }
  // Rotation is a frame-wide fault even when one stretched edge happens to be
  // the largest local symptom. A local cloud can mend that edge while leaving
  // the rest of the chart badly tilted, so cover the full affected frame.
  if (rotation) {
    return chartVisualRepairCandidate(
      heatHazeAvailable ? "heat-haze" : "full-cloud",
      fault,
      { frameWide: true, confirmationMs }
    );
  }

  const distanceFromPlayer = Math.hypot(
    fault.x - viewportWidth / 2,
    fault.y - viewportHeight / 2
  );
  if (
    fault.sizePx >= CHART_REPAIR_CLOSING_FOG_TEAR_PX &&
    distanceFromPlayer >= Math.min(viewportWidth, viewportHeight) * 0.3
  ) {
    return chartVisualRepairCandidate(
      heatHazeAvailable ? "heat-haze" : "closing-fog",
      fault,
      { frameWide, confirmationMs }
    );
  }
  return chartVisualRepairCandidate("partial-cloud", fault, {
    frameWide,
    confirmationMs
  });
}

export function advanceChartWeatherRepairConfirmation({ pending, candidate, nowMs }) {
  if (!candidate || typeof candidate.kind !== "string" || !Number.isFinite(nowMs)) {
    throw new Error("Chart weather repair confirmation requires a candidate and time");
  }
  if (candidate.kind === "none" || candidate.kind === "polar-fog") {
    return Object.freeze({
      pending: null,
      repair: candidate
    });
  }
  const confirmationMs = candidate.confirmationMs ?? CHART_WEATHER_REPAIR_CONFIRMATION_MS;
  if (!Number.isFinite(confirmationMs) || confirmationMs < 0) {
    throw new Error(`Chart weather repair has invalid confirmation time: ${confirmationMs}`);
  }
  const key = chartWeatherRepairConfirmationKey(candidate);
  const startedAtMs = pending?.key === key
    ? pending.startedAtMs
    : nowMs;
  if (!Number.isFinite(startedAtMs) || startedAtMs > nowMs) {
    throw new Error(`Chart weather repair confirmation has invalid start: ${startedAtMs}`);
  }
  const nextPending = Object.freeze({ key, startedAtMs });
  return Object.freeze({
    pending: nextPending,
    repair: nowMs - startedAtMs >= confirmationMs
      ? candidate
      : Object.freeze({ kind: "none" })
  });
}

function chartVisualRepairCandidate(kind, fault, { frameWide, confirmationMs }) {
  return Object.freeze({
    kind,
    fault: Object.freeze(fault),
    frameWide,
    confirmationMs
  });
}

function chartWeatherRepairConfirmationKey(candidate) {
  const fault = candidate.fault;
  if (
    !fault ||
    !Number.isFinite(fault.x) ||
    !Number.isFinite(fault.y) ||
    !["land", "water", "coast"].includes(fault.surface)
  ) {
    throw new Error(`Chart weather repair ${candidate.kind} requires a terrain fault`);
  }
  if (candidate.frameWide) return `${candidate.kind}:frame`;
  const neighborhoodSizePx = 96;
  return [
    candidate.kind,
    fault.surface,
    Math.floor(fault.x / neighborhoodSizePx),
    Math.floor(fault.y / neighborhoodSizePx)
  ].join(":");
}
