import test from "node:test";
import assert from "node:assert/strict";
import {
  drawnNavigationTransitionAllowed,
  resolveDrawnSurfaceNavigation
} from "./drawnShipNavigation.js";

function tile(id, x, y, drawOrder, { water = false, usable = water, opaque = true } = {}) {
  return {
    entry: {
      kind: "tile",
      drawOrder,
      call: { id, drawSurfaceX: x, drawSurfaceY: y }
    },
    water,
    usable,
    opaque
  };
}

function resolve(tiles, x = 0, y = 0) {
  const byId = new Map(tiles.map((item) => [item.entry.call.id, item]));
  return resolveDrawnSurfaceNavigation({
    candidates: tiles.map((item) => item.entry),
    x,
    y,
    maxDistancePx: 48,
    isWaterTile: (tileId) => byId.get(tileId).water,
    isUsableWaterTile: (tileId) => byId.get(tileId).usable,
    isTileOpaqueAtPoint: (call) => byId.get(call.id).opaque
  });
}

test("transparent nearby land cannot create an obstacle over visibly drawn ocean", () => {
  const surface = resolve([
    tile(1, 1, 0, 1, { water: false, usable: false, opaque: false }),
    tile(2, 18, 0, 0, { water: true, usable: true, opaque: true })
  ]);

  assert.deepEqual(surface, {
    tileId: 2,
    water: true,
    source: "opaque-sprite"
  });
});

test("the topmost opaque land sprite blocks the water visibly beneath it", () => {
  const surface = resolve([
    tile(1, 0, 0, 3, { water: false, usable: false, opaque: true }),
    tile(2, 4, 0, 2, { water: true, usable: true, opaque: true })
  ]);

  assert.deepEqual(surface, {
    tileId: 1,
    water: false,
    source: "opaque-sprite"
  });
});

test("a water sprite drawn over land remains navigable", () => {
  const surface = resolve([
    tile(1, 0, 0, 2, { water: false, usable: false, opaque: true }),
    tile(2, 3, 0, 4, { water: true, usable: true, opaque: true })
  ]);

  assert.equal(surface.tileId, 2);
  assert.equal(surface.water, true);
});

test("visible surface ice blocks a water tile", () => {
  const surface = resolve([
    tile(2, 0, 0, 4, { water: true, usable: false, opaque: true })
  ]);

  assert.deepEqual(surface, {
    tileId: 2,
    water: false,
    source: "opaque-sprite"
  });
});

test("connector gaps inherit the nearest drawn water surface", () => {
  const surface = resolve([
    tile(1, 8, 0, 2, { water: false, usable: false, opaque: false }),
    tile(2, 12, 0, 1, { water: true, usable: true, opaque: false })
  ]);

  assert.deepEqual(surface, {
    tileId: 2,
    water: true,
    source: "connector-gap"
  });
});

test("continuous drawn ocean does not require global tile adjacency", () => {
  assert.equal(drawnNavigationTransitionAllowed("openWater", "openWater", () => false), true);
  assert.equal(drawnNavigationTransitionAllowed("openWater", "land", () => false), false);
  assert.equal(drawnNavigationTransitionAllowed("openWater", "land", () => true), true);
});
