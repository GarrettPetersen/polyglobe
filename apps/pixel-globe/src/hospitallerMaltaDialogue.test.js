import assert from "node:assert/strict";
import test from "node:test";

import {
  hospitallerMaltaGrantText,
  hospitallerMaltaOfferText
} from "./hospitallerMaltaDialogue.js";

test("Malta dialogue only promises Tripoli when it is part of the grant", () => {
  assert.match(hospitallerMaltaOfferText({ tripoliAvailable: true }), /Tripoli/);
  assert.doesNotMatch(hospitallerMaltaOfferText({ tripoliAvailable: false }), /Tripoli/);
  assert.match(hospitallerMaltaGrantText({ tripoliIncluded: true }), /Tripoli/);
  assert.doesNotMatch(hospitallerMaltaGrantText({ tripoliIncluded: false }), /Tripoli/);
});
