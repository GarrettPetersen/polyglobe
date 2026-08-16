export const CHART_CLOUD_REPAIR_ROTATION_DEG = 4;
export const CHART_CLOUD_REPAIR_RMS_PX = 6;
export const CHART_CLOUD_REPAIR_MAX_DISTORTION_PX = 14;
export const CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX = 8;

export function nearestChartSurfaceAtPoint({ tileCalls, offset, point, surfaceForTile }) {
  if (!Array.isArray(tileCalls) || typeof surfaceForTile !== "function") {
    throw new Error("Chart surface lookup requires tile calls and a surface classifier");
  }
  for (const [label, value] of Object.entries({
    offsetX: offset?.x,
    offsetY: offset?.y,
    pointX: point?.x,
    pointY: point?.y
  })) {
    if (!Number.isFinite(value)) throw new Error(`Chart surface lookup has invalid ${label}: ${value}`);
  }
  let nearest = null;
  let nearestDistance = Infinity;
  for (const call of tileCalls) {
    if (!Number.isFinite(call?.x) || !Number.isFinite(call?.y)) {
      throw new Error(`Chart surface lookup has an invalid tile center: ${call?.id}`);
    }
    const distance = Math.hypot(
      call.x + offset.x - point.x,
      call.y + offset.y - point.y
    );
    if (distance >= nearestDistance) continue;
    nearest = call;
    nearestDistance = distance;
  }
  if (!nearest) return null;
  const surface = surfaceForTile(nearest);
  if (!["land", "water"].includes(surface)) {
    throw new Error(`Chart surface lookup classified tile ${nearest.id} as ${surface}`);
  }
  return surface;
}

export function measureVisibleTerrainTear({
  faceCalls,
  tileById,
  offset,
  viewportWidth,
  viewportHeight,
  surfaceForTile
}) {
  if (!Array.isArray(faceCalls) || !(tileById instanceof Map)) {
    throw new Error("Visible terrain tear measurement requires chart faces and tiles");
  }
  if (typeof surfaceForTile !== "function") {
    throw new Error("Visible terrain tear measurement requires a surface classifier");
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
  let worstNonWater = null;
  let worstWater = null;
  for (const face of faceCalls) {
    const a = tileById.get(face.a);
    const b = tileById.get(face.b);
    if (!a || !b) throw new Error(`Visible terrain tear is missing tile ${!a ? face.a : face.b}`);
    const aSurface = surfaceForTile(a);
    const bSurface = surfaceForTile(b);
    if (aSurface !== "land" && aSurface !== "water") {
      throw new Error(`Visible terrain tear has invalid surface for tile ${a.id}: ${aSurface}`);
    }
    if (bSurface !== "land" && bSurface !== "water") {
      throw new Error(`Visible terrain tear has invalid surface for tile ${b.id}: ${bSurface}`);
    }
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
    const signedExtraPx = actualDistance - projectedDistance;
    const extraPx = Math.abs(signedExtraPx);
    const candidate = {
      extraPx,
      signedExtraPx,
      tileIds: Object.freeze([a.id, b.id]),
      surface: aSurface === bSurface ? aSurface : "coast",
      screenX: (ax + bx) / 2,
      screenY: (ay + by) / 2
    };
    if (worst === null || extraPx > worst.extraPx) worst = candidate;
    if (
      candidate.surface !== "water" &&
      (worstNonWater === null || extraPx > worstNonWater.extraPx)
    ) {
      worstNonWater = candidate;
    }
    if (
      candidate.surface === "water" &&
      (worstWater === null || extraPx > worstWater.extraPx)
    ) {
      worstWater = candidate;
    }
  }
  const empty = {
    extraPx: 0,
    signedExtraPx: 0,
    tileIds: Object.freeze([]),
    surface: null,
    screenX: viewportWidth / 2,
    screenY: viewportHeight / 2
  };
  return Object.freeze({
    ...(worst ?? empty),
    nonWater: Object.freeze(worstNonWater ?? empty),
    water: Object.freeze(worstWater ?? empty)
  });
}

export function chartFaultNeedsCloudRepair({ drift, terrainTear }) {
  if (!drift || !terrainTear) throw new Error("Chart cloud repair requires drift and tear metrics");
  return chartDriftNeedsCloudRepair(drift) || terrainTearNeedsRepair(terrainTear);
}

export function chartFaultCanRelyOnSwell({
  drift,
  fullyElasticOpenOcean,
  localWaterFault
}) {
  if (!drift || typeof fullyElasticOpenOcean !== "boolean" ||
      typeof localWaterFault !== "boolean") {
    throw new Error("Chart swell repair policy requires drift and explicit water states");
  }
  if (fullyElasticOpenOcean) return true;
  return localWaterFault && !chartDriftNeedsCloudRepair(drift);
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

export function terrainTearNeedsRepair(terrainTear) {
  if (!terrainTear) throw new Error("Terrain tear repair requires tear metrics");
  return terrainTear.extraPx >= CHART_CLOUD_REPAIR_TERRAIN_TEAR_PX;
}

function segmentOverlapsViewport(ax, ay, bx, by, width, height) {
  return Math.max(ax, bx) >= 0 && Math.min(ax, bx) <= width &&
    Math.max(ay, by) >= 0 && Math.min(ay, by) <= height;
}
