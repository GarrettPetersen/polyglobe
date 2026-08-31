import { createGameState } from "../gameState.js";

const DEFAULT_TEST_HOME = Object.freeze({
  homePortCityId: "test-home|test",
  homePortTileId: 1,
  homePortName: "Test Home",
  homePortCountry: "Test"
});

export const DEFAULT_TEST_PLAYER_CHARACTER = Object.freeze({
  ...DEFAULT_TEST_HOME,
  id: "player:test-captain",
  name: "Test Captain",
  nationalityId: "england",
  religionId: "roman-catholic",
  expressions: Object.freeze(["neutral", "happy"])
});

export function createTestGameState(options = {}) {
  if (!options.playerCharacter) return createGameState(options);
  const playerCharacter = {
    ...(typeof options.playerCharacter.homePortCityId === "string" ? {} : DEFAULT_TEST_HOME),
    id: options.playerCharacter.id || "player:test-captain",
    ...options.playerCharacter
  };
  return createGameState({ ...options, playerCharacter });
}

export function createPlayerTestGameState(options = {}) {
  return createTestGameState({
    ...options,
    playerCharacter: Object.prototype.hasOwnProperty.call(options, "playerCharacter")
      ? options.playerCharacter
      : DEFAULT_TEST_PLAYER_CHARACTER
  });
}
