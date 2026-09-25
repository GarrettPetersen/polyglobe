// Crew strength for rowing and hauling. It is transient, like rowing cadence:
// a new voyage and a new battle start fresh, and saves do not store it.
// World sailing, the lake battle, and the historical battle share these rules.

export const ROWING_STAMINA_BASE_SECONDS = 48;
export const ROWING_STAMINA_SECONDS_PER_CREW = 6;
export const ROWING_STAMINA_SECONDS_PER_EXPERIENCE_STAR = 12;
export const ROWING_STAMINA_DRAIN_PER_SECOND = 1;
export const ROWING_STAMINA_REFILL_PER_SECOND = 1;
export const ROWING_STAMINA_EXHAUSTION_LOCKOUT_SECONDS = 4;
export const ROWING_STAMINA_BAR_COLOR = "#5fcde4";
export const ROWING_STAMINA_BAR_BLINK_PERIOD_MS = 180;
const MAX_EXPERIENCE_STARS = 3;

export function createRowingStaminaState() {
  return {
    seconds: null,
    lockoutSeconds: 0
  };
}

export function rowingStaminaCapacitySeconds({
  activeCrew,
  averageExperienceStars,
  staminaDurationMultiplier = 1,
  staminaSecondsFlat = 0
}) {
  if (!Number.isFinite(activeCrew) || activeCrew < 0) {
    throw new Error(`Invalid rowing stamina crew: ${activeCrew}`);
  }
  if (!Number.isFinite(averageExperienceStars) || averageExperienceStars < 0 ||
      averageExperienceStars > MAX_EXPERIENCE_STARS) {
    throw new Error(`Invalid rowing stamina experience: ${averageExperienceStars}`);
  }
  if (!Number.isFinite(staminaDurationMultiplier) || staminaDurationMultiplier <= 0) {
    throw new Error(`Invalid rowing stamina multiplier: ${staminaDurationMultiplier}`);
  }
  if (!Number.isFinite(staminaSecondsFlat) || staminaSecondsFlat < 0) {
    throw new Error(`Invalid rowing stamina bonus: ${staminaSecondsFlat}`);
  }
  return (ROWING_STAMINA_BASE_SECONDS +
    activeCrew * ROWING_STAMINA_SECONDS_PER_CREW +
    averageExperienceStars * ROWING_STAMINA_SECONDS_PER_EXPERIENCE_STAR) *
    staminaDurationMultiplier + staminaSecondsFlat;
}

export function rowingStaminaAllowsExertion(state) {
  assertRowingStaminaState(state);
  return state.lockoutSeconds <= 0 && (state.seconds === null || state.seconds > 0);
}

export function advanceRowingStamina(state, { dt, exerting, capacitySeconds }) {
  assertRowingStaminaState(state);
  if (!Number.isFinite(dt) || dt < 0) throw new Error(`Invalid rowing stamina timestep: ${dt}`);
  if (typeof exerting !== "boolean") throw new Error("Rowing stamina exertion must be boolean");
  if (!Number.isFinite(capacitySeconds) || capacitySeconds <= 0) {
    throw new Error(`Invalid rowing stamina capacity: ${capacitySeconds}`);
  }
  let seconds = state.seconds === null ? capacitySeconds : Math.min(state.seconds, capacitySeconds);
  let lockoutSeconds = state.lockoutSeconds;
  if (lockoutSeconds > 0) {
    lockoutSeconds = Math.max(0, lockoutSeconds - dt);
    seconds = Math.min(capacitySeconds, seconds + dt * ROWING_STAMINA_REFILL_PER_SECOND);
  } else if (exerting) {
    seconds = Math.max(0, seconds - dt * ROWING_STAMINA_DRAIN_PER_SECOND);
    if (seconds === 0) lockoutSeconds = ROWING_STAMINA_EXHAUSTION_LOCKOUT_SECONDS;
  } else {
    seconds = Math.min(capacitySeconds, seconds + dt * ROWING_STAMINA_REFILL_PER_SECOND);
  }
  return { seconds, lockoutSeconds };
}

export function applyRowingStaminaAdvance(state, options) {
  const next = advanceRowingStamina(state, options);
  state.seconds = next.seconds;
  state.lockoutSeconds = next.lockoutSeconds;
  return next;
}

export function rowingStaminaFraction(state, capacitySeconds) {
  assertRowingStaminaState(state);
  if (!Number.isFinite(capacitySeconds) || capacitySeconds <= 0) {
    throw new Error(`Invalid rowing stamina capacity: ${capacitySeconds}`);
  }
  if (state.seconds === null) return 1;
  return Math.min(1, Math.max(0, state.seconds / capacitySeconds));
}

export function rowingStaminaBarShouldDraw(state, capacitySeconds, nowMs) {
  const visible = state.lockoutSeconds > 0 || rowingStaminaFraction(state, capacitySeconds) < 1;
  if (!visible) return false;
  if (state.lockoutSeconds <= 0) return true;
  if (!Number.isFinite(nowMs)) return true;
  return Math.floor(nowMs / ROWING_STAMINA_BAR_BLINK_PERIOD_MS) % 2 === 0;
}

export function rowingStaminaBarLayout({
  hullX,
  hullY,
  hullWidth,
  hullHeight,
  hullVisible,
  fraction
}) {
  for (const [label, value] of Object.entries({ hullX, hullY, hullWidth, hullHeight, fraction })) {
    if (!Number.isFinite(value)) throw new Error(`Rowing stamina bar ${label} must be finite: ${value}`);
  }
  if (typeof hullVisible !== "boolean") throw new Error("Rowing stamina bar hull visibility must be boolean");
  if (hullWidth < 3 || hullHeight <= 0 || fraction < 0 || fraction > 1) {
    throw new Error(`Rowing stamina bar dimensions are invalid: ${hullWidth}x${hullHeight} at ${fraction}`);
  }
  return Object.freeze({
    x: hullX,
    y: hullVisible ? hullY + hullHeight + 1 : hullY,
    width: hullWidth,
    height: 3,
    fillWidth: Math.max(0, Math.round((hullWidth - 2) * fraction))
  });
}

function assertRowingStaminaState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing rowing stamina");
  if (state.seconds !== null && (!Number.isFinite(state.seconds) || state.seconds < 0)) {
    throw new Error(`Invalid rowing stamina: ${state.seconds}`);
  }
  if (!Number.isFinite(state.lockoutSeconds) || state.lockoutSeconds < 0) {
    throw new Error(`Invalid rowing stamina lockout: ${state.lockoutSeconds}`);
  }
}
