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
const FRAMES_WITH_MEDITERRANEAN = Object.freeze([
  ...FRAMES,
  regionalFrame("Med Home", "Home", 95, 71, 1156, 414),
  regionalFrame("Med Home 2", "Home 2", 85, 69, 1027, 419),
  regionalFrame("Med Inn", "Inn", 129, 101, 1057, 473)
]);
const FRAMES_WITH_MIDDLE_EAST = Object.freeze([
  ...FRAMES,
  regionalFrame("Middle East Home", "Home", 99, 56, 1154, 429, "islamic-desert")
]);
const FRAMES_WITH_EARTHEN_HUTS = Object.freeze([
  ...FRAMES,
  regionalFrame("Earthen Hut", "Home", 68, 54, 0, 17, "earthen-village", false),
  regionalFrame("Earthen Hut Large", "Home 2", 88, 68, 0, 11, "earthen-village", false)
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

test("Mediterranean street slots use regional art while retaining logical roles", () => {
  const placements = cityStreetBuildingPlacements({
    features: { church: true },
    frames: FRAMES_WITH_MEDITERRANEAN,
    cityType: "mediterranean"
  });
  assert.deepEqual(placements.map(({ layerName, frame: source }) => (
    [layerName, source.layer, source.regionalOf]
  )), [
    ["Home 2", "Med Home 2", "Home 2"],
    ["Home", "Med Home", "Home"]
  ]);
  assert.ok(placements.every(({ wallBottomY }) => Number.isInteger(wallBottomY)));
});

test("Middle Eastern street slots reuse Home A for Home B without exposing northern art", () => {
  const placements = cityStreetBuildingPlacements({
    features: {},
    frames: FRAMES_WITH_MIDDLE_EAST,
    cityType: "islamic-desert"
  });
  assert.deepEqual(placements.map(({ layerName, frame: source }) => (
    [layerName, source.layer, source.regionalOf]
  )), [
    ["Home 2", "Middle East Home", "Home 2"],
    ["Home", "Middle East Home", "Home"]
  ]);
});

test("sparse earthen settlements repeat both huts across the rear, business, and foreground slots", () => {
  const placements = cityStreetBuildingPlacements({
    features: { primitiveSettlement: true },
    frames: FRAMES_WITH_EARTHEN_HUTS,
    buildingStyle: "earthen-village"
  });
  assert.deepEqual(placements.map(({ slotId, layerName, frame: source }) => (
    [slotId, layerName, source.layer]
  )), [
    ["rear-center", "Home 2", "Earthen Hut Large"],
    ["rear-east", "Home", "Earthen Hut"],
    ["business-east", "Home", "Earthen Hut"],
    ["foreground-east", "Home 2", "Earthen Hut Large"]
  ]);
  assert.ok(placements.every(({ frame: source }) => source.hasChimney === false));
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

function regionalFrame(
  layer,
  regionalOf,
  width,
  height,
  x,
  y,
  cityType = "mediterranean",
  hasChimney = true
) {
  return Object.freeze({
    ...frame(layer, width, height, x, y),
    cityType,
    regionalOf,
    hasChimney
  });
}
