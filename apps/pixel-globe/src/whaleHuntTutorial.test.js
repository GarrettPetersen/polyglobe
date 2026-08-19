import assert from "node:assert/strict";
import test from "node:test";
import {
  WHALE_EXHAUSTION_TUTORIAL_DECISION,
  markWhaleExhaustionTutorialShown,
  whaleExhaustionTutorialShouldOpen
} from "./whaleHuntTutorial.js";

test("the whale exhaustion tutorial opens only once per voyage", () => {
  const decisions = {};
  assert.equal(whaleExhaustionTutorialShouldOpen(decisions), true);
  markWhaleExhaustionTutorialShown(decisions);
  assert.equal(decisions[WHALE_EXHAUSTION_TUTORIAL_DECISION], true);
  assert.equal(whaleExhaustionTutorialShouldOpen(decisions), false);
});

test("whale exhaustion tutorial memory fails loudly when malformed", () => {
  assert.throws(
    () => whaleExhaustionTutorialShouldOpen({
      [WHALE_EXHAUSTION_TUTORIAL_DECISION]: "yes"
    }),
    /Invalid whale exhaustion tutorial memory/
  );
  assert.throws(
    () => markWhaleExhaustionTutorialShown({
      [WHALE_EXHAUSTION_TUTORIAL_DECISION]: true
    }),
    /already shown/
  );
});
