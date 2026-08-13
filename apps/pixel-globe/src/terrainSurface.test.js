import test from "node:test";
import assert from "node:assert/strict";
import {
  compareTerrainConnectorDrawOrder,
  isCoastalWaterRow,
  isFrozenShoreRow,
  isPermanentSeaIceRow,
  isShipUsableSurfaceWater,
  isWhaleOpenSurfaceRow,
  isWhaleSwimmableOceanRow,
  isWaterSurfaceRow,
  terrainConnectorDrawGroup,
  terrainRowsFormFrozenWaterBoundary,
  terrainRowsNeedLandmassChannel,
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

test("terrain connector draw groups can be cached on immutable calls", () => {
  assert.equal(terrainConnectorDrawGroup({ row: { t: "land" }, nrow: { t: "forest" } }), 0);
  assert.equal(terrainConnectorDrawGroup({ row: { t: "water" }, nrow: { t: "land" } }), 1);
  assert.equal(terrainConnectorDrawGroup({ drawGroup: 1 }), 1);
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

test("whales swim beneath sea ice but only surface in open ocean", () => {
  assert.equal(isWhaleSwimmableOceanRow({ t: "water" }), true);
  assert.equal(isWhaleSwimmableOceanRow({ t: "ice" }), true);
  assert.equal(isWhaleSwimmableOceanRow({ t: "ice_cap" }), false);
  assert.equal(isWhaleSwimmableOceanRow({ t: "land" }), false);
  assert.equal(isWhaleOpenSurfaceRow({ t: "water" }, false), true);
  assert.equal(isWhaleOpenSurfaceRow({ t: "water" }, true), false);
  assert.equal(isWhaleOpenSurfaceRow({ t: "ice" }, false), false);
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

test("every ordinary water-to-land connector is beach in either row order", () => {
  const waterTerrains = ["water", "lake", "beach"];
  const landTerrains = ["land", "grass", "forest", "jungle", "desert", "mountain"];
  for (const water of waterTerrains) {
    for (const land of landTerrains) {
      assert.equal(
        terrainRowsNeedBeach({ t: water }, { t: land }),
        true,
        `${water} to ${land}`
      );
      assert.equal(
        terrainRowsNeedBeach({ t: land }, { t: water }),
        true,
        `${land} to ${water}`
      );
    }
  }
  assert.equal(terrainRowsNeedBeach({ t: "water" }, { t: "lake" }), false);
  assert.equal(terrainRowsNeedBeach({ t: "land" }, { t: "forest" }), false);
});

test("different landmass ids always create a water channel between land rasters", () => {
  assert.equal(
    terrainRowsNeedLandmassChannel({ t: "forest", m: 57 }, { t: "grass", m: 1287 }),
    true
  );
  assert.equal(
    terrainRowsNeedLandmassChannel({ t: "forest", m: 57 }, { t: "grass", m: 57 }),
    false
  );
  assert.equal(
    terrainRowsNeedLandmassChannel({ t: "water", m: 57 }, { t: "grass", m: 1287 }),
    false
  );
  assert.equal(
    terrainRowsNeedLandmassChannel({ t: "forest" }, { t: "grass", m: 1287 }),
    false
  );
});

test("polar ice boundaries never create sandy beaches", () => {
  assert.equal(isFrozenShoreRow({ t: "ice", o: 1 }), true);
  assert.equal(isFrozenShoreRow({ t: "ice_cap", m: 1185 }), true);
  assert.equal(terrainRowsNeedBeach({ t: "water" }, { t: "ice", o: 1 }), false);
  assert.equal(terrainRowsNeedBeach({ t: "ice_cap", m: 1185 }, { t: "water" }), false);
});

test("polar ice boundaries are recognized without treating ordinary shores as frozen", () => {
  assert.equal(terrainRowsFormFrozenWaterBoundary({ t: "water" }, { t: "ice", o: 1 }), true);
  assert.equal(terrainRowsFormFrozenWaterBoundary({ t: "ice_cap", m: 1185 }, { t: "water" }), true);
  assert.equal(terrainRowsFormFrozenWaterBoundary({ t: "water" }, { t: "land" }), false);
  assert.equal(terrainRowsFormFrozenWaterBoundary({ t: "ice" }, { t: "ice_cap" }), false);
});
