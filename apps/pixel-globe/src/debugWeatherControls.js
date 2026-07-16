export const DEBUG_WEATHER_CONTROL = Object.freeze({
  PREVIOUS_DAY: "previous-day",
  NEXT_DAY: "next-day",
  PREVIOUS_HOUR: "previous-hour",
  NEXT_HOUR: "next-hour",
  TOGGLE_CLOCK: "toggle-clock"
});

const DEBUG_WEATHER_CONTROL_BY_KEY = new Map([
  ["[", DEBUG_WEATHER_CONTROL.PREVIOUS_DAY],
  ["]", DEBUG_WEATHER_CONTROL.NEXT_DAY],
  [",", DEBUG_WEATHER_CONTROL.PREVIOUS_HOUR],
  [".", DEBUG_WEATHER_CONTROL.NEXT_HOUR],
  ["\\", DEBUG_WEATHER_CONTROL.TOGGLE_CLOCK]
]);

export function debugWeatherControlForKey(key, enabled) {
  if (typeof key !== "string") throw new Error(`Debug weather control key must be a string: ${key}`);
  if (typeof enabled !== "boolean") {
    throw new Error(`Debug weather controls enabled must be boolean: ${enabled}`);
  }
  return enabled ? DEBUG_WEATHER_CONTROL_BY_KEY.get(key) || null : null;
}
