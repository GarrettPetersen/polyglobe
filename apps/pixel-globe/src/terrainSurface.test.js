import test from "node:test";
import assert from "node:assert/strict";
import {
  isCoastalWaterRow,
  isFrozenShoreRow,
  isWaterSurfaceRow,
  terrainRowsNeedBeach
} from "./terrainSurface.js";

test("shared coastal-water terrain remains navigable water", () => {
  assert.equal(isCoastalWaterRow({ t: "beach" }), true);
  assert.equal(isWaterSurfaceRow({ t: "beach" }), true);
  assert.equal(isWaterSurfaceRow({ t: "water" }), true);
  assert.equal(isWaterSurfaceRow({ t: "lake" }), true);
  assert.equal(isWaterSurfaceRow({ t: "ice" }), false);
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
