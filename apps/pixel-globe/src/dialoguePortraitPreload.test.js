import assert from "node:assert/strict";
import test from "node:test";

import {
  dialoguePortraitPreloadEntries,
  portDialoguePortraitPreloadCharacters
} from "./dialoguePortraitPreload.js";

function character(id, expressions = ["neutral", "happy"]) {
  return {
    id,
    expressions: expressions.map((expressionId) => ({
      id: expressionId,
      src: `assets/characters/${id}-${expressionId}.png`
    }))
  };
}

test("port portrait preloading includes every expression and deduplicates shared speakers", () => {
  const factor = character("factor");
  const questGiver = character("quest-giver", ["neutral", "stern", "pleased"]);
  const entries = dialoguePortraitPreloadEntries([factor, questGiver, factor]);

  assert.deepEqual(entries.map(({ key }) => key), [
    "factor|neutral",
    "factor|happy",
    "quest-giver|neutral",
    "quest-giver|stern",
    "quest-giver|pleased"
  ]);
});

test("port portrait preloading fails loudly for a portraitless dialogue character", () => {
  assert.throws(
    () => dialoguePortraitPreloadEntries([{ id: "missing", expressions: [] }]),
    /missing has no expressions/
  );
});

test("port portrait preloading skips a visible inland settlement", () => {
  const player = character("player");

  assert.deepEqual(portDialoguePortraitPreloadCharacters({
    playerCharacter: player,
    portCharacter: null,
    dockable: false
  }), []);
});

test("port portrait preloading includes the player and factor for a dockable port", () => {
  const player = character("player");
  const factor = character("factor");

  assert.deepEqual(portDialoguePortraitPreloadCharacters({
    playerCharacter: player,
    portCharacter: factor,
    dockable: true
  }), [player, factor]);
});

test("port portrait preloading rejects a dockable port without a factor", () => {
  assert.throws(
    () => portDialoguePortraitPreloadCharacters({
      playerCharacter: character("player"),
      portCharacter: null,
      dockable: true
    }),
    /must be a character object/
  );
});

test("port portrait preloading rejects a factor assigned to an inland settlement", () => {
  assert.throws(
    () => portDialoguePortraitPreloadCharacters({
      playerCharacter: character("player"),
      portCharacter: character("factor"),
      dockable: false
    }),
    /Non-dockable settlement unexpectedly has a port character/
  );
});

test("port portrait preloading rejects conflicting frames for one character expression", () => {
  const first = character("factor", ["neutral"]);
  const second = character("factor", ["neutral"]);
  second.expressions[0].src = "assets/characters/different.png";
  assert.throws(
    () => dialoguePortraitPreloadEntries([first, second]),
    /conflicting frames for factor\|neutral/
  );
});

test("port portrait preloading rejects conflicting atlas crops for one expression", () => {
  const first = character("factor", ["neutral"]);
  first.expressions[0] = {
    ...first.expressions[0],
    atlasX: 0,
    atlasY: 0,
    width: 64,
    height: 64
  };
  const second = structuredClone(first);
  second.expressions[0].atlasX = 64;
  assert.throws(
    () => dialoguePortraitPreloadEntries([first, second]),
    /conflicting frames for factor\|neutral/
  );
});
