import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, createImageData, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  SHIP_RENDER_LAYER_BAKE_VERSION,
  bakeShipRenderLayerSheet,
  validateShipRenderLayerManifest
} from "../src/shipRenderLayerBake.js";
import { SHIP_ROWING_ANIMATION_SPECS } from "../src/shipRowingAnimation.js";
import { SHIP_STATS } from "../src/shipStats.js";
import {
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_HEADING_SUFFIX,
  SHIP_SPRITE_SHEET_COLS,
  SHIP_SPRITE_SHEET_HEIGHT,
  SHIP_SPRITE_SHEET_WIDTH
} from "../src/shipSpriteLayout.js";
import { shipMaxRasterWaterlineDepth } from "../src/shipWaterline.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vehicleRoot = join(appRoot, "public/assets/vehicles");
const outputRoot = join(vehicleRoot, "ship-render-layers");
const ROWING_STEMS = Object.freeze(["rowing", "pivot-port", "pivot-starboard"]);
const BUNDLE_COUNT = 4;

export async function bakeAllShipRenderLayers() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const bakedShips = [];
  for (const stats of SHIP_STATS) bakedShips.push(await bakeShip(stats.slug));
  const bundleGroups = assignBundles(bakedShips, BUNDLE_COUNT);
  const ships = {};
  const bundles = {};
  for (let bundleIndex = 0; bundleIndex < bundleGroups.length; bundleIndex++) {
    const bundleName = `ship-render-layers-${bundleIndex}.bin`;
    const entries = [...bundleGroups[bundleIndex]].sort((a, b) => a.slug.localeCompare(b.slug));
    let byteOffset = 0;
    for (const baked of entries) {
      ships[baked.slug] = {
        bundle: bundleName,
        byteOffset,
        byteLength: baked.png.length,
        ...baked.entry
      };
      byteOffset += baked.png.length;
    }
    const bytes = Buffer.concat(entries.map((entry) => entry.png), byteOffset);
    bundles[bundleName] = { byteLength: bytes.length };
    await writeFile(join(outputRoot, bundleName), bytes);
  }
  const manifest = {
    version: SHIP_RENDER_LAYER_BAKE_VERSION,
    frameSize: SHIP_SPRITE_FRAME_SIZE,
    headingCount: SHIP_SPRITE_HEADINGS,
    sheetColumns: SHIP_SPRITE_SHEET_COLS,
    bundles,
    ships
  };
  validateShipRenderLayerManifest(manifest, SHIP_STATS.map((stats) => stats.slug));
  await writeFile(
    join(outputRoot, "manifest.json"),
    `${JSON.stringify(manifest)}\n`
  );
  return manifest;
}

async function bakeShip(slug) {
  const sourceKeys = shipSourceKeys(slug);
  const atlas = createCanvas(SHIP_SPRITE_SHEET_WIDTH * 2, SHIP_SPRITE_SHEET_HEIGHT * sourceKeys.length);
  const context = atlas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const sources = {};
  for (let row = 0; row < sourceKeys.length; row++) {
    const sourceKey = sourceKeys[row];
    const [colorImage, depthImage] = await Promise.all([
      loadImage(join(vehicleRoot, `${sourceKey}.png`)),
      loadImage(join(vehicleRoot, `${sourceKey}-sink-depth.png`))
    ]);
    validateSheetDimensions(colorImage, `${slug}/${sourceKey}`);
    validateSheetDimensions(depthImage, `${slug}/${sourceKey} sink-depth`);
    const colorPixels = imagePixels(colorImage);
    const depthPixels = imagePixels(depthImage);
    const baked = bakeShipRenderLayerSheet({
      colorPixels,
      depthPixels,
      width: SHIP_SPRITE_SHEET_WIDTH,
      height: SHIP_SPRITE_SHEET_HEIGHT,
      frameSize: SHIP_SPRITE_FRAME_SIZE,
      sheetColumns: SHIP_SPRITE_SHEET_COLS,
      headingCount: SHIP_SPRITE_HEADINGS,
      maxRasterDepth: shipMaxRasterWaterlineDepth(slug)
    });
    const y = row * SHIP_SPRITE_SHEET_HEIGHT;
    context.putImageData(
      createImageData(baked.abovePixels, SHIP_SPRITE_SHEET_WIDTH, SHIP_SPRITE_SHEET_HEIGHT),
      0,
      y
    );
    context.putImageData(
      createImageData(baked.submergedPixels, SHIP_SPRITE_SHEET_WIDTH, SHIP_SPRITE_SHEET_HEIGHT),
      SHIP_SPRITE_SHEET_WIDTH,
      y
    );
    sources[sourceKey] = { row, frames: baked.frames };
  }
  return {
    slug,
    png: atlas.toBuffer("image/png"),
    entry: {
      width: atlas.width,
      height: atlas.height,
      sources
    }
  };
}

function assignBundles(entries, bundleCount) {
  if (!Number.isInteger(bundleCount) || bundleCount <= 0 || bundleCount > entries.length) {
    throw new Error(`Invalid ship render-layer bundle count: ${bundleCount}`);
  }
  const groups = Array.from({ length: bundleCount }, () => []);
  const sizes = new Array(bundleCount).fill(0);
  const largestFirst = [...entries].sort((a, b) => (
    b.png.length - a.png.length || a.slug.localeCompare(b.slug)
  ));
  for (const entry of largestFirst) {
    let target = 0;
    for (let index = 1; index < sizes.length; index++) {
      if (sizes[index] < sizes[target]) target = index;
    }
    groups[target].push(entry);
    sizes[target] += entry.png.length;
  }
  return groups;
}

function shipSourceKeys(slug) {
  const keys = [`unity-ships/${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`];
  const rowing = SHIP_ROWING_ANIMATION_SPECS.get(slug);
  if (!rowing) return keys;
  for (const stem of ROWING_STEMS) {
    for (let frame = 0; frame < rowing.frames; frame++) {
      keys.push(`unity-ships/${slug}-${stem}-${frame}-${SHIP_SPRITE_HEADING_SUFFIX}`);
    }
  }
  return keys;
}

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height).data;
}

function validateSheetDimensions(image, label) {
  if (image.width !== SHIP_SPRITE_SHEET_WIDTH || image.height !== SHIP_SPRITE_SHEET_HEIGHT) {
    throw new Error(
      `${label} is ${image.width}x${image.height}; expected ` +
      `${SHIP_SPRITE_SHEET_WIDTH}x${SHIP_SPRITE_SHEET_HEIGHT}`
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await bakeAllShipRenderLayers();
  process.stdout.write(
    `Baked ${Object.keys(manifest.ships).length} ship render-layer atlases into ` +
    `${Object.keys(manifest.bundles).length} bundles.\n`
  );
}
