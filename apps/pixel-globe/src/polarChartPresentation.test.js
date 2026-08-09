import assert from "node:assert/strict";
import test from "node:test";

import {
  PERMANENT_POLAR_CAP_LATITUDE_DEG,
  isBeyondPermanentPolarCap,
  polarChartTerrainRow
} from "./polarChartPresentation.js";

test("the non-navigable polar caps render as featureless snow", () => {
  const russianLand = { t: "subarctic", e: 0.12, h: 1, m: 42 };
  const polarSea = { t: "ice", o: 1 };

  assert.equal(polarChartTerrainRow(russianLand, 73.99), russianLand);
  assert.deepEqual(polarChartTerrainRow(russianLand, 74), {
    t: "ice_cap",
    e: 0,
    h: 0
  });
  assert.equal(polarChartTerrainRow(polarSea, -74).t, "ice_cap");
  assert.equal(polarChartTerrainRow(russianLand, 90).m, undefined);
});

test("the polar presentation boundary matches the permanent navigation cap", () => {
  assert.equal(PERMANENT_POLAR_CAP_LATITUDE_DEG, 74);
  assert.equal(isBeyondPermanentPolarCap(73.999), false);
  assert.equal(isBeyondPermanentPolarCap(74), true);
  assert.equal(isBeyondPermanentPolarCap(-74), true);
  assert.throws(() => isBeyondPermanentPolarCap(Number.NaN), /must be finite/);
});

