import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  STORM_LIGHTNING_MIN_INTENSITY,
  consumeStormLightningFlash,
  createStormLightningState,
  updateStormLightning
} from "./stormLightning.js";

test("lightning remains disarmed outside a strong storm", () => {
  const state = createStormLightningState(123);
  assert.equal(updateStormLightning(state, {
    nowMs: 1000,
    intensity: STORM_LIGHTNING_MIN_INTENSITY - 0.01
  }), false);
  assert.equal(state.nextStrikeAtMs, null);
  assert.equal(consumeStormLightningFlash(state), false);
});

test("a strong storm schedules a strike and exposes its flash for one render", () => {
  const state = createStormLightningState(456);
  assert.equal(updateStormLightning(state, { nowMs: 1000, intensity: 1 }), false);
  const strikeAtMs = state.nextStrikeAtMs;
  assert.ok(strikeAtMs > 1000);

  assert.equal(updateStormLightning(state, { nowMs: strikeAtMs - 1, intensity: 1 }), false);
  assert.equal(updateStormLightning(state, { nowMs: strikeAtMs, intensity: 1 }), true);
  assert.equal(consumeStormLightningFlash(state), true);
  assert.equal(consumeStormLightningFlash(state), false);
  assert.ok(state.nextStrikeAtMs > strikeAtMs);
});

test("leaving the storm cancels a scheduled strike", () => {
  const state = createStormLightningState(789);
  updateStormLightning(state, { nowMs: 1000, intensity: 0.8 });
  assert.ok(state.nextStrikeAtMs > 1000);
  updateStormLightning(state, { nowMs: 1200, intensity: 0.1 });
  assert.equal(state.nextStrikeAtMs, null);
  assert.equal(state.flashPending, false);
});

test("the lightning sound is bundled and explicitly credited", async () => {
  const [audio, credits] = await Promise.all([
    readFile(new URL("../public/assets/sfx/freesound_community-lightning-strike-29683.ogg", import.meta.url)),
    readFile(new URL("../public/assets/CREDITS.md", import.meta.url), "utf8")
  ]);
  assert.ok(audio.length > 4096);
  assert.equal(audio.subarray(0, 4).toString("ascii"), "OggS");
  assert.match(credits, /Freesound Community.*druidus.*Lightning Strike.*29683.*Pixabay Content License/i);
  assert.doesNotMatch(credits, /rsn267/i);
});
