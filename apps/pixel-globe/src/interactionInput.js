export const INTERACTION_INPUT = Object.freeze({
  TELEMETRY_CONSENT: "telemetry-consent",
  OPTIONS: "options",
  CREDITS: "credits",
  PAST_VOYAGES: "past-voyages",
  START_MENU: "start-menu",
  CAPTAIN_ALERT: "captain-alert",
  PLAYER_INTRO: "player-intro",
  GAME_OVER: "game-over",
  CAPTAIN_MENU: "captain-menu",
  ABOARD: "aboard",
  SHIP_INFO: "ship-info",
  POLITICS: "politics",
  DISCOVERIES: "discoveries",
  ACHIEVEMENTS: "achievements",
  NAVIGATION: "navigation",
  DIALOGUE: "dialogue",
  PORT_WAIT: "port-wait",
  FISHING: "fishing",
  WORLD: "world"
});

export const WORLD_POINTER_ACTION = Object.freeze({
  BROADSIDE: "broadside",
  INTERACTION: "interaction",
  STEER: "steer"
});

const INPUT_PRIORITY = Object.freeze([
  ["telemetryConsentActive", INTERACTION_INPUT.TELEMETRY_CONSENT],
  ["optionsActive", INTERACTION_INPUT.OPTIONS],
  ["creditsActive", INTERACTION_INPUT.CREDITS],
  ["pastVoyagesActive", INTERACTION_INPUT.PAST_VOYAGES],
  ["achievementsActive", INTERACTION_INPUT.ACHIEVEMENTS],
  ["startMenuActive", INTERACTION_INPUT.START_MENU],
  ["captainAlertActive", INTERACTION_INPUT.CAPTAIN_ALERT],
  ["playerIntroActive", INTERACTION_INPUT.PLAYER_INTRO],
  ["gameOverActive", INTERACTION_INPUT.GAME_OVER],
  ["captainMenuActive", INTERACTION_INPUT.CAPTAIN_MENU],
  ["aboardActive", INTERACTION_INPUT.ABOARD],
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

export function captainMenuShortcutAvailable({
  blockingMenu,
  blockingModal,
  dialogueActive
}) {
  for (const [label, value] of Object.entries({
    blockingMenu,
    blockingModal,
    dialogueActive
  })) {
    if (typeof value !== "boolean") {
      throw new Error(`Captain menu shortcut state ${label} must be boolean`);
    }
  }
  return !blockingMenu && !blockingModal && !dialogueActive;
}

export function worldPointerAction({
  interactionCandidate = null,
  combatShipBroadside = null,
  combatShipEngaged = false,
  pointBroadside = null
} = {}) {
  assertBroadsideSide(combatShipBroadside, "combat ship");
  assertBroadsideSide(pointBroadside, "pointer");
  if (typeof combatShipEngaged !== "boolean") {
    throw new Error(`Combat ship engagement must be boolean: ${combatShipEngaged}`);
  }
  if (interactionCandidate !== null && (
    typeof interactionCandidate !== "object" ||
    typeof interactionCandidate.exact !== "boolean" ||
    !interactionCandidate.target ||
    typeof interactionCandidate.target.kind !== "string"
  )) {
    throw new Error("World pointer interaction candidate is malformed");
  }
  if (combatShipBroadside && interactionCandidate?.target.kind !== "ship") {
    throw new Error("Combat ship broadside requires a clicked ship target");
  }
  if (combatShipEngaged && interactionCandidate?.target.kind !== "ship") {
    throw new Error("Combat ship engagement requires a clicked ship target");
  }
  if (combatShipBroadside) {
    return { type: WORLD_POINTER_ACTION.BROADSIDE, sideName: combatShipBroadside };
  }
  if (combatShipEngaged) return { type: WORLD_POINTER_ACTION.STEER };
  if (interactionCandidate?.exact) {
    return { type: WORLD_POINTER_ACTION.INTERACTION, target: interactionCandidate.target };
  }
  if (pointBroadside) {
    return { type: WORLD_POINTER_ACTION.BROADSIDE, sideName: pointBroadside };
  }
  if (interactionCandidate?.target.kind === "fish") {
    return { type: WORLD_POINTER_ACTION.STEER };
  }
  if (interactionCandidate) {
    return { type: WORLD_POINTER_ACTION.INTERACTION, target: interactionCandidate.target };
  }
  return { type: WORLD_POINTER_ACTION.STEER };
}

export function dispatchSailingPointerAction(action, handlers) {
  if (!action || typeof action !== "object") {
    throw new Error("Sailing pointer action is required");
  }
  if (typeof handlers?.fireBroadside !== "function" || typeof handlers?.beginSteering !== "function") {
    throw new Error("Sailing pointer action requires broadside and steering handlers");
  }
  if (action.type === WORLD_POINTER_ACTION.BROADSIDE) {
    assertBroadsideSide(action.sideName, "pointer action");
    handlers.fireBroadside(action.sideName);
    return WORLD_POINTER_ACTION.BROADSIDE;
  }
  if (action.type === WORLD_POINTER_ACTION.STEER) {
    handlers.beginSteering();
    return WORLD_POINTER_ACTION.STEER;
  }
  throw new Error(`Cannot dispatch sailing pointer action: ${action.type}`);
}

function assertBroadsideSide(sideName, label) {
  if (sideName !== null && sideName !== "port" && sideName !== "starboard") {
    throw new Error(`Unknown ${label} broadside: ${sideName}`);
  }
}
