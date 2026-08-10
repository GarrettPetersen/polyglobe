import assert from "node:assert/strict";
import test from "node:test";

import { optionsVolumeRowLayout } from "./optionsVolumeLayout.js";

test("volume row reserves space between its slider and percentage", () => {
  const layout = optionsVolumeRowLayout({
    rowX: 10,
    rowWidth: 150,
    labelWidth: 40,
    valueWidth: 24
  });

  assert.ok(layout.sliderWidth < 70);
  assert.ok(layout.sliderX + layout.sliderWidth <= layout.valueLeft - 5);
  assert.equal(layout.valueRight, 152);
});

test("volume row fits long localized labels before placing controls", () => {
  const layout = optionsVolumeRowLayout({
    rowX: 0,
    rowWidth: 150,
    labelWidth: 120,
    valueWidth: 24
  });

  assert.ok(layout.labelMaxWidth < 120);
  assert.equal(layout.sliderWidth, 24);
  assert.ok(layout.sliderX + layout.sliderWidth < layout.valueLeft);
});
