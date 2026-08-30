import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_STREET_BUILDING_FOUNDATION_SOURCE_HEIGHT,
  cityStreetBuildingPlacements
} from "./cityStreetBuildings.js";

const FRAMES = Object.freeze([
  frame("Home", 95, 71, 1156, 414),
  frame("Home 2", 85, 79, 1027, 409),
  frame("Church", 195, 367, 142, 16),
  frame("Inn", 129, 101, 1057, 473),
  frame("Gate", 120, 120, 1200, 400)
]);

test("the shared church stays in the midground while rear-street homes remain modular", () => {
  const placements = cityStreetBuildingPlacements({
    features: { church: true },
    frames: FRAMES
  });
  assert.deepEqual(placements.map(({ slotId, layerName }) => [slotId, layerName]), [
    ["rear-center", "Home 2"],
    ["rear-east", "Home"]
  ]);
  assert.equal(placements.some(({ layerName }) => layerName === "Church"), false);
  assert.ok(placements.every((placement) => (
    placement.foundationHeight === CITY_STREET_BUILDING_FOUNDATION_SOURCE_HEIGHT
  )));
});

test("non-Christian ports leave the church slot empty", () => {
  const placements = cityStreetBuildingPlacements({
    features: { church: false },
    frames: FRAMES
  });
  assert.deepEqual(placements.map(({ layerName }) => layerName), ["Home 2", "Home"]);
});

test("ordinary buildings can be reassigned to any open slot while the gatehouse stays fixed", () => {
  const placements = cityStreetBuildingPlacements({
    features: {},
    frames: FRAMES,
    assignments: [
      { slotId: "rear-west", layerName: "Inn" },
      { slotId: "rear-center", layerName: "Home" }
    ]
  });
  assert.deepEqual(placements.map(({ layerName }) => layerName), ["Inn", "Home"]);
  assert.throws(() => cityStreetBuildingPlacements({
    features: {},
    frames: FRAMES,
    assignments: [{ slotId: "rear-west", layerName: "Gate" }]
  }), /fixed at the street terminus/);
});

function frame(layer, width, height, x, y) {
  return Object.freeze({
    id: layer,
    layer,
    frame: Object.freeze({ x: 0, y: 0, w: width, h: height }),
    spriteSourceSize: Object.freeze({ x, y, w: width, h: height })
  });
}
