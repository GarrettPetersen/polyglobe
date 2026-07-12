import assert from "node:assert/strict";
import test from "node:test";
import {
  FISHING_NET_CYCLE_COUNT,
  FISHING_NET_FRAME_COUNT,
  FISHING_NET_FRAME_MS,
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

test("denser fisheries improve catch odds without guaranteeing a catch", () => {
  const sparse = fishingCatchChance(0.2, true);
  const healthy = fishingCatchChance(0.75, false);
  assert.ok(sparse >= 0.2);
  assert.ok(healthy > sparse);
  assert.ok(healthy < 1);
  assert.equal(fishingCatchChance(5, false), 0.82);
});

test("catch resolution and casting side are deterministic from their inputs", () => {
  assert.equal(fishingCatchSucceeds(0.39, 0.4), true);
  assert.equal(fishingCatchSucceeds(0.4, 0.4), false);
  assert.equal(fishingSideForTarget(100, 80), -1);
  assert.equal(fishingSideForTarget(100, 120), 1);
});

function pickAnimation(state) {
  return {
    complete: state.complete,
    cycleIndex: state.cycleIndex,
    frameIndex: state.frameIndex
  };
}
