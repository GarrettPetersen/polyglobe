import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const characterRoot = join(appRoot, "public/assets/characters");
const manifestPath = join(characterRoot, "generated/character-portraits.json");
const characterAssetPrefix = "assets/characters/";
const outputDir = process.argv[2] || "/tmp/pixel-globe-character-expression-review";
const rowsPerPage = 6;
const portraitSize = 64;
const scale = 2;
const cellWidth = portraitSize * scale;
const labelHeight = 28;
const rowHeaderWidth = 190;

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const characters = manifest.sourceCharacters.filter((character) => character.expressions.length > 1);
const maxExpressions = Math.max(...characters.map((character) => character.expressions.length));

mkdirSync(outputDir, { recursive: true });
for (let pageStart = 0; pageStart < characters.length; pageStart += rowsPerPage) {
  const pageCharacters = characters.slice(pageStart, pageStart + rowsPerPage);
  const canvas = createCanvas(
    rowHeaderWidth + maxExpressions * cellWidth,
    pageCharacters.length * (cellWidth + labelHeight)
  );
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#14151f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < pageCharacters.length; row++) {
    const character = pageCharacters[row];
    const y = row * (cellWidth + labelHeight);
    ctx.fillStyle = row % 2 === 0 ? "#202330" : "#191c27";
    ctx.fillRect(0, y, canvas.width, cellWidth + labelHeight);
    ctx.fillStyle = "#f4ecd8";
    ctx.font = "12px monospace";
    wrapLabel(ctx, character.label, 8, y + 8, rowHeaderWidth - 16);

    for (let column = 0; column < character.expressions.length; column++) {
      const expression = character.expressions[column];
      if (!expression.src.startsWith(characterAssetPrefix)) {
        throw new Error(`Portrait expression has an invalid asset path: ${expression.src}`);
      }
      const relPath = decodeURIComponent(expression.src.slice(characterAssetPrefix.length));
      const image = await loadImage(join(characterRoot, relPath));
      const x = rowHeaderWidth + column * cellWidth;
      ctx.drawImage(image, x, y, cellWidth, cellWidth);
      ctx.fillStyle = expression.id === "neutral" ? "#f9c22b" : "#d7d9bf";
      ctx.font = "10px monospace";
      ctx.fillText(`${expression.index}: ${expression.id}`.slice(0, 20), x + 3, y + cellWidth + 5);
    }
  }

  const pageNumber = Math.floor(pageStart / rowsPerPage) + 1;
  const outputPath = join(outputDir, `character-expression-review-${String(pageNumber).padStart(2, "0")}.png`);
  writeFileSync(outputPath, canvas.toBuffer("image/png"));
  console.log(outputPath);
}

function wrapLabel(ctx, text, x, y, maxWidth) {
  const words = text.split(/\s+/);
  let line = "";
  let row = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    ctx.fillText(line, x, y + row * 15);
    line = word;
    row += 1;
  }
  if (line) ctx.fillText(line, x, y + row * 15);
}
