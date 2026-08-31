import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  frame("Far Castle"),
  frame("Gate"),
  frame("Near Castle"),
  frame("Med Inn", { cityType: "mediterranean", regionalOf: "Inn" }),
  frame("Med Smith", { cityType: "mediterranean", regionalOf: "Smith" }),
  frame("Med Home", { cityType: "mediterranean", regionalOf: "Home" }),
  frame("Med Home 2", { cityType: "mediterranean", regionalOf: "Home 2" }),
  frame("Middle East Inn", { cityType: "islamic-desert", regionalOf: "Inn" }),
  frame("Middle East Home", { cityType: "islamic-desert", regionalOf: "Home" }),
  frame("Middle East Smith", { cityType: "islamic-desert", regionalOf: "Smith" }),
  frame("Middle East Far Wall", { cityType: "islamic-desert", regionalOf: "Far Castle" }),
  frame("Middle East Gate", { cityType: "islamic-desert", regionalOf: "Gate" }),
  frame("Middle East Near Wall", { cityType: "islamic-desert", regionalOf: "Near Castle" })
]);

const EXPORTED_FRAMES = JSON.parse(readFileSync(
  new URL("./assets/port-parallax/manifest.json", import.meta.url),
  "utf8"
)).staticFrames;

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

test("Middle Eastern cities use every authored regional frame and reuse Home A for unfinished Home B", () => {
  const selected = ["Inn", "Smith", "Home", "Home 2", "Far Castle", "Gate", "Near Castle"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "islamic-desert", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), [
    "Middle East Inn",
    "Middle East Smith",
    "Middle East Home",
    "Middle East Home",
    "Middle East Far Wall",
    "Middle East Gate",
    "Middle East Near Wall"
  ]);
  assert.equal(selected[3].regionalOf, "Home 2");
  assert.match(selected[3].id, /as-home-2$/);
});

test("regional frames preserve their logical building roles", () => {
  for (const [layer, logicalLayer] of [
    ["Med Inn", "Inn"],
    ["Med Home", "Home"],
    ["Inn", "Inn"],
    ["Middle East Inn", "Inn"],
    ["Middle East Home", "Home"],
    ["Middle East Smith", "Smith"],
    ["Middle East Far Wall", "Far Castle"],
    ["Middle East Gate", "Gate"],
    ["Middle East Near Wall", "Near Castle"]
  ]) {
    assert.equal(cityBuildingLogicalLayer(FRAMES.find((frame) => frame.layer === layer)), logicalLayer);
  }
});

test("regional fortifications preserve Northern geometry outside Middle Eastern cities", () => {
  assert.deepEqual(
    ["Far Castle", "Gate", "Near Castle"].map((baseLayer) => (
      cityRegionalBuildingFrame(FRAMES, "mediterranean", baseLayer).layer
    )),
    ["Far Castle", "Gate", "Near Castle"]
  );
});

test("exported Middle Eastern fortifications keep the shared pieces grounded and joined", () => {
  for (const [baseLayer, regionalLayer] of [
    ["Far Castle", "Middle East Far Wall"],
    ["Gate", "Middle East Gate"],
    ["Near Castle", "Middle East Near Wall"]
  ]) {
    const base = EXPORTED_FRAMES.find(({ layer }) => layer === baseLayer);
    const regional = EXPORTED_FRAMES.find(({ layer }) => layer === regionalLayer);

    assert.ok(base, `missing exported base frame ${baseLayer}`);
    assert.ok(regional, `missing exported regional frame ${regionalLayer}`);
    assert.equal(regional.cityType, "islamic-desert");
    assert.equal(regional.regionalOf, baseLayer);
    assert.equal(regional.spriteSourceSize.x, base.spriteSourceSize.x);
    assert.equal(
      regional.spriteSourceSize.y + regional.spriteSourceSize.h,
      base.spriteSourceSize.y + base.spriteSourceSize.h,
      `${regionalLayer} must retain ${baseLayer}'s ground line`
    );
    assert.equal(
      cityRegionalBuildingFrame(EXPORTED_FRAMES, "islamic-desert", baseLayer).layer,
      regionalLayer
    );
  }
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
