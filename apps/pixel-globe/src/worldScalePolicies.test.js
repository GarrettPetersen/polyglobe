import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { coastalWaterBands, terrainStepDistanceKm } from "./terrainDistance.js";
import { isRemoteCastawayShore } from "./remoteShore.js";
import { buildStormExposure } from "./stormSystem.js";
import { navigationDistanceKmFromAccessMask, demoEscapeRequiresRecovery, DEMO_WARNING_REARM_DISTANCE_KM } from "./demoVoyage.js";
import { WORLD_KINEMATIC_SCALE, WORLD_PIXELS_PER_RADIAN } from "./worldScale.js";

function lineWorld(subdivisions) {
  const stepKm = terrainStepDistanceKm(subdivisions);
  const tileCount = 1200 / stepKm + 1;
  const graph = { subdivisions, tileCount, neighbors: Array.from({ length: tileCount }, (_, id) =>
    [id - 1, id + 1].filter((neighbor) => neighbor >= 0 && neighbor < tileCount)) };
  return { graph, stepKm };
}

for (const subdivisions of [6, 7, 8]) {
  test(`geographic policy boundaries survive subdivision ${subdivisions}`, () => {
    const { graph, stepKm } = lineWorld(subdivisions);
    const earthRows = Array.from({ length: graph.tileCount }, () => ({ t: "grass" }));
    for (const distanceKm of [480, 600, 720]) {
      assert.equal(isRemoteCastawayShore({ graph, earthRows, shoreTileId: 0,
        settlementTileIds: [distanceKm / stepKm] }), distanceKm >= 600);
    }
    // A water gap still prevents a settlement from supplying a stranded walker.
    earthRows[1] = { t: "water" };
    assert.equal(isRemoteCastawayShore({ graph, earthRows, shoreTileId: 0,
      settlementTileIds: [480 / stepKm] }), true);
    const access = new Uint8Array(graph.tileCount);
    access[0] = 1;
    const distancesKm = navigationDistanceKmFromAccessMask(graph, access);
    assert.equal(distancesKm[600 / stepKm], 600);
    assert.equal(demoEscapeRequiresRecovery(600 / stepKm, distancesKm), false);
    assert.equal(demoEscapeRequiresRecovery(600 / stepKm + 1, distancesKm), true);
    const oceanMask = Uint8Array.from(access, (land) => 1 - land);
    const bands = coastalWaterBands({ ...graph, oceanMask });
    assert.equal(bands[120 / stepKm], 2);
    assert.equal(bands[240 / stepKm], 4);
    assert.equal(bands[360 / stepKm], 5);
    const exposure = buildStormExposure({ ...graph, waterMask: oceanMask, oceanMask });
    const reference = lineWorld(7);
    const referenceWater = Uint8Array.from({ length: reference.graph.tileCount }, (_, id) => id > 0 ? 1 : 0);
    const referenceExposure = buildStormExposure({ ...reference.graph, waterMask: referenceWater, oceanMask: referenceWater });
    for (const km of [240, 360, 600]) assert.equal(exposure[km / stepKm], referenceExposure[km / reference.stepKm]);
  });
}

test("geographic policies reject missing resolution and preserve disconnected distances", () => {
  assert.throws(() => terrainStepDistanceKm(undefined), /subdivision/);
  assert.throws(() => terrainStepDistanceKm(9), /subdivision/);
  const graph = { subdivisions: 8, tileCount: 2, neighbors: [[], []] };
  const distances = navigationDistanceKmFromAccessMask(graph, Uint8Array.from([1, 0]));
  assert.equal(distances[1], Infinity);
  assert.equal(demoEscapeRequiresRecovery(1, distances), true);
  assert.throws(() => coastalWaterBands({ ...graph, oceanMask: new Uint8Array(2), bandWidthKm: 0 }), /distance bands/);
});

test("water components without any land receive deep shading and full offshore exposure", () => {
  const neighbors = [[1], [0]];
  const oceanMask = Uint8Array.from([1, 1]);
  assert.deepEqual([...coastalWaterBands({ neighbors, oceanMask, subdivisions: 8 })], [5, 5]);
  assert.deepEqual([...buildStormExposure({ neighbors, oceanMask, waterMask: oceanMask, subdivisions: 8 })], [1, 1]);
});

const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
test("the actual demo boundary blocks outward movement, permits return and re-arms by kilometres", () => {
  const start = main.indexOf("function demoShipStepCrossesBoundary(");
  const end = main.indexOf("function movementCanUseDrawnNavigation(", start);
  assert.ok(start >= 0 && end > start);
  const context = {
    mediterraneanDemoVoyageIsActive: () => true,
    demoMediterraneanAccessMask: Uint8Array.from([1, 0, 0, 1]),
    demoDistanceKmFromMediterraneanAccess: Float64Array.from([0, 30, 60, 0]),
    demoDistanceKmFromGibraltarBarrier: Float64Array.from([30, 0, 30, 240]),
    DEMO_WARNING_REARM_DISTANCE_KM,
    demoGibraltarWarningArmed: false
  };
  const results = runInNewContext(`${main.slice(start, end)}\n[
    demoShipStepCrossesBoundary(0, 1), demoShipStepCrossesBoundary(1, 2),
    demoShipStepCrossesBoundary(2, 1), demoShipStepCrossesBoundary(1, 0),
    demoShipStepCrossesBoundary(0, 3)]`, context);
  assert.deepEqual([...results], [true, true, false, false, false]);
  assert.equal(context.demoGibraltarWarningArmed, true);
});
const rateNames = ["SHIP_MIN_SLIDE_SPEED_RAD", "SHIP_CONTACT_ESCAPE_SPEED_RAD", "SHIP_RIVER_HAUL_ACCEL_RAD",
  "SHIP_RIVER_HAUL_MAX_SPEED_RAD", "SHIP_HAUL_RECOVERY_SPEED_RAD"];
const declarations = rateNames.map((name) => {
  const match = main.match(new RegExp(`const ${name} = [^;]+;`));
  assert.ok(match, `Missing navigation rate ${name}`);
  return match[0];
}).join("\n");

test("shoreline rates maintain the intended 1.2x screen-speed change, matching sailing", () => {
  const rates = (scale) => runInNewContext(`${declarations}\n[${rateNames.join(",")}]`, { WORLD_KINEMATIC_SCALE: scale });
  const old = rates(1);
  const current = rates(WORLD_KINEMATIC_SCALE);
  for (let index = 0; index < old.length; index++) {
    assert.ok(Math.abs(current[index] * WORLD_PIXELS_PER_RADIAN / (old[index] * 2450) - 1.2) < 1e-12,
      rateNames[index]);
  }
});

test("actual hauling acceleration and speed cap scale with the visible world", () => {
  const start = main.indexOf("function applyShipHaulAcceleration(");
  const end = main.indexOf("function shipIsInRiverWater(", start);
  assert.ok(start >= 0 && end > start);
  function hauledSpeedPx(scale, pixelsPerRadian, durationSeconds) {
    const ship = { position: [0, 0, 1], velocity: [0, 0, 0] };
    runInNewContext(`${declarations}\n${main.slice(start, end)}\napplyShipHaulAcceleration(durationSeconds, [1, 0, 0], 1);`, {
      WORLD_KINEMATIC_SCALE: scale, ship, durationSeconds,
      projectTangentVector: (vector) => vector,
      normalizeOrNull: (vector) => vector,
      dot3: (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0)
    });
    return ship.velocity[0] * pixelsPerRadian;
  }
  for (const seconds of [0.1, 1, 10]) {
    const old = hauledSpeedPx(1, 2450, seconds);
    const current = hauledSpeedPx(WORLD_KINEMATIC_SCALE, WORLD_PIXELS_PER_RADIAN, seconds);
    assert.ok(Math.abs(current / old - 1.2) < 1e-12);
  }
});
