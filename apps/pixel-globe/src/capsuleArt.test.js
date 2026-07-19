import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  createCanvas,
  loadImage
} from "../../../examples/globe-demo/node_modules/canvas/index.js";

const generatedRoot = new URL("../capsule_art/generated/", import.meta.url);
const expectedOutputs = Object.freeze(new Map([
  ["capsule_header_en.png", [920, 430]],
  ["capsule_small_en.png", [462, 174]],
  ["capsule_main_en.png", [1232, 706]],
  ["capsule_vertical_en.png", [748, 896]],
  ["capsule_background.png", [1438, 810]],
  ["library_capsule_en.png", [600, 900]],
  ["library_header_en.png", [920, 430]],
  ["library_hero.png", [3840, 1240]],
  ["library_logo_en.png", [1280, 720]],
  ["community_icon_184.png", [184, 184]],
  ["client_icon_32.png", [32, 32]],
  ["shortcut_icon_256.png", [256, 256]],
  ["event_cover_en.png", [800, 450]],
  ["event_header_en.png", [1920, 622]],
  ["social_share_en.png", [1200, 630]],
  ["itchio_cover_en.png", [630, 500]]
]));

test("capsule generator produces the complete storefront image set", async () => {
  for (const [filename, [width, height]] of expectedOutputs) {
    const image = await loadImage(fileURLToPath(new URL(filename, generatedRoot)));
    assert.equal(image.width, width, `${filename} width`);
    assert.equal(image.height, height, `${filename} height`);
  }
});

test("capsule generator produces the active ship client icon comparison", async () => {
  const image = await loadImage(
    fileURLToPath(new URL("client-icon-ship-comparison.png", generatedRoot))
  );
  assert.equal(image.width, 900);
  assert.equal(image.height, 780);
});

test("capsule art documents and preserves its authored layer order", async () => {
  const [generator, readme] = await Promise.all([
    readFile(new URL("../tools/generate-layered-capsule-art.mjs", import.meta.url), "utf8"),
    readFile(new URL("../capsule_art/README.md", import.meta.url), "utf8")
  ]);
  assert.match(
    generator,
    /const FULL_LAYER_ORDER = Object\.freeze\(\[\s*"background",\s*"upperText",\s*"ship",\s*"lowerText"/s
  );
  assert.match(generator, /const ARTWORK_LAYER_ORDER = Object\.freeze\(\["background", "ship"\]\)/);
  assert.match(generator, /const TEXT_LAYER_ORDER = Object\.freeze\(\["upperText", "lowerText"\]\)/);
  assert.match(generator, /sourcePointToCanvas\([\s\S]*sourceShipAnchor/);
  assert.match(generator, /assertVerticalAnchorAlignment/);
  assert.match(readme, /background\.png[\s\S]*upper_text\.png[\s\S]*ship\.png[\s\S]*lower_text\.png/);
  assert.match(readme, /library_logo_en\.png.*only the two text layers/);
  assert.match(readme, /original waterline/);
});

test("main capsule is the exact authored four-layer composition", async () => {
  const sourceNames = ["background", "upper_text", "ship", "lower_text"];
  const sourceImages = await Promise.all(sourceNames.map((name) => loadImage(
    fileURLToPath(new URL(`../capsule_art/source/${name}.png`, import.meta.url))
  )));
  const generated = await loadImage(
    fileURLToPath(new URL("capsule_main_en.png", generatedRoot))
  );
  for (const source of sourceImages) {
    assert.equal(source.width, generated.width);
    assert.equal(source.height, generated.height);
  }

  const expectedCanvas = createCanvas(generated.width, generated.height);
  const expectedContext = expectedCanvas.getContext("2d");
  for (const source of sourceImages) expectedContext.drawImage(source, 0, 0);
  const generatedCanvas = createCanvas(generated.width, generated.height);
  generatedCanvas.getContext("2d").drawImage(generated, 0, 0);
  assert.deepEqual(
    expectedCanvas.toBuffer("image/png"),
    generatedCanvas.toBuffer("image/png")
  );
});

test("library logo is transparent text while artwork files contain no title", async () => {
  const [logo, artwork] = await Promise.all([
    loadImage(fileURLToPath(new URL("library_logo_en.png", generatedRoot))),
    loadImage(fileURLToPath(new URL("capsule_background.png", generatedRoot)))
  ]);
  const logoPixels = imagePixels(logo);
  const artworkPixels = imagePixels(artwork);
  let opaqueLogoPixels = 0;
  let transparentLogoPixels = 0;
  for (let offset = 0; offset < logoPixels.length; offset += 4) {
    if (logoPixels[offset + 3] === 0) {
      transparentLogoPixels++;
      continue;
    }
    opaqueLogoPixels++;
    assert.equal(logoPixels[offset], 255);
    assert.equal(logoPixels[offset + 1], 255);
    assert.equal(logoPixels[offset + 2], 255);
  }
  assert.ok(opaqueLogoPixels > 0);
  assert.ok(transparentLogoPixels > 0);
  let whiteArtworkPixels = 0;
  for (let offset = 0; offset < artworkPixels.length; offset += 4) {
    if (
      artworkPixels[offset] === 255 &&
      artworkPixels[offset + 1] === 255 &&
      artworkPixels[offset + 2] === 255 &&
      artworkPixels[offset + 3] === 255
    ) whiteArtworkPixels++;
  }
  assert.equal(whiteArtworkPixels, 0);
});

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height).data;
}
