import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_STATS, shipLabelForSlug } from "../src/shipStats.js";
import {
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_SHEET_COLS
} from "../src/shipSpriteLayout.js";
import { nearestResurrect64Hex } from "../src/waterLatitudePalette.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const shipRoot = join(appRoot, "public/assets/vehicles/unity-ships");
const outputRoot = join(appRoot, "public/assets/ui/ship-icons");
const reviewPath = join(appRoot, "docs/ship-reference/ship-menu-icons.png");
const ICON_SIZE = 16;
const ICON_CONTENT_SIZE = 15;
const ICON_HEADING_FRAME = 28;
const MIN_ALPHA_COVERAGE = 0.08;

await main();

async function main() {
  if (ICON_HEADING_FRAME >= SHIP_SPRITE_HEADINGS) {
    throw new Error(`Ship menu icon frame is outside the heading bake: ${ICON_HEADING_FRAME}`);
  }
  mkdirSync(outputRoot, { recursive: true });

  const icons = [];
  const reviewIcons = [];
  for (const { slug } of SHIP_STATS) {
    const sheetPath = join(shipRoot, `${slug}-32-headings.png`);
    if (!existsSync(sheetPath)) throw new Error(`Missing ship sprite sheet for menu icon: ${sheetPath}`);
    const sheet = await loadImage(sheetPath);
    assertShipSheetDimensions(sheet, slug);
    const icon = rasterizeShipIcon(sheet, slug);
    const outputPath = join(outputRoot, `${slug}.png`);
    writeFileSync(outputPath, icon.canvas.toBuffer("image/png"));
    reviewIcons.push({ slug, label: shipLabelForSlug(slug), canvas: icon.canvas });
    icons.push({
      slug,
      label: shipLabelForSlug(slug),
      source: `public/assets/vehicles/unity-ships/${slug}-32-headings.png`,
      output: `public/assets/ui/ship-icons/${slug}.png`,
      headingFrame: ICON_HEADING_FRAME,
      sourceBounds: icon.sourceBounds,
      opaquePixels: icon.opaquePixels
    });
  }

  writeFileSync(join(outputRoot, "manifest.json"), `${JSON.stringify({
    generatedBy: "tools/build-ship-menu-icons.mjs",
    iconSize: ICON_SIZE,
    sourceFrameSize: SHIP_SPRITE_FRAME_SIZE,
    sourceHeadingFrame: ICON_HEADING_FRAME,
    ships: icons
  }, null, 2)}\n`);
  writeFileSync(reviewPath, buildReviewSheet(reviewIcons).toBuffer("image/png"));
  console.log(`Built ${icons.length} native 16x16 ship menu icons and ${reviewPath}`);
}

function assertShipSheetDimensions(image, slug) {
  const expectedWidth = SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
  const expectedHeight = Math.ceil(SHIP_SPRITE_HEADINGS / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
  if (image.width !== expectedWidth || image.height !== expectedHeight) {
    throw new Error(
      `Ship sprite sheet has stale dimensions for ${slug}: ${image.width}x${image.height}, ` +
      `expected ${expectedWidth}x${expectedHeight}`
    );
  }
}

function rasterizeShipIcon(sheet, slug) {
  const frameCanvas = createCanvas(SHIP_SPRITE_FRAME_SIZE, SHIP_SPRITE_FRAME_SIZE);
  const frameCtx = frameCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
  frameCtx.imageSmoothingEnabled = false;
  const frameX = (ICON_HEADING_FRAME % SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
  const frameY = Math.floor(ICON_HEADING_FRAME / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
  frameCtx.drawImage(
    sheet,
    frameX,
    frameY,
    SHIP_SPRITE_FRAME_SIZE,
    SHIP_SPRITE_FRAME_SIZE,
    0,
    0,
    SHIP_SPRITE_FRAME_SIZE,
    SHIP_SPRITE_FRAME_SIZE
  );
  const source = frameCtx.getImageData(0, 0, SHIP_SPRITE_FRAME_SIZE, SHIP_SPRITE_FRAME_SIZE);
  const sourceBounds = opaqueBounds(source.data, source.width, source.height);
  if (!sourceBounds) throw new Error(`Ship icon source frame is blank: ${slug}`);

  const scale = Math.min(
    ICON_CONTENT_SIZE / sourceBounds.w,
    ICON_CONTENT_SIZE / sourceBounds.h
  );
  const targetWidth = Math.max(1, Math.min(ICON_CONTENT_SIZE, Math.round(sourceBounds.w * scale)));
  const targetHeight = Math.max(1, Math.min(ICON_CONTENT_SIZE, Math.round(sourceBounds.h * scale)));
  const targetX = Math.floor((ICON_SIZE - targetWidth) / 2);
  const targetY = Math.floor((ICON_SIZE - targetHeight) / 2);
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  const output = ctx.createImageData(ICON_SIZE, ICON_SIZE);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const color = sampleCoverageColor(source, sourceBounds, x, y, targetWidth, targetHeight);
      if (!color) continue;
      const offset = ((targetY + y) * ICON_SIZE + targetX + x) * 4;
      output.data[offset] = color.r;
      output.data[offset + 1] = color.g;
      output.data[offset + 2] = color.b;
      output.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(output, 0, 0);

  const opaquePixels = countOpaquePixels(output.data);
  if (opaquePixels < 8) throw new Error(`Ship menu icon lost its silhouette: ${slug} (${opaquePixels} pixels)`);
  return { canvas, sourceBounds, opaquePixels };
}

function sampleCoverageColor(source, bounds, targetX, targetY, targetWidth, targetHeight) {
  const sourceX0 = bounds.x + targetX * bounds.w / targetWidth;
  const sourceX1 = bounds.x + (targetX + 1) * bounds.w / targetWidth;
  const sourceY0 = bounds.y + targetY * bounds.h / targetHeight;
  const sourceY1 = bounds.y + (targetY + 1) * bounds.h / targetHeight;
  const sampleArea = (sourceX1 - sourceX0) * (sourceY1 - sourceY0);
  const colorWeights = new Map();
  let alphaArea = 0;

  for (let sy = Math.floor(sourceY0); sy < Math.ceil(sourceY1); sy += 1) {
    const overlapY = Math.max(0, Math.min(sourceY1, sy + 1) - Math.max(sourceY0, sy));
    if (overlapY === 0) continue;
    for (let sx = Math.floor(sourceX0); sx < Math.ceil(sourceX1); sx += 1) {
      const overlapX = Math.max(0, Math.min(sourceX1, sx + 1) - Math.max(sourceX0, sx));
      if (overlapX === 0) continue;
      const offset = (sy * source.width + sx) * 4;
      const alpha = source.data[offset + 3] / 255;
      if (alpha === 0) continue;
      const weight = overlapX * overlapY * alpha;
      alphaArea += weight;
      const key = `${source.data[offset]},${source.data[offset + 1]},${source.data[offset + 2]}`;
      colorWeights.set(key, (colorWeights.get(key) || 0) + weight);
    }
  }

  if (alphaArea / sampleArea < MIN_ALPHA_COVERAGE) return null;
  let selectedKey = null;
  let selectedWeight = -1;
  for (const [key, weight] of colorWeights) {
    if (weight > selectedWeight) {
      selectedKey = key;
      selectedWeight = weight;
    }
  }
  if (!selectedKey) return null;
  const [r, g, b] = selectedKey.split(",").map(Number);
  return hexToRgb(nearestResurrect64Hex(r, g, b));
}

function opaqueBounds(pixels, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function countOpaquePixels(pixels) {
  let count = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] !== 0) count += 1;
  }
  return count;
}

function hexToRgb(hex) {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) throw new Error(`Invalid palette color: ${hex}`);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function buildReviewSheet(icons) {
  const columns = 6;
  const cellWidth = 168;
  const cellHeight = 92;
  const rows = Math.ceil(icons.length / columns);
  const canvas = createCanvas(columns * cellWidth, rows * cellHeight);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#ead4aa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#715033";
  ctx.fillStyle = "#2f241c";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let index = 0; index < icons.length; index += 1) {
    const icon = icons[index];
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cellX = column * cellWidth;
    const cellY = row * cellHeight;
    ctx.strokeRect(cellX + 0.5, cellY + 0.5, cellWidth - 1, cellHeight - 1);
    ctx.fillText(icon.label, cellX + cellWidth / 2, cellY + 7);
    ctx.drawImage(icon.canvas, cellX + 52, cellY + 24, 64, 64);
  }

  return canvas;
}
