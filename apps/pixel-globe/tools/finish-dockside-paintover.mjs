import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { DOCKSIDE_KEY_COLOR, isDocksideKeyColor, shipPaintoverQuantizer } from "../src/shipPaintoverFinishing.js";
import { coalesceShipPixelArtColors } from "../src/shipPixelArtCleanup.js";
const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const manifest = JSON.parse(readFileSync(join(app, "public/assets/vehicles/unity-ships/port-assault/manifest.json")));
const entry = manifest.ships.find(ship => ship.slug === slug);
if (!entry || process.argv.length !== 3) throw new Error("Usage: node tools/finish-dockside-paintover.mjs <ship-slug>");
const art = join(app, "art/ships/dockside");
if (slug === "galleon") throw new Error("The approved galleon has a separately documented conversion; preserve its master");
const paletteHex = JSON.parse(readFileSync(join(art, "palettes.json"))).ships[slug]?.dockside;
const registration = JSON.parse(readFileSync(join(art, `${slug}-registration.json`)));
const quantize = shipPaintoverQuantizer(paletteHex);
function colorAt(pixels, offset) {
  const [r, g, b] = pixels.subarray(offset, offset + 3);
  return isDocksideKeyColor(r, g, b) ? DOCKSIDE_KEY_COLOR : quantize(r, g, b);
}
const source = await loadImage(join(art, `${slug}-paintover-reference.png`));
const canvas = createCanvas(source.width, source.height);
const ctx = canvas.getContext("2d");
ctx.drawImage(source, 0, 0);
const pixels = ctx.getImageData(0, 0, source.width, source.height);
let minX = source.width;
let minY = source.height;
let maxX = -1;
let maxY = -1;
for (let p = 0; p < pixels.data.length / 4; p++) {
  const o = p * 4;
  const c = colorAt(pixels.data, o);
  pixels.data.set([...c, 255], o);
  if (c !== DOCKSIDE_KEY_COLOR) {
    minX = Math.min(minX, p % source.width);
    maxX = Math.max(maxX, p % source.width);
    minY = Math.min(minY, Math.floor(p / source.width));
    maxY = Math.max(maxY, Math.floor(p / source.width));
  }
}
if (maxX < minX) throw new Error(`${slug}: blank reference`);
ctx.putImageData(pixels, 0, 0);
const tight = createCanvas(maxX - minX + 1, maxY - minY + 1);
tight.getContext("2d").drawImage(canvas, minX, minY, tight.width, tight.height, 0, 0, tight.width, tight.height);
const bounds = registration.sourceFrame.opaqueBounds;
const scratch = join(app, ".captures/fleet-art/reconstruction");
mkdirSync(scratch, { recursive: true });
const inputPath = join(scratch, `${slug}-input.png`);
const outputPath = join(scratch, `${slug}.png`);
writeFileSync(inputPath, tight.toBuffer("image/png"));
const binary = join(app, ".captures/fleet-art/pixel-fixer-build/release/dockside-pixel-fixer");
execFileSync(binary, [inputPath, outputPath, String(bounds.width), String(bounds.height)], { stdio: "inherit" });
const png = readFileSync(outputPath);
const reconstructed = await loadImage(png);
if (reconstructed.width !== bounds.width || reconstructed.height !== bounds.height) throw new Error(`${slug}: unexpected reconstruction dimensions`);
const final = createCanvas(registration.sourceFrame.width, registration.sourceFrame.height);
const fc = final.getContext("2d");
fc.drawImage(reconstructed, bounds.minX, bounds.minY);
const image = fc.getImageData(0, 0, final.width, final.height);
let opaquePixels = 0;
const colors = new Set();
for (let o = 0; o < image.data.length; o += 4) {
  if (image.data[o + 3] < 128) { image.data.set([0, 0, 0, 0], o); continue; }
  const c = colorAt(image.data, o);
  if (c === DOCKSIDE_KEY_COLOR) { image.data.set([0, 0, 0, 0], o); continue; }
  image.data.set([...c, 255], o);
  opaquePixels++;
}
if (!opaquePixels) throw new Error(`${slug}: blank reconstruction`);
const cleaned = coalesceShipPixelArtColors(image.data, final.width, final.height,
  { minimumRegionPixels: 3, passes: 1 });
image.data.set(cleaned.rgba);
for (let o = 0; o < image.data.length; o += 4) {
  if (image.data[o + 3]) colors.add(Buffer.from(image.data.subarray(o, o + 3)).toString("hex"));
}
fc.putImageData(image, 0, 0);
writeFileSync(join(art, `${slug}.png`), final.toBuffer("image/png"));
const sha256 = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const metadata = {
  version: 1,
  engine: "Retro Diffusion Pixel Fixer grid reconstruction",
  engineRevision: "ef376e57e1c272633ca2dbf5f29ec3fcf6596465",
  cleanup: { minimumRegionPixels: 3, passes: 1 },
  geometrySha256: registration.geometrySha256,
  imageSha256: sha256(join(art, `${slug}.png`)),
  palette: paletteHex,
  referenceSha256: sha256(join(art, `${slug}-paintover-reference.png`)),
  referenceCrop: { minX, minY, width: tight.width, height: tight.height },
  placement: bounds,
  colors: [...colors].sort(),
  opaquePixels
};
writeFileSync(join(art, `${slug}-conversion.json`), JSON.stringify(metadata, null, 2) + "\n");
console.log(JSON.stringify({ slug, opaquePixels, colors: metadata.colors, placement: bounds }));
