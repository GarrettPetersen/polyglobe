import assert from "node:assert/strict";
import test from "node:test";
import {
  orientXForwardToZForward,
  orientPositiveXForwardToZForward,
  orientPositiveXForwardZUpToZForward,
  orientYForwardZDownToZForward
} from "./shipModelOrientation.js";

test("X-forward source ships become Y-up and Z-forward", () => {
  assert.deepEqual(
    orientXForwardToZForward({ x: 4, y: 2, z: 1 }),
    { x: 1, y: 2, z: -4 }
  );
});

test("positive-X-forward source ships keep their bow on positive Z", () => {
  assert.deepEqual(
    orientPositiveXForwardToZForward({ x: 4, y: 2, z: 1 }),
    { x: -1, y: 2, z: 4 }
  );
});

test("Z-up positive-X-forward source ships become Y-up and Z-forward", () => {
  assert.deepEqual(
    orientPositiveXForwardZUpToZForward({ x: 4, y: 2, z: 1 }),
    { x: 2, y: 1, z: 4 }
  );
});

test("Y-forward Z-down source ships become Y-up without reversing forward", () => {
  assert.deepEqual(
    orientYForwardZDownToZForward({ x: 1, y: 4, z: -2 }),
    { x: -1, y: 2, z: -4 }
  );
});
