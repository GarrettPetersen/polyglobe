import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  RESURRECT_64_HEX,
  nearestResurrect64Hex
} from "../src/waterLatitudePalette.js";
import { removePortraitChromaFringe } from "../src/portraitChromaKey.js";

const GRID_SIZE = 4;
const PORTRAIT_SIZE = 64;
const NATIVE_SHEET_SIZE = GRID_SIZE * PORTRAIT_SIZE;
const MIN_OPAQUE_PIXELS = 500;
const MAX_OPAQUE_PIXELS = 3500;

async function main() {
  const [sourceArg, outputArg, slug, sourceCopyArg, chromaKey = "green", downscaleOption] = process.argv.slice(2);
  if (!sourceArg || !outputArg || !slug) {
    throw new Error(
      "Usage: node tools/process-generated-character-sheet.mjs <source.png> <output-dir> <slug> [source-copy.png] [green|magenta] [--retro-diffusion]"
    );
  }
  if (downscaleOption !== undefined && downscaleOption !== "--retro-diffusion") {
    throw new Error(`Unknown downscale option: ${downscaleOption}`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`Portrait slug must be lowercase kebab-case: ${slug}`);
  }

  const sourcePath = resolve(sourceArg);
  const outputDir = resolve(outputArg);
  const sourceCopyPath = sourceCopyArg ? resolve(sourceCopyArg) : null;
  const sourceImage = await loadImage(sourcePath);
  if (sourceImage.width < NATIVE_SHEET_SIZE || sourceImage.height < NATIVE_SHEET_SIZE) {
    throw new Error(`Generated sheet is unexpectedly small: ${sourceImage.width}x${sourceImage.height}`);
  }
  if (Math.abs(sourceImage.width - sourceImage.height) > 2) {
    throw new Error(`Generated sheet must be square: ${sourceImage.width}x${sourceImage.height}`);
  }

  const sourceCanvas = createCanvas(sourceImage.width, sourceImage.height);
  const sourceContext = sourceCanvas.getContext("2d", { alpha: true, willReadFrequently: true });
  sourceContext.drawImage(sourceImage, 0, 0);
  prepareSourceTransparency(sourceContext, sourceCanvas.width, sourceCanvas.height, chromaKey);
  const isNativeSheet = sourceCanvas.width === NATIVE_SHEET_SIZE
    && sourceCanvas.height === NATIVE_SHEET_SIZE;

  mkdirSync(outputDir, { recursive: true });
  if (sourceCopyPath) {
    mkdirSync(dirname(sourceCopyPath), { recursive: true });
    copyFileSync(sourcePath, sourceCopyPath);
  }

  const sheet = createCanvas(GRID_SIZE * PORTRAIT_SIZE, GRID_SIZE * PORTRAIT_SIZE);
  const sheetContext = sheet.getContext("2d", { alpha: true });
  sheetContext.imageSmoothingEnabled = false;
  sheetContext.clearRect(0, 0, sheet.width, sheet.height);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const index = row * GRID_SIZE + column;
      const x0 = Math.round((column * sourceCanvas.width) / GRID_SIZE);
      const x1 = Math.round(((column + 1) * sourceCanvas.width) / GRID_SIZE);
      const y0 = Math.round((row * sourceCanvas.height) / GRID_SIZE);
      const y1 = Math.round(((row + 1) * sourceCanvas.height) / GRID_SIZE);

      const portrait = createCanvas(PORTRAIT_SIZE, PORTRAIT_SIZE);
      const context = portrait.getContext("2d", { alpha: true, willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
      if (isNativeSheet) {
        context.putImageData(
          sourceContext.getImageData(x0, y0, PORTRAIT_SIZE, PORTRAIT_SIZE),
          0,
          0
        );
      } else if (downscaleOption === "--retro-diffusion") {
        // Submit individual cells to stay below the API request-size limit.
        const cell = createCanvas(x1 - x0, y1 - y0);
        // The downscaler emits RGB. Carry transparency through an explicit
        // chroma background instead of letting transparent pixels turn black.
        const cellContext = cell.getContext("2d");
        cellContext.fillStyle = "#ff00ff";
        cellContext.fillRect(0, 0, cell.width, cell.height);
        cellContext.drawImage(sourceCanvas, x0, y0, x1 - x0, y1 - y0, 0, 0, cell.width, cell.height);
        context.drawImage(await downscaleWithRetroDiffusion(cell.toBuffer("image/png")), 0, 0);
        const image = context.getImageData(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
        removePortraitChromaFringe(image, PORTRAIT_SIZE, PORTRAIT_SIZE, { chromaKey: "magenta" });
        context.putImageData(image, 0, 0);
        // Per-character coverage is validated below; a full-sheet gutter
        // fraction does not apply to an individual broad-shouldered portrait.
      } else {
        context.drawImage(
          sourceCanvas,
          x0,
          y0,
          x1 - x0,
          y1 - y0,
          0,
          0,
          PORTRAIT_SIZE,
          PORTRAIT_SIZE
        );
      }
      cleanAndQuantizePortrait(context, index);

      const filename = `${slug}-${String(index + 1).padStart(2, "0")}.png`;
      writeFileSync(join(outputDir, filename), portrait.toBuffer("image/png"));
      sheetContext.drawImage(
        portrait,
        column * PORTRAIT_SIZE,
        row * PORTRAIT_SIZE
      );
    }
  }

  const sheetPath = join(outputDir, `${slug}-sheet.png`);
  writeFileSync(sheetPath, sheet.toBuffer("image/png"));
  assertNativeSheet(sheetContext, sheet.width, sheet.height);
  console.log(`Processed ${GRID_SIZE * GRID_SIZE} portraits from ${basename(sourcePath)}`);
  console.log(sheetPath);
}

// Explicitly use the free editing endpoint; generation and paid image edits
// are not part of asset downscaling. Recheck the live cost before submitting.
async function downscaleWithRetroDiffusion(png) {
  const apiKey = process.env.RETRO_DIFFUSION_API_KEY;
  if (!apiKey) throw new Error("Retro Diffusion downscaling requires RETRO_DIFFUSION_API_KEY");
  const endpoint = "https://api.retrodiffusion.ai/v2/edit/tools/k_centroid_downscale";
  const payload = { input_image: png.toString("base64"), width: PORTRAIT_SIZE, height: PORTRAIT_SIZE };
  const post = async (url) => {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json", "X-RD-Token": apiKey },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) throw new Error(`Retro Diffusion downscale HTTP ${response.status}`);
    return response.json();
  };
  const estimate = await post(`${endpoint}/estimate`);
  if (estimate.balance_cost !== 0 || estimate.credit_cost !== 0) {
    throw new Error("Retro Diffusion downscaling is no longer free; no operation submitted");
  }
  const result = await post(endpoint);
  if (result.balance_cost !== 0 || result.base64_images?.length !== 1) {
    throw new Error("Retro Diffusion downscaler returned an unexpected result");
  }
  const image = await loadImage(Buffer.from(result.base64_images[0], "base64"));
  if (image.width !== PORTRAIT_SIZE || image.height !== PORTRAIT_SIZE) {
    throw new Error(`Retro Diffusion returned ${image.width}x${image.height}, expected ${PORTRAIT_SIZE}x${PORTRAIT_SIZE}`);
  }
  console.log("Retro Diffusion K-centroid downscale completed (zero cost)");
  return image;
}

function prepareSourceTransparency(context, width, height, chromaKey) {
  const image = context.getImageData(0, 0, width, height);
  let transparentPixels = 0;
  for (let offset = 3; offset < image.data.length; offset += 4) {
    if (image.data[offset] < 128) transparentPixels += 1;
  }
  if (transparentPixels / (width * height) >= 0.2) {
    for (let offset = 0; offset < image.data.length; offset += 4) {
      if (image.data[offset + 3] < 128) {
        image.data[offset] = 0;
        image.data[offset + 1] = 0;
        image.data[offset + 2] = 0;
        image.data[offset + 3] = 0;
      } else {
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return;
  }

  const removed = removePortraitChromaFringe(image, width, height, { chromaKey });
  const removedShare = removed / (width * height);
  if (removedShare < 0.35 || removedShare > 0.85) {
    throw new Error(`Chroma-key coverage is implausible: ${(removedShare * 100).toFixed(1)}%`);
  }
  context.putImageData(image, 0, 0);
}

function cleanAndQuantizePortrait(context, index) {
  const image = context.getImageData(0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
  const cache = new Map();
  let opaque = 0;

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const red = image.data[offset];
    const green = image.data[offset + 1];
    const blue = image.data[offset + 2];
    if (image.data[offset + 3] < 128) {
      image.data[offset] = 0;
      image.data[offset + 1] = 0;
      image.data[offset + 2] = 0;
      image.data[offset + 3] = 0;
      continue;
    }

    image.data[offset + 3] = 255;
    const key = `${red},${green},${blue}`;
    let target = cache.get(key);
    if (!target) {
      const hex = nearestResurrect64Hex(red, green, blue);
      target = [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16)
      ];
      cache.set(key, target);
    }
    image.data[offset] = target[0];
    image.data[offset + 1] = target[1];
    image.data[offset + 2] = target[2];
    opaque += 1;
  }

  if (opaque < MIN_OPAQUE_PIXELS || opaque > MAX_OPAQUE_PIXELS) {
    throw new Error(`Portrait ${index + 1} has implausible coverage: ${opaque} opaque pixels`);
  }
  context.putImageData(image, 0, 0);
}

function assertNativeSheet(context, width, height) {
  const palette = new Set(RESURRECT_64_HEX);
  const pixels = context.getImageData(0, 0, width, height).data;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    if (alpha !== 0 && alpha !== 255) {
      throw new Error(`Sheet contains non-binary alpha ${alpha} at pixel ${offset / 4}`);
    }
    if (alpha === 0) continue;
    const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("");
    if (!palette.has(hex)) {
      throw new Error(`Sheet contains non-Resurrect color #${hex} at pixel ${offset / 4}`);
    }
  }
}

await main();
