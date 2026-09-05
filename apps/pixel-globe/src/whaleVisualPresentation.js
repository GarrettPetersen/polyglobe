import {
  createVisualPresentation,
  retargetVisualPresentation,
  visualPresentationIsActive,
  visualPresentationPoint
} from "./visualPresentation.js";

// The generic underwater shader shares one phase across every submitted sprite.
// On a slow, mostly submerged whale its one-pixel row displacement reads as the
// whole animal snapping sideways in unison with every other whale. Whale motion
// comes from position interpolation instead; keep its rendered silhouette stable.
export const WHALE_SUBMERGED_REFRACTION_PX = 0;

export function synchronizeWhaleVisualPresentation(state, {
  whaleId,
  coordinateSpace,
  rawPoint,
  worldPosition,
  cameraRight,
  cameraUp,
  pixelsPerRadian,
  nowMs,
  durationMs
}) {
  if (typeof whaleId !== "string" || whaleId.length === 0) {
    throw new Error(`Whale visual presentation requires an id: ${whaleId}`);
  }
  if (!coordinateSpace || typeof coordinateSpace !== "object") {
    throw new Error("Whale visual presentation requires a coordinate space");
  }
  for (const [label, vector] of Object.entries({ worldPosition, cameraRight, cameraUp })) {
    if (!Array.isArray(vector) || vector.length !== 3 || !vector.every(Number.isFinite)) {
      throw new Error(`Whale presentation requires a finite ${label} vector: ${whaleId}`);
    }
  }
  if (!Number.isFinite(pixelsPerRadian) || pixelsPerRadian <= 0) {
    throw new Error(`Whale presentation requires a positive projection scale: ${whaleId}`);
  }
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error(`Whale presentation requires a non-negative duration: ${whaleId}`);
  }
  if (state && state.id !== whaleId) {
    throw new Error(`Whale presentation identity changed: ${state.id} -> ${whaleId}`);
  }
  if (!state || state.coordinateSpace !== coordinateSpace) {
    return {
      id: whaleId,
      coordinateSpace,
      worldPosition: worldPosition.slice(),
      ...createVisualPresentation(rawPoint, nowMs)
    };
  }
  const from = visualPresentationPoint(state, nowMs);
  const delta = worldPosition.map((value, index) => value - state.worldPosition[index]);
  const moved = delta.some((value) => value !== 0);
  if (!moved && (durationMs !== 0 || !visualPresentationIsActive(state, nowMs))) return state;
  // Within a retained chart, the local endpoint is authoritative. Only actual
  // movement advances it; changing tile anchors or camera projections must not
  // drag the whale back to a newly projected absolute world position.
  const to = {
    x: state.presentationToX + dot(delta, cameraRight) * pixelsPerRadian,
    y: state.presentationToY - dot(delta, cameraUp) * pixelsPerRadian
  };
  retargetVisualPresentation(state, from, to, nowMs, durationMs);
  state.worldPosition = worldPosition.slice();
  return state;
}

export function whaleVisualPresentationPoint(state, {
  coordinateSpace,
  rawPoint,
  nowMs
}) {
  if (!state || state.coordinateSpace !== coordinateSpace) {
    return rawPoint;
  }
  const point = visualPresentationPoint(state, nowMs);
  return { ...rawPoint, x: point.x, y: point.y };
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function whaleVisualPresentationIsActive(state, coordinateSpace, nowMs) {
  return Boolean(
    state &&
    state.coordinateSpace === coordinateSpace &&
    visualPresentationIsActive(state, nowMs)
  );
}
