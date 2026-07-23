import assert from "node:assert/strict";
import test from "node:test";

import {
  dietOfWormsGossip,
  occasionalReligiousBirthdayWish,
  occasionalReligiousGreeting,
  protestantColonistReception
} from "./religiousDialogue.js";

test("two Zoroastrians always recognize one another with the traditional greeting", () => {
  const greeting = occasionalReligiousGreeting({
    speakerReligionId: "zoroastrianism",
    listenerReligionId: "zoroastrianism",
    key: "hormuz-factor|parsi-captain"
  });
  assert.match(greeting, /^Hamazor bem/);
  assert.match(greeting, /another of our faith/);
});

test("Catholic and Lutheran greetings acknowledge their difference without hostility", () => {
  const catholic = findOccasionalGreeting("roman-catholic", "lutheran");
  const lutheran = findOccasionalGreeting("lutheran", "roman-catholic");
  assert.match(catholic, /doctrine from the scales/);
  assert.match(lutheran, /differ on Rome/);
});

test("ordinary religious greetings remain occasional", () => {
  const greetings = Array.from({ length: 64 }, (_, index) => occasionalReligiousGreeting({
    speakerReligionId: "roman-catholic",
    listenerReligionId: "roman-catholic",
    key: `occasional-${index}`
  }));
  assert.ok(greetings.some(Boolean));
  assert.ok(greetings.some((greeting) => greeting === null));
});

test("Diet of Worms gossip follows the factor's denomination and the listener's", () => {
  const catholic = dietOfWormsGossip({
    speakerReligionId: "roman-catholic",
    listenerReligionId: "roman-catholic"
  });
  const lutheran = dietOfWormsGossip({
    speakerReligionId: "lutheran",
    listenerReligionId: "lutheran"
  });
  const cautious = dietOfWormsGossip({
    speakerReligionId: "lutheran",
    listenerReligionId: "roman-catholic"
  });
  assert.match(catholic, /lawful recantation/);
  assert.match(lutheran, /Scripture and conscience/);
  assert.match(cautious, /We may not agree/);
});

test("birthday blessings sometimes recognize shared and differing faiths", () => {
  const shared = findBirthdayWish("sunni-islam", "shia-islam");
  const different = findBirthdayWish("roman-catholic", "hinduism");
  assert.match(shared, /schools differ/);
  assert.match(different, /Our prayers differ/);
});

test("Protestant colonists distinguish co-religionists, Catholics, and other captains", () => {
  assert.match(protestantColonistReception({
    organizerReligionId: "reformed-protestant",
    captainReligionId: "lutheran"
  }), /worship weighed by princes/);
  assert.match(protestantColonistReception({
    organizerReligionId: "reformed-protestant",
    captainReligionId: "roman-catholic"
  }), /old faith/);
  assert.match(protestantColonistReception({
    organizerReligionId: "quaker",
    captainReligionId: "sunni-islam"
  }), /strange to you/);
});

function findOccasionalGreeting(speakerReligionId, listenerReligionId) {
  for (let index = 0; index < 64; index += 1) {
    const greeting = occasionalReligiousGreeting({
      speakerReligionId,
      listenerReligionId,
      key: `greeting-${index}`
    });
    if (greeting) return greeting;
  }
  throw new Error(`Could not trigger ${speakerReligionId}/${listenerReligionId} greeting`);
}

function findBirthdayWish(speakerReligionId, listenerReligionId) {
  for (let index = 0; index < 64; index += 1) {
    const wish = occasionalReligiousBirthdayWish({
      speakerReligionId,
      listenerReligionId,
      listenerName: "Marta",
      key: `birthday-${index}`
    });
    if (wish) return wish;
  }
  throw new Error(`Could not trigger ${speakerReligionId}/${listenerReligionId} birthday wish`);
}
