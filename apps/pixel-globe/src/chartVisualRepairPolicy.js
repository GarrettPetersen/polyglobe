import {
  chartDistortionNeedsRepair,
  chartRotationNeedsFullCloudRepair,
  terrainTearNeedsRepair
} from "./chartVisualFault.js";

export const CHART_REPAIR_CLOSING_FOG_TEAR_PX = 18;

export function chooseChartVisualRepair({
  drift,
  terrainTear,
  distortionPoint,
  viewportWidth,
  viewportHeight,
  swellRepairAvailable,
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

  if (swellRepairAvailable) return Object.freeze({ kind: "none" });

  if (chartRotationNeedsFullCloudRepair(drift)) {
    return Object.freeze({ kind: "full-cloud" });
  }
  const tear = terrainTearNeedsRepair(terrainTear);
  const distortion = chartDistortionNeedsRepair(drift);
  if (!tear && !distortion) return Object.freeze({ kind: "none" });

  const fault = tear
    ? { x: terrainTear.screenX, y: terrainTear.screenY, sizePx: terrainTear.extraPx }
    : { x: distortionPoint.x, y: distortionPoint.y, sizePx: drift.maxDistortionPx };
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
