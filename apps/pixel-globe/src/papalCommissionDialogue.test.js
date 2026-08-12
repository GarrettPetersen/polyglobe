import assert from "node:assert/strict";
import test from "node:test";

import {
  PAPAL_COMMISSION_ADMONITION,
  PAPAL_COMMISSION_ALMS,
  PAPAL_COMMISSION_PEACE,
  PAPAL_COMMISSION_REFORM,
  PAPAL_COMMISSION_RELIEF
} from "./papalPolitics.js";
import {
  PAPAL_COMMISSION_JOURNEY_EVENT_ID,
  papalCommissionJourneyDialogueEvent,
  papalCommissionOfferText
} from "./papalCommissionDialogue.js";

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

test("Papal policy exposition moves into the outbound leg while cargo missions stay direct", () => {
  for (const matter of [
    commissionMatter(PAPAL_COMMISSION_ADMONITION, "france"),
    commissionMatter(PAPAL_COMMISSION_PEACE, "france", "england"),
    commissionMatter(PAPAL_COMMISSION_REFORM, "habsburg")
  ]) {
    const event = papalCommissionJourneyDialogueEvent(matter, 0);
    assert.equal(event.id, PAPAL_COMMISSION_JOURNEY_EVENT_ID);
    assert.equal(event.trigger, "destination-closer");
    assert.ok(event.text.length > 70);
  }
  assert.equal(papalCommissionJourneyDialogueEvent(RELIEF_MATTER, 0), null);
});

function commissionMatter(commissionKind, targetFactionId, partnerFactionId = null) {
  return {
    commissionKind,
    targetFactionId,
    partnerFactionId,
    beneficiaryFactionId: null,
    cargoRequirements: []
  };
}
