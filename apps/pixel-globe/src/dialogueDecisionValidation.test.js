import assert from "node:assert/strict";
import test from "node:test";

import { validateDialogueDecision } from "./dialogueDecisionValidation.js";

test("all ship offers validate the vessel renderer contract at construction", () => {
  const valid = {
    options: [choice("Accept vessel"), choice("Keep current ship")],
    presentation: {
      kind: "shipyard",
      listing: { id: "reward", source: "new-build", shipSlug: "viking-longship", price: 0 },
      currentShipSlug: "brigantine",
      purchaseTerms: { listingPrice: 0, tradeInValue: 0, netPrice: 0 }
    }
  };
  assert.equal(validateDialogueDecision(valid, "reward"), valid);
  const missingSource = structuredClone(valid);
  delete missingSource.presentation.listing.source;
  assert.throws(() => validateDialogueDecision(missingSource, "reward"), /requires a source/);
  const unknownSource = structuredClone(valid);
  unknownSource.presentation.listing.source = "mystery";
  assert.throws(() => validateDialogueDecision(unknownSource, "reward"), /Unknown shipyard listing source/);
  const invalidTerms = structuredClone(valid);
  invalidTerms.presentation.purchaseTerms.netPrice = 100;
  assert.throws(() => validateDialogueDecision(invalidTerms, "reward"), /invalid purchase terms/);
});

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

test("dialogue text tones are validated before a view reaches the renderer", () => {
  assert.throws(
    () => validateDialogueDecision({
      feedbackTone: "bad",
      options: [choice("Back")]
    }, "Test quest"),
    /unknown feedback text tone: bad/
  );
  assert.throws(
    () => validateDialogueDecision({
      options: [{ ...choice("Proceed"), detailTone: "warning" }]
    }, "Test quest"),
    /unknown option "Proceed" detail text tone: warning/
  );
  const view = {
    bodyTone: "danger",
    feedbackTone: "success",
    options: [{ ...choice("Proceed"), detailTone: "muted" }]
  };
  assert.equal(validateDialogueDecision(view, "Test quest"), view);
});
