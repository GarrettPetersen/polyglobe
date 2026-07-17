import assert from "node:assert/strict";
import test from "node:test";
import {
  FISHING_NET_CYCLE_COUNT,
  FISHING_NET_FRAME_COUNT,
  FISHING_NET_FRAME_MS,
  canStartFishing,
  fishingActionPresentation,
  fishingAnimationState,
  fishingCatchChance,
  fishingCatchSucceeds,
  fishingSideForTarget
} from "./fishingAction.js";

test("the fishing net plays every frame exactly three times", () => {
  const cycleMs = FISHING_NET_FRAME_COUNT * FISHING_NET_FRAME_MS;
  const startMs = 1000;
  assert.deepEqual(
    pickAnimation(fishingAnimationState(startMs, startMs)),
    { complete: false, cycleIndex: 0, frameIndex: 0 }
  );
  assert.deepEqual(
    pickAnimation(fishingAnimationState(startMs, startMs + cycleMs)),
    { complete: false, cycleIndex: 1, frameIndex: 0 }
  );
  assert.deepEqual(
    pickAnimation(fishingAnimationState(startMs, startMs + cycleMs * FISHING_NET_CYCLE_COUNT - 1)),
    { complete: false, cycleIndex: 2, frameIndex: FISHING_NET_FRAME_COUNT - 1 }
  );
  assert.equal(
    fishingAnimationState(startMs, startMs + cycleMs * FISHING_NET_CYCLE_COUNT).complete,
    true
  );
});

test("each additional visible fish improves catch odds without guaranteeing a catch", () => {
  const sparse = fishingCatchChance(2);
  const healthy = fishingCatchChance(6);
  assert.ok(sparse >= 0.2);
  assert.ok(healthy > sparse);
  assert.ok(healthy < 1);
  assert.equal(fishingCatchChance(8), 0.82);
  assert.equal(fishingCatchChance(12), 0.82);
});

test("better fishing nets improve catch odds across the same fish school", () => {
  const basic = fishingCatchChance(6, 0.8);
  const weighted = fishingCatchChance(6, 1);
  const drift = fishingCatchChance(6, 1.2);
  const masterwork = fishingCatchChance(6, 1.4);

  assert.ok(basic > 0.5);
  assert.ok(basic < weighted);
  assert.ok(weighted < drift);
  assert.ok(drift < masterwork);
  assert.ok(masterwork < 1);
});

test("catch resolution and casting side are deterministic from their inputs", () => {
  assert.equal(fishingCatchSucceeds(0.39, 0.4), true);
  assert.equal(fishingCatchSucceeds(0.4, 0.4), false);
  assert.equal(fishingSideForTarget(100, 80), -1);
  assert.equal(fishingSideForTarget(100, 120), 1);
});

test("fishing actions keep the verb prominent and the chance secondary", () => {
  assert.deepEqual(fishingActionPresentation("Atlantic cod", 0.674), {
    label: "FISH FOR ATLANTIC COD",
    chanceLabel: "67%"
  });
  assert.throws(() => fishingActionPresentation("", 0.5), /species name/);
  assert.throws(() => fishingActionPresentation("Cod", 1.01), /catch chance/);
});

test("fishing is disabled when the cargo hold is full", () => {
  assert.equal(canStartFishing(3), true);
  assert.equal(canStartFishing(0), false);
  assert.throws(() => canStartFishing(-1), /catch capacity/);
  assert.throws(() => canStartFishing(1 / 3), /catch capacity/);
});

function pickAnimation(state) {
  return {
    complete: state.complete,
    cycleIndex: state.cycleIndex,
    frameIndex: state.frameIndex
  };
}
