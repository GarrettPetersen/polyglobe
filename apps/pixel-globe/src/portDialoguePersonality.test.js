import assert from "node:assert/strict";
import test from "node:test";
import {
  PORT_PERSONALITY_IDS,
  portGreetingForPersonality,
  portGreetingPresentationForPersonality,
  portPersonalityForKey
} from "./portDialoguePersonality.js";

test("port personalities are stable and distributed across factors", () => {
  assert.equal(portPersonalityForKey("Lisbon|Portugal"), portPersonalityForKey("Lisbon|Portugal"));
  const assigned = new Set(Array.from({ length: 100 }, (_, index) => portPersonalityForKey(`port-${index}`)));
  assert.deepEqual([...assigned].sort(), [...PORT_PERSONALITY_IDS].sort());
});

test("different personalities give the same port a distinct voice", () => {
  const lines = PORT_PERSONALITY_IDS.map((personalityId) => portGreetingForPersonality({
    personalityId,
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    visitCount: 1,
    dayIndex: 10
  }));
  assert.equal(new Set(lines).size, PORT_PERSONALITY_IDS.length);
});

test("urgent nearby pirate traffic overrides ordinary port chatter", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "vigilant",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    nearbyShips: { pirates: 1, merchants: 4 },
    rivalLabel: "Castile"
  });
  assert.match(presentation.text, /Pirates/);
  assert.doesNotMatch(presentation.text, /merchant sails/i);
  assert.equal(presentation.expressionId, "afraid");
});

test("factors can comment on their faction's current rival", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "reflective",
    cityName: "Lisbon",
    localFlavor: "The harbor is busy.",
    rivalLabel: "Ottoman"
  });
  assert.match(presentation.text, /Ottoman/);
  assert.equal(presentation.expressionId, "stern");
});

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
    shipyardRumor: { shipLabel: "Brigantine", portName: "Lisbon" }
  });

  assert.match(presentation.text, /new brigantine for sale in Lisbon/i);
  assert.equal(presentation.expressionId, "pleased");
});

test("regional succession news takes priority over ordinary port gossip", () => {
  const presentation = portGreetingPresentationForPersonality({
    personalityId: "gossipy",
    cityName: "Istanbul",
    localFlavor: "The harbor is busy.",
    shipyardRumor: { shipLabel: "Brigantine", portName: "Venice" },
    rulerRumor: {
      factionName: "Safavid Empire",
      displayName: "Shah Tahmasp I",
      previousRuler: { displayName: "Shah Ismail I" }
    }
  });

  assert.match(presentation.text, /Shah Tahmasp I now rules the Safavid Empire/);
  assert.doesNotMatch(presentation.text, /brigantine/i);
  assert.equal(presentation.expressionId, "attentive");
});

test("port personalities retell regional historical news in their own voice", () => {
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

  assert.match(enterprising.text, /Printers and pamphlet sellers/);
  assert.match(reflective.text, /spoken words can travel farther/);
  assert.equal(enterprising.expressionId, "attentive");
});
