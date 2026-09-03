import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { seagullScreenPresence } from "./seagullAudio.js";
import { WORLD_LAYER_ORDER } from "./worldLayerOrder.js";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

const OPTIONS = Object.freeze({
  screenWidth: 455,
  screenHeight: 256,
  spriteSize: 9,
  fadeMargin: 18,
  fullPresenceCount: 4
});

test("offscreen seagulls are silent", () => {
  assert.equal(seagullScreenPresence([{ x: -9, y: 100 }], OPTIONS), 0);
  assert.equal(seagullScreenPresence([{ x: 455, y: 100 }], OPTIONS), 0);
  assert.equal(seagullScreenPresence([{ x: 100, y: -9 }], OPTIONS), 0);
  assert.equal(seagullScreenPresence([{ x: 100, y: 256 }], OPTIONS), 0);
});

test("seagull audio fades across the screen edge", () => {
  const edge = seagullScreenPresence([{ x: -4.5, y: 100 }], OPTIONS);
  const nearEdge = seagullScreenPresence([{ x: 5, y: 100 }], OPTIONS);
  const center = seagullScreenPresence([{ x: 200, y: 100 }], OPTIONS);

  assert.ok(edge > 0);
  assert.ok(nearEdge > edge);
  assert.ok(center > nearEdge);
});

test("only visible birds contribute to flock volume", () => {
  const calls = [
    { x: 100, y: 100 },
    { x: 140, y: 100 },
    { x: 180, y: 100 },
    { x: 220, y: 100 },
    { x: -30, y: 100 }
  ];
  assert.equal(seagullScreenPresence(calls, OPTIONS), 1);
  assert.throws(
    () => seagullScreenPresence([{ x: Number.NaN, y: 0 }], OPTIONS),
    /finite coordinates/
  );
});

test("fog visibility attenuates or silences individual seagulls", () => {
  const clear = seagullScreenPresence([{ x: 200, y: 100, visibility: 1 }], OPTIONS);
  const hazy = seagullScreenPresence([{ x: 200, y: 100, visibility: 0.25 }], OPTIONS);
  const hidden = seagullScreenPresence([{ x: 200, y: 100, visibility: 0 }], OPTIONS);
  assert.ok(clear > hazy);
  assert.ok(hazy > hidden);
  assert.equal(hidden, 0);
  assert.throws(
    () => seagullScreenPresence([{ x: 0, y: 0, visibility: 2 }], OPTIONS),
    /visibility/
  );
});

test("flying seagulls paint above vessels but below clouds", () => {
  assert.ok(
    WORLD_LAYER_ORDER.indexOf("dynamicUnderlay") < WORLD_LAYER_ORDER.indexOf("dynamicWorld"),
    "the vessel layer must paint before the aerial layer"
  );
  const underlay = functionSource("drawGpuWorldUnderlay", "drawGpuDynamicUnderlay");
  const aerial = functionSource("drawGpuDynamicWorld", "chartTileCallNearViewport");
  assert.match(underlay, /drawLandedSeagullsWebGL/);
  assert.doesNotMatch(underlay, /drawFlyingSeagullsWebGL/);
  assert.ok(
    aerial.indexOf("drawFlyingSeagullsWebGL") < aerial.indexOf("drawCloudLayerWebGL"),
    "flying seagulls must paint before clouds"
  );
});

function functionSource(startName, nextName) {
  const start = MAIN_SOURCE.indexOf(`function ${startName}`);
  const end = MAIN_SOURCE.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `missing ${startName}`);
  return MAIN_SOURCE.slice(start, end);
}
