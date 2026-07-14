import assert from "node:assert/strict";
import test from "node:test";
import {
  orientNegativeXForwardYUpToZForward,
  orientPositiveXForwardToZForward,
  orientPositiveXForwardZUpToZForward,
  orientYForwardZDownToZForward,
  rotateY
} from "./shipModelOrientation.js";

test("Y-up negative-X-forward source ships become Y-up and Z-forward", () => {
  assert.deepEqual(
    orientNegativeXForwardYUpToZForward({ x: -4, y: 2, z: 1 }),
    { x: 1, y: 2, z: 4 }
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

test("source presentation yaw can be removed without changing height", () => {
  const corrected = rotateY({ x: Math.sin(Math.PI / 9), y: 2, z: Math.cos(Math.PI / 9) }, -Math.PI / 9);
  assert.ok(Math.abs(corrected.x) < 1e-12);
  assert.ok(Math.abs(corrected.z - 1) < 1e-12);
  assert.equal(corrected.y, 2);
  assert.throws(
    () => rotateY({ x: 0, y: 0, z: 1 }, Number.NaN),
    /finite coordinates and angle/
  );
});
