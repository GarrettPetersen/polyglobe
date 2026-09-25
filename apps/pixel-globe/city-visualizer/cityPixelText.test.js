import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createCanvas,
  registerFont
} from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RuntimeDiagnosticAssertionError } from "../src/diagnosticMode.js";
import {
  CITY_PIXEL_FONT_TITLE_8,
  CITY_PORT_TITLE_Y,
  cityPortTitleLayout,
  createCityPixelTextRenderer
} from "./cityPixelText.js";

registerFont(fileURLToPath(new URL(
  "../public/assets/fonts/pixel_pirate.ttf",
  import.meta.url
)), { family: "Pixel Pirate" });

test("multi-word city titles receive an explicit four-pixel word gap", () => {
  const canvas = createCanvas(256, 32);
  const context = canvas.getContext("2d");
  const renderer = createCityPixelTextRenderer(context, () => createCanvas(1, 1));
  context.font = CITY_PIXEL_FONT_TITLE_8;
  const expectedWidth = Math.ceil(
    context.measureText("AKKESHI").width + 4 + context.measureText("KOTAN").width
  );
  const naturalWidth = renderer.measure("AKKESHI KOTAN", CITY_PIXEL_FONT_TITLE_8);
  const spacedWidth = renderer.measure("AKKESHI KOTAN", CITY_PIXEL_FONT_TITLE_8, {
    wordSpacingPx: 4
  });
  assert.equal(spacedWidth, expectedWidth);
  assert.ok(spacedWidth > naturalWidth, "the font's two-pixel space must be widened");
  assert.equal(renderer.draw("AKKESHI KOTAN", 8, 8, {
    font: CITY_PIXEL_FONT_TITLE_8,
    wordSpacingPx: 4
  }).width, spacedWidth);
  assert.equal(
    renderer.draw("INN", 8, 20, { font: CITY_PIXEL_FONT_TITLE_8 }).width,
    renderer.measure("INN", CITY_PIXEL_FONT_TITLE_8)
  );
});

test("city pixel text rejects fractional word spacing", () => {
  const canvas = createCanvas(64, 32);
  const renderer = createCityPixelTextRenderer(canvas.getContext("2d"), () => createCanvas(1, 1));
  assert.throws(
    () => renderer.measure("SAN JUAN", CITY_PIXEL_FONT_TITLE_8, { wordSpacingPx: 3.5 }),
    /Invalid city pixel word spacing/
  );
});

test("city pixel text enlarges with integer nearest-neighbor scaling", () => {
  const canvas = createCanvas(128, 48);
  const renderer = createCityPixelTextRenderer(canvas.getContext("2d"), () => createCanvas(1, 1));
  const naturalWidth = renderer.measure("SET SAIL", CITY_PIXEL_FONT_TITLE_8, { wordSpacingPx: 4 });
  const naturalHeight = renderer.height(CITY_PIXEL_FONT_TITLE_8);
  const result = renderer.draw("SET SAIL", 7, 5, {
    font: CITY_PIXEL_FONT_TITLE_8,
    wordSpacingPx: 4,
    scale: 2
  });
  assert.equal(result.x, 7);
  assert.equal(result.y, 5);
  assert.equal(result.width, naturalWidth * 2);
  assert.equal(result.height, naturalHeight * 2);
  assert.throws(
    () => renderer.draw("SET SAIL", 0, 0, { scale: 1.5 }),
    /Invalid city pixel text scale/
  );
});

test("port titles remain at the pixel font's native scale and centered below the top edge", () => {
  assert.deepEqual(cityPortTitleLayout({
    textWidth: 42,
    textHeight: 8,
    viewportWidth: 256
  }), {
    x: 107,
    y: CITY_PORT_TITLE_Y,
    width: 42,
    height: 8,
    scale: 1
  });
  assert.ok(CITY_PORT_TITLE_Y > 8);

  const longTitle = cityPortTitleLayout({
    textWidth: 122,
    textHeight: 8,
    viewportWidth: 256
  });
  assert.equal(longTitle.x, 67);
  assert.equal(longTitle.scale, 1);
});

test("a narrow port title moves beside the status box and the menu button", () => {
  const statusBox = { x: 5, y: 5, width: 159, height: 70 };
  const menuButton = { x: 224, y: 5, width: 27, height: 27 };
  const title = cityPortTitleLayout({
    textWidth: 52,
    textHeight: 8,
    viewportWidth: 256,
    obstacles: [statusBox, menuButton]
  });
  assert.equal(title.y, CITY_PORT_TITLE_Y);
  assert.ok(title.x >= statusBox.x + statusBox.width + 4);
  assert.ok(title.x + title.width <= menuButton.x - 4);
  assert.equal(cityPortTitleLayout({
    textWidth: 52,
    textHeight: 8,
    viewportWidth: 455,
    obstacles: [statusBox, { x: 423, y: 5, width: 27, height: 27 }]
  }).x, Math.round((455 - 52) / 2));
  assert.equal(cityPortTitleLayout({
    textWidth: 52,
    textHeight: 8,
    viewportWidth: 256,
    obstacles: [{ x: 0, y: 0, width: 256, height: 22 }]
  }).x, Math.round((256 - 52) / 2));
  assert.throws(() => cityPortTitleLayout({
    textWidth: 52,
    textHeight: 8,
    viewportWidth: 256,
    obstacles: [{ x: 0, y: 0, width: 0, height: 10 }]
  }), /positive size/);
});

test("a title wider than the top gap drops below the menu and stays beside the status box", () => {
  const statusBox = { x: 5, y: 5, width: 159, height: 70 };
  const menuButton = { x: 224, y: 5, width: 27, height: 27 };
  const title = cityPortTitleLayout({
    textWidth: 56,
    textHeight: 16,
    viewportWidth: 256,
    obstacles: [statusBox, menuButton]
  });
  assert.ok(title.y >= menuButton.y + menuButton.height + 4);
  assert.ok(title.x >= statusBox.x + statusBox.width + 4);
  assert.ok(title.x + title.width <= 256 - 4);
  assert.ok(title.y + title.height <= statusBox.y + statusBox.height);
});

test("transparent city paint still draws from an opaque glyph mask", () => {
  const canvas = createCanvas(128, 48);
  const context = canvas.getContext("2d");
  const renderer = createCityPixelTextRenderer(context, () => createCanvas(1, 1));
  const faded = renderer.draw("INN", 4, 6, {
    color: "rgba(0, 0, 0, 0)",
    font: CITY_PIXEL_FONT_TITLE_8
  });
  assert.ok(faded.width > 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  renderer.draw("INN", 4, 6, { color: "#ff0000", font: CITY_PIXEL_FONT_TITLE_8 });
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let opaqueRedPixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset] > 200 && pixels[offset + 3] === 255) opaqueRedPixels += 1;
  }
  assert.ok(opaqueRedPixels > 0, "requested color must paint the opaque glyph mask");
});

test("an empty city glyph mask reports and omits the text when recovery is installed", () => {
  const reports = [];
  const canvas = createCanvas(64, 32);
  const renderer = createCityPixelTextRenderer(
    canvas.getContext("2d"),
    silentCanvas,
    (error, diagnosticKey) => reports.push({ message: error.message, diagnosticKey })
  );
  const omitted = renderer.draw("INN", 1.2, 2.2, { font: CITY_PIXEL_FONT_TITLE_8 });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].diagnosticKey, "city-pixel-text-empty-raster");
  assert.match(reports[0].message, /no opaque glyphs: INN/);
  assert.ok(omitted.width >= 0);

  const loud = createCityPixelTextRenderer(canvas.getContext("2d"), silentCanvas);
  assert.throws(() => loud.draw("INN", 0, 0, { font: CITY_PIXEL_FONT_TITLE_8 }), /no opaque glyphs/);
});

test("city pixel text reports an invalid draw and stays loud for diagnostic assertions", () => {
  const reports = [];
  const canvas = createCanvas(64, 32);
  const recovered = createCityPixelTextRenderer(
    canvas.getContext("2d"),
    () => createCanvas(1, 1),
    (_error, diagnosticKey) => reports.push(diagnosticKey)
  );
  assert.deepEqual(
    recovered.draw("INN", 1.4, 2.6, { scale: 1.5, font: CITY_PIXEL_FONT_TITLE_8 }),
    { x: 1, y: 3, width: 0, height: 0 }
  );
  assert.deepEqual(reports, ["city-pixel-text-render"]);

  const diagnostic = createCityPixelTextRenderer(
    canvas.getContext("2d"),
    silentCanvas,
    (error, diagnosticKey) => {
      throw new RuntimeDiagnosticAssertionError(error.message, diagnosticKey);
    }
  );
  assert.throws(
    () => diagnostic.draw("INN", 0, 0, { font: CITY_PIXEL_FONT_TITLE_8 }),
    (error) => error instanceof RuntimeDiagnosticAssertionError &&
      error.diagnosticKey === "city-pixel-text-empty-raster"
  );
});

function silentCanvas() {
  const canvas = createCanvas(64, 64);
  const context = canvas.getContext("2d");
  context.fillText = () => {};
  const getContext = canvas.getContext.bind(canvas);
  canvas.getContext = (...args) => {
    const next = getContext(...args);
    next.fillText = () => {};
    return next;
  };
  return canvas;
}
