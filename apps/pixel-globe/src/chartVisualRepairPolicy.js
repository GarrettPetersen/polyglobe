export const CHART_WEATHER_REPAIR_ROTATION_DEG = 8;
export const CHART_WEATHER_REPAIR_RMS_PX = 10;
export const CHART_WEATHER_REPAIR_MAX_DISTORTION_PX = 22;
export const CHART_WEATHER_REPAIR_TERRAIN_TEAR_PX = 14;
export const CHART_REPAIR_CLOSING_FOG_TEAR_PX = 32;
export const CHART_WEATHER_REPAIR_CONFIRMATION_MS = 10_000;

export function chooseChartVisualRepair({
  drift,
  terrainTear,
  distortionPoint,
  viewportWidth,
  viewportHeight,
  swellRepairAvailable,
  distortionSurface,
  polarFogCoversFault = false
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
  if (![null, "water", "land", "coast"].includes(distortionSurface)) {
    throw new Error(`Chart visual repair policy has invalid distortion surface: ${distortionSurface}`);
  }

  if (swellRepairAvailable) return Object.freeze({ kind: "none" });

  const tear = terrainTear.extraPx >= CHART_WEATHER_REPAIR_TERRAIN_TEAR_PX &&
    terrainTear.surface !== "water";
  const rotation = Math.abs(drift.rotationDeg) >= CHART_WEATHER_REPAIR_ROTATION_DEG;
  const distortion = drift.rmsDistortionPx >= CHART_WEATHER_REPAIR_RMS_PX ||
    drift.maxDistortionPx >= CHART_WEATHER_REPAIR_MAX_DISTORTION_PX;
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

  // Open water is corrected by the swell presentation. Weather concealment is
  // reserved for rigid geography that cannot move beneath a wave.
  if (fault.surface === "water" || fault.surface === null) {
    return Object.freeze({ kind: "none" });
  }

  if (rotation && !tear) {
    return Object.freeze({
      kind: "full-cloud",
      fault: Object.freeze(fault)
    });
  }
  if (polarFogCoversFault) return Object.freeze({ kind: "polar-fog", fault });

  const distanceFromPlayer = Math.hypot(
    fault.x - viewportWidth / 2,
    fault.y - viewportHeight / 2
  );
  if (
    fault.sizePx >= CHART_REPAIR_CLOSING_FOG_TEAR_PX &&
    distanceFromPlayer >= Math.min(viewportWidth, viewportHeight) * 0.3
  ) {
    return Object.freeze({ kind: "closing-fog", fault });
  }
  return Object.freeze({ kind: "partial-cloud", fault });
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
    repair: nowMs - startedAtMs >= CHART_WEATHER_REPAIR_CONFIRMATION_MS
      ? candidate
      : Object.freeze({ kind: "none" })
  });
}

function chartWeatherRepairConfirmationKey(candidate) {
  const fault = candidate.fault;
  if (
    !fault ||
    !Number.isFinite(fault.x) ||
    !Number.isFinite(fault.y) ||
    !["land", "coast"].includes(fault.surface)
  ) {
    throw new Error(`Chart weather repair ${candidate.kind} requires a land or coast fault`);
  }
  const neighborhoodSizePx = 96;
  return [
    candidate.kind,
    fault.surface,
    Math.floor(fault.x / neighborhoodSizePx),
    Math.floor(fault.y / neighborhoodSizePx)
  ].join(":");
}
