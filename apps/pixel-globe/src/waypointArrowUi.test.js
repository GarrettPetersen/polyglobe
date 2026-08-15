import assert from "node:assert/strict";
import test from "node:test";

import {
  formatWaypointLabel,
  waypointArrowDirectionFromCenter,
  waypointArrowEdgePoint,
  waypointArrowGeometry,
  waypointPointOverlapsReservedRects
} from "./waypointArrowUi.js";

test("bottom waypoint arrows stop above reserved action controls", () => {
  const control = { x: 150, y: 220, w: 156, h: 36 };
  assert.deepEqual(
    waypointArrowEdgePoint({
      direction: { x: 0, y: 1 },
      screenWidth: 455,
      screenHeight: 256,
      margin: 15,
      reservedRects: [control],
      clearance: 4
    }),
    { x: 228, y: 215 }
  );
});

test("diagonal waypoint arrows still choose the first reachable safe edge", () => {
  const point = waypointArrowEdgePoint({
    direction: { x: 1, y: 1 },
    screenWidth: 455,
    screenHeight: 256,
    margin: 15,
    maxY: 215
  });
  assert.equal(point.y, 215);
  assert.ok(point.x < 440);
});

test("waypoint arrows treat HUD panels as inner viewport edges", () => {
  const reservedRects = [
    { x: 0, y: 0, w: 130, h: 58 },
    { x: 190, y: 220, w: 180, h: 36 }
  ];
  const topLeft = waypointArrowEdgePoint({
    direction: { x: -1, y: -1 },
    screenWidth: 455,
    screenHeight: 256,
    margin: 15,
    reservedRects,
    clearance: 8
  });
  const bottom = waypointArrowEdgePoint({
    direction: { x: 0, y: 1 },
    screenWidth: 455,
    screenHeight: 256,
    margin: 15,
    reservedRects,
    clearance: 8
  });
  assert.equal(waypointPointOverlapsReservedRects(topLeft, reservedRects, 8), false);
  assert.equal(waypointPointOverlapsReservedRects(bottom, reservedRects, 8), false);
  assert.ok(topLeft.x > 138 || topLeft.y > 66);
  assert.ok(bottom.y < 212);
});

test("waypoint arrows slide along stacked anchor dock and fish controls", () => {
  const bottomControls = [
    { x: 103, y: 223, w: 88, h: 28 },
    { x: 195, y: 223, w: 156, h: 28 },
    { x: 150, y: 191, w: 156, h: 28 }
  ];
  const leftBearing = waypointArrowEdgePoint({
    direction: { x: -0.12, y: 1 },
    screenWidth: 455,
    screenHeight: 256,
    margin: 15,
    reservedRects: bottomControls,
    clearance: 11
  });
  const rightBearing = waypointArrowEdgePoint({
    direction: { x: 0.12, y: 1 },
    screenWidth: 455,
    screenHeight: 256,
    margin: 15,
    reservedRects: bottomControls,
    clearance: 11
  });

  assert.equal(waypointPointOverlapsReservedRects(leftBearing, bottomControls, 11), false);
  assert.equal(waypointPointOverlapsReservedRects(rightBearing, bottomControls, 11), false);
  assert.ok(leftBearing.y < 180);
  assert.ok(rightBearing.y < 180);
  assert.ok(leftBearing.x < rightBearing.x);
});

test("waypoint perimeter detours remain continuous across a bearing sweep", () => {
  const bottomControls = [
    { x: 103, y: 223, w: 88, h: 28 },
    { x: 195, y: 223, w: 156, h: 28 },
    { x: 150, y: 191, w: 156, h: 28 }
  ];
  let previous = null;
  let maximumJump = 0;
  for (let degrees = 25; degrees <= 155; degrees += 0.25) {
    const angle = degrees * Math.PI / 180;
    const point = waypointArrowEdgePoint({
      direction: { x: Math.cos(angle), y: Math.sin(angle) },
      screenWidth: 455,
      screenHeight: 256,
      margin: 15,
      reservedRects: bottomControls,
      clearance: 11
    });
    if (previous) maximumJump = Math.max(maximumJump, Math.hypot(
      point.x - previous.x,
      point.y - previous.y
    ));
    previous = point;
  }
  assert.ok(maximumJump <= 4, `waypoint track jumped ${maximumJump.toFixed(2)}px`);
});

test("an on-screen destination hidden by the HUD points from the HUD inner edge", () => {
  const panel = { x: 0, y: 0, w: 130, h: 58 };
  const destination = { x: 55, y: 34 };
  const direction = waypointArrowDirectionFromCenter({
    point: destination,
    screenWidth: 455,
    screenHeight: 256
  });
  const point = waypointArrowEdgePoint({
    direction,
    screenWidth: 455,
    screenHeight: 256,
    margin: 15,
    reservedRects: [panel],
    clearance: 8
  });

  assert.equal(waypointPointOverlapsReservedRects(point, [panel], 8), false);
  assert.ok(point.y >= panel.y + panel.h + 8);
  assert.ok(point.x > panel.x && point.x < panel.x + panel.w);
});

test("covered waypoint direction uses finite two-dimensional coordinates", () => {
  const direction = waypointArrowDirectionFromCenter({
    point: { x: 55, y: 34 },
    screenWidth: 455,
    screenHeight: 256
  });
  assert.ok(Number.isFinite(direction.x));
  assert.ok(Number.isFinite(direction.y));
  assert.ok(Math.abs(Math.hypot(direction.x, direction.y) - 1) < 1e-9);
  assert.equal(waypointArrowDirectionFromCenter({
    point: { x: 227.5, y: 128 },
    screenWidth: 455,
    screenHeight: 256
  }), null);
});

test("waypoint arrow geometry includes a generous pointer hitbox", () => {
  const geometry = waypointArrowGeometry({
    point: { x: 100, y: 200 },
    direction: { x: 0, y: 1 },
    size: 7,
    width: 4
  });
  assert.deepEqual(geometry.tip, { x: 100, y: 200 });
  assert.deepEqual(geometry.base, { x: 100, y: 193 });
  assert.ok(geometry.hitRect.x <= 96);
  assert.ok(geometry.hitRect.x + geometry.hitRect.w >= 105);
  assert.ok(geometry.hitRect.y <= 189);
  assert.ok(geometry.hitRect.y + geometry.hitRect.h >= 205);
});

test("waypoint labels use glanceable rounded distances", () => {
  assert.equal(formatWaypointLabel("Mt. Athos", 1247), "Mt. Athos, 1,200 km");
  assert.equal(formatWaypointLabel("Cairo", 846), "Cairo, 850 km");
  assert.equal(formatWaypointLabel("Port", 42.4), "Port, 42 km");
});

test("waypoint geometry and labels reject malformed input", () => {
  assert.throws(
    () => waypointArrowEdgePoint({
      direction: { x: 0, y: 0 },
      screenWidth: 455,
      screenHeight: 256,
      margin: 15
    }),
    /cannot be zero/
  );
  assert.throws(() => formatWaypointLabel("", 100), /destination name/);
  assert.throws(() => formatWaypointLabel("Cairo", -1), /non-negative distance/);
});
