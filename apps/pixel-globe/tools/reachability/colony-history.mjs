import { isDeepStrictEqual } from "node:util";

export function colonyHistoryChanges(expected, actual) {
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort().filter(key => {
    if (key === "distanceKm" && Number.isFinite(expected[key]) && Number.isFinite(actual[key])) {
      // Recomputing a derived distance after JSON restoration can differ by a
      // few floating-point rounding steps. Decisions, dates and IDs stay exact.
      const toleranceKm = 4 * Number.EPSILON * Math.max(1, Math.abs(expected[key]), Math.abs(actual[key]));
      return Math.abs(expected[key] - actual[key]) > toleranceKm;
    }
    return !isDeepStrictEqual(expected[key], actual[key]) ||
      Object.hasOwn(expected, key) !== Object.hasOwn(actual, key);
  }).map(key => ({ key, expected: expected[key], actual: actual[key] }));
}
