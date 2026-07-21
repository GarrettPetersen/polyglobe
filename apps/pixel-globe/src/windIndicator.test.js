import assert from "node:assert/strict";
import test from "node:test";
import {
  windVArmLengthPx,
  windVFlowDirectionForScreenVector,
  windVGeometry,
  windVOpacity
} from "./windIndicator.js";

test("wind V boundaries match the ship dead-zone angle", () => {
  const deadZoneHalfAngleRad = 40 * Math.PI / 180;
  const geometry = windVGeometry({
    centerX: 227.5,
    centerY: 128,
    flowDirectionRad: 0,
    deadZoneHalfAngleRad,
    windStrength: 0.7,
    radiusPx: 20
  });

  assert.ok(Math.abs(angleBetween(geometry.portBoundary, geometry.starboardBoundary) - deadZoneHalfAngleRad * 2) < 1e-9);
  assert.ok((geometry.port.y - geometry.apex.y) * (geometry.starboard.y - geometry.apex.y) < 0);
});

test("the wind V sits upwind of the ship and opens farther into the no-go zone", () => {
  const geometry = windVGeometry({
    centerX: 100,
    centerY: 80,
    flowDirectionRad: 0,
    deadZoneHalfAngleRad: 40 * Math.PI / 180,
    windStrength: 0.7,
    radiusPx: 20
  });

  assert.ok(geometry.apex.x < 100, "apex should be opposite the downwind flow");
  assert.ok(geometry.port.x < geometry.apex.x);
  assert.ok(geometry.starboard.x < geometry.apex.x);
});

test("better windward ships draw a narrower wind V", () => {
  const narrow = windVGeometry({
    centerX: 128,
    centerY: 128,
    flowDirectionRad: Math.PI / 2,
    deadZoneHalfAngleRad: 30 * Math.PI / 180,
    windStrength: 0.6,
    radiusPx: 20
  });
  const broad = windVGeometry({
    centerX: 128,
    centerY: 128,
    flowDirectionRad: Math.PI / 2,
    deadZoneHalfAngleRad: 60 * Math.PI / 180,
    windStrength: 0.6,
    radiusPx: 20
  });

  assert.ok(angleBetween(narrow.portBoundary, narrow.starboardBoundary) < angleBetween(broad.portBoundary, broad.starboardBoundary));
  assert.equal(narrow.armLengthPx, broad.armLengthPx);
});

test("wind V arms exaggerate the difference between calm and storm winds", () => {
  assert.ok(windVArmLengthPx(0.2) <= 5);
  assert.ok(windVArmLengthPx(0.8) >= 18);
  assert.ok(windVArmLengthPx(1.25) >= 35);
  assert.ok(windVArmLengthPx(1.25) >= windVArmLengthPx(0.2) * 7);
  assert.equal(windVArmLengthPx(5), windVArmLengthPx(1.25));
});

test("the wind V remains legible even in light wind", () => {
  assert.ok(windVOpacity(0.05) > 0.55);
  assert.ok(windVOpacity(1) > windVOpacity(0.05));
  assert.ok(windVOpacity(0.4, 1, 1) > windVOpacity(0.4, 0, 1));
});

test("an oar-powered ship collapses the wind V to show no dead zone", () => {
  const geometry = windVGeometry({
    centerX: 128,
    centerY: 128,
    flowDirectionRad: 0,
    deadZoneHalfAngleRad: 0,
    windStrength: 0.6,
    radiusPx: 20
  });

  assert.deepEqual(geometry.portBoundary, geometry.starboardBoundary);
  assert.deepEqual(geometry.port, geometry.starboard);
});

test("screen-space lake wind converts to the renderer angle without vertical mirroring", () => {
  const cardinals = [
    { flow: { x: 1, y: 0 }, expectedUpwind: { x: -1, y: 0 } },
    { flow: { x: 0, y: 1 }, expectedUpwind: { x: 0, y: -1 } },
    { flow: { x: -1, y: 0 }, expectedUpwind: { x: 1, y: 0 } },
    { flow: { x: 0, y: -1 }, expectedUpwind: { x: 0, y: 1 } }
  ];
  for (const { flow, expectedUpwind } of cardinals) {
    const geometry = windVGeometry({
      centerX: 100,
      centerY: 100,
      flowDirectionRad: windVFlowDirectionForScreenVector(flow.x, flow.y),
      deadZoneHalfAngleRad: Math.PI / 4,
      windStrength: 0.6,
      radiusPx: 20
    });
    const apexDirection = normalize({
      x: geometry.apex.x - 100,
      y: geometry.apex.y - 100
    });
    assert.ok(dot(apexDirection, expectedUpwind) > 0.99);
  }
});

test("screen-space wind conversion rejects invalid vectors", () => {
  assert.throws(() => windVFlowDirectionForScreenVector(0, 0), /zero length/);
  assert.throws(() => windVFlowDirectionForScreenVector(Number.NaN, 1), /Invalid wind V screen flow/);
});

function angleBetween(a, b) {
  const dot = a.x * b.x + a.y * b.y;
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  return { x: vector.x / length, y: vector.y / length };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}
