import assert from "node:assert/strict";
import test from "node:test";

import { PAPAL_COMMISSION_RELIEF } from "./papalPolitics.js";
import { papalCommissionOfferText } from "./papalCommissionDialogue.js";

const RELIEF_MATTER = Object.freeze({
  commissionKind: PAPAL_COMMISSION_RELIEF,
  targetFactionId: "ottoman",
  partnerFactionId: null
});

test("the Papal relief brief only describes Rhodes as standing while it remains Hospitaller", () => {
  const standing = papalCommissionOfferText(RELIEF_MATTER, 0, {
    rhodesStillHospitaller: true
  });
  const gone = papalCommissionOfferText(RELIEF_MATTER, 0, {
    rhodesStillHospitaller: false
  });
  assert.match(standing, /Rhodes still stands/i);
  assert.doesNotMatch(standing, /fall|fallen|lost/i);
  assert.doesNotMatch(gone, /Rhodes still stands/i);
});
