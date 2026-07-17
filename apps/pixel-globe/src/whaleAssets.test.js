import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { MODEL_CREDITS } from "./modelCredits.js";
import { WHALE_SPECIES } from "./whaleSpecies.js";

const assetRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/animals");
const FRAME_SIZE = 47;
const SHEET_WIDTH = FRAME_SIZE * 8;
const SHEET_HEIGHT = FRAME_SIZE * 4;

test("every whale species and the white whale have complete 32-heading production bakes", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "whale-manifest.json"), "utf8"));
  const expectedSlugs = [...WHALE_SPECIES.map((species) => species.assetSlug), "white-sperm-whale"].sort();
  assert.deepEqual(manifest.animals.map((animal) => animal.slug).sort(), expectedSlugs);

  const creditedModels = new Set(MODEL_CREDITS.map(modelCreditKey));
  for (const animal of manifest.animals) {
    assert.equal(animal.headings, 32, `${animal.slug} headings`);
    assert.equal(animal.frameSize, FRAME_SIZE, `${animal.slug} frame size`);
    assert.ok(creditedModels.has(modelCreditKey(animal)), `${animal.slug} source credit`);
    await assertImage(`${animal.slug}-32-headings.png`, SHEET_WIDTH, SHEET_HEIGHT, true);
    await assertImage(`${animal.slug}-32-headings-sink-depth.png`, SHEET_WIDTH, SHEET_HEIGHT, true);
    await assertImage(`${animal.slug}-32-headings-light.png`, SHEET_WIDTH, SHEET_HEIGHT * 2, false);
    await assertImage(`${animal.slug}-32-headings-shade.png`, SHEET_WIDTH, SHEET_HEIGHT * 2, false);
    await assertImage(`${animal.slug}-32-headings-shadow.png`, 760, 760, true);
  }
});

async function assertImage(filename, width, height, requireOpaquePixel) {
  const image = await loadImage(join(assetRoot, filename));
  assert.equal(image.width, width, `${filename} width`);
  assert.equal(image.height, height, `${filename} height`);
  if (!requireOpaquePixel) return;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  assert.ok(pixels.some((value, index) => index % 4 === 3 && value > 0), `${filename} is blank`);
}

function modelCreditKey(entry) {
  return [entry.creator, entry.license, entry.sourceTitle].join("|");
}
