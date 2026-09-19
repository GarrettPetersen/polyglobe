import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { portApproachReachable } from "./portApproach.js";
import { canTraverseWorldNavigationEdge, buildWorldNavigationTopology } from "./worldNavigationTopology.js";
import { decodeGeodesicGraphBake } from "./geodesicBake.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import { createDirectionIndex } from "./geodesic.js";
import { CITY_DATA_YEAR, loadCityCatalogFromCsv } from "./cityCatalogData.js";
import { placeCityCatalogOnWorld, portAccessTileIds, portCitiesOnWorld } from "./worldPortPlacement.js";
import { isWaterSurfaceRow } from "./terrainSurface.js";

test("coastal boarding does not require a river mouth or make inland shortcuts navigable", () => {
  const neighbors = [[1, 2, 4], [0, 3], [0, 5], [1], [0], [2]];
  const options = {
    graph: { neighbors, edgeNeighbors: neighbors },
    earthRows: ["land", "water", "land", "water", "land", "water"].map(t => ({ t })),
    riverMasks: Uint8Array.from([4, 0, 0, 0, 1, 0]),
    riverToWaterMasks: new Uint8Array(6), portTileId: 0
  };
  for (const shipTileId of [0, 1, 3, 4]) {
    assert.equal(portApproachReachable({ ...options, shipTileId }), true);
  }
  for (const shipTileId of [2, 5]) {
    assert.equal(portApproachReachable({ ...options, shipTileId }), false);
  }
  assert.equal(canTraverseWorldNavigationEdge({ ...options, fromTileId: 1, toTileId: 0 }), false,
    "boarding a coastal quay must not create a sailing edge into land");
  assert.throws(() => portApproachReachable({ ...options, shipTileId: -1 }), /valid ship and port tiles/);
  assert.throws(() => portApproachReachable({ ...options, shipTileId: 1, portTileId: 99 }), /valid ship and port tiles/);
});

test("real-map Gelibolu and every coastal river port accept their adjacent open-water approaches", t => {
  const dataRoot = new URL("../../../examples/globe-demo/public/", import.meta.url);
  const bytes = readFileSync(new URL("geodesic-graph-8.bin", dataRoot));
  const graph = decodeGeodesicGraphBake(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), 8);
  const earth = JSON.parse(readFileSync(new URL("earth-globe-cache-8.json", dataRoot), "utf8"));
  const earthRows = applyManualTerrainOverrides(earth.tiles, 8);
  const navigation = buildWorldNavigationTopology({ graph, earthRows, earthCache: earth, subdivisions: 8 });
  const csv = readFileSync(new URL("datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", dataRoot), "utf8");
  const options = { graph, earthRows, ...navigation, directionIndex: createDirectionIndex(graph) };
  const placed = placeCityCatalogOnWorld({ ...options, cities: loadCityCatalogFromCsv(csv, CITY_DATA_YEAR) });
  const ports = portCitiesOnWorld(placed, options);
  for (const port of ports) {
    const approachTiles = portAccessTileIds(options, port.tileId);
    assert.ok(approachTiles.some((shipTileId) => portApproachReachable({
      ...options,
      shipTileId,
      portTileId: port.tileId
    })), `${port.cityId} is catalogued as a port but cannot be entered from its access tiles`);
  }
  const gelibolu = ports.find(port => port.cityId === "gelibolu|turkey");
  assert.ok(gelibolu);
  const northWater = graph.neighbors[gelibolu.tileId].filter(id =>
    isWaterSurfaceRow(earthRows[id]) && graph.latDeg[id] > graph.latDeg[gelibolu.tileId]);
  assert.ok(northWater.length >= 2, "exercise the reported northern shoreline");
  for (const shipTileId of northWater) {
    assert.equal(portApproachReachable({ ...options, shipTileId, portTileId: gelibolu.tileId }), true);
  }
  const reviewedPorts = [];
  for (const port of ports) {
    if (!navigation.riverMasks[port.tileId] || isWaterSurfaceRow(earthRows[port.tileId])) continue;
    const waterNeighbors = graph.neighbors[port.tileId].filter(id =>
      isWaterSurfaceRow(earthRows[id]) && navigation.reachableNavigationMask[id]);
    if (!waterNeighbors.length) continue;
    reviewedPorts.push(port.cityId);
    for (const shipTileId of waterNeighbors) {
      assert.equal(portApproachReachable({ ...options, shipTileId, portTileId: port.tileId }), true,
        `${port.cityId} rejects adjacent coastal water at ${shipTileId}`);
    }
  }
  t.diagnostic(`Coastal river ports reviewed: ${reviewedPorts.join(", ")}`);
  assert.ok(reviewedPorts.length > 1, "cover the broader coastal/river-port class, not just Gelibolu");
});
