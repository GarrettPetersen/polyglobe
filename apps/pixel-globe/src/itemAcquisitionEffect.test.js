import assert from "node:assert/strict";
import test from "node:test";

import {
  ITEM_ACQUISITION_EFFECT_DURATION_MS,
  createItemAcquisitionEffect,
  itemAcquisitionEffectComplete,
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
});
