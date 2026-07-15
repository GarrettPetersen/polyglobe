import assert from "node:assert/strict";
import test from "node:test";

import { INTERACTION_INPUT, interactionInputOwner } from "./interactionInput.js";

const inactive = Object.freeze({
  optionsActive: false,
  creditsActive: false,
  pastVoyagesActive: false,
  startMenuActive: false,
  captainAlertActive: false,
  playerIntroActive: false,
  gameOverActive: false,
  captainMenuActive: false,
  shipInfoActive: false,
  politicsActive: false,
  discoveriesActive: false,
  dialogueActive: false,
  portWaitActive: false,
  fishingActive: false
});

function ownerFor(active) {
  return interactionInputOwner({ ...inactive, ...active });
}

test("input follows the complete top-to-bottom order of rendered overlays", () => {
  const priority = [
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
    ["dialogueActive", INTERACTION_INPUT.DIALOGUE],
    ["portWaitActive", INTERACTION_INPUT.PORT_WAIT],
    ["fishingActive", INTERACTION_INPUT.FISHING]
  ];
  for (let index = 0; index < priority.length; index++) {
    const active = Object.fromEntries(priority.slice(index).map(([key]) => [key, true]));
    assert.equal(ownerFor(active), priority[index][1]);
  }
});

test("world input is restored when no overlay or action owns it", () => {
  assert.equal(ownerFor({}), INTERACTION_INPUT.WORLD);
});

test("interaction input state fails loudly when incomplete", () => {
  assert.throws(() => interactionInputOwner({ dialogueActive: true }), /optionsActive must be boolean/);
});
