import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '../../../examples/globe-demo/node_modules/canvas/index.js';
import { applyDayNightPaletteGrade } from '../src/dayNightPalette.js';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [slug, beforePath] = process.argv.slice(2);
if (process.argv.length !== 4 || !/^[a-z]+(?:-[a-z]+)*$/.test(slug ?? '')) {
  throw new Error('Usage: node tools/review-dockside-clarity.mjs <ship-slug> <before-master.png>');
}
const art = join(app, 'art/ships/dockside');
const { sourceFrame } = JSON.parse(readFileSync(join(art, `${slug}-registration.json`)));
const images = await Promise.all([loadImage(resolve(beforePath)), loadImage(join(art, `${slug}.png`))]);
for (const image of images) {
  if (image.width !== sourceFrame.width || image.height !== sourceFrame.height) {
    throw new Error(`${slug}: comparison requires two masters on the registered native canvas`);
  }
}
const bounds = sourceFrame.opaqueBounds;
const crop = { x: bounds.minX - 8, y: bounds.minY - 8, width: bounds.width + 16, height: bounds.height + 16 };
const output = join(app, '.captures/fleet-art/refinement');
mkdirSync(output, { recursive: true });
for (const scale of [1, 2]) {
  const cellWidth = Math.max(240, crop.width * scale);
  const cellHeight = crop.height * scale + 32;
  const sheet = createCanvas(cellWidth * 2, cellHeight * 2);
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const night of [false, true]) {
    for (const [column, image] of images.entries()) {
      const surface = createCanvas(image.width, image.height);
      const surfaceCtx = surface.getContext('2d');
      surfaceCtx.drawImage(image, 0, 0);
      if (night) {
        const pixels = surfaceCtx.getImageData(0, 0, surface.width, surface.height);
        applyDayNightPaletteGrade(pixels.data, surface.width, surface.height, { sunset: 0, night: 1 });
        surfaceCtx.putImageData(pixels, 0, 0);
      }
      const x = column * cellWidth;
      const y = Number(night) * cellHeight;
      ctx.fillStyle = night ? '#323353' : '#7f9860';
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(`${column ? 'AFTER' : 'BEFORE'} / ${night ? 'NIGHT' : 'DAY'} / ${scale}x`, x + 8, y + 22);
      ctx.drawImage(surface, crop.x, crop.y, crop.width, crop.height,
        x + Math.floor((cellWidth - crop.width * scale) / 2), y + 32, crop.width * scale, crop.height * scale);
    }
  }
  const path = join(output, `${slug}-clarity-${scale}x.png`);
  writeFileSync(path, sheet.toBuffer('image/png'));
  console.log(path);
}
