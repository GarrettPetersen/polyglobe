import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  STORM_LIGHTNING_MIN_INTENSITY,
  STORM_SHIP_STRIKE_FLASH_FRAME,
  STORM_SHIP_STRIKE_FRAME_COUNT,
  STORM_SHIP_STRIKE_FRAME_HEIGHT,
  STORM_SHIP_STRIKE_FRAME_WIDTH,
  STORM_SHIP_STRIKE_SHEET_COLUMNS,
  consumeStormShipStrikeFlash,
  consumeStormLightningFlash,
  createStormShipStrikeState,
  createStormLightningState,
  stormShipStrikeDrawOrigin,
  stormShipStrikeFrame,
  triggerStormShipStrike,
  updateStormShipStrike,
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

test("storm damage animates all thirty lightning frames and flashes at impact", () => {
  const state = createStormShipStrikeState();
  triggerStormShipStrike(state, 1000);

  assert.equal(stormShipStrikeFrame(state, 1000).index, 0);
  assert.equal(consumeStormShipStrikeFlash(state, 1000), false);

  const impactTime = 1000 + Math.ceil(STORM_SHIP_STRIKE_FLASH_FRAME * 1000 / 30);
  assert.equal(stormShipStrikeFrame(state, impactTime).index, STORM_SHIP_STRIKE_FLASH_FRAME);
  assert.equal(consumeStormShipStrikeFlash(state, impactTime), true);
  assert.equal(consumeStormShipStrikeFlash(state, impactTime), false);

  const lastFrameTime = 1000 + (STORM_SHIP_STRIKE_FRAME_COUNT - 0.5) * 1000 / 30;
  assert.equal(stormShipStrikeFrame(state, lastFrameTime).index, STORM_SHIP_STRIKE_FRAME_COUNT - 1);
  assert.equal(updateStormShipStrike(state, lastFrameTime), true);
  assert.equal(updateStormShipStrike(state, 2000), false);
  assert.equal(stormShipStrikeFrame(state, 2000), null);
});

test("storm strike origin follows the current responsive ship position", () => {
  assert.deepEqual(
    stormShipStrikeDrawOrigin({ shipX: 210, shipY: 110, shipFrameSize: 36 }),
    { x: 130, y: -80 }
  );
  assert.deepEqual(
    stormShipStrikeDrawOrigin({ shipX: 110, shipY: 210, shipFrameSize: 36 }),
    { x: 30, y: 20 }
  );
});

test("the purchased lightning sheet has the declared frame grid and credit", async () => {
  const [imageBytes, credits] = await Promise.all([
    readFile(new URL("../public/assets/misc/lightning.png", import.meta.url)),
    readFile(new URL("../public/assets/CREDITS.md", import.meta.url), "utf8")
  ]);
  const image = await loadImage(imageBytes);
  assert.equal(image.width, STORM_SHIP_STRIKE_FRAME_WIDTH * STORM_SHIP_STRIKE_SHEET_COLUMNS);
  assert.equal(
    image.height,
    STORM_SHIP_STRIKE_FRAME_HEIGHT * Math.ceil(STORM_SHIP_STRIKE_FRAME_COUNT / STORM_SHIP_STRIKE_SHEET_COLUMNS)
  );
  const canvas = createCanvas(STORM_SHIP_STRIKE_FRAME_WIDTH, STORM_SHIP_STRIKE_FRAME_HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    STORM_SHIP_STRIKE_FLASH_FRAME * STORM_SHIP_STRIKE_FRAME_WIDTH,
    0,
    STORM_SHIP_STRIKE_FRAME_WIDTH,
    STORM_SHIP_STRIKE_FRAME_HEIGHT,
    0,
    0,
    STORM_SHIP_STRIKE_FRAME_WIDTH,
    STORM_SHIP_STRIKE_FRAME_HEIGHT
  );
  assert.ok(ctx.getImageData(0, 0, 1, 1).data[3] > 0, "impact flash frame must be nonblank");
  assert.match(credits, /InfectedTribe.*Pixel Animated Lightning Strike Effect.*itch\.io/i);
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
