export const VOYAGE_START_PROFILE_VERSION = 1;

export function captureVoyageStartProfile(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Voyage start profile requires game state");
  }
  if (state.voyageStartProfile !== null) {
    throw new Error("Voyage start profile has already been captured");
  }
  const character = state.playerCharacter;
  if (!character || typeof character !== "object") {
    throw new Error("Voyage start profile requires a player character");
  }
  const ship = state.ship;
  if (!ship || typeof ship !== "object") {
    throw new Error("Voyage start profile requires player ship state");
  }
  const loadout = ship.loadoutTargets;
  if (!loadout || typeof loadout !== "object") {
    throw new Error("Voyage start profile requires an initial loadout");
  }
  if (!Array.isArray(character.skillIds) || character.skillIds.length < 1) {
    throw new Error("Voyage start profile requires captain skills");
  }
  const profile = {
    version: VOYAGE_START_PROFILE_VERSION,
    mainQuest: requiredShortString(state.memory?.campaignGoal?.type || "none", "main quest"),
    faction: requiredShortString(character.nationalityId, "captain faction"),
    ship: requiredShortString(ship.slug, "starting ship"),
    homePort: requiredShortString(character.homePortName, "home port"),
    startRegion: requiredShortString(character.startRegion, "start region"),
    captainReligion: requiredShortString(character.religionId || "unknown", "captain religion"),
    captainSex: requiredShortString(character.sex, "captain sex"),
    captainSkills: requiredShortString(character.skillIds.join(","), "captain skills"),
    loadout: requiredShortString(ship.loadoutId || "provisional-short-haul", "starting loadout"),
    captainAge: nonNegativeNumber(character.age, "captain age"),
    startingCrew: nonNegativeNumber(ship.crew, "starting crew"),
    startingCannons: nonNegativeNumber(ship.cannons, "starting cannons"),
    cargoCapacity: nonNegativeNumber(state.cargoCapacity, "starting cargo capacity"),
    foodDays: nonNegativeNumber(loadout.foodDays, "starting food days"),
    waterDays: nonNegativeNumber(loadout.waterDays, "starting water days"),
    startingDoubloons: nonNegativeNumber(state.doubloons, "starting doubloons")
  };
  validateVoyageStartProfile(profile);
  state.voyageStartProfile = Object.freeze(profile);
  return state.voyageStartProfile;
}

export function validateVoyageStartProfile(profile) {
  if (profile === null) return null;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("Voyage start profile must be null or an object");
  }
  if (profile.version !== VOYAGE_START_PROFILE_VERSION) {
    throw new Error(`Unsupported voyage start profile version: ${profile.version ?? "missing"}`);
  }
  requiredShortString(profile.mainQuest, "main quest");
  requiredShortString(profile.faction, "captain faction");
  requiredShortString(profile.ship, "starting ship");
  requiredShortString(profile.homePort, "home port");
  requiredShortString(profile.startRegion, "start region");
  requiredShortString(profile.captainReligion, "captain religion");
  requiredShortString(profile.captainSex, "captain sex");
  requiredShortString(profile.captainSkills, "captain skills");
  requiredShortString(profile.loadout, "starting loadout");
  nonNegativeNumber(profile.captainAge, "captain age");
  nonNegativeNumber(profile.startingCrew, "starting crew");
  nonNegativeNumber(profile.startingCannons, "starting cannons");
  nonNegativeNumber(profile.cargoCapacity, "starting cargo capacity");
  nonNegativeNumber(profile.foodDays, "starting food days");
  nonNegativeNumber(profile.waterDays, "starting water days");
  nonNegativeNumber(profile.startingDoubloons, "starting doubloons");
  return profile;
}

function requiredShortString(value, label) {
  if (typeof value !== "string" || value.trim() === "" || value.length > 160) {
    throw new Error(`Invalid voyage start ${label}: ${value}`);
  }
  return value;
}

function nonNegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid voyage start ${label}: ${value}`);
  }
  return value;
}
