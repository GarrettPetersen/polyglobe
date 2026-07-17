export const INTERACTION_INPUT = Object.freeze({
  OPTIONS: "options",
  CREDITS: "credits",
  PAST_VOYAGES: "past-voyages",
  START_MENU: "start-menu",
  CAPTAIN_ALERT: "captain-alert",
  PLAYER_INTRO: "player-intro",
  GAME_OVER: "game-over",
  CAPTAIN_MENU: "captain-menu",
  SHIP_INFO: "ship-info",
  POLITICS: "politics",
  DISCOVERIES: "discoveries",
  NAVIGATION: "navigation",
  DIALOGUE: "dialogue",
  PORT_WAIT: "port-wait",
  FISHING: "fishing",
  WORLD: "world"
});

const INPUT_PRIORITY = Object.freeze([
  ["optionsActive", INTERACTION_INPUT.OPTIONS],
  ["creditsActive", INTERACTION_INPUT.CREDITS],
  ["pastVoyagesActive", INTERACTION_INPUT.PAST_VOYAGES],
  ["startMenuActive", INTERACTION_INPUT.START_MENU],
  ["captainAlertActive", INTERACTION_INPUT.CAPTAIN_ALERT],
  ["playerIntroActive", INTERACTION_INPUT.PLAYER_INTRO],
  ["gameOverActive", INTERACTION_INPUT.GAME_OVER],
  ["captainMenuActive", INTERACTION_INPUT.CAPTAIN_MENU],
  ["shipInfoActive", INTERACTION_INPUT.SHIP_INFO],
  ["politicsActive", INTERACTION_INPUT.POLITICS],
  ["discoveriesActive", INTERACTION_INPUT.DISCOVERIES],
  ["navigationActive", INTERACTION_INPUT.NAVIGATION],
  ["dialogueActive", INTERACTION_INPUT.DIALOGUE],
  ["portWaitActive", INTERACTION_INPUT.PORT_WAIT],
  ["fishingActive", INTERACTION_INPUT.FISHING]
]);

export function interactionInputOwner(state) {
  if (!state || typeof state !== "object") throw new Error("Interaction input state is required");
  for (const [key, owner] of INPUT_PRIORITY) {
    if (typeof state[key] !== "boolean") throw new Error(`Interaction input state ${key} must be boolean`);
    if (state[key]) return owner;
  }
  return INTERACTION_INPUT.WORLD;
}
