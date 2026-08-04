export function createVisualPresentation(point, nowMs) {
  validatePoint(point, "Visual presentation origin");
  validateTime(nowMs);
  return {
    presentationFromX: point.x,
    presentationFromY: point.y,
    presentationToX: point.x,
    presentationToY: point.y,
    presentationStartMs: nowMs,
    presentationDurationMs: 0
  };
}

export function visualPresentationPoint(state, nowMs) {
  validateState(state);
  validateTime(nowMs);
  const duration = state.presentationDurationMs;
  if (duration === 0) {
    return { x: state.presentationToX, y: state.presentationToY };
  }
  const t = Math.max(0, Math.min(1, (nowMs - state.presentationStartMs) / duration));
  return {
    x: state.presentationFromX + (state.presentationToX - state.presentationFromX) * t,
    y: state.presentationFromY + (state.presentationToY - state.presentationFromY) * t
  };
}

export function retargetVisualPresentation(state, from, to, nowMs, durationMs) {
  validateState(state);
  validatePoint(from, "Visual presentation start");
  validatePoint(to, "Visual presentation target");
  validateTime(nowMs);
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error(`Invalid visual presentation duration: ${durationMs}`);
  }
  state.presentationFromX = from.x;
  state.presentationFromY = from.y;
  state.presentationToX = to.x;
  state.presentationToY = to.y;
  state.presentationStartMs = nowMs;
  state.presentationDurationMs = durationMs;
  return state;
}

export function resetVisualPresentation(state, point, nowMs) {
  return retargetVisualPresentation(state, point, point, nowMs, 0);
}

export function visualPresentationIsActive(state, nowMs) {
  validateState(state);
  validateTime(nowMs);
  return state.presentationDurationMs > 0 &&
    nowMs < state.presentationStartMs + state.presentationDurationMs;
}

function validateState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Visual presentation requires state");
  }
  for (const key of [
    "presentationFromX",
    "presentationFromY",
    "presentationToX",
    "presentationToY",
    "presentationStartMs",
    "presentationDurationMs"
  ]) {
    if (!Number.isFinite(state[key])) {
      throw new Error(`Visual presentation has invalid ${key}: ${state[key]}`);
    }
  }
  if (state.presentationDurationMs < 0) {
    throw new Error(`Visual presentation has negative duration: ${state.presentationDurationMs}`);
  }
}

function validatePoint(point, label) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    throw new Error(`${label} requires finite coordinates`);
  }
}

function validateTime(nowMs) {
  if (!Number.isFinite(nowMs)) {
    throw new Error(`Visual presentation requires finite time: ${nowMs}`);
  }
}
