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
test("reload permits omitted optional properties without hiding lost mission data", () => {
  const before = state();
  before.gameState.memory.quests.active.passenger = undefined;
  before.gameState.crewRoster[0].optional = undefined;
  const after = JSON.parse(JSON.stringify(before));
  assert.doesNotThrow(() => assertBrowserJourneyTransition(before, after, { type: "reload" }));
  assert.ok(Object.hasOwn(before.gameState.memory.quests.active, "passenger"));
  for (const value of [null, false, 0, "", { id: "passenger-a" }, [undefined], NaN, Infinity]) {
    before.gameState.memory.quests.active.passenger = value;
    assert.throws(() => assertBrowserJourneyTransition(before, after, { type: "reload" }), /mission history/);
  }
  before.gameState.memory.quests.active.passenger = NaN;
  after.gameState.memory.quests.active.passenger = null;
  assert.throws(() => assertBrowserJourneyTransition(before, after, { type: "reload" }), /mission history/);
});

test("teleport permits movement but preserves cargo, crew, equipment and swimmers", () => {
  const before = state();
  before.gameState.namedCrew = [{ id: "officer-a" }];
  before.gameState.inventory = [{ id: "net-a" }];
  before.playerShip.overboardCrew = [{ crewId: "crew-a" }];
  const after = structuredClone(before);
  after.playerShip.position = [0, 1, 0];
  assert.doesNotThrow(() => assertBrowserJourneyTransition(before, after, { type: "teleport" }));
  for (const mutate of [
    s => s.gameState.namedCrew.pop(), s => s.gameState.inventory.pop(),
    s => s.playerShip.overboardCrew.pop(), s => s.gameState.cargo.rice++
  ]) {
    const broken = structuredClone(after); mutate(broken);
    assert.throws(() => assertBrowserJourneyTransition(before, broken, { type: "teleport" }));
  }
});
