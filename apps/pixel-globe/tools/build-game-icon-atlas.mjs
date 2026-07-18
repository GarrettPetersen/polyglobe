import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  GAME_ICON_ASSET_VERSION,
  GAME_ICON_PACKS,
  GAME_ICON_SIZE,
  GAME_ICON_SOURCES,
  gameIconAtlasDimensions,
  gameIconAtlasRect
} from "../src/gameIcons.js";
import { nearestResurrect64Hex } from "../src/waterLatitudePalette.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputPath = join(appRoot, "public/assets/ui/game-icons.png");
const manifestPath = join(appRoot, "public/assets/ui/game-icons.json");
const sourceRoot = resolve(process.env.PIXEL_GLOBE_ICON_PACK_DIR || join(homedir(), "Downloads"));

async function main() {
  const dimensions = gameIconAtlasDimensions();
  const canvas = createCanvas(dimensions.width, dimensions.height);
  const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const [iconId, source] of Object.entries(GAME_ICON_SOURCES)) {
    const image = await loadIconSource(source);
    const crop = source.crop || { x: 0, y: 0, w: image.width, h: image.height };
    if (crop.x < 0 || crop.y < 0 || crop.x + crop.w > image.width || crop.y + crop.h > image.height) {
      throw new Error(`Icon crop is outside source image: ${iconId}`);
    }
    const rect = gameIconAtlasRect(iconId);
    ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, rect.x, rect.y, GAME_ICON_SIZE, GAME_ICON_SIZE);
  }

  quantizeToResurrect(ctx, dimensions.width, dimensions.height);
  assertEveryIconHasPixels(ctx);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, canvas.toBuffer("image/png"));
  writeFileSync(manifestPath, `${JSON.stringify({
    version: GAME_ICON_ASSET_VERSION,
    palette: "Resurrect 64",
    width: dimensions.width,
    height: dimensions.height,
    iconSize: GAME_ICON_SIZE,
    icons: Object.entries(GAME_ICON_SOURCES).map(([id, source]) => ({
      id,
      rect: gameIconAtlasRect(id),
      packId: source.packId,
      assetPath: source.assetPath || null
    })),
    packs: GAME_ICON_PACKS
  }, null, 2)}\n`);
  console.log(`Built ${Object.keys(GAME_ICON_SOURCES).length} game icons at ${outputPath}`);
}

async function loadIconSource(source) {
  if (source.generatedId) return generateIcon(source.generatedId);
  if (source.assetPath) {
    const assetPath = join(appRoot, source.assetPath);
    if (!existsSync(assetPath)) throw new Error(`Missing project icon asset: ${assetPath}`);
    return loadImage(assetPath);
  }
  const pack = GAME_ICON_PACKS[source.packId];
  if (!pack) throw new Error(`Unknown icon source pack: ${source.packId}`);
  const archivePath = join(sourceRoot, pack.archive);
  if (!existsSync(archivePath)) throw new Error(`Missing icon pack archive: ${archivePath}`);
  const bytes = execFileSync("unzip", ["-p", archivePath, source.entry], { maxBuffer: 8 * 1024 * 1024 });
  if (bytes.length === 0) throw new Error(`Icon source is empty: ${pack.archive}/${source.entry}`);
  return loadImage(bytes);
}

function generateIcon(generatedId) {
  if (generatedId === "gray-waypoint-arrow") return generateGrayWaypointArrow();
  if (generatedId === "cinnamon-sticks") return generateCinnamonSticks();
  if (generatedId === "beaver-pelt") return generateBeaverPelt();
  throw new Error(`Unknown generated game icon: ${generatedId}`);
}

function generateGrayWaypointArrow() {
  const canvas = createCanvas(GAME_ICON_SIZE, GAME_ICON_SIZE);
  const ctx = canvas.getContext("2d", { alpha: true });
  const columns = [6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1];
  ctx.fillStyle = "#1a1c2c";
  for (let index = 0; index < columns.length; index++) {
    const x = 4 + index;
    const halfHeight = columns[index];
    ctx.fillRect(x + 1, 9 - halfHeight, 1, halfHeight * 2 + 1);
  }
  for (let index = 0; index < columns.length; index++) {
    const x = 3 + index;
    const halfHeight = columns[index];
    ctx.fillStyle = "#94b0c2";
    ctx.fillRect(x, 8 - halfHeight, 1, halfHeight + 1);
    ctx.fillStyle = "#566c86";
    ctx.fillRect(x, 9, 1, halfHeight);
  }
  return canvas;
}

function generateCinnamonSticks() {
  const canvas = createCanvas(GAME_ICON_SIZE, GAME_ICON_SIZE);
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = false;
  drawCinnamonStick(ctx, 2, 11, 11, 2);
  drawCinnamonStick(ctx, 5, 14, 14, 5);
  return canvas;
}

function drawCinnamonStick(ctx, startX, startY, endX, endY) {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  for (let step = 0; step <= steps; step++) {
    const x = Math.round(startX + (endX - startX) * step / steps);
    const y = Math.round(startY + (endY - startY) * step / steps);
    ctx.fillStyle = "#3b2027";
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = "#8f563b";
    ctx.fillRect(x, y - 1, 2, 2);
    ctx.fillStyle = "#d3a068";
    ctx.fillRect(x, y - 1, 1, 1);
  }
  ctx.fillStyle = "#3b2027";
  ctx.fillRect(endX - 1, endY - 1, 3, 3);
  ctx.fillStyle = "#d3a068";
  ctx.fillRect(endX, endY, 1, 1);
}

function generateBeaverPelt() {
  const canvas = createCanvas(GAME_ICON_SIZE, GAME_ICON_SIZE);
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#3b2027";
  for (const [x, y, width] of [
    [6, 1, 4],
    [5, 2, 6],
    [4, 3, 8],
    [2, 4, 12],
    [1, 5, 14],
    [2, 6, 12],
    [2, 7, 12],
    [2, 8, 12],
    [2, 9, 12],
    [1, 10, 14],
    [2, 11, 12],
    [4, 12, 8],
    [5, 13, 6],
    [6, 14, 4]
  ]) ctx.fillRect(x, y, width, 1);

  ctx.fillStyle = "#663931";
  ctx.fillRect(5, 3, 6, 9);
  ctx.fillRect(3, 5, 10, 6);
  ctx.fillStyle = "#8f563b";
  ctx.fillRect(6, 3, 4, 9);
  ctx.fillRect(4, 6, 8, 4);
  ctx.fillStyle = "#d3a068";
  ctx.fillRect(6, 4, 2, 1);
  ctx.fillRect(5, 6, 2, 2);
  ctx.fillRect(8, 9, 3, 2);
  ctx.fillRect(7, 12, 2, 1);
  return canvas;
}

function quantizeToResurrect(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const cache = new Map();
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (image.data[offset + 3] === 0) continue;
    image.data[offset + 3] = 255;
    const key = `${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`;
    let target = cache.get(key);
    if (!target) {
      const hex = nearestResurrect64Hex(image.data[offset], image.data[offset + 1], image.data[offset + 2]);
      target = [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16)
      ];
      cache.set(key, target);
    }
    image.data[offset] = target[0];
    image.data[offset + 1] = target[1];
    image.data[offset + 2] = target[2];
  }
  ctx.putImageData(image, 0, 0);
}

function assertEveryIconHasPixels(ctx) {
  for (const iconId of Object.keys(GAME_ICON_SOURCES)) {
    const rect = gameIconAtlasRect(iconId);
    const pixels = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
    let opaque = 0;
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset] > 0) opaque += 1;
    }
    if (opaque < 3) throw new Error(`Game icon is blank or unreadable: ${iconId}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
