export const SOAK_BROWSER_LANE_TIMEOUT_MS = 60 * 60_000;
export const SOAK_RELEASE_MATRIX_TIMEOUT_MS = 2 * 60 * 60_000;

export function shouldRunReleaseBrowserMatrix({ browserEnabled, completedRuns }) {
  if (typeof browserEnabled !== "boolean") {
    throw new TypeError("browserEnabled must be a boolean");
  }
  if (!Number.isSafeInteger(completedRuns) || completedRuns < 0) {
    throw new TypeError("completedRuns must be a non-negative integer");
  }
  return browserEnabled && completedRuns === 0;
}
