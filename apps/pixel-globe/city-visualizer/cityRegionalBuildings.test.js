import assert from "node:assert/strict";
import test from "node:test";

import {
  cityBuildingLogicalLayer,
  cityRegionalBuildingFrame
} from "./cityRegionalBuildings.js";

const FRAMES = Object.freeze([
  frame("Inn"),
  frame("Smith"),
  frame("Home"),
  frame("Home 2"),
  frame("Med Inn", { cityType: "mediterranean", regionalOf: "Inn" }),
  frame("Med Smith", { cityType: "mediterranean", regionalOf: "Smith" }),
  frame("Med Home", { cityType: "mediterranean", regionalOf: "Home" }),
  frame("Med Home 2", { cityType: "mediterranean", regionalOf: "Home 2" }),
  frame("Middle East Inn", { cityType: "islamic-desert", regionalOf: "Inn" })
]);

test("Mediterranean cities select all four authored regional building frames", () => {
  assert.deepEqual(
    ["Inn", "Smith", "Home", "Home 2"].map((baseLayer) => (
      cityRegionalBuildingFrame(FRAMES, "mediterranean", baseLayer).layer
    )),
    ["Med Inn", "Med Smith", "Med Home", "Med Home 2"]
  );
});

test("other regions retain the shared Northern European base frames", () => {
  assert.deepEqual(
    ["Inn", "Smith", "Home", "Home 2"].map((baseLayer) => (
      cityRegionalBuildingFrame(FRAMES, "northern-european", baseLayer).layer
    )),
    ["Inn", "Smith", "Home", "Home 2"]
  );
});

test("Middle Eastern cities use the authored inn and retain shared fallbacks elsewhere", () => {
  assert.deepEqual(
    ["Inn", "Smith", "Home", "Home 2"].map((baseLayer) => (
      cityRegionalBuildingFrame(FRAMES, "islamic-desert", baseLayer).layer
    )),
    ["Middle East Inn", "Smith", "Home", "Home 2"]
  );
});

test("regional frames preserve their logical building roles", () => {
  assert.equal(cityBuildingLogicalLayer(FRAMES[4]), "Inn");
  assert.equal(cityBuildingLogicalLayer(FRAMES[6]), "Home");
  assert.equal(cityBuildingLogicalLayer(FRAMES[0]), "Inn");
  assert.equal(cityBuildingLogicalLayer(FRAMES[8]), "Inn");
});

function frame(layer, extra = {}) {
  return Object.freeze({
    id: layer.toLowerCase().replaceAll(" ", "-"),
    layer,
    frame: Object.freeze({ x: 0, y: 0, w: 16, h: 16 }),
    spriteSourceSize: Object.freeze({ x: 0, y: 0, w: 16, h: 16 }),
    ...extra
  });
}
