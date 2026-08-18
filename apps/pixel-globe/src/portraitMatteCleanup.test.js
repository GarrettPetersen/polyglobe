import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { cleanPortraitChromaMatte } from "./portraitMatteCleanup.js";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("isolated green chroma remnants inherit the adjacent portrait outline", () => {
  const image = rgbaImage(5, 5);
  setPixel(image, 2, 2, "2e222f");
  setPixel(image, 3, 2, "547e64");
  setPixel(image, 2, 3, "3e3546");

  const result = cleanPortraitChromaMatte(image);

  assert.equal(result.changedPixels, 1);
  assert.equal(pixelHex(result.data, image.width, 3, 2), "2e222f");
});

test("interior green pixels remain available for clothing and jewelry", () => {
  const image = rgbaImage(5, 5);
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) setPixel(image, x, y, "547e64");
  }

  const result = cleanPortraitChromaMatte(image);

  assert.equal(result.changedPixels, 0);
  assert.equal(pixelHex(result.data, image.width, 2, 2), "547e64");
});

test("broad green silhouette edges are not mistaken for isolated matte flecks", () => {
  const image = rgbaImage(7, 5);
  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 5; x += 1) setPixel(image, x, y, "547e64");
  }
  setPixel(image, 3, 2, "2e222f");

  const result = cleanPortraitChromaMatte(image);

  assert.equal(result.changedPixels, 0);
});

test("portrait matte cleanup rejects malformed raster input", () => {
  assert.throws(
    () => cleanPortraitChromaMatte({ data: new Uint8Array(3), width: 2, height: 2 }),
    /expected 16 bytes/
  );
});

test("production OpenAI portraits contain no isolated chroma-matte fringe", async () => {
  const portraitRoot = join(APP_ROOT, "public", "assets", "characters");
  const paths = readdirSync(portraitRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith("by OpenAI"))
    .flatMap((entry) => readdirSync(join(portraitRoot, entry.name))
      .filter((filename) => /-\d{2}\.png$/.test(filename))
      .map((filename) => join(portraitRoot, entry.name, filename)));
  paths.push(join(APP_ROOT, "public", "assets", "animals", "portraits", "otter.png"));

  assert.ok(paths.length > 100, `Expected the generated portrait roster, got ${paths.length} assets`);
  for (const path of paths) {
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const result = cleanPortraitChromaMatte({ data, width: info.width, height: info.height });
    assert.equal(result.changedPixels, 0, `${path} still has chroma-matte fringe`);
  }
});

function rgbaImage(width, height) {
  return { data: new Uint8Array(width * height * 4), width, height };
}

function setPixel(image, x, y, hex) {
  const offset = (y * image.width + x) * 4;
  image.data[offset] = Number.parseInt(hex.slice(0, 2), 16);
  image.data[offset + 1] = Number.parseInt(hex.slice(2, 4), 16);
  image.data[offset + 2] = Number.parseInt(hex.slice(4, 6), 16);
  image.data[offset + 3] = 255;
}

function pixelHex(data, width, x, y) {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
}
