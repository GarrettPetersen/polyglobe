import assert from "node:assert/strict";
import test from "node:test";

import { cannonShotDistanceGain } from "./cannonAudio.js";

test("cannon fire gets progressively quieter with distance from the player", () => {
  const gains = [0, 10, 32, 64, 96, 180].map(cannonShotDistanceGain);
  assert.equal(gains[0], 1);
  assert.equal(gains[1], 1);
  for (let index = 1; index < gains.length; index++) {
    assert.ok(gains[index] <= gains[index - 1]);
  }
  assert.ok(gains[2] > gains[3]);
  assert.ok(gains[3] > gains[4]);
  assert.equal(gains[4], gains[5]);
  assert.equal(gains[5], 0.16);
});

test("cannon fire distance rejects invalid positions", () => {
  assert.throws(() => cannonShotDistanceGain(-1), /Invalid cannon sound distance/);
  assert.throws(() => cannonShotDistanceGain(Number.NaN), /Invalid cannon sound distance/);
});
