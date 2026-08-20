import assert from "node:assert/strict";
import test from "node:test";

import {
  SURFACE_ICE_TRANSITION_STAGE_COUNT,
  createSurfaceIceTransition,
  surfaceIceStateForTile,
  surfaceIceTransitionCueForTiles,
  surfaceIceTransitionEntrapsTile,
  surfaceIceTransitionIsComplete,
  surfaceIceTransitionPixel,
  surfaceIceTransitionStage
} from "./surfaceIceTransition.js";

function transition() {
  return createSurfaceIceTransition({
    startedAtMs: 100,
    durationMs: 1800,
    fromSeaMask: new Uint8Array([0, 255, 0]),
    fromFreshwaterMask: new Uint8Array([0, 0, 255]),
    toSeaMask: new Uint8Array([255, 0, 0]),
    toFreshwaterMask: new Uint8Array([0, 0, 255])
  });
}

test("freezing and thawing tiles keep their old navigation state until the transition completes", () => {
  const active = transition();
  const sea = active.toSeaMask;
  const freshwater = active.toFreshwaterMask;

  const freezing = surfaceIceStateForTile({
    transition: active,
    seaMask: sea,
    freshwaterMask: freshwater,
    tileId: 0,
    nowMs: 1000
  });
  assert.equal(freezing.transitioning, true);
  assert.equal(freezing.fromIce, false);
  assert.equal(freezing.toIce, true);
  assert.equal(freezing.blocked, false);

  const thawing = surfaceIceStateForTile({
    transition: active,
    seaMask: sea,
    freshwaterMask: freshwater,
    tileId: 1,
    nowMs: 1000
  });
  assert.equal(thawing.transitioning, true);
  assert.equal(thawing.fromIce, true);
  assert.equal(thawing.toIce, false);
  assert.equal(thawing.blocked, true);

  assert.equal(surfaceIceStateForTile({
    transition: active,
    seaMask: sea,
    freshwaterMask: freshwater,
    tileId: 0,
    nowMs: 1900
  }).blocked, true);
});

test("only a newly frozen tile can entrap the ship", () => {
  const active = transition();
  assert.equal(surfaceIceTransitionEntrapsTile(active, 0), true);
  assert.equal(surfaceIceTransitionEntrapsTile(active, 1), false);
  assert.equal(surfaceIceTransitionEntrapsTile(active, 2), false);
  assert.equal(surfaceIceTransitionIsComplete(active, 1899), false);
  assert.equal(surfaceIceTransitionIsComplete(active, 1900), true);
});

test("surface ice audio follows changes visible around the ship", () => {
  const active = transition();
  assert.equal(surfaceIceTransitionCueForTiles({
    transition: active,
    tileIds: new Set([0, 2])
  }), "freezing");
  assert.equal(surfaceIceTransitionCueForTiles({
    transition: active,
    tileIds: [0, 1],
    focusTileId: 1
  }), "thawing");
  assert.equal(surfaceIceTransitionCueForTiles({
    transition: active,
    tileIds: [2]
  }), null);
});

test("hard-pixel ice stages advance monotonically and finish fully settled", () => {
  const active = transition();
  assert.equal(surfaceIceTransitionStage(active, 100), 0);
  assert.equal(surfaceIceTransitionStage(active, 1000), 4);
  assert.equal(surfaceIceTransitionStage(active, 1900), SURFACE_ICE_TRANSITION_STAGE_COUNT);

  let previousSettled = 0;
  for (let stageIndex = 0; stageIndex <= SURFACE_ICE_TRANSITION_STAGE_COUNT; stageIndex++) {
    let settled = 0;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        if (surfaceIceTransitionPixel({ variant: 1, x, y, size: 32, stageIndex }).settled) {
          settled++;
        }
      }
    }
    assert.ok(settled >= previousSettled, `${settled} settled pixels after ${previousSettled}`);
    previousSettled = settled;
  }
  assert.equal(previousSettled, 32 * 32);
});

test("surface ice transition rejects malformed masks and particle coordinates", () => {
  assert.throws(() => createSurfaceIceTransition({
    startedAtMs: 0,
    fromSeaMask: new Uint8Array(2),
    fromFreshwaterMask: new Uint8Array(2),
    toSeaMask: new Uint8Array(3),
    toFreshwaterMask: new Uint8Array(2)
  }), /mask length mismatch/);
  assert.throws(() => surfaceIceTransitionPixel({
    variant: 0,
    x: 32,
    y: 0,
    size: 32,
    stageIndex: 1
  }), /coordinate/);
});
