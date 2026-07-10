import assert from "node:assert/strict";
import test from "node:test";
import {
  blendRiverNavigationDirections,
  chooseRiverChannelDirection,
  findRiverGatewayDirection
} from "./riverNavigation.js";

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

test("open-water ships acquire a distant mouth when pointed only vaguely toward it", () => {
  const gateway = findRiverGatewayDirection({
    x: 0,
    y: 0,
    currentKind: "openWater",
    desiredDirection: { x: 1, y: 0 },
    sampleKindAt: (x, y) => x >= 5 && x <= 9 && y >= 24 && y <= 29 ? "river" : "openWater"
  });

  assert.ok(gateway);
  assert.equal(gateway.targetKind, "river");
  assert.ok(gateway.distance > 20);
  assert.ok(gateway.alignment < 0.4);
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
