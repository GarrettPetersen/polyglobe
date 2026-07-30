import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILD_EDITION_ID
} from "./buildEdition.js";
import {
  DEMO_ESCAPE_GRACE_HEXES,
  buildDemoMediterraneanAccessMask,
  demoEscapeRequiresRecovery,
  navigationDistanceFromAccessMask,
  startMenuEditionLabel
} from "./demoVoyage.js";

test("the checked-in source remains the full edition", () => {
  assert.equal(BUILD_EDITION_ID, "full");
  assert.equal(startMenuEditionLabel(BUILD_EDITION_ID), null);
});

test("only the demo build labels itself on the start menu", () => {
  assert.equal(startMenuEditionLabel("demo"), "DEMO");
  assert.throws(() => startMenuEditionLabel("preview"), /Unknown build edition/);
});

test("the Mediterranean demo flood fill stops at Gibraltar and includes connected rivers", () => {
  // 0 Mediterranean, 1 Gibraltar barrier, 2 Atlantic, 3 Black Sea,
  // 4 Danube, 5 Nile, 6 Suez land, 7 Red Sea, 8 Indian Ocean.
  const graph = {
    tileCount: 9,
    neighbors: [
      [1, 3, 5, 6],
      [0, 2],
      [1],
      [0, 4],
      [3],
      [0],
      [0, 7],
      [6, 8],
      [7]
    ]
  };
  const navigable = new Set([0, 1, 2, 3, 4, 5, 7, 8]);
  const mask = buildDemoMediterraneanAccessMask({
    graph,
    seedTileId: 0,
    blockedTileIds: [1],
    isNavigableTile: (tileId) => navigable.has(tileId),
    canTraverseEdge: () => true
  });

  assert.deepEqual([...mask], [1, 0, 0, 1, 1, 1, 0, 0, 0]);
});

test("escape recovery allows a ten-hex grace band beyond the demo access mask", () => {
  const tileCount = DEMO_ESCAPE_GRACE_HEXES + 3;
  const graph = {
    tileCount,
    neighbors: Array.from({ length: tileCount }, (_, tileId) => (
      [tileId - 1, tileId + 1].filter((neighborId) => neighborId >= 0 && neighborId < tileCount)
    ))
  };
  const accessMask = new Uint8Array(tileCount);
  accessMask[0] = 1;
  const distances = navigationDistanceFromAccessMask(graph, accessMask);

  assert.equal(demoEscapeRequiresRecovery(DEMO_ESCAPE_GRACE_HEXES, distances), false);
  assert.equal(demoEscapeRequiresRecovery(DEMO_ESCAPE_GRACE_HEXES + 1, distances), true);
});
