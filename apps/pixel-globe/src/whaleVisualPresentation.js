import {
  createVisualPresentation,
  retargetVisualPresentation,
  visualPresentationIsActive,
  visualPresentationPoint
} from "./visualPresentation.js";

export function retargetWhaleVisualPresentation(state, {
  whaleId,
  coordinateSpace,
  from,
  to,
  nowMs,
  durationMs
}) {
  if (typeof whaleId !== "string" || whaleId.length === 0) {
    throw new Error(`Whale visual presentation requires an id: ${whaleId}`);
  }
  if (!coordinateSpace || typeof coordinateSpace !== "object") {
    throw new Error("Whale visual presentation requires a coordinate space");
  }
  if (!state || state.coordinateSpace !== coordinateSpace) {
    state = {
      id: whaleId,
      coordinateSpace,
      ...createVisualPresentation(from, nowMs)
    };
  }
  state.coordinateSpace = coordinateSpace;
  retargetVisualPresentation(state, from, to, nowMs, durationMs);
  return state;
}

export function whaleVisualPresentationPoint(state, {
  coordinateSpace,
  rawPoint,
  nowMs
}) {
  if (
    !state ||
    state.coordinateSpace !== coordinateSpace ||
    !visualPresentationIsActive(state, nowMs)
  ) {
    return rawPoint;
  }
  const point = visualPresentationPoint(state, nowMs);
  return { ...rawPoint, x: point.x, y: point.y };
}

export function whaleVisualPresentationIsActive(state, coordinateSpace, nowMs) {
  return Boolean(
    state &&
    state.coordinateSpace === coordinateSpace &&
    visualPresentationIsActive(state, nowMs)
  );
}
