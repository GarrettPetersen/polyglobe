import assert from "node:assert/strict";
import test from "node:test";
import { assertBrowserJourneyTransition } from "./browser-oracles.mjs";
const state = () => ({ gameState: { cargo: { rice: 1 }, doubloons: 10, crewRoster: [{ id: "crew-a" }],
  memory: { quests: { active: { id: "quest-a" }, completed: {} } } }, playerShip: { hitPoints: 2 },
  options: [{ id: "buy-rice", action: { type: "buy" }, disabled: false }] });
test("browser replay runs trade and enabled-action oracles too", () => {
  const before = state();
  assert.throws(() => assertBrowserJourneyTransition(before, state(), { type: "choose", id: "buy-rice" }), /cargo/);
  assert.throws(() => assertBrowserJourneyTransition(before, state(), { type: "choose", id: "missing" }), /not enabled/);
  const after = state(); after.gameState.cargo.rice++; after.gameState.doubloons--;
  assert.doesNotThrow(() => assertBrowserJourneyTransition(before, after, { type: "choose", id: "buy-rice" }));
});
test("every replayed reload verifies durable consequences", () => {
  for (const mutate of [s => s.gameState.crewRoster.pop(), s => s.gameState.doubloons++,
    s => s.playerShip.hitPoints++, s => s.gameState.memory.quests.completed["quest-a"] = true]) {
    const after = state(); mutate(after);
    assert.throws(() => assertBrowserJourneyTransition(state(), after, { type: "reload" }), /Reload changed/);
  }
  assert.doesNotThrow(() => assertBrowserJourneyTransition(state(), state(), { type: "reload" }));
});
