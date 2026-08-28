import { WORLD_GAME_TIME_SCALE, WORLD_KINEMATIC_SCALE } from "./worldScale.js";

export const DEFAULT_GAME_TIME_SCALE = WORLD_GAME_TIME_SCALE;
export const SHIP_TOP_SPEED_SCALE = 0.78;
export const SHIP_ACCELERATION_SCALE = 0.24;

export function advanceGameClockMinutes(currentMinute, elapsedSeconds, timeScale = DEFAULT_GAME_TIME_SCALE) {
  if (!Number.isFinite(currentMinute)) {
    throw new Error(`Invalid current game minute: ${currentMinute}`);
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error(`Invalid elapsed game time: ${elapsedSeconds}`);
  }
  if (!Number.isFinite(timeScale) || timeScale < 0) {
    throw new Error(`Invalid game time scale: ${timeScale}`);
  }
  return currentMinute + elapsedSeconds * timeScale / 60;
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
