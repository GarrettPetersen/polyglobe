import assert from "node:assert/strict";
import test from "node:test";

import {
  chartReframeCoverIsOpaque,
  chartShouldReframeOnCoverOpen,
  gameOverReframeCoverIsOpaque
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

test("a sinking voyage only becomes opaque cover after the ship animation", () => {
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: true,
    elapsedMs: 0,
    sinkDurationMs: 5200
  }), false);
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: true,
    elapsedMs: 5199,
    sinkDurationMs: 5200
  }), false);
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: true,
    elapsedMs: 5200,
    sinkDurationMs: 5200
  }), true);
  assert.equal(gameOverReframeCoverIsOpaque({
    active: true,
    sinkShip: false,
    elapsedMs: 0,
    sinkDurationMs: 0
  }), true);
});
