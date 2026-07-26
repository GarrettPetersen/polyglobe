import assert from "node:assert/strict";
import test from "node:test";
import {
  STORM_ACTIVE_INTENSITY,
  buildStormExposure,
  buildStormShelterRoutes,
  nearestStormShelterTile,
  nextStormShelterTile,
  rainCollectionStrength,
  stormDamageForHour,
  stormIntensityAtPosition,
  stormWindStrength
} from "./stormSystem.js";

test("every active storm supplies collectible rainwater", () => {
  assert.equal(rainCollectionStrength({ raining: false, snowing: false, stormIntensity: 0 }), 0);
  assert.equal(rainCollectionStrength({ raining: true, snowing: false, stormIntensity: 0 }), 0.35);
  assert.equal(rainCollectionStrength({ raining: false, snowing: true, stormIntensity: 0 }), 0);
  assert.equal(rainCollectionStrength({
    raining: false,
    snowing: true,
    stormIntensity: STORM_ACTIVE_INTENSITY
  }), 0.8);
  assert.equal(rainCollectionStrength({ raining: false, snowing: false, stormIntensity: 1 }), 1);
});

test("open ocean is more storm-exposed than an enclosed bay", () => {
  const neighbors = [
    [1, 2],
    [0, 2, 3],
    [0, 1, 3, 4],
    [1, 2, 4, 5],
    [2, 3, 5, 6],
    [3, 4, 6],
    [4, 5]
  ];
  const waterMask = Uint8Array.from([0, 0, 1, 1, 1, 1, 1]);
  const oceanMask = Uint8Array.from([0, 0, 1, 1, 1, 1, 1]);
  const exposure = buildStormExposure({ neighbors, waterMask, oceanMask });

  assert.ok(exposure[6] > exposure[2]);
  assert.ok(exposure[6] > 0.5);
});

test("open-ocean tiles route to the nearest reachable shoreline", () => {
  const neighbors = [[1], [0, 2], [1, 3], [2, 4], [3]];
  const waterMask = Uint8Array.from([0, 1, 1, 1, 1]);
  const oceanMask = Uint8Array.from([0, 1, 1, 1, 1]);
  const routes = buildStormShelterRoutes({ neighbors, waterMask, oceanMask });
  const system = {
    exposure: new Float32Array(5),
    nearestShelterTile: routes.nearest,
    nextShelterTile: routes.next
  };

  assert.equal(nearestStormShelterTile(system, 4), 1);
  assert.equal(nextStormShelterTile(system, 4), 3);
  assert.equal(nearestStormShelterTile(system, 1), 1);
  assert.equal(nearestStormShelterTile(system, 0), null);
});

test("one storm cell affects a contiguous area and weakens at its edge", () => {
  const cells = [{ latDeg: 10, lonDeg: 20, radiusDeg: 12, strength: 0.9 }];
  const center = stormIntensityAtPosition(cells, 10, 20);
  const nearby = stormIntensityAtPosition(cells, 13, 22);
  const edge = stormIntensityAtPosition(cells, 10, 30);
  const outside = stormIntensityAtPosition(cells, 10, 40);

  assert.equal(center, 0.9);
  assert.ok(nearby > edge);
  assert.ok(edge > 0);
  assert.equal(outside, 0);
});

test("storm bounds preserve wrapped and high-latitude cells", () => {
  const dateline = [{ latDeg: 5, lonDeg: 179, radiusDeg: 12, strength: 0.9 }];
  const highLatitude = [{ latDeg: 70, lonDeg: 20, radiusDeg: 16, strength: 0.9 }];

  assert.ok(stormIntensityAtPosition(dateline, 5, -179) > 0);
  assert.ok(stormIntensityAtPosition(highLatitude, 70, 50) > 0);
  assert.equal(stormIntensityAtPosition(highLatitude, 45, 20), 0);
});

test("storms amplify local wind without exceeding the safety cap", () => {
  assert.equal(stormWindStrength(0.8, 0), 0.8);
  assert.ok(stormWindStrength(0.8, 0.8) > 1.5);
  assert.equal(stormWindStrength(4, 1), 2.6);
});

test("seaworthy ships take less storm damage over the same hours", () => {
  let frailDamage = 0;
  let seaworthyDamage = 0;
  for (let hourIndex = 0; hourIndex < 240; hourIndex++) {
    frailDamage += stormDamageForHour({
      intensity: 1,
      seaworthiness: 2,
      maxHull: 200,
      hourIndex
    });
    seaworthyDamage += stormDamageForHour({
      intensity: 1,
      seaworthiness: 9,
      maxHull: 200,
      hourIndex
    });
  }

  assert.ok(frailDamage > seaworthyDamage * 2);
  assert.equal(stormDamageForHour({
    intensity: 0.2,
    seaworthiness: 2,
    maxHull: 200,
    hourIndex: 1
  }), 0);
});
