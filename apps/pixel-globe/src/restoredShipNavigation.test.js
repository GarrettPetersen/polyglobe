import test from "node:test";
import assert from "node:assert/strict";
import {
  findNearestRestoredShipPlacement,
  restoredShipPlacementPlan
} from "./restoredShipNavigation.js";

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

test("a restored ship beyond the pole-safe camera limit moves to open water", () => {
  assert.deepEqual(restoredShipPlacementPlan({
    savedTileId: 12,
    positionTileId: 12,
    frozen: false,
    polarOutOfBounds: true,
    nearestOpenWaterTileId: 31
  }), {
    tileId: 31,
    recenter: true,
    stop: true,
    reason: "polar navigation limit"
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
  const result = findNearestRestoredShipPlacement(4, (x, y) => {
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
