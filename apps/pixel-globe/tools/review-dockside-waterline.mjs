import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_SUBMERGED_ALPHA, SHIP_WATERLINE_LEVEL, shipSubmergedSilhouettePixelKeys } from "../src/shipWaterline.js";
import { docksideShipWaterlinePixelKeys } from "../city-visualizer/cityDocksideShipWaterline.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(appRoot, "public/assets/vehicles/unity-ships/port-assault");
const manifest = JSON.parse(readFileSync(join(assetRoot, "manifest.json"), "utf8"));
const requested = process.argv[2];
if (process.argv.length !== 3) throw new Error("Usage: node tools/review-dockside-waterline.mjs <ship-slug | --all>");
const ships = requested === "--all" ? manifest.ships : manifest.ships.filter(ship => ship.slug === requested);
if (ships.length === 0) throw new Error(`Unknown dockside ship: ${requested}`);
async function reviewShip(ship) {
  const slug = ship.slug;
  const { width, height, opaqueBounds: bounds } = ship.cityDockside;
  async function pixelsFor(suffix) {
    const image = await loadImage(join(assetRoot, `${slug}-city-dockside${suffix}.png`));
    if (image.width !== width || image.height !== height) throw new Error(`${slug}: mismatched ${suffix} dimensions`);
    const canvas = createCanvas(width, height);
    canvas.getContext("2d").drawImage(image, 0, 0);
    return { canvas, rgba: canvas.getContext("2d").getImageData(0, 0, width, height).data };
  }
  const color = await pixelsFor("");
  const sink = await pixelsFor("-sink-depth");
  const pixels = [];
  for (let p = 0; p < width * height; p++) {
    if (color.rgba[p * 4 + 3] !== sink.rgba[p * 4 + 3]) throw new Error(`${slug}: mismatched alpha at ${p}`);
    if (color.rgba[p * 4 + 3]) pixels.push({ x: p % width, y: Math.floor(p / width), sinkHeight: sink.rgba[p * 4] / 255 });
  }
  const submerged = shipSubmergedSilhouettePixelKeys(pixels, width, height);
  const waterline = docksideShipWaterlinePixelKeys(submerged, width, height);
  const scale = 2;
  const padding = 12;
  const labelHeight = 48;
  const cellWidth = Math.max(250, (bounds.width + padding * 2) * scale);
  const cellHeight = (bounds.height + padding * 2) * scale + labelHeight;
  const sheet = createCanvas(cellWidth * 3, cellHeight);
  const context = sheet.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (const [column, label] of ["PAINTED MASTER", "SUBMERGED MASK", "WATER COMPOSITE"].entries()) {
    const panel = createCanvas(width, height);
    const panelContext = panel.getContext("2d");
    panelContext.fillStyle = column === 2 ? "#4d9be6" : "#18243a";
    panelContext.fillRect(0, 0, width, height);
    const layer = panelContext.createImageData(width, height);
    for (const pixel of pixels) {
      const key = pixel.y * width + pixel.x;
      const offset = key * 4;
      layer.data.set(color.rgba.subarray(offset, offset + 4), offset);
      if (submerged.has(key)) {
        if (column === 1) layer.data.set([77, 155, 230, 255], offset);
        if (column === 2) layer.data[offset + 3] = Math.round(SHIP_SUBMERGED_ALPHA * 255);
      }
      if (column === 2 && waterline.has(key)) layer.data.set([77, 155, 230, 255], offset);
    }
    const foreground = createCanvas(width, height);
    foreground.getContext("2d").putImageData(layer, 0, 0);
    panelContext.drawImage(foreground, 0, 0);
    context.fillStyle = column === 2 ? "#4d9be6" : "#18243a";
    context.fillRect(column * cellWidth, 0, cellWidth, cellHeight);
    context.drawImage(panel, bounds.minX, bounds.minY, bounds.width, bounds.height,
      column * cellWidth + (cellWidth - bounds.width * scale) / 2, labelHeight + padding * scale,
      bounds.width * scale, bounds.height * scale);
    context.fillStyle = "#ffffff";
    context.font = "bold 18px monospace";
    context.textAlign = "center";
    context.fillText(label, (column + 0.5) * cellWidth, 28);
  }
  const output = join(appRoot, "docs/ship-reference/port-assault", `${slug}-dockside-waterline-review.png`);
  writeFileSync(output, sheet.toBuffer("image/png"));
  const report = { slug, bakedSubmergedPixels: pixels.filter(pixel => pixel.sinkHeight <= SHIP_WATERLINE_LEVEL).length,
    visibleSubmergedPixels: submerged.size, output };
  console.log(JSON.stringify(report));
}

for (const ship of ships) await reviewShip(ship);
