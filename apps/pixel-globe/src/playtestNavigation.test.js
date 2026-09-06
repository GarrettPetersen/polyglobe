import assert from "node:assert/strict";
import test from "node:test";
import { planPlaytestRoute } from "./playtestNavigation.js";
import { playerActionId } from "./playerActionIdentity.js";

test("test pilot routes around land and refuses disconnected destinations", () => {
  const graph = [[1, 3], [0, 2], [1, 5], [0, 4], [3, 5], [4, 2]];
  const options = { startId: 0, neighbors: (id) => graph[id], isNavigable: (id) => id !== 1,
    isDestination: (id) => id === 2 };
  assert.deepEqual(planPlaytestRoute(options), [0, 3, 4, 5, 2]);
  assert.throws(() => planPlaytestRoute({ ...options, isNavigable: () => false }), /no navigable route/);
  assert.throws(() => planPlaytestRoute({ ...options, maxTiles: 2 }), /within 2/);
  assert.deepEqual(planPlaytestRoute({ ...options, isDestination: (id) => id === 0 }), [0]);
});

test("browser and domain choices share stable IDs across presentation changes", () => {
  const action = { type: "hire", character: { id: "crew-a", name: "Alice" }, cityId: "city-a", label: "Hire" };
  assert.equal(playerActionId(action), playerActionId({ ...action, label: "Engager",
    character: { id: "crew-a", name: "Changed" } }));
  assert.notEqual(playerActionId(action), playerActionId({ ...action, cityId: "city-b" }));
});
