import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("a birthday queues one exchange and is not repeated when the date is observed again", () => {
  const memory = createBirthdayMemory();
  const aboard = [character("captain", "Ana Costa", 7, 10), character("mate", "Leif North", 2, 2)];
  const date = { year: 1522, month: 7, day: 10 };
  assert.equal(observeAboardBirthdays(memory, aboard, date), true);
  assert.equal(observeAboardBirthdays(memory, aboard, date), false);

  const first = pendingBirthdayDialogueLine(memory, aboard);
  assert.equal(first.character.id, "mate");
  assert.match(first.message, /birthday/i);
  consumeBirthdayDialogueLine(memory);
  const reply = pendingBirthdayDialogueLine(memory, aboard);
  assert.equal(reply.character.id, "captain");
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
  const speakers = [];
  for (let line = pendingBirthdayDialogueLine(memory, aboard); line; line = pendingBirthdayDialogueLine(memory, aboard)) {
    speakers.push(line.character.id);
    consumeBirthdayDialogueLine(memory);
  }
  assert.deepEqual(speakers, ["chef", "captain", "mate"]);
  assert.equal(memory.celebratedEventIds.length, 1);
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
