import assert from "node:assert/strict";
import test from "node:test";

import { exploreReachableActionGraph } from "./action-graph.mjs";

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
