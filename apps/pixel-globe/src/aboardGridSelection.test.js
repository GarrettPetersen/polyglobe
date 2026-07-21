import assert from "node:assert/strict";
import test from "node:test";

import { stepAboardGridIndex } from "./aboardGridSelection.js";

test("aboard grid selection follows rows and columns without wrapping", () => {
  assert.equal(stepAboardGridIndex(1, "left", 6, 3), 0);
  assert.equal(stepAboardGridIndex(1, "right", 6, 3), 2);
  assert.equal(stepAboardGridIndex(1, "down", 6, 3), 4);
  assert.equal(stepAboardGridIndex(4, "up", 6, 3), 1);
  assert.equal(stepAboardGridIndex(0, "left", 6, 3), 0);
  assert.equal(stepAboardGridIndex(2, "right", 6, 3), 2);
});

test("aboard grid selection clamps into a short final row", () => {
  assert.equal(stepAboardGridIndex(2, "down", 5, 3), 4);
  assert.equal(stepAboardGridIndex(4, "right", 5, 3), 4);
  assert.equal(stepAboardGridIndex(4, "up", 5, 3), 1);
});

test("aboard grid selection rejects malformed navigation", () => {
  assert.throws(() => stepAboardGridIndex(0, "diagonal", 4, 2), /direction/);
  assert.throws(() => stepAboardGridIndex(4, "left", 4, 2), /index/);
  assert.throws(() => stepAboardGridIndex(0, "left", 0, 1), /item count/);
  assert.throws(() => stepAboardGridIndex(0, "left", 4, 5), /column count/);
});
