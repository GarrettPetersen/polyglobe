import assert from "node:assert/strict";
import test from "node:test";

import { shipyardListingCondition } from "./shipyardListingPresentation.js";

test("shipyard trade-ins are presented as used vessels everywhere", () => {
  assert.deepEqual(shipyardListingCondition("trade-in"), {
    menuAdjective: "Pre-owned",
    sentenceLead: "A pre-owned",
    overlayHeading: "SHIPYARD / USED VESSEL",
    comparisonHeading: "USED"
  });
});

test("new shipyard builds retain their new-vessel presentation", () => {
  assert.deepEqual(shipyardListingCondition("new-build"), {
    menuAdjective: "New",
    sentenceLead: "A newly built",
    overlayHeading: "SHIPYARD / NEW VESSEL",
    comparisonHeading: "NEW"
  });
});

test("shipyard listing presentation rejects an unknown source", () => {
  assert.throws(() => shipyardListingCondition("captured"), /Unknown shipyard listing source/);
});
