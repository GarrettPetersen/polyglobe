import assert from "node:assert/strict";
import test from "node:test";

import { shipyardListingCondition, shipyardUnfinishedBuildPercent } from "./shipyardListingPresentation.js";

test("unfinished builds never advertise completion from rounding or an elapsed material-delayed clock", () => {
  assert.equal(shipyardUnfinishedBuildPercent(0), 0);
  assert.equal(shipyardUnfinishedBuildPercent(0.504), 50);
  assert.equal(shipyardUnfinishedBuildPercent(0.996), 99);
  assert.equal(shipyardUnfinishedBuildPercent(1), 99);
  for (const invalid of [NaN, Infinity, -0.1, 1.1]) {
    assert.throws(() => shipyardUnfinishedBuildPercent(invalid), /construction progress/);
  }
});

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
