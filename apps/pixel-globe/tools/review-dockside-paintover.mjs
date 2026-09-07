import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '../../../examples/globe-demo/node_modules/canvas/index.js';
import { docksidePaintoverSamples } from '../src/shipDocksidePaintover.js';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!/^[a-z]+(?:-[a-z]+)*$/.test(slug ?? '')) throw new Error('Expected a ship slug');
const guideRoot = join(app, '.captures/fleet-art/geometry');
const geometry = JSON.parse(readFileSync(join(guideRoot, `${slug}.json`)));
const source = await loadImage(join(guideRoot, `${slug}.png`));
const painting = await loadImage(join(app, 'art/ships/dockside', `${slug}.png`));
for (const [label, image] of [['geometry', source], ['painting', painting]]) {
  if (image.width !== geometry.width || image.height !== geometry.height) {
    throw new Error(`${slug}: ${label} must match the ${geometry.width}x${geometry.height} registered frame`);
  }
}
function rgba(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}
const original = rgba(source);
const alpha = Uint8Array.from({ length: original.length / 4 }, (_, i) => original[i * 4 + 3] ? 1 : 0);
const bounds = geometry.opaqueBounds;
const crop = { x: bounds.minX - 12, y: bounds.minY - 12, width: bounds.width + 24, height: bounds.height + 24 };
const canvas = createCanvas(crop.width * 4 + 16, crop.height * 2 + 40);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#4067a5';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#ffffff';
ctx.font = '14px monospace';
ctx.fillText(`${slug}  geometry / painting`, 8, 20);
ctx.imageSmoothingEnabled = false;
ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 32, crop.width * 2, crop.height * 2);
ctx.drawImage(painting, crop.x, crop.y, crop.width, crop.height, crop.width * 2 + 16, 32, crop.width * 2, crop.height * 2);
const output = join(app, '.captures/fleet-art/reviews');
mkdirSync(output, { recursive: true });
writeFileSync(join(output, `${slug}.png`), canvas.toBuffer('image/png'));
const { samples, ...registration } = docksidePaintoverSamples({
  rgba: rgba(painting), width: geometry.width, height: geometry.height,
  sourceAlpha: alpha, maximumDistancePx: 32
});
console.log(JSON.stringify({ slug, ...registration, geometrySha256: geometry.geometrySha256 }));
