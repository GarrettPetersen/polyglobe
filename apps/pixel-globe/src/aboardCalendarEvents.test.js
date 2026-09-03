import assert from "node:assert/strict";
import test from "node:test";

import {
  aboardCalendarCharactersForEntries,
  aboardCalendarObservationNeeded,
  consumeAboardCalendarDialogueLine,
  createAboardCalendarMemory,
  migrateBirthdayMemoryToAboardCalendar,
  observeAboardCalendarEvents,
  pendingAboardCalendarDialogueLine,
  validateAboardCalendarMemory
} from "./aboardCalendarEvents.js";
import { characterWithBiography } from "./characterBiography.js";
import { RELIGIOUS_OBSERVANCE_ID } from "./religiousObservances.js";

function character(id, name, month, day, religionId = "roman-catholic") {
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
  const memory = createAboardCalendarMemory();
  const date = { year: 1522, month: 7, day: 24 };

  assert.equal(aboardCalendarObservationNeeded(memory, date), true);
  assert.equal(observeAboardCalendarEvents(memory, [], date), true);
  assert.equal(aboardCalendarObservationNeeded(memory, date), false);
  assert.equal(observeAboardCalendarEvents(memory, null, date), false);
});

test("a birthday queues one exchange and is not repeated when the date is observed again", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [character("captain", "Ana Costa", 7, 10), character("mate", "Leif North", 2, 2)];
  const date = { year: 1522, month: 7, day: 10 };
  assert.equal(observeAboardCalendarEvents(memory, aboard, date), true);
  assert.equal(observeAboardCalendarEvents(memory, aboard, date), false);

  const first = pendingAboardCalendarDialogueLine(memory, aboard);
  assert.equal(first.eventKind, "birthday");
  assert.equal(first.character.id, "mate");
  assert.equal(first.leftCharacter.id, "mate");
  assert.equal(first.rightCharacter.id, "captain");
  assert.match(first.message, /birthday/i);
  consumeAboardCalendarDialogueLine(memory);
  const reply = pendingAboardCalendarDialogueLine(memory, aboard);
  assert.equal(reply.character.id, "captain");
  assert.equal(reply.leftCharacter.id, "mate");
  assert.equal(reply.rightCharacter.id, "captain");
  consumeAboardCalendarDialogueLine(memory);
  assert.equal(pendingAboardCalendarDialogueLine(memory, aboard), null);
  assert.equal(memory.completedEventIds.length, 1);
  validateAboardCalendarMemory(memory);
});

test("shared birthdays create one event in which every celebrant comments", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Ana Costa", 7, 10),
    character("mate", "Leif North", 7, 10),
    character("chef", "Marta Bell", 4, 3)
  ];
  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 7, day: 10 });
  const lines = drainDialogue(memory, aboard).map((line) => ({
    speaker: line.character.id,
    left: line.leftCharacter.id,
    right: line.rightCharacter.id
  }));
  assert.deepEqual(lines, [
    { speaker: "chef", left: "chef", right: "captain" },
    { speaker: "captain", left: "chef", right: "captain" },
    { speaker: "mate", left: "chef", right: "mate" }
  ]);
  assert.equal(memory.completedEventIds.length, 1);
});

test("any number of same-day birthdays gives every celebrant a line", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Ana Costa", 7, 10),
    character("mate", "Leif North", 7, 10),
    character("chef", "Marta Bell", 7, 10),
    character("gunner", "Hugo Reed", 7, 10),
    character("pilot", "Tomas Vale", 7, 10)
  ];
  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 7, day: 10 });
  const speakers = drainDialogue(memory, aboard).map((line) => line.character.id);
  assert.deepEqual(new Set(speakers), new Set(aboard.map(({ id }) => id)));
  assert.equal(speakers.length, aboard.length);
});

test("calendar identity follows the person aboard rather than reused portrait art", () => {
  const first = character("shared-portrait", "Anna Voss", 7, 10);
  const second = character("shared-portrait", "Beatriz Mora", 7, 10);
  const aboard = aboardCalendarCharactersForEntries([
    { id: "crew:shared-portrait", character: first },
    { id: "traveler:captive:shared-portrait", character: second }
  ]);
  const memory = createAboardCalendarMemory();

  assert.doesNotThrow(() => observeAboardCalendarEvents(
    memory,
    aboard,
    { year: 1522, month: 7, day: 10 }
  ));
  assert.equal(memory.pendingEvents[0].participantIds.length, 2);
});

test("a shared birthday without a separate wisher stages two celebrants face to face", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Ana Costa", 7, 10),
    character("mate", "Leif North", 7, 10)
  ];
  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 7, day: 10 });

  const first = pendingAboardCalendarDialogueLine(memory, aboard);
  assert.equal(first.character.id, "captain");
  assert.equal(first.leftCharacter.id, "captain");
  assert.equal(first.rightCharacter.id, "mate");
  consumeAboardCalendarDialogueLine(memory);

  const second = pendingAboardCalendarDialogueLine(memory, aboard);
  assert.equal(second.character.id, "mate");
  assert.equal(second.leftCharacter.id, "captain");
  assert.equal(second.rightCharacter.id, "mate");
});

test("the captain alone does not throw a birthday party for themself", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [character("captain", "Ana Costa", 7, 10)];
  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 7, day: 10 });
  assert.equal(pendingAboardCalendarDialogueLine(memory, aboard), null);
});

test("aboard birthday exchanges occasionally acknowledge differing faiths", () => {
  const aboard = [
    character("captain", "Ana Costa", 2, 2, "roman-catholic"),
    character("mate", "Marta Rao", 7, 10, "hinduism")
  ];
  let religiousWish = null;
  for (let year = 1522; year < 1560 && !religiousWish; year += 1) {
    const memory = createAboardCalendarMemory();
    observeAboardCalendarEvents(memory, aboard, { year, month: 7, day: 10 });
    const line = pendingAboardCalendarDialogueLine(memory, aboard);
    if (/Our prayers differ/.test(line?.message || "")) religiousWish = line;
  }
  assert.ok(religiousWish);
  assert.equal(religiousWish.character.id, "captain");
});

test("a birthday and a holy day can both queue on the same date", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Ana Costa", 12, 25, "roman-catholic"),
    character("mate", "Leif North", 2, 2, "eastern-orthodox")
  ];

  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 12, day: 25 });

  assert.deepEqual(memory.pendingEvents.map(({ kind }) => kind), [
    "birthday",
    RELIGIOUS_OBSERVANCE_ID.CHRISTMAS
  ]);
  const kinds = drainDialogue(memory, aboard).map(({ eventKind }) => eventKind);
  assert.ok(kinds.includes("birthday"));
  assert.ok(kinds.includes(RELIGIOUS_OBSERVANCE_ID.CHRISTMAS));
});

test("Christian sects recognize Christmas together", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Ana Costa", 2, 2, "roman-catholic"),
    character("mate", "Nikos Voss", 3, 3, "eastern-orthodox")
  ];

  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 12, day: 25 });
  const lines = drainDialogue(memory, aboard);

  assert.equal(lines.length, 2);
  assert.ok(lines.every(({ eventKind }) => eventKind === RELIGIOUS_OBSERVANCE_ID.CHRISTMAS));
  assert.deepEqual(new Set(lines.map(({ character }) => character.id)), new Set(["captain", "mate"]));
  assert.match(lines.map(({ message }) => message).join(" "), /Christmas|Nativity/);
});

test("Muslim sects recognize Ramadan together", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Kemal Reis", 2, 2, "sunni-islam"),
    character("mate", "Ali Tabrizi", 3, 3, "shia-islam")
  ];

  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 7, day: 25 });
  const lines = drainDialogue(memory, aboard);

  assert.equal(lines.length, 2);
  assert.ok(lines.every(({ eventKind }) => eventKind === RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS));
  assert.deepEqual(new Set(lines.map(({ character }) => character.id)), new Set(["captain", "mate"]));
  assert.match(lines.map(({ message }) => message).join(" "), /Ramadan|fast/);
});

test("a lone Muslim receives a respectful mixed-faith Ramadan exchange", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Marta Rao", 2, 2, "hinduism"),
    character("mate", "Kemal Reis", 3, 3, "sunni-islam")
  ];

  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 7, day: 25 });
  const lines = drainDialogue(memory, aboard);

  assert.equal(lines.length, 2);
  assert.deepEqual(new Set(lines.map(({ character }) => character.id)), new Set(["captain", "mate"]));
  assert.match(lines.map(({ message }) => message).join(" "), /Ramadan|sunset/);
});

test("a Jewish character recognizes Yom Kippur in monologue or mixed company", () => {
  const soloMemory = createAboardCalendarMemory();
  const jewishCaptain = character("captain", "Miriam Halevi", 2, 2, "judaism");
  observeAboardCalendarEvents(soloMemory, [jewishCaptain], { year: 1522, month: 10, day: 1 });
  const monologue = pendingAboardCalendarDialogueLine(soloMemory, [jewishCaptain]);
  assert.equal(monologue.eventKind, RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR);
  assert.equal(monologue.rightCharacter, null);
  assert.match(monologue.message, /Yom Kippur|Day of Atonement/);

  const mixedMemory = createAboardCalendarMemory();
  const aboard = [jewishCaptain, character("mate", "Ana Costa", 3, 3, "roman-catholic")];
  observeAboardCalendarEvents(mixedMemory, aboard, { year: 1522, month: 10, day: 1 });
  const exchange = drainDialogue(mixedMemory, aboard);
  assert.equal(exchange.length, 2);
  assert.deepEqual(new Set(exchange.map(({ character }) => character.id)), new Set(["captain", "mate"]));
});

test("characters do not recognize another faith's holy day without an observer aboard", () => {
  const memory = createAboardCalendarMemory();
  const aboard = [
    character("captain", "Ana Costa", 2, 2, "roman-catholic"),
    character("mate", "Marta Rao", 3, 3, "hinduism")
  ];
  observeAboardCalendarEvents(memory, aboard, { year: 1522, month: 10, day: 1 });
  assert.deepEqual(memory.pendingEvents, []);
});

test("legacy birthday memory migrates pending dialogue without losing progress", () => {
  const legacy = {
    version: 1,
    lastObservedDateKey: "1522-07-10",
    pendingEvents: [{
      id: "1522-07-10|captain",
      dateKey: "1522-07-10",
      celebrantIds: ["captain"],
      lineIndex: 1,
      lines: [
        { speakerId: "mate", message: "Happy birthday.", expressionId: "happy" },
        { speakerId: "captain", message: "Thank you.", expressionId: "happy" }
      ]
    }],
    celebratedEventIds: ["1521-07-10|captain"]
  };

  const migrated = migrateBirthdayMemoryToAboardCalendar(legacy);

  assert.equal(migrated.version, 1);
  assert.equal(migrated.pendingEvents[0].kind, "birthday");
  assert.equal(migrated.pendingEvents[0].lineIndex, 1);
  assert.equal(migrated.pendingEvents[0].lines[1].leftCharacterId, "mate");
  assert.equal(migrated.pendingEvents[0].lines[1].rightCharacterId, "captain");
  assert.deepEqual(migrated.completedEventIds, legacy.celebratedEventIds);
  validateAboardCalendarMemory(migrated);
});

function drainDialogue(memory, aboard) {
  const lines = [];
  for (let line = pendingAboardCalendarDialogueLine(memory, aboard); line;
    line = pendingAboardCalendarDialogueLine(memory, aboard)) {
    lines.push(line);
    consumeAboardCalendarDialogueLine(memory);
  }
  return lines;
}
