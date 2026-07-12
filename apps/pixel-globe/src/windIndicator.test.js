import assert from "node:assert/strict";
import test from "node:test";
import { windVArmLengthPx, windVGeometry } from "./windIndicator.js";

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

test("wind V arms lengthen with wind speed and cap in extreme storms", () => {
  assert.ok(windVArmLengthPx(0.8) > windVArmLengthPx(0.2));
  assert.ok(windVArmLengthPx(1.25) > windVArmLengthPx(0.8));
  assert.equal(windVArmLengthPx(5), windVArmLengthPx(1.25));
});

function angleBetween(a, b) {
  const dot = a.x * b.x + a.y * b.y;
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}
