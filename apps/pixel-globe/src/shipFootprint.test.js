import assert from "node:assert/strict";
import test from "node:test";

import {
  firstSegmentShipFootprintHit,
  pointInShipFootprint,
  shipFootprintCollision,
  shipFootprintFrame,
  translatedShipFootprint,
  validateShipFootprintBake
} from "./shipFootprint.js";

const horizontal = Object.freeze({
  polygon: Object.freeze([
    Object.freeze({ x: -10, y: -2 }),
    Object.freeze({ x: 10, y: -2 }),
    Object.freeze({ x: 10, y: 2 }),
    Object.freeze({ x: -10, y: 2 })
  ]),
  samples: Object.freeze([
    Object.freeze({ x: -10, y: 0 }),
    Object.freeze({ x: 0, y: 0 }),
    Object.freeze({ x: 10, y: 0 })
  ])
});

test("heading lookup chooses the matching discrete baked footprint", () => {
  const frames = Array.from({ length: 16 }, (_, frame) => ({ ...horizontal, frame }));
  assert.equal(shipFootprintFrame(frames, { x: 1, y: 0 }).frame, 0);
  assert.equal(shipFootprintFrame(frames, { x: 0, y: 1 }).frame, 4);
  assert.equal(shipFootprintFrame(frames, { x: -1, y: 0 }).frame, 8);
});

test("projectiles hit the drawn hull footprint and miss empty bounding-circle corners", () => {
  const polygon = translatedShipFootprint(horizontal, 20, 20);
  const hit = firstSegmentShipFootprintHit({ x: 0, y: 20 }, { x: 40, y: 20 }, polygon);
  assert.ok(hit);
  assert.equal(hit.x, 10);
  assert.equal(firstSegmentShipFootprintHit({ x: 0, y: 15 }, { x: 40, y: 15 }, polygon), null);
});

test("ship overlap uses polygon geometry rather than center radii", () => {
  const a = translatedShipFootprint(horizontal, 0, 0);
  const clear = translatedShipFootprint(horizontal, 0, 5);
  const overlap = translatedShipFootprint(horizontal, 0, 3);
  assert.equal(shipFootprintCollision(a, clear), null);
  assert.ok(shipFootprintCollision(a, overlap));
  assert.equal(pointInShipFootprint({ x: 9, y: 1 }, a), true);
  assert.equal(pointInShipFootprint({ x: 9, y: 3 }, a), false);
});

test("footprint bakes fail loudly when a roster ship is absent", () => {
  assert.throws(
    () => validateShipFootprintBake({ frameSize: 47, headings: 16, ships: {} }, 47, 16, ["caravel"]),
    /missing: caravel/
  );
});

function extent(points, field) {
  return Math.max(...points.map((point) => point[field])) - Math.min(...points.map((point) => point[field]));
}
