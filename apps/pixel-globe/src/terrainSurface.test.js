import test from "node:test";
import assert from "node:assert/strict";
import {
  compareTerrainConnectorDrawOrder,
  isCoastalWaterRow,
  isFrozenShoreRow,
  isPermanentSeaIceRow,
  isShipUsableSurfaceWater,
  isWaterSurfaceRow,
  terrainRowsNeedBeach
} from "./terrainSurface.js";

test("coastal connectors draw over other connector overlaps", () => {
  const inland = { a: 1, b: 2, row: { t: "land" }, nrow: { t: "forest" }, sortY: 20 };
  const coast = { a: 3, b: 4, row: { t: "water" }, nrow: { t: "land" }, sortY: 5 };
  assert.deepEqual(
    [coast, inland].sort(compareTerrainConnectorDrawOrder),
    [inland, coast]
  );
});

test("shared coastal-water terrain remains navigable water", () => {
  assert.equal(isCoastalWaterRow({ t: "beach" }), true);
  assert.equal(isWaterSurfaceRow({ t: "beach" }), true);
  assert.equal(isWaterSurfaceRow({ t: "water" }), true);
  assert.equal(isWaterSurfaceRow({ t: "lake" }), true);
  assert.equal(isWaterSurfaceRow({ t: "ice" }), false);
});

test("permanent polar pack ice is distinct from land ice caps", () => {
  assert.equal(isPermanentSeaIceRow({ t: "ice", o: 1 }), true);
  assert.equal(isPermanentSeaIceRow({ t: "ice", l: 40 }), true);
  assert.equal(isPermanentSeaIceRow({ t: "ice_cap", m: 1185 }), false);
  assert.equal(isPermanentSeaIceRow({ t: "water" }), false);
});

test("a ship may leave only the seasonal ice tile it already occupies", () => {
  assert.equal(isShipUsableSurfaceWater({ t: "water" }, 12, 12, true), true);
  assert.equal(isShipUsableSurfaceWater({ t: "lake" }, 12, 12, true), true);
  assert.equal(isShipUsableSurfaceWater({ t: "water" }, 13, 12, true), false);
  assert.equal(isShipUsableSurfaceWater({ t: "water" }, 13, 12, false), true);
  assert.equal(isShipUsableSurfaceWater({ t: "ice" }, 12, 12, true), false);
  assert.throws(
    () => isShipUsableSurfaceWater({ t: "water" }, -1, 12, true),
    /Invalid surface ice tile/
  );
});

test("ordinary shores receive beaches in either row order", () => {
  assert.equal(terrainRowsNeedBeach({ t: "water" }, { t: "land" }), true);
  assert.equal(terrainRowsNeedBeach({ t: "land" }, { t: "beach" }), true);
  assert.equal(terrainRowsNeedBeach({ t: "water" }, { t: "lake" }), false);
  assert.equal(terrainRowsNeedBeach({ t: "land" }, { t: "forest" }), false);
});

test("polar ice boundaries never create sandy beaches", () => {
  assert.equal(isFrozenShoreRow({ t: "ice", o: 1 }), true);
  assert.equal(isFrozenShoreRow({ t: "ice_cap", m: 1185 }), true);
  assert.equal(terrainRowsNeedBeach({ t: "water" }, { t: "ice", o: 1 }), false);
  assert.equal(terrainRowsNeedBeach({ t: "ice_cap", m: 1185 }, { t: "water" }), false);
});
