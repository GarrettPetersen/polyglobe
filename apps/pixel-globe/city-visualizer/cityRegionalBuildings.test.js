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
  frame("Middle East Near Wall", { cityType: "islamic-desert", regionalOf: "Near Castle" }),
  frame("Earthen Hut", { cityType: "earthen-village", regionalOf: "Home", hasChimney: false }),
  frame("Earthen Hut Large", { cityType: "earthen-village", regionalOf: "Home 2", hasChimney: false }),
  frame("China Home", { cityType: "east-asian", regionalOf: "Home", hasChimney: false }),
  frame("Japan Home", { cityType: "japanese", regionalOf: "Home", hasChimney: false }),
  frame("Japan Inn", { cityType: "japanese", regionalOf: "Inn", hasChimney: false }),
  frame("Japan Smith", { cityType: "japanese", regionalOf: "Smith", hasChimney: false })
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

test("earthen villages select the small and large hut for the two housing roles", () => {
  const selected = ["Home", "Home 2"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "earthen-village", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), ["Earthen Hut", "Earthen Hut Large"]);
  assert.ok(selected.every(({ hasChimney }) => hasChimney === false));
});

test("Ming and Joseon cities share the Chinese home for both current housing roles", () => {
  const selected = ["Home", "Home 2"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "east-asian", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), ["China Home", "China Home"]);
  assert.equal(selected[1].regionalOf, "Home 2");
  assert.ok(selected.every(({ hasChimney }) => hasChimney === false));
});

test("Japanese cities use the authored home, inn, and smith without Northern fallbacks", () => {
  const selected = ["Home", "Home 2", "Inn", "Smith"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "japanese", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), [
    "Japan Home",
    "Japan Home",
    "Japan Inn",
    "Japan Smith"
  ]);
  assert.ok(selected.every(({ hasChimney }) => hasChimney === false));
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
    ["Middle East Near Wall", "Near Castle"],
    ["Earthen Hut", "Home"],
    ["Earthen Hut Large", "Home 2"],
    ["China Home", "Home"],
    ["Japan Home", "Home"],
    ["Japan Inn", "Inn"],
    ["Japan Smith", "Smith"]
  ]) {
    assert.equal(cityBuildingLogicalLayer(FRAMES.find((frame) => frame.layer === layer)), logicalLayer);
  }
});

test("exported earthen huts preserve the two housing ground lines", () => {
  for (const [baseLayer, regionalLayer] of [
    ["Home", "Earthen Hut"],
    ["Home 2", "Earthen Hut Large"]
  ]) {
    const base = EXPORTED_FRAMES.find(({ layer }) => layer === baseLayer);
    const regional = EXPORTED_FRAMES.find(({ layer }) => layer === regionalLayer);
    assert.ok(regional, `missing exported regional frame ${regionalLayer}`);
    assert.equal(regional.cityType, "earthen-village");
    assert.equal(regional.regionalOf, baseLayer);
    assert.equal(regional.hasChimney, false);
    assert.equal(
      regional.spriteSourceSize.y + regional.spriteSourceSize.h,
      base.spriteSourceSize.y + base.spriteSourceSize.h
    );
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

test("exported East Asian buildings preserve their authored roles and scene ground lines", () => {
  for (const [cityType, baseLayer, regionalLayer] of [
    ["east-asian", "Home", "China Home"],
    ["japanese", "Home", "Japan Home"],
    ["japanese", "Inn", "Japan Inn"],
    ["japanese", "Smith", "Japan Smith"]
  ]) {
    const base = EXPORTED_FRAMES.find(({ layer }) => layer === baseLayer);
    const regional = EXPORTED_FRAMES.find(({ layer }) => layer === regionalLayer);
    assert.ok(regional, `missing exported regional frame ${regionalLayer}`);
    assert.equal(regional.cityType, cityType);
    assert.equal(regional.regionalOf, baseLayer);
    assert.equal(regional.hasChimney, false);
    assert.equal(
      regional.spriteSourceSize.y + regional.spriteSourceSize.h,
      base.spriteSourceSize.y + base.spriteSourceSize.h,
      `${regionalLayer} must retain ${baseLayer}'s ground line`
    );
  }
});

test("the wider Japanese inn clears the foreground market façades", () => {
  const japaneseInn = EXPORTED_FRAMES.find(({ layer }) => layer === "Japan Inn");
  const foregroundStalls = EXPORTED_FRAMES.filter((frame) => (
    frame.layer.startsWith("Market Stall") && frame.spriteSourceSize.y >= 500
  ));
  assert.ok(japaneseInn);
  assert.ok(foregroundStalls.length >= 3);
  const marketRight = Math.max(...foregroundStalls.map((frame) => (
    frame.spriteSourceSize.x + frame.spriteSourceSize.w
  )));
  assert.ok(
    japaneseInn.spriteSourceSize.x >= marketRight,
    `Japanese inn façade starts at ${japaneseInn.spriteSourceSize.x}, before market edge ${marketRight}`
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
