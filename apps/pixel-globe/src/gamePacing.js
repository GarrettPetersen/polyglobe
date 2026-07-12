export const DEFAULT_GAME_TIME_SCALE = 7200;
export const SHIP_TOP_SPEED_SCALE = 0.85;

export function realSecondsPerGameDay(timeScale = DEFAULT_GAME_TIME_SCALE) {
  if (!Number.isFinite(timeScale) || timeScale <= 0) throw new Error(`Invalid game time scale: ${timeScale}`);
  return 86400 / timeScale;
}

export function voyageDurationMultiplier({
  previousTimeScale,
  nextTimeScale = DEFAULT_GAME_TIME_SCALE,
  shipSpeedScale = SHIP_TOP_SPEED_SCALE
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
