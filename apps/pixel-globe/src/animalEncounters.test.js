import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ANIMAL_COMPANION_ENCOUNTER_WEIGHT,
  ANIMAL_CATALOG,
  ANIMAL_CATALOG_BY_ID,
  createAnimalEncounterMemory,
  eligibleAnimalEncounters,
  encounteredAnimalEntries,
  recordAnimalEncounter,
  rollAnchoredAnimalEncounter
} from "./animalEncounters.js";
import {
  AUTHORED_ANIMAL_REPORT_IDS,
  naturalistJournalDescriptionForAnimal,
  naturalistReportDialogueForAnimal,
  validateNaturalistReportDialogueCatalog
} from "./naturalistAnimalDialogue.js";

function habitat(overrides = {}) {
  return {
    latitudeDeg: 30,
    longitudeDeg: 105,
    terrain: "forest",
    isSurfaceIce: false,
    isRiver: false,
    isLake: false,
    isCoast: true,
    ...overrides
  };
}

const REVIEWED_STATIC_PORTRAIT_HASHES = Object.freeze({
  tiger: "4717df76720e88f24092fa3a65ee40588670f65a1abbb7bdc3b85b73f070c0e6",
  "brown-bear": "77731f8b102a978b685b1f4ec18c5dbc72b074bbbb4be71a5c3f99add5411779",
  elephant: "59c9e17784eef9d25ee25d6aac8240c7a77fba6b6ca1567b19a8c8f8da77fb7a",
  rhinoceros: "b9871bb6d1e18741ac16f97122096136d03068c72b27a23c085e17e304f21797",
  otter: "138e3e02d84593a9c5d178de1d923a9a0db04dcafc9984ea684a2df224d19806",
  chipmunk: "11440df1841c3597b0195f87133665ff27afeb85e53d6fda8ed4cdb02df5d23e",
  giraffe: "1f2d5973690adfb9d87506b6305e233afde5f7d1aaa26ca5f6b4d8ce842fd3e6",
  fox: "f6aeb58d4b612ee6db15c49e587b896875315d1dd01e89fcde0fb8ade993b25d",
  kangaroo: "32b6b7ddc81f36d259821aa474a9989e0944e8f381cd6f0af23d18d2d8fb37fb",
  parrot: "947ff209962cbc52e83e0edcac62de6bc22282d255065723bf3945b6ab29304b",
  lion: "f1d7a35de78e959764dcb16cda1915d73f5740a713b9cef289e3e9141344c340",
  eagle: "f0e74b5ec43261891362b5a7b56258f2c90d5f1190de8d49e96039951fea931f",
  moose: "dd27663182536965c6e0880e5010b6065cd9d51b0cf6901ae650e4f663c82756",
  "wild-dog": "97ee8445bd6d075539724f0c5ae8a0a48b31d99b8418a8f6a0ead6eb74db309d",
  sloth: "391c5d7c103af38fd3495d003df009d3c6a2301116d556ed948adc0c6bfe4963"
});

const REVIEWED_COMPANION_EXPRESSIONS = Object.freeze({
  panda: Object.freeze({ neutral: 14, happy: 5, surprised: 4, sad: 1, angry: 15, amused: 10 }),
  raccoon: Object.freeze({
    neutral: 4,
    happy: 5,
    surprised: 13,
    sad: 1,
    angry: 9,
    amused: 10,
    mischievous: 15
  }),
  penguin: Object.freeze({
    neutral: 8,
    happy: 2,
    surprised: 4,
    sad: 5,
    angry: 3,
    amused: 15,
    confused: 14
  })
});

test("animal catalog is unique and every portrait is expression-ready", () => {
  assert.equal(ANIMAL_CATALOG.length, 18);
  assert.equal(new Set(ANIMAL_CATALOG.map((entry) => entry.id)).size, ANIMAL_CATALOG.length);
  for (const entry of ANIMAL_CATALOG) {
    assert.ok(entry.expressions.some((expression) => expression.id === "neutral"), entry.id);
    assert.equal(typeof entry.matches, "function");
    for (const expression of entry.expressions) {
      const bytes = readFileSync(new URL(`../public/${expression.src}`, import.meta.url));
      assert.equal(bytes.readUInt32BE(16), 64, expression.src);
      assert.equal(bytes.readUInt32BE(20), 64, expression.src);
    }
  }
  assert.equal(ANIMAL_CATALOG_BY_ID.get("panda").reaction.expressionId, "happy");
  assert.equal(ANIMAL_CATALOG_BY_ID.get("penguin").reaction.expressionId, "amused");
  assert.ok(ANIMAL_CATALOG_BY_ID.get("penguin").expressions.some(({ id }) => id === "sad"));
  assert.equal(ANIMAL_CATALOG_BY_ID.get("raccoon").reaction.expressionId, "mischievous");
  for (const companionId of ["panda", "penguin", "raccoon"]) {
    assert.equal(
      ANIMAL_CATALOG_BY_ID.get(companionId).encounterWeight,
      ANIMAL_COMPANION_ENCOUNTER_WEIGHT
    );
  }
});

test("animal portraits remain on the visually reviewed species and expression frames", () => {
  assert.deepEqual(
    Object.keys(REVIEWED_STATIC_PORTRAIT_HASHES).sort(),
    ANIMAL_CATALOG.filter(({ expressions }) => expressions.length === 1).map(({ id }) => id).sort()
  );
  for (const [animalId, expectedHash] of Object.entries(REVIEWED_STATIC_PORTRAIT_HASHES)) {
    const [{ src }] = ANIMAL_CATALOG_BY_ID.get(animalId).expressions;
    const bytes = readFileSync(new URL(`../public/${src}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expectedHash, animalId);
  }

  for (const [animalId, expectedFrames] of Object.entries(REVIEWED_COMPANION_EXPRESSIONS)) {
    const actual = Object.fromEntries(ANIMAL_CATALOG_BY_ID.get(animalId).expressions.map(({ id, src }) => [
      id,
      Number.parseInt(src.match(/-(\d+)\.png$/)?.[1] ?? "", 10)
    ]));
    assert.deepEqual(actual, expectedFrames, animalId);
  }
});

test("every animal has unique naturalist dialogue reusable as its journal entry", () => {
  assert.equal(validateNaturalistReportDialogueCatalog(ANIMAL_CATALOG), ANIMAL_CATALOG.length);
  assert.deepEqual(
    [...AUTHORED_ANIMAL_REPORT_IDS].sort(),
    ANIMAL_CATALOG.map(({ id }) => id).sort()
  );
  for (const animal of ANIMAL_CATALOG) {
    const dialogue = naturalistReportDialogueForAnimal(animal);
    assert.equal(naturalistJournalDescriptionForAnimal(animal), dialogue.player);
    assert.match(dialogue.player, /[.!?]$/);
    assert.match(dialogue.naturalist, /[.!?]$/);
  }
});

test("animals occur only in plausible native habitats", () => {
  const memory = createAnimalEncounterMemory();
  const china = eligibleAnimalEncounters(memory, habitat()).map((entry) => entry.id);
  assert.ok(china.includes("panda"));
  assert.ok(china.includes("tiger"));
  assert.ok(!china.includes("kangaroo"));
  assert.ok(!china.includes("penguin"));

  const southernIce = eligibleAnimalEncounters(memory, habitat({
    latitudeDeg: -68,
    longitudeDeg: 20,
    terrain: "ice",
    isSurfaceIce: true
  })).map((entry) => entry.id);
  assert.deepEqual(southernIce, ["penguin"]);
});

test("every catalog animal has geographic and terrain habitat boundaries", () => {
  const nativeHabitats = {
    tiger: { latitudeDeg: 23, longitudeDeg: 80, terrain: "forest" },
    "brown-bear": { latitudeDeg: 60, longitudeDeg: 20, terrain: "forest" },
    elephant: { latitudeDeg: -5, longitudeDeg: 35, terrain: "grass" },
    rhinoceros: { latitudeDeg: -5, longitudeDeg: 35, terrain: "grass" },
    otter: { latitudeDeg: 50, longitudeDeg: 10, terrain: "wet", isRiver: true, isCoast: false },
    chipmunk: { latitudeDeg: 45, longitudeDeg: -80, terrain: "forest" },
    giraffe: { latitudeDeg: -5, longitudeDeg: 35, terrain: "grass" },
    fox: { latitudeDeg: 50, longitudeDeg: 10, terrain: "grass" },
    kangaroo: { latitudeDeg: -30, longitudeDeg: 135, terrain: "grass" },
    parrot: { latitudeDeg: -5, longitudeDeg: -60, terrain: "jungle" },
    lion: { latitudeDeg: 33, longitudeDeg: 44, terrain: "grass" },
    eagle: { latitudeDeg: -20, longitudeDeg: -70, terrain: "mountain" },
    moose: { latitudeDeg: 55, longitudeDeg: -100, terrain: "forest" },
    "wild-dog": { latitudeDeg: -20, longitudeDeg: 25, terrain: "grass" },
    sloth: { latitudeDeg: -5, longitudeDeg: -60, terrain: "jungle" },
    panda: { latitudeDeg: 30, longitudeDeg: 105, terrain: "forest" },
    raccoon: { latitudeDeg: 40, longitudeDeg: -80, terrain: "forest" },
    penguin: {
      latitudeDeg: -68,
      longitudeDeg: 20,
      terrain: "ice",
      isSurfaceIce: true
    }
  };
  assert.deepEqual(Object.keys(nativeHabitats).sort(), ANIMAL_CATALOG.map(({ id }) => id).sort());
  for (const [animalId, overrides] of Object.entries(nativeHabitats)) {
    assert.equal(ANIMAL_CATALOG_BY_ID.get(animalId).matches(habitat(overrides)), true, animalId);
  }

  const excludedHabitats = {
    tiger: { latitudeDeg: 36, longitudeDeg: 138, terrain: "forest" },
    "brown-bear": { latitudeDeg: -20, longitudeDeg: 20, terrain: "forest" },
    elephant: { latitudeDeg: 36, longitudeDeg: 138, terrain: "forest" },
    rhinoceros: { latitudeDeg: 50, longitudeDeg: 10, terrain: "grass" },
    otter: {
      latitudeDeg: 60,
      longitudeDeg: 10,
      terrain: "ice",
      isSurfaceIce: true,
      isRiver: true
    },
    chipmunk: { latitudeDeg: 45, longitudeDeg: 10, terrain: "forest" },
    giraffe: { latitudeDeg: 20, longitudeDeg: 75, terrain: "grass" },
    fox: { latitudeDeg: -35, longitudeDeg: 140, terrain: "grass" },
    kangaroo: { latitudeDeg: -30, longitudeDeg: 25, terrain: "grass" },
    parrot: { latitudeDeg: 50, longitudeDeg: 10, terrain: "forest" },
    lion: { latitudeDeg: 30, longitudeDeg: 105, terrain: "grass" },
    eagle: {
      latitudeDeg: -70,
      longitudeDeg: 20,
      terrain: "mountain",
      isSurfaceIce: true
    },
    moose: { latitudeDeg: 65, longitudeDeg: -20, terrain: "forest" },
    "wild-dog": { latitudeDeg: -20, longitudeDeg: 135, terrain: "grass" },
    sloth: { latitudeDeg: -5, longitudeDeg: 20, terrain: "jungle" },
    panda: { latitudeDeg: 30, longitudeDeg: 10, terrain: "forest" },
    raccoon: { latitudeDeg: 40, longitudeDeg: 10, terrain: "forest" },
    penguin: {
      latitudeDeg: 70,
      longitudeDeg: -50,
      terrain: "ice",
      isSurfaceIce: true
    }
  };
  for (const [animalId, overrides] of Object.entries(excludedHabitats)) {
    assert.equal(ANIMAL_CATALOG_BY_ID.get(animalId).matches(habitat(overrides)), false, animalId);
  }
});

test("penguins include native temperate Southern Hemisphere coasts", () => {
  const penguin = ANIMAL_CATALOG_BY_ID.get("penguin");
  for (const overrides of [
    { latitudeDeg: -1, longitudeDeg: -90, terrain: "rock" },
    { latitudeDeg: -34, longitudeDeg: 18, terrain: "rock" },
    { latitudeDeg: -38, longitudeDeg: 145, terrain: "grass" },
    { latitudeDeg: -42, longitudeDeg: 174, terrain: "forest" }
  ]) {
    assert.equal(penguin.matches(habitat(overrides)), true, JSON.stringify(overrides));
  }
});

test("an animal can be encountered only once per voyage", () => {
  const memory = createAnimalEncounterMemory();
  assert.equal(recordAnimalEncounter(memory, "panda"), true);
  assert.equal(recordAnimalEncounter(memory, "panda"), false);
  assert.deepEqual(encounteredAnimalEntries(memory).map((entry) => entry.id), ["panda"]);
  assert.ok(!eligibleAnimalEncounters(memory, habitat()).some((entry) => entry.id === "panda"));
});

test("anchored encounter rolls are sparse and time-gated", () => {
  const memory = createAnimalEncounterMemory();
  const values = [0, 0];
  const result = rollAnchoredAnimalEncounter(memory, habitat(), 100, () => values.shift());
  assert.ok(result);
  assert.equal(rollAnchoredAnimalEncounter(memory, habitat(), 101, () => 0), null);
  assert.ok(memory.nextRollMinute > 101);
});

test("dropping anchor always gets an immediate roll before timed repeats", () => {
  const memory = createAnimalEncounterMemory();
  assert.equal(rollAnchoredAnimalEncounter(memory, habitat(), 100, () => 0.5), null);
  const values = [0.1, 0.99];
  assert.equal(
    rollAnchoredAnimalEncounter(memory, habitat(), 101, () => values.shift(), 1, true)?.id,
    "panda"
  );
  assert.equal(rollAnchoredAnimalEncounter(memory, habitat(), 102, () => 0), null);
});

test("native animal companions receive extra selection weight", () => {
  const memory = createAnimalEncounterMemory();
  const values = [0, 0.75];
  assert.equal(
    rollAnchoredAnimalEncounter(memory, habitat(), 100, () => values.shift())?.id,
    "panda"
  );
});

test("natural-history skill multipliers improve encounter odds", () => {
  const ordinaryMemory = createAnimalEncounterMemory();
  const skilledMemory = createAnimalEncounterMemory();
  const ordinaryRolls = [0.04];
  const skilledRolls = [0.04, 0];
  assert.equal(
    rollAnchoredAnimalEncounter(ordinaryMemory, habitat(), 100, () => ordinaryRolls.shift()),
    null
  );
  assert.ok(
    rollAnchoredAnimalEncounter(skilledMemory, habitat(), 100, () => skilledRolls.shift(), 1.5)
  );
});
