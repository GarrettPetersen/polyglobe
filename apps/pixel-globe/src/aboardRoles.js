import {
  TRAVELER_KIND_CAPTIVE,
  TRAVELER_KIND_ENVOY,
  TRAVELER_KIND_PASSENGER,
  TRAVELER_KIND_SETTLER,
  completeTravelerKindRecord
} from "./travelerKinds.js";

export const ABOARD_ROLE_CAPTAIN = "captain";
export const ABOARD_ROLE_PASSENGER = "passenger";
export const ABOARD_ROLE_EMISSARY = "emissary";
export const ABOARD_ROLE_CAPTIVE = "captive";
export const ABOARD_ROLE_COLONY_LEADER = "colony-leader";
export const ABOARD_ROLE_CREWMATE = "crewmate";
export const ABOARD_ROLE_COLONIST = "colonist";
export const ABOARD_ROLE_ANIMAL = "animal";

export const ABOARD_TRAVELER_ROLE = completeTravelerKindRecord({
  [TRAVELER_KIND_PASSENGER]: ABOARD_ROLE_PASSENGER,
  [TRAVELER_KIND_ENVOY]: ABOARD_ROLE_EMISSARY,
  [TRAVELER_KIND_CAPTIVE]: ABOARD_ROLE_CAPTIVE,
  [TRAVELER_KIND_SETTLER]: ABOARD_ROLE_COLONIST
}, "Aboard traveler roles");

const ABOARD_ROLES = new Set([
  ABOARD_ROLE_CAPTAIN,
  ABOARD_ROLE_PASSENGER,
  ABOARD_ROLE_EMISSARY,
  ABOARD_ROLE_CAPTIVE,
  ABOARD_ROLE_COLONY_LEADER,
  ABOARD_ROLE_CREWMATE,
  ABOARD_ROLE_COLONIST,
  ABOARD_ROLE_ANIMAL
]);

/** @param {string} role */
export function aboardRoleSkillsAreActive(role) {
  if (!ABOARD_ROLES.has(role)) throw new Error(`Unknown aboard role: ${role}`);
  return role !== ABOARD_ROLE_CAPTIVE;
}
