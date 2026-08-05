import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDirectChartProtectionComponents,
  buildChartTileProtection,
  chartProtectionStats,
  CHART_PROTECTION_DIRECT,
  CHART_PROTECTION_RING_ONE,
  CHART_PROTECTION_RING_TWO
} from "./chartTileProtection.js";

test("terrain boundaries, features, and pentagons receive a two-ring protection buffer", () => {
  const graph = lineGraph(12, new Set([11]));
  const terrain = [
    "ocean", "ocean", "ocean", "ocean", "ocean", "ocean", "ocean",
    "land", "land", "land", "land", "land"
  ];
  const protection = buildChartTileProtection({
    graph,
    terrainClassForTile: (tileId) => terrain[tileId],
    featureTileIds: [1]
  });

  assert.deepEqual([...protection], [
    CHART_PROTECTION_RING_ONE,
    CHART_PROTECTION_DIRECT,
    CHART_PROTECTION_RING_ONE,
    CHART_PROTECTION_RING_TWO,
    CHART_PROTECTION_RING_TWO,
    CHART_PROTECTION_RING_ONE,
    CHART_PROTECTION_DIRECT,
    CHART_PROTECTION_DIRECT,
    CHART_PROTECTION_RING_ONE,
    CHART_PROTECTION_RING_TWO,
    CHART_PROTECTION_RING_ONE,
    CHART_PROTECTION_DIRECT
  ]);
});

test("the interior of a large uniform region remains elastic", () => {
  const graph = lineGraph(11);
  const protection = buildChartTileProtection({
    graph,
    terrainClassForTile: () => "deep-ocean",
    featureTileIds: [0, 10]
  });

  assert.equal(protection[5], 0);
  assert.deepEqual(chartProtectionStats(protection), {
    direct: 2,
    buffered: 4,
    elastic: 5,
    total: 11
  });
});

test("a narrow water channel and both opposing coasts are directly protected", () => {
  const graph = lineGraph(3);
  const terrain = ["land", "ocean", "land"];
  const protection = buildChartTileProtection({
    graph,
    terrainClassForTile: (tileId) => terrain[tileId]
  });

  assert.deepEqual([...protection], [
    CHART_PROTECTION_DIRECT,
    CHART_PROTECTION_DIRECT,
    CHART_PROTECTION_DIRECT
  ]);
  assert.deepEqual([...buildDirectChartProtectionComponents({ graph, protection })], [0, 0, 0]);
});

test("protected fragments share their global component across an unseen connection", () => {
  const graph = lineGraph(7);
  const protection = new Uint8Array([
    255, 255, 255, 255, 255, 255, 255
  ]);
  const components = buildDirectChartProtectionComponents({ graph, protection });

  assert.equal(components[0], components[6]);
});

test("chart protection rejects malformed feature tiles and terrain classes", () => {
  const graph = lineGraph(3);
  assert.throws(
    () => buildChartTileProtection({
      graph,
      terrainClassForTile: () => "",
      featureTileIds: []
    }),
    /terrain class/
  );
  assert.throws(
    () => buildChartTileProtection({
      graph,
      terrainClassForTile: () => "ocean",
      featureTileIds: [3]
    }),
    /feature tile/
  );
});

function lineGraph(tileCount, pentagons = new Set()) {
  return {
    tileCount,
    neighbors: Array.from({ length: tileCount }, (_, tileId) => [
      ...(tileId > 0 ? [tileId - 1] : []),
      ...(tileId + 1 < tileCount ? [tileId + 1] : [])
    ]),
    isPentagon: Uint8Array.from(
      { length: tileCount },
      (_, tileId) => pentagons.has(tileId) ? 1 : 0
    )
  };
}
