import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_SINK_DEPTH_CHANNEL_TOLERANCE,
  SHIP_SINK_EFFECT_DURATION_MS,
  createShipSinkEffect,
  shipSinkDepthByte,
  shipSinkEffectComplete,
  shipSinkFrame
} from "./shipSinking.js";

function testPixels(frameSize = 8) {
  const pixels = [];
  for (let y = 1; y < frameSize - 1; y++) {
    for (let x = 1; x < frameSize - 1; x++) {
      pixels.push({
        x,
        y,
        color: (x + y) % 2 ? "#fff1bf" : "#d95763",
        alpha: 1,
        sinkHeight: 1 - y / (frameSize - 1)
      });
    }
  }
  return pixels;
}

function createTestEffect(overrides = {}) {
  return createShipSinkEffect({
    id: "test-ship",
    pixels: testPixels(),
    frameSize: 8,
    originX: 20,
    originY: 30,
    startedAtMs: 1000,
    seed: 72,
    ...overrides
  });
}

test("sink-depth decoding normalizes harmless browser color-channel drift", () => {
  assert.equal(shipSinkDepthByte(127, 127, 127), 127);
  assert.equal(
    shipSinkDepthByte(127, 127 + SHIP_SINK_DEPTH_CHANNEL_TOLERANCE, 128),
    128
  );
});

test("sink-depth decoding rejects materially colored or invalid pixels", () => {
  assert.throws(
    () => shipSinkDepthByte(127, 132, 127, " in frame 4 at 12,9"),
    /materially non-grayscale in frame 4 at 12,9: rgb\(127,132,127\)/
  );
  assert.throws(() => shipSinkDepthByte(-1, 0, 0), /invalid red channel/);
});

test("ship breakup deterministically partitions sprite pixels into hull and debris", () => {
  const first = createTestEffect();
  const second = createTestEffect();

  assert.ok(first.hullPixels.length > 0);
  assert.ok(first.particles.length > 0);
  assert.equal(first.hullPixels.length + first.particles.length, testPixels().length);
  assert.deepEqual(first, second);
});

test("remaining hull pixels descend while model-low pixels submerge and fade first", () => {
  const effect = createTestEffect();
  const start = shipSinkFrame(effect, 1000);
  const middle = shipSinkFrame(effect, 3400);
  const late = shipSinkFrame(effect, 5400);

  assert.equal(start.hullPixels.length, middle.hullPixels.length);
  assert.equal(middle.hullPixels.length, late.hullPixels.length);
  assert.ok(Math.min(...middle.hullPixels.map((pixel) => pixel.y)) > Math.min(...start.hullPixels.map((pixel) => pixel.y)));

  const submerged = middle.hullPixels.filter((pixel) => pixel.underwater);
  const dry = middle.hullPixels.filter((pixel) => !pixel.underwater);
  assert.ok(submerged.length > 0);
  assert.ok(dry.length > 0);
  assert.ok(submerged.some((pixel) => pixel.alpha < 0.75));
  assert.ok(dry.every((pixel) => pixel.alpha === 1));

  const lowest = late.hullPixels.reduce((best, pixel) => pixel.sinkHeight < best.sinkHeight ? pixel : best);
  const highest = late.hullPixels.reduce((best, pixel) => pixel.sinkHeight > best.sinkHeight ? pixel : best);
  assert.ok(lowest.alpha < highest.alpha);
});

test("a ship begins with its low hull already submerged", () => {
  const effect = createTestEffect();
  const start = shipSinkFrame(effect, effect.startedAtMs);
  const submerged = start.hullPixels.filter((pixel) => pixel.underwater);
  const dry = start.hullPixels.filter((pixel) => !pixel.underwater);

  assert.ok(submerged.length > 0);
  assert.ok(dry.length > 0);
  assert.ok(submerged.every((pixel) => pixel.alpha < 1));
  assert.ok(dry.every((pixel) => pixel.alpha === 1));
});

test("water drag keeps the hull anchored while its baked slices submerge", () => {
  const effect = createTestEffect();
  const start = shipSinkFrame(effect, effect.startedAtMs);
  const nearEnd = shipSinkFrame(effect, effect.startedAtMs + SHIP_SINK_EFFECT_DURATION_MS - 100);
  const startTop = Math.min(...start.hullPixels.map((pixel) => pixel.y));
  const endTop = Math.min(...nearEnd.hullPixels.map((pixel) => pixel.y));

  assert.ok(endTop > startTop);
  assert.ok(endTop - startTop <= Math.ceil(effect.frameSize * 0.2));
  assert.ok(nearEnd.hullPixels.filter((pixel) => pixel.underwater).length > start.hullPixels.length * 0.9);
});

test("surface ripples originate at the inferred low-hull waterline throughout the sink", () => {
  const effect = createTestEffect();
  const first = shipSinkFrame(effect, effect.startedAtMs + 100).ripples;
  const late = shipSinkFrame(effect, effect.startedAtMs + 3900).ripples;

  assert.ok(first.length > 0);
  assert.ok(late.length > 0);
  assert.ok(first.every((pixel) => Math.abs(pixel.y - effect.waterlineY) <= 1));
  assert.ok(late.every((pixel) => Math.abs(pixel.y - effect.waterlineY) <= 1));
  assert.ok(Math.max(...first.map((pixel) => Math.abs(pixel.x - effect.surfaceX))) >= effect.surfaceHalfWidth);
});

test("underwater refraction is integer-snapped and limited to one horizontal pixel", () => {
  const effect = createTestEffect();
  const frames = [3400, 3520, 3640, 3760].map((nowMs) => (
    shipSinkFrame(effect, nowMs).hullPixels.filter((pixel) => pixel.underwater)
  ));
  const allUnderwaterPixels = frames.flat();

  assert.ok(allUnderwaterPixels.length > 0);
  assert.ok(allUnderwaterPixels.every((pixel) => Number.isInteger(pixel.refractionOffset)));
  assert.ok(allUnderwaterPixels.every((pixel) => Math.abs(pixel.refractionOffset) <= 1));
  assert.ok(allUnderwaterPixels.some((pixel) => pixel.refractionOffset !== 0));
  assert.ok(new Set(frames.map((frame) => frame.map((pixel) => pixel.refractionOffset).join(","))).size > 1);
});

test("sink effects reject pixels without baked model heights", () => {
  assert.throws(() => createTestEffect({
    pixels: [{ x: 2, y: 2, color: "#ffffff", alpha: 1 }]
  }), /invalid sink height/);
});

test("exploded pixels move on integer-snapped ballistic paths", () => {
  const effect = createTestEffect();
  const early = shipSinkFrame(effect, 1150);
  const later = shipSinkFrame(effect, 1450);

  assert.ok(early.particles.length > 0);
  assert.ok(later.particles.length > 0);
  assert.ok(later.particles.some((pixel, index) => {
    const prior = early.particles[index];
    return prior && (pixel.x !== prior.x || pixel.y !== prior.y);
  }));
  assert.ok(later.particles.every((pixel) => Number.isInteger(pixel.x) && Number.isInteger(pixel.y)));
});

test("sinking has one definite completion time", () => {
  const effect = createTestEffect();
  const lastActiveMs = effect.startedAtMs + SHIP_SINK_EFFECT_DURATION_MS - 1;
  const completeMs = effect.startedAtMs + SHIP_SINK_EFFECT_DURATION_MS;

  assert.equal(shipSinkEffectComplete(effect, lastActiveMs), false);
  assert.equal(shipSinkFrame(effect, lastActiveMs).complete, false);
  assert.equal(shipSinkEffectComplete(effect, completeMs), true);
  assert.deepEqual(shipSinkFrame(effect, completeMs), {
    complete: true,
    hullPixels: [],
    particles: [],
    ripples: []
  });
});
