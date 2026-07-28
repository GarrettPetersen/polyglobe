import assert from "node:assert/strict";
import test from "node:test";

import {
  ANIMAL_COMPANION_ABOARD,
  ANIMAL_COMPANION_BY_ID,
  ANIMAL_COMPANION_DECLINED,
  ANIMAL_COMPANION_PENDING,
  ANIMAL_COMPANION_WITH_NATURALIST,
  ANIMAL_NATURALIST_OFFER_DECLINED,
  aboardAnimalCompanionIds,
  acceptAnimalCompanion,
  animalCompanionCharacter,
  animalCompanionConsumption,
  animalNaturalistOfferIsAvailable,
  beginAnimalCompanionRecruitment,
  createAnimalCompanionMemory,
  declineAnimalCompanion,
  declineAnimalNaturalistOffer,
  firstAnimalCompanionNpcReaction,
  migrateAnimalCompanionMemory,
  pendingAnimalCompanionIntroduction,
  placeAnimalWithNaturalist,
  recordAnimalCompanionIntroduction,
  recordAnimalCompanionNpcReaction,
  validateAnimalCompanionMemory
} from "./animalCompanions.js";

test("animal companion recruitment persists independent accept and decline decisions", () => {
  const memory = createAnimalCompanionMemory();
  beginAnimalCompanionRecruitment(memory, "panda");
  assert.equal(memory.byId.panda.status, ANIMAL_COMPANION_PENDING);
  acceptAnimalCompanion(memory, "panda", 123.9);
  assert.equal(memory.byId.panda.status, ANIMAL_COMPANION_ABOARD);
  assert.equal(memory.byId.panda.joinedMinute, 123);

  beginAnimalCompanionRecruitment(memory, "penguin");
  declineAnimalCompanion(memory, "penguin");
  assert.equal(memory.byId.penguin.status, ANIMAL_COMPANION_DECLINED);
  beginAnimalCompanionRecruitment(memory, "raccoon");
  acceptAnimalCompanion(memory, "raccoon", 124);
  assert.deepEqual(aboardAnimalCompanionIds(memory), ["panda", "raccoon"]);
});

test("companion consumption distinguishes ordinary and fish-only diets", () => {
  const memory = createAnimalCompanionMemory();
  for (const id of ["panda", "raccoon", "penguin"]) {
    beginAnimalCompanionRecruitment(memory, id);
    acceptAnimalCompanion(memory, id, 20);
  }
  assert.deepEqual(animalCompanionConsumption(memory), {
    companionIds: ["panda", "raccoon", "penguin"],
    foodConsumers: 4,
    waterConsumers: 3,
    restrictedFood: [{
      companionId: "penguin",
      goodId: "fish",
      rationsPerDay: 2
    }]
  });
});

test("animal companions have biography-ready useless identities and expression portraits", () => {
  const panda = animalCompanionCharacter("panda");
  const raccoon = animalCompanionCharacter("raccoon");
  const penguin = animalCompanionCharacter("penguin");
  assert.equal(panda.homePortName, "Sichuan");
  assert.equal(raccoon.homePortName, "Eastern Woodlands");
  assert.equal(penguin.homePortName, "Southern Ice");
  assert.deepEqual(raccoon.skillIds, ["raccoon-passenger"]);
  assert.match(raccoon.goal.text, /barrel|biscuit/i);
  assert.ok(raccoon.expressions.some((entry) => entry.id === "mischievous"));
  assert.deepEqual(penguin.skillIds, ["penguin-passenger"]);
  assert.match(penguin.goal.text, /fish/i);
  assert.ok(penguin.expressions.some((entry) => entry.id === "surprised"));
  assert.ok(penguin.expressions.some((entry) => entry.id === "sad"));
});

test("NPC reactions are species-specific and never repeat for one interaction", () => {
  const memory = createAnimalCompanionMemory();
  beginAnimalCompanionRecruitment(memory, "penguin");
  acceptAnimalCompanion(memory, "penguin", 10);
  const reaction = firstAnimalCompanionNpcReaction(
    memory,
    "port:1",
    { name: "Joao", nameCulture: "portuguese" }
  );
  assert.equal(reaction.companionId, "penguin");
  assert.match(reaction.npcText, /bird|officer|questions/i);
  recordAnimalCompanionNpcReaction(memory, "penguin", reaction.key);
  assert.equal(firstAnimalCompanionNpcReaction(
    memory,
    "port:1",
    { name: "Joao", nameCulture: "portuguese" }
  ), null);
  validateAnimalCompanionMemory(memory);
});

test("naturalist offers are resolved independently for every companion", () => {
  const memory = createAnimalCompanionMemory();
  for (const id of ["panda", "raccoon", "penguin"]) {
    beginAnimalCompanionRecruitment(memory, id);
    acceptAnimalCompanion(memory, id, 10);
  }
  declineAnimalNaturalistOffer(memory, "panda");
  assert.equal(memory.byId.panda.naturalistOffer, ANIMAL_NATURALIST_OFFER_DECLINED);
  assert.equal(animalNaturalistOfferIsAvailable(memory, "panda"), false);
  assert.equal(animalNaturalistOfferIsAvailable(memory, "penguin"), true);
  assert.equal(animalNaturalistOfferIsAvailable(memory, "raccoon"), true);
  assert.equal(ANIMAL_COMPANION_BY_ID.get("raccoon").naturalistPayment, 1000);
  placeAnimalWithNaturalist(memory, "raccoon");
  assert.equal(memory.byId.raccoon.status, ANIMAL_COMPANION_WITH_NATURALIST);
  assert.deepEqual(aboardAnimalCompanionIds(memory), ["panda", "penguin"]);
});

test("every pair of animal companions has a one-time introduction", () => {
  for (const ids of [
    ["panda", "penguin"],
    ["panda", "raccoon"],
    ["penguin", "raccoon"]
  ]) {
    const memory = createAnimalCompanionMemory();
    for (const id of ids) {
      beginAnimalCompanionRecruitment(memory, id);
      acceptAnimalCompanion(memory, id, 10);
    }
    const introduction = pendingAnimalCompanionIntroduction(memory);
    assert.equal(introduction.key, ids.join("|"));
    assert.deepEqual(
      new Set(introduction.steps.flatMap((entry) => [
        entry.companionId,
        entry.listenerCompanionId
      ])),
      new Set(ids)
    );
    recordAnimalCompanionIntroduction(memory, introduction.key);
    assert.equal(pendingAnimalCompanionIntroduction(memory), null);
  }
});

test("all three companions share a group exchange instead of replaying pair scenes", () => {
  const memory = createAnimalCompanionMemory();
  for (const id of ["panda", "raccoon", "penguin"]) {
    beginAnimalCompanionRecruitment(memory, id);
    acceptAnimalCompanion(memory, id, 10);
  }
  const introduction = pendingAnimalCompanionIntroduction(memory);
  assert.equal(introduction.key, "panda|penguin|raccoon");
  assert.deepEqual(
    new Set(introduction.steps.flatMap((entry) => [
      entry.companionId,
      entry.listenerCompanionId
    ])),
    new Set(["panda", "penguin", "raccoon"])
  );
  recordAnimalCompanionIntroduction(memory, introduction.key);
  assert.equal(pendingAnimalCompanionIntroduction(memory), null);
});

test("legacy panda memories migrate into the companion table", () => {
  const migrated = migrateAnimalCompanionMemory(null, {
    legacyPanda: {
      version: 1,
      status: ANIMAL_COMPANION_ABOARD,
      joinedMinute: 12,
      npcReactionKeys: []
    }
  });
  assert.equal(migrated.byId.panda.status, ANIMAL_COMPANION_ABOARD);
  assert.equal(animalNaturalistOfferIsAvailable(migrated, "panda"), true);
  assert.equal(migrated.byId.penguin.status, "unmet");
  assert.equal(migrated.byId.raccoon.status, "unmet");
});
