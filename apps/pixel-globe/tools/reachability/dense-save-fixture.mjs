import { characterWithBiography } from "../../src/characterBiography.js";

const DENSE_RUNTIME_PLAYER_CHARACTER = Object.freeze(characterWithBiography({
  id: "player:dense-save-captain",
  name: "Jane Smith",
  givenName: "Jane",
  familyName: "Smith",
  gender: "female",
  sex: "female",
  region: "northern-europe",
  sourceId: "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women",
  sourceLabel: "Blond Villager Women",
  sourceRoles: Object.freeze(["factor", "civilian"]),
  sourceRegions: Object.freeze(["global", "europe", "northern-europe", "mediterranean"]),
  requiredReligionFamily: null,
  minAge: 20,
  maxAge: 34,
  age: 30,
  role: "player-captain",
  nameCulture: "english",
  nationalityId: "england",
  nationalityName: "Kingdom of England",
  nationalityAdjective: "English",
  homePortCityId: "london|united kingdom",
  homePortTileId: 1,
  homePortName: "London",
  homePortCountry: "United Kingdom",
  religionId: "roman-catholic",
  expressions: Object.freeze(["neutral", "happy"])
}));

export function browserAdaptedDenseFixture(save, name) {
  const captain = save.payload?.gameState?.playerCharacter;
  if (captain?.id !== "player:dense-save-captain") {
    throw new Error(`${name} has lost its dense-fixture captain identity`);
  }
  if (
    captain.name === "Dense Save Captain" &&
    captain.givenName === "Dense" &&
    captain.familyName === "Captain" &&
    captain.nameCulture === "english"
  ) {
    save.payload.gameState.playerCharacter = {
      ...structuredClone(DENSE_RUNTIME_PLAYER_CHARACTER),
      skillIds: structuredClone(captain.skillIds)
    };
  }
  const runtimeCaptain = save.payload.gameState.playerCharacter;
  if (
    runtimeCaptain.name !== "Jane Smith" ||
    runtimeCaptain.sourceId !==
      "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women" ||
    runtimeCaptain.role !== "player-captain" ||
    typeof runtimeCaptain.birthDateLabel !== "string" ||
    typeof runtimeCaptain.nationalityAdjective !== "string"
  ) {
    throw new Error(`${name} has an invalid dense-fixture runtime captain`);
  }
  return save;
}
