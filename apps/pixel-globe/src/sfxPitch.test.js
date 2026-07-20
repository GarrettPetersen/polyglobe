import assert from "node:assert/strict";
import test from "node:test";

import { SFX_PITCH_VARIATION_CENTS, randomizedSfxPlaybackRate } from "./sfxPitch.js";

test("SFX pitch variation is subtle, symmetric in cents, and preserves designed base rates", () => {
  const low = randomizedSfxPlaybackRate(1, () => 0);
  const middle = randomizedSfxPlaybackRate(1, () => 0.5);
  const high = randomizedSfxPlaybackRate(1, () => 1);

  assert.equal(middle, 1);
  assert.ok(low > 0.98 && low < 1);
  assert.ok(high > 1 && high < 1.02);
  assert.ok(Math.abs(low * high - 1) < 1e-12);
  assert.equal(randomizedSfxPlaybackRate(1.2, () => 0.5), 1.2);
  assert.equal(SFX_PITCH_VARIATION_CENTS, 32);
});

test("SFX pitch variation rejects malformed rates and random samples", () => {
  assert.throws(() => randomizedSfxPlaybackRate(0), /Invalid SFX base playback rate/);
  assert.throws(() => randomizedSfxPlaybackRate(Number.NaN), /Invalid SFX base playback rate/);
  assert.throws(() => randomizedSfxPlaybackRate(1, null), /requires a random function/);
  assert.throws(() => randomizedSfxPlaybackRate(1, () => -0.1), /Invalid SFX pitch sample/);
  assert.throws(() => randomizedSfxPlaybackRate(1, () => 1.1), /Invalid SFX pitch sample/);
});
