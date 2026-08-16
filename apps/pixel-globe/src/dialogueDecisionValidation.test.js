import assert from "node:assert/strict";
import test from "node:test";

import { validateDialogueDecision } from "./dialogueDecisionValidation.js";

function choice(label, { disabled = false, disabledReason = null } = {}) {
  return {
    label,
    action: { type: label === "Not now" ? "close" : "advance-quest" },
    disabled,
    disabledReason
  };
}

test("quest dialogue cannot offer only not now", () => {
  assert.throws(
    () => validateDialogueDecision({ options: [choice("Not now")] }, "Test quest"),
    /offers only a deferral/
  );
});

test("quest dialogue may show an explained disabled action beside not now", () => {
  const view = {
    options: [
      choice("Deliver grain", { disabled: true, disabledReason: "Still need 12 grain." }),
      choice("Not now")
    ]
  };
  assert.equal(validateDialogueDecision(view, "Test quest"), view);
});

test("disabled quest choices beside a deferral must explain their requirements", () => {
  assert.throws(
    () => validateDialogueDecision({
      options: [choice("Deliver grain", { disabled: true }), choice("Not now")]
    }, "Test quest"),
    /without explaining its unmet requirements/
  );
});

test("informational dialogue may still have a single back option", () => {
  const view = { options: [choice("Back")] };
  assert.equal(validateDialogueDecision(view, "Test quest"), view);
});
