import assert from "node:assert/strict";
import test from "node:test";

import { greatCircleDistanceKm, initialBearingDeg } from "./worldDistance.js";

test("great-circle distance is zero at one coordinate", () => {
  assert.equal(greatCircleDistanceKm({ lat: 45, lon: -73 }, { lat: 45, lon: -73 }), 0);
});

test("initial bearings point colony defenders toward their settlement", () => {
  const bearing = initialBearingDeg(
    { lat: 45.31, lon: -74.01 },
    { lat: 45.50884, lon: -73.58781 }
  );

  assert.ok(bearing > 50 && bearing < 70, `unexpected Ville-Marie bearing ${bearing}`);
  assert.equal(initialBearingDeg({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 0);
  assert.equal(initialBearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }), 90);
});

test("initial bearings reject malformed saved encounter coordinates", () => {
  assert.throws(
    () => initialBearingDeg({ lat: Number.NaN, lon: 0 }, { lat: 0, lon: 0 }),
    /finite latitude and longitude/
  );
});
