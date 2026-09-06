import assert from "node:assert/strict";

// JSON saves omit absent optional object properties. Remove only those properties:
// unlike a JSON round trip, this preserves invalid numbers and array entries for comparison.
function durableProperties(value) {
  if (Array.isArray(value)) return value.map(durableProperties);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .map(([key, entry]) => [key, durableProperties(entry)]));
}

export function assertBrowserJourneyTransition(before, after, command) {
  if (!before) return;
  if (command.type === "reload") {
    for (const key of ["cargo", "crewRoster", "doubloons"]) {
      assert.deepEqual(durableProperties(after.gameState[key]), durableProperties(before.gameState[key]), `Reload changed ${key}`);
    }
    assert.deepEqual(durableProperties(after.gameState.memory.quests), durableProperties(before.gameState.memory.quests), "Reload changed mission history");
    assert.equal(after.playerShip.hitPoints, before.playerShip.hitPoints, "Reload changed hull damage");
    return;
  }
  if (command.type !== "choose") return;
  const option = before.options.find((entry) => entry.id === command.id);
  assert.ok(option && !option.disabled, `Action is not enabled: ${command.id}`);
  if (["buy", "sell"].includes(option.action.type)) {
    assert.notDeepEqual(after.gameState.cargo, before.gameState.cargo, "Presented trade did not change cargo");
    assert.notEqual(after.gameState.doubloons, before.gameState.doubloons, "Presented trade did not change money");
  }
  if (option.action.type === "complete-quest") {
    assert.ok(after.gameState.memory.quests.completed[before.gameState.memory.quests.active.id], "Mission completion was not recorded");
  }
}
