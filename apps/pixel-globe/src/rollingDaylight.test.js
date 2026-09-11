import test from "node:test";
import assert from "node:assert/strict";
import { rollingDayNightPaletteAtlas, dayNightPaletteVariant } from "./dayNightPalette.js";

test("rolling atlas preserves every existing palette variant and fits minimum WebGL2 texture limits", () => {
  const atlas = rollingDayNightPaletteAtlas();
  assert.equal(rollingDayNightPaletteAtlas(), atlas);
  assert.ok(atlas.width <= 2048 && atlas.height <= 2048);
  for (let sunset = 0; sunset <= 8; sunset++) for (let night = 0; night <= 8; night++) {
    const variant = dayNightPaletteVariant({ sunset: sunset / 8, night: night / 8 });
    if (!variant) continue; // Full daylight bypasses grading and retains original pixels.
    const layer = sunset * 9 + night;
    for (let row = 0; row < variant.height; row++) {
      const offset = ((Math.floor(layer / 2) * variant.height + row) * atlas.width +
        (layer % 2) * variant.width) * 4;
      assert.deepEqual(atlas.pixels.subarray(offset, offset + variant.width * 4),
        variant.pixels.subarray(row * variant.width * 4, (row + 1) * variant.width * 4));
    }
  }
});
