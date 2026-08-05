import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import sharp from "sharp";

import {
  RESURRECT_64_HEX,
  nearestResurrect64Hex
} from "../src/waterLatitudePalette.js";

const PORTRAIT_SIZE = 64;
const MIN_OPAQUE_PIXELS = 500;
const MAX_OPAQUE_PIXELS = 3_600;

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  throw new Error(
    "Usage: node tools/process-generated-animal-portrait.mjs <alpha-source.png> <output.png>"
  );
}

const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const { data, info } = await sharp(readFileSync(sourcePath))
  .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: "fill", kernel: "nearest" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

let opaquePixels = 0;
for (let offset = 0; offset < data.length; offset += 4) {
  const alpha = data[offset + 3];
  if (alpha < 128) {
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 0;
    continue;
  }

  const target = nearestResurrect64Hex(data[offset], data[offset + 1], data[offset + 2]);
  data[offset] = Number.parseInt(target.slice(0, 2), 16);
  data[offset + 1] = Number.parseInt(target.slice(2, 4), 16);
  data[offset + 2] = Number.parseInt(target.slice(4, 6), 16);
  data[offset + 3] = 255;
  opaquePixels += 1;
}

if (opaquePixels < MIN_OPAQUE_PIXELS || opaquePixels > MAX_OPAQUE_PIXELS) {
  throw new Error(`Animal portrait has implausible coverage: ${opaquePixels} opaque pixels`);
}

await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4
  }
}).png().toFile(outputPath);

const palette = new Set(RESURRECT_64_HEX);
const verification = await sharp(outputPath).ensureAlpha().raw().toBuffer();
for (let offset = 0; offset < verification.length; offset += 4) {
  const alpha = verification[offset + 3];
  if (alpha !== 0 && alpha !== 255) {
    throw new Error(`Animal portrait contains non-binary alpha ${alpha}`);
  }
  if (alpha === 0) continue;
  const hex = [verification[offset], verification[offset + 1], verification[offset + 2]]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  if (!palette.has(hex)) {
    throw new Error(`Animal portrait contains non-Resurrect color #${hex}`);
  }
}
