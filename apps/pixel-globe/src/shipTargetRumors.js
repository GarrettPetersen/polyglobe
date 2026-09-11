import { greatCircleDistanceKm, initialBearingDeg } from "./worldDistance.js";

export const SHIP_TARGET_RUMOR_INTERVAL_MINUTES = 7 * 1440;
const KINDS = new Set(["wokou", "revenge"]);
function keyFor(kind) {
  if (!KINDS.has(kind)) throw new Error(`Unknown ship-target rumor kind: ${kind}`);
  // Two bounded cooldown slots in the existing extensible decision journal.
  return `ship-target-rumor.${kind}`;
}
export function shipTargetRumorEligible(decisions, kind, simMinute, roll) {
  const key = keyFor(kind);
  if (!Number.isFinite(simMinute) || simMinute < 0 || !Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error("Ship-target rumor requires a valid clock and random roll");
  }
  const previous = decisions[key];
  if (previous !== undefined && (!Number.isFinite(previous) || previous < 0 || previous > simMinute)) {
    throw new Error(`Invalid ship-target rumor clock: ${key}`);
  }
  return roll < 0.35 && (previous === undefined || simMinute - previous >= SHIP_TARGET_RUMOR_INTERVAL_MINUTES);
}
export function recordShipTargetRumor(decisions, kind, simMinute) {
  if (!shipTargetRumorEligible(decisions, kind, simMinute, 0)) throw new Error("Ship-target sighting repeated too soon");
  decisions[keyFor(kind)] = simMinute;
}
export function shipTargetRumorText(label, position, reference) {
  if (typeof label !== "string" || !label || !reference?.city) throw new Error("Ship-target rumor requires named ship and port");
  const distanceKm = greatCircleDistanceKm(reference, position);
  const direction = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(initialBearingDeg(reference, position) / 45) % 8];
  const leagues = Math.max(1, Math.round(distanceKm / 5.556));
  const city = reference.displayCity || reference.city;
  return distanceKm < 10
    ? `There is fresh word of ${label} off ${city}. Keep a sharp lookout as you approach.`
    : `There is fresh word of ${label}, some ${leagues} leagues ${direction} of ${city}. Keep a sharp lookout in those waters.`;
}
