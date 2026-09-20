import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";

const GRID_SIZE = 4;
const OUTPUT_SIZE = 64;

export async function transparentGridRects(sourcePath) {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Portrait grid has no dimensions: ${sourcePath}`);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const xCuts = transparentGutterCuts(data, info, "x");
  const yCuts = transparentGutterCuts(data, info, "y");
  const xs = [0, ...xCuts, info.width];
  const ys = [0, ...yCuts, info.height];
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const row = Math.floor(index / GRID_SIZE);
    const column = index % GRID_SIZE;
    return { left: xs[column], top: ys[row], width: xs[column + 1] - xs[column], height: ys[row + 1] - ys[row] };
  });
}

export function transparentGutterCuts(data, info, axis) {
  if (!Buffer.isBuffer(data) || info.channels !== 4) throw new Error("Portrait gutter detection requires RGBA pixels");
  if (axis !== "x" && axis !== "y") throw new Error(`Unknown portrait gutter axis: ${axis}`);
  const length = axis === "x" ? info.width : info.height;
  const otherLength = axis === "x" ? info.height : info.width;
  const occupancy = Array(length).fill(0);
  for (let position = 0; position < length; position++) {
    for (let other = 0; other < otherLength; other++) {
      const x = axis === "x" ? position : other;
      const y = axis === "x" ? other : position;
      if (data[(y * info.width + x) * 4 + 3] > 0) occupancy[position]++;
    }
  }
  return Array.from({ length: GRID_SIZE - 1 }, (_, index) => {
    const target = Math.round(((index + 1) * length) / GRID_SIZE);
    const radius = Math.round(length * 0.08);
    let bestStart = null;
    let bestEnd = null;
    for (let position = target - radius; position <= target + radius; position++) {
      if (occupancy[position] !== 0) continue;
      const start = position;
      while (position + 1 <= target + radius && occupancy[position + 1] === 0) position++;
      const end = position;
      if (bestStart === null || end - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = end;
      }
    }
    if (bestStart === null) throw new Error(`Portrait grid has no transparent ${axis} gutter near ${target}`);
    return Math.floor((bestStart + bestEnd + 1) / 2);
  });
}

export async function extractTransparentPortraitGrid(sourcePath, outputDirectory, filenamePrefix) {
  const rects = await transparentGridRects(sourcePath);
  mkdirSync(outputDirectory, { recursive: true });
  for (let index = 0; index < rects.length; index++) {
    const cell = await sharp(sourcePath).extract(rects[index]).png().toBuffer();
    const trimmed = await sharp(cell).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const initialMetadata = await sharp(trimmed).metadata();
    const fitted = initialMetadata.width > OUTPUT_SIZE || initialMetadata.height > OUTPUT_SIZE
      ? await sharp(trimmed).resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "inside", kernel: "nearest" }).png().toBuffer()
      : trimmed;
    const metadata = await sharp(fitted).metadata();
    const outputPath = join(outputDirectory, `${filenamePrefix}-${String(index + 1).padStart(2, "0")}.png`);
    await sharp({ create: { width: OUTPUT_SIZE, height: OUTPUT_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fitted, left: Math.floor((OUTPUT_SIZE - metadata.width) / 2), top: OUTPUT_SIZE - metadata.height }])
      .png()
      .toFile(outputPath);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const appRoot = resolve(import.meta.dirname, "..");
  await extractTransparentPortraitGrid(
    join(appRoot, "assets-source/characters/retro-diffusion/sengoku-samurai-1522-source.png"),
    join(appRoot, "public/assets/characters/Sengoku Samurai Portrait Pack by Retro Diffusion"),
    "sengoku-samurai"
  );
}
