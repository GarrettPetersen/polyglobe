import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cityArchitectureStyleForLayer } from "./cityArchitecture.js";
import {
  CITY_REGIONAL_BUILDING_BASE_LAYERS,
  cityBuildingLogicalLayer,
  cityRegionalBuildingFrame,
  cityRegionalBuildingRenderStyle
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
  frame("China Inn", { cityType: "east-asian", regionalOf: "Inn", hasChimney: false }),
  frame("China Smith", { cityType: "east-asian", regionalOf: "Smith", hasChimney: false }),
  frame("China Gate Far", { cityType: "east-asian", regionalOf: "Far Castle", hasChimney: false }),
  frame("China Gateway", { cityType: "east-asian", regionalOf: "Gate", hasChimney: false }),
  frame("China Gate Near", { cityType: "east-asian", regionalOf: "Near Castle", hasChimney: false }),
  frame("Japan Home", { cityType: "japanese", regionalOf: "Home", hasChimney: false }),
  frame("Japan Inn", { cityType: "japanese", regionalOf: "Inn", hasChimney: false }),
  frame("Japan Smith", { cityType: "japanese", regionalOf: "Smith", hasChimney: false }),
  frame("Japan Gate Far", { cityType: "japanese", regionalOf: "Far Castle", hasChimney: false }),
  frame("Japan Gateway", { cityType: "japanese", regionalOf: "Gate", hasChimney: false }),
  frame("Japan Gate Near", { cityType: "japanese", regionalOf: "Near Castle", hasChimney: false })
]);

const PORT_MANIFEST = JSON.parse(readFileSync(
  new URL("./assets/port-parallax/manifest.json", import.meta.url),
  "utf8"
));
const EXPORTED_FRAMES = PORT_MANIFEST.staticFrames;
const CITY_CATALOG = JSON.parse(readFileSync(
  new URL("./data/cities.json", import.meta.url),
  "utf8"
)).cities;

test("the port atlas revision fingerprints every packed image", () => {
  const digest = createHash("sha256");
  for (const sheet of [
    PORT_MANIFEST.staticSheet,
    PORT_MANIFEST.animated.Waves.sheet,
    PORT_MANIFEST.animated.Surf.sheet
  ]) {
    digest.update(readFileSync(new URL(`./assets/port-parallax/${sheet}`, import.meta.url)));
  }
  assert.equal(PORT_MANIFEST.assetRevision, digest.digest("hex").slice(0, 16));

  const mainSource = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  assert.match(mainSource, /portAtlasUrl\(portManifest, portManifest\.staticSheet\)/);
  assert.match(mainSource, /manifest\.assetRevision/);
  assert.doesNotMatch(mainSource, /loadImage\("\.\/assets\/port-parallax\/static\.png"\)/);
});

test("Mediterranean cities select all four authored regional building frames", () => {
  assert.deepEqual(
    ["Inn", "Smith", "Home", "Home 2"].map((baseLayer) => (
      cityRegionalBuildingFrame(FRAMES, "mediterranean", baseLayer).layer
    )),
    ["Med Inn", "Med Smith", "Med Home", "Med Home 2"]
  );
});

test("Northern European cities retain their authored base frames", () => {
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

test("Ming and Joseon cities use their authored home, inn, and smith", () => {
  const selected = ["Home", "Home 2", "Inn", "Smith"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "east-asian", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), [
    "China Home",
    "China Home",
    "China Inn",
    "China Smith"
  ]);
  assert.equal(selected[1].regionalOf, "Home 2");
  assert.ok(selected.every(({ hasChimney }) => hasChimney === false));
});

test("Ming and Joseon cities use the authored Chinese gatehouse", () => {
  const selected = ["Far Castle", "Gate", "Near Castle"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "east-asian", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), [
    "China Gate Far",
    "China Gateway",
    "China Gate Near"
  ]);
  assert.ok(selected.every(({ hasChimney }) => hasChimney === false));
});

test("Japanese cities use the complete authored kit except for Home B", () => {
  const selected = ["Home", "Home 2", "Inn", "Smith", "Far Castle", "Gate", "Near Castle"].map((baseLayer) => (
    cityRegionalBuildingFrame(FRAMES, "japanese", baseLayer)
  ));
  assert.deepEqual(selected.map(({ layer }) => layer), [
    "Japan Home",
    "Japan Home",
    "Japan Inn",
    "Japan Smith",
    "Japan Gate Far",
    "Japan Gateway",
    "Japan Gate Near"
  ]);
  assert.ok(selected.every(({ hasChimney }) => hasChimney === false));
});

test("Malacca and every Southeast Asian city use the closest raised-timber kit", () => {
  const selected = ["Home", "Home 2", "Inn", "Smith", "Far Castle", "Gate", "Near Castle"]
    .map((baseLayer) => cityRegionalBuildingFrame(FRAMES, "southeast-asian", baseLayer));
  assert.deepEqual(selected.map(({ layer }) => layer), [
    "Japan Home",
    "Japan Home",
    "Japan Inn",
    "Japan Smith",
    "Japan Gate Far",
    "Japan Gateway",
    "Japan Gate Near"
  ]);
});

test("South Asian cities use the closest available masonry kit", () => {
  assert.deepEqual(
    ["Home", "Home 2", "Inn", "Smith", "Far Castle", "Gate", "Near Castle"].map((baseLayer) => (
      cityRegionalBuildingFrame(FRAMES, "south-asian", baseLayer).layer
    )),
    [
      "Middle East Home",
      "Middle East Home",
      "Middle East Inn",
      "Middle East Smith",
      "Middle East Far Wall",
      "Middle East Gate",
      "Middle East Near Wall"
    ]
  );
});

test("American and Pacific regions use earthen buildings instead of Tudor fallbacks", () => {
  for (const cityType of ["andean", "mesoamerican", "polynesian"]) {
    assert.deepEqual(
      ["Home", "Home 2", "Inn", "Smith"].map((baseLayer) => (
        cityRegionalBuildingFrame(FRAMES, cityType, baseLayer).layer
      )),
      ["Earthen Hut", "Earthen Hut Large", "Earthen Hut Large", "Earthen Hut"]
    );
    assert.equal(cityRegionalBuildingRenderStyle(cityType, "Gate"), "islamic-desert");
  }
});

test("African cities combine earthen housing with the closest Islamicate civic kit", () => {
  assert.equal(cityRegionalBuildingRenderStyle("sub-saharan", "Home"), "earthen-village");
  assert.equal(cityRegionalBuildingRenderStyle("sub-saharan", "Inn"), "islamic-desert");
  assert.equal(cityRegionalBuildingRenderStyle("sub-saharan", "Gate"), "islamic-desert");
});

test("unsupported architecture styles fail instead of silently becoming Northern European", () => {
  assert.throws(
    () => cityRegionalBuildingFrame(FRAMES, "unknown-region", "Home"),
    /No regional city building kit/
  );
});

test("an incomplete authored kit fails instead of silently borrowing a Tudor role", () => {
  const framesWithoutJapaneseSmith = FRAMES.filter((frame) => frame.layer !== "Japan Smith");
  assert.throws(
    () => cityRegionalBuildingFrame(framesWithoutJapaneseSmith, "japanese", "Smith"),
    /Missing japanese city building frame/
  );
});

test("every generated city resolves its cultural architecture without an accidental Tudor fallback", () => {
  for (const city of CITY_CATALOG) {
    for (const baseLayer of CITY_REGIONAL_BUILDING_BASE_LAYERS) {
      const architectureStyle = cityArchitectureStyleForLayer(city, baseLayer);
      const selected = cityRegionalBuildingFrame(FRAMES, architectureStyle, baseLayer);
      assert.ok(selected, `${city.id} has no ${baseLayer} building`);
      if (city.cityType !== "northern-european") {
        assert.notEqual(
          architectureStyle,
          "northern-european",
          `${city.id} classified ${baseLayer} as Northern European`
        );
      }
      const intentionalMediterraneanFortificationPalette = (
        architectureStyle === "mediterranean" &&
        ["Far Castle", "Gate", "Near Castle"].includes(baseLayer)
      );
      if (
        architectureStyle !== "northern-european" &&
        !intentionalMediterraneanFortificationPalette
      ) {
        assert.notEqual(
          selected,
          FRAMES.find((frame) => frame.layer === baseLayer),
          `${city.id} silently fell back to Northern European ${baseLayer}`
        );
      }
    }
  }
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
    ["China Inn", "Inn"],
    ["China Smith", "Smith"],
    ["China Gate Far", "Far Castle"],
    ["China Gateway", "Gate"],
    ["China Gate Near", "Near Castle"],
    ["Japan Home", "Home"],
    ["Japan Inn", "Inn"],
    ["Japan Smith", "Smith"],
    ["Japan Gate Far", "Far Castle"],
    ["Japan Gateway", "Gate"],
    ["Japan Gate Near", "Near Castle"]
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

test("Mediterranean fortifications preserve Northern geometry", () => {
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
    ["east-asian", "Inn", "China Inn"],
    ["east-asian", "Smith", "China Smith"],
    ["east-asian", "Far Castle", "China Gate Far"],
    ["east-asian", "Gate", "China Gateway"],
    ["east-asian", "Near Castle", "China Gate Near"],
    ["japanese", "Home", "Japan Home"],
    ["japanese", "Inn", "Japan Inn"],
    ["japanese", "Smith", "Japan Smith"],
    ["japanese", "Far Castle", "Japan Gate Far"],
    ["japanese", "Gate", "Japan Gateway"],
    ["japanese", "Near Castle", "Japan Gate Near"]
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

test("exported Chinese fortifications keep the shared pieces grounded and joined", () => {
  for (const [baseLayer, regionalLayer] of [
    ["Far Castle", "China Gate Far"],
    ["Gate", "China Gateway"],
    ["Near Castle", "China Gate Near"]
  ]) {
    const base = EXPORTED_FRAMES.find(({ layer }) => layer === baseLayer);
    const regional = EXPORTED_FRAMES.find(({ layer }) => layer === regionalLayer);

    assert.ok(base, `missing exported base frame ${baseLayer}`);
    assert.ok(regional, `missing exported regional frame ${regionalLayer}`);
    assert.equal(regional.cityType, "east-asian");
    assert.equal(regional.regionalOf, baseLayer);
    assert.equal(regional.spriteSourceSize.x, base.spriteSourceSize.x);
    assert.equal(
      regional.spriteSourceSize.y + regional.spriteSourceSize.h,
      base.spriteSourceSize.y + base.spriteSourceSize.h,
      `${regionalLayer} must retain ${baseLayer}'s ground line`
    );
    assert.equal(
      cityRegionalBuildingFrame(EXPORTED_FRAMES, "east-asian", baseLayer).layer,
      regionalLayer
    );
  }
});

test("exported Japanese fortifications keep the shared pieces grounded and joined", () => {
  for (const [baseLayer, regionalLayer] of [
    ["Far Castle", "Japan Gate Far"],
    ["Gate", "Japan Gateway"],
    ["Near Castle", "Japan Gate Near"]
  ]) {
    const base = EXPORTED_FRAMES.find(({ layer }) => layer === baseLayer);
    const regional = EXPORTED_FRAMES.find(({ layer }) => layer === regionalLayer);

    assert.ok(base, `missing exported base frame ${baseLayer}`);
    assert.ok(regional, `missing exported regional frame ${regionalLayer}`);
    assert.equal(regional.cityType, "japanese");
    assert.equal(regional.regionalOf, baseLayer);
    assert.equal(regional.spriteSourceSize.x, base.spriteSourceSize.x);
    assert.equal(
      regional.spriteSourceSize.y + regional.spriteSourceSize.h,
      base.spriteSourceSize.y + base.spriteSourceSize.h,
      `${regionalLayer} must retain ${baseLayer}'s ground line`
    );
    assert.equal(
      cityRegionalBuildingFrame(EXPORTED_FRAMES, "japanese", baseLayer).layer,
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
