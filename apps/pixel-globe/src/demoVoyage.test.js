import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILD_EDITION_ID
} from "./buildEdition.js";
import {
  DEMO_ESCAPE_GRACE_HEXES,
  DEMO_VOYAGE_SCOPE_MEDITERRANEAN,
  DEMO_VOYAGE_SCOPE_WORLDWIDE,
  buildDemoMediterraneanAccessMask,
  demoAccessiblePortsForMask,
  demoVoyageScopeForSavedGame,
  demoNaturalistAnimalIdsForLandfalls,
  demoEscapeRequiresRecovery,
  isMediterraneanDemoVoyage,
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

test("the last timed worldwide demo save is grandfathered for the rest of its voyage", () => {
  assert.equal(demoVoyageScopeForSavedGame({
    buildEditionId: "demo",
    savedGameStateVersion: 51
  }), DEMO_VOYAGE_SCOPE_WORLDWIDE);
  assert.equal(demoVoyageScopeForSavedGame({
    buildEditionId: "demo",
    savedGameStateVersion: 52
  }), DEMO_VOYAGE_SCOPE_MEDITERRANEAN);
  assert.equal(isMediterraneanDemoVoyage("demo", DEMO_VOYAGE_SCOPE_WORLDWIDE), false);
  assert.equal(isMediterraneanDemoVoyage("demo", DEMO_VOYAGE_SCOPE_MEDITERRANEAN), true);
});

test("an explicit grandfathered scope survives later save migrations", () => {
  assert.equal(demoVoyageScopeForSavedGame({
    buildEditionId: "demo",
    savedScope: DEMO_VOYAGE_SCOPE_WORLDWIDE,
    savedGameStateVersion: 53
  }), DEMO_VOYAGE_SCOPE_WORLDWIDE);
  assert.equal(demoVoyageScopeForSavedGame({
    buildEditionId: "full",
    savedScope: DEMO_VOYAGE_SCOPE_WORLDWIDE,
    savedGameStateVersion: 51
  }), null);
  assert.throws(() => demoVoyageScopeForSavedGame({
    buildEditionId: "demo",
    savedScope: "atlantic",
    savedGameStateVersion: 53
  }), /Unknown saved demo voyage scope/);
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

test("the Mediterranean demo derives its port list from the current navigation mask", () => {
  const accessMask = Uint8Array.from([1, 0, 1, 0]);
  const ports = [
    { city: "Birgu", tileId: 10 },
    { city: "Funchal", tileId: 11 },
    { city: "Cagliari", tileId: 12 }
  ];
  const harborTiles = new Map([
    [10, [0]],
    [11, [1]],
    [12, [2]]
  ]);

  assert.deepEqual(
    demoAccessiblePortsForMask({
      ports,
      accessMask,
      accessTileIdsForPort: (port) => harborTiles.get(port.tileId)
    }).map((port) => port.city),
    ["Birgu", "Cagliari"]
  );
  assert.throws(
    () => demoAccessiblePortsForMask({ ports, accessMask: [] }),
    /navigation mask/
  );
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

test("the demo naturalist roster contains only animals at accessible landfalls", () => {
  const graph = {
    tileCount: 5,
    neighbors: [[1], [0, 2], [1, 3], [2, 4], [3]],
    latDeg: [35, 35, 35, -30, -30],
    lonDeg: [20, 20, 20, 135, 135]
  };
  const accessMask = Uint8Array.from([1, 0, 0, 0, 0]);
  const earthRows = [
    { t: "ocean" },
    { t: "forest" },
    { t: "forest" },
    { t: "grass" },
    { t: "ocean" }
  ];
  const animalCatalog = [
    { id: "fox", matches: ({ terrain }) => terrain === "forest" },
    { id: "kangaroo", matches: ({ latitudeDeg, terrain }) => (
      latitudeDeg < 0 && terrain === "grass"
    ) }
  ];
  assert.deepEqual(
    demoNaturalistAnimalIdsForLandfalls({
      graph,
      accessMask,
      earthRows,
      riverMasks: new Uint8Array(graph.tileCount),
      animalCatalog,
      isWaterSurfaceRow: (row) => row.t === "ocean"
    }),
    ["fox"]
  );
});
