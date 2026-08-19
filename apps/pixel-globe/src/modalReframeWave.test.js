import assert from "node:assert/strict";
import test from "node:test";

import {
  MODAL_REFRAME_WAVE_BAND_PX,
  MODAL_REFRAME_WAVE_DURATION_MS,
  createModalReframeWave,
  modalReframeTileMotion,
  modalReframeWaveFrame
} from "./modalReframeWave.js";

test("a modal reframe wave crosses the whole viewport diagonally", () => {
  const wave = createModalReframeWave({
    startedAtMs: 1000,
    viewportWidth: 120,
    viewportHeight: 80
  });
  const opening = modalReframeWaveFrame(wave, 1000);
  assert.equal(opening.frontPx, -MODAL_REFRAME_WAVE_BAND_PX);
  assert.equal(opening.complete, false);

  const middle = modalReframeWaveFrame(wave, 1000 + MODAL_REFRAME_WAVE_DURATION_MS / 2);
  assert.equal(middle.frontPx, 100);
  assert.equal(middle.bandWidthPx, MODAL_REFRAME_WAVE_BAND_PX);
  assert.equal(middle.crestAmplitudePx, 1);

  const complete = modalReframeWaveFrame(wave, 1000 + MODAL_REFRAME_WAVE_DURATION_MS);
  assert.equal(complete.frontPx, 120 + 80 + MODAL_REFRAME_WAVE_BAND_PX);
  assert.equal(complete.complete, true);
});

test("each reframe tile receives one pixel-grid offset and diagonal phase", () => {
  assert.deepEqual(modalReframeTileMotion({
    oldPosition: { x: 31, y: 48 },
    newPosition: { x: 20, y: 50 }
  }), [11, -2, 70]);
  assert.deepEqual(modalReframeTileMotion({
    oldPosition: null,
    newPosition: { x: 100, y: 75 },
    fallbackOffset: { x: -4, y: 6 }
  }), [-4, 6, 175]);
});

test("modal reframe waves reject malformed viewports and tile positions", () => {
  assert.throws(() => createModalReframeWave({
    startedAtMs: 0,
    viewportWidth: 0,
    viewportHeight: 100
  }), /positive integer viewportWidth/);
  assert.throws(() => modalReframeTileMotion({
    oldPosition: null,
    newPosition: { x: 2, y: 3 }
  }), /old position or fallback offset/);
});
