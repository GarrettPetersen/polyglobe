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
  presentFishingTradeTutorialDialogue,
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

test("fishing tutorial dialogue keeps detours and only restricts the guided step", () => {
  const memory = createFishingTradeTutorialMemory();
  activateFishingTradeTutorial(memory, 0);
  beginFishingTradeTutorialCatch(memory, {
    fisheryStockKey: "coastal:herring:12",
    fishTileId: 12,
    speciesLabel: "Herring"
  });
  advanceFishingTradeTutorialToMarket(memory, "london|england");
  arriveAtFishingTradeTutorialMarket(memory, "london|england");
  const market = { label: "Market", action: { type: "node", nodeId: "market" } };
  const leave = { label: "Leave", action: { type: "leave" } };
  const root = presentFishingTradeTutorialDialogue({
    memory,
    cityId: "london|england",
    nodeId: "root",
    marketMode: null,
    options: [leave, market],
    fishGoodId: "fish"
  });
  assert.equal(root.kind, "restricted");
  assert.deepEqual([...root.options], [market]);
  for (const nodeId of ["loadout", "market", "greeting"]) {
    assert.equal(presentFishingTradeTutorialDialogue({
      memory,
      cityId: "london|england",
      nodeId,
      marketMode: "buy",
      options: [market],
      fishGoodId: "fish"
    }).kind, "unchanged");
  }
  assert.equal(presentFishingTradeTutorialDialogue({
    memory,
    cityId: "lisbon|portugal",
    nodeId: "root",
    marketMode: null,
    options: [leave, market],
    fishGoodId: "fish"
  }).kind, "unchanged");
  assert.equal(openFishingTradeTutorialMarket(memory, "london|england"), true);
  const buy = { label: "Buy", action: { type: "switch-market-mode", mode: "buy" } };
  const sell = { label: "Sell", action: { type: "switch-market-mode", mode: "sell" } };
  const fish = { label: "Herring", action: { type: "sell", goodId: "fish" } };
  const salt = { label: "Salt", action: { type: "sell", goodId: "salt" } };
  const guided = presentFishingTradeTutorialDialogue({
    memory,
    cityId: "london|england",
    nodeId: "market",
    marketMode: "sell",
    options: [buy, sell, salt, fish],
    fishGoodId: "fish"
  });
  assert.equal(guided.kind, "restricted");
  assert.equal(guided.options[0].disabled, true);
  assert.equal(guided.options[1].disabled, true);
  assert.equal(guided.options[2].action.goodId, "fish");
  assert.equal(guided.options[2].emphasis, "quest-cargo");
  assert.equal(presentFishingTradeTutorialDialogue({
    memory,
    cityId: "london|england",
    nodeId: "market",
    marketMode: "buy",
    options: [buy, sell, fish],
    fishGoodId: "fish"
  }).kind, "unchanged");
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
