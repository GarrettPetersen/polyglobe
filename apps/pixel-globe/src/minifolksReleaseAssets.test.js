import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = join(appRoot, "promotional-materials/minifolks-extra-japan");
const packageRoot = join(releaseRoot, "package");
const manifestPath = join(packageRoot, "manifest.json");

test("MiniFolks release credits LYASeeK in both the package and game credits", async () => {
  const [gameCredits, packageLicense] = await Promise.all([
    readFile(join(appRoot, "public/assets/CREDITS.md"), "utf8"),
    readFile(join(packageRoot, "LICENSE.txt"), "utf8")
  ]);
  assert.match(gameCredits, /LYASeeK - "MiniFolks"/);
  assert.match(packageLicense, /LYASeeK's MiniFolks: https:\/\/lyaseek\.itch\.io\//);
});

test("MiniFolks Japan sheets retain their action rows and Resurrect 64 palette", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.pack, "MiniFolks Extra: Japan");
  assert.equal(manifest.units.length, 7);
  const palette = new Set(RESURRECT_64_HEX);

  for (const unit of manifest.units) {
    assert.deepEqual(unit.canvas, [32, 32]);
    assert.ok(unit.animations.length > 0, `${unit.name} has no animation rows`);
    const expectedWidth = Math.max(...unit.animations.map((animation) => animation.frames)) * 32;
    const expectedHeight = unit.animations.length * 32;

    for (const variant of ["Outline", "Without Outline"]) {
      const image = await loadImage(join(packageRoot, variant, `${unit.name}.png`));
      assert.equal(image.width, expectedWidth, `${variant}/${unit.name} width`);
      assert.equal(image.height, expectedHeight, `${variant}/${unit.name} height`);
      const canvas = createCanvas(image.width, image.height);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      let opaquePixels = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const alpha = pixels[offset + 3];
        assert.ok(alpha === 0 || alpha === 255, `${variant}/${unit.name} has partial alpha`);
        if (alpha === 0) continue;
        const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
        assert.ok(palette.has(hex), `${variant}/${unit.name} contains non-Resurrect #${hex}`);
        opaquePixels += 1;
      }
      assert.ok(opaquePixels > 0, `${variant}/${unit.name} is blank`);
    }
  }
});
