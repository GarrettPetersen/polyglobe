import assert from "node:assert/strict";
import test from "node:test";

import {
  PAPAL_COMMISSION_ALMS,
  PAPAL_COMMISSION_RELIEF
} from "./papalPolitics.js";
import { papalCommissionOfferText } from "./papalCommissionDialogue.js";

const RELIEF_MATTER = Object.freeze({
  commissionKind: PAPAL_COMMISSION_RELIEF,
  targetFactionId: "ottoman",
  partnerFactionId: null,
  beneficiaryFactionId: "hospitallers",
  cargoRequirements: Object.freeze([
    Object.freeze({ goodId: "grain", quantity: 8 }),
    Object.freeze({ goodId: "gunpowder", quantity: 3 })
  ])
});

test("the Papal relief brief only describes Rhodes as standing while it remains Hospitaller", () => {
  const standing = papalCommissionOfferText(RELIEF_MATTER, 0, {
    destinationName: "Rhodes",
    rhodesStillHospitaller: true
  });
  const gone = papalCommissionOfferText(RELIEF_MATTER, 0, {
    destinationName: "Rhodes",
    rhodesStillHospitaller: false
  });
  assert.match(standing, /Rhodes still stands/i);
  assert.doesNotMatch(standing, /fall|fallen|lost/i);
  assert.doesNotMatch(gone, /Rhodes still stands/i);
});

test("Papal transport offers name their cargo and true recipient", () => {
  const relief = papalCommissionOfferText(RELIEF_MATTER, 0, {
    destinationName: "Rhodes"
  });
  assert.match(relief, /Knights Hospitaller.*Ottoman/i);
  assert.match(relief, /8 cargoes of grain and 3 cargoes of gunpowder/i);

  const alms = papalCommissionOfferText({
    commissionKind: PAPAL_COMMISSION_ALMS,
    targetFactionId: "portugal",
    partnerFactionId: null,
    beneficiaryFactionId: null,
    cargoRequirements: [{ goodId: "grain", quantity: 10 }]
  }, 0, { destinationName: "Lisbon" });
  assert.match(alms, /10 cargoes of grain.*poor at Lisbon/i);
});
