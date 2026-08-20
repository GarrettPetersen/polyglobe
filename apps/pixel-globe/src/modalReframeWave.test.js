import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MODAL_REFRAME_WAVE_BAND_PX,
  MODAL_REFRAME_WAVE_DURATION_MS,
  createModalReframeWave,
  modalReframeScreenProgress,
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

  const complete = modalReframeWaveFrame(wave, 1000 + MODAL_REFRAME_WAVE_DURATION_MS);
  assert.equal(complete.frontPx, 120 + 80 + MODAL_REFRAME_WAVE_BAND_PX);
  assert.equal(complete.complete, true);
});

test("the complete old frame remains fixed until the crestless reframe band reaches it", () => {
  const frame = Object.freeze({ frontPx: 100, bandWidthPx: 40 });
  assert.equal(modalReframeScreenProgress(frame, { x: 80, y: 40 }), 0);
  assert.equal(modalReframeScreenProgress(frame, { x: 50, y: 30 }), 0.5);
  assert.equal(modalReframeScreenProgress(frame, { x: 20, y: 20 }), 1);
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

test("viewport resizing cancels a captured modal reframe before changing dimensions", async () => {
  const source = await readFile(new URL("./main.js", import.meta.url), "utf8");
  const resizeBody = source.match(
    /function applyResponsiveViewport\(width, height\) \{[\s\S]*?\n\}/
  )?.[0];
  assert.ok(resizeBody, "responsive viewport function is missing");
  assert.ok(
    resizeBody.indexOf("cancelChartModalReframeTransition();") <
      resizeBody.indexOf("SCREEN_W = width;"),
    "viewport dimensions changed before the stale modal source was released"
  );
});
