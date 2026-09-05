import assert from "node:assert/strict";
import test from "node:test";

import { exploreReachableActionGraph } from "./action-graph.mjs";

function counterScenario(overrides = {}) {
  return {
    scenarioId: "harbor/empty-purse",
    initialState: 0,
    stateKey: String,
    view: (state) => ({ kind: `screen-${state}`, actions: state < 2 ? [{ kind: "advance", index: 0 }] : [] }),
    actions: (view) => view.actions,
    transition: (state) => state + 1,
    maxDepth: 3,
    maxStates: 4,
    ...overrides
  };
}

test("failures retain their original cause and shortest replayable action path", () => {
  const failure = new Error("new ship cannot hold the crew");
  assert.throws(() => exploreReachableActionGraph(counterScenario({
    transition: (state) => { if (state === 1) throw failure; return state + 1; }
  })), (error) => {
    assert.equal(error.cause, failure);
    assert.match(error.message, /harbor\/empty-purse.*action execution/);
    const trace = JSON.parse(error.message.split("Replay: ")[1]);
    assert.deepEqual(trace, [
      { view: "screen-0", kind: "advance", index: 0 },
      { view: "screen-1", kind: "advance", index: 0 }
    ]);
    return true;
  });
});

test("depth and navigation budgets cannot silently pass a complete audit", () => {
  for (const limit of [{ maxDepth: 1 }, { followAction: () => false }, { includeAction: () => false }]) {
    const bounded = exploreReachableActionGraph(counterScenario(limit));
    assert.equal(bounded.complete, false);
    assert.ok(bounded.boundaries.length > 0);
    assert.throws(() => exploreReachableActionGraph(counterScenario({ ...limit, requireComplete: true })),
      /Incomplete action audit/);
  }
  assert.equal(exploreReachableActionGraph(counterScenario({ requireComplete: true })).complete, true);
});

test("disabled actions and successor state invariants are checked independently of rendering", () => {
  const disabled = [];
  exploreReachableActionGraph(counterScenario({
    includeAction: () => false,
    validateExcludedAction: (_state, action) => disabled.push(action.kind)
  }));
  assert.deepEqual(disabled, ["advance"]);
  assert.throws(() => exploreReachableActionGraph(counterScenario({
    validateState: (state) => { if (state > 0) throw new Error("over capacity"); },
    followAction: () => false
  })), /successor validation: over capacity/);
});

test("actions excluded from deeper exploration still validate their successor view", () => {
  const run = (followAction) => exploreReachableActionGraph({
    initialState: { broken: false },
    stateKey: () => "same-dialogue-node",
    view: (state) => state,
    actions: () => [{ kind: "deliver-material" }],
    transition: () => ({ broken: true }),
    validateView: (view) => {
      if (view.broken) throw new Error("reward cannot render");
    },
    followAction,
    maxDepth: 1,
    maxStates: 2
  });
  assert.throws(() => run(() => false), /reward cannot render/);
  assert.throws(() => run(() => true), /reward cannot render/);
});

test("reachable action exploration follows only actions offered by the current view", () => {
  const graph = Object.freeze({
    start: Object.freeze([
      Object.freeze({ kind: "advance", destination: "middle" }),
      Object.freeze({ kind: "disabled", destination: "impossible" })
    ]),
    middle: Object.freeze([Object.freeze({ kind: "finish", destination: "done" })]),
    done: Object.freeze([])
  });
  const result = exploreReachableActionGraph({
    initialState: "start",
    stateKey: (state) => state,
    view: (state) => ({ kind: state, actions: graph[state] }),
    actions: (view) => view.actions,
    includeAction: (action) => action.kind !== "disabled",
    transition: (_state, action) => action.destination,
    maxDepth: 4,
    maxStates: 4
  });

  assert.deepEqual(result.stateKeys, ["start", "middle", "done"]);
  assert.deepEqual(result.actionKinds, ["advance", "finish"]);
  assert.equal(result.transitionCount, 2);
});

test("reachable action exploration bounds accidental state explosions", () => {
  assert.throws(
    () => exploreReachableActionGraph({
      initialState: 0,
      stateKey: (state) => String(state),
      view: (state) => ({ actions: [{ kind: "advance", destination: state + 1 }] }),
      actions: (view) => view.actions,
      transition: (_state, action) => action.destination,
      maxDepth: 10,
      maxStates: 2
    }),
    /exceeded 2 states/
  );
});

test("reachable action exploration rejects malformed public contracts", () => {
  assert.throws(
    () => exploreReachableActionGraph({
      initialState: {},
      stateKey: () => "state",
      view: () => null,
      actions: () => [],
      transition: () => null,
      maxDepth: 1,
      maxStates: 1
    }),
    /received no view/
  );
});
