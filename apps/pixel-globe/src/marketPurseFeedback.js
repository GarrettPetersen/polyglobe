export const MARKET_PURSE_FEEDBACK_DURATION_MS = 1050;
const MARKET_PURSE_FEEDBACK_LIMIT = 8;

export function marketPurseOverlayRect({
  screenWidth,
  screenHeight,
  width,
  height,
  margin = 5
}) {
  for (const [label, value] of Object.entries({ screenWidth, screenHeight, width, height, margin })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid market purse ${label}: ${value}`);
    }
  }
  if (width <= 0 || height <= 0 || margin * 2 + width > screenWidth || margin * 2 + height > screenHeight) {
    throw new Error(`Market purse does not fit viewport: ${screenWidth}x${screenHeight}`);
  }
  return Object.freeze({ x: margin, y: margin, w: width, h: height });
}

export function createMarketPurseFeedbackState() {
  return { nextSequence: 0, entries: [] };
}

export function recordMarketPurseTransaction(state, {
  deltaDoubloons,
  marketId,
  startedAtMs
}) {
  assertMarketPurseFeedbackState(state);
  if (!Number.isFinite(deltaDoubloons) || deltaDoubloons === 0) {
    throw new Error(`Market purse feedback requires a non-zero finite change: ${deltaDoubloons}`);
  }
  if (typeof marketId !== "string" || marketId.length === 0) {
    throw new Error("Market purse feedback requires a market id");
  }
  if (!Number.isFinite(startedAtMs) || startedAtMs < 0) {
    throw new Error(`Market purse feedback requires a valid start time: ${startedAtMs}`);
  }
  state.entries.push({
    deltaDoubloons: Math.round(deltaDoubloons),
    marketId,
    sequence: state.nextSequence++,
    startedAtMs
  });
  if (state.entries.length > MARKET_PURSE_FEEDBACK_LIMIT) {
    state.entries.splice(0, state.entries.length - MARKET_PURSE_FEEDBACK_LIMIT);
  }
}

export function marketPurseFeedbackEntries(state, {
  marketId,
  nowMs,
  reducedMotion = false
}) {
  assertMarketPurseFeedbackState(state);
  if (typeof marketId !== "string" || marketId.length === 0) {
    throw new Error("Market purse feedback display requires a market id");
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Market purse feedback display requires a valid time: ${nowMs}`);
  }
  if (typeof reducedMotion !== "boolean") {
    throw new Error("Market purse feedback reduced-motion setting must be boolean");
  }
  state.entries = state.entries.filter(entry => (
    nowMs - entry.startedAtMs < MARKET_PURSE_FEEDBACK_DURATION_MS
  ));
  return state.entries
    .filter(entry => entry.marketId === marketId)
    .map(entry => {
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
