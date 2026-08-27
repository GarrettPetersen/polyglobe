export const PERIODIC_WORLD_CHECK_INTERVAL_MINUTES = 60;

export function periodicGameHourPeriod(previousPeriod, currentMinute) {
  if (previousPeriod !== null && (!Number.isInteger(previousPeriod) || previousPeriod < 0)) {
    throw new Error(`Invalid previous game-hour period: ${previousPeriod}`);
  }
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid current game-clock minute: ${currentMinute}`);
  }
  const period = Math.floor(currentMinute / PERIODIC_WORLD_CHECK_INTERVAL_MINUTES);
  return period;
}
