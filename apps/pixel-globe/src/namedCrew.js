import { validateCharacterSkillIds } from "./characterSkills.js";
import { convertEnglishCatholicCharacter } from "./papalPolitics.js";
import { crewRosterMembers, dismissCrewMember, validateCrewAggregate } from "./crewMembers.js";

export const NAMED_CREW_ROLE_CREWMATE = "crewmate";
export const NAMED_CREW_ROLE_CHEF = "chef";
export const NAMED_CREW_ROLE_HISTORIAN = "historian";

const NAMED_CREW_ROLES = new Set([
  NAMED_CREW_ROLE_CREWMATE,
  NAMED_CREW_ROLE_CHEF,
  NAMED_CREW_ROLE_HISTORIAN
]);

export function createNamedCrewMemory() {
  return [];
}

export function namedCrewMembers(state) {
  const members = state?.namedCrew;
  if (!Array.isArray(members)) throw new Error("Game state requires named crew");
  return members;
}

export function validateNamedCrew(members) {
  if (!Array.isArray(members)) throw new Error("Named crew must be an array");
  const ids = new Set();
  for (const member of members) {
    validateNamedCrewMember(member);
    if (ids.has(member.id)) throw new Error(`Duplicate named crewmate: ${member.id}`);
    ids.add(member.id);
  }
  return members;
}

export function permanentCrewFloor(state) {
  return state?.playerCharacter || state?.ship ? 1 + namedCrewMembers(state).length : 0;
}

export function permanentCrewBerthsRemaining(state, reservedBerths = 0) {
  if (!state?.ship) return 0;
  if (!Number.isInteger(state.ship.crewCapacity) || state.ship.crewCapacity <= 0) {
    throw new Error(`Invalid ship crew capacity: ${state.ship.crewCapacity}`);
  }
  if (!Number.isInteger(reservedBerths) || reservedBerths < 0) {
    throw new Error(`Invalid reserved named crew berths: ${reservedBerths}`);
  }
  const occupiedBerths = permanentCrewFloor(state) + reservedBerths;
  if (occupiedBerths > state.ship.crewCapacity) {
    throw new Error(
      `Permanent crew commitments ${occupiedBerths} exceed ship capacity ${state.ship.crewCapacity}`
    );
  }
  return state.ship.crewCapacity - occupiedBerths;
}

export function hasPermanentCrewBerth(state, reservedBerths = 0) {
  return permanentCrewBerthsRemaining(state, reservedBerths) > 0;
}

export function genericCrewCount(state) {
  if (!state?.ship) return 0;
  const floor = permanentCrewFloor(state);
  if (state.ship.crew === 0 && floor === 1) return 0;
  if (state.ship.crew < floor) {
    throw new Error(`Crew ${state.ship.crew} is below permanent named crew floor ${floor}`);
  }
  const rosterCount = crewRosterMembers(state).length;
  if (state.ship.crew - floor !== rosterCount) {
    throw new Error(`Crew aggregate does not match individual roster: ${state.ship.crew - floor}/${rosterCount}`);
  }
  return rosterCount;
}

export function canAddNamedCrewMember(state) {
  if (!state?.ship || state.ship.crew <= 0) return false;
  return state.ship.crew < state.ship.crewCapacity;
}

export function addNamedCrewMember(
  state,
  character,
  role = NAMED_CREW_ROLE_CREWMATE,
  { replaceGenericWhenFull = false } = {}
) {
  if (!state?.ship) throw new Error("Cannot add named crew without a player ship");
  validateNamedCrewCharacter(character);
  validateNamedCrewRole(role);
  const members = namedCrewMembers(state);
  if (members.some((member) => member.id === character.id)) {
    throw new Error(`${character.name} is already a named crewmate`);
  }
  const visualDouble = members.find((member) => (
    typeof member.sourceId === "string" && member.sourceId !== "" &&
    typeof character.sourceId === "string" && character.sourceId !== "" &&
    member.sourceId === character.sourceId
  ));
  if (visualDouble) {
    throw new Error(`${character.name} repeats ${visualDouble.name}'s named-crewmate portrait`);
  }
  const historicallyCurrentCharacter = state.relations?.papacy?.englishReformationApplied
    ? convertEnglishCatholicCharacter(character)
    : character;
  const entry = Object.freeze({ ...historicallyCurrentCharacter, role, joinedCrew: true });
  if (!canAddNamedCrewMember(state)) {
    if (!replaceGenericWhenFull || genericCrewCount(state) <= 0) {
      throw new Error(`${character.name} cannot join because the ship has no crew berth`);
    }
    const replaced = crewRosterMembers(state).at(-1);
    dismissCrewMember(state, replaced.id);
  }
  state.ship.crew += 1;
  members.push(entry);
  validateNamedCrew(members);
  validateCrewAggregate(state);
  return entry;
}

export function reconcileNamedCrewMember(
  state,
  character,
  role = NAMED_CREW_ROLE_CREWMATE,
  options = {}
) {
  validateNamedCrewCharacter(character);
  validateNamedCrewRole(role);
  const existing = namedCrewMembers(state).find((member) => member.id === character.id) || null;
  if (!existing) {
    return Object.freeze({
      member: addNamedCrewMember(state, character, role, options),
      added: true
    });
  }
  if (existing.role !== role) {
    throw new Error(`Named crewmate reconciliation conflicts with ${character.id}`);
  }
  return Object.freeze({ member: existing, added: false });
}

export function removeNamedCrewMember(state, memberId) {
  const members = namedCrewMembers(state);
  const index = members.findIndex((member) => member.id === memberId);
  if (index < 0) throw new Error(`Unknown named crewmate: ${memberId}`);
  return members.splice(index, 1)[0];
}

export function createNamedCrewDeathNotice(character) {
  validateNamedCrewCharacter(character);
  const lastWords = character.role === NAMED_CREW_ROLE_CHEF
    ? "Keep the stores dry... and do not let a good meal go to waste."
    : character.role === NAMED_CREW_ROLE_HISTORIAN
      ? "Remember me when that bright sail rises over the horizon."
      : "Keep the ship moving. Do not lose the voyage on my account.";
  return Object.freeze({ character, lastWords });
}

export function validateNamedCrewDeathNotices(notices) {
  if (!Array.isArray(notices)) throw new Error("Named crew death notices must be an array");
  for (const notice of notices) {
    if (!notice || typeof notice !== "object") throw new Error("Invalid named crew death notice");
    validateNamedCrewCharacter(notice.character);
    if (typeof notice.lastWords !== "string" || notice.lastWords.trim() === "") {
      throw new Error("Named crew death notice requires last words");
    }
  }
  return notices;
}

function validateNamedCrewMember(member) {
  validateNamedCrewCharacter(member);
  validateNamedCrewRole(member.role);
  if (member.joinedCrew !== true) throw new Error(`Named crewmate ${member.id} is not marked aboard`);
}

function validateNamedCrewCharacter(character) {
  if (!character || typeof character !== "object") throw new Error("Named crew requires a character");
  if (typeof character.id !== "string" || character.id.trim() === "") {
    throw new Error("Named crewmate requires an id");
  }
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Named crewmate requires a name");
  }
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error(`Named crewmate ${character.name} requires portrait expressions`);
  }
  validateCharacterSkillIds(character.skillIds);
}

function validateNamedCrewRole(role) {
  if (!NAMED_CREW_ROLES.has(role)) throw new Error(`Unknown named crew role: ${role}`);
}
