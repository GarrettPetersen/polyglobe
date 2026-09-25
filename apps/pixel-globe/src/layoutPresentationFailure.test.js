import assert from "node:assert/strict";
import test from "node:test";

import { isLayoutPresentationFailure } from "./layoutPresentationFailure.js";

test("layout capacity failures are presentation problems", () => {
  const messages = [
    "Compact market dialogue dimensions do not fit the panel",
    "Discoveries tabs do not fit panel width: 80",
    "Politics country card does not fit panel: 90 > 40",
    "Control row cannot fit 4 controls within 20px",
    "Full notice screen is too narrow: 40",
    "Captain notebook is too short for 6 tabs: 80",
    "Scrollable stacked menu has no room for a row in 8px",
    "Game-over memorial has no usable text width: 0",
    "Captain notebook frame has no available page area: 20x20",
    "Stacked menu has no vertical space: 10-10",
    "Game-over memorial requires 400px but only 200px are available",
    "Pixel font metrics exceed the 8px raster: 14px for zpix"
  ];
  for (const message of messages) {
    assert.equal(isLayoutPresentationFailure(new Error(message)), true, message);
  }
});

test("ordinary voyage faults are not layout presentation failures", () => {
  const messages = [
    "City root reached the modal renderer: lisbon",
    "NPC cargo storage overflowed after capacity check: ship-1",
    "Political dispatch overflow requires a positive count",
    "Survival meter icon is not loaded",
    "Unknown dialogue exit destination: shore"
  ];
  for (const message of messages) {
    assert.equal(isLayoutPresentationFailure(new Error(message)), false, message);
  }
  assert.equal(isLayoutPresentationFailure("Compact market dialogue dimensions do not fit the panel"), false);
  assert.equal(isLayoutPresentationFailure(null), false);
});
