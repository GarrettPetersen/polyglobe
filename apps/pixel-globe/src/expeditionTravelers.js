import {
  TRAVELER_KIND_SETTLER,
  TRAVELER_KIND_SOLDIER
} from "./travelerKinds.js";

const CONQUISTADOR_MOUNTED_RATIO = 1 / 6;
const CONQUISTADOR_GUNNER_RATIO = 1 / 4;

export function colonistSexes(count, expeditionId) {
  requireCount(count, "colonist");
  requireId(expeditionId, "Colonist expedition");
  const startsFemale = (hashString32(`${expeditionId}|sex-order`) & 1) === 0;
  return Object.freeze(Array.from({ length: count }, (_, index) => (
    (index % 2 === 0) === startsFemale ? "female" : "male"
  )));
}

export function createColonistTravelerPeople({
  count,
  expeditionId,
  originCityId,
  appearanceIds,
  identityForPerson
}) {
  const sexes = colonistSexes(count, expeditionId);
  return createTravelerPeople({
    kind: TRAVELER_KIND_SETTLER,
    expeditionId,
    originCityId,
    appearances: appearanceIds,
    sexes,
    identityForPerson,
    combatRoles: null
  });
}

export function createConquistadorTravelerPeople({
  count,
  expeditionId,
  originCityId,
  identityForPerson
}) {
  requireCount(count, "conquistador");
  const mountedCount = count === 0
    ? 0
    : Math.max(1, Math.round(count * CONQUISTADOR_MOUNTED_RATIO));
  const gunnerCount = Math.min(
    count - mountedCount,
    Math.max(1, Math.round(count * CONQUISTADOR_GUNNER_RATIO))
  );
  const combatRoles = Array.from({ length: count }, (_, index) => {
    if (index < mountedCount) {
      return Object.freeze({ appearanceId: "cavalier-covered", crewTypeId: "swordsman" });
    }
    if (index < mountedCount + gunnerCount) {
      return Object.freeze({ appearanceId: "gunner-light", crewTypeId: "gunner" });
    }
    return (index - mountedCount - gunnerCount) % 3 === 0
      ? Object.freeze({ appearanceId: "spearman-light", crewTypeId: "spearman" })
      : Object.freeze({ appearanceId: "swordsman-light", crewTypeId: "swordsman" });
  });
  return createTravelerPeople({
    kind: TRAVELER_KIND_SOLDIER,
    expeditionId,
    originCityId,
    appearances: combatRoles.map(({ appearanceId }) => appearanceId),
    sexes: Array(count).fill("male"),
    identityForPerson,
    combatRoles
  });
}

function createTravelerPeople({
  kind,
  expeditionId,
  originCityId,
  appearances,
  sexes,
  identityForPerson,
  combatRoles
}) {
  requireId(expeditionId, "Expedition");
  requireId(originCityId, "Expedition origin city");
  if (!Array.isArray(appearances) || appearances.length !== sexes.length ||
      appearances.some((appearanceId) => typeof appearanceId !== "string" || appearanceId === "")) {
    throw new Error(`Expedition appearances do not match its ${sexes.length} people`);
  }
  if (typeof identityForPerson !== "function") {
    throw new Error("Expedition people require an identity factory");
  }
  const ids = new Set();
  return Object.freeze(sexes.map((sex, index) => {
    const id = `${expeditionId}:${kind}:${index + 1}`;
    if (ids.has(id)) throw new Error(`Duplicate expedition person ID: ${id}`);
    ids.add(id);
    const identity = identityForPerson({ id, sex });
    if (!identity || typeof identity.givenName !== "string" || identity.givenName === "") {
      throw new Error(`Expedition person has no first name: ${id}`);
    }
    const combatRole = combatRoles?.[index] || null;
    return Object.freeze({
      id,
      kind,
      name: identity.givenName,
      fullName: identity.name || identity.givenName,
      nameCulture: identity.nameCulture,
      religionId: identity.religionId,
      homePortCityId: originCityId,
      sex,
      appearanceId: appearances[index],
      ...(combatRole
        ? {
            crewTypeId: combatRole.crewTypeId,
            experienceStars: 2,
            auxiliary: true
          }
        : {})
    });
  }));
}

function requireCount(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${label} count: ${value}`);
  }
}

function requireId(value, label) {
  if (typeof value !== "string" || value === "") throw new Error(`${label} requires an ID`);
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
