export const ABOARD_ROLE_CAPTAIN = "captain";
export const ABOARD_ROLE_PASSENGER = "passenger";
export const ABOARD_ROLE_EMISSARY = "emissary";
export const ABOARD_ROLE_COLONY_LEADER = "colony-leader";
export const ABOARD_ROLE_CREWMATE = "crewmate";
export const ABOARD_ROLE_COLONIST = "colonist";

const TRAVELER_ROLE = Object.freeze({
  passenger: ABOARD_ROLE_PASSENGER,
  envoy: ABOARD_ROLE_EMISSARY,
  settler: ABOARD_ROLE_COLONIST
});

export function aboardRoster({
  captain,
  crewCount,
  travelerGroups = [],
  namedTraveler = null,
  colonyLeader = null
}) {
  if (!captain || typeof captain !== "object" || !captain.name) {
    throw new Error("Aboard roster requires a named captain");
  }
  assertCount(crewCount, "crew");
  if (!Array.isArray(travelerGroups)) throw new Error("Aboard travelers must be an array");

  const remainingTravelers = new Map();
  for (const group of travelerGroups) {
    if (!group || !TRAVELER_ROLE[group.kind]) {
      throw new Error(`Unknown aboard traveler kind: ${group?.kind}`);
    }
    assertCount(group.count, `${group.kind} travelers`);
    remainingTravelers.set(
      group.kind,
      (remainingTravelers.get(group.kind) || 0) + group.count
    );
  }

  const named = [namedEntry("captain", captain, ABOARD_ROLE_CAPTAIN)];
  if (namedTraveler) {
    const { character, kind } = namedTraveler;
    if (!character || typeof character !== "object" || !character.name) {
      throw new Error("Named aboard traveler requires a character");
    }
    if (kind !== "passenger" && kind !== "envoy") {
      throw new Error(`Named aboard traveler has invalid kind: ${kind}`);
    }
    consumeTraveler(remainingTravelers, kind);
    named.push(namedEntry(`traveler:${kind}`, character, TRAVELER_ROLE[kind]));
  }
  if (colonyLeader) {
    if (typeof colonyLeader !== "object" || !colonyLeader.name) {
      throw new Error("Aboard colony leader requires a character");
    }
    consumeTraveler(remainingTravelers, "settler");
    named.push(namedEntry("colony-leader", colonyLeader, ABOARD_ROLE_COLONY_LEADER));
  }

  const generic = [];
  for (let index = 0; index < crewCount; index++) {
    generic.push(genericEntry(`crew:${index}`, ABOARD_ROLE_CREWMATE));
  }
  for (const kind of ["passenger", "envoy", "settler"]) {
    const count = remainingTravelers.get(kind) || 0;
    for (let index = 0; index < count; index++) {
      generic.push(genericEntry(`${kind}:${index}`, TRAVELER_ROLE[kind]));
    }
  }

  return Object.freeze({
    count: named.length + generic.length,
    named: Object.freeze(named),
    generic: Object.freeze(generic)
  });
}

function consumeTraveler(groups, kind) {
  const count = groups.get(kind) || 0;
  if (count <= 0) throw new Error(`Named ${kind} is not present in the traveler manifest`);
  groups.set(kind, count - 1);
}

function namedEntry(id, character, role) {
  return Object.freeze({ id, kind: "named", character, role });
}

function genericEntry(id, role) {
  return Object.freeze({ id, kind: "generic", character: null, role });
}

function assertCount(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid aboard ${label} count: ${value}`);
}
