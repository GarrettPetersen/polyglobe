import assert from "node:assert/strict";
import test from "node:test";

import {
  FLAG_SLACK_MAX_STRENGTH,
  FLAG_WAVE_FRAME_COUNT,
  flagExteriorOutlineMask,
  flagFabricColumnLayout,
  flagWaveColumnOffsets,
  flagWaveFrameIndex,
  flagWindPose
} from "./flagAnimation.js";

test("flag waves stay attached to the pole and within one subtle pixel", () => {
  for (const phase of [0, Math.PI / 3, Math.PI, Math.PI * 1.7]) {
    const offsets = flagWaveColumnOffsets(12, phase, 1);
    assert.equal(offsets.length, 12);
    assert.equal(offsets[0], 0);
    assert.ok(offsets.every((offset) => Number.isInteger(offset) && Math.abs(offset) <= 1));
    assert.ok(offsets.filter((offset) => offset !== 0).length <= 6);
  }
});

test("flag wave advances through visibly different pixel poses", () => {
  assert.notDeepEqual(
    flagWaveColumnOffsets(12, 0, 1),
    flagWaveColumnOffsets(12, Math.PI / 2, 1)
  );
});

test("flag wave uses one broad half wave across each flag", () => {
  for (const width of [14, 32]) {
    const offsets = flagWaveColumnOffsets(width, 0, 1);
    const firstMoving = offsets.findIndex((offset, column) => column > 0 && offset !== 0);
    const lastMoving = offsets.findLastIndex((offset) => offset !== 0);

    assert.ok(firstMoving > 0, `expected ${width}px flag to lift after the pole`);
    assert.ok(lastMoving > width * 0.7, `expected ${width}px flag to finish the broad wave near the fly end`);
    assert.ok(offsets.every((offset) => offset >= 0), `expected ${width}px flag to form a single upward half wave`);
  }
});

test("flag animation phases wrap into a finite shared frame set", () => {
  assert.equal(flagWaveFrameIndex(0), 0);
  assert.equal(flagWaveFrameIndex(Math.PI * 2), 0);
  assert.equal(flagWaveFrameIndex(-Math.PI * 2), 0);
  assert.equal(flagWaveFrameIndex(Math.PI), FLAG_WAVE_FRAME_COUNT / 2);
  assert.ok(flagWaveFrameIndex(1.25) < FLAG_WAVE_FRAME_COUNT);
});

test("flags project wind sideways without rotating the cloth vertically", () => {
  const right = flagWindPose(0, 0.7);
  const left = flagWindPose(Math.PI, 0.7);
  const intoScreen = flagWindPose(Math.PI / 2, 0.7);

  assert.equal(right.flyDirection, 1);
  assert.equal(left.flyDirection, -1);
  assert.equal(intoScreen.flyDirection, 1);
  assert.equal(right.level, left.level);
  assert.equal("angleRad" in right, false);
  assert.equal("angleRad" in left, false);
});

test("flags hang beside the pole in weak wind", () => {
  const pose = flagWindPose(2.4, FLAG_SLACK_MAX_STRENGTH);
  assert.equal(pose.slack, true);
  assert.equal(pose.flyDirection, 1);
  assert.equal(pose.waveAmplitudePx, 0);
  assert.equal(pose.waveRate, 0);
  assert.ok(pose.widthScale < 0.5);
  assert.ok(pose.dropScale > 0.75);
  assert.throws(() => flagWindPose(0, -0.1), /Invalid flag wind strength/);
});

test("slack flags keep the hoist upright while the free cloth droops", () => {
  for (const [width, height] of [[10, 6], [32, 20]]) {
    const layout = flagFabricColumnLayout(width, height, flagWindPose(0, 0));
    assert.ok(layout.fabricWidth >= 2 && layout.fabricWidth < width);
    assert.deepEqual(layout.columns[0], {
      sourceStart: 0,
      sourceEnd: 1 / layout.fabricWidth,
      x: 0,
      y: 0,
      height
    });
    assert.equal(layout.columns.at(-1).sourceEnd, 1);
    assert.equal(layout.columns.at(-1).y, layout.drop);
    assert.ok(layout.columns.at(-1).height < height);
    assert.ok(layout.columns.every((column, index) => (
      column.x === index && (index === 0 || column.y >= layout.columns[index - 1].y)
    )));
  }
});

test("strong wind extends the full flag with a gentle one-pixel flap", () => {
  const pose = flagWindPose(0, 1.1);
  const layout = flagFabricColumnLayout(12, 7, pose);

  assert.equal(pose.slack, false);
  assert.equal(pose.widthScale, 1);
  assert.equal(pose.dropScale, 0);
  assert.equal(pose.waveAmplitudePx, 1);
  assert.equal(pose.waveRate, 1);
  assert.equal(layout.fabricWidth, 12);
  assert.equal(layout.drop, 0);
  assert.ok(layout.columns.every((column) => column.y === 0 && column.height === 7));
});

test("diplomatic outlines occupy only transparent pixels outside the complete flag", () => {
  const width = 5;
  const height = 5;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of [[2, 1], [2, 2], [3, 2]]) pixels[(y * width + x) * 4 + 3] = 255;
  const outline = flagExteriorOutlineMask(pixels, width, height);

  for (const [x, y] of [[2, 1], [2, 2], [3, 2]]) {
    assert.equal(outline[y * width + x], 0, `outline intruded into flag at ${x},${y}`);
  }
  assert.equal(outline[1 * width + 1], 255);
  assert.equal(outline[3 * width + 3], 255);
  assert.equal(outline[4 * width], 0);
});
