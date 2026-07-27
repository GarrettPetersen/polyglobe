import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlayerShipRecoveryState,
  findNearestShipPlacement,
  restoredShipPlacementPlan,
  updatePlayerShipRecoveryState
} from "./shipNavigationRecovery.js";

test("an ordinary restored ship keeps its exact position", () => {
  assert.deepEqual(restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    frozen: false
  }), {
    tileId: 12,
    recenter: false,
    stop: false,
    reason: null
  });
});

test("a restored ship straddling a stale tile boundary recenters on its recorded tile", () => {
  assert.deepEqual(restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 13,
    frozen: false
  }), {
    tileId: 12,
    recenter: true,
    stop: true,
    reason: "tile-boundary mismatch"
  });
});

test("a restored ship on seasonal ice moves to open water", () => {
  assert.deepEqual(restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    frozen: true,
    nearestOpenWaterTileId: 28
  }), {
    tileId: 28,
    recenter: true,
    stop: true,
    reason: "surface ice"
  });
});

test("a restored ship whose saved tile changed to land moves to nearby navigable water", () => {
  assert.deepEqual(restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    savedTileNavigable: false,
    nearestNavigableTileId: 13,
    frozen: false
  }), {
    tileId: 13,
    recenter: true,
    stop: true,
    reason: "saved tile no longer navigable"
  });
});

test("changed-world recovery fails loudly when no navigable tile was found", () => {
  assert.throws(() => restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    savedTileNavigable: false,
    nearestNavigableTileId: undefined,
    frozen: false
  }), /nearest navigable/);
});

test("a restored ship may remain at navigable polar latitudes", () => {
  assert.deepEqual(restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    frozen: false
  }), {
    tileId: 12,
    recenter: false,
    stop: false,
    reason: null
  });
});

test("ice recovery fails loudly when no open water exists", () => {
  assert.throws(() => restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    frozen: true,
    nearestOpenWaterTileId: undefined
  }), /nearest open-water/);
});

test("rendered navigation recovery chooses the closest valid pixel", () => {
  const tested = [];
  const result = findNearestShipPlacement(4, (x, y) => {
    tested.push([x, y]);
    return x === 2 && y === 0 ? { tileId: 19 } : null;
  });

  assert.deepEqual(result, {
    x: 2,
    y: 0,
    candidate: { tileId: 19 }
  });
  assert.equal(tested.some(([x, y]) => x * x + y * y > 4), false);
});

test("large recovery searches evaluate each in-radius pixel at most once", () => {
  const tested = new Set();
  const result = findNearestShipPlacement(48, (x, y) => {
    const key = `${x},${y}`;
    assert.equal(tested.has(key), false);
    tested.add(key);
    return x === 36 && y === 0 ? { tileId: 27 } : null;
  }, 6);

  assert.deepEqual(result, {
    x: 36,
    y: 0,
    candidate: { tileId: 27 }
  });
  assert.ok(tested.size < Math.PI * 48 * 48);
  assert.equal([...tested].some((key) => {
    const [x, y] = key.split(",").map(Number);
    return x * x + y * y < 36;
  }), false);
});

test("live recovery triggers only after sustained steering into a collision", () => {
  const state = createPlayerShipRecoveryState();
  const update = (overrides = {}) => updatePlayerShipRecoveryState(state, {
    dt: 0.25,
    steering: true,
    collided: true,
    movedPx: 0,
    triggerSeconds: 1,
    movementThresholdPx: 0.08,
    ...overrides
  });

  assert.equal(update(), false);
  assert.equal(update(), false);
  assert.equal(update(), false);
  assert.equal(update(), true);
  assert.equal(state.blockedSeconds, 0);
  assert.equal(update({ collided: false }), false);
  assert.equal(update({ movedPx: 1 }), false);
  assert.equal(update({ steering: false }), false);
});
