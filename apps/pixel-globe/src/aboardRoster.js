import {
  TRAVELER_KINDS,
  TRAVELER_KIND_SETTLER,
  assertNamedTravelerKind,
  assertTravelerGroup
} from "./travelerKinds.js";
import {
  ABOARD_ROLE_ANIMAL,
  ABOARD_ROLE_CAPTAIN,
  ABOARD_ROLE_CAPTIVE,
  ABOARD_ROLE_COLONIST,
  ABOARD_ROLE_COLONY_LEADER,
  ABOARD_ROLE_CREWMATE,
  ABOARD_ROLE_EMISSARY,
  ABOARD_ROLE_PASSENGER,
  ABOARD_ROLE_SOLDIER,
  ABOARD_TRAVELER_ROLE
} from "./aboardRoles.js";

export {
  ABOARD_ROLE_ANIMAL,
  ABOARD_ROLE_CAPTAIN,
  ABOARD_ROLE_CAPTIVE,
  ABOARD_ROLE_COLONIST,
  ABOARD_ROLE_COLONY_LEADER,
  ABOARD_ROLE_CREWMATE,
  ABOARD_ROLE_EMISSARY,
  ABOARD_ROLE_PASSENGER,
  ABOARD_ROLE_SOLDIER,
  aboardRoleSkillsAreActive
} from "./aboardRoles.js";

export function aboardRoster({
  captain,
  crewCount,
  crewMembers = [],
  namedCrew = [],
  travelerGroups = [],
  namedTravelers = [],
  colonyLeader = null,
  animalCompanions = []
}) {
  if (!captain || typeof captain !== "object" || !captain.name) {
    throw new Error("Aboard roster requires a named captain");
  }
  assertCount(crewCount, "crew");
  if (!Array.isArray(crewMembers)) throw new Error("Individual aboard crew must be an array");
  if (!Array.isArray(namedCrew)) throw new Error("Named aboard crew must be an array");
  if (!Array.isArray(travelerGroups)) throw new Error("Aboard travelers must be an array");
  if (!Array.isArray(namedTravelers)) throw new Error("Named aboard travelers must be an array");
  if (!Array.isArray(animalCompanions)) throw new Error("Aboard animal companions must be an array");

  const remainingTravelers = new Map();
  for (const group of travelerGroups) {
    assertTravelerGroup(group, "Aboard traveler");
    remainingTravelers.set(
      group.kind,
      (remainingTravelers.get(group.kind) || 0) + group.count
    );
  }

  const named = [namedEntry("captain", captain, ABOARD_ROLE_CAPTAIN)];
  for (const character of namedCrew) {
    if (!character || typeof character !== "object" || !character.name) {
      throw new Error("Named aboard crewmate requires a character");
    }
    named.push(namedEntry(`crew:${character.id}`, character, ABOARD_ROLE_CREWMATE));
  }
  for (const namedTraveler of namedTravelers) {
    const { character, kind } = namedTraveler;
    if (!character || typeof character !== "object" || !character.name) {
      throw new Error("Named aboard traveler requires a character");
    }
    assertNamedTravelerKind(kind, "Named aboard traveler");
    consumeTraveler(remainingTravelers, kind);
    named.push(namedEntry(`traveler:${kind}:${character.id}`, character, ABOARD_TRAVELER_ROLE[kind]));
  }
  if (colonyLeader) {
    if (typeof colonyLeader !== "object" || !colonyLeader.name) {
      throw new Error("Aboard colony leader requires a character");
    }
    consumeTraveler(remainingTravelers, TRAVELER_KIND_SETTLER);
    named.push(namedEntry("colony-leader", colonyLeader, ABOARD_ROLE_COLONY_LEADER));
  }
  for (const character of animalCompanions) {
    if (!character || typeof character !== "object" || !character.name) {
      throw new Error("Aboard animal companion requires a character");
    }
    named.push(namedEntry(`animal:${character.id}`, character, ABOARD_ROLE_ANIMAL));
  }

  const genericCrewCount = crewCount - 1 - namedCrew.length;
  if (genericCrewCount < 0 && crewCount !== 0) {
    throw new Error(`Crew ${crewCount} cannot contain captain and ${namedCrew.length} named crewmates`);
  }
  const generic = [];
  if (crewMembers.length !== Math.max(0, genericCrewCount)) {
    throw new Error(
      `Individual crew roster ${crewMembers.length} does not match ordinary crew ${Math.max(0, genericCrewCount)}`
    );
  }
  for (const member of crewMembers) {
    if (!member || typeof member.id !== "string" || member.id === "" ||
        typeof member.name !== "string" || member.name === "") {
      throw new Error("Individual aboard crewmate requires an ID and name");
    }
    generic.push(genericEntry(`crew:${member.id}`, ABOARD_ROLE_CREWMATE, member));
  }
  for (const kind of TRAVELER_KINDS) {
    const count = remainingTravelers.get(kind) || 0;
    for (let index = 0; index < count; index++) {
      generic.push(genericEntry(`${kind}:${index}`, ABOARD_TRAVELER_ROLE[kind]));
    }
  }

  return Object.freeze({
    count: named.length + generic.length - animalCompanions.length,
    named: Object.freeze(named),
    generic: Object.freeze(generic)
  });
}

export function aboardCharacterHomePortTileId(entry, {
  activeTravelQuest = null,
  rescuedTravelers = [],
  historianHomePortTileId = null
} = {}) {
  if (!entry || entry.kind !== "named" || !entry.character) {
    throw new Error("Aboard home port requires a named character entry");
  }
  if (!Array.isArray(rescuedTravelers)) {
    throw new Error("Aboard home port requires a rescued traveler list");
  }

  const character = entry.character;
  const rescuedTraveler = rescuedTravelers.find((traveler) => (
    traveler?.character?.id === character.id
  ));
  if (rescuedTraveler) {
    return requiredTileId(
      rescuedTraveler.homePortTileId,
      `${character.name} rescued traveler home port`
    );
  }

  if (entry.role === ABOARD_ROLE_PASSENGER || entry.role === ABOARD_ROLE_CAPTIVE) {
    return firstTileId([
      character.destinationPortTileId,
      activeTravelQuest?.destinationTileId,
      character.homePortTileId
    ], `${character.name} passenger home port`);
  }
  if (entry.role === ABOARD_ROLE_EMISSARY) {
    return firstTileId([
      character.originPortTileId,
      activeTravelQuest?.originTileId,
      character.homePortTileId
    ], `${character.name} emissary home port`);
  }

  return firstTileId([
    character.homePortTileId,
    entry.role === ABOARD_ROLE_CREWMATE && character.role === "historian"
      ? historianHomePortTileId
      : null
  ], `${character.name} home port`);
}

export function aboardCharacterHomePortCityId(entry, {
  activeTravelQuest = null,
  rescuedTravelers = [],
  historianHomePortCityId = null
} = {}) {
  if (!entry || entry.kind !== "named" || !entry.character) {
    throw new Error("Aboard home port requires a named character entry");
  }
  if (!Array.isArray(rescuedTravelers)) {
    throw new Error("Aboard home port requires a rescued traveler list");
  }

  const character = entry.character;
  const rescuedTraveler = rescuedTravelers.find((traveler) => (
    traveler?.character?.id === character.id
  ));
  if (rescuedTraveler) {
    return requiredCityId(
      rescuedTraveler.homePortCityId,
      `${character.name} rescued traveler home port`
    );
  }

  if (entry.role === ABOARD_ROLE_PASSENGER || entry.role === ABOARD_ROLE_CAPTIVE) {
    return firstCityId([
      character.destinationPortCityId,
      activeTravelQuest?.destinationCityId,
      character.homePortCityId
    ], `${character.name} passenger home port`);
  }
  if (entry.role === ABOARD_ROLE_EMISSARY) {
    return firstCityId([
      character.originPortCityId,
      activeTravelQuest?.originCityId,
      character.homePortCityId
    ], `${character.name} emissary home port`);
  }

  return firstCityId([
    character.homePortCityId,
    entry.role === ABOARD_ROLE_CREWMATE && character.role === "historian"
      ? historianHomePortCityId
      : null
  ], `${character.name} home port`);
}

function consumeTraveler(groups, kind) {
  const count = groups.get(kind) || 0;
  if (count <= 0) throw new Error(`Named ${kind} is not present in the traveler manifest`);
  groups.set(kind, count - 1);
}

function firstCityId(values, label) {
  const cityId = values.find((value) => typeof value === "string" && value !== "");
  return requiredCityId(cityId, label);
}

function requiredCityId(value, label) {
  if (typeof value !== "string" || value === "") throw new Error(`Missing ${label}`);
  return value;
}

function namedEntry(id, character, role) {
  return Object.freeze({ id, kind: "named", character, role });
}

function genericEntry(id, role, crewMember = null) {
  return Object.freeze({ id, kind: "generic", character: null, crewMember, role });
}

function assertCount(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid aboard ${label} count: ${value}`);
}

function firstTileId(candidates, label) {
  const tileId = candidates.find((candidate) => Number.isInteger(candidate) && candidate >= 0);
  return requiredTileId(tileId, label);
}

function requiredTileId(tileId, label) {
  if (!Number.isInteger(tileId) || tileId < 0) throw new Error(`Missing ${label}`);
  return tileId;
}
