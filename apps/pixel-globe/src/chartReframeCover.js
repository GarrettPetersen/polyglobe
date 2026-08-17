export function chartReframeCoverIsOpaque({
  startMenu = false,
  gameOver = false,
  fullPortDialogue = false,
  playerIntro = false,
  captainMenu = false,
  optionsMenu = false,
  creditsMenu = false,
  pastVoyagesMenu = false,
  discoveriesMenu = false,
  achievementsMenu = false,
  shipInfoMenu = false,
  politicsMenu = false,
  navigationMenu = false,
  aboardMenu = false,
  blockingDialogue = false
} = {}) {
  return Boolean(
    startMenu ||
    gameOver ||
    fullPortDialogue ||
    playerIntro ||
    captainMenu ||
    optionsMenu ||
    creditsMenu ||
    pastVoyagesMenu ||
    discoveriesMenu ||
    achievementsMenu ||
    shipInfoMenu ||
    politicsMenu ||
    navigationMenu ||
    aboardMenu ||
    blockingDialogue
  );
}

export function gameOverReframeCoverIsOpaque({
  active = false,
  sinkShip = false,
  elapsedMs = 0,
  sinkDurationMs = 0
} = {}) {
  if (typeof active !== "boolean" || typeof sinkShip !== "boolean") {
    throw new Error("Game-over chart cover requires boolean state");
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0 ||
      !Number.isFinite(sinkDurationMs) || sinkDurationMs < 0) {
    throw new Error("Game-over chart cover requires valid transition timing");
  }
  return active && (!sinkShip || elapsedMs >= sinkDurationMs);
}

export function chartShouldReframeOnCoverOpen({
  coverIsActive,
  coverWasActive
}) {
  if (typeof coverIsActive !== "boolean" || typeof coverWasActive !== "boolean") {
    throw new Error("Chart cover reframe policy requires boolean cover state");
  }
  return coverIsActive && !coverWasActive;
}

export function coldCoveredWorldDefersFullRender({
  worldFramePresented,
  coverIsActive,
  reframePending,
  gameOver
}) {
  assertCoveredWorldRenderFlags({
    worldFramePresented,
    coverIsActive,
    reframePending,
    gameOver
  });
  return !worldFramePresented && coverIsActive && reframePending && !gameOver;
}

export function coveredWorldPreparationIsRequired({
  coverIsActive,
  renderPending,
  gameOver
}) {
  assertCoveredWorldRenderFlags({ coverIsActive, renderPending, gameOver });
  return coverIsActive && renderPending && !gameOver;
}

function assertCoveredWorldRenderFlags(flags) {
  for (const [label, value] of Object.entries(flags)) {
    if (typeof value !== "boolean") {
      throw new Error(`Covered world render policy requires boolean ${label}`);
    }
  }
}
