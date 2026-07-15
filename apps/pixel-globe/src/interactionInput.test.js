import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERACTION_INPUT_DIALOGUE,
  INTERACTION_INPUT_FISHING,
  interactionInputOwner
} from "./interactionInput.js";

test("dialogue owns input when an automatic hail interrupts fishing", () => {
  assert.equal(
    interactionInputOwner({ dialogueActive: true, fishingActive: true }),
    INTERACTION_INPUT_DIALOGUE
  );
});

test("fishing blocks ordinary input only while no dialogue is active", () => {
  assert.equal(
    interactionInputOwner({ dialogueActive: false, fishingActive: true }),
    INTERACTION_INPUT_FISHING
  );
  assert.equal(interactionInputOwner({ dialogueActive: false, fishingActive: false }), null);
});
