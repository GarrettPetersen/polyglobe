import assert from "node:assert/strict";
import test from "node:test";

import {
  birthdayCharactersForAboardEntries,
  birthdayObservationNeeded,
  consumeBirthdayDialogueLine,
  createBirthdayMemory,
  observeAboardBirthdays,
  pendingBirthdayDialogueLine,
  validateBirthdayMemory
} from "./birthdayEvents.js";
import { characterWithBiography } from "./characterBiography.js";

function character(id, name, month, day, religionId = null) {
  const birthdayPassedAtVoyageStart = month < 3 || (month === 3 && day <= 21);
  return characterWithBiography({
    id,
    name,
    givenName: name.split(" ")[0],
    sex: id === "captain" ? "female" : "male",
    age: birthdayPassedAtVoyageStart ? 31 : 30,
    nameCulture: "maritime",
    religionId,
    birthDate: { year: 1491, month, day }
  });
}

test("an observed local date skips aboard-character work", () => {
  const memory = createBirthdayMemory();
  const date = { year: 1522, month: 7, day: 24 };

  assert.equal(birthdayObservationNeeded(memory, date), true);
  assert.equal(observeAboardBirthdays(memory, [], date), true);
  assert.equal(birthdayObservationNeeded(memory, date), false);
  assert.equal(observeAboardBirthdays(memory, null, date), false);
});

test("a birthday queues one exchange and is not repeated when the date is observed again", () => {
  const memory = createBirthdayMemory();
  const aboard = [character("captain", "Ana Costa", 7, 10), character("mate", "Leif North", 2, 2)];
  const date = { year: 1522, month: 7, day: 10 };
  assert.equal(observeAboardBirthdays(memory, aboard, date), true);
  assert.equal(observeAboardBirthdays(memory, aboard, date), false);

  const first = pendingBirthdayDialogueLine(memory, aboard);
  assert.equal(first.character.id, "mate");
  assert.equal(first.leftCharacter.id, "mate");
  assert.equal(first.rightCharacter.id, "captain");
  assert.match(first.message, /birthday/i);
  consumeBirthdayDialogueLine(memory);
  const reply = pendingBirthdayDialogueLine(memory, aboard);
  assert.equal(reply.character.id, "captain");
  assert.equal(reply.leftCharacter.id, "mate");
  assert.equal(reply.rightCharacter.id, "captain");
  consumeBirthdayDialogueLine(memory);
  assert.equal(pendingBirthdayDialogueLine(memory, aboard), null);
  assert.equal(memory.celebratedEventIds.length, 1);
  validateBirthdayMemory(memory);
});

test("shared birthdays create one event in which every celebrant comments", () => {
  const memory = createBirthdayMemory();
  const aboard = [
    character("captain", "Ana Costa", 7, 10),
    character("mate", "Leif North", 7, 10),
    character("chef", "Marta Bell", 4, 3)
  ];
  observeAboardBirthdays(memory, aboard, { year: 1522, month: 7, day: 10 });
  const lines = [];
  for (let line = pendingBirthdayDialogueLine(memory, aboard); line; line = pendingBirthdayDialogueLine(memory, aboard)) {
    lines.push({
      speaker: line.character.id,
      left: line.leftCharacter.id,
      right: line.rightCharacter.id
    });
    consumeBirthdayDialogueLine(memory);
  }
  assert.deepEqual(lines, [
    { speaker: "chef", left: "chef", right: "captain" },
    { speaker: "captain", left: "chef", right: "captain" },
    { speaker: "mate", left: "chef", right: "mate" }
  ]);
  assert.equal(memory.celebratedEventIds.length, 1);
});

test("any number of same-day birthdays gives every celebrant a line", () => {
  const memory = createBirthdayMemory();
  const aboard = [
    character("captain", "Ana Costa", 7, 10),
    character("mate", "Leif North", 7, 10),
    character("chef", "Marta Bell", 7, 10),
    character("gunner", "Hugo Reed", 7, 10),
    character("pilot", "Tomas Vale", 7, 10)
  ];
  observeAboardBirthdays(memory, aboard, { year: 1522, month: 7, day: 10 });
  const speakers = [];
  for (let line = pendingBirthdayDialogueLine(memory, aboard); line; line = pendingBirthdayDialogueLine(memory, aboard)) {
    speakers.push(line.character.id);
    consumeBirthdayDialogueLine(memory);
  }
  assert.deepEqual(new Set(speakers), new Set(aboard.map(({ id }) => id)));
  assert.equal(speakers.length, aboard.length);
});

test("birthday identity follows the person aboard rather than reused portrait art", () => {
  const first = character("shared-portrait", "Anna Voss", 7, 10);
  const second = character("shared-portrait", "Beatriz Mora", 7, 10);
  const aboard = birthdayCharactersForAboardEntries([
    { id: "crew:shared-portrait", character: first },
    { id: "traveler:captive:shared-portrait", character: second }
  ]);
  const memory = createBirthdayMemory();

  assert.doesNotThrow(() => observeAboardBirthdays(
    memory,
    aboard,
    { year: 1522, month: 7, day: 10 }
  ));
  assert.equal(memory.pendingEvents[0].celebrantIds.length, 2);
});

test("a shared birthday without a separate wisher still stages two celebrants face to face", () => {
  const memory = createBirthdayMemory();
  const aboard = [
    character("captain", "Ana Costa", 7, 10),
    character("mate", "Leif North", 7, 10)
  ];
  observeAboardBirthdays(memory, aboard, { year: 1522, month: 7, day: 10 });

  const first = pendingBirthdayDialogueLine(memory, aboard);
  assert.equal(first.character.id, "captain");
  assert.equal(first.leftCharacter.id, "captain");
  assert.equal(first.rightCharacter.id, "mate");
  consumeBirthdayDialogueLine(memory);

  const second = pendingBirthdayDialogueLine(memory, aboard);
  assert.equal(second.character.id, "mate");
  assert.equal(second.leftCharacter.id, "captain");
  assert.equal(second.rightCharacter.id, "mate");
});

test("the captain alone does not throw a birthday party for themself", () => {
  const memory = createBirthdayMemory();
  const aboard = [character("captain", "Ana Costa", 7, 10)];
  observeAboardBirthdays(memory, aboard, { year: 1522, month: 7, day: 10 });
  assert.equal(pendingBirthdayDialogueLine(memory, aboard), null);
});

test("aboard birthday exchanges occasionally acknowledge differing faiths", () => {
  const aboard = [
    character("captain", "Ana Costa", 2, 2, "roman-catholic"),
    character("mate", "Marta Rao", 7, 10, "hinduism")
  ];
  let religiousWish = null;
  for (let year = 1522; year < 1560 && !religiousWish; year += 1) {
    const memory = createBirthdayMemory();
    observeAboardBirthdays(memory, aboard, { year, month: 7, day: 10 });
    const line = pendingBirthdayDialogueLine(memory, aboard);
    if (/Our prayers differ/.test(line?.message || "")) religiousWish = line;
  }
  assert.ok(religiousWish);
  assert.equal(religiousWish.character.id, "captain");
});
