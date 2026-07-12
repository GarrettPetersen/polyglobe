import assert from "node:assert/strict";
import test from "node:test";
import { broadsideLaneGeometry, pointInBroadsideLane } from "./broadsideControls.js";

test("broadside lanes extend from the correct side of a northbound ship", () => {
  const starboard = broadsideLaneGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 0, y: -1 },
    sideName: "starboard",
    range: 60
  });
  const port = broadsideLaneGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 0, y: -1 },
    sideName: "port",
    range: 60
  });

  assert.deepEqual(starboard.direction, { x: 1, y: 0 });
  assert.deepEqual(port.direction, { x: -1, y: 0 });
  assert.equal(pointInBroadsideLane({ x: 270, y: 128 }, starboard), true);
  assert.equal(pointInBroadsideLane({ x: 185, y: 128 }, starboard), false);
  assert.equal(pointInBroadsideLane({ x: 185, y: 128 }, port), true);
});

test("broadside hit testing includes a touch pad outside the visible lane", () => {
  const lane = broadsideLaneGeometry({
    screenWidth: 256,
    screenHeight: 455,
    heading: { x: 1, y: 0 },
    sideName: "starboard",
    range: 52
  });
  const nearEdge = { x: 128, y: 239 };
  assert.equal(pointInBroadsideLane(nearEdge, lane), false);
  assert.equal(pointInBroadsideLane(nearEdge, lane, 5), true);
});
