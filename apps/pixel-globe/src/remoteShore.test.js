import assert from "node:assert/strict";
import test from "node:test";

import {
  CASTAWAY_REMOTE_MIN_DISTANCE_KM,
  isRemoteCastawayShore
} from "./remoteShore.js";

function lineWorld(count, waterIds = []) {
  const water = new Set(waterIds);
  return {
    graph: {
      subdivisions: 7,
      tileCount: count,
      neighbors: Array.from({ length: count }, (_, index) => [index - 1, index + 1]
        .filter((neighbor) => neighbor >= 0 && neighbor < count))
    },
    earthRows: Array.from({ length: count }, (_, id) => ({
      id,
      t: water.has(id) ? "water" : "grass"
    }))
  };
}

test("a shore 600 nominal land kilometres from the nearest settlement is remote", () => {
  const world = lineWorld(14);
  assert.equal(isRemoteCastawayShore({
    ...world,
    settlementTileIds: [10],
    shoreTileId: 0
  }), true);
  assert.equal(CASTAWAY_REMOTE_MIN_DISTANCE_KM, 600);
});

test("a settlement closer than 600 nominal land kilometres prevents a castaway", () => {
  const world = lineWorld(10);
  assert.equal(isRemoteCastawayShore({
    ...world,
    settlementTileIds: [9],
    shoreTileId: 0
  }), false);
});

test("a nearby settlement across water is not connected by land", () => {
  const world = lineWorld(6, [2]);
  assert.equal(isRemoteCastawayShore({
    ...world,
    settlementTileIds: [4],
    shoreTileId: 0
  }), true);
});

test("a settlement on the shore itself is never remote", () => {
  const world = lineWorld(2);
  assert.equal(isRemoteCastawayShore({
    ...world,
    settlementTileIds: [0],
    shoreTileId: 0
  }), false);
});

test("frozen water anchorages are not castaway shores", () => {
  const world = lineWorld(3, [0]);
  assert.equal(isRemoteCastawayShore({
    ...world,
    settlementTileIds: [2],
    shoreTileId: 0
  }), false);
});
