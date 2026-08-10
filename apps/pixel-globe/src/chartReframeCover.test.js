import assert from "node:assert/strict";
import test from "node:test";

import {
  chartReframeCoverIsOpaque,
  chartShouldReframeOnCoverOpen,
  gameOverReframeCoverIsOpaque
} from "./chartReframeCover.js";

test("live sailing without dialogue does not qualify as hidden chart cover", () => {
  assert.equal(chartReframeCoverIsOpaque({}), false);
  assert.equal(chartReframeCoverIsOpaque({ fullPortDialogue: false }), false);
});

test("blocking dialogue and full notebook pages can hide a correction", () => {
  assert.equal(chartReframeCoverIsOpaque({ captainMenu: true }), true);
  assert.equal(chartReframeCoverIsOpaque({ fullPortDialogue: true }), true);
  assert.equal(chartReframeCoverIsOpaque({ blockingDialogue: true }), true);
});

test("opening opaque cover always heals the hidden chart once", () => {
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: false
  }), true);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: true,
    coverWasActive: true
  }), false);
  assert.equal(chartShouldReframeOnCoverOpen({
    coverIsActive: false,
    coverWasActive: false
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
