import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

import {
  hardenPixelTextAlpha,
  pixelFontCompatibleText,
  pixelFontSizePx,
  pixelTextOrigin,
  pixelTextRasterHeight,
  pixelTextScratchRasterLayout,
  resolvedPixelTextColor,
  snapPointToTransformedPixelGrid
} from "./pixelText.js";
import { auditPixelPirateKerning } from "../tools/fix-pixel-pirate-font-kerning.mjs";

test("pixel text origins always land on whole logical canvas pixels", () => {
  for (const align of ["left", "center", "right"]) {
    const origin = pixelTextOrigin({ x: 123.75, y: 47.4, width: 31, align });
    assert.equal(Number.isInteger(origin.x), true);
    assert.equal(Number.isInteger(origin.y), true);
  }
});

test("pixel text alignment is applied before snapping to the canvas grid", () => {
  assert.deepEqual(pixelTextOrigin({ x: 20.4, y: 8.6, width: 7, align: "left" }), { x: 20, y: 9 });
  assert.deepEqual(pixelTextOrigin({ x: 20.4, y: 8.6, width: 7, align: "center" }), { x: 17, y: 9 });
  assert.deepEqual(pixelTextOrigin({ x: 20.4, y: 8.6, width: 7, align: "right" }), { x: 13, y: 9 });
});

test("an explicit pixel-text color overrides prior canvas UI color", () => {
  assert.equal(resolvedPixelTextColor("#547e64", "#ffffff"), "#ffffff");
  assert.equal(resolvedPixelTextColor("#2e222f", undefined), "#2e222f");
  assert.throws(() => resolvedPixelTextColor({}, undefined), /solid CSS fill color/);
  assert.throws(() => resolvedPixelTextColor("#ffffff", null), /solid CSS fill color/);
});

test("text origins snap in canvas space through fractional translations", () => {
  const transform = { a: 1, b: 0, c: 0, d: 1, e: 0.35, f: -0.6 };
  const origin = snapPointToTransformedPixelGrid({ x: 17, y: 9 }, transform);
  assert.equal(Number.isInteger(origin.x + transform.e), true);
  assert.equal(Number.isInteger(origin.y + transform.f), true);
});

test("text origins snap in canvas space through right-angle rotation", () => {
  const transform = { a: 0, b: -1, c: 1, d: 0, e: 31.4, f: 12.2 };
  const origin = snapPointToTransformedPixelGrid({ x: 4, y: 7 }, transform);
  const canvasX = transform.a * origin.x + transform.c * origin.y + transform.e;
  const canvasY = transform.b * origin.x + transform.d * origin.y + transform.f;
  assert.ok(Math.abs(canvasX - Math.round(canvasX)) < 1e-9);
  assert.ok(Math.abs(canvasY - Math.round(canvasY)) < 1e-9);
});

test("pixel font sizes occupy whole logical canvas pixels", () => {
  assert.equal(pixelFontSizePx('8px "Silkscreen", monospace'), 8);
  assert.equal(pixelTextRasterHeight('8px "Dogica", monospace'), 16);
  assert.equal(pixelFontSizePx('8px "Pixel Pirate", monospace'), 8);
  assert.equal(pixelFontSizePx('12px "zpix", monospace'), 12);
  assert.equal(pixelFontSizePx('11px "Galmuri11", monospace'), 11);
  assert.equal(pixelFontSizePx('42px "Pirata One"'), 42);
  assert.equal(pixelTextRasterHeight('42px "Pirata One"'), 84);
  assert.throws(() => pixelFontSizePx('10px "Silkscreen"'), /multiple of 8px/);
  assert.throws(() => pixelFontSizePx('12px "Pixel Pirate"'), /multiple of 8px/);
  assert.throws(() => pixelFontSizePx('8px "zpix"'), /multiple of 12px/);
  assert.throws(() => pixelFontSizePx('12px "Galmuri11"'), /multiple of 11px/);
  assert.throws(() => pixelFontSizePx('8px "Tiny5"'), /Unsupported pixel font family/);
  assert.throws(() => pixelFontSizePx('small "Dogica"'), /no px size/);
});

test("extended Latin names remain readable in the compact Latin pixel fonts", () => {
  assert.equal(
    pixelFontCompatibleText("Pēwhairangi", '8px "Dogica", monospace'),
    "Pewhairangi"
  );
  assert.equal(
    pixelFontCompatibleText("Tōkyō / Łódź", '8px "Silkscreen", monospace'),
    "Tokyo / Lodz"
  );
  assert.equal(
    pixelFontCompatibleText("Pēwhairangi", '12px "zpix", monospace'),
    "Pēwhairangi"
  );
});

test("pixel text uses an alphabetic scratch baseline inside the logical raster", () => {
  assert.deepEqual(
    pixelTextScratchRasterLayout('8px "Dogica"', {
      fontBoundingBoxAscent: 7,
      fontBoundingBoxDescent: 2,
      actualBoundingBoxAscent: 6,
      actualBoundingBoxDescent: 1
    }),
    { baselineY: 23, height: 16, padding: 16, scratchHeight: 48 }
  );
  assert.deepEqual(
    pixelTextScratchRasterLayout('8px "Silkscreen"', {}),
    { baselineY: 24, height: 16, padding: 16, scratchHeight: 48 }
  );
});

test("pixel text rejects font metrics that cannot fit its native raster", () => {
  assert.throws(
    () => pixelTextScratchRasterLayout('8px "Dogica"', {
      fontBoundingBoxAscent: 14,
      fontBoundingBoxDescent: 4
    }),
    /metrics exceed the 16px raster/
  );
});

test("pixel text alpha is hardened to fully transparent or fully opaque", () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 0,
    255, 255, 255, 64,
    255, 255, 255, 127,
    255, 255, 255, 128,
    255, 255, 255, 224,
    255, 255, 255, 255
  ]);
  assert.equal(hardenPixelTextAlpha(pixels), 3);
  assert.deepEqual(
    Array.from({ length: pixels.length / 4 }, (_, index) => pixels[index * 4 + 3]),
    [0, 0, 0, 255, 255, 255]
  );
});

test("pixel text alpha adapts to a browser's lower glyph alpha ceiling", () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 0,
    255, 255, 255, 20,
    255, 255, 255, 40,
    255, 255, 255, 80
  ]);
  assert.equal(hardenPixelTextAlpha(pixels), 2);
  assert.deepEqual(
    Array.from({ length: pixels.length / 4 }, (_, index) => pixels[index * 4 + 3]),
    [0, 0, 255, 255]
  );
});

test("a genuinely empty pixel text raster remains empty", () => {
  const pixels = new Uint8ClampedArray(16);
  assert.equal(hardenPixelTextAlpha(pixels), 0);
  assert.deepEqual([...pixels], Array(16).fill(0));
});

test("runtime text can only enter the canvas through the pixel raster helper", async () => {
  const mainSource = await readFile(new URL("./main.js", import.meta.url), "utf8");
  assert.equal(mainSource.match(/\bctx\.fillText\(/g), null);
  assert.deepEqual(mainSource.match(/\b[a-zA-Z]+Ctx\.fillText\(/g), ["scratchCtx.fillText("]);
});

test("the interface fonts and Pirata One result lettering ship with the game", async () => {
  const fontFiles = (await readdir(new URL("../public/assets/fonts/", import.meta.url)))
    .filter((filename) => /\.(?:ttf|woff2)$/.test(filename))
    .sort();
  assert.deepEqual(fontFiles, [
    "Galmuri11.woff2",
    "PirataOne-Regular.ttf",
    "Silkscreen-Regular.ttf",
    "dogicapixel.ttf",
    "pixel_pirate.ttf",
    "pixel_pirate.woff2",
    "zpix.ttf",
    "zpix.woff2"
  ]);

  const [
    mainSource,
    localizationSource,
    stylesSource,
    credits,
    pixelPirateFont,
    pixelPirateWoff2,
    zpixWoff2
  ] = await Promise.all([
    readFile(new URL("./main.js", import.meta.url), "utf8"),
    readFile(new URL("./localization.js", import.meta.url), "utf8"),
    readFile(new URL("./styles.css", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/CREDITS.md", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/fonts/pixel_pirate.ttf", import.meta.url)),
    readFile(new URL("../public/assets/fonts/pixel_pirate.woff2", import.meta.url)),
    readFile(new URL("../public/assets/fonts/zpix.woff2", import.meta.url))
  ]);
  assert.equal(mainSource.includes("Tiny5"), false);
  assert.equal(stylesSource.includes("Tiny5"), false);
  assert.match(mainSource, /12px \"zpix\"/);
  assert.match(mainSource, /11px \"Galmuri11\"/);
  assert.match(localizationSource, /smallFont: '12px "zpix", monospace'/);
  assert.match(localizationSource, /smallFont: '11px "Galmuri11", monospace'/);
  assert.match(mainSource, /8px \\"Pixel Pirate\\"/);
  assert.match(stylesSource, /font-family: "Pixel Pirate"/);
  assert.match(
    stylesSource,
    /pixel_pirate\.woff2\?v=r-kern-2[\s\S]*pixel_pirate\.ttf\?v=r-kern-2/
  );
  assert.match(stylesSource, /zpix\.woff2\?v=web-1[\s\S]*zpix\.ttf\?v=web-1/);
  assert.match(mainSource, /42px \"Pirata One\"/);
  assert.match(stylesSource, /font-family: "Pirata One"/);
  assert.match(credits, /SparklyDest.*Pixel Pirate.*CC BY-SA 3\.0.*DaFont/);
  assert.match(credits, /Pirata One/);
  assert.match(credits, /Lee Minseo.*Galmuri11.*SIL Open Font License 1\.1/);
  assert.match(pixelPirateFont.toString("latin1"), /Copyright SparklyDest 2011/);
  assert.match(pixelPirateFont.toString("latin1"), /Creative Commons Attribution Share Alike/);
  assert.equal(pixelPirateWoff2.toString("ascii", 0, 4), "wOF2");
  assert.equal(zpixWoff2.toString("ascii", 0, 4), "wOF2");
  assert.equal(stylesSource.includes('font-family: "zpix"'), true);
  assert.equal(stylesSource.includes('font-family: "Galmuri11"'), true);
});

test("Pixel Pirate lets the ornate R overlap the following letter by three design pixels", async () => {
  const font = await readFile(new URL("../public/assets/fonts/pixel_pirate.ttf", import.meta.url));
  const audit = auditPixelPirateKerning(font);

  assert.equal(audit.unitsPerEm, 1024);
  assert.equal(audit.unitsPerPixel, 128);
  assert.equal(audit.rAdvancePixels, 11);
  assert.deepEqual(new Set(Object.values(audit.kerningPixels)), new Set([-3]));
  assert.equal(audit.checksum, 0xb1b0afba);
});
