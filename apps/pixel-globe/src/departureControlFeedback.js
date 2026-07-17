export const DEPARTURE_CONTROL_FEEDBACK_DURATION_MS = 850;
export const DEPARTURE_CONTROL_FEEDBACK_KINDS = Object.freeze({
  ANCHOR: "anchor",
  PORT: "port"
});

const VALID_KINDS = new Set(Object.values(DEPARTURE_CONTROL_FEEDBACK_KINDS));
const PULSE_PERIOD_MS = 320;
const FADE_OUT_MS = 180;

export function signalDepartureControlFeedback(current, kind, nowMs) {
  validateKind(kind);
  validateNow(nowMs);
  if (current && current.kind === kind && nowMs < current.expiresAtMs) {
    return Object.freeze({
      ...current,
      expiresAtMs: nowMs + DEPARTURE_CONTROL_FEEDBACK_DURATION_MS
    });
  }
  return Object.freeze({
    kind,
    startedAtMs: nowMs,
    expiresAtMs: nowMs + DEPARTURE_CONTROL_FEEDBACK_DURATION_MS
  });
}

export function departureControlFeedbackAttention(feedback, kind, nowMs, reducedMotion = false) {
  validateKind(kind);
  validateNow(nowMs);
  if (!feedback || feedback.kind !== kind || nowMs < feedback.startedAtMs || nowMs >= feedback.expiresAtMs) {
    return 0;
  }
  validateFeedback(feedback);
  const fade = Math.min(1, (feedback.expiresAtMs - nowMs) / FADE_OUT_MS);
  if (reducedMotion) return 0.45 * fade;
  const elapsed = nowMs - feedback.startedAtMs;
  const pulse = 0.5 - Math.cos(elapsed / PULSE_PERIOD_MS * Math.PI * 2) * 0.5;
  return (0.16 + pulse * 0.84) * fade;
}

export function departureControlFeedbackIsActive(feedback, nowMs) {
  validateNow(nowMs);
  if (!feedback) return false;
  validateFeedback(feedback);
  return nowMs >= feedback.startedAtMs && nowMs < feedback.expiresAtMs;
}

function validateFeedback(feedback) {
  validateKind(feedback.kind);
  if (!Number.isFinite(feedback.startedAtMs) || !Number.isFinite(feedback.expiresAtMs) ||
      feedback.expiresAtMs <= feedback.startedAtMs) {
    throw new Error("Malformed departure control feedback");
  }
}

function validateKind(kind) {
  if (!VALID_KINDS.has(kind)) throw new Error(`Unknown departure control feedback kind: ${kind}`);
}

function validateNow(nowMs) {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error(`Invalid departure control time: ${nowMs}`);
}
