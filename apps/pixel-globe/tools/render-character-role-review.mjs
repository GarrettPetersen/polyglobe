import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  PORTRAIT_ROLE_ACCENT,
  PORTRAIT_ROLE_CLOTH,
  PORTRAIT_ROLE_HAIR,
  PORTRAIT_ROLE_SKIN,
  applyPortraitPaletteSwap,
  decodePortraitRoleMap
} from "../src/characterPortraits.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const characterRoot = join(appRoot, "public/assets/characters");
const manifestPath = join(characterRoot, "generated/character-portraits.json");
const outputDir = process.argv[2] || "/tmp/pixel-globe-character-role-review";
const portraitsPerPage = 25;
const columns = 5;
const portraitSize = 64;
const previewScale = 2;
const panelWidth = portraitSize * previewScale;
const tileWidth = panelWidth * 3;
const labelHeight = 24;
const tileHeight = panelWidth + labelHeight;
const roleColors = new Map([
  [PORTRAIT_ROLE_SKIN, "#ff8e72"],
  [PORTRAIT_ROLE_HAIR, "#d66bff"],
  [PORTRAIT_ROLE_CLOTH, "#56a8ff"],
  [PORTRAIT_ROLE_ACCENT, "#ffd65a"]
]);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const samplePalette = {
  skinRamp: manifest.skinTones[5].ramp,
  hairRamp: manifest.hairTones[4].ramp,
  clothRamp: manifest.outfitPalettes[4].clothRamp,
  accentRamp: manifest.outfitPalettes[14].accentRamp
};

mkdirSync(outputDir, { recursive: true });
for (let pageStart = 0; pageStart < manifest.sourceCharacters.length; pageStart += portraitsPerPage) {
  const pageCharacters = manifest.sourceCharacters.slice(pageStart, pageStart + portraitsPerPage);
  const rows = Math.ceil(pageCharacters.length / columns);
  const canvas = createCanvas(tileWidth * columns, tileHeight * rows);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#14151f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "10px monospace";
  ctx.textBaseline = "top";

  for (let index = 0; index < pageCharacters.length; index++) {
    const character = pageCharacters[index];
    const expression = character.expressions.find((item) => item.id === "neutral") || character.expressions[0];
    const relPath = decodeURIComponent(expression.src.slice("/assets/characters/".length));
    const image = await loadImage(join(characterRoot, relPath));
    const sourceCanvas = createCanvas(portraitSize, portraitSize);
    const sourceCtx = sourceCanvas.getContext("2d");
    sourceCtx.drawImage(image, 0, 0);
    const sourcePixels = sourceCtx.getImageData(0, 0, portraitSize, portraitSize);
    const recoloredPixels = new Uint8ClampedArray(sourcePixels.data);
    applyPortraitPaletteSwap(recoloredPixels, portraitSize, portraitSize, samplePalette, expression.roleMap);
    const recoloredCanvas = createCanvas(portraitSize, portraitSize);
    const recoloredCtx = recoloredCanvas.getContext("2d");
    const recoloredImage = recoloredCtx.createImageData(portraitSize, portraitSize);
    recoloredImage.data.set(recoloredPixels);
    recoloredCtx.putImageData(recoloredImage, 0, 0);
    const roleCanvas = roleOverlayCanvas(sourceCanvas, expression.roleMap);
    const x = (index % columns) * tileWidth;
    const y = Math.floor(index / columns) * tileHeight;
    ctx.drawImage(sourceCanvas, x, y, panelWidth, panelWidth);
    ctx.drawImage(roleCanvas, x + panelWidth, y, panelWidth, panelWidth);
    ctx.drawImage(recoloredCanvas, x + panelWidth * 2, y, panelWidth, panelWidth);
    ctx.fillStyle = "#f4ecd8";
    ctx.fillText(`${pageStart + index + 1}. ${character.label}`.slice(0, 58), x + 4, y + panelWidth + 4);
  }

  const pageNumber = Math.floor(pageStart / portraitsPerPage) + 1;
  const outputPath = join(outputDir, `character-role-review-${String(pageNumber).padStart(2, "0")}.png`);
  writeFileSync(outputPath, canvas.toBuffer("image/png"));
  console.log(outputPath);
}

function roleOverlayCanvas(sourceCanvas, roleMap) {
  const canvas = createCanvas(portraitSize, portraitSize);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.globalAlpha = 0.72;
  const roles = decodePortraitRoleMap(roleMap, portraitSize * portraitSize);
  for (let pixel = 0; pixel < roles.length; pixel++) {
    if (!roles[pixel]) continue;
    ctx.fillStyle = roleColors.get(roles[pixel]);
    ctx.fillRect(pixel % portraitSize, Math.floor(pixel / portraitSize), 1, 1);
  }
  return canvas;
}
