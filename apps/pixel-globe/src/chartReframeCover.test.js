import assert from "node:assert/strict";
import test from "node:test";

import {
  chartReframeCoverIsOpaque,
  chartShouldReframeOnCoverOpen
} from "./chartReframeCover.js";

test("compact at-sea dialogue does not qualify as hidden chart cover", () => {
  assert.equal(chartReframeCoverIsOpaque({}), false);
  assert.equal(chartReframeCoverIsOpaque({ fullPortDialogue: false }), false);
});

test("full notebook pages and admitted port dialogue can hide a correction", () => {
  assert.equal(chartReframeCoverIsOpaque({ captainMenu: true }), true);
  assert.equal(chartReframeCoverIsOpaque({ fullPortDialogue: true }), true);
});

test("opening opaque cover only reframes a chart that actually drifted", () => {
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: false,
    drift: { needsReframe: false }
  }), false);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: false,
    drift: { needsReframe: true }
  }), true);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: true,
    drift: { needsReframe: true }
  }), false);
});
