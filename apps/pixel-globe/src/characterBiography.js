import { NAME_CULTURE_LABELS } from "./nameCultures.js";
import { WEATHER_DAYS, WEATHER_MINUTES_PER_DAY } from "./weather.js";
import { inferCharacterReligion, religionById } from "./characterReligion.js";
import { requireEntityId } from "./entityIds.js";

export const CHARACTER_BIOGRAPHY_REFERENCE_YEAR = 1522;
export const CHARACTER_BIOGRAPHY_REFERENCE_MONTH = 3;
export const CHARACTER_BIOGRAPHY_REFERENCE_DAY = 21;

const MONTH_NAMES = Object.freeze([
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]);
const MONTH_LENGTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);

export function characterWithBiography(character, {
  identityKey = character?.id,
  referenceYear = CHARACTER_BIOGRAPHY_REFERENCE_YEAR,
  referenceMonth = CHARACTER_BIOGRAPHY_REFERENCE_MONTH,
  referenceDay = CHARACTER_BIOGRAPHY_REFERENCE_DAY,
  minimumAge = 5,
  maximumAge = 90,
  nationalityId = character?.nationalityId ?? null,
  nationalityName = character?.nationalityName ?? null,
  nationalityAdjective = character?.nationalityAdjective ?? null,
  homePort = null
} = {}) {
  if (!character || typeof character !== "object") throw new Error("Character biography requires a character");
  requireEntityId(identityKey, "Character biography");
  assertCalendarDate({ year: referenceYear, month: referenceMonth, day: referenceDay }, "biography reference");
  const sex = character.sex || character.gender;
  if (sex !== "female" && sex !== "male") {
    throw new Error(`Character biography requires an explicit sex: ${sex}`);
  }
  if (!Number.isInteger(minimumAge) || !Number.isInteger(maximumAge) ||
      minimumAge < 0 || maximumAge < minimumAge) {
    throw new Error(`Character biography has invalid age bounds: ${minimumAge}-${maximumAge}`);
  }
  const ageEstimate = character.age;
  if (!Number.isInteger(ageEstimate) || ageEstimate < minimumAge || ageEstimate > maximumAge) {
    throw new Error(`Character biography has invalid portrait age estimate: ${ageEstimate}`);
  }
  const birthDate = character.birthDate
    ? normalizeBirthDate(character.birthDate)
    : generateBirthDate(identityKey, ageEstimate, { year: referenceYear, month: referenceMonth, day: referenceDay });
  const age = characterAgeOnDate({ ...character, birthDate }, {
    year: referenceYear,
    month: referenceMonth,
    day: referenceDay
  });
  if (age !== ageEstimate) {
    throw new Error(`Character birth date disagrees with portrait age estimate: ${age} != ${ageEstimate}`);
  }
  const religion = inferCharacterReligion({
    identityKey,
    homePort,
    character: {
      ...character,
      nationalityId
    }
  });
  return {
    ...character,
    sex,
    birthDate,
    birthDateLabel: formatCharacterBirthDate(birthDate),
    age,
    nationalityId,
    nationalityName,
    nationalityAdjective,
    religionId: religion?.id ?? null
  };
}

export function correctedCharacterPortraitAge(character, targetAge, {
  referenceYear = CHARACTER_BIOGRAPHY_REFERENCE_YEAR,
  referenceMonth = CHARACTER_BIOGRAPHY_REFERENCE_MONTH,
  referenceDay = CHARACTER_BIOGRAPHY_REFERENCE_DAY
} = {}) {
  if (!character || typeof character !== "object") {
    throw new Error("Portrait age correction requires a character");
  }
  if (!Number.isInteger(targetAge) || targetAge < 5 || targetAge > 90) {
    throw new Error(`Invalid corrected portrait age: ${targetAge}`);
  }
  if (!character.birthDate) return { age: targetAge };
  assertCalendarDate({ year: referenceYear, month: referenceMonth, day: referenceDay }, "portrait age reference");
  const currentBirthDate = normalizeBirthDate(character.birthDate);
  const birthdayPassed = referenceMonth > currentBirthDate.month ||
    (referenceMonth === currentBirthDate.month && referenceDay >= currentBirthDate.day);
  const birthDate = Object.freeze({
    year: referenceYear - targetAge - (birthdayPassed ? 0 : 1),
    month: currentBirthDate.month,
    day: currentBirthDate.day
  });
  return {
    age: targetAge,
    birthDate,
    birthDateLabel: formatCharacterBirthDate(birthDate)
  };
}

export function characterAgeAtMinute(character, simMinute, longitudeDeg = 0) {
  return characterAgeOnDate(character, gameCalendarDateAtMinute(simMinute, longitudeDeg));
}

export function characterAgeOnDate(character, date) {
  if (!character?.birthDate) throw new Error("Character age requires a birth date");
  const birthDate = normalizeBirthDate(character.birthDate);
  assertCalendarDate(date, "character age");
  const birthdayPassed = date.month > birthDate.month ||
    (date.month === birthDate.month && date.day >= birthDate.day);
  const age = date.year - birthDate.year - (birthdayPassed ? 0 : 1);
  if (!Number.isInteger(age) || age < 0) throw new Error(`Invalid character age: ${age}`);
  return age;
}

export function gameCalendarDateAtMinute(simMinute, longitudeDeg = 0) {
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid game calendar minute: ${simMinute}`);
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Invalid game calendar longitude: ${longitudeDeg}`);
  }
  const localMinute = Math.floor(simMinute + longitudeDeg * 4);
  const totalDay = Math.floor(localMinute / WEATHER_MINUTES_PER_DAY);
  const year = CHARACTER_BIOGRAPHY_REFERENCE_YEAR + Math.floor(totalDay / WEATHER_DAYS);
  const dayIndex = positiveModulo(totalDay, WEATHER_DAYS);
  const date = new Date(Date.UTC(2001, 0, 1 + dayIndex));
  return Object.freeze({
    year,
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    dayIndex
  });
}

export function characterBirthdayLabel(character, { abbreviated = true } = {}) {
  if (!character?.birthDate) throw new Error("Character birthday label requires a birth date");
  const birthDate = normalizeBirthDate(character.birthDate);
  const month = abbreviated ? MONTH_NAMES[birthDate.month - 1].slice(0, 3).toUpperCase() : MONTH_NAMES[birthDate.month - 1];
  return `${String(birthDate.day).padStart(2, "0")} ${month}`;
}

export function formatCharacterBirthDate(birthDate) {
  const normalized = normalizeBirthDate(birthDate);
  return `${normalized.day} ${MONTH_NAMES[normalized.month - 1]} ${normalized.year}`;
}

export function characterNationalityLabel(character) {
  if (!character || typeof character !== "object") throw new Error("Character nationality requires a character");
  if (typeof character.nationalityAdjective === "string" &&
      character.nationalityAdjective.trim() !== "" && character.nationalityAdjective !== "Neutral") {
    return character.nationalityAdjective;
  }
  const cultural = NAME_CULTURE_LABELS[character.nameCulture];
  if (cultural) return cultural;
  if (typeof character.nationalityName === "string" && character.nationalityName.trim() !== "") {
    return character.nationalityName;
  }
  if (typeof character.homePortCountry === "string" && character.homePortCountry.trim() !== "") {
    return character.homePortCountry;
  }
  throw new Error(`Character has no nationality label: ${character.id || character.name || "unknown"}`);
}

export function characterCultureLabel(character) {
  if (!character || typeof character !== "object") throw new Error("Character culture requires a character");
  const cultural = NAME_CULTURE_LABELS[character.nameCulture];
  if (!cultural) {
    throw new Error(`Character has no culture label: ${character.id || character.name || "unknown"}`);
  }
  return cultural;
}

export function validateCharacterBiography(character) {
  if (!character || typeof character !== "object") throw new Error("Character biography must be an object");
  if (character.sex !== "female" && character.sex !== "male") {
    throw new Error(`Invalid character sex: ${character.sex}`);
  }
  normalizeBirthDate(character.birthDate);
  if (typeof character.birthDateLabel !== "string" || character.birthDateLabel.trim() === "") {
    throw new Error("Character biography requires a birth date label");
  }
  religionById(character.religionId);
  return character;
}

function generateBirthDate(identityKey, age, referenceDate) {
  const month = hashString32(`${identityKey}|birth-month`) % 12 + 1;
  const day = hashString32(`${identityKey}|birth-day`) % MONTH_LENGTHS[month - 1] + 1;
  const birthdayPassed = referenceDate.month > month ||
    (referenceDate.month === month && referenceDate.day >= day);
  const year = referenceDate.year - age - (birthdayPassed ? 0 : 1);
  return Object.freeze({ year, month, day });
}

function normalizeBirthDate(birthDate) {
  const normalized = {
    year: birthDate?.year,
    month: birthDate?.month,
    day: birthDate?.day
  };
  assertCalendarDate(normalized, "birth date");
  return Object.freeze(normalized);
}

function assertCalendarDate(date, label) {
  if (!Number.isInteger(date?.year)) throw new Error(`Invalid ${label} year: ${date?.year}`);
  if (!Number.isInteger(date.month) || date.month < 1 || date.month > 12) {
    throw new Error(`Invalid ${label} month: ${date.month}`);
  }
  if (!Number.isInteger(date.day) || date.day < 1 || date.day > MONTH_LENGTHS[date.month - 1]) {
    throw new Error(`Invalid ${label} day: ${date.day}`);
  }
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
