import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGeodesicGraph,
  createDirectionIndex,
  graphCenter
} from "./geodesic.js";
import {
  approximateOceanRumorTileId,
  oceanRumorTileIsNavigable
} from "./oceanRumorSearch.js";

const EARTH_RADIUS_KM = 6371;

test("ocean rumors move landward samples onto reachable coastal water", () => {
  const graph = buildGeodesicGraph(4);
  const earthRows = Array.from({ length: graph.tileCount }, () => ({ t: "land" }));
  const navigationMask = new Uint8Array(graph.tileCount);
  const originTileId = 0;
  const coastalTileId = graph.neighbors[originTileId][0];
  earthRows[originTileId] = { t: "beach" };
  earthRows[coastalTileId] = { t: "beach" };
  navigationMask[originTileId] = 1;
  navigationMask[coastalTileId] = 1;

  const tileId = approximateOceanRumorTileId({
    graph,
    directionIndex: createDirectionIndex(graph),
    earthRows,
    navigationMask,
    originPosition: graphCenter(graph, originTileId),
    seed: 0x2df10a1e,
    earthRadiusKm: EARTH_RADIUS_KM
  });

  assert.equal(tileId, coastalTileId);
});

test("ocean rumor eligibility includes coastal water but excludes isolated water", () => {
  const earthRows = [
    { t: "water" },
    { t: "beach" },
    { t: "lake" },
    { t: "land" }
  ];
  const navigationMask = Uint8Array.from([1, 1, 0, 1]);

  assert.equal(oceanRumorTileIsNavigable(earthRows, navigationMask, 0), true);
  assert.equal(oceanRumorTileIsNavigable(earthRows, navigationMask, 1), true);
  assert.equal(oceanRumorTileIsNavigable(earthRows, navigationMask, 2), false);
  assert.equal(oceanRumorTileIsNavigable(earthRows, navigationMask, 3), false);
});

test("ocean rumors still fail loudly when the world has no reachable water", () => {
  const graph = buildGeodesicGraph(0);
  assert.throws(() => approximateOceanRumorTileId({
    graph,
    directionIndex: createDirectionIndex(graph),
    earthRows: Array.from({ length: graph.tileCount }, () => ({ t: "land" })),
    navigationMask: new Uint8Array(graph.tileCount),
    originPosition: graphCenter(graph, 0),
    seed: 1,
    earthRadiusKm: EARTH_RADIUS_KM
  }), /no navigable water/);
});
