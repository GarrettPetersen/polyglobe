import assert from "node:assert/strict";
import test from "node:test";
import {
  COASTAL_HAUL_MOTION_SCALE,
  advanceRiverCenterline,
  blendRiverNavigationDirections,
  chooseRiverChannelDirection,
  findRiverGatewayDirection,
  heldShipHaulStrength,
  playerRiverGatewayAssistEligible,
  rememberCompletedRiverRailPath,
  selectRiverRailPath,
  shipHaulMotionScale,
  steerAlongRiverCenterline
} from "./riverNavigation.js";

test("ship hauling starts only after deliberate held input and ramps smoothly", () => {
  assert.equal(heldShipHaulStrength(0), 0);
  assert.equal(heldShipHaulStrength(0.18), 0);
  assert.ok(heldShipHaulStrength(0.43) > 0);
  assert.ok(heldShipHaulStrength(0.43) < 1);
  assert.equal(heldShipHaulStrength(0.68), 1);
  assert.equal(heldShipHaulStrength(3), 1);
});

test("coastal hauling is available only near shore and is much slower than river hauling", () => {
  assert.equal(shipHaulMotionScale({ inRiver: true, nearShore: true }), 1);
  assert.equal(shipHaulMotionScale({ inRiver: false, nearShore: true }), COASTAL_HAUL_MOTION_SCALE);
  assert.equal(shipHaulMotionScale({ inRiver: false, nearShore: false }), 0);
  assert.ok(COASTAL_HAUL_MOTION_SCALE > 0.2);
  assert.ok(COASTAL_HAUL_MOTION_SCALE <= 0.25);
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

test("player river-mouth help requires open-water intent and travel to agree", () => {
  assert.equal(playerRiverGatewayAssistEligible({
    currentKind: "openWater",
    intentDirection: { x: 1, y: 0 },
    travelDirection: { x: 0.8, y: 0.2 },
    gatewayDirection: { x: 0.9, y: 0.1 }
  }), true);
  assert.equal(playerRiverGatewayAssistEligible({
    currentKind: "openWater",
    intentDirection: { x: -1, y: 0 },
    travelDirection: { x: 1, y: 0 },
    gatewayDirection: { x: 1, y: 0 }
  }), false);
  assert.equal(playerRiverGatewayAssistEligible({
    currentKind: "openWater",
    intentDirection: { x: 1, y: 0 },
    travelDirection: { x: -1, y: 0 },
    gatewayDirection: { x: 1, y: 0 }
  }), false);
});

test("player river-mouth help remains generous when escaping from inside the river", () => {
  assert.equal(playerRiverGatewayAssistEligible({
    currentKind: "river",
    intentDirection: { x: -1, y: 0 },
    travelDirection: { x: 1, y: 0 },
    gatewayDirection: { x: -0.9, y: 0.1 }
  }), true);
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

test("river rail advances along the centerline in either direction", () => {
  const path = { x0: 0, y0: 0, cx: 5, cy: 3, x1: 10, y1: 0 };
  const forward = advanceRiverCenterline(path, 0.5, 2, 1);
  const reverse = advanceRiverCenterline(path, 0.5, 2, -1);

  assert.ok(forward.pathT > 0.5);
  assert.ok(reverse.pathT < 0.5);
  assert.ok(forward.x > reverse.x);
  assert.equal(forward.reachedEnd, false);
});

test("river rail stops at a centerline endpoint", () => {
  const path = { x0: 0, y0: 0, cx: 5, cy: 0, x1: 10, y1: 0 };
  const target = advanceRiverCenterline(path, 0.95, 20, 1);
  assert.equal(target.pathT, 1);
  assert.equal(target.x, 10);
  assert.equal(target.reachedEnd, true);
});

test("river rail keeps its active path at a crossing instead of vibrating between segments", () => {
  const probes = [
    { pathKey: "west-east", centerlineDistance: 0.4, tangent: { x: 1, y: 0 } },
    { pathKey: "north-south", centerlineDistance: 0.1, tangent: { x: 0, y: 1 } }
  ];
  const selection = selectRiverRailPath({
    probes,
    desiredDirection: { x: 0, y: 1 },
    activePathKey: "west-east",
    activeDirectionSign: 1
  });

  assert.equal(selection.probe.pathKey, "west-east");
  assert.equal(selection.directionSign, 1);
});

test("river rail excludes a completed segment and takes the best outgoing branch", () => {
  const probes = [
    { pathKey: "incoming", centerlineDistance: 0, tangent: { x: 1, y: 0 } },
    { pathKey: "wrong-branch", centerlineDistance: 0.2, tangent: { x: 0, y: -1 } },
    { pathKey: "route-branch", centerlineDistance: 0.3, tangent: { x: 0.9, y: 0.1 } }
  ];
  const selection = selectRiverRailPath({
    probes,
    desiredDirection: { x: 1, y: 0 },
    excludedPathKeys: ["incoming"]
  });

  assert.equal(selection.probe.pathKey, "route-branch");
  assert.equal(selection.directionSign, 1);
});

test("river rail excludes several recent segments instead of oscillating backward", () => {
  const probes = [
    { pathKey: "two-steps-back", centerlineDistance: 0.05, tangent: { x: 0, y: 1 } },
    { pathKey: "just-completed", centerlineDistance: 0.1, tangent: { x: 0, y: -1 } },
    { pathKey: "forward", centerlineDistance: 0.45, tangent: { x: 0.2, y: 1 } }
  ];
  const selection = selectRiverRailPath({
    probes,
    desiredDirection: { x: 0, y: 1 },
    excludedPathKeys: ["two-steps-back", "just-completed"]
  });

  assert.equal(selection.probe.pathKey, "forward");
  assert.equal(selection.directionSign, 1);
});

test("river rail completed-path memory is bounded and refreshes repeated keys", () => {
  assert.deepEqual(
    rememberCompletedRiverRailPath(["a", "b", "c"], "b", 3),
    ["a", "c", "b"]
  );
  assert.deepEqual(
    rememberCompletedRiverRailPath(["a", "b", "c"], "d", 3),
    ["b", "c", "d"]
  );
  assert.throws(
    () => rememberCompletedRiverRailPath(["a"], "", 3),
    /non-empty string/
  );
});
