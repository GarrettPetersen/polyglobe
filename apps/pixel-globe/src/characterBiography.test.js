import assert from "node:assert/strict";
import test from "node:test";
import { NAME_CULTURE_IDS } from "./nameCultures.js";
import { assertNameCultureId } from "./characterNames.js";

import {
  characterAgeAtMinute,
  characterBirthdayLabel,
  characterCultureLabel,
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

test("culture labels preserve local identity independently of political allegiance", () => {
  assert.equal(characterCultureLabel({ id: "basque-sailor", nameCulture: "basque" }), "Basque");
  assert.throws(
    () => characterCultureLabel({ id: "unmapped-sailor", nameCulture: "unknown" }),
    /has no culture label/
  );
});

test("every generatable culture has a usable biography label, including Ryukyu, Ainu and Iceland", () => {
  for (const nameCulture of NAME_CULTURE_IDS) {
    assertNameCultureId(nameCulture);
    const character = { id: `crew:${nameCulture}`, nameCulture };
    assert.ok(characterCultureLabel(character).length > 0, nameCulture);
    assert.equal(characterNationalityLabel(character), characterCultureLabel(character));
  }
  assert.equal(characterCultureLabel({ id: "ronin", nameCulture: "ryukyuan" }), "Ryukyuan");
  assert.equal(characterCultureLabel({ id: "hunter", nameCulture: "ainu" }), "Ainu");
  assert.equal(characterCultureLabel({ id: "sailor", nameCulture: "icelandic" }), "Icelandic");
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
