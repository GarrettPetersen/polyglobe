import assert from "node:assert/strict";
import test from "node:test";
import { PORT_SCENE_OCEAN_SLICES } from "./citySceneRules.js";
import {
  CITY_OCEAN_WAVE_MAX_AMPLITUDE_PX,
  CITY_OCEAN_WAVE_MIN_AMPLITUDE_PX,
  cityOceanParallaxDepth,
  cityOceanRowOffset,
  cityOceanWaveAmplitude
} from "./cityOceanMotion.js";

test("each ocean row interpolates between the parallax plane beside it", () => {
  const horizonY = PORT_SCENE_OCEAN_SLICES[0].top;
  const distantShoreY = PORT_SCENE_OCEAN_SLICES[1].top;
  const foregroundShoreY = PORT_SCENE_OCEAN_SLICES[2].top;
  assert.equal(cityOceanParallaxDepth(horizonY), PORT_SCENE_OCEAN_SLICES[0].depth);
  assert.equal(cityOceanParallaxDepth(distantShoreY), PORT_SCENE_OCEAN_SLICES[1].depth);
  assert.equal(cityOceanParallaxDepth(foregroundShoreY), PORT_SCENE_OCEAN_SLICES[2].depth);

  let previous = cityOceanParallaxDepth(horizonY);
  for (let y = horizonY + 1; y <= foregroundShoreY; y++) {
    const depth = cityOceanParallaxDepth(y);
    assert.ok(depth > previous, `ocean row ${y} did not advance in depth`);
    previous = depth;
  }
  assert.equal(cityOceanParallaxDepth(PORT_SCENE_OCEAN_SLICES.at(-1).bottom - 1), 1);
  assert.throws(() => cityOceanParallaxDepth(Number.NaN), /row must be finite/);
});

test("city ocean sine amplitude grows from one pixel at the horizon to twenty in the foreground", () => {
  const top = PORT_SCENE_OCEAN_SLICES[0].top;
  const bottom = PORT_SCENE_OCEAN_SLICES.at(-1).bottom - 1;
  assert.equal(cityOceanWaveAmplitude(top), CITY_OCEAN_WAVE_MIN_AMPLITUDE_PX);
  assert.equal(cityOceanWaveAmplitude(bottom), CITY_OCEAN_WAVE_MAX_AMPLITUDE_PX);

  let previous = cityOceanWaveAmplitude(top);
  for (let y = top + 1; y <= bottom; y++) {
    const amplitude = cityOceanWaveAmplitude(y);
    assert.ok(amplitude >= previous);
    previous = amplitude;
  }
});

test("city ocean row offsets stay pixel-snapped, bounded, and continuous across depth slices", () => {
  const rows = new Set([
    PORT_SCENE_OCEAN_SLICES[0].top,
    ...PORT_SCENE_OCEAN_SLICES.flatMap(({ top, bottom }) => [top, bottom - 1]),
    PORT_SCENE_OCEAN_SLICES.at(-1).bottom - 1
  ]);
  for (const y of rows) {
    const offset = cityOceanRowOffset(y, 1234);
    assert.ok(Number.isInteger(offset));
    assert.ok(Math.abs(offset) <= Math.ceil(cityOceanWaveAmplitude(y)));
  }
  const animatedOffsets = new Set([1234, 1734, 2234, 2734].map((timeMs) => (
    cityOceanRowOffset(700, timeMs)
  )));
  assert.ok(animatedOffsets.size > 1);
});

test("city ocean motion rejects malformed rows and times", () => {
  assert.throws(() => cityOceanWaveAmplitude(Number.NaN), /row must be finite/);
  assert.throws(() => cityOceanRowOffset(500, Number.POSITIVE_INFINITY), /time must be finite/);
});
