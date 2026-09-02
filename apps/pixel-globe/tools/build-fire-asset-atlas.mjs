import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FIRE_FRAME_COUNT,
  FIRE_FRAME_HEIGHT,
  FIRE_FRAME_WIDTH,
  FIRE_RESURRECT_64_HEX,
  FIRE_VARIANT_IDS
} from "../src/fireEffects.js";

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require("../../../examples/globe-demo/node_modules/canvas");

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = join(APP_ROOT, "public/assets/misc/fire.png");
const SOURCE_COLOR_TO_RESURRECT = new Map([
  ["52,28,39", FIRE_RESURRECT_64_HEX[0]],
  ["96,44,44", FIRE_RESURRECT_64_HEX[1]],
  ["136,75,43", FIRE_RESURRECT_64_HEX[2]],
  ["190,119,43", FIRE_RESURRECT_64_HEX[3]],
  ["222,158,65", FIRE_RESURRECT_64_HEX[4]],
  ["232,193,112", FIRE_RESURRECT_64_HEX[5]],
  ["231,213,179", FIRE_RESURRECT_64_HEX[6]]
]);

const sourceRoot = process.argv[2];
if (!sourceRoot) {
  throw new Error(
    "Usage: node tools/build-fire-asset-atlas.mjs " +
    "'/path/to/Pixel Fire Asset Pack Colored/fire asset yellow'"
  );
}

const atlas = createCanvas(
  FIRE_FRAME_WIDTH * FIRE_FRAME_COUNT,
  FIRE_FRAME_HEIGHT * FIRE_VARIANT_IDS.length
);
const atlasContext = atlas.getContext("2d");
atlasContext.imageSmoothingEnabled = false;

for (const [variantIndex, variantId] of FIRE_VARIANT_IDS.entries()) {
  const sourceLabel = variantId.replace(/^group-(\d+)-(\d+)$/, "Group $1 - $2");
  if (sourceLabel === variantId) throw new Error(`Invalid fire variant ID: ${variantId}`);
  const sourcePath = join(resolve(sourceRoot), sourceLabel, `${sourceLabel}.png`);
  const source = await loadImage(sourcePath);
  if (source.width % FIRE_FRAME_COUNT !== 0) {
    throw new Error(`Fire source does not contain ${FIRE_FRAME_COUNT} frames: ${sourcePath}`);
  }
  const sourceFrameWidth = source.width / FIRE_FRAME_COUNT;
  if (
    ![16, 32].includes(sourceFrameWidth) ||
    ![32, 48].includes(source.height) ||
    sourceFrameWidth > FIRE_FRAME_WIDTH ||
    source.height > FIRE_FRAME_HEIGHT
  ) {
    throw new Error(
      `Unsupported fire source dimensions ${source.width}x${source.height}: ${sourcePath}`
    );
  }
  const sourceCanvas = createCanvas(source.width, source.height);
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(source, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, source.width, source.height);
  remapFirePixelsToResurrect(pixels, basename(sourcePath));
  sourceContext.putImageData(pixels, 0, 0);

  const destinationY = variantIndex * FIRE_FRAME_HEIGHT + FIRE_FRAME_HEIGHT - source.height;
  const horizontalInset = Math.floor((FIRE_FRAME_WIDTH - sourceFrameWidth) / 2);
  for (let frameIndex = 0; frameIndex < FIRE_FRAME_COUNT; frameIndex += 1) {
    atlasContext.drawImage(
      sourceCanvas,
      frameIndex * sourceFrameWidth,
      0,
      sourceFrameWidth,
      source.height,
      frameIndex * FIRE_FRAME_WIDTH + horizontalInset,
      destinationY,
      sourceFrameWidth,
      source.height
    );
  }
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, atlas.toBuffer("image/png"));
console.info(
  `Wrote ${FIRE_VARIANT_IDS.length} Resurrect 64 fire variants to ${OUTPUT_PATH}`
);

function remapFirePixelsToResurrect(imageData, sourceLabel) {
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    if (imageData.data[offset + 3] === 0) continue;
    if (imageData.data[offset + 3] !== 255) {
      throw new Error(`${sourceLabel} contains partially transparent fire pixels`);
    }
    const sourceKey = [
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2]
    ].join(",");
    const targetHex = SOURCE_COLOR_TO_RESURRECT.get(sourceKey);
    if (!targetHex) throw new Error(`${sourceLabel} contains an unknown fire color: ${sourceKey}`);
    imageData.data[offset] = Number.parseInt(targetHex.slice(0, 2), 16);
    imageData.data[offset + 1] = Number.parseInt(targetHex.slice(2, 4), 16);
    imageData.data[offset + 2] = Number.parseInt(targetHex.slice(4, 6), 16);
  }
}
