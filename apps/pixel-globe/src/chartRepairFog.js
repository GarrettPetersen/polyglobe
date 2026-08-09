export function createChartRepairFog({
  nowMs,
  viewportWidth,
  viewportHeight,
  focusX,
  focusY
}) {
  for (const [label, value] of Object.entries({
    nowMs,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY
  })) {
    if (!Number.isFinite(value)) throw new Error(`Chart repair fog has invalid ${label}`);
  }
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    throw new Error("Chart repair fog requires a non-empty viewport");
  }
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: 4200,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY,
    minimumClearRadius: 34,
    fadeBandPx: 28,
    maximumClearRadius: Math.hypot(viewportWidth, viewportHeight)
  });
}

export function chartRepairFogFrame(fog, nowMs) {
  if (!fog || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair fog frame requires state and time");
  }
  const progress = Math.max(0, Math.min(1, (nowMs - fog.startedAtMs) / fog.durationMs));
  const concealment = Math.sin(progress * Math.PI) ** 2;
  const clearRadius = fog.maximumClearRadius +
    (fog.minimumClearRadius - fog.maximumClearRadius) * concealment;
  return Object.freeze({
    progress,
    focusX: fog.focusX,
    focusY: fog.focusY,
    clearRadius,
    opaqueRadius: clearRadius + fog.fadeBandPx,
    repairReady: progress >= 0.48 && progress <= 0.52,
    finished: progress >= 1
  });
}

export function polarChartFogFrame({
  latitudeDeg,
  viewportWidth,
  viewportHeight,
  focusX,
  focusY
}) {
  for (const [label, value] of Object.entries({
    latitudeDeg,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY
  })) {
    if (!Number.isFinite(value)) throw new Error(`Polar chart fog has invalid ${label}`);
  }
  const polarAmount = smoothstep(64, 76, Math.abs(latitudeDeg));
  if (polarAmount <= 0) return null;
  const diagonal = Math.hypot(viewportWidth, viewportHeight);
  const minimumDimension = Math.min(viewportWidth, viewportHeight);
  const minimumClearRadius = Math.max(62, minimumDimension * 0.43);
  const clearRadius = diagonal + (minimumClearRadius - diagonal) * polarAmount;
  return Object.freeze({
    progress: 1,
    focusX,
    focusY,
    clearRadius,
    opaqueRadius: clearRadius + 24,
    repairReady: true,
    finished: false,
    polarAmount
  });
}

export function chartFogFullyCoversCircle(frame, x, y, radius = 0) {
  if (!frame) return false;
  for (const [label, value] of Object.entries({ x, y, radius })) {
    if (!Number.isFinite(value)) throw new Error(`Chart fog coverage has invalid ${label}`);
  }
  if (radius < 0) throw new Error(`Chart fog coverage radius cannot be negative: ${radius}`);
  return Math.hypot(x - frame.focusX, y - frame.focusY) - radius >= frame.opaqueRadius;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
