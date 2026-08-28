import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const TERRAIN_DIRECTORY = join(
  dirname(fileURLToPath(import.meta.url)),
  "../public/assets/terrain/resurrect-64"
);

test("every water variant has the enlarged silhouette needed to cover tile-corner pinholes", async () => {
  const fileNames = (await readdir(TERRAIN_DIRECTORY))
    .filter((fileName) => fileName.startsWith("water_") && fileName.endsWith(".png"))
    .sort();
  assert.ok(fileNames.length >= 10, "the production water family should contain all depth variants");

  for (const fileName of fileNames) {
    const { data, info } = await sharp(join(TERRAIN_DIRECTORY, fileName))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [36, 36], fileName);
    let opaquePixels = 0;
    let minX = info.width;
    let minY = info.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(x + y * info.width) * 4 + 3] === 0) continue;
        opaquePixels++;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.ok(opaquePixels >= 800, `${fileName} has a sparse ${opaquePixels}px water silhouette`);
    assert.ok(maxX - minX + 1 >= 35, `${fileName} does not reach both horizontal tile seams`);
    assert.ok(maxY - minY + 1 >= 31, `${fileName} does not reach both vertical tile seams`);
  }
});
