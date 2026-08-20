import {
  ABOARD_ROLE_CAPTIVE,
  ABOARD_ROLE_COLONY_LEADER,
  ABOARD_ROLE_EMISSARY,
  ABOARD_ROLE_PASSENGER
} from "./aboardRoster.js";

const RETIREMENT_BLOCKING_ROLES = new Set([
  ABOARD_ROLE_PASSENGER,
  ABOARD_ROLE_EMISSARY,
  ABOARD_ROLE_CAPTIVE,
  ABOARD_ROLE_COLONY_LEADER
]);

export function campaignRetirementObligation(travelerGroups, namedEntries) {
  if (!Array.isArray(travelerGroups)) throw new Error("Retirement obligation requires traveler groups");
  if (!Array.isArray(namedEntries)) throw new Error("Retirement obligation requires named people aboard");
  const travelerCount = travelerGroups.reduce((total, group) => {
    if (!group || !Number.isInteger(group.count) || group.count < 0) {
      throw new Error(`Invalid retirement traveler group count: ${group?.count}`);
    }
    return total + group.count;
  }, 0);
  if (travelerCount === 0) return null;
  const entry = namedEntries.find((candidate) => RETIREMENT_BLOCKING_ROLES.has(candidate?.role));
  if (!entry?.character?.name) {
    throw new Error(`${travelerCount} retirement-blocking travelers have no named representative`);
  }
  const destinationName = entry.goal?.destinationName;
  if (typeof destinationName !== "string" || destinationName.trim() === "") {
    throw new Error(`${entry.character.name} has no retirement-blocking destination`);
  }
  return Object.freeze({
    travelerName: entry.character.name,
    destinationName: destinationName.trim(),
    additionalTravelerCount: travelerCount - 1
  });
}
