import assert from "node:assert/strict";
import test from "node:test";

import { shipCanRefillFreshWater } from "./freshWaterAccess.js";
import { MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS } from "./manualRiverHexChains.js";

const SALTWATER_PASSAGES = MANUAL_SALTWATER_PASSAGE_HEX_IDS_BY_SUBDIVISIONS[7];

test("only an exact navigable river position refills fresh water", () => {
  assert.equal(refill("river", 12345), true);
  assert.equal(refill("openWater", 12345), false);
  assert.equal(refill("lake", 12345), false);
});

test("saltwater straits represented as river channels do not refill", () => {
  for (const tileId of SALTWATER_PASSAGES) {
    assert.equal(refill("river", tileId), false, `saltwater passage tile ${tileId}`);
  }
});

test("frozen rivers do not refill", () => {
  assert.equal(refill("river", 12345, true), false);
});

function refill(navigationKind, riverTileId, frozen = false) {
  return shipCanRefillFreshWater({
    navigationKind,
    riverTileId,
    frozen,
    saltwaterPassageTileIds: SALTWATER_PASSAGES
  });
}
