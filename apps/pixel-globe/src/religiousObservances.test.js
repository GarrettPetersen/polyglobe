import assert from "node:assert/strict";
import test from "node:test";

import { religionFamilyId } from "./characterReligion.js";
import {
  RELIGIOUS_OBSERVANCE_ID,
  religionObserves,
  religiousObservancesForYear,
  religiousObservancesOnDate
} from "./religiousObservances.js";

test("Christian and Muslim sects share holiday families", () => {
  assert.equal(religionFamilyId("roman-catholic"), "christian");
  assert.equal(religionFamilyId("eastern-orthodox"), "christian");
  assert.equal(religionFamilyId("lutheran"), "christian");
  assert.equal(religionFamilyId("sunni-islam"), "muslim");
  assert.equal(religionFamilyId("shia-islam"), "muslim");
  assert.equal(religionFamilyId("ibadi-islam"), "muslim");
  assert.equal(religionFamilyId("judaism"), "judaism");

  assert.equal(religionObserves("eastern-orthodox", RELIGIOUS_OBSERVANCE_ID.CHRISTMAS), true);
  assert.equal(religionObserves("shia-islam", RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS), true);
  assert.equal(religionObserves("roman-catholic", RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS), false);
});

test("1522 observances use the contemporary Julian civil calendar", () => {
  const dates = religiousObservancesForYear(1522).map(({ id, month, day }) => ({ id, month, day }));
  assert.deepEqual(dates, [
    { id: RELIGIOUS_OBSERVANCE_ID.CHRISTMAS, month: 12, day: 25 },
    { id: RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS, month: 7, day: 25 },
    { id: RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR, month: 10, day: 1 }
  ]);
});

test("lunar and lunisolar observances move in later voyage years", () => {
  const dates = religiousObservancesForYear(1524).map(({ id, month, day }) => ({ id, month, day }));
  assert.deepEqual(dates, [
    { id: RELIGIOUS_OBSERVANCE_ID.CHRISTMAS, month: 12, day: 25 },
    { id: RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS, month: 7, day: 3 },
    { id: RELIGIOUS_OBSERVANCE_ID.YOM_KIPPUR, month: 9, day: 7 }
  ]);
});

test("a date returns only its matching observances", () => {
  assert.deepEqual(
    religiousObservancesOnDate({ year: 1522, month: 7, day: 25 }).map(({ id }) => id),
    [RELIGIOUS_OBSERVANCE_ID.RAMADAN_BEGINS]
  );
  assert.deepEqual(religiousObservancesOnDate({ year: 1522, month: 7, day: 26 }), []);
  assert.throws(
    () => religiousObservancesOnDate({ year: 1522, month: 2, day: 29 }),
    /Invalid religious observance day/
  );
});
