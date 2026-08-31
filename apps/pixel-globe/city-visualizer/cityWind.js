import { dateToSubsolarLatDeg, windAtLatLonDeg } from "../src/weather.js";

export const CITY_WIND_SPEED_OPTIONS = Object.freeze([
  Object.freeze({ value: "auto", label: "Auto — game wind field" }),
  Object.freeze({ value: "calm", label: "Calm" }),
  Object.freeze({ value: "light", label: "Light" }),
  Object.freeze({ value: "moderate", label: "Moderate" }),
  Object.freeze({ value: "strong", label: "Strong" })
]);

export const CITY_WIND_DIRECTION_OPTIONS = Object.freeze([
  Object.freeze({ value: "auto", label: "Auto — game wind field" }),
  Object.freeze({ value: "right", label: "Toward screen right" }),
  Object.freeze({ value: "left", label: "Toward screen left" }),
  Object.freeze({ value: "up-right", label: "Toward upper right" }),
  Object.freeze({ value: "up-left", label: "Toward upper left" })
]);

const SPEED_STRENGTH = Object.freeze({
  calm: 0.12,
  light: 0.34,
  moderate: 0.64,
  strong: 1
});

const DIRECTION_RAD = Object.freeze({
  right: 0,
  left: Math.PI,
  "up-right": -Math.PI / 4,
  "up-left": -Math.PI * 3 / 4
});

// The game opens on day 80 at noon. Sampling that same instant makes a city
// preview stable while retaining the production wind field's geography.
const CITY_WIND_REFERENCE_MINUTE = (80 - 1) * 24 * 60 + 12 * 60;
const CITY_WIND_REFERENCE_SUBSOLAR_LAT_DEG = dateToSubsolarLatDeg(
  new Date(Date.UTC(1522, 2, 21, 12))
);
const CITY_WIND_SEED = 90210;

export function cityWindForCity(city, { speed = "auto", direction = "auto" } = {}) {
  if (!Number.isFinite(city?.lat) || !Number.isFinite(city?.lon)) {
    throw new Error("City wind requires finite latitude and longitude");
  }
  if (speed !== "auto" && !Object.hasOwn(SPEED_STRENGTH, speed)) {
    throw new Error(`Unknown city wind speed: ${speed}`);
  }
  if (direction !== "auto" && !Object.hasOwn(DIRECTION_RAD, direction)) {
    throw new Error(`Unknown city wind direction: ${direction}`);
  }
  const geographicWind = windAtLatLonDeg(
    city.lat,
    city.lon,
    CITY_WIND_REFERENCE_SUBSOLAR_LAT_DEG,
    { seed: CITY_WIND_SEED, simMinute: CITY_WIND_REFERENCE_MINUTE }
  );
  const automaticDirection = screenWindFlowDirection(geographicWind.directionRad);
  const flowDirectionRad = direction === "auto" ? automaticDirection : DIRECTION_RAD[direction];
  const strength = speed === "auto" ? geographicWind.strength : SPEED_STRENGTH[speed];
  return Object.freeze({
    flowDirectionRad,
    strength,
    flowX: Math.cos(flowDirectionRad),
    flowY: Math.sin(flowDirectionRad),
    speedLabel: cityWindSpeedLabel(strength),
    directionLabel: cityWindDirectionLabel(flowDirectionRad),
    automaticSpeed: speed === "auto",
    automaticDirection: direction === "auto"
  });
}

export function screenWindFlowDirection(geographicDirectionRad) {
  if (!Number.isFinite(geographicDirectionRad)) {
    throw new Error(`Invalid geographic wind direction: ${geographicDirectionRad}`);
  }
  const flowDirection = geographicDirectionRad + Math.PI;
  return Math.atan2(-Math.sin(flowDirection), Math.cos(flowDirection));
}

export function cityWindSpeedLabel(strength) {
  if (!Number.isFinite(strength) || strength < 0) {
    throw new Error(`Invalid city wind strength: ${strength}`);
  }
  if (strength <= 0.18) return "calm";
  if (strength <= 0.42) return "light";
  if (strength <= 0.78) return "moderate";
  return "strong";
}

export function cityWindDirectionLabel(flowDirectionRad) {
  if (!Number.isFinite(flowDirectionRad)) {
    throw new Error(`Invalid city wind flow direction: ${flowDirectionRad}`);
  }
  const x = Math.cos(flowDirectionRad);
  const y = Math.sin(flowDirectionRad);
  const horizontal = x >= 0 ? "right" : "left";
  if (Math.abs(y) < 0.38) return `toward screen ${horizontal}`;
  return `toward ${y < 0 ? "upper" : "lower"} ${horizontal}`;
}
