import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

import {
  hardenPixelTextAlpha,
  pixelFontSizePx,
  pixelTextOrigin,
  pixelTextRasterHeight,
  snapPointToTransformedPixelGrid
} from "./pixelText.js";

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
  assert.equal(pixelFontSizePx('12px "zpix", monospace'), 12);
  assert.throws(() => pixelFontSizePx('10px "Silkscreen"'), /multiple of 8px/);
  assert.throws(() => pixelFontSizePx('8px "zpix"'), /multiple of 12px/);
  assert.throws(() => pixelFontSizePx('8px "Tiny5"'), /Unsupported pixel font family/);
  assert.throws(() => pixelFontSizePx('small "Dogica"'), /no px size/);
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

test("runtime text can only enter the canvas through the pixel raster helper", async () => {
  const mainSource = await readFile(new URL("./main.js", import.meta.url), "utf8");
  assert.equal(mainSource.match(/\bctx\.fillText\(/g), null);
  assert.equal(mainSource.match(/\brasterCtx\.fillText\(/g)?.length, 1);
});

test("English uses Silkscreen and Dogica while zpix remains isolated for Chinese", async () => {
  const fontFiles = (await readdir(new URL("../public/assets/fonts/", import.meta.url)))
    .filter((filename) => filename.endsWith(".ttf"))
    .sort();
  assert.deepEqual(fontFiles, ["Silkscreen-Regular.ttf", "dogicapixel.ttf", "zpix.ttf"]);

  const [mainSource, stylesSource] = await Promise.all([
    readFile(new URL("./main.js", import.meta.url), "utf8"),
    readFile(new URL("./styles.css", import.meta.url), "utf8")
  ]);
  assert.equal(mainSource.includes("Tiny5"), false);
  assert.equal(stylesSource.includes("Tiny5"), false);
  assert.equal(mainSource.includes("zpix"), false);
  assert.equal(stylesSource.includes('font-family: "zpix"'), true);
});
