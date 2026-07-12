import assert from "node:assert/strict";
import test from "node:test";
import {
  COASTAL_HAUL_MOTION_SCALE,
  advanceRiverCenterline,
  blendRiverNavigationDirections,
  chooseRiverChannelDirection,
  findRiverGatewayDirection,
  heldShipHaulStrength,
  shipHaulMotionScale,
  steerAlongRiverCenterline
} from "./riverNavigation.js";

test("ship hauling starts only after deliberate held input and ramps smoothly", () => {
  assert.equal(heldShipHaulStrength(0), 0);
  assert.equal(heldShipHaulStrength(0.28), 0);
  assert.ok(heldShipHaulStrength(0.64) > 0);
  assert.ok(heldShipHaulStrength(0.64) < 1);
  assert.equal(heldShipHaulStrength(1), 1);
  assert.equal(heldShipHaulStrength(3), 1);
});

test("coastal hauling is available only near shore and is much slower than river hauling", () => {
  assert.equal(shipHaulMotionScale({ inRiver: true, nearShore: true }), 1);
  assert.equal(shipHaulMotionScale({ inRiver: false, nearShore: true }), COASTAL_HAUL_MOTION_SCALE);
  assert.equal(shipHaulMotionScale({ inRiver: false, nearShore: false }), 0);
  assert.ok(COASTAL_HAUL_MOTION_SCALE > 0);
  assert.ok(COASTAL_HAUL_MOTION_SCALE < 0.25);
});

test("open-water ships are guided into a nearby river mouth in their forward cone", () => {
  const gateway = findRiverGatewayDirection({
    x: 0,
    y: 0,
    currentKind: "openWater",
    desiredDirection: { x: 1, y: 0 },
    sampleKindAt: (x, y) => x >= 4 && y >= 2 && y <= 6 ? "river" : "openWater"
  });

  assert.ok(gateway);
  assert.equal(gateway.targetKind, "river");
  assert.ok(gateway.x > 0);
  assert.ok(gateway.y > 0);
});

test("open-water ships acquire a distant mouth inside the forward cone", () => {
  const gateway = findRiverGatewayDirection({
    x: 0,
    y: 0,
    currentKind: "openWater",
    desiredDirection: { x: 1, y: 0 },
    sampleKindAt: (x, y) => x >= 16 && x <= 22 && y >= 18 && y <= 24 ? "river" : "openWater"
  });

  assert.ok(gateway);
  assert.equal(gateway.targetKind, "river");
  assert.ok(gateway.distance > 20);
  assert.ok(gateway.alignment >= 0.5);
});

test("open-water ships ignore a river mouth broadside to the bow", () => {
  const gateway = findRiverGatewayDirection({
    x: 0,
    y: 0,
    currentKind: "openWater",
    desiredDirection: { x: 1, y: 0 },
    sampleKindAt: (x, y) => x >= 5 && x <= 9 && y >= 24 && y <= 29 ? "river" : "openWater"
  });

  assert.equal(gateway, null);
});

test("river gateway help does not pull a ship toward water behind it", () => {
  const gateway = findRiverGatewayDirection({
    x: 0,
    y: 0,
    currentKind: "openWater",
    desiredDirection: { x: -1, y: 0 },
    sampleKindAt: (x, y) => x >= 4 && y >= 2 && y <= 6 ? "river" : "openWater"
  });
  assert.equal(gateway, null);
});

test("river ships are guided toward nearby open water when pointing out of the mouth", () => {
  const gateway = findRiverGatewayDirection({
    x: 5,
    y: 4,
    currentKind: "river",
    desiredDirection: { x: -1, y: -0.1 },
    sampleKindAt: (x) => x < 2 ? "openWater" : "river"
  });

  assert.ok(gateway);
  assert.equal(gateway.targetKind, "openWater");
  assert.ok(gateway.x < 0);
});

test("gateway steering can be blended without changing movement magnitude", () => {
  const direction = blendRiverNavigationDirections({ x: 1, y: 0 }, { x: 0, y: 1 }, 0.5);
  assert.ok(direction);
  assert.ok(Math.abs(Math.hypot(direction.x, direction.y) - 1) < 1e-9);
  assert.ok(direction.x > 0 && direction.y > 0);
});

test("NPC river guidance chooses the outgoing arm that advances its route", () => {
  const direction = chooseRiverChannelDirection({
    x: 0,
    y: 0,
    desiredDirection: { x: 0.8, y: 0.2 },
    headingDirection: { x: 0.4, y: 0.6 },
    endpoints: [
      { x: -8, y: -2 },
      { x: 4, y: 8 }
    ]
  });

  assert.ok(direction);
  assert.ok(direction.x > 0);
  assert.ok(direction.y > 0);
});

test("river centerline steering follows the locally downstream tangent", () => {
  const direction = steerAlongRiverCenterline({
    desiredDirection: { x: 0.3, y: 1 },
    headingDirection: { x: 0, y: 1 },
    tangent: { x: 0, y: -1 },
    outwardNormal: null,
    centerlineDistance: 0
  });

  assert.ok(direction);
  assert.ok(direction.y > 0.99);
});

test("river centerline steering pushes a ship away from the outside bank", () => {
  const direction = steerAlongRiverCenterline({
    desiredDirection: { x: 0, y: 1 },
    headingDirection: { x: 0, y: 1 },
    tangent: { x: 0, y: 1 },
    outwardNormal: { x: 1, y: 0 },
    centerlineDistance: 2.7
  });

  assert.ok(direction);
  assert.ok(direction.x < -0.5);
  assert.ok(direction.y > 0);
});

test("river conveyor advances along the centerline in either direction", () => {
  const path = { x0: 0, y0: 0, cx: 5, cy: 3, x1: 10, y1: 0 };
  const forward = advanceRiverCenterline(path, 0.5, 2, 1);
  const reverse = advanceRiverCenterline(path, 0.5, 2, -1);

  assert.ok(forward.pathT > 0.5);
  assert.ok(reverse.pathT < 0.5);
  assert.ok(forward.x > reverse.x);
  assert.equal(forward.reachedEnd, false);
});

test("river conveyor stops at a centerline endpoint", () => {
  const path = { x0: 0, y0: 0, cx: 5, cy: 0, x1: 10, y1: 0 };
  const target = advanceRiverCenterline(path, 0.95, 20, 1);
  assert.equal(target.pathT, 1);
  assert.equal(target.x, 10);
  assert.equal(target.reachedEnd, true);
});
