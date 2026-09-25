export const MARKET_PURSE_FEEDBACK_DURATION_MS = 1050;
const MARKET_PURSE_FEEDBACK_LIMIT = 8;

export function purseChangeFromDisplayedTotal(previousTotal, nextTotal) {
  if (previousTotal !== null && (!Number.isFinite(previousTotal) || previousTotal < 0)) {
    throw new Error(`Invalid previous doubloon total: ${previousTotal}`);
  }
  if (!Number.isFinite(nextTotal) || nextTotal < 0) {
    throw new Error(`Invalid doubloon total: ${nextTotal}`);
  }
  const next = Math.round(nextTotal);
  if (previousTotal === null) return Object.freeze({ baseline: next, delta: null });
  const delta = next - Math.round(previousTotal);
  return Object.freeze({ baseline: next, delta: delta === 0 ? null : delta });
}

export function marketPurseFeedbackLabelPosition(anchor, entry) {
  if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    throw new Error("Purse change label requires the doubloon count anchor");
  }
  if (!entry || !Number.isFinite(entry.offsetX) || !Number.isFinite(entry.offsetY)) {
    throw new Error("Market purse feedback position requires entry offsets");
  }
  return Object.freeze({
    x: anchor.x + entry.offsetX,
    y: anchor.y - entry.offsetY
  });
}

export function marketPurseFeedbackLayerOpacity(alpha) {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) {
    throw new Error(`Invalid market purse feedback opacity: ${alpha}`);
  }
  return Object.freeze({ shadow: alpha * 0.4, text: alpha });
}

export function createMarketPurseFeedbackState() {
  return { nextSequence: 0, entries: [] };
}

export function recordMarketPurseTransaction(state, {
  deltaDoubloons,
  startedAtMs
}) {
  assertMarketPurseFeedbackState(state);
  if (!Number.isFinite(deltaDoubloons) || deltaDoubloons === 0) {
    throw new Error(`Market purse feedback requires a non-zero finite change: ${deltaDoubloons}`);
  }
  if (!Number.isFinite(startedAtMs) || startedAtMs < 0) {
    throw new Error(`Market purse feedback requires a valid start time: ${startedAtMs}`);
  }
  state.entries.push({
    deltaDoubloons: Math.round(deltaDoubloons),
    sequence: state.nextSequence++,
    startedAtMs
  });
  if (state.entries.length > MARKET_PURSE_FEEDBACK_LIMIT) {
    state.entries.splice(0, state.entries.length - MARKET_PURSE_FEEDBACK_LIMIT);
  }
}

export function marketPurseFeedbackEntries(state, {
  nowMs,
  reducedMotion = false
}) {
  assertMarketPurseFeedbackState(state);
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Market purse feedback display requires a valid time: ${nowMs}`);
  }
  if (typeof reducedMotion !== "boolean") {
    throw new Error("Market purse feedback reduced-motion setting must be boolean");
  }
  state.entries = state.entries.filter(entry => (
    nowMs - entry.startedAtMs < MARKET_PURSE_FEEDBACK_DURATION_MS
  ));
  return state.entries.map(entry => {
      const progress = Math.max(0, Math.min(
        1,
        (nowMs - entry.startedAtMs) / MARKET_PURSE_FEEDBACK_DURATION_MS
      ));
      return Object.freeze({
        ...entry,
        alpha: progress < 0.58 ? 1 : 1 - (progress - 0.58) / 0.42,
        offsetX: reducedMotion ? 0 : entry.sequence % 3 * 3,
        offsetY: -(entry.sequence % MARKET_PURSE_FEEDBACK_LIMIT * 9) -
          (reducedMotion ? 0 : progress * 11)
      });
    });
}

function assertMarketPurseFeedbackState(state) {
  if (!state || !Number.isInteger(state.nextSequence) || state.nextSequence < 0 ||
      !Array.isArray(state.entries)) {
    throw new Error("Invalid market purse feedback state");
  }
}
