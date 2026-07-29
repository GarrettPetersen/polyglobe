import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  createCanvas,
  loadImage
} from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { CAPSULE_TITLE_LOCALES } from "../tools/capsule-title-locales.mjs";
import { SUPPORTED_LANGUAGES } from "./localization.js";
import { SHIP_STATS } from "./shipStats.js";

const generatedRoot = new URL("../capsule_art/generated/", import.meta.url);
const generatedDemoRoot = new URL("../capsule_art/generated/demo/", import.meta.url);
const localizedOutputSizes = Object.freeze([
  ["capsule_header", 920, 430],
  ["capsule_small", 462, 174],
  ["capsule_main", 1232, 706],
  ["capsule_title", 1232, 706],
  ["capsule_title_with_ship", 1232, 706],
  ["capsule_vertical", 748, 896],
  ["library_capsule", 600, 900],
  ["library_header", 920, 430],
  ["library_logo", 1280, 720],
  ["event_cover", 800, 450],
  ["event_header", 1920, 622],
  ["social_share", 1200, 630],
  ["itchio_cover", 630, 500]
]);
const expectedOutputs = Object.freeze(new Map([
  ...CAPSULE_TITLE_LOCALES.flatMap(({ steamCode }) => (
    localizedOutputSizes.map(([baseName, width, height]) => [
      `${baseName}_${steamCode}.png`,
      [width, height]
    ])
  )),
  ["capsule_background.png", [1438, 810]],
  ["library_hero.png", [3840, 1240]],
  ["community_icon_184.png", [184, 184]],
  ["client_icon_32.png", [32, 32]],
  ["shortcut_icon_256.png", [256, 256]],
  ["app_icon_512.png", [512, 512]]
]));
const expectedDemoOutputs = Object.freeze(new Map(
  CAPSULE_TITLE_LOCALES.flatMap(({ steamCode }) => (
    localizedOutputSizes.map(([baseName, width, height]) => [
      `${baseName}_${steamCode}.png`,
      [width, height]
    ])
  ))
));

test("capsule titles cover every supported game language exactly once", () => {
  const expectedSteamCodes = new Map([
    ["en", "english"],
    ["zh-Hans", "schinese"],
    ["ru", "russian"],
    ["es", "spanish"],
    ["pt-BR", "brazilian"],
    ["ja", "japanese"],
    ["de", "german"],
    ["fr", "french"],
    ["pl", "polish"],
    ["zh-Hant", "tchinese"],
    ["ko", "koreana"]
  ]);
  assert.deepEqual(
    CAPSULE_TITLE_LOCALES.map(({ appLocale }) => appLocale).sort(),
    SUPPORTED_LANGUAGES.map(({ id }) => id).sort()
  );
  assert.equal(
    new Set(CAPSULE_TITLE_LOCALES.map(({ steamCode }) => steamCode)).size,
    CAPSULE_TITLE_LOCALES.length
  );
  for (const { appLocale, steamCode, demoLabel, demoFont } of CAPSULE_TITLE_LOCALES) {
    assert.equal(steamCode, expectedSteamCodes.get(appLocale), appLocale);
    assert.ok(demoLabel.length > 0, `${appLocale} demo label`);
    assert.ok(demoFont.length > 0, `${appLocale} demo font`);
  }
});

test("capsule generator produces the complete storefront image set", async () => {
  for (const [filename, [width, height]] of expectedOutputs) {
    const image = await loadImage(fileURLToPath(new URL(filename, generatedRoot)));
    assert.equal(image.width, width, `${filename} width`);
    assert.equal(image.height, height, `${filename} height`);
  }
});

test("capsule generator produces flat-gold localized demo variants", async () => {
  const demoRgb = [251, 185, 84];
  for (const [filename, [width, height]] of expectedDemoOutputs) {
    const [fullImage, demoImage] = await Promise.all([
      loadImage(fileURLToPath(new URL(filename, generatedRoot))),
      loadImage(fileURLToPath(new URL(filename, generatedDemoRoot)))
    ]);
    assert.equal(demoImage.width, width, `${filename} demo width`);
    assert.equal(demoImage.height, height, `${filename} demo height`);
    const fullPixels = imagePixels(fullImage);
    const demoPixels = imagePixels(demoImage);
    let changedPixels = 0;
    let demoMinY = demoImage.height;
    let demoMaxY = -1;
    for (let offset = 0; offset < demoPixels.length; offset += 4) {
      const changed = (
        fullPixels[offset] !== demoPixels[offset] ||
        fullPixels[offset + 1] !== demoPixels[offset + 1] ||
        fullPixels[offset + 2] !== demoPixels[offset + 2] ||
        fullPixels[offset + 3] !== demoPixels[offset + 3]
      );
      if (!changed) continue;
      changedPixels++;
      const pixelY = Math.floor(offset / 4 / demoImage.width);
      demoMinY = Math.min(demoMinY, pixelY);
      demoMaxY = Math.max(demoMaxY, pixelY);
      assert.deepEqual(
        Array.from(demoPixels.slice(offset, offset + 4)),
        [...demoRgb, 255],
        `${filename} demo mark pixel`
      );
    }
    assert.ok(changedPixels > 0, `${filename} has no demo mark`);
    assert.ok(
      demoMaxY - demoMinY + 1 >= Math.max(20, Math.round(Math.min(width, height) * 0.075)),
      `${filename} demo mark is too small`
    );
  }
});

test("capsule generator produces the active ship client icon comparison", async () => {
  const image = await loadImage(
    fileURLToPath(new URL("client-icon-ship-comparison.png", generatedRoot))
  );
  assert.equal(image.width, 900);
  assert.equal(image.height, Math.ceil(SHIP_STATS.length / 5) * 130);
});

test("capsule generator produces the localized review sheet", async () => {
  const image = await loadImage(
    fileURLToPath(new URL("localized-capsule-main-comparison.png", generatedRoot))
  );
  assert.equal(image.width, 1230);
  assert.equal(image.height, 1080);
});

test("capsule art documents and preserves its authored layer order", async () => {
  const [generator, readme, credits] = await Promise.all([
    readFile(new URL("../tools/generate-layered-capsule-art.mjs", import.meta.url), "utf8"),
    readFile(new URL("../capsule_art/README.md", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/CREDITS.md", import.meta.url), "utf8")
  ]);
  assert.match(
    generator,
    /const FULL_LAYER_ORDER = Object\.freeze\(\[\s*"background",\s*"reflection",\s*"upperText",\s*"ship",\s*"lowerText"/s
  );
  assert.match(generator, /const ARTWORK_LAYER_ORDER = Object\.freeze\(\["background", "reflection", "ship"\]\)/);
  assert.match(generator, /const TEXT_LAYER_ORDER = Object\.freeze\(\["upperText", "lowerText"\]\)/);
  assert.match(generator, /sourcePointToCanvas\([\s\S]*sourceShipAnchor/);
  assert.match(generator, /assertVerticalAnchorAlignment/);
  assert.match(generator, /drawSourceAlignedComposition\([\s\S]*reflectionComposition/);
  assert.match(readme, /background\.png[\s\S]*reflection\.png[\s\S]*upper_text\.png[\s\S]*ship\.png[\s\S]*lower_text\.png/);
  assert.match(readme, /library_logo_\{language\}\.png.*only the two text layers/);
  assert.match(readme, /私掠 & 报复/);
  assert.match(readme, /Каперство & Возмездие/);
  assert.match(generator, /DROP_CAP_OPTICAL_KERN/);
  assert.match(generator, /touchShipRight/);
  assert.match(readme, /original waterline/);
  assert.match(
    credits,
    /CraftPix \/ Free Game Assets - "Free Sky with Clouds Background Pixel Art Set" \(CraftPix Freebie License; heavily modified for capsule art\)/
  );
});

test("loading screen artwork layers are exact public copies of the authored capsule layers", async () => {
  for (const filename of ["background.png", "reflection.png", "ship.png"]) {
    const [source, runtime] = await Promise.all([
      readFile(new URL(`../capsule_art/source/${filename}`, import.meta.url)),
      readFile(new URL(`../public/assets/loading/${filename}`, import.meta.url))
    ]);
    assert.deepEqual(runtime, source, filename);
  }
});

test("loading screen publishes the exact localized upper and lower title layers", async () => {
  for (const { steamCode } of CAPSULE_TITLE_LOCALES) {
    const [atlas, title] = await Promise.all([
      loadImage(fileURLToPath(new URL(
        `../public/assets/loading/title_${steamCode}.png`,
        import.meta.url
      ))),
      loadImage(fileURLToPath(new URL(
        `capsule_title_${steamCode}.png`,
        generatedRoot
      )))
    ]);
    assert.equal(atlas.width, title.width, `${steamCode} loading title width`);
    assert.equal(atlas.height, title.height * 2, `${steamCode} loading title height`);
    const composed = createCanvas(title.width, title.height);
    const context = composed.getContext("2d");
    context.drawImage(
      atlas,
      0,
      0,
      title.width,
      title.height,
      0,
      0,
      title.width,
      title.height
    );
    context.drawImage(
      atlas,
      0,
      title.height,
      title.width,
      title.height,
      0,
      0,
      title.width,
      title.height
    );
    const expected = createCanvas(title.width, title.height);
    expected.getContext("2d").drawImage(title, 0, 0);
    assert.deepEqual(
      composed.toBuffer("image/png"),
      expected.toBuffer("image/png"),
      `${steamCode} loading title`
    );
  }
});

test("main capsule is the exact authored five-layer composition", async () => {
  const sourceNames = ["background", "reflection", "upper_text", "ship", "lower_text"];
  const sourceImages = await Promise.all(sourceNames.map((name) => loadImage(
    fileURLToPath(new URL(`../capsule_art/source/${name}.png`, import.meta.url))
  )));
  const generated = await loadImage(
    fileURLToPath(new URL("capsule_main_english.png", generatedRoot))
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

test("press title exports preserve the authored transparent layer order", async () => {
  const cases = Object.freeze([
    ["capsule_title_english.png", ["upper_text", "lower_text"]],
    ["capsule_title_with_ship_english.png", ["upper_text", "ship", "lower_text"]]
  ]);
  for (const [filename, sourceNames] of cases) {
    const [generated, ...sourceImages] = await Promise.all([
      loadImage(fileURLToPath(new URL(filename, generatedRoot))),
      ...sourceNames.map((name) => loadImage(
        fileURLToPath(new URL(`../capsule_art/source/${name}.png`, import.meta.url))
      ))
    ]);
    const expectedCanvas = createCanvas(generated.width, generated.height);
    const expectedContext = expectedCanvas.getContext("2d");
    for (const source of sourceImages) expectedContext.drawImage(source, 0, 0);
    const generatedCanvas = createCanvas(generated.width, generated.height);
    generatedCanvas.getContext("2d").drawImage(generated, 0, 0);
    assert.deepEqual(
      expectedCanvas.toBuffer("image/png"),
      generatedCanvas.toBuffer("image/png"),
      filename
    );
  }
});

test("library logo is transparent text while artwork files contain no title", async () => {
  const [logo, artwork] = await Promise.all([
    loadImage(fileURLToPath(new URL("library_logo_english.png", generatedRoot))),
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

test("tall capsules give their opaque title equal left and right margins", async () => {
  for (const { steamCode } of CAPSULE_TITLE_LOCALES) {
    for (const baseName of ["capsule_vertical", "library_capsule"]) {
      const filename = `${baseName}_${steamCode}.png`;
      const image = await loadImage(fileURLToPath(new URL(filename, generatedRoot)));
      const bounds = whitePixelHorizontalBounds(image);
      assert.ok(
        Math.abs(bounds.minX - (image.width - bounds.maxX - 1)) <= 1,
        filename
      );
    }
  }
});

test("balanced Asian title lines preserve a transparent center gap", async () => {
  const balancedLocales = CAPSULE_TITLE_LOCALES.filter(
    ({ composition }) => composition === "balanced"
  );
  for (const { steamCode } of balancedLocales) {
    const filename = `capsule_title_${steamCode}.png`;
    const image = await loadImage(fileURLToPath(new URL(filename, generatedRoot)));
    const pixels = imagePixels(image);
    let lastOpaqueRow = -1;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (pixels[(y * image.width + x) * 4 + 3] > 0) lastOpaqueRow = y;
      }
    }
    assert.ok(lastOpaqueRow <= 555, `${filename} is clipped by the small-capsule crop`);
    for (let y = 353; y < 372; y++) {
      for (let x = 0; x < image.width; x++) {
        assert.equal(
          pixels[(y * image.width + x) * 4 + 3],
          0,
          `${filename} has an opaque pixel in title gap at ${x},${y}`
        );
      }
    }
  }
});

test("long European upper titles overlap the ship by less than half a final letter", async () => {
  const ship = await loadImage(
    fileURLToPath(new URL("../capsule_art/source/ship.png", import.meta.url))
  );
  const shipPixels = imagePixels(ship);
  for (const steamCode of ["german", "russian", "polish"]) {
    const title = await loadImage(
      fileURLToPath(new URL(`capsule_title_${steamCode}.png`, generatedRoot))
    );
    const titlePixels = imagePixels(title);
    let finalWordX = -1;
    for (let y = 180; y < 353; y++) {
      for (let x = 0; x < 760; x++) {
        if (isOpaqueWhite(titlePixels, title.width, x, y)) {
          finalWordX = Math.max(finalWordX, x);
        }
      }
    }
    assert.ok(finalWordX > 0, `${steamCode} upper title has no visible pixels`);

    let titlePixelCount = 0;
    let overlapPixelCount = 0;
    for (let y = 180; y < 353; y++) {
      for (let x = finalWordX - 47; x <= finalWordX; x++) {
        if (!isOpaqueWhite(titlePixels, title.width, x, y)) continue;
        titlePixelCount++;
        if (shipPixels[(y * ship.width + x) * 4 + 3] > 0) overlapPixelCount++;
      }
    }
    assert.ok(titlePixelCount > 0, `${steamCode} final-letter sample is empty`);
    assert.ok(overlapPixelCount > 0, `${steamCode} upper title does not kiss the ship`);
    assert.ok(
      overlapPixelCount / titlePixelCount <= 0.5,
      `${steamCode} ship hides more than half of its final upper-title letter`
    );
  }
});

test("Korean lower title centers under the upper title including its ampersand", async () => {
  const image = await loadImage(
    fileURLToPath(new URL("capsule_title_koreana.png", generatedRoot))
  );
  const upper = whitePixelHorizontalBoundsInRegion(
    image,
    0,
    100,
    image.width,
    353
  );
  const lower = whitePixelHorizontalBoundsInRegion(
    image,
    0,
    372,
    image.width,
    556
  );
  const upperCenter = (upper.minX + upper.maxX) / 2;
  const lowerCenter = (lower.minX + lower.maxX) / 2;
  assert.ok(
    Math.abs(upperCenter - lowerCenter) <= 2,
    `Korean visible title centers differ: ${upperCenter} versus ${lowerCenter}`
  );
});

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height).data;
}

function isOpaqueWhite(pixels, width, x, y) {
  const offset = (y * width + x) * 4;
  return (
    pixels[offset] === 255 &&
    pixels[offset + 1] === 255 &&
    pixels[offset + 2] === 255 &&
    pixels[offset + 3] === 255
  );
}

function whitePixelHorizontalBounds(image) {
  return whitePixelHorizontalBoundsInRegion(
    image,
    0,
    0,
    image.width,
    image.height
  );
}

function whitePixelHorizontalBoundsInRegion(image, minX, minY, maxX, maxY) {
  const pixels = imagePixels(image);
  let foundMinX = maxX;
  let foundMaxX = -1;
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const offset = (y * image.width + x) * 4;
      if (
        pixels[offset] !== 255 ||
        pixels[offset + 1] !== 255 ||
        pixels[offset + 2] !== 255 ||
        pixels[offset + 3] !== 255
      ) continue;
      foundMinX = Math.min(foundMinX, x);
      foundMaxX = Math.max(foundMaxX, x);
    }
  }
  assert.ok(foundMaxX >= foundMinX, "expected opaque white title pixels");
  return Object.freeze({ minX: foundMinX, maxX: foundMaxX });
}
