import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const FIRST_DAY_NIGHT_NOTICE_SUNSET = "sunset";
export const FIRST_DAY_NIGHT_NOTICE_SUNRISE = "sunrise";
const FIRST_DAY_NIGHT_NOTICE_SUNSET_ALTITUDE = 0.3;
const FIRST_DAY_NIGHT_NOTICE_SUNRISE_ALTITUDE = -0.3;

export function dayNightLightForSunAltitude(sunAltitude) {
  assertSunAltitude(sunAltitude);
  // Two direct fades with a short warm plateau. Smoothstep starts and ends
  // each fade gently; the voyage clock and physical sun are unchanged.
  return {
    sunAltitude,
    sunset: 1 - smoothstep(0.08, 0.65, sunAltitude),
    night: 1 - smoothstep(-0.65, -0.08, sunAltitude)
  };
}

export function createFirstDayNightNoticeState(initialSunAltitude, { completed = false } = {}) {
  assertSunAltitude(initialSunAltitude);
  if (typeof completed !== "boolean") {
    throw new Error(`First day/night notice completed flag must be boolean: ${completed}`);
  }
  return {
    previousSunAltitude: initialSunAltitude,
    sunsetShown: completed,
    sunriseShown: completed
  };
}

export function snapshotFirstDayNightNoticeState(state) {
  assertFirstDayNightNoticeState(state);
  return {
    sunsetShown: state.sunsetShown,
    sunriseShown: state.sunriseShown
  };
}

export function restoreFirstDayNightNoticeState(snapshot, currentSunAltitude) {
  assertSunAltitude(currentSunAltitude);
  if (snapshot === undefined) {
    return createFirstDayNightNoticeState(currentSunAltitude, { completed: true });
  }
  if (!snapshot || typeof snapshot !== "object" ||
      typeof snapshot.sunsetShown !== "boolean" || typeof snapshot.sunriseShown !== "boolean") {
    throw new Error("Saved first day/night notice state is invalid");
  }
  if (snapshot.sunriseShown && !snapshot.sunsetShown) {
    throw new Error("Saved sunrise notice cannot precede sunset");
  }
  return {
    previousSunAltitude: currentSunAltitude,
    sunsetShown: snapshot.sunsetShown,
    sunriseShown: snapshot.sunriseShown
  };
}

export function advanceFirstDayNightNoticeState(state, { sunAltitude, elapsedVoyageMinutes }) {
  assertFirstDayNightNoticeState(state);
  assertSunAltitude(sunAltitude);
  if (!Number.isFinite(elapsedVoyageMinutes) || elapsedVoyageMinutes < 0) {
    throw new Error(`First day/night notice elapsed minutes are invalid: ${elapsedVoyageMinutes}`);
  }

  const previousSunAltitude = state.previousSunAltitude;
  state.previousSunAltitude = sunAltitude;
  if (state.sunriseShown) return null;
  if (elapsedVoyageMinutes > WEATHER_MINUTES_PER_DAY) {
    state.sunsetShown = true;
    state.sunriseShown = true;
    return null;
  }
  if (!state.sunsetShown &&
      previousSunAltitude >= FIRST_DAY_NIGHT_NOTICE_SUNSET_ALTITUDE &&
      sunAltitude < FIRST_DAY_NIGHT_NOTICE_SUNSET_ALTITUDE) {
    state.sunsetShown = true;
    return FIRST_DAY_NIGHT_NOTICE_SUNSET;
  }
  if (state.sunsetShown &&
      previousSunAltitude <= FIRST_DAY_NIGHT_NOTICE_SUNRISE_ALTITUDE &&
      sunAltitude > FIRST_DAY_NIGHT_NOTICE_SUNRISE_ALTITUDE) {
    state.sunriseShown = true;
    return FIRST_DAY_NIGHT_NOTICE_SUNRISE;
  }
  return null;
}

function assertFirstDayNightNoticeState(state) {
  if (!state || typeof state !== "object") {
    throw new Error("First day/night notice state is missing");
  }
  assertSunAltitude(state.previousSunAltitude);
  if (typeof state.sunsetShown !== "boolean" || typeof state.sunriseShown !== "boolean") {
    throw new Error("First day/night notice flags are invalid");
  }
  if (state.sunriseShown && !state.sunsetShown) {
    throw new Error("Sunrise notice cannot precede sunset");
  }
}

function assertSunAltitude(value) {
  if (!Number.isFinite(value) || value < -1 || value > 1) {
    throw new Error(`Sun altitude must be a finite unit value: ${value}`);
  }
}

function smoothstep(start, end, value) {
  const progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return progress * progress * (3 - 2 * progress);
}
