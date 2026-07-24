import { nearestResurrect64Hex } from "./waterLatitudePalette.js";

export const DIALOGUE_PORTRAIT_TRANSITION_MS = 180;
export const DIALOGUE_PORTRAIT_LISTENER_OFFSET = 3;
export const DIALOGUE_PORTRAIT_TONE_ACTIVE = 0;
export const DIALOGUE_PORTRAIT_TONE_TRANSITION = 1;
export const DIALOGUE_PORTRAIT_TONE_LISTENER = 2;

export function createDialoguePortraitStageState() {
  return {
    pairKey: null,
    leftId: null,
    rightId: null,
    activeId: null,
    previousActiveId: null,
    transitionStartedAtMs: null,
    expressionById: new Map()
  };
}

export function synchronizeDialoguePortraitStage(state, {
  leftCharacter,
  rightCharacter = null,
  speakerId,
  expressionId = "neutral",
  nowMs
}) {
  assertStageState(state);
  assertCharacter(leftCharacter, "left");
  if (rightCharacter !== null) assertCharacter(rightCharacter, "right");
  if (rightCharacter?.id === leftCharacter.id) {
    throw new Error(`Dialogue portrait participants must be distinct: ${leftCharacter.id}`);
  }
  if (![leftCharacter.id, rightCharacter?.id].includes(speakerId)) {
    throw new Error(`Dialogue speaker is not staged: ${speakerId}`);
  }
  if (typeof expressionId !== "string" || expressionId.trim() === "") {
    throw new Error("Dialogue portrait stage requires a speaker expression");
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Invalid dialogue portrait stage time: ${nowMs}`);
  }

  const rightId = rightCharacter?.id || null;
  const pairKey = `${leftCharacter.id}|${rightId || ""}`;
  if (state.pairKey !== pairKey) {
    state.pairKey = pairKey;
    state.leftId = leftCharacter.id;
    state.rightId = rightId;
    state.activeId = speakerId;
    state.previousActiveId = null;
    state.transitionStartedAtMs = null;
    state.expressionById = new Map();
  } else if (state.activeId !== speakerId) {
    state.previousActiveId = state.activeId;
    state.activeId = speakerId;
    state.transitionStartedAtMs = nowMs;
  }
  state.expressionById.set(speakerId, expressionId);
  return state;
}

export function dialoguePortraitStageFrames(state, nowMs) {
  assertStageState(state);
  if (state.pairKey === null || state.activeId === null || state.leftId === null) {
    throw new Error("Dialogue portrait stage has not been synchronized");
  }
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new Error(`Invalid dialogue portrait frame time: ${nowMs}`);
  }

  let transitionStep = 2;
  let animating = false;
  if (state.transitionStartedAtMs !== null) {
    const elapsed = Math.max(0, nowMs - state.transitionStartedAtMs);
    if (elapsed < DIALOGUE_PORTRAIT_TRANSITION_MS) {
      transitionStep = Math.min(2, Math.floor(elapsed / (DIALOGUE_PORTRAIT_TRANSITION_MS / 3)));
      animating = true;
    } else {
      state.previousActiveId = null;
      state.transitionStartedAtMs = null;
    }
  }

  const frames = [
    portraitFrameFor(state, state.leftId, "left", transitionStep, animating)
  ];
  if (state.rightId !== null) {
    frames.push(portraitFrameFor(state, state.rightId, "right", transitionStep, animating));
  }
  return Object.freeze({
    animating,
    frames: Object.freeze(frames.map((frame) => Object.freeze(frame)))
  });
}

export function dialoguePortraitToneHex(r, g, b, tone) {
  for (const [label, channel] of [["red", r], ["green", g], ["blue", b]]) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new Error(`Invalid dialogue portrait ${label}: ${channel}`);
    }
  }
  if (![DIALOGUE_PORTRAIT_TONE_ACTIVE, DIALOGUE_PORTRAIT_TONE_TRANSITION,
    DIALOGUE_PORTRAIT_TONE_LISTENER].includes(tone)) {
    throw new Error(`Invalid dialogue portrait tone: ${tone}`);
  }
  if (tone === DIALOGUE_PORTRAIT_TONE_ACTIVE) return nearestResurrect64Hex(r, g, b);

  const gray = r * 0.299 + g * 0.587 + b * 0.114;
  const saturation = tone === DIALOGUE_PORTRAIT_TONE_TRANSITION ? 0.62 : 0.38;
  const brightness = tone === DIALOGUE_PORTRAIT_TONE_TRANSITION ? 0.82 : 0.68;
  return nearestResurrect64Hex(
    Math.round((gray + (r - gray) * saturation) * brightness),
    Math.round((gray + (g - gray) * saturation) * brightness),
    Math.round((gray + (b - gray) * saturation) * brightness)
  );
}

function portraitFrameFor(state, characterId, side, transitionStep, animating) {
  let tone = characterId === state.activeId
    ? DIALOGUE_PORTRAIT_TONE_ACTIVE
    : DIALOGUE_PORTRAIT_TONE_LISTENER;
  let offsetY = characterId === state.activeId ? 0 : DIALOGUE_PORTRAIT_LISTENER_OFFSET;

  if (animating && characterId === state.activeId) {
    if (transitionStep === 0) {
      tone = DIALOGUE_PORTRAIT_TONE_LISTENER;
      offsetY = DIALOGUE_PORTRAIT_LISTENER_OFFSET;
    } else if (transitionStep === 1) {
      tone = DIALOGUE_PORTRAIT_TONE_TRANSITION;
      offsetY = 1;
    }
  } else if (animating && characterId === state.previousActiveId) {
    if (transitionStep === 0) {
      tone = DIALOGUE_PORTRAIT_TONE_ACTIVE;
      offsetY = 0;
    } else if (transitionStep === 1) {
      tone = DIALOGUE_PORTRAIT_TONE_TRANSITION;
      offsetY = 2;
    }
  }

  return {
    characterId,
    side,
    expressionId: state.expressionById.get(characterId) || "neutral",
    tone,
    offsetY
  };
}

function assertStageState(state) {
  if (!state || typeof state !== "object" || !(state.expressionById instanceof Map)) {
    throw new Error("Invalid dialogue portrait stage state");
  }
}

function assertCharacter(character, side) {
  if (!character || typeof character !== "object" || typeof character.id !== "string" ||
      character.id.trim() === "") {
    throw new Error(`Dialogue portrait stage requires a ${side} character`);
  }
}
