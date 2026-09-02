import assert from "node:assert/strict";
import test from "node:test";

import {
  INTERACTION_INPUT,
  WORLD_POINTER_ACTION,
  captainMenuShortcutAvailable,
  dispatchSailingPointerAction,
  interactionInputOwner,
  worldPointerAction
} from "./interactionInput.js";

const inactive = Object.freeze({
  telemetryConsentActive: false,
  optionsActive: false,
  creditsActive: false,
  pastVoyagesActive: false,
  startMenuActive: false,
  captainAlertActive: false,
  playerIntroActive: false,
  gameOverActive: false,
  captainMenuActive: false,
  aboardActive: false,
  shipInfoActive: false,
  politicsActive: false,
  discoveriesActive: false,
  achievementsActive: false,
  navigationActive: false,
  dialogueActive: false,
  portAssaultActive: false,
  portWaitActive: false,
  fishingActive: false
});

function ownerFor(active) {
  return interactionInputOwner({ ...inactive, ...active });
}

test("input follows the complete top-to-bottom order of rendered overlays", () => {
  const priority = [
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
    ["portAssaultActive", INTERACTION_INPUT.PORT_ASSAULT],
    ["dialogueActive", INTERACTION_INPUT.DIALOGUE],
    ["portWaitActive", INTERACTION_INPUT.PORT_WAIT],
    ["fishingActive", INTERACTION_INPUT.FISHING]
  ];
  for (let index = 0; index < priority.length; index++) {
    const active = Object.fromEntries(priority.slice(index).map(([key]) => [key, true]));
    assert.equal(ownerFor(active), priority[index][1]);
  }
});

test("achievements retain input over the main menu they cover", () => {
  assert.equal(ownerFor({
    achievementsActive: true,
    startMenuActive: true
  }), INTERACTION_INPUT.ACHIEVEMENTS);
});

test("world input is restored when no overlay or action owns it", () => {
  assert.equal(ownerFor({}), INTERACTION_INPUT.WORLD);
});

test("the Captain Menu shortcut never creates a hidden hit target over dialogue", () => {
  assert.equal(captainMenuShortcutAvailable({
    blockingMenu: false,
    blockingModal: false,
    dialogueActive: true
  }), false);
  assert.equal(captainMenuShortcutAvailable({
    blockingMenu: false,
    blockingModal: false,
    dialogueActive: false
  }), true);
  assert.equal(captainMenuShortcutAvailable({
    blockingMenu: false,
    blockingModal: true,
    dialogueActive: false
  }), false);
  assert.equal(captainMenuShortcutAvailable({
    blockingMenu: true,
    blockingModal: false,
    dialogueActive: false
  }), false);
});

test("interaction input state fails loudly when incomplete", () => {
  assert.throws(() => interactionInputOwner({ dialogueActive: true }), /telemetryConsentActive must be boolean/);
});

test("clicking an engaged ship inside a cannon arc fires before its exact hail interaction", () => {
  const target = { kind: "ship", call: { id: "enemy-ship" } };
  assert.deepEqual(worldPointerAction({
    interactionCandidate: { target, exact: true },
    combatShipBroadside: "starboard",
    pointBroadside: "starboard"
  }), {
    type: WORLD_POINTER_ACTION.BROADSIDE,
    sideName: "starboard"
  });
});

test("clicking an engaged ship outside a cannon arc steers instead of hailing", () => {
  const target = { kind: "ship", call: { id: "enemy-ship" } };
  assert.deepEqual(worldPointerAction({
    interactionCandidate: { target, exact: true },
    combatShipEngaged: true
  }), {
    type: WORLD_POINTER_ACTION.STEER
  });
});

test("clicking a hostile ship outside combat opens its hostile interaction", () => {
  const target = { kind: "ship", call: { id: "hostile-ship" } };
  assert.deepEqual(worldPointerAction({
    interactionCandidate: { target, exact: true }
  }), {
    type: WORLD_POINTER_ACTION.INTERACTION,
    target
  });
});

test("exact noncombat interactions still beat a broadside sector beneath them", () => {
  const target = { kind: "port", call: { tileId: 42 } };
  assert.deepEqual(worldPointerAction({
    interactionCandidate: { target, exact: true },
    pointBroadside: "port"
  }), {
    type: WORLD_POINTER_ACTION.INTERACTION,
    target
  });
});

test("ordinary broadside controls and padded world interactions retain their priority", () => {
  assert.deepEqual(worldPointerAction({ pointBroadside: "port" }), {
    type: WORLD_POINTER_ACTION.BROADSIDE,
    sideName: "port"
  });
  const target = { kind: "ship", call: { id: "friendly-ship" } };
  assert.deepEqual(worldPointerAction({ interactionCandidate: { target, exact: false } }), {
    type: WORLD_POINTER_ACTION.INTERACTION,
    target
  });
});

test("only visible fish pixels trigger fishing while padded fish clicks steer", () => {
  const target = { kind: "fish", call: { fisheryId: "north-sea-herring" } };
  assert.deepEqual(worldPointerAction({
    interactionCandidate: { target, exact: true }
  }), {
    type: WORLD_POINTER_ACTION.INTERACTION,
    target
  });
  assert.deepEqual(worldPointerAction({
    interactionCandidate: { target, exact: false }
  }), {
    type: WORLD_POINTER_ACTION.STEER
  });
});

test("world pointer priority rejects a broadside assigned to a non-ship target", () => {
  assert.throws(() => worldPointerAction({
    interactionCandidate: { target: { kind: "port" }, exact: true },
    combatShipBroadside: "port"
  }), /requires a clicked ship/);
});

test("a broadside pointer action fires without ever beginning steering", () => {
  const calls = [];
  const dispatched = dispatchSailingPointerAction({
    type: WORLD_POINTER_ACTION.BROADSIDE,
    sideName: "port"
  }, {
    fireBroadside: (sideName) => calls.push(`fire:${sideName}`),
    beginSteering: () => calls.push("steer")
  });

  assert.equal(dispatched, WORLD_POINTER_ACTION.BROADSIDE);
  assert.deepEqual(calls, ["fire:port"]);
});

test("an ordinary sailing pointer action begins steering without firing", () => {
  const calls = [];
  const dispatched = dispatchSailingPointerAction({
    type: WORLD_POINTER_ACTION.STEER
  }, {
    fireBroadside: (sideName) => calls.push(`fire:${sideName}`),
    beginSteering: () => calls.push("steer")
  });

  assert.equal(dispatched, WORLD_POINTER_ACTION.STEER);
  assert.deepEqual(calls, ["steer"]);
});
