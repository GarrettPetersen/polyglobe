import test from "node:test";
import assert from "node:assert/strict";
import {
  FISHING_TRADE_TUTORIAL_STAGE,
  activateFishingTradeTutorial,
  advanceFishingTradeTutorialToMarket,
  arriveAtFishingTradeTutorialMarket,
  beginFishingTradeTutorialCatch,
  completeFishingTradeTutorial,
  createFishingTradeTutorialMemory,
  fishingTradeTutorialPracticeComplete,
  fishingTradeTutorialTargetsFishery,
  openFishingTradeTutorialMarket,
  validateFishingTradeTutorialMemory
} from "./fishingTradeTutorial.js";

test("fishing trade tutorial advances through its persisted stages", () => {
  const memory = createFishingTradeTutorialMemory();
  assert.equal(activateFishingTradeTutorial(memory, 10), true);
  assert.equal(fishingTradeTutorialPracticeComplete(memory, 69.9), false);
  assert.equal(fishingTradeTutorialPracticeComplete(memory, 70), true);
  beginFishingTradeTutorialCatch(memory, {
    fisheryStockKey: "coastal:herring:12",
    fishTileId: 12,
    speciesLabel: "Herring"
  });
  assert.equal(fishingTradeTutorialTargetsFishery(memory, "coastal:herring:12", 12), true);
  assert.equal(fishingTradeTutorialTargetsFishery(memory, "coastal:herring:12", 13), false);
  advanceFishingTradeTutorialToMarket(memory, "london|england");
  assert.equal(arriveAtFishingTradeTutorialMarket(memory, "lisbon|portugal"), false);
  assert.equal(arriveAtFishingTradeTutorialMarket(memory, "london|england"), true);
  assert.equal(openFishingTradeTutorialMarket(memory, "london|england"), true);
  assert.equal(completeFishingTradeTutorial(memory, "london|england"), true);
  assert.deepEqual(memory, createFishingTradeTutorialMemory());
});

test("fishing trade tutorial rejects skipped stages and corrupt targets", () => {
  const memory = createFishingTradeTutorialMemory();
  assert.throws(() => beginFishingTradeTutorialCatch(memory, {
    fisheryStockKey: "fish", fishTileId: 1, speciesLabel: "Fish"
  }), /expected practice/);
  memory.stage = FISHING_TRADE_TUTORIAL_STAGE.CATCH;
  memory.startedAtActivePlaySeconds = 0;
  assert.throws(() => validateFishingTradeTutorialMemory(memory), /fishery stock key/);
});
