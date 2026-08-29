import assert from "node:assert/strict";
import test from "node:test";

import {
  isWarmShipColor,
  nearestShipResurrectColor
} from "./shipResurrectPalette.js";

test("warm timber cannot slip into the Resurrect olive ramp", () => {
  const oliveHex = new Set(["676633", "a2a947", "d5e04b", "fbff86"]);
  for (const color of [
    { r: 83, g: 53, b: 30 },
    { r: 112, g: 83, b: 50 },
    { r: 154, g: 101, b: 61 },
    { r: 96, g: 93, b: 45 }
  ]) {
    assert.equal(isWarmShipColor(color.r, color.g, color.b), true);
    assert.equal(oliveHex.has(nearestShipResurrectColor(color.r, color.g, color.b).hex), false);
  }
});

test("timber can reach the muted mauves through an ordinary nearest-color match", () => {
  assert.equal(nearestShipResurrectColor(83, 53, 30).hex, "4c3e24");
  assert.equal(nearestShipResurrectColor(112, 83, 50).hex, "625565");
  assert.equal(nearestShipResurrectColor(154, 101, 61).hex, "966c6c");
});

test("strongly lit timber can use a muted mauve plane tone", () => {
  assert.equal(nearestShipResurrectColor(143, 106, 64).hex, "966c6c");
});

test("genuine green paint retains access to the green palette", () => {
  assert.equal(isWarmShipColor(70, 118, 75), false);
  assert.equal(nearestShipResurrectColor(70, 118, 75).hex, "547e64");
});

test("warm-color classification rejects malformed channels", () => {
  assert.throws(() => isWarmShipColor(Number.NaN, 80, 45), /red channel/);
});
