import { characterAgeOnDate, validateCharacterBiography } from "./characterBiography.js";
import { occasionalReligiousBirthdayWish } from "./religiousDialogue.js";

const BIRTHDAY_MEMORY_VERSION = 1;
const CELEBRATED_EVENT_LIMIT = 128;

export function createBirthdayMemory() {
  return {
    version: BIRTHDAY_MEMORY_VERSION,
    lastObservedDateKey: null,
    pendingEvents: [],
    celebratedEventIds: []
  };
}

export function observeAboardBirthdays(memory, characters, date) {
  validateBirthdayMemory(memory);
  validateAboardCharacters(characters);
  assertDate(date);
  const dateKey = birthdayDateKey(date);
  if (memory.lastObservedDateKey === dateKey) return false;
  memory.lastObservedDateKey = dateKey;
  if (characters.length <= 1) return true;

  const celebrants = characters.filter((character) => (
    character.birthDate.month === date.month && character.birthDate.day === date.day
  ));
  if (celebrants.length === 0) return true;
  const eventId = `${dateKey}|${celebrants.map((character) => character.id).sort().join("+")}`;
  if (memory.celebratedEventIds.includes(eventId) || memory.pendingEvents.some((event) => event.id === eventId)) {
    return true;
  }
  memory.pendingEvents.push(createBirthdayEvent(eventId, dateKey, characters, celebrants, date));
  return true;
}

export function pendingBirthdayDialogueLine(memory, characters) {
  validateBirthdayMemory(memory);
  validateAboardCharacters(characters);
  const charactersById = new Map(characters.map((character) => [character.id, character]));
  while (memory.pendingEvents.length > 0) {
    const event = memory.pendingEvents[0];
    const remainingCelebrants = event.celebrantIds.filter((id) => charactersById.has(id));
    if (remainingCelebrants.length === 0 || event.lineIndex >= event.lines.length) {
      completeFirstEvent(memory);
      continue;
    }
    const line = event.lines[event.lineIndex];
    const character = charactersById.get(line.speakerId);
    if (!character) {
      event.lineIndex += 1;
      continue;
    }
    return Object.freeze({
      eventId: event.id,
      character,
      message: line.message,
      expressionId: line.expressionId
    });
  }
  return null;
}

export function consumeBirthdayDialogueLine(memory) {
  validateBirthdayMemory(memory);
  const event = memory.pendingEvents[0];
  if (!event) throw new Error("No pending birthday dialogue to consume");
  if (event.lineIndex >= event.lines.length) throw new Error(`Birthday event has no line ${event.lineIndex}`);
  event.lineIndex += 1;
  if (event.lineIndex >= event.lines.length) completeFirstEvent(memory);
  return true;
}

export function validateBirthdayMemory(memory) {
  if (!memory || typeof memory !== "object") throw new Error("Birthday memory must be an object");
  if (memory.version !== BIRTHDAY_MEMORY_VERSION) {
    throw new Error(`Unsupported birthday memory version: ${memory.version}`);
  }
  if (memory.lastObservedDateKey !== null && typeof memory.lastObservedDateKey !== "string") {
    throw new Error("Birthday memory has an invalid observed date");
  }
  if (!Array.isArray(memory.pendingEvents) || !Array.isArray(memory.celebratedEventIds)) {
    throw new Error("Birthday memory requires pending and celebrated event lists");
  }
  for (const event of memory.pendingEvents) validateBirthdayEvent(event);
  if (memory.celebratedEventIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Birthday memory contains an invalid completed event id");
  }
  return memory;
}

function createBirthdayEvent(id, dateKey, aboard, celebrants, date) {
  const celebrantIds = celebrants.map((character) => character.id);
  const nonCelebrants = aboard.filter((character) => !celebrantIds.includes(character.id));
  const lines = celebrants.length === 1
    ? singleBirthdayLines(id, celebrants[0], chooseCharacter(nonCelebrants, `${id}|wisher`), date)
    : sharedBirthdayLines(id, celebrants, nonCelebrants);
  return {
    id,
    dateKey,
    celebrantIds,
    lineIndex: 0,
    lines
  };
}

function singleBirthdayLines(eventId, celebrant, wisher, date) {
  if (!wisher) throw new Error(`Birthday for ${celebrant.name} has nobody aboard to offer wishes`);
  const age = characterAgeOnDate(celebrant, date);
  const variants = [
    [
      `Happy birthday, ${celebrant.givenName || celebrant.name}. Another year older, and still one of the steadiest souls aboard.`,
      `Kind of you to remember. Let us make my ${age}th year worth the telling.`
    ],
    [
      `The date in the log gives you away. Happy birthday, ${celebrant.givenName || celebrant.name}.`,
      "Then I shall demand an extra cup at supper. Thank you, truly."
    ],
    [
      `A fair wind on your birthday, ${celebrant.givenName || celebrant.name}. The whole crew wishes you well.`,
      "I would settle for a fair wind tomorrow too. I am glad to share this one with all of you."
    ],
    [
      `We marked the day before you could pretend it was ordinary. Happy birthday, ${celebrant.givenName || celebrant.name}.`,
      "At sea, good company is celebration enough. Thank you."
    ],
    [
      `No slipping past the ship's calendar. Happy birthday, ${celebrant.givenName || celebrant.name}.`,
      "Caught me. Very well: tonight we toast the voyage, and the next year of it."
    ]
  ];
  const pair = [...variants[hashString32(`${eventId}|variant`) % variants.length]];
  const religiousWish = occasionalReligiousBirthdayWish({
    speakerReligionId: wisher.religionId,
    listenerReligionId: celebrant.religionId,
    listenerName: celebrant.givenName || celebrant.name,
    key: eventId
  });
  if (religiousWish) pair[0] = religiousWish;
  return [
    dialogueLine(wisher.id, pair[0], "happy"),
    dialogueLine(celebrant.id, pair[1], "happy")
  ];
}

function sharedBirthdayLines(eventId, celebrants, nonCelebrants) {
  const names = joinNames(celebrants.map((character) => character.givenName || character.name));
  const lines = [];
  const wisher = chooseCharacter(nonCelebrants, `${eventId}|shared-wisher`);
  if (wisher) {
    lines.push(dialogueLine(
      wisher.id,
      `By the ship's log, ${names} all share a birthday. What are the odds? Happy birthday to every one of you.`,
      "happy"
    ));
  }
  const comments = [
    "I thought the date looked familiar. A shared birthday deserves a shared toast.",
    "Of all the ships on all the seas, we found the one carrying the same birthday.",
    "Then none of us can claim the whole celebration. That seems fair enough.",
    "A fine coincidence. We shall have to compare who has weathered the better year."
  ];
  for (let index = 0; index < celebrants.length; index++) {
    const character = celebrants[index];
    lines.push(dialogueLine(
      character.id,
      comments[(hashString32(`${eventId}|comment`) + index) % comments.length],
      "happy"
    ));
  }
  return lines;
}

function completeFirstEvent(memory) {
  const event = memory.pendingEvents.shift();
  if (!event) return;
  if (!memory.celebratedEventIds.includes(event.id)) memory.celebratedEventIds.push(event.id);
  if (memory.celebratedEventIds.length > CELEBRATED_EVENT_LIMIT) {
    memory.celebratedEventIds.splice(0, memory.celebratedEventIds.length - CELEBRATED_EVENT_LIMIT);
  }
}

function validateBirthdayEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "") {
    throw new Error("Invalid birthday event");
  }
  if (!Array.isArray(event.celebrantIds) || event.celebrantIds.length === 0) {
    throw new Error(`Birthday event has no celebrants: ${event.id}`);
  }
  if (!Number.isInteger(event.lineIndex) || event.lineIndex < 0) {
    throw new Error(`Birthday event has invalid line index: ${event.id}`);
  }
  if (!Array.isArray(event.lines) || event.lines.length === 0) {
    throw new Error(`Birthday event has no dialogue: ${event.id}`);
  }
  for (const line of event.lines) {
    if (!line || typeof line.speakerId !== "string" || typeof line.message !== "string" ||
        typeof line.expressionId !== "string") {
      throw new Error(`Birthday event has invalid dialogue: ${event.id}`);
    }
  }
}

function validateAboardCharacters(characters) {
  if (!Array.isArray(characters)) throw new Error("Birthday observation requires aboard characters");
  const ids = new Set();
  for (const character of characters) {
    validateCharacterBiography(character);
    if (typeof character.id !== "string" || character.id === "") {
      throw new Error("Birthday character requires an id");
    }
    if (ids.has(character.id)) throw new Error(`Duplicate birthday character: ${character.id}`);
    ids.add(character.id);
  }
}

function assertDate(date) {
  if (!Number.isInteger(date?.year) || !Number.isInteger(date?.month) || !Number.isInteger(date?.day)) {
    throw new Error("Birthday observation requires a calendar date");
  }
}

function birthdayDateKey(date) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function chooseCharacter(characters, key) {
  if (characters.length === 0) return null;
  return characters[hashString32(key) % characters.length];
}

function dialogueLine(speakerId, message, expressionId) {
  return { speakerId, message, expressionId };
}

function joinNames(names) {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
