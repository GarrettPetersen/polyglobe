import assert from "node:assert/strict";
import test from "node:test";

import {
  DEBUG_WEATHER_CONTROL,
  debugWeatherControlForKey
} from "./debugWeatherControls.js";

test("debug weather controls are unavailable during normal play", () => {
  for (const key of ["[", "]", ",", ".", "\\"]) {
    assert.equal(debugWeatherControlForKey(key, false), null);
  }
});

test("debug weather controls use distinct non-gameplay keys", () => {
  assert.equal(
    debugWeatherControlForKey("[", true),
    DEBUG_WEATHER_CONTROL.PREVIOUS_DAY
  );
  assert.equal(
    debugWeatherControlForKey("]", true),
    DEBUG_WEATHER_CONTROL.NEXT_DAY
  );
  assert.equal(
    debugWeatherControlForKey(",", true),
    DEBUG_WEATHER_CONTROL.PREVIOUS_HOUR
  );
  assert.equal(
    debugWeatherControlForKey(".", true),
    DEBUG_WEATHER_CONTROL.NEXT_HOUR
  );
  assert.equal(
    debugWeatherControlForKey("\\", true),
    DEBUG_WEATHER_CONTROL.TOGGLE_CLOCK
  );
});

test("Space always remains available to gameplay interactions", () => {
  assert.equal(debugWeatherControlForKey(" ", false), null);
  assert.equal(debugWeatherControlForKey(" ", true), null);
});

test("debug weather controls reject malformed input", () => {
  assert.throws(
    () => debugWeatherControlForKey(null, true),
    /key must be a string/
  );
  assert.throws(
    () => debugWeatherControlForKey("[", "yes"),
    /enabled must be boolean/
  );
});
