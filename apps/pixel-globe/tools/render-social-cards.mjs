import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCanvas,
  loadImage,
  registerFont
} from "../../../examples/globe-demo/node_modules/canvas/index.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(appRoot, "public/assets");
const socialRoot = join(assetRoot, "social");
const sourcePath = join(socialRoot, "gameplay-source.png");

registerFont(join(assetRoot, "fonts/Silkscreen-Regular.ttf"), { family: "Silkscreen" });
registerFont(join(assetRoot, "fonts/Tiny5-Regular.ttf"), { family: "Tiny5" });

const source = await loadImage(sourcePath);
mkdirSync(socialRoot, { recursive: true });

renderCard("marque-and-reprisal-og.png", 1200, 630);
renderCard("marque-and-reprisal-twitter.png", 1200, 675);

function renderCard(filename, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  drawImageCover(ctx, source, width, height);

  ctx.fillStyle = "rgba(16, 20, 23, 0.22)";
  ctx.fillRect(0, 0, width, height);
  const bandY = height - 240;
  ctx.fillStyle = "rgba(20, 24, 26, 0.92)";
  ctx.fillRect(0, bandY, width, height - bandY);

  ctx.strokeStyle = "#fff1bf";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.strokeStyle = "#8ac0b4";
  ctx.lineWidth = 3;
  ctx.strokeRect(31.5, 31.5, width - 63, height - 63);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f9c22b";
  ctx.font = fitFont(ctx, "MARQUE & REPRISAL", "Silkscreen", 56, width - 128);
  ctx.fillText("MARQUE & REPRISAL", 64, bandY + 68);

  ctx.fillStyle = "#fff1bf";
  ctx.font = "29px Tiny5";
  ctx.fillText("TRADE. FISH. EXPLORE. PLUNDER.", 66, bandY + 126);

  ctx.fillStyle = "#c7dcd0";
  ctx.font = "22px Silkscreen";
  ctx.fillText("1522  |  ONLINE PROTOTYPE", 66, bandY + 174);

  const outputPath = join(socialRoot, filename);
  writeFileSync(outputPath, canvas.toBuffer("image/png"));
  console.log(outputPath);
}

function drawImageCover(ctx, image, width, height) {
  const sourceAspect = image.width / image.height;
  const targetAspect = width / height;
  if (sourceAspect > targetAspect) {
    const cropWidth = Math.round(image.height * targetAspect);
    const cropX = Math.floor((image.width - cropWidth) / 2);
    ctx.drawImage(image, cropX, 0, cropWidth, image.height, 0, 0, width, height);
    return;
  }
  const cropHeight = Math.round(image.width / targetAspect);
  const cropY = Math.floor((image.height - cropHeight) / 2);
  ctx.drawImage(image, 0, cropY, image.width, cropHeight, 0, 0, width, height);
}

function fitFont(ctx, text, family, initialSize, maxWidth) {
  let size = initialSize;
  while (size > 16) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return `${size}px ${family}`;
}
