import { precipitationKindForConditions } from "./precipitation.js";

export function portCityWeatherPresentation({ wind, nearbyConditions }) {
  if (!Number.isFinite(wind?.directionRad)) {
    throw new Error("Port city weather requires a finite wind direction");
  }
  if (!Number.isFinite(wind?.strength) || wind.strength < 0 || wind.strength > 1) {
    throw new Error(`Port city weather wind strength must be within 0..1: ${wind?.strength}`);
  }
  if (!Array.isArray(nearbyConditions) || nearbyConditions.length === 0) {
    throw new Error("Port city weather requires at least one nearby condition sample");
  }
  for (const [index, condition] of nearbyConditions.entries()) {
    if (typeof condition?.raining !== "boolean" || typeof condition?.snowing !== "boolean" ||
        !Number.isFinite(condition?.stormIntensity) || condition.stormIntensity < 0 ||
        condition.stormIntensity > 1) {
      throw new Error(`Invalid port city weather sample at index ${index}`);
    }
  }
  const snowing = nearbyConditions.some((condition) => condition.snowing);
  const raining = nearbyConditions.some((condition) => condition.raining);
  const stormIntensity = Math.max(...nearbyConditions.map((condition) => condition.stormIntensity));
  const kind = precipitationKindForConditions({
    raining,
    snowing,
    storming: stormIntensity >= 0.72
  });
  const precipitationIntensity = kind === null
    ? 0
    : Math.min(1, Math.max(
        stormIntensity,
        snowing ? 0.4 : 0,
        raining ? 0.46 : 0
      ));
  return Object.freeze({
    wind: Object.freeze({
      directionRad: wind.directionRad,
      strength: wind.strength
    }),
    precipitation: Object.freeze({ kind, intensity: precipitationIntensity })
  });
}
