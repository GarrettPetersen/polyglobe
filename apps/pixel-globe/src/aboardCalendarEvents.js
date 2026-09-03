import { characterAgeOnDate, validateCharacterBiography } from "./characterBiography.js";
import { religionFamilyId } from "./characterReligion.js";
import { occasionalReligiousBirthdayWish } from "./religiousDialogue.js";
import {
  RELIGIOUS_OBSERVANCE_ID,
  religiousObservancesOnDate
} from "./religiousObservances.js";

const ABOARD_CALENDAR_MEMORY_VERSION = 1;
const COMPLETED_EVENT_LIMIT = 256;
const ABOARD_CALENDAR_EVENT_KINDS = new Set([
  "birthday",
  ...Object.values(RELIGIOUS_OBSERVANCE_ID)
]);

export function createAboardCalendarMemory() {
  return {
    version: ABOARD_CALENDAR_MEMORY_VERSION,
    lastObservedDateKey: null,
    pendingEvents: [],
    completedEventIds: []
  };
}

export function aboardCalendarCharactersForEntries(entries) {
  if (!Array.isArray(entries)) throw new Error("Aboard calendar participants require aboard entries");
  const identities = new Set();
  return entries.map((entry) => {
    if (!entry || typeof entry.id !== "string" || entry.id === "" || !entry.character) {
      throw new Error("Aboard calendar participant requires a named aboard entry");
    }
    validateCharacterBiography(entry.character);
    religionFamilyId(entry.character.religionId);
    const birthDate = entry.character.birthDate;
    const aboardEventIdentity = `${entry.id}|${entry.character.name}|` +
      `${birthDate.year}-${birthDate.month}-${birthDate.day}`;
    if (identities.has(aboardEventIdentity)) {
      throw new Error(`Duplicate aboard calendar person: ${aboardEventIdentity}`);
    }
    identities.add(aboardEventIdentity);
    return Object.freeze({ ...entry.character, aboardEventIdentity });
  });
}

export function observeAboardCalendarEvents(memory, characters, date) {
  validateAboardCalendarMemory(memory);
  const observances = religiousObservancesOnDate(date);
  const dateKey = calendarDateKey(date);
  if (memory.lastObservedDateKey === dateKey) return false;
  validateAboardCharacters(characters);
  memory.lastObservedDateKey = dateKey;

  queueBirthdayEvent(memory, characters, date, dateKey);
  for (const observance of observances) {
    queueReligiousObservanceEvent(memory, characters, observance, dateKey);
  }
  return true;
}

export function aboardCalendarObservationNeeded(memory, date) {
  validateAboardCalendarMemory(memory);
  religiousObservancesOnDate(date);
  return memory.lastObservedDateKey !== calendarDateKey(date);
}

export function pendingAboardCalendarDialogueLine(memory, characters) {
  validateAboardCalendarMemory(memory);
  validateAboardCharacters(characters);
  const charactersById = new Map(characters.map((character) => [
    aboardCalendarCharacterIdentity(character),
    character
  ]));
  while (memory.pendingEvents.length > 0) {
    const event = memory.pendingEvents[0];
    if (!event.participantIds.some((id) => charactersById.has(id)) ||
        event.lineIndex >= event.lines.length) {
      completeFirstEvent(memory);
      continue;
    }
    const line = event.lines[event.lineIndex];
    const character = charactersById.get(line.speakerId);
    const leftCharacter = charactersById.get(line.leftCharacterId);
    const rightCharacter = line.rightCharacterId === null
      ? null
      : charactersById.get(line.rightCharacterId);
    if (!character || !leftCharacter || (line.rightCharacterId !== null && !rightCharacter)) {
      event.lineIndex += 1;
      continue;
    }
    return Object.freeze({
      eventId: event.id,
      eventKind: event.kind,
      character,
      leftCharacter,
      rightCharacter,
      message: line.message,
      expressionId: line.expressionId
    });
  }
  return null;
}

export function consumeAboardCalendarDialogueLine(memory) {
  validateAboardCalendarMemory(memory);
  const event = memory.pendingEvents[0];
  if (!event) throw new Error("No pending aboard calendar dialogue to consume");
  if (event.lineIndex >= event.lines.length) {
    throw new Error(`Aboard calendar event has no line ${event.lineIndex}`);
  }
  event.lineIndex += 1;
  if (event.lineIndex >= event.lines.length) completeFirstEvent(memory);
  return true;
}

export function migrateBirthdayMemoryToAboardCalendar(legacyMemory) {
  if (legacyMemory === null || legacyMemory === undefined) return createAboardCalendarMemory();
  validateLegacyBirthdayMemory(legacyMemory);
  return {
    version: ABOARD_CALENDAR_MEMORY_VERSION,
    lastObservedDateKey: legacyMemory.lastObservedDateKey,
    pendingEvents: legacyMemory.pendingEvents.map(migrateLegacyBirthdayEvent),
    completedEventIds: [...legacyMemory.celebratedEventIds]
  };
}

export function validateAboardCalendarMemory(memory) {
  if (!memory || typeof memory !== "object") throw new Error("Aboard calendar memory must be an object");
  if (memory.version !== ABOARD_CALENDAR_MEMORY_VERSION) {
    throw new Error(`Unsupported aboard calendar memory version: ${memory.version}`);
  }
  if (memory.lastObservedDateKey !== null && typeof memory.lastObservedDateKey !== "string") {
    throw new Error("Aboard calendar memory has an invalid observed date");
  }
  if (!Array.isArray(memory.pendingEvents) || !Array.isArray(memory.completedEventIds)) {
    throw new Error("Aboard calendar memory requires pending and completed event lists");
  }
  for (const event of memory.pendingEvents) validateCalendarEvent(event);
  const completedIds = new Set();
  for (const id of memory.completedEventIds) {
    if (typeof id !== "string" || id === "") {
      throw new Error("Aboard calendar memory contains an invalid completed event id");
    }
    if (completedIds.has(id)) throw new Error(`Duplicate completed aboard calendar event: ${id}`);
    completedIds.add(id);
  }
  return memory;
}

function queueBirthdayEvent(memory, characters, date, dateKey) {
  if (characters.length <= 1) return false;
  const celebrants = characters.filter((character) => (
    character.birthDate.month === date.month && character.birthDate.day === date.day
  ));
  if (celebrants.length === 0) return false;
  const eventId = `${dateKey}|birthday|${celebrants
    .map(aboardCalendarCharacterIdentity).sort().join("+")}`;
  const celebrantIds = celebrants.map(aboardCalendarCharacterIdentity);
  const nonCelebrants = characters.filter((character) => (
    !celebrantIds.includes(aboardCalendarCharacterIdentity(character))
  ));
  const lines = celebrants.length === 1
    ? singleBirthdayLines(eventId, celebrants[0], chooseCharacter(nonCelebrants, `${eventId}|wisher`), date)
    : sharedBirthdayLines(eventId, celebrants, nonCelebrants);
  return queueEvent(memory, {
    id: eventId,
    kind: "birthday",
    dateKey,
    participantIds: participantIdsForLines(lines),
    lineIndex: 0,
    lines
  });
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
    dialogueLine(wisher, wisher, celebrant, pair[0], "happy"),
    dialogueLine(celebrant, wisher, celebrant, pair[1], "happy")
  ];
}

function sharedBirthdayLines(eventId, celebrants, nonCelebrants) {
  const names = joinNames(celebrants.map((character) => character.givenName || character.name));
  const lines = [];
  const wisher = chooseCharacter(nonCelebrants, `${eventId}|shared-wisher`);
  const anchor = wisher || celebrants[0];
  if (wisher) {
    lines.push(dialogueLine(
      wisher,
      wisher,
      celebrants[0],
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
  for (let index = 0; index < celebrants.length; index += 1) {
    const character = celebrants[index];
    const counterpart = wisher
      ? character
      : (character === anchor ? celebrants[1] : character);
    lines.push(dialogueLine(
      character,
      anchor,
      counterpart,
      comments[(hashString32(`${eventId}|comment`) + index) % comments.length],
      "happy"
    ));
  }
  return lines;
}

function queueReligiousObservanceEvent(memory, characters, observance, dateKey) {
  const observers = characters.filter((character) => (
    religionFamilyId(character.religionId) === observance.religionFamilyId
  ));
  if (observers.length === 0) return false;
  const eventId = `${dateKey}|${observance.id}|${observers
    .map(aboardCalendarCharacterIdentity).sort().join("+")}`;
  const participantSet = chooseReligiousObservanceParticipants(
    characters,
    observers,
    eventId
  );
  return queueEvent(memory, {
    id: eventId,
    kind: observance.id,
    dateKey,
    participantIds: participantSet.participants.map(aboardCalendarCharacterIdentity),
    lineIndex: 0,
    lines: religiousObservanceLines(observance.id, participantSet, eventId)
  });
}

function chooseReligiousObservanceParticipants(characters, observers, eventId) {
  const firstObserver = chooseCharacter(observers, `${eventId}|first-observer`);
  if (!firstObserver) throw new Error(`Religious observance has no observer: ${eventId}`);
  if (observers.length >= 2) {
    const remaining = observers.filter((character) => character !== firstObserver);
    const secondObserver = chooseCharacter(remaining, `${eventId}|second-observer`);
    if (!secondObserver) throw new Error(`Shared religious observance has no second observer: ${eventId}`);
    return Object.freeze({
      mode: "shared-faith",
      observer: firstObserver,
      counterpart: secondObserver,
      participants: Object.freeze([firstObserver, secondObserver])
    });
  }
  const others = characters.filter((character) => character !== firstObserver);
  const counterpart = chooseCharacter(others, `${eventId}|other-faith`);
  if (!counterpart) {
    return Object.freeze({
      mode: "monologue",
      observer: firstObserver,
      counterpart: null,
      participants: Object.freeze([firstObserver])
    });
  }
  return Object.freeze({
    mode: "mixed-faith",
    observer: firstObserver,
    counterpart,
    participants: Object.freeze([firstObserver, counterpart])
  });
}

function religiousObservanceLines(observanceId, participantSet, eventId) {
  const variant = hashString32(`${eventId}|dialogue`) % 2;
  if (participantSet.mode === "shared-faith") {
    return sharedFaithObservanceLines(
      observanceId,
      participantSet.observer,
      participantSet.counterpart,
      variant
    );
  }
  if (participantSet.mode === "mixed-faith") {
    return mixedFaithObservanceLines(
      observanceId,
      participantSet.observer,
      participantSet.counterpart,
      variant
    );
  }
  if (participantSet.mode === "monologue") {
    return monologueObservanceLines(observanceId, participantSet.observer, variant);
  }
  throw new Error(`Unknown religious observance dialogue mode: ${participantSet.mode}`);
}

function sharedFaithObservanceLines(observanceId, observer, counterpart, variant) {
  const pair = sharedFaithObservanceCopy(observanceId)[variant];
  return [
    dialogueLine(observer, observer, counterpart, pair[0], observanceExpression(observanceId)),
    dialogueLine(counterpart, observer, counterpart, pair[1], observanceExpression(observanceId))
  ];
}

function mixedFaithObservanceLines(observanceId, observer, counterpart, variant) {
  const pair = mixedFaithObservanceCopy(observanceId)[variant];
  return variant === 0
    ? [
        dialogueLine(observer, observer, counterpart, pair[0], observanceExpression(observanceId)),
        dialogueLine(counterpart, observer, counterpart, pair[1], "happy")
      ]
    : [
        dialogueLine(counterpart, counterpart, observer, pair[0], "neutral"),
        dialogueLine(observer, counterpart, observer, pair[1], observanceExpression(observanceId))
      ];
}

function monologueObservanceLines(observanceId, observer, variant) {
  return [dialogueLine(
    observer,
    observer,
    null,
    monologueObservanceCopy(observanceId)[variant],
    observanceExpression(observanceId)
  )];
}

function sharedFaithObservanceCopy(observanceId) {
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.CHRISTMAS) {
    return [
      [
        "Christmas Day at last. When the watch allows it, we should say the Nativity office together.",
        "And share whatever feast the cook can coax from the hold. Christ is born."
      ],
      [
        "The bell marks Christmas. I miss the church at home, but prayer carries well over open water.",
        "Then we shall keep the feast here with a hymn, a good meal, and grateful hearts."
      ]
    ];
  }
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS) {
    return [
      [
        "Ramadan begins. We shall take food before dawn and break our fast together after sunset.",
        "The sea will test the fast, but not our resolve. May this month make us patient and just."
      ],
      [
        "The first day of Ramadan is upon us. Let us agree our watches before the dawn meal.",
        "And gather again at sunset. No one should keep the fast alone at sea."
      ]
    ];
  }
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR) {
    return [
      [
        "Yom Kippur is upon us. Before the fast begins, if I have wronged you, I ask your forgiveness.",
        "And I ask yours. May our names be sealed for life, and may we come out of the fast at peace."
      ],
      [
        "The Day of Atonement has found us far from any synagogue.",
        "The sea is no excuse. We can fast, pray, and make peace with one another here."
      ]
    ];
  }
  throw new Error(`Religious observance has no shared-faith dialogue: ${observanceId}`);
}

function mixedFaithObservanceCopy(observanceId) {
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.CHRISTMAS) {
    return [
      [
        "It is Christmas Day, the feast of Christ's Nativity. I mean to keep it, though we are far from any church.",
        "Then I will take your watch while you pray. If the cook finds a feast, all aboard may be glad of it."
      ],
      [
        "I know this is your Christmas. Shall the ship's bell call your people to prayer?",
        "Please. We have no church, but we can still mark the Nativity with prayer and a shared meal."
      ]
    ];
  }
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS) {
    return [
      [
        "Ramadan begins today. From dawn until sunset I will fast while strength allows.",
        "Tell me when the sun is down. I will ask the cook to hold your portion until then."
      ],
      [
        "The new moon means Ramadan, does it not? Shall we hold your supper until sunset?",
        "Yes. I will keep the fast while strength allows. Your consideration does you honor."
      ]
    ];
  }
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR) {
    return [
      [
        "Today is Yom Kippur. I will fast and spend what hours I can in prayer and repentance.",
        "I will keep your watch when I can. May the day bring you the peace you seek."
      ],
      [
        "You have taken no breakfast. Is this your Day of Atonement?",
        "It is. I fast, pray, and reckon honestly with the year behind me."
      ]
    ];
  }
  throw new Error(`Religious observance has no mixed-faith dialogue: ${observanceId}`);
}

function monologueObservanceCopy(observanceId) {
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.CHRISTMAS) {
    return [
      "Christmas at sea: no church but the sky, no choir but the rigging. I will keep the Nativity as best I can.",
      "Christmas Day. I shall say the old prayers, then see whether the cook has hidden anything worthy of a feast."
    ];
  }
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS) {
    return [
      "Ramadan begins. I will keep the fast while strength allows, and meet sunset with gratitude.",
      "The crescent has brought Ramadan. Even alone, I can mark the hours with prayer, restraint, and honest conduct."
    ];
  }
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR) {
    return [
      "Yom Kippur at sea. I will fast, pray, and reckon honestly with the year behind me.",
      "The Day of Atonement has come. No synagogue lies beyond this hatch, but repentance needs no harbor."
    ];
  }
  throw new Error(`Religious observance has no monologue: ${observanceId}`);
}

function observanceExpression(observanceId) {
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.CHRISTMAS) return "happy";
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS) return "neutral";
  if (observanceId === RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR) return "neutral";
  throw new Error(`Religious observance has no expression: ${observanceId}`);
}

function queueEvent(memory, event) {
  validateCalendarEvent(event);
  if (memory.completedEventIds.includes(event.id) ||
      memory.pendingEvents.some((pending) => pending.id === event.id)) {
    return false;
  }
  memory.pendingEvents.push(event);
  return true;
}

function completeFirstEvent(memory) {
  const event = memory.pendingEvents.shift();
  if (!event) return;
  if (!memory.completedEventIds.includes(event.id)) memory.completedEventIds.push(event.id);
  if (memory.completedEventIds.length > COMPLETED_EVENT_LIMIT) {
    memory.completedEventIds.splice(0, memory.completedEventIds.length - COMPLETED_EVENT_LIMIT);
  }
}

function migrateLegacyBirthdayEvent(event) {
  validateLegacyBirthdayEvent(event);
  const celebrantIds = [...event.celebrantIds];
  const wisherId = event.lines
    .map((line) => line.speakerId)
    .find((speakerId) => !celebrantIds.includes(speakerId)) || null;
  const anchorId = wisherId || celebrantIds[0];
  const lines = event.lines.map((line) => {
    const counterpartId = wisherId
      ? (line.speakerId === wisherId ? celebrantIds[0] : line.speakerId)
      : (line.speakerId === anchorId ? celebrantIds[1] : line.speakerId);
    if (!counterpartId) throw new Error(`Legacy birthday cannot stage line: ${event.id}`);
    return {
      speakerId: line.speakerId,
      leftCharacterId: anchorId,
      rightCharacterId: counterpartId,
      message: line.message,
      expressionId: line.expressionId
    };
  });
  return {
    id: event.id.includes("|birthday|")
      ? event.id
      : `${event.dateKey}|birthday|${celebrantIds.slice().sort().join("+")}`,
    kind: "birthday",
    dateKey: event.dateKey,
    participantIds: participantIdsForLines(lines),
    lineIndex: event.lineIndex,
    lines
  };
}

function validateCalendarEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "") {
    throw new Error("Invalid aboard calendar event");
  }
  if (!ABOARD_CALENDAR_EVENT_KINDS.has(event.kind)) {
    throw new Error(`Unknown aboard calendar event kind: ${event.kind}`);
  }
  if (typeof event.dateKey !== "string" || event.dateKey === "") {
    throw new Error(`Aboard calendar event has no date: ${event.id}`);
  }
  if (!Array.isArray(event.participantIds) || event.participantIds.length === 0 ||
      new Set(event.participantIds).size !== event.participantIds.length ||
      event.participantIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error(`Aboard calendar event has invalid participants: ${event.id}`);
  }
  if (!Number.isInteger(event.lineIndex) || event.lineIndex < 0) {
    throw new Error(`Aboard calendar event has invalid line index: ${event.id}`);
  }
  if (!Array.isArray(event.lines) || event.lines.length === 0) {
    throw new Error(`Aboard calendar event has no dialogue: ${event.id}`);
  }
  for (const line of event.lines) validateDialogueLine(line, event.id);
  const participantIds = new Set(event.participantIds);
  for (const line of event.lines) {
    for (const stagedId of [line.speakerId, line.leftCharacterId, line.rightCharacterId]) {
      if (stagedId !== null && !participantIds.has(stagedId)) {
        throw new Error(`Aboard calendar dialogue references a non-participant: ${event.id}/${stagedId}`);
      }
    }
  }
}

function validateDialogueLine(line, eventId) {
  if (!line || typeof line !== "object" ||
      typeof line.speakerId !== "string" || line.speakerId === "" ||
      typeof line.leftCharacterId !== "string" || line.leftCharacterId === "" ||
      (line.rightCharacterId !== null &&
        (typeof line.rightCharacterId !== "string" || line.rightCharacterId === "")) ||
      typeof line.message !== "string" || line.message === "" ||
      typeof line.expressionId !== "string" || line.expressionId === "") {
    throw new Error(`Aboard calendar event has invalid dialogue: ${eventId}`);
  }
  if (line.speakerId !== line.leftCharacterId && line.speakerId !== line.rightCharacterId) {
    throw new Error(`Aboard calendar speaker is not staged: ${eventId}/${line.speakerId}`);
  }
}

function validateAboardCharacters(characters) {
  if (!Array.isArray(characters)) throw new Error("Aboard calendar observation requires characters");
  const ids = new Set();
  for (const character of characters) {
    validateCharacterBiography(character);
    religionFamilyId(character.religionId);
    if (typeof character.id !== "string" || character.id === "") {
      throw new Error("Aboard calendar character requires an id");
    }
    const identity = aboardCalendarCharacterIdentity(character);
    if (ids.has(identity)) throw new Error(`Duplicate aboard calendar character: ${identity}`);
    ids.add(identity);
  }
}

function validateLegacyBirthdayMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== 1) {
    throw new Error(`Unsupported legacy birthday memory version: ${memory?.version}`);
  }
  if (memory.lastObservedDateKey !== null && typeof memory.lastObservedDateKey !== "string") {
    throw new Error("Legacy birthday memory has an invalid observed date");
  }
  if (!Array.isArray(memory.pendingEvents) || !Array.isArray(memory.celebratedEventIds)) {
    throw new Error("Legacy birthday memory requires pending and celebrated event lists");
  }
  for (const event of memory.pendingEvents) validateLegacyBirthdayEvent(event);
  if (memory.celebratedEventIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Legacy birthday memory has an invalid completed event id");
  }
}

function validateLegacyBirthdayEvent(event) {
  if (!event || typeof event !== "object" || typeof event.id !== "string" || event.id === "" ||
      typeof event.dateKey !== "string" || event.dateKey === "" ||
      !Array.isArray(event.celebrantIds) || event.celebrantIds.length === 0 ||
      !Number.isInteger(event.lineIndex) || event.lineIndex < 0 ||
      !Array.isArray(event.lines) || event.lines.length === 0) {
    throw new Error("Invalid legacy birthday event");
  }
  for (const line of event.lines) {
    if (!line || typeof line.speakerId !== "string" || line.speakerId === "" ||
        typeof line.message !== "string" || line.message === "" ||
        typeof line.expressionId !== "string" || line.expressionId === "") {
      throw new Error(`Legacy birthday event has invalid dialogue: ${event.id}`);
    }
  }
}

function aboardCalendarCharacterIdentity(character) {
  return character.aboardEventIdentity === undefined
    ? character.id
    : character.aboardEventIdentity;
}

function calendarDateKey(date) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function chooseCharacter(characters, key) {
  if (characters.length === 0) return null;
  return characters[hashString32(key) % characters.length];
}

function participantIdsForLines(lines) {
  const participantIds = new Set();
  for (const line of lines) {
    participantIds.add(line.speakerId);
    participantIds.add(line.leftCharacterId);
    if (line.rightCharacterId !== null) participantIds.add(line.rightCharacterId);
  }
  return [...participantIds];
}

function dialogueLine(speaker, leftCharacter, rightCharacter, message, expressionId) {
  return {
    speakerId: aboardCalendarCharacterIdentity(speaker),
    leftCharacterId: aboardCalendarCharacterIdentity(leftCharacter),
    rightCharacterId: rightCharacter ? aboardCalendarCharacterIdentity(rightCharacter) : null,
    message,
    expressionId
  };
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
