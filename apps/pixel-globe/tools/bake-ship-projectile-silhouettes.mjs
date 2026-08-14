import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

import { shipProjectileSilhouetteFromAlpha } from "../src/shipFootprint.js";

const assetRoot = new URL("../public/assets/vehicles/unity-ships/", import.meta.url);
const manifestPath = new URL("manifest.json", assetRoot);
const footprintsPath = new URL("hull-footprints.json", assetRoot);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const bake = JSON.parse(readFileSync(footprintsPath, "utf8"));

if (!Array.isArray(manifest.ships) || manifest.ships.length === 0) {
  throw new Error("Ship sprite manifest contains no ships");
}
if (!bake.ships || typeof bake.ships !== "object" || Array.isArray(bake.ships)) {
  throw new Error("Ship hull footprint bake is missing its ships object");
}

const manifestSlugs = new Set(manifest.ships.map((ship) => ship.slug));
const footprintSlugs = new Set(Object.keys(bake.ships));
if (manifestSlugs.size !== footprintSlugs.size || [...manifestSlugs].some((slug) => !footprintSlugs.has(slug))) {
  throw new Error("Ship sprite manifest and hull footprint bake rosters differ");
}

for (const ship of manifest.ships) {
  const frameSize = ship.frameSize;
  const headings = ship.headings;
  const sheetCols = ship.sheetCols;
  const frames = bake.ships[ship.slug];
  if (!Number.isInteger(frameSize) || !Number.isInteger(headings) || !Number.isInteger(sheetCols)) {
    throw new Error(`Ship sprite manifest has invalid dimensions for ${ship.slug}`);
  }
  if (!Array.isArray(frames) || frames.length !== headings) {
    throw new Error(`Ship hull footprint heading count differs for ${ship.slug}`);
  }
  const sheetName = basename(ship.files?.sheet || "");
  if (!sheetName) throw new Error(`Ship sprite manifest is missing its sheet for ${ship.slug}`);
  const image = await loadImage(join(assetRoot.pathname, sheetName));
  const expectedWidth = frameSize * sheetCols;
  const expectedHeight = frameSize * Math.ceil(headings / sheetCols);
  if (image.width !== expectedWidth || image.height !== expectedHeight) {
    throw new Error(
      `Ship sprite sheet has invalid dimensions for ${ship.slug}: ` +
      `${image.width}x${image.height}, expected ${expectedWidth}x${expectedHeight}`
    );
  }
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  for (let frameIndex = 0; frameIndex < headings; frameIndex++) {
    const cellX = (frameIndex % sheetCols) * frameSize;
    const cellY = Math.floor(frameIndex / sheetCols) * frameSize;
    const rgba = context.getImageData(cellX, cellY, frameSize, frameSize).data;
    const alpha = new Uint8Array(frameSize * frameSize);
    for (let pixel = 0; pixel < alpha.length; pixel++) alpha[pixel] = rgba[pixel * 4 + 3];
    frames[frameIndex].projectilePolygon = shipProjectileSilhouetteFromAlpha(
      alpha,
      frameSize,
      frameSize
    );
  }
}

bake.projectileSilhouettesGeneratedBy = "tools/bake-ship-projectile-silhouettes.mjs";
writeFileSync(footprintsPath, `${JSON.stringify(bake)}\n`);
console.log(`Baked projectile silhouettes for ${manifest.ships.length} ships`);
