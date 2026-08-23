import assert from "node:assert/strict";
import test from "node:test";
import {
  createShipModelBasisOrientation,
  orientCyc3wGalleonToCanonical,
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

test("the imported galleon bow, deck, and starboard axes map canonically", () => {
  const yaw = Math.PI / 9;
  const forward = orientCyc3wGalleonToCanonical({
    x: -Math.cos(yaw),
    y: 0,
    z: Math.sin(yaw)
  });
  const right = orientCyc3wGalleonToCanonical({
    x: Math.sin(yaw),
    y: 0,
    z: Math.cos(yaw)
  });
  const up = orientCyc3wGalleonToCanonical({ x: 0, y: 1, z: 0 });

  assert.ok(Math.abs(forward.x) < 1e-12);
  assert.ok(Math.abs(forward.y) < 1e-12);
  assert.ok(Math.abs(forward.z - 1) < 1e-12);
  assert.ok(Math.abs(right.x - 1) < 1e-12);
  assert.ok(Math.abs(right.y) < 1e-12);
  assert.ok(Math.abs(right.z) < 1e-12);
  assert.deepEqual(up, { x: 0, y: 1, z: 0 });
});

test("a measured source basis maps its bow, deck, and starboard axes canonically", () => {
  const orient = createShipModelBasisOrientation({
    right: { x: 0, y: 0, z: 1 },
    up: { x: 0, y: 1, z: 0 },
    forward: { x: -1, y: 0, z: 0 }
  }, "review ship");

  assert.deepEqual(orient({ x: -4, y: 3, z: 2 }), { x: 2, y: 3, z: 4 });
  assert.throws(
    () => createShipModelBasisOrientation({
      right: { x: 1, y: 0, z: 0 },
      up: { x: 1, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: 1 }
    }),
    /not perpendicular/
  );
});
