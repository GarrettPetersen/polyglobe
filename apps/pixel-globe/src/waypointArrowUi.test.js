import assert from "node:assert/strict";
import test from "node:test";

import {
  formatWaypointLabel,
  waypointArrowEdgePoint,
  waypointArrowGeometry,
  waypointArrowMaxY,
  waypointPointOverlapsReservedRects
} from "./waypointArrowUi.js";

test("bottom waypoint arrows stop above reserved action controls", () => {
  const maxY = waypointArrowMaxY({
    screenHeight: 256,
    margin: 15,
    controlRects: [{ x: 150, y: 191, w: 156, h: 28 }],
    gap: 4
  });
  assert.equal(maxY, 187);
  assert.deepEqual(
    waypointArrowEdgePoint({
      direction: { x: 0, y: 1 },
      screenWidth: 455,
      screenHeight: 256,
      margin: 15,
      maxY
    }),
    { x: 228, y: 187 }
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

test("waypoint arrows slide along the viewport edge around HUD panels", () => {
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
  assert.ok(bottom.x < 182 || bottom.x > 378);
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
  assert.throws(
    () => waypointArrowMaxY({
      screenHeight: 256,
      margin: 15,
      controlRects: [{}],
      gap: 4
    }),
    /finite top edge/
  );
});
