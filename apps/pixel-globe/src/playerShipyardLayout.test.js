import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYER_SHIPYARD_FULL_YARD_MIN_HEIGHT,
  playerShipyardUsesCompactYardLayout
} from "./playerShipyardLayout.js";

test("a short shipyard panel uses the compact listing instead of clipping its finished ship", () => {
  assert.equal(playerShipyardUsesCompactYardLayout(150), true);
  assert.equal(playerShipyardUsesCompactYardLayout(179), true);
  assert.equal(
    playerShipyardUsesCompactYardLayout(PLAYER_SHIPYARD_FULL_YARD_MIN_HEIGHT),
    false
  );
});

test("shipyard layout rejects invalid panel heights", () => {
  assert.throws(
    () => playerShipyardUsesCompactYardLayout(0),
    /Invalid player shipyard content height/
  );
});
