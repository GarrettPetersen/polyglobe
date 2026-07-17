export const DEMO_VOYAGE_LIMIT_SECONDS = 2 * 60 * 60;
export const DEMO_LIMIT_MESSAGE =
  "That's all the sailing we can do in the demo version. Buy the full version on Steam for more!";
export const DEMO_VOYAGE_OUTCOME = "Completed the two-hour demo voyage.";

export function startMenuEditionLabel(buildEditionId) {
  if (buildEditionId === "full") return null;
  if (buildEditionId === "demo") return "DEMO";
  throw new Error(`Unknown build edition for start menu: ${buildEditionId}`);
}

export function demoVoyageLimitReached(activePlaySeconds, configuredLimitSeconds) {
  if (!Number.isFinite(activePlaySeconds) || activePlaySeconds < 0) {
    throw new Error(`Invalid active play time for demo limit: ${activePlaySeconds}`);
  }
  if (configuredLimitSeconds === null) return false;
  if (!Number.isFinite(configuredLimitSeconds) || configuredLimitSeconds <= 0) {
    throw new Error(`Invalid configured demo voyage limit: ${configuredLimitSeconds}`);
  }
  return activePlaySeconds >= configuredLimitSeconds;
}
