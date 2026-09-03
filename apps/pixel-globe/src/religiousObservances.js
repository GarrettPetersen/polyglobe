import { religionFamilyId } from "./characterReligion.js";

export const RELIGIOUS_OBSERVANCE_ID = Object.freeze({
  CHRISTMAS: "christmas-day",
  RAMADAN_BEGINS: "ramadan-begins",
  YOM_KIPPUR: "yom-kippur"
});

export const RELIGIOUS_OBSERVANCE_CATALOG = Object.freeze([
  observance(RELIGIOUS_OBSERVANCE_ID.CHRISTMAS, "christian"),
  observance(RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS, "muslim"),
  observance(RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR, "judaism")
]);

const OBSERVANCE_BY_ID = new Map(
  RELIGIOUS_OBSERVANCE_CATALOG.map((entry) => [entry.id, entry])
);
if (OBSERVANCE_BY_ID.size !== RELIGIOUS_OBSERVANCE_CATALOG.length) {
  throw new Error("Religious observance catalog contains duplicate ids");
}

const GAME_MONTH_LENGTHS = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
const GREGORIAN_REFORM_JULIAN_DAY_NUMBER = 2299161;
const ISLAMIC_EPOCH_JULIAN_DATE = 1948439.5;
const HEBREW_EPOCH_JULIAN_DATE = 347995.5;

export function religiousObservanceById(observanceId) {
  const profile = OBSERVANCE_BY_ID.get(observanceId);
  if (!profile) throw new Error(`Unknown religious observance: ${observanceId}`);
  return profile;
}

export function religionObserves(religionId, observanceId) {
  return religionFamilyId(religionId) === religiousObservanceById(observanceId).religionFamilyId;
}

export function religiousObservancesOnDate(date) {
  assertGameCalendarDate(date);
  return religiousObservancesForYear(date.year).filter((entry) => (
    entry.month === date.month && entry.day === date.day
  ));
}

export function religiousObservancesForYear(year) {
  assertCivilYear(year);
  const dates = [{
    ...religiousObservanceById(RELIGIOUS_OBSERVANCE_ID.CHRISTMAS),
    year,
    month: 12,
    day: 25
  }];

  for (const islamicYear of candidateIslamicYears(year)) {
    const date = gameDateFromJulianDate(islamicDateToJulianDate(islamicYear, 9, 1));
    if (date.year === year) {
      dates.push({
        ...religiousObservanceById(RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS),
        ...date
      });
    }
  }

  for (const hebrewYear of [year + 3760, year + 3761]) {
    const date = gameDateFromJulianDate(hebrewDateToJulianDate(hebrewYear, 7, 10));
    if (date.year === year) {
      dates.push({
        ...religiousObservanceById(RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR),
        ...date
      });
    }
  }

  const identities = new Set();
  for (const entry of dates) {
    const identity = `${entry.id}|${entry.year}-${entry.month}-${entry.day}`;
    if (identities.has(identity)) throw new Error(`Duplicate religious observance date: ${identity}`);
    identities.add(identity);
  }
  return Object.freeze(dates.map((entry) => Object.freeze(entry)));
}

function candidateIslamicYears(civilYear) {
  const approximateYear = Math.floor((civilYear - 622) * 33 / 32) + 1;
  return [
    approximateYear - 2,
    approximateYear - 1,
    approximateYear,
    approximateYear + 1,
    approximateYear + 2
  ];
}

function islamicDateToJulianDate(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH_JULIAN_DATE - 1;
}

function hebrewDateToJulianDate(year, month, day) {
  let julianDate = HEBREW_EPOCH_JULIAN_DATE + hebrewCalendarDelayOne(year) +
    hebrewCalendarDelayTwo(year) + day + 1;
  if (month < 7) {
    for (let current = 7; current <= hebrewMonthsInYear(year); current += 1) {
      julianDate += hebrewMonthDays(year, current);
    }
    for (let current = 1; current < month; current += 1) {
      julianDate += hebrewMonthDays(year, current);
    }
  } else {
    for (let current = 7; current < month; current += 1) {
      julianDate += hebrewMonthDays(year, current);
    }
  }
  return julianDate;
}

function hebrewCalendarDelayOne(year) {
  const months = Math.floor((235 * year - 234) / 19);
  const parts = 12084 + 13753 * months;
  let day = months * 29 + Math.floor(parts / 25920);
  if (positiveModulo(3 * (day + 1), 7) < 3) day += 1;
  return day;
}

function hebrewCalendarDelayTwo(year) {
  const previous = hebrewCalendarDelayOne(year - 1);
  const current = hebrewCalendarDelayOne(year);
  const next = hebrewCalendarDelayOne(year + 1);
  if (next - current === 356) return 2;
  if (current - previous === 382) return 1;
  return 0;
}

function hebrewMonthsInYear(year) {
  return hebrewLeapYear(year) ? 13 : 12;
}

function hebrewLeapYear(year) {
  return positiveModulo(7 * year + 1, 19) < 7;
}

function hebrewYearDays(year) {
  return hebrewCalendarDelayOne(year + 1) + hebrewCalendarDelayTwo(year + 1) -
    hebrewCalendarDelayOne(year) - hebrewCalendarDelayTwo(year);
}

function hebrewMonthDays(year, month) {
  if ([2, 4, 6, 10, 13].includes(month)) return 29;
  if (month === 12 && !hebrewLeapYear(year)) return 29;
  if (month === 8 && positiveModulo(hebrewYearDays(year), 10) !== 5) return 29;
  if (month === 9 && positiveModulo(hebrewYearDays(year), 10) === 3) return 29;
  return 30;
}

function gameDateFromJulianDate(julianDate) {
  const julianDayNumber = Math.floor(julianDate + 0.5);
  let adjustedDay = julianDayNumber;
  if (julianDayNumber >= GREGORIAN_REFORM_JULIAN_DAY_NUMBER) {
    const gregorianCentury = Math.floor((julianDayNumber - 1867216.25) / 36524.25);
    adjustedDay += 1 + gregorianCentury - Math.floor(gregorianCentury / 4);
  }
  const shiftedDay = adjustedDay + 1524;
  const yearIndex = Math.floor((shiftedDay - 122.1) / 365.25);
  const elapsedYearDays = Math.floor(365.25 * yearIndex);
  const monthIndex = Math.floor((shiftedDay - elapsedYearDays) / 30.6001);
  const day = shiftedDay - elapsedYearDays - Math.floor(30.6001 * monthIndex);
  const month = monthIndex < 14 ? monthIndex - 1 : monthIndex - 13;
  const year = month > 2 ? yearIndex - 4716 : yearIndex - 4715;

  // The simulation intentionally has 365 days in every year. Preserve a
  // leap-day observance on its final representable February date.
  return Object.freeze({ year, month, day: month === 2 && day === 29 ? 28 : day });
}

function observance(id, religionFamilyId) {
  return Object.freeze({ id, religionFamilyId });
}

function assertGameCalendarDate(date) {
  assertCivilYear(date?.year);
  if (!Number.isInteger(date?.month) || date.month < 1 || date.month > 12) {
    throw new Error(`Invalid religious observance month: ${date?.month}`);
  }
  const maximumDay = GAME_MONTH_LENGTHS[date.month - 1];
  if (!Number.isInteger(date?.day) || date.day < 1 || date.day > maximumDay) {
    throw new Error(`Invalid religious observance day: ${date?.day}`);
  }
}

function assertCivilYear(year) {
  if (!Number.isInteger(year) || year < 622 || year > 9999) {
    throw new Error(`Religious observance year is outside 622..9999: ${year}`);
  }
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}
