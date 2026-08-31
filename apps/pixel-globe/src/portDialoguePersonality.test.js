import assert from "node:assert/strict";
import test from "node:test";
import {
  PORT_PERSONALITY_IDS,
  portGreetingForPersonality,
  portGreetingPresentationForPersonality as renderPortGreetingPresentation,
  portPersonalityForKey
} from "./portDialoguePersonality.js";

function portGreetingPresentationForPersonality(options) {
  return renderPortGreetingPresentation({ localHour: 13, ...options });
}

test("port personalities are stable and distributed across factors", () => {
  assert.equal(portPersonalityForKey("lisbon|portugal"), portPersonalityForKey("lisbon|portugal"));
  const assigned = new Set(Array.from({ length: 100 }, (_, index) => portPersonalityForKey(`port-${index}`)));
  assert.deepEqual([...assigned].sort(), [...PORT_PERSONALITY_IDS].sort());
});

test("ordinary port greetings get quickly to the useful local context", () => {
  const lines = PORT_PERSONALITY_IDS.map((personalityId) => portGreetingForPersonality({
    personalityId,
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    visitCount: 1,
    dayIndex: 10,
    localHour: 13
  }));
  assert.deepEqual([...new Set(lines)], ["Good afternoon, captain.  The harbor is busy."]);
});

test("port salutations follow local time", () => {
  const atHour = (localHour) => renderPortGreetingPresentation({
    personalityId: "cordial",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    localHour
  }).text;
  assert.match(atHour(8), /^Good morning, captain\./);
  assert.match(atHour(13), /^Good afternoon, captain\./);
  assert.match(atHour(20), /^Good evening, captain\./);
});

test("urgent nearby pirate traffic overrides ordinary port chatter", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "vigilant",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    nearbyShips: { pirates: 1, merchants: 4 },
    rivalTerms: rivalTerms("Castile", "Castilian")
  });
  assert.match(presentation.text, /Pirates/);
  assert.doesNotMatch(presentation.text, /merchant sails/i);
  assert.equal(presentation.expressionId, "afraid");
});

test("a remarkable first arrival takes priority over routine rumors", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Tombouctou",
    localFlavor: "A sea-going carrack has reached Kabara by the Niger.",
    prioritizeLocalFlavor: true,
    nearbyShips: { merchants: 4 },
    shipyardRumor: {
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      source: "new-build",
      portName: "Lisbon"
    }
  });

  assert.match(presentation.text, /Kabara by the Niger/i);
  assert.doesNotMatch(presentation.text, /brigantine|merchant sails/i);
});

test("urgent danger still takes priority over a remarkable first arrival", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "vigilant",
    cityName: "Tombouctou",
    localFlavor: "A sea-going carrack has reached Kabara by the Niger.",
    prioritizeLocalFlavor: true,
    nearbyShips: { pirates: 1 }
  });

  assert.match(presentation.text, /Pirates/);
  assert.doesNotMatch(presentation.text, /Kabara/);
});

test("factors can comment on their faction's current rival", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "reflective",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    rivalTerms: rivalTerms("the Ottoman Empire", "Ottoman")
  });
  assert.match(presentation.text, /Ottoman/);
  assert.equal(presentation.expressionId, "stern");
});

test("political gossip uses country nouns rather than adjectives", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    rivalTerms: rivalTerms("Morocco", "Moroccan")
  });
  assert.match(presentation.text, /trouble with Morocco/);
  assert.doesNotMatch(presentation.text, /Moroccan/);
});

test("political security gossip uses nationality adjectives", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "vigilant",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    rivalTerms: rivalTerms("Morocco", "Moroccan")
  });
  assert.match(presentation.text, /Moroccan agents/);
  assert.doesNotMatch(presentation.text, /Morocco agents/);
});

function rivalTerms(noun, adjective) {
  return Object.freeze({
    noun,
    sentenceNoun: noun.charAt(0).toUpperCase() + noun.slice(1),
    adjective
  });
}

test("friendly port chatter requests a matching positive expression", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "cordial",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    playerStanding: 20
  });
  assert.equal(presentation.expressionId, "happy");
});

test("gossipy factors report nearby new shipyard listings", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Porto",
    localFlavor: "The harbor is busy.",
    shipyardRumor: {
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      source: "new-build",
      portName: "Lisbon"
    }
  });

  assert.match(presentation.text, /new brigantine for sale in Lisbon/i);
  assert.equal(presentation.expressionId, "pleased");
});

test("factors identify traded-in shipyard listings as pre-owned", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Porto",
    localFlavor: "The harbor is busy.",
    shipyardRumor: {
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      source: "trade-in",
      portName: "Lisbon"
    }
  });

  assert.match(presentation.text, /pre-owned brigantine for sale in Lisbon/i);
  assert.doesNotMatch(presentation.text, /new brigantine/i);
});

test("factors pitch their own shipyard listing before referring captains elsewhere", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "austere",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    shipyardRumor: {
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      source: "new-build",
      portName: "Lisbon",
      local: true
    }
  });

  assert.match(presentation.text, /our shipyard has a new brigantine for sale/i);
  assert.doesNotMatch(presentation.text, /for sale in/i);
});

test("compound ship names use sentence capitalization in shipyard rumors", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Porto",
    localFlavor: "The harbor is busy.",
    shipyardRumor: {
      shipLabel: "Square-Rigged Caravel",
      shipProseLabel: "square-rigged caravel",
      source: "new-build",
      portName: "Lisbon"
    }
  });

  assert.match(presentation.text, /a new square-rigged caravel for sale in Lisbon/);
  assert.doesNotMatch(presentation.text, /square-Rigged|Caravel/);
});

test("regional succession news takes priority over ordinary port gossip", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Istanbul",
    localFlavor: "The harbor is busy.",
    shipyardRumor: {
      shipLabel: "Brigantine",
      shipProseLabel: "brigantine",
      source: "new-build",
      portName: "Venice"
    },
    rulerRumor: {
      factionId: "safavid",
      displayName: "Shah Tahmasp I",
      previousRuler: { displayName: "Shah Ismail I" }
    }
  });

  assert.match(presentation.text, /Shah Tahmasp I now rules Safavid Persia/);
  assert.doesNotMatch(presentation.text, /brigantine/i);
  assert.equal(presentation.expressionId, "attentive");
});

test("succession gossip respects each realm's canonical article", () => {
  const rumor = (factionId, displayName) => ({
    factionId,
    displayName,
    previousRuler: { displayName: "the former ruler" }
  });
  const denmarkNorway = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Copenhagen",
    localFlavor: "The harbor is busy.",
    rulerRumor: rumor("denmark-norway", "Frederick I")
  });
  const ottoman = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Istanbul",
    localFlavor: "The harbor is busy.",
    rulerRumor: rumor("ottoman", "Sultan Suleiman I")
  });

  assert.match(denmarkNorway.text, /rules Denmark-Norway/);
  assert.doesNotMatch(denmarkNorway.text, /the Denmark-Norway/);
  assert.match(ottoman.text, /rules the Ottoman Empire/);
});

test("port historical gossip stays to one useful report", () => {
  const gossip = {
    place: "Worms",
    report: "Martin Luther refused to recant before Emperor Charles V at the Diet of Worms",
    tradeImpact: "Printers and pamphlet sellers have never been busier.",
    reflection: "A few spoken words can travel farther than an army."
  };
  const enterprising = portGreetingPresentationForPersonality({
    personalityId: "enterprising",
    cityName: "Hamburg",
    localFlavor: "The harbor is busy.",
    historicalGossip: gossip
  });
  const reflective = portGreetingPresentationForPersonality({
    personalityId: "reflective",
    cityName: "Bremen",
    localFlavor: "The harbor is busy.",
    historicalGossip: gossip
  });

  assert.match(enterprising.text, /Martin Luther refused to recant/);
  assert.match(reflective.text, /Martin Luther refused to recant/);
  assert.doesNotMatch(enterprising.text, /Printers and pamphlet sellers/);
  assert.doesNotMatch(reflective.text, /spoken words can travel farther/);
  assert.equal(enterprising.expressionId, "attentive");
});

test("Catholic and Lutheran factors frame the Diet of Worms differently", () => {
  const gossip = {
    id: "diet-of-worms",
    place: "Worms",
    report: "Martin Luther refused to recant before Emperor Charles V at the Diet of Worms",
    tradeImpact: "Printers and pamphlet sellers have never been busier.",
    reflection: "A few spoken words can travel farther than an army."
  };
  const catholic = portGreetingPresentationForPersonality({
    personalityId: "austere",
    cityName: "Augsburg",
    localFlavor: "The harbor is busy.",
    historicalGossip: gossip,
    speakerReligionId: "roman-catholic",
    listenerReligionId: "roman-catholic"
  });
  const lutheran = portGreetingPresentationForPersonality({
    personalityId: "reflective",
    cityName: "Bremen",
    localFlavor: "The harbor is busy.",
    historicalGossip: gossip,
    speakerReligionId: "lutheran",
    listenerReligionId: "lutheran"
  });

  assert.match(catholic.text, /lawful recantation/);
  assert.match(lutheran.text, /many here call him steadfast/);
});
