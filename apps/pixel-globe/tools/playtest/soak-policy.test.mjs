import assert from "node:assert/strict";
import test from "node:test";

import {
  SOAK_BROWSER_LANE_TIMEOUT_MS,
  SOAK_RELEASE_MATRIX_TIMEOUT_MS,
  shouldRunReleaseBrowserMatrix
} from "./soak-policy.mjs";

test("the exhaustive release matrix runs exactly once during a browser soak", () => {
  assert.equal(shouldRunReleaseBrowserMatrix({ browserEnabled: true, completedRuns: 0 }), true);
  assert.equal(shouldRunReleaseBrowserMatrix({ browserEnabled: true, completedRuns: 1 }), false);
  assert.equal(shouldRunReleaseBrowserMatrix({ browserEnabled: true, completedRuns: 2 }), false);
  assert.equal(shouldRunReleaseBrowserMatrix({ browserEnabled: false, completedRuns: 0 }), false);
});

test("the aggregate release matrix can outlive a recurring browser lane", () => {
  assert.equal(SOAK_BROWSER_LANE_TIMEOUT_MS, 60 * 60_000);
  assert.equal(SOAK_RELEASE_MATRIX_TIMEOUT_MS, 2 * SOAK_BROWSER_LANE_TIMEOUT_MS);
});

test("release matrix policy rejects invalid run counts", () => {
  assert.throws(
    () => shouldRunReleaseBrowserMatrix({ browserEnabled: true, completedRuns: -1 }),
    /completedRuns must be a non-negative integer/
  );
});
