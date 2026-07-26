function assertVector3(vector, label) {
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} must be a finite 3D vector`);
  }
}

function assertShipMotion(ship) {
  if (!ship || typeof ship !== "object") throw new Error("Dialogue motion requires a ship");
  assertVector3(ship.velocity, "Ship velocity");
  assertVector3(ship.heading, "Ship heading");
}

function assertMotionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Dialogue motion requires a saved snapshot");
  }
  assertVector3(snapshot.velocity, "Saved ship velocity");
}

export function pauseDialogueShipMotion(ship, existingSnapshot = null) {
  assertShipMotion(ship);
  if (existingSnapshot !== null) assertMotionSnapshot(existingSnapshot);
  const snapshot = existingSnapshot || Object.freeze({
    velocity: Object.freeze(ship.velocity.slice())
  });
  ship.targetHeading = ship.heading.slice();
  return snapshot;
}

export function resumeDialogueShipMotion(ship, snapshot) {
  assertShipMotion(ship);
  assertMotionSnapshot(snapshot);
  ship.velocity = snapshot.velocity.slice();
  ship.targetHeading = ship.heading.slice();
  return true;
}

export function worldSimulationIsPaused({
  capturePlaybackPaused,
  menusOpen,
  dialogueActive,
  characterAlertActive,
  playerIntroActive,
  gameOver,
  goldTreasureActive
}) {
  const values = [
    capturePlaybackPaused,
    menusOpen,
    dialogueActive,
    characterAlertActive,
    playerIntroActive,
    gameOver,
    goldTreasureActive
  ];
  if (values.some((value) => typeof value !== "boolean")) {
    throw new Error("World simulation pause state must contain only booleans");
  }
  return values.some(Boolean);
}
