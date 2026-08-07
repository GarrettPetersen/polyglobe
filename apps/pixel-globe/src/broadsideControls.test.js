import assert from "node:assert/strict";
import test from "node:test";
import {
  broadsideArcGeometry,
  broadsideHullEdgeDistance,
  broadsideReloadGeometry,
  hasBroadsideCannons,
  pointInBroadsideArc
} from "./broadsideControls.js";

test("broadside arcs begin on the baked hull edge instead of beyond it", () => {
  const footprint = [
    { x: 90, y: 98 },
    { x: 110, y: 98 },
    { x: 110, y: 104 },
    { x: 90, y: 104 }
  ];
  const starboard = broadsideArcGeometry({
    screenWidth: 200,
    screenHeight: 200,
    heading: { x: 1, y: 0 },
    sideName: "starboard",
    range: 60,
    origin: { x: 100, y: 100 },
    hullFootprint: footprint
  });
  const port = broadsideArcGeometry({
    screenWidth: 200,
    screenHeight: 200,
    heading: { x: 1, y: 0 },
    sideName: "port",
    range: 60,
    origin: { x: 100, y: 100 },
    hullFootprint: footprint
  });

  assert.equal(starboard.innerRadius, 4);
  assert.equal(port.innerRadius, 2);
  assert.equal(broadsideHullEdgeDistance(
    footprint,
    { x: 100, y: 100 },
    { x: 0, y: 1 }
  ), 4);
  assert.equal(pointInBroadsideArc({ x: 100, y: 103 }, starboard, 1), true);
});

test("broadside arcs extend from the correct side of a northbound ship", () => {
  const starboard = broadsideArcGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 0, y: -1 },
    sideName: "starboard",
    range: 60
  });
  const port = broadsideArcGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 0, y: -1 },
    sideName: "port",
    range: 60
  });

  assert.deepEqual(starboard.direction, { x: 1, y: 0 });
  assert.deepEqual(port.direction, { x: -1, y: 0 });
  assert.equal(pointInBroadsideArc({ x: 270, y: 128 }, starboard), true);
  assert.equal(pointInBroadsideArc({ x: 185, y: 128 }, starboard), false);
  assert.equal(pointInBroadsideArc({ x: 185, y: 128 }, port), true);
});

test("broadside arcs widen away from the hull and reject bow-on taps", () => {
  const arc = broadsideArcGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 0, y: -1 },
    sideName: "starboard",
    range: 60
  });

  assert.equal(pointInBroadsideArc({ x: 282, y: 110 }, arc), true);
  assert.equal(pointInBroadsideArc({ x: 228, y: 70 }, arc), false);
  assert.equal(pointInBroadsideArc({ x: 282, y: 92 }, arc), false);
});

test("broadside hit testing includes a touch pad outside the visible arc", () => {
  const arc = broadsideArcGeometry({
    screenWidth: 256,
    screenHeight: 455,
    heading: { x: 1, y: 0 },
    sideName: "starboard",
    range: 52
  });
  const nearOuterEdge = { x: 128, y: arc.origin.y + arc.outerRadius + 4 };
  assert.equal(pointInBroadsideArc(nearOuterEdge, arc), false);
  assert.equal(pointInBroadsideArc(nearOuterEdge, arc, 5), true);
});

test("broadside arcs can follow a freely moving ship", () => {
  const arc = broadsideArcGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 1, y: 0 },
    sideName: "starboard",
    range: 74,
    origin: { x: 91, y: 173 }
  });

  assert.deepEqual(arc.origin, { x: 91, y: 173 });
  assert.equal(pointInBroadsideArc({ x: 91, y: 200 }, arc), true);
  assert.equal(pointInBroadsideArc({ x: 227.5, y: 155 }, arc), false);
});

test("broadside reload fill advances outward through the firing sector", () => {
  const arc = broadsideArcGeometry({
    screenWidth: 455,
    screenHeight: 256,
    heading: { x: 1, y: 0 },
    sideName: "port",
    range: 72
  });

  assert.deepEqual(broadsideReloadGeometry(arc, 0), {
    readyFraction: 0,
    fillOuterRadius: arc.innerRadius,
    reloading: true
  });
  assert.equal(broadsideReloadGeometry(arc, 0.5).fillOuterRadius, arc.innerRadius + 36);
  assert.deepEqual(broadsideReloadGeometry(arc, 1), {
    readyFraction: 1,
    fillOuterRadius: arc.outerRadius,
    reloading: false
  });
  assert.throws(() => broadsideReloadGeometry(arc, 1.1), /Invalid broadside ready fraction/);
});

test("broadside controls require at least one cannon", () => {
  assert.equal(hasBroadsideCannons(0), false);
  assert.equal(hasBroadsideCannons(1), true);
  assert.equal(hasBroadsideCannons(12), true);
});
