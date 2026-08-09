export const CHART_CLOUD_REPAIR_ROTATION_DEG = 4;
export const CHART_CLOUD_REPAIR_RMS_PX = 6;
export const CHART_CLOUD_REPAIR_MAX_DISTORTION_PX = 14;
export const CHART_CLOUD_REPAIR_LAND_TEAR_PX = 8;

export function measureVisibleLandTear({
  faceCalls,
  tileById,
  offset,
  viewportWidth,
  viewportHeight,
  isLandTile
}) {
  if (!Array.isArray(faceCalls) || !(tileById instanceof Map)) {
    throw new Error("Visible land tear measurement requires chart faces and tiles");
  }
  if (typeof isLandTile !== "function") {
    throw new Error("Visible land tear measurement requires a land predicate");
  }
  for (const [label, value] of Object.entries({
    offsetX: offset?.x,
    offsetY: offset?.y,
    viewportWidth,
    viewportHeight
  })) {
    if (!Number.isFinite(value) || (label.startsWith("viewport") && value <= 0)) {
      throw new Error(`Visible land tear measurement has invalid ${label}: ${value}`);
    }
  }

  let worst = null;
  for (const face of faceCalls) {
    const a = tileById.get(face.a);
    const b = tileById.get(face.b);
    if (!a || !b) throw new Error(`Visible land tear is missing tile ${!a ? face.a : face.b}`);
    if (!isLandTile(a) || !isLandTile(b)) continue;
    const ax = a.x + offset.x;
    const ay = a.y + offset.y;
    const bx = b.x + offset.x;
    const by = b.y + offset.y;
    if (!segmentOverlapsViewport(ax, ay, bx, by, viewportWidth, viewportHeight)) continue;
    const actualDistance = Math.hypot(b.x - a.x, b.y - a.y);
    const projectedDistance = Math.hypot(
      b.projectedX - a.projectedX,
      b.projectedY - a.projectedY
    );
    if (projectedDistance < 1) {
      throw new Error(`Visible land edge ${a.id}:${b.id} has invalid projected spacing`);
    }
    const extraPx = actualDistance - projectedDistance;
    if (worst !== null && extraPx <= worst.extraPx) continue;
    worst = Object.freeze({
      extraPx,
      tileIds: Object.freeze([a.id, b.id]),
      screenX: (ax + bx) / 2,
      screenY: (ay + by) / 2
    });
  }
  return worst ?? Object.freeze({
    extraPx: 0,
    tileIds: Object.freeze([]),
    screenX: viewportWidth / 2,
    screenY: viewportHeight / 2
  });
}

export function chartFaultNeedsCloudRepair({ drift, landTear }) {
  if (!drift || !landTear) throw new Error("Chart cloud repair requires drift and tear metrics");
  return chartDriftNeedsCloudRepair(drift) || landTearNeedsRepair(landTear);
}

export function chartDriftNeedsCloudRepair(drift) {
  if (!drift) throw new Error("Chart drift repair requires drift metrics");
  return chartRotationNeedsFullCloudRepair(drift) || chartDistortionNeedsRepair(drift);
}

export function chartRotationNeedsFullCloudRepair(drift) {
  if (!drift) throw new Error("Chart rotation repair requires drift metrics");
  return Math.abs(drift.rotationDeg) >= CHART_CLOUD_REPAIR_ROTATION_DEG;
}

export function chartDistortionNeedsRepair(drift) {
  if (!drift) throw new Error("Chart distortion repair requires drift metrics");
  return drift.rmsDistortionPx >= CHART_CLOUD_REPAIR_RMS_PX ||
    drift.maxDistortionPx >= CHART_CLOUD_REPAIR_MAX_DISTORTION_PX;
}

export function landTearNeedsRepair(landTear) {
  if (!landTear) throw new Error("Land tear repair requires tear metrics");
  return landTear.extraPx >= CHART_CLOUD_REPAIR_LAND_TEAR_PX;
}

function segmentOverlapsViewport(ax, ay, bx, by, width, height) {
  return Math.max(ax, bx) >= 0 && Math.min(ax, bx) <= width &&
    Math.max(ay, by) >= 0 && Math.min(ay, by) <= height;
}
