import assert from "node:assert/strict";
import test from "node:test";

import {
  DIALOGUE_PORTRAIT_LISTENER_OFFSET,
  DIALOGUE_PORTRAIT_TONE_ACTIVE,
  DIALOGUE_PORTRAIT_TONE_LISTENER,
  DIALOGUE_PORTRAIT_TONE_TRANSITION,
  DIALOGUE_PORTRAIT_TRANSITION_MS,
  createDialoguePortraitStageState,
  dialoguePortraitStageFrames,
  dialoguePortraitToneHex,
  synchronizeDialoguePortraitStage
} from "./dialoguePortraitStage.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const CAPTAIN = Object.freeze({ id: "captain" });
const FACTOR = Object.freeze({ id: "factor" });

test("dialogue portraits keep stable sides while speaker emphasis changes", () => {
  const state = createDialoguePortraitStageState();
  synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    rightCharacter: FACTOR,
    speakerId: FACTOR.id,
    expressionId: "stern",
    nowMs: 100
  });

  let stage = dialoguePortraitStageFrames(state, 100);
  assert.deepEqual(stage.frames, [
    {
      characterId: CAPTAIN.id,
      side: "left",
      expressionId: "neutral",
      tone: DIALOGUE_PORTRAIT_TONE_LISTENER,
      offsetY: DIALOGUE_PORTRAIT_LISTENER_OFFSET
    },
    {
      characterId: FACTOR.id,
      side: "right",
      expressionId: "stern",
      tone: DIALOGUE_PORTRAIT_TONE_ACTIVE,
      offsetY: 0
    }
  ]);

  synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    rightCharacter: FACTOR,
    speakerId: CAPTAIN.id,
    expressionId: "happy",
    nowMs: 200
  });
  stage = dialoguePortraitStageFrames(state, 200 + DIALOGUE_PORTRAIT_TRANSITION_MS / 2);
  assert.equal(stage.animating, true);
  assert.equal(stage.frames[0].side, "left");
  assert.equal(stage.frames[0].tone, DIALOGUE_PORTRAIT_TONE_TRANSITION);
  assert.equal(stage.frames[0].offsetY, 1);
  assert.equal(stage.frames[1].side, "right");
  assert.equal(stage.frames[1].tone, DIALOGUE_PORTRAIT_TONE_TRANSITION);
  assert.equal(stage.frames[1].offsetY, 2);

  stage = dialoguePortraitStageFrames(state, 200 + DIALOGUE_PORTRAIT_TRANSITION_MS);
  assert.equal(stage.animating, false);
  assert.equal(stage.frames[0].tone, DIALOGUE_PORTRAIT_TONE_ACTIVE);
  assert.equal(stage.frames[0].offsetY, 0);
  assert.equal(stage.frames[0].expressionId, "happy");
  assert.equal(stage.frames[1].tone, DIALOGUE_PORTRAIT_TONE_LISTENER);
  assert.equal(stage.frames[1].offsetY, DIALOGUE_PORTRAIT_LISTENER_OFFSET);
  assert.equal(stage.frames[1].expressionId, "stern");
});

test("a changed participant pair resets without animating unrelated characters", () => {
  const state = createDialoguePortraitStageState();
  synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    rightCharacter: FACTOR,
    speakerId: FACTOR.id,
    nowMs: 10
  });
  synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    rightCharacter: { id: "companion" },
    speakerId: "companion",
    expressionId: "thoughtful",
    nowMs: 20
  });

  const stage = dialoguePortraitStageFrames(state, 20);
  assert.equal(stage.animating, false);
  assert.deepEqual(stage.frames.map((frame) => frame.characterId), ["captain", "companion"]);
  assert.equal(stage.frames[1].tone, DIALOGUE_PORTRAIT_TONE_ACTIVE);
});

test("single-character dialogue remains fully active", () => {
  const state = createDialoguePortraitStageState();
  synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    speakerId: CAPTAIN.id,
    expressionId: "thoughtful",
    nowMs: 0
  });
  assert.deepEqual(dialoguePortraitStageFrames(state, 0).frames, [{
    characterId: CAPTAIN.id,
    side: "left",
    expressionId: "thoughtful",
    tone: DIALOGUE_PORTRAIT_TONE_ACTIVE,
    offsetY: 0
  }]);
});

test("listener palette states stay in Resurrect 64 and become darker and quieter", () => {
  const active = dialoguePortraitToneHex(234, 79, 54, DIALOGUE_PORTRAIT_TONE_ACTIVE);
  const transition = dialoguePortraitToneHex(234, 79, 54, DIALOGUE_PORTRAIT_TONE_TRANSITION);
  const listener = dialoguePortraitToneHex(234, 79, 54, DIALOGUE_PORTRAIT_TONE_LISTENER);
  assert.ok(RESURRECT_64_HEX.includes(active));
  assert.ok(RESURRECT_64_HEX.includes(transition));
  assert.ok(RESURRECT_64_HEX.includes(listener));
  assert.notEqual(active, transition);
  assert.notEqual(transition, listener);
  assert.ok(brightness(listener) < brightness(transition));
  assert.ok(brightness(transition) < brightness(active));
  assert.ok(chroma(listener) < chroma(active));
});

test("portrait staging rejects missing and duplicate participants", () => {
  const state = createDialoguePortraitStageState();
  assert.throws(() => synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    rightCharacter: CAPTAIN,
    speakerId: CAPTAIN.id,
    nowMs: 0
  }), /distinct/);
  assert.throws(() => synchronizeDialoguePortraitStage(state, {
    leftCharacter: CAPTAIN,
    rightCharacter: FACTOR,
    speakerId: "stranger",
    nowMs: 0
  }), /not staged/);
});

function brightness(hex) {
  const [r, g, b] = channels(hex);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function chroma(hex) {
  const values = channels(hex);
  return Math.max(...values) - Math.min(...values);
}

function channels(hex) {
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}
