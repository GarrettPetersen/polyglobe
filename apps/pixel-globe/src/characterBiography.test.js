import assert from "node:assert/strict";
import test from "node:test";

import {
  characterAgeAtMinute,
  characterBirthdayLabel,
  characterNationalityLabel,
  characterWithBiography,
  gameCalendarDateAtMinute
} from "./characterBiography.js";

test("biographies preserve the portrait age estimate on the voyage start date", () => {
  const character = characterWithBiography({
    id: "mei",
    name: "Li Mei",
    gender: "female",
    age: 31,
    minAge: 28,
    maxAge: 34,
    nameCulture: "chinese"
  });
  assert.equal(character.sex, "female");
  assert.equal(character.age, 31);
  assert.match(character.birthDateLabel, /^\d{1,2} [A-Z][a-z]+ 14\d\d$/);
  assert.match(characterBirthdayLabel(character), /^\d{2} [A-Z]{3}$/);
  assert.equal(characterNationalityLabel(character), "Chinese");
});

test("animal biography callers can use species-appropriate ages without weakening human defaults", () => {
  assert.throws(() => characterWithBiography({
    id: "young-human",
    name: "Young Human",
    sex: "male",
    age: 4,
    nameCulture: "english"
  }), /invalid portrait age estimate: 4/);

  const raccoon = characterWithBiography({
    id: "companion:raccoon",
    name: "Raccoon",
    sex: "male",
    age: 4,
    nameCulture: "nahua"
  }, {
    minimumAge: 0
  });
  assert.equal(raccoon.age, 4);
  assert.match(raccoon.birthDateLabel, /^\d{1,2} [A-Z][a-z]+ 151\d$/);
});

test("ages advance on the birthday rather than at the turn of the year", () => {
  const character = characterWithBiography({
    id: "ana",
    name: "Ana Costa",
    sex: "female",
    age: 30,
    nameCulture: "portuguese",
    birthDate: { year: 1491, month: 7, day: 10 }
  });
  const minuteBefore = 189 * 1440;
  const minuteOnBirthday = 190 * 1440;
  assert.equal(characterAgeAtMinute(character, minuteBefore), 30);
  assert.equal(characterAgeAtMinute(character, minuteOnBirthday), 31);
});

test("the biography calendar follows the game's fixed 365-day years", () => {
  assert.deepEqual(gameCalendarDateAtMinute(0), { year: 1522, month: 1, day: 1, dayIndex: 0 });
  assert.deepEqual(gameCalendarDateAtMinute(365 * 1440), { year: 1523, month: 1, day: 1, dayIndex: 0 });
});
