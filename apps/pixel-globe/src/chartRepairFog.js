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
  const fadeBandPx = 42;
  const maximumClearRadius = Math.max(
    Math.hypot(focusX, focusY),
    Math.hypot(viewportWidth - focusX, focusY),
    Math.hypot(focusX, viewportHeight - focusY),
    Math.hypot(viewportWidth - focusX, viewportHeight - focusY)
  ) + fadeBandPx;
  const formationDurationMs = 12_000;
  const holdDurationMs = 1_800;
  const clearingDurationMs = 7_000;
  return Object.freeze({
    startedAtMs: nowMs,
    durationMs: formationDurationMs + holdDurationMs + clearingDurationMs,
    formationDurationMs,
    holdDurationMs,
    clearingDurationMs,
    viewportWidth,
    viewportHeight,
    focusX,
    focusY,
    minimumClearRadius: Math.max(42, Math.min(viewportWidth, viewportHeight) * 0.18),
    fadeBandPx,
    maximumClearRadius
  });
}

export function chartRepairFogFrame(fog, nowMs, release = null) {
  if (!fog || !Number.isFinite(nowMs)) {
    throw new Error("Chart repair fog frame requires state and time");
  }
  if (release !== null && (
    !Number.isFinite(release.startedAtMs) ||
    !Number.isFinite(release.startLevel) ||
    release.startLevel < 0 ||
    release.startLevel > 1
  )) {
    throw new Error("Chart repair fog release requires a valid start time and level");
  }
  const elapsedMs = Math.max(0, nowMs - fog.startedAtMs);
  const automaticReleaseAtMs = fog.formationDurationMs + fog.holdDurationMs;
  let concealment;
  let finished = false;
  if (release) {
    const releaseProgress = clamp01((nowMs - release.startedAtMs) / fog.clearingDurationMs);
    concealment = release.startLevel * (1 - smoothstep01(releaseProgress));
    finished = releaseProgress >= 1;
  } else if (elapsedMs <= automaticReleaseAtMs) {
    concealment = smoothstep01(elapsedMs / fog.formationDurationMs);
  } else {
    const releaseProgress = clamp01(
      (elapsedMs - automaticReleaseAtMs) / fog.clearingDurationMs
    );
    concealment = 1 - smoothstep01(releaseProgress);
    finished = releaseProgress >= 1;
  }
  const edgeOpacity = clamp01(concealment * 2.2);
  const clearRadius = fog.maximumClearRadius +
    (fog.minimumClearRadius - fog.maximumClearRadius) * concealment;
  return Object.freeze({
    progress: clamp01(elapsedMs / fog.durationMs),
    concealment,
    edgeOpacity,
    blurPx: concealment * 1.5,
    focusX: fog.focusX,
    focusY: fog.focusY,
    clearRadius,
    opaqueRadius: clearRadius + fog.fadeBandPx,
    repairReady: edgeOpacity >= 0.995 && !finished,
    finished
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
  const polarAmount = smoothstep(58, 74, Math.abs(latitudeDeg));
  if (polarAmount <= 0) return null;
  const maximumClearRadius = Math.max(
    Math.hypot(focusX, focusY),
    Math.hypot(viewportWidth - focusX, focusY),
    Math.hypot(focusX, viewportHeight - focusY),
    Math.hypot(viewportWidth - focusX, viewportHeight - focusY)
  ) + 30;
  const minimumDimension = Math.min(viewportWidth, viewportHeight);
  const minimumClearRadius = Math.max(62, minimumDimension * 0.43);
  const clearRadius = maximumClearRadius +
    (minimumClearRadius - maximumClearRadius) * polarAmount;
  return Object.freeze({
    progress: 1,
    concealment: polarAmount,
    edgeOpacity: 1,
    blurPx: 0,
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
  if (!Number.isFinite(frame.edgeOpacity) || frame.edgeOpacity < 0 || frame.edgeOpacity > 1) {
    throw new Error(`Chart fog coverage has invalid edge opacity: ${frame.edgeOpacity}`);
  }
  if (frame.edgeOpacity < 0.995) return false;
  return Math.hypot(x - frame.focusX, y - frame.focusY) - radius >= frame.opaqueRadius;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return smoothstep01(t);
}

function smoothstep01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
