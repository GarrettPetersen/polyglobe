import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYER_WIND_TURN_RATE_RAD_PER_SECOND,
  advanceSmoothedWindState,
  createSmoothedWindState
} from "./windSmoothing.js";

test("an opposing wind turns gradually without collapsing its strength", () => {
  const state = createSmoothedWindState({ directionRad: 0, strength: 0.6 });
  const changed = advanceSmoothedWindState(state, {
    directionRad: Math.PI,
    strength: 0.6
  }, 1);

  assert.equal(changed, true);
  assert.ok(Math.abs(state.directionRad - PLAYER_WIND_TURN_RATE_RAD_PER_SECOND) < 1e-9);
  assert.equal(state.strength, 0.6);
});

test("wind strength approaches a lull smoothly and remains positive", () => {
  const state = createSmoothedWindState({ directionRad: 1, strength: 0.7 });
  advanceSmoothedWindState(state, { directionRad: 1.05, strength: 0.025 }, 1);

  assert.ok(state.strength < 0.7);
  assert.ok(state.strength > 0.025);
  assert.ok(state.directionRad > 1 && state.directionRad <= 1.05);
});

test("wind smoothing rejects malformed state instead of hiding it", () => {
  assert.throws(
    () => createSmoothedWindState({ directionRad: 0, strength: 0 }),
    /must be positive/
  );
  assert.throws(
    () => advanceSmoothedWindState({ directionRad: 0, strength: 1 }, { directionRad: NaN, strength: 1 }, 1),
    /Invalid target wind sample/
  );
});
