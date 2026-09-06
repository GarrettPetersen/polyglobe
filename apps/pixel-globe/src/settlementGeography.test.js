import assert from "node:assert/strict";
import test from "node:test";
import { localSettlementTiles, reviewedSettlementLandmassId } from "./settlementGeography.js";

test("new settlements require an explicitly reviewed landmass rather than inheriting their landing tile", () => {
  assert.throws(() => reviewedSettlementLandmassId({cityId: "unreviewed-settlement"}), /needs a reviewed landmass/);
  assert.throws(() => reviewedSettlementLandmassId({city: "Copenhagen"}), /canonical id/);
  assert.equal(reviewedSettlementLandmassId({cityId: "copenhagen|denmark"}), 280);
  assert.equal(reviewedSettlementLandmassId({cityId: "kalmar|sweden"}), 57);
  assert.equal(reviewedSettlementLandmassId({cityId: "gresik|indonesia"}), 940);
});

test("settlement search stays local even when a distant tile would be convenient", () => {
  const graph = {tileCount: 4, latDeg: [0, 0.2, 1, 1.2], lonDeg: [0, 0, 0, 0],
    neighbors: [[1], [0, 2], [1, 3], [2]]};
  assert.deepEqual(localSettlementTiles({graph, startId: 0, coordinates: {lat: 0, lon: 0}}), [0, 1]);
  assert.throws(() => localSettlementTiles({graph, startId: 4, coordinates: {lat: 0, lon: 0}}), /Invalid settlement placement origin/);
});
