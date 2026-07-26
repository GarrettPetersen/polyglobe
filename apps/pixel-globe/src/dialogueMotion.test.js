import assert from "node:assert/strict";
import test from "node:test";

import {
  pauseDialogueShipMotion,
  resumeDialogueShipMotion,
  worldSimulationIsPaused
} from "./dialogueMotion.js";

function testShip() {
  return {
    velocity: [0.12, -0.04, 0.08],
    heading: [0, 1, 0],
    targetHeading: [1, 0, 0]
  };
}

test("dialogue pauses a ship and restores its exact incoming momentum", () => {
  const ship = testShip();
  const snapshot = pauseDialogueShipMotion(ship);

  assert.deepEqual(ship.velocity, [0.12, -0.04, 0.08]);
  assert.deepEqual(ship.targetHeading, ship.heading);

  ship.velocity = [0, 0, 0];
  resumeDialogueShipMotion(ship, snapshot);

  assert.deepEqual(ship.velocity, [0.12, -0.04, 0.08]);
  assert.deepEqual(ship.targetHeading, ship.heading);
});

test("nested dialogue pages cannot replace saved momentum with zero", () => {
  const ship = testShip();
  const firstSnapshot = pauseDialogueShipMotion(ship);
  ship.velocity = [0, 0, 0];
  const nestedSnapshot = pauseDialogueShipMotion(ship, firstSnapshot);

  assert.equal(nestedSnapshot, firstSnapshot);
  assert.deepEqual(nestedSnapshot.velocity, [0.12, -0.04, 0.08]);

  resumeDialogueShipMotion(ship, nestedSnapshot);
  assert.deepEqual(ship.velocity, [0.12, -0.04, 0.08]);
});

test("dialogue motion rejects malformed ship state and snapshots", () => {
  assert.throws(
    () => pauseDialogueShipMotion({ velocity: [0, 0], heading: [0, 1, 0] }),
    /Ship velocity/
  );
  assert.throws(
    () => resumeDialogueShipMotion(testShip(), { velocity: [0, Number.NaN, 0] }),
    /Saved ship velocity/
  );
});

test("both conversations and character alerts pause world time", () => {
  const state = {
    capturePlaybackPaused: false,
    menusOpen: false,
    dialogueActive: false,
    characterAlertActive: false,
    playerIntroActive: false,
    gameOver: false,
    goldTreasureActive: false
  };
  assert.equal(worldSimulationIsPaused(state), false);
  assert.equal(worldSimulationIsPaused({ ...state, dialogueActive: true }), true);
  assert.equal(worldSimulationIsPaused({ ...state, characterAlertActive: true }), true);
});

test("world simulation pause state rejects implicit truthy values", () => {
  assert.throws(
    () => worldSimulationIsPaused({
      capturePlaybackPaused: false,
      menusOpen: false,
      dialogueActive: null,
      characterAlertActive: false,
      playerIntroActive: false,
      gameOver: false,
      goldTreasureActive: false
    }),
    /only booleans/
  );
});
