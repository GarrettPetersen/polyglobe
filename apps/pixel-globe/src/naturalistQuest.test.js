import assert from "node:assert/strict";
import test from "node:test";

import {
  ANIMAL_CATALOG,
  createAnimalEncounterMemory,
  recordAnimalEncounter
} from "./animalEncounters.js";
import {
  NATURALIST_COMPLETION_REWARD,
  NATURALIST_REPORT_REWARD,
  assignNaturalistPort,
  createNaturalistQuestMemory,
  meetNaturalist,
  naturalistQuestPresentation,
  naturalistQuestView,
  naturalistShouldApproach,
  reportAnimalsToNaturalist
} from "./naturalistQuest.js";

const ports = [
  { tileId: 10, country: "Portugal" },
  { tileId: 20, country: "Ming" },
  { tileId: 30, country: "Pirate" }
];

test("the naturalist receives one persistent non-pirate home port", () => {
  const memory = createNaturalistQuestMemory();
  const first = assignNaturalistPort(memory, ports, "voyage-one");
  assert.ok([10, 20].includes(first));
  assert.equal(assignNaturalistPort(memory, ports.slice().reverse(), "different-key"), first);
});

test("the naturalist approaches on first meeting and whenever reports are waiting", () => {
  const quest = createNaturalistQuestMemory();
  quest.portTileId = 10;
  const animals = createAnimalEncounterMemory();
  assert.equal(naturalistShouldApproach(quest, animals, 10), true);
  meetNaturalist(quest);
  assert.equal(naturalistShouldApproach(quest, animals, 10), false);
  recordAnimalEncounter(animals, "tiger");
  assert.equal(naturalistShouldApproach(quest, animals, 10), true);
  assert.equal(naturalistShouldApproach(quest, animals, 20), false);
  reportAnimalsToNaturalist(quest, animals);
  assert.equal(naturalistShouldApproach(quest, animals, 10, { companionOfferAvailable: true }), true);
  assert.equal(naturalistShouldApproach(quest, animals, 20, { companionOfferAvailable: true }), false);
});

test("a panda remains an animal report independently of its companion disposition", () => {
  const quest = createNaturalistQuestMemory();
  quest.portTileId = 10;
  meetNaturalist(quest);
  const animals = createAnimalEncounterMemory();
  recordAnimalEncounter(animals, "panda");
  const report = reportAnimalsToNaturalist(quest, animals);
  assert.deepEqual(report.animalIds, ["panda"]);
  assert.equal(naturalistQuestView(quest, animals).reportedCount, 1);
});

test("the demo presents natural history as open-ended while the full game keeps bestiary completion", () => {
  const view = { reportedCount: 4, totalCount: 18 };
  assert.deepEqual(naturalistQuestPresentation(view, "demo"), {
    title: "NATURAL HISTORY",
    idleObjective: "DOCUMENT EXOTIC ANIMALS",
    reportSummary: "NATURALIST REPORTS RECORDED 4",
    ongoingDialogue:
      "Every honest account adds another page to my book. Keep watch whenever you make landfall.",
    framesCompletion: false
  });
  assert.deepEqual(naturalistQuestPresentation(view, "full"), {
    title: "THE GREAT BESTIARY",
    idleObjective: "DOCUMENT EXOTIC ANIMALS (4/18)",
    reportSummary: "BESTIARY REPORTED 4/18",
    ongoingDialogue:
      "4 of 18 creatures now have a place in my book. Keep watch whenever you make landfall.",
    framesCompletion: true
  });
  assert.throws(
    () => naturalistQuestPresentation(view, "preview"),
    /Unknown naturalist presentation edition/
  );
});

test("animal reports pay once and the completed bestiary grants its bonus", () => {
  const quest = createNaturalistQuestMemory();
  quest.portTileId = 10;
  meetNaturalist(quest);
  const animals = createAnimalEncounterMemory();
  recordAnimalEncounter(animals, "tiger");
  assert.deepEqual(reportAnimalsToNaturalist(quest, animals), {
    animalIds: ["tiger"],
    reward: NATURALIST_REPORT_REWARD,
    completedNow: false
  });
  assert.equal(reportAnimalsToNaturalist(quest, animals).reward, 0);

  for (const animal of ANIMAL_CATALOG) recordAnimalEncounter(animals, animal.id);
  const completion = reportAnimalsToNaturalist(quest, animals);
  assert.equal(completion.completedNow, true);
  assert.equal(
    completion.reward,
    (ANIMAL_CATALOG.length - 1) * NATURALIST_REPORT_REWARD + NATURALIST_COMPLETION_REWARD
  );
  assert.equal(naturalistQuestView(quest, animals).complete, true);
  assert.equal(reportAnimalsToNaturalist(quest, animals).reward, 0);
});
