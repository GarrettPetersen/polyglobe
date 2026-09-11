import assert from "node:assert/strict";
import test from "node:test";
import {
  DEMO_SHIP_LIGHTING_ATLAS_HEIGHT,
  DEMO_SHIP_LIGHTING_ATLAS_SLICES,
  DEMO_SHIP_LIGHTING_ATLAS_WIDTH,
  demoShipLightingAtlasSlice
} from "./demoShipLightingAtlas.js";

test("demo ship lighting layers occupy one exact non-overlapping atlas", () => {
  const slices = Object.values(DEMO_SHIP_LIGHTING_ATLAS_SLICES);
  assert.deepEqual(Object.keys(DEMO_SHIP_LIGHTING_ATLAS_SLICES), ["light", "shade", "shadow"]);
  assert.equal(DEMO_SHIP_LIGHTING_ATLAS_WIDTH, Math.max(...slices.map(slice => slice.width)));
  assert.equal(
    DEMO_SHIP_LIGHTING_ATLAS_HEIGHT,
    slices.reduce((height, slice) => height + slice.height, 0)
  );
  for (const [index, slice] of slices.entries()) {
    assert.equal(slice.x, 0);
    assert.equal(slice.y, slices.slice(0, index).reduce((y, previous) => y + previous.height, 0));
    assert.ok(slice.width <= DEMO_SHIP_LIGHTING_ATLAS_WIDTH);
  }
  assert.equal(demoShipLightingAtlasSlice("shadow"), DEMO_SHIP_LIGHTING_ATLAS_SLICES.shadow);
  assert.throws(() => demoShipLightingAtlasSlice("glow"), /Unknown demo ship-lighting/);
});
