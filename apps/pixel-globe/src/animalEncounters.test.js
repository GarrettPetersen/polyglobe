import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildGeodesicGraph } from "./geodesic.js";
import {
  ANIMAL_COMPANION_ENCOUNTER_WEIGHT,
  ANIMAL_CATALOG,
  ANIMAL_CATALOG_BY_ID,
  animalLandmassWorldFraction,
  buildAnimalLandmassWorldFractions,
  createAnimalEncounterMemory,
  eligibleAnimalEncounters,
  encounteredAnimalEntries,
  recordAnimalEncounter,
  rollAnchoredAnimalEncounter
} from "./animalEncounters.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import {
  AUTHORED_ANIMAL_REPORT_IDS,
  naturalistJournalDescriptionForAnimal,
  naturalistReportDialogueForAnimal,
  validateNaturalistReportDialogueCatalog
} from "./naturalistAnimalDialogue.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";
import { buildWorldNavigationTopology } from "./worldNavigationTopology.js";

function habitat(overrides = {}) {
  return {
    latitudeDeg: 30,
    longitudeDeg: 105,
    terrain: "forest",
    isSurfaceIce: false,
    isRiver: false,
    isLake: false,
    isCoast: true,
    landmassWorldFraction: 0.1,
    ...overrides
  };
}

const REVIEWED_STATIC_PORTRAIT_HASHES = Object.freeze({
  tiger: "4717df76720e88f24092fa3a65ee40588670f65a1abbb7bdc3b85b73f070c0e6",
  "brown-bear": "77731f8b102a978b685b1f4ec18c5dbc72b074bbbb4be71a5c3f99add5411779",
  elephant: "59c9e17784eef9d25ee25d6aac8240c7a77fba6b6ca1567b19a8c8f8da77fb7a",
  rhinoceros: "b9871bb6d1e18741ac16f97122096136d03068c72b27a23c085e17e304f21797",
  otter: "7d09cb6d9267a01ee053d87db5229b121a9e3cec8fb8b8964819e9abfc50ed35",
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

const repoRoot = new URL("../../../", import.meta.url);
let worldHabitatFixture = null;

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

test("meeting the wild dog offers an explicit pet-the-dog choice", () => {
  const choice = ANIMAL_CATALOG_BY_ID.get("wild-dog").encounterChoice;
  assert.match(choice.prompt, /pet it/i);
  assert.deepEqual(choice.options.map(({ id, label }) => ({ id, label })), [
    { id: "pet", label: "PET IT" },
    { id: "leave", label: "DON'T PET IT" }
  ]);
  assert.match(choice.options[0].steps.at(-1).message, /all ten fingers/i);
  assert.match(choice.options[1].steps[0].message, /admire the dog from here/i);
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

test("islands inside broad continental rectangles do not inherit mainland fauna", () => {
  const candidates = (overrides) => eligibleAnimalEncounters(
    createAnimalEncounterMemory(),
    habitat({ landmassWorldFraction: 0.001, ...overrides })
  ).map((entry) => entry.id);

  const madagascar = candidates({
    latitudeDeg: -19,
    longitudeDeg: 47,
    terrain: "grass"
  });
  for (const mainlandAfricanAnimal of [
    "elephant", "rhinoceros", "giraffe", "lion", "wild-dog", "fox", "otter"
  ]) {
    assert.ok(!madagascar.includes(mainlandAfricanAnimal), mainlandAfricanAnimal);
  }

  const hawaii = candidates({
    latitudeDeg: 20,
    longitudeDeg: -156,
    terrain: "jungle"
  });
  assert.deepEqual(hawaii, []);

  const sriLanka = candidates({
    latitudeDeg: 7.8,
    longitudeDeg: 80.7,
    terrain: "forest"
  });
  assert.ok(sriLanka.includes("elephant"));
  for (const absentAnimal of ["tiger", "rhinoceros", "lion"]) {
    assert.ok(!sriLanka.includes(absentAnimal), absentAnimal);
  }

  const sumatra = candidates({
    latitudeDeg: 0,
    longitudeDeg: 101,
    terrain: "jungle"
  });
  for (const nativeAnimal of ["tiger", "elephant", "rhinoceros", "parrot", "eagle"]) {
    assert.ok(sumatra.includes(nativeAnimal), nativeAnimal);
  }

  const tasmania = candidates({
    latitudeDeg: -42,
    longitudeDeg: 147,
    terrain: "grass"
  });
  assert.ok(tasmania.includes("kangaroo"));
  assert.ok(!tasmania.includes("fox"));
});

test("pandas are encounterable from the actual Chengdu and Xian river ports", () => {
  const { graph, rows, landmassWorldFractions } = actualWorldHabitatFixture();
  const panda = ANIMAL_CATALOG_BY_ID.get("panda");

  for (const [name, tileId] of [["Chengdu", 61297], ["Xian", 62627]]) {
    assert.equal(panda.matches(habitat({
      latitudeDeg: graph.latDeg[tileId],
      longitudeDeg: graph.lonDeg[tileId],
      terrain: rows[tileId].t,
      isRiver: true,
      landmassWorldFraction: animalLandmassWorldFraction(rows[tileId], landmassWorldFractions)
    })), true, `${name} (${rows[tileId].t})`);
  }
});

test("every bestiary animal has an anchor-accessible habitat in the actual world bake", () => {
  const { graph, rows, topology, landmassWorldFractions } = actualWorldHabitatFixture();
  for (const animal of ANIMAL_CATALOG) {
    let matchingTileId = null;
    for (let tileId = 0; tileId < graph.tileCount; tileId++) {
      const row = rows[tileId];
      if (isWaterSurfaceRow(row)) continue;
      const anchorAccessible = Boolean(topology.reachableNavigationMask[tileId]) ||
        graph.neighbors[tileId].some((neighborId) => topology.reachableNavigationMask[neighborId]);
      if (!anchorAccessible) continue;
      if (!animal.matches(habitat({
        latitudeDeg: graph.latDeg[tileId],
        longitudeDeg: graph.lonDeg[tileId],
        terrain: row.t,
        isSurfaceIce: row.t === "ice" || row.t === "ice_cap",
        isRiver: Boolean(topology.riverMasks[tileId]),
        isLake: row.t === "lake",
        landmassWorldFraction: animalLandmassWorldFraction(row, landmassWorldFractions)
      }))) continue;
      matchingTileId = tileId;
      break;
    }
    assert.notEqual(matchingTileId, null, animal.id);
  }
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

test("brown bears include the Atlas Mountains but not coastal Tripoli", () => {
  const brownBear = ANIMAL_CATALOG_BY_ID.get("brown-bear");
  assert.equal(brownBear.matches(habitat({
    latitudeDeg: 34.1,
    longitudeDeg: -5.0,
    terrain: "mountain"
  })), true);
  assert.equal(brownBear.matches(habitat({
    latitudeDeg: 32.9,
    longitudeDeg: 13.2,
    terrain: "rock"
  })), false);
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

function actualWorldHabitatFixture() {
  if (worldHabitatFixture) return worldHabitatFixture;
  const earth = JSON.parse(readFileSync(
    new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot),
    "utf8"
  ));
  const graph = buildGeodesicGraph(7);
  const rows = applyManualTerrainOverrides(earth.tiles, 7);
  const topology = buildWorldNavigationTopology({
    graph,
    earthRows: rows,
    earthCache: earth,
    subdivisions: 7
  });
  const landmassWorldFractions = buildAnimalLandmassWorldFractions(rows);
  worldHabitatFixture = { graph, rows, topology, landmassWorldFractions };
  return worldHabitatFixture;
}
