import assert from "node:assert/strict";
import test from "node:test";
import { join, resolve } from "node:path";
import { transparentGridRects } from "../tools/extract-transparent-portrait-grid.mjs";

test("samurai portraits use transparent gutters instead of equal row spacing", async () => {
  const appRoot = resolve(import.meta.dirname, "..");
  const rects = await transparentGridRects(join(
    appRoot,
    "assets-source/characters/retro-diffusion/sengoku-samurai-1522-source.png"
  ));
  assert.equal(rects.length, 16);
  assert.ok(rects[12].top < 192, "the fourth row begins at its transparent gutter");
  assert.ok(rects.every((rect) => rect.width > 0 && rect.height > 0));
});
