import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ANIMAL_CATALOG,
  ANIMAL_CATALOG_BY_ID,
  createAnimalEncounterMemory,
  eligibleAnimalEncounters,
  encounteredAnimalEntries,
  recordAnimalEncounter,
  rollAnchoredAnimalEncounter
} from "./animalEncounters.js";

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
  assert.equal(ANIMAL_CATALOG_BY_ID.get("raccoon").reaction.expressionId, "mischievous");
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
