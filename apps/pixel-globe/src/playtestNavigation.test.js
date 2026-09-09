import assert from "node:assert/strict";
import test from "node:test";
import { planPlaytestRoute, playtestRouteIndexForTile } from "./playtestNavigation.js";
import { playerActionId } from "./playerActionIdentity.js";

test("test pilot routes around land and refuses disconnected destinations", () => {
  const graph = [[1, 3], [0, 2], [1, 5], [0, 4], [3, 5], [4, 2]];
  const options = { startId: 0, neighbors: (id) => graph[id], isNavigable: (id) => id !== 1,
    canTraverseEdge: () => true, isDestination: (id) => id === 2 };
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


test("adjacent navigable river cells must share a traversable channel edge", () => {
  const graph = [[1, 3], [0, 2], [1, 4], [0, 4], [3, 2]];
  const options = { startId: 0, neighbors: id => graph[id], isNavigable: () => true,
    isDestination: id => id === 2, canTraverseEdge: (from, to) => !([from, to].includes(1)) };
  assert.deepEqual(planPlaytestRoute(options), [0, 3, 4, 2]);
  assert.throws(() => planPlaytestRoute({ ...options, canTraverseEdge: () => false }), /no navigable route/);
  assert.throws(() => planPlaytestRoute({ ...options, canTraverseEdge: undefined }), /edge eligibility/);
});

test("river waypoints advance on tile entry and recover after channel backtracking", () => {
  const tiles = [10, 11, 12, 13];
  assert.equal(playtestRouteIndexForTile(tiles, 1, 11), 2);
  assert.equal(playtestRouteIndexForTile(tiles, 3, 10), 1);
  assert.equal(playtestRouteIndexForTile(tiles, 3, 13), 3);
  assert.equal(playtestRouteIndexForTile(tiles, 2, 99), 2);
});
