import assert from "node:assert/strict";
import test from "node:test";

import {
  WEATHER_MINUTES_PER_DAY,
  weatherClockAtLocalTime
} from "./weather.js";

test("new voyages begin at 10 a.m. local solar time at any longitude", () => {
  const dayStart = 79 * WEATHER_MINUTES_PER_DAY;
  for (const longitude of [0, 116.4, -74, 170, -170]) {
    const clock = weatherClockAtLocalTime(dayStart + 12 * 60, longitude, 10);
    const localMinute = modulo(clock + longitude * 4, WEATHER_MINUTES_PER_DAY);
    assert.ok(Math.abs(localMinute - 10 * 60) < 1e-9, `longitude ${longitude}`);
  }
});

test("local start time preserves the selected local calendar day across the date line", () => {
  const dayStart = 79 * WEATHER_MINUTES_PER_DAY;
  assert.equal(weatherClockAtLocalTime(dayStart, 170, 10), dayStart - 80);
  assert.equal(weatherClockAtLocalTime(dayStart, -170, 10), dayStart + 1280);
});

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
