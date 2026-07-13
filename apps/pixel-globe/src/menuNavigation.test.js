import assert from "node:assert/strict";
import test from "node:test";

import { clampMenuIndex, stepMenuIndex } from "./menuNavigation.js";

test("menu selection stops at either end instead of looping", () => {
  assert.equal(stepMenuIndex(0, -1, 4), 0);
  assert.equal(stepMenuIndex(0, 1, 4), 1);
  assert.equal(stepMenuIndex(3, 1, 4), 3);
  assert.equal(stepMenuIndex(3, -1, 4), 2);
});

test("out-of-range menu pages clamp to the nearest valid page", () => {
  assert.equal(clampMenuIndex(-20, 3), 0);
  assert.equal(clampMenuIndex(20, 3), 2);
});
