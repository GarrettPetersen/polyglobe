import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_PORT_ACCESS_RING_DISTANCE,
  cityHasPortAccess,
  cityIsLandlocked,
  cityPortAccessRingDistance
} from "./cityPortAccess.js";

test("cities are ports only within the shared navigable-water access ring", () => {
  const context = {
    graph: { neighbors: [[1], [0, 2], [1]] },
    earthRows: [{ t: "grass" }, { t: "grass" }, { t: "water" }],
    reachableNavigationMask: Uint8Array.from([0, 0, 1]),
    riverMasks: new Uint8Array(3)
  };

  assert.equal(CITY_PORT_ACCESS_RING_DISTANCE, 1);
  assert.equal(cityPortAccessRingDistance({ ...context, tileId: 1 }), 1);
  assert.equal(cityHasPortAccess({ ...context, tileId: 1 }), true);
  assert.equal(cityIsLandlocked({ ...context, tileId: 1 }), false);
  assert.equal(cityPortAccessRingDistance({ ...context, tileId: 0 }), Infinity);
  assert.equal(cityHasPortAccess({ ...context, tileId: 0 }), false);
  assert.equal(cityIsLandlocked({ ...context, tileId: 0 }), true);
});

test("unreachable water does not make a city a port", () => {
  const context = {
    graph: { neighbors: [[1], [0]] },
    earthRows: [{ t: "grass" }, { t: "water" }],
    reachableNavigationMask: new Uint8Array(2),
    riverMasks: new Uint8Array(2),
    tileId: 0
  };

  assert.equal(cityIsLandlocked(context), true);
});

test("a navigable river tile provides port access", () => {
  const context = {
    graph: { neighbors: [[]] },
    earthRows: [{ t: "grass" }],
    reachableNavigationMask: Uint8Array.from([1]),
    riverMasks: Uint8Array.from([1]),
    tileId: 0
  };

  assert.equal(cityPortAccessRingDistance(context), 0);
  assert.equal(cityIsLandlocked(context), false);
});
