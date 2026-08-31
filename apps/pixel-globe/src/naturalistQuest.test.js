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
  migrateNaturalistQuestMemory,
  naturalistQuestCharacter,
  naturalistQuestPresentation,
  naturalistQuestView,
  naturalistShouldApproach,
  reportAnimalsToNaturalist,
  setNaturalistQuestCharacter
} from "./naturalistQuest.js";

const ports = [
  { cityId: "lisbon|portugal", tileId: 10, country: "Portugal" },
  { cityId: "nanjing|china", tileId: 20, country: "Ming" },
  { cityId: "pirate-haven|pirate", tileId: 30, country: "Pirate" }
];

test("the naturalist receives one persistent non-pirate home port", () => {
  const memory = createNaturalistQuestMemory();
  const first = assignNaturalistPort(memory, ports, "voyage-one");
  assert.ok(["lisbon|portugal", "nanjing|china"].includes(first));
  assert.equal(assignNaturalistPort(memory, ports.slice().reverse(), "different-key"), first);
});

test("the naturalist retains one persisted identity and portrait", () => {
  const memory = createNaturalistQuestMemory();
  memory.portCityId = "lisbon|portugal";
  memory.portTileId = 10;
  const character = naturalistCharacterFixture();
  assert.equal(setNaturalistQuestCharacter(memory, character), character);
  assert.equal(naturalistQuestCharacter(memory), character);
  assert.equal(naturalistQuestCharacter(structuredClone(memory)).sourceId, "portrait-naturalist-a");
});

test("legacy naturalist memory migrates without inventing a former portrait", () => {
  const migrated = migrateNaturalistQuestMemory({
    version: 1,
    portTileId: 20,
    met: true,
    reportedAnimalIds: ["panda"],
    completionRewarded: false
  });
  assert.equal(migrated.version, 2);
  assert.equal(migrated.character, null);
  assert.equal(migrated.portTileId, 20);
  assert.deepEqual(migrated.reportedAnimalIds, ["panda"]);
});

test("the naturalist approaches on first meeting and whenever reports are waiting", () => {
  const quest = createNaturalistQuestMemory();
  quest.portCityId = "lisbon|portugal";
  quest.portTileId = 10;
  const animals = createAnimalEncounterMemory();
  assert.equal(naturalistShouldApproach(quest, animals, "lisbon|portugal"), true);
  meetNaturalist(quest);
  assert.equal(naturalistShouldApproach(quest, animals, "lisbon|portugal"), false);
  recordAnimalEncounter(animals, "tiger");
  assert.equal(naturalistShouldApproach(quest, animals, "lisbon|portugal"), true);
  assert.equal(naturalistShouldApproach(quest, animals, "nanjing|china"), false);
  reportAnimalsToNaturalist(quest, animals);
  assert.equal(naturalistShouldApproach(quest, animals, "lisbon|portugal", { companionOfferAvailable: true }), true);
  assert.equal(naturalistShouldApproach(quest, animals, "nanjing|china", { companionOfferAvailable: true }), false);
  assert.equal(naturalistShouldApproach(quest, animals, "lisbon|portugal", {
    formerCompanionGreetingAvailable: true
  }), true);
  assert.equal(naturalistShouldApproach(quest, animals, "nanjing|china", {
    formerCompanionGreetingAvailable: true
  }), false);
});

test("a panda remains an animal report independently of its companion disposition", () => {
  const quest = createNaturalistQuestMemory();
  quest.portCityId = "lisbon|portugal";
  quest.portTileId = 10;
  meetNaturalist(quest);
  const animals = createAnimalEncounterMemory();
  recordAnimalEncounter(animals, "panda");
  const report = reportAnimalsToNaturalist(quest, animals);
  assert.deepEqual(report.animalIds, ["panda"]);
  assert.equal(naturalistQuestView(quest, animals).reportedCount, 1);
});

test("the demo completes a regional natural history while the full game keeps the great bestiary", () => {
  const view = { reportedCount: 4, totalCount: 18 };
  assert.deepEqual(naturalistQuestPresentation(view, "demo"), {
    title: "MEDITERRANEAN NATURAL HISTORY",
    idleObjective: "DOCUMENT MEDITERRANEAN ANIMALS (4/18)",
    reportSummary: "MEDITERRANEAN REPORTS 4/18",
    ongoingDialogue:
      "4 of 18 creatures of these seas now have a place in my book. Keep watch whenever you make landfall.",
    completionLedgerLabel: "Completed Mediterranean natural history",
    completionDialogue:
      "Splendid! You have recorded every creature in these waters. The full game opens distant " +
      "oceans and many blank pages in my book.",
    framesCompletion: true
  });
  assert.deepEqual(naturalistQuestPresentation(view, "full"), {
    title: "THE GREAT BESTIARY",
    idleObjective: "DOCUMENT EXOTIC ANIMALS (4/18)",
    reportSummary: "BESTIARY REPORTED 4/18",
    ongoingDialogue:
      "4 of 18 creatures now have a place in my book. Keep watch whenever you make landfall.",
    completionLedgerLabel: "Completed the great bestiary",
    completionDialogue:
      "At last, the book is complete: not a cabinet of travelers' fables, but a bestiary " +
      "founded upon witnesses. Your name shall stand beside mine on its first page.",
    framesCompletion: true
  });
  assert.throws(
    () => naturalistQuestPresentation(view, "preview"),
    /Unknown naturalist presentation edition/
  );
});

test("a regional catalog completes without completing the global bestiary", () => {
  const quest = createNaturalistQuestMemory();
  quest.portCityId = "lisbon|portugal";
  quest.portTileId = 10;
  meetNaturalist(quest);
  const animals = createAnimalEncounterMemory();
  recordAnimalEncounter(animals, "tiger");
  recordAnimalEncounter(animals, "panda");
  reportAnimalsToNaturalist(quest, animals);

  const regional = naturalistQuestView(quest, animals, {
    catalogAnimalIds: ["tiger", "panda"]
  });
  assert.equal(regional.reportedCount, 2);
  assert.equal(regional.totalCount, 2);
  assert.equal(regional.complete, true);
  assert.equal(regional.completionRewarded, false);
  assert.equal(naturalistQuestView(quest, animals).complete, false);
});

test("animal reports pay once and the completed bestiary grants its bonus", () => {
  const quest = createNaturalistQuestMemory();
  quest.portCityId = "lisbon|portugal";
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

function naturalistCharacterFixture() {
  return {
    id: "portrait-naturalist-a-character",
    name: "A Naturalist",
    givenName: "A",
    familyName: "Naturalist",
    sourceId: "portrait-naturalist-a",
    sex: "female",
    age: 40,
    birthDate: { year: 1481, month: 1, day: 1 },
    birthDateLabel: "1 January 1481",
    religionId: "roman-catholic",
    expressions: [{ id: "neutral", src: "assets/characters/naturalist.png", width: 64, height: 64 }],
    skillIds: ["natural-philosopher"],
    role: "natural-philosopher",
    homePortCityId: "lisbon|portugal",
    homePortTileId: 10
  };
}
