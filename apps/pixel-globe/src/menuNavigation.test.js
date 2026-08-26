import assert from "node:assert/strict";
import test from "node:test";

import {
  BINARY_CONFIRM_NO_INDEX,
  BINARY_CONFIRM_YES_INDEX,
  clampMenuIndex,
  createBinaryConfirmationState,
  offsetMenuIndex,
  stepMenuIndex,
  toggleBinaryConfirmationIndex
} from "./menuNavigation.js";

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

test("menu pages can jump by a fixed offset and stop at either end", () => {
  assert.equal(offsetMenuIndex(20, -5, 46), 15);
  assert.equal(offsetMenuIndex(20, 5, 46), 25);
  assert.equal(offsetMenuIndex(2, -5, 46), 0);
  assert.equal(offsetMenuIndex(44, 5, 46), 45);
  assert.throws(() => offsetMenuIndex(0, 1.5, 46), /Invalid menu offset/);
});

test("destructive confirmations default to no and toggle between both choices", () => {
  assert.equal(createBinaryConfirmationState().selectedIndex, BINARY_CONFIRM_NO_INDEX);
  assert.equal(toggleBinaryConfirmationIndex(BINARY_CONFIRM_NO_INDEX), BINARY_CONFIRM_YES_INDEX);
  assert.equal(toggleBinaryConfirmationIndex(BINARY_CONFIRM_YES_INDEX), BINARY_CONFIRM_NO_INDEX);
  assert.throws(() => toggleBinaryConfirmationIndex(2), /Invalid binary confirmation index/);
});
