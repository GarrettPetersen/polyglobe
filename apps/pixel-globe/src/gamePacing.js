import { WORLD_GAME_TIME_SCALE, WORLD_KINEMATIC_SCALE } from "./worldScale.js";

export const DEFAULT_GAME_TIME_SCALE = WORLD_GAME_TIME_SCALE;
export const SHIP_TOP_SPEED_SCALE = 0.62;
export const SHIP_ACCELERATION_SCALE = 0.16;
export const SHIP_TURN_RATE_FLOOR_RAD = 0.30;
export const SHIP_TURN_RATE_SCALE = 0.55;

export function advanceGameClockMinutes(currentMinute, timing) {
  if (!Number.isFinite(currentMinute)) {
    throw new Error(`Invalid current game minute: ${currentMinute}`);
  }
  if (!timing || typeof timing !== "object" || Array.isArray(timing)) {
    throw new Error("Game clock advancement requires named real-time timing");
  }
  const {
    elapsedRealSeconds,
    timeScale = DEFAULT_GAME_TIME_SCALE
  } = timing;
  if (!Number.isFinite(elapsedRealSeconds) || elapsedRealSeconds < 0) {
    throw new Error(`Invalid elapsed real time for game clock: ${elapsedRealSeconds}`);
  }
  if (!Number.isFinite(timeScale) || timeScale < 0) {
    throw new Error(`Invalid game time scale: ${timeScale}`);
  }
  return currentMinute + elapsedRealSeconds * timeScale / 60;
}

export function realSecondsPerGameDay(timeScale = DEFAULT_GAME_TIME_SCALE) {
  if (!Number.isFinite(timeScale) || timeScale <= 0) throw new Error(`Invalid game time scale: ${timeScale}`);
  return 86400 / timeScale;
}

export function voyageDurationMultiplier({
  previousTimeScale,
  nextTimeScale = DEFAULT_GAME_TIME_SCALE,
  shipSpeedScale = SHIP_TOP_SPEED_SCALE * WORLD_KINEMATIC_SCALE
}) {
  if (!Number.isFinite(previousTimeScale) || previousTimeScale <= 0) {
    throw new Error(`Invalid previous game time scale: ${previousTimeScale}`);
  }
  if (!Number.isFinite(nextTimeScale) || nextTimeScale <= 0) {
    throw new Error(`Invalid next game time scale: ${nextTimeScale}`);
  }
  if (!Number.isFinite(shipSpeedScale) || shipSpeedScale <= 0) {
    throw new Error(`Invalid ship speed scale: ${shipSpeedScale}`);
  }
  return nextTimeScale / previousTimeScale / shipSpeedScale;
}
