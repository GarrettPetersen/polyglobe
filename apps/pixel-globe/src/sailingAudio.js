const WIND_START_STRENGTH = 0.32;
const WIND_FULL_STRENGTH = 1.05;
const FLAG_MIN_AUDIBILITY = 0.55;
const FLAG_FULL_STRENGTH = 0.5;
const FLAG_ANGLE_MARGIN_RAD = 18 * Math.PI / 180;
const UNDERWAY_MIN_SPEED_PX = 4;
const UNDERWAY_FULL_SPEED_PX = 15;
const UNDERWAY_DELAY_SECONDS = 4;
const UNDERWAY_FADE_SECONDS = 8;
const MAX_STEADY_HEADING_RATE_RAD = 2 * Math.PI / 180;

export const SAILING_WIND_CONTEXT_GENERAL = "general";
export const SAILING_WIND_CONTEXT_WINTER = "winter";
export const SAILING_WIND_CONTEXT_DESERT = "desert";

export function createSailingAudioState() {
  return {
    steadySeconds: 0,
    previousHeading: null
  };
}

export function updateSailingAudioState(state, input) {
  validateInput(state, input);
  const windPresence = smoothstep(
    (input.windStrength - WIND_START_STRENGTH) / (WIND_FULL_STRENGTH - WIND_START_STRENGTH)
  );
  const headingChange = state.previousHeading
    ? Math.acos(clamp(dot3(state.previousHeading, input.heading), -1, 1))
    : 0;
  const headingStable = headingChange <= MAX_STEADY_HEADING_RATE_RAD * input.dt;
  const movingOpenWater = !input.isRiver && input.speedPx >= UNDERWAY_MIN_SPEED_PX;

  if (!input.paused && movingOpenWater && headingStable) {
    state.steadySeconds += input.dt;
  } else {
    state.steadySeconds = Math.max(0, state.steadySeconds - input.dt * 3);
  }
  state.previousHeading = input.heading.slice();

  if (input.paused) return emptyTargets();

  const windTargets = {
    harshWind: input.windContext === SAILING_WIND_CONTEXT_GENERAL ? windPresence : 0,
    winterWind: input.windContext === SAILING_WIND_CONTEXT_WINTER ? windPresence : 0,
    desertWind: input.windContext === SAILING_WIND_CONTEXT_DESERT ? windPresence : 0
  };
  const anglePastStall = input.angleFromWindRad - input.stallAngleRad;
  const flagCloseness = 1 - clamp(anglePastStall / FLAG_ANGLE_MARGIN_RAD, 0, 1);
  const flagWindPresence = FLAG_MIN_AUDIBILITY
    + (1 - FLAG_MIN_AUDIBILITY) * smoothstep(input.windStrength / FLAG_FULL_STRENGTH);
  const flag = flagCloseness * flagWindPresence;
  const underwayTime = smoothstep(
    (state.steadySeconds - UNDERWAY_DELAY_SECONDS) / UNDERWAY_FADE_SECONDS
  );
  const underwaySpeed = smoothstep(
    (input.speedPx - UNDERWAY_MIN_SPEED_PX) / (UNDERWAY_FULL_SPEED_PX - UNDERWAY_MIN_SPEED_PX)
  );

  return {
    ...windTargets,
    flag,
    underway: movingOpenWater ? underwayTime * underwaySpeed : 0
  };
}

function emptyTargets() {
  return {
    harshWind: 0,
    winterWind: 0,
    desertWind: 0,
    flag: 0,
    underway: 0
  };
}

function validateInput(state, input) {
  if (!state || !Number.isFinite(state.steadySeconds)) throw new Error("Invalid sailing audio state");
  for (const key of ["dt", "windStrength", "speedPx", "angleFromWindRad", "stallAngleRad"]) {
    if (!Number.isFinite(input[key])) throw new Error(`Invalid sailing audio input: ${key}`);
  }
  if (!Array.isArray(input.heading) || input.heading.length !== 3) {
    throw new Error("Sailing audio heading must be a 3D vector");
  }
  if (![SAILING_WIND_CONTEXT_GENERAL, SAILING_WIND_CONTEXT_WINTER, SAILING_WIND_CONTEXT_DESERT].includes(input.windContext)) {
    throw new Error(`Unknown sailing wind context: ${input.windContext}`);
  }
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
