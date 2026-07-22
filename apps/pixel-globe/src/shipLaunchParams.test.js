import assert from "node:assert/strict";
import test from "node:test";

import { startShipSlugFromSearch } from "./shipLaunchParams.js";

const SHIPS = new Set(["dhow", "pirate-brig"]);

test("live ship URL state does not override a new voyage's starter ship", () => {
  assert.equal(startShipSlugFromSearch("?ship=pirate-brig", SHIPS), null);
});

test("development URLs can explicitly override the starting ship", () => {
  assert.equal(startShipSlugFromSearch("?startShip=pirate-brig", SHIPS), "pirate-brig");
});

test("starting ship overrides reject unknown ships", () => {
  assert.throws(
    () => startShipSlugFromSearch("?startShip=flying-dutchman", SHIPS),
    /Unknown starting ship type/
  );
});
