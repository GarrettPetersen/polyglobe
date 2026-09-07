import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_STATS, shipLabelForSlug } from "../src/shipStats.js";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(app, "public/assets/vehicles/unity-ships");
const output = join(app, ".captures/fleet-art");
const artRoot = join(app, "art/ships/dockside");
const freshGeometry = process.argv.includes("--fresh-geometry");
const slugs = process.argv.slice(2).filter(arg => arg !== "--fresh-geometry");
if (slugs.some(slug => !SHIP_STATS.some(ship => ship.slug === slug))) {
  throw new Error("Usage: node tools/prepare-fleet-art.mjs [--fresh-geometry] [ship-slug ...]");
}
mkdirSync(output, { recursive: true });
const guides = [];
for (const ship of SHIP_STATS.filter(ship => slugs.length === 0 || slugs.includes(ship.slug))) {
  const label = shipLabelForSlug(ship.slug);
  const geometry = freshGeometry
    ? JSON.parse(readFileSync(join(output, "geometry", `${ship.slug}.json`)))
    : JSON.parse(readFileSync(join(artRoot, `${ship.slug}-registration.json`))).sourceFrame;
  const image = await loadImage(freshGeometry
    ? join(output, "geometry", `${ship.slug}.png`)
    : join(artRoot, `${ship.slug}-geometry.png`));
  const bounds = geometry.opaqueBounds;
  const crop = { x: bounds.minX - 4, y: bounds.minY - 4, width: bounds.width + 8, height: bounds.height + 8 };
  const scale = Math.max(2, Math.floor(1100 / Math.max(crop.width, crop.height)));
  const guide = createCanvas(crop.width * scale, crop.height * scale);
  const context = guide.getContext("2d");
  context.fillStyle = "#92a984";
  context.fillRect(0, 0, guide.width, guide.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, guide.width, guide.height);
  writeFileSync(join(output, `${ship.slug}-guide.png`), guide.toBuffer("image/png"));

  const profile = await loadImage(join(assetRoot, "side-views", `${ship.slug}.png`));
  const sailing = await loadImage(join(assetRoot, `${ship.slug}-32-headings.png`));
  const reference = createCanvas(768, 720);
  const ctx = reference.getContext("2d");
  ctx.fillStyle = "#92a984";
  ctx.fillRect(0, 0, reference.width, reference.height);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#2e222f";
  ctx.font = "bold 18px monospace";
  ctx.fillText(`${label} · IDENTITY REFERENCE`, 16, 25);
  ctx.fillText("PROFILE — preserve hull, trim and rig design", 16, 58);
  ctx.drawImage(profile, 0, 0, 192, 104, 0, 65, 768, 416);
  for (let heading = 0; heading < 4; heading++) {
    ctx.drawImage(sailing, 0, heading * 47, 47, 47, heading * 188, 510, 188, 188);
  }
  writeFileSync(join(output, `${ship.slug}-identity.png`), reference.toBuffer("image/png"));
  guides.push({ slug: ship.slug, label, crop, scale });
}
writeFileSync(join(output, "guides.json"), JSON.stringify(guides, null, 2) + "\n");
console.log(`Prepared ${guides.length} geometry guides and identity references`);
