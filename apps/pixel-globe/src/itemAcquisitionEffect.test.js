import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM_ACQUISITION_EFFECT_DURATION_MS,
  createItemAcquisitionBurst,
  createItemAcquisitionEffect,
  createItemDepartureEffect,
  itemAcquisitionEffectComplete,
  itemAcquisitionEffectEndMs,
  itemAcquisitionEffectFrame
} from "./itemAcquisitionEffect.js";

function effect() {
  return createItemAcquisitionEffect({
    iconId: "good:cloves",
    startX: 307.4,
    startY: 216.6,
    startedAtMs: 1000,
    iconSize: 16
  });
}

test("item acquisition icons start on the source row and leave through the top-left", () => {
  const state = effect();
  assert.deepEqual(itemAcquisitionEffectFrame(state, 1000), {
    complete: false,
    x: 307,
    y: 217
  });

  const middle = itemAcquisitionEffectFrame(
    state,
    1000 + ITEM_ACQUISITION_EFFECT_DURATION_MS / 2
  );
  assert.ok(middle.x < state.startX);
  assert.ok(middle.y < state.startY);
  assert.ok(Number.isInteger(middle.x));
  assert.ok(Number.isInteger(middle.y));

  assert.deepEqual(
    itemAcquisitionEffectFrame(state, 1000 + ITEM_ACQUISITION_EFFECT_DURATION_MS),
    { complete: true, x: -18, y: -18 }
  );
});

test("item acquisition effects stay active for their full flight", () => {
  const state = effect();
  assert.equal(
    itemAcquisitionEffectComplete(state, 1000 + ITEM_ACQUISITION_EFFECT_DURATION_MS - 1),
    false
  );
  assert.equal(
    itemAcquisitionEffectComplete(state, 1000 + ITEM_ACQUISITION_EFFECT_DURATION_MS),
    true
  );
});

test("item departure icons leave through the bottom-right", () => {
  const state = createItemDepartureEffect({
    iconId: "good:cloves",
    startX: 120,
    startY: 90,
    startedAtMs: 1000,
    iconSize: 16,
    viewportWidth: 455,
    viewportHeight: 256
  });

  const middle = itemAcquisitionEffectFrame(
    state,
    1000 + ITEM_ACQUISITION_EFFECT_DURATION_MS / 2
  );
  assert.ok(middle.x > state.startX);
  assert.ok(middle.y > state.startY);
  assert.deepEqual(
    itemAcquisitionEffectFrame(state, 1000 + ITEM_ACQUISITION_EFFECT_DURATION_MS),
    { complete: true, x: 457, y: 258 }
  );
});

test("item acquisition bursts create one staggered icon per awarded hold space", () => {
  const effects = createItemAcquisitionBurst({
    iconId: "good:gold",
    count: 24,
    startCenterX: 100,
    startCenterY: 80,
    targetCenterX: 227.5,
    targetCenterY: 128,
    startedAtMs: 1000,
    iconSize: 16,
    arrivalSoundId: "coin-clink"
  });

  assert.equal(effects.length, 24);
  assert.ok(effects.every((item) => item.iconId === "good:gold"));
  assert.ok(effects.every((item) => item.targetX === 220 && item.targetY === 120));
  assert.ok(effects.every((item) => item.arrivalSoundId === "coin-clink"));
  assert.ok(new Set(effects.map((item) => `${item.startX}:${item.startY}`)).size > 8);
  assert.ok(effects.every((item, index) => index === 0 || item.startedAtMs > effects[index - 1].startedAtMs));
  assert.deepEqual(itemAcquisitionEffectFrame(effects[1], 1000), {
    pending: true,
    complete: false,
    x: effects[1].startX,
    y: effects[1].startY
  });
  assert.equal(
    itemAcquisitionEffectEndMs(effects.at(-1)),
    effects.at(-1).startedAtMs + ITEM_ACQUISITION_EFFECT_DURATION_MS
  );
});

test("item acquisition effects reject malformed input", () => {
  assert.throws(() => createItemAcquisitionEffect({
    iconId: "",
    startX: 0,
    startY: 0,
    startedAtMs: 0,
    iconSize: 16
  }), /icon id/);
  assert.throws(() => createItemAcquisitionEffect({
    iconId: "good:fish",
    startX: 0,
    startY: 0,
    startedAtMs: 0,
    iconSize: 0
  }), /positive integer icon size/);
  assert.throws(() => itemAcquisitionEffectFrame(effect(), Number.NaN), /frame time/);
  assert.throws(() => createItemAcquisitionBurst({
    iconId: "good:gold",
    count: 0,
    startCenterX: 0,
    startCenterY: 0,
    targetCenterX: 10,
    targetCenterY: 10,
    startedAtMs: 0,
    iconSize: 16
  }), /positive integer count/);
  assert.throws(() => createItemDepartureEffect({
    iconId: "good:fish",
    startX: 0,
    startY: 0,
    startedAtMs: 0,
    iconSize: 16,
    viewportWidth: 0,
    viewportHeight: 256
  }), /positive integer viewportWidth/);
});
