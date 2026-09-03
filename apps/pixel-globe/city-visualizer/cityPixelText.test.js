import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createCanvas,
  registerFont
} from "../../../examples/globe-demo/node_modules/canvas/index.js";
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
