import assert from "node:assert/strict";
import test from "node:test";
import { runJourney, minimizeFailure } from "./journey.mjs";
import { createPortJourneyAdapter, portActionId } from "./ports.mjs";
function counter({ failAt = Infinity, noop = false } = {}) {
  return {
    initial: () => ({ value: 0, other: 0 }), restore: structuredClone, snapshot: structuredClone,
    actions: () => [{ id: "increment" }, { id: "other" }],
    execute(state, action) { if (!noop) state[action.id === "increment" ? "value" : "other"]++; return state; },
    key: JSON.stringify, check(state) { assert.ok(state.value < failAt, "counter limit"); }
  };
}
test("seeded journeys are exactly reproducible", () => {
  const first = runJourney(counter(), { seed: 7, steps: 30 });
  assert.deepEqual(runJourney(counter(), { seed: 7, steps: 30 }), first);
  assert.deepEqual(runJourney(counter(), { seed: 99, steps: 30, trace: first.trace }).final, first.final);
});
test("failure artifacts reproduce and shrink without accepting illegal replays", () => {
  let artifact;
  try { runJourney(counter({ failAt: 3 }), { seed: 1, steps: 100 }); }
  catch (error) { artifact = error.artifact; }
  assert.ok(artifact);
  const minimal = minimizeFailure(counter({ failAt: 3 }), artifact);
  assert.deepEqual(minimal.trace, ["increment", "increment", "increment"]);
  assert.throws(() => runJourney(counter({ failAt: 3 }), { ...minimal, steps: 1 }), /counter limit/);
  assert.throws(() => runJourney(counter(), { seed: 1, steps: 1, trace: ["missing"] }), /unavailable/);
});
test("watchdog rejects actions that cannot progress", () => {
  assert.throws(() => runJourney(counter({ noop: true }), { seed: 1, steps: 32 }), /no progress/);
});
test("duplicate action identities fail before execution", () => {
  const adapter = counter();
  adapter.actions = () => [{ id: "same" }, { id: "same" }];
  assert.throws(() => runJourney(adapter, { seed: 1, steps: 1 }), /Duplicate action/);
});
test("real port journeys preserve consequences through multiple actions and restoration", () => {
  const result = runJourney(createPortJourneyAdapter(), { seed: 1, steps: 12 });
  assert.ok(result.final.visited.length >= 2);
  assert.ok(Object.keys(result.coverage).length > 2);
  assert.equal(result.steps, 12);
  const replay = runJourney(createPortJourneyAdapter(), { seed: 1, steps: 12, trace: result.trace });
  assert.deepEqual(replay.final, result.final);
});


test("trade oracle catches money creation and unrelated cargo loss", async () => {
  const { assertTradeConservation } = await import("./oracles.mjs");
  const before = { doubloons: 100, cargo: { rice: 2, fish: 1 } };
  const result = { marketPurchase: { price: 10, quantity: 1, good: { id: "rice" } } };
  const after = { doubloons: 90, cargo: { rice: 3, fish: 1 } };
  assertTradeConservation(before, after, result);
  assert.throws(() => assertTradeConservation(before, { ...after, doubloons: 100 }, result), /money/);
  assert.throws(() => assertTradeConservation(before, { ...after, cargo: { rice: 3 } }, result), /unrelated cargo/);
});


test("replay action identities ignore presentation and property order", () => {
  assert.equal(portActionId({ type: "accept-quest", quest: { id: "delivery-1", offerText: "Old" } }),
    portActionId({ quest: { offerText: "Translated", id: "delivery-1" }, type: "accept-quest" }));
  assert.notEqual(portActionId({ type: "buy", goodId: "rice" }), portActionId({ type: "buy", goodId: "fish" }));
});

test("minimization retains prerequisites instead of accepting an unavailable action", () => {
  const adapter = {
    initial: () => ({ ready: false, noise: 0 }), restore: structuredClone, snapshot: structuredClone,
    key: JSON.stringify, check: () => {},
    actions: (state) => [{ id: "noise" }, ...(state.ready ? [{ id: "crash" }] : [{ id: "prepare" }])],
    execute(state, { id }) {
      if (id === "crash") throw new Error("Prepared transition violated its invariant");
      if (id === "prepare") state.ready = true;
      else state.noise++;
      return state;
    }
  };
  let artifact;
  try { runJourney(adapter, { seed: 1, steps: 3, trace: ["noise", "prepare", "crash"] }); }
  catch (error) { artifact = error.artifact; }
  assert.deepEqual(minimizeFailure(adapter, artifact).trace, ["prepare", "crash"]);
});

test("watchdog identifies a repeating screen cycle despite individual transitions", () => {
  const adapter = counter();
  adapter.execute = (state) => { state.value = 1 - state.value; return state; };
  assert.throws(() => runJourney(adapter, { seed: 1, steps: 200 }), /revisited old states/);
});

test("corrupt replay metadata fails at restoration", () => {
  const adapter = createPortJourneyAdapter();
  const saved = adapter.initial(1);
  assert.throws(() => adapter.restore({ ...saved, randomStream: { value: -1 } }), /random cursor/);
  const restored = adapter.restore(saved);
  restored.randomStream.value = 99;
  assert.equal(saved.randomStream.value, 1, "Restoration must not mutate the checkpoint cursor");
  assert.throws(() => adapter.restore({ ...saved, simMinute: -1 }), /clock/);
  assert.throws(() => adapter.restore({ ...saved, visited: ["missing-city"] }), /city IDs/);
  assert.throws(() => adapter.restore({ ...saved, visited: [saved.cityId, saved.cityId] }), /Duplicate/);
  assert.throws(() => adapter.restore({ ...saved, cityId: "missing-city" }), /Unknown saved journey city/);
});
