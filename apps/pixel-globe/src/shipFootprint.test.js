import assert from "node:assert/strict";
import test from "node:test";

import {
  firstSegmentShipFootprintHit,
  pointInShipFootprint,
  shipFootprintCollision,
  shipFootprintFrame,
  shipFootprintPerimeterSamples,
  translatedShipFootprint,
  validateShipFootprintBake
} from "./shipFootprint.js";
import { SHIP_SPRITE_FRAME_SIZE, SHIP_SPRITE_HEADINGS } from "./shipSpriteLayout.js";

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
  const frames = Array.from({ length: SHIP_SPRITE_HEADINGS }, (_, frame) => ({ ...horizontal, frame }));
  assert.equal(shipFootprintFrame(frames, { x: 1, y: 0 }).frame, 0);
  assert.equal(shipFootprintFrame(frames, { x: 0, y: 1 }).frame, SHIP_SPRITE_HEADINGS / 4);
  assert.equal(shipFootprintFrame(frames, { x: -1, y: 0 }).frame, SHIP_SPRITE_HEADINGS / 2);
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

test("placement samples each edge of the baked hull perimeter", () => {
  const samples = shipFootprintPerimeterSamples(horizontal, 4);

  for (const corner of horizontal.polygon) {
    assert.ok(samples.some((point) => point.x === corner.x && point.y === corner.y));
  }
  assert.ok(samples.length >= 12);
  assert.ok(samples.every((point) => (
    point.x === -10 ||
    point.x === 10 ||
    point.y === -2 ||
    point.y === 2
  )));
});

test("footprint bakes fail loudly when a roster ship is absent", () => {
  assert.throws(
    () => validateShipFootprintBake(
      { frameSize: SHIP_SPRITE_FRAME_SIZE, headings: SHIP_SPRITE_HEADINGS, ships: {} },
      SHIP_SPRITE_FRAME_SIZE,
      SHIP_SPRITE_HEADINGS,
      ["caravel"]
    ),
    /missing: caravel/
  );
});

function extent(points, field) {
  return Math.max(...points.map((point) => point[field])) - Math.min(...points.map((point) => point[field]));
}
