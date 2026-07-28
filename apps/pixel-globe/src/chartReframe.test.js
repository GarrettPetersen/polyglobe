import assert from "node:assert/strict";
import test from "node:test";

import {
  assertChartReframePositionPreserved,
  captureChartReframePosition,
  chartNorthUpDriftExceedsThreshold,
  measureChartNorthUpDrift,
  northUpProjectionIsStable,
  selectRepresentativeChartDriftCalls
} from "./chartReframe.js";

test("chart reframing preserves exact player and NPC globe positions", () => {
  const position = directionAt(31.2, 121.5);
  const player = captureChartReframePosition(position, "player");
  const npc = captureChartReframePosition(directionAt(30.8, 121.2), "NPC ship test-1");

  assert.doesNotThrow(() => assertChartReframePositionPreserved(player, position));
  assert.doesNotThrow(
    () => assertChartReframePositionPreserved(npc, directionAt(30.8, 121.2))
  );
  assert.throws(
    () => assertChartReframePositionPreserved(player, directionAt(31.3, 121.5)),
    /changed player's global position/
  );
  assert.throws(
    () => assertChartReframePositionPreserved(npc, directionAt(30.9, 121.2)),
    /changed NPC ship test-1's global position/
  );
});

test("ordinary and very high latitudes retain a true north-up projection", () => {
  assert.equal(northUpProjectionIsStable(directionAt(0, 0)), true);
  assert.equal(northUpProjectionIsStable(directionAt(84, 20)), true);
  assert.equal(northUpProjectionIsStable(directionAt(89.999, 20)), true);
});

test("only a position extremely close to the exact pole uses the numerical fallback", () => {
  assert.equal(northUpProjectionIsStable(directionAt(89.99999, 20)), false);
  assert.equal(northUpProjectionIsStable(directionAt(-89.99999, 20)), false);
  assert.equal(northUpProjectionIsStable(directionAt(90, 20)), false);
});

test("chart drift separates rotation from residual distortion", () => {
  const radians = 3 * Math.PI / 180;
  const samples = [
    rotatedSample(80, 0, radians),
    rotatedSample(0, 60, radians),
    rotatedSample(-70, 20, radians),
    rotatedSample(30, -50, radians)
  ];
  const metrics = measureChartNorthUpDrift(samples);

  assert.ok(Math.abs(metrics.rotationDeg - 3) < 1e-9);
  assert.ok(metrics.rmsDistortionPx < 1e-9);
  assert.ok(metrics.maxDistortionPx < 1e-9);
  assert.equal(metrics.needsReframe, true);
});

test("two separated samples are enough to measure north-up rotation", () => {
  const radians = -4 * Math.PI / 180;
  const metrics = measureChartNorthUpDrift([
    rotatedSample(-80, 0, radians),
    rotatedSample(80, 0, radians)
  ]);

  assert.ok(Math.abs(metrics.rotationDeg + 4) < 1e-9);
  assert.ok(metrics.rmsDistortionPx < 1e-9);
  assert.equal(metrics.needsReframe, true);
});

test("chart drift sampling selects at most four visible spatial extrema", () => {
  const calls = [
    { id: 1, x: -80, y: 0 },
    { id: 2, x: 75, y: 2 },
    { id: 3, x: 0, y: -60 },
    { id: 4, x: 1, y: 55 },
    { id: 5, x: 5, y: 5 },
    { id: 6, x: 400, y: 0 }
  ];
  const selected = selectRepresentativeChartDriftCalls(calls, {
    viewX: 0,
    viewY: 0,
    halfWidth: 100,
    halfHeight: 80
  });

  assert.deepEqual(selected.map((call) => call.id), [2, 1, 4, 3]);
  assert.equal(selected.length, 4);
  assert.ok(!selected.some((call) => call.id === 5 || call.id === 6));
});

test("chart drift sampling deduplicates extrema on a tiny chart", () => {
  const onlyCall = { id: 7, x: 0, y: 0 };
  assert.deepEqual(
    selectRepresentativeChartDriftCalls([onlyCall], {
      viewX: 0,
      viewY: 0,
      halfWidth: 10,
      halfHeight: 10
    }),
    [onlyCall]
  );
});

test("organic local distortion marks a chart for reframing", () => {
  const metrics = measureChartNorthUpDrift([
    { localX: 80, localY: 0, northX: 80, northY: 0 },
    { localX: 3, localY: 60, northX: 0, northY: 60 },
    { localX: -70, localY: 26, northX: -70, northY: 20 },
    { localX: 30, localY: -50, northX: 30, northY: -50 }
  ]);

  assert.equal(metrics.needsReframe, true);
  assert.ok(metrics.rmsDistortionPx >= 1.5);
});

test("a fresh north-up chart remains below every correction threshold", () => {
  const metrics = measureChartNorthUpDrift([
    { localX: 80, localY: 0, northX: 80, northY: 0 },
    { localX: 0, localY: 60, northX: 0, northY: 60 },
    { localX: -70, localY: 20, northX: -70, northY: 20 }
  ]);

  assert.equal(metrics.needsReframe, false);
  assert.equal(chartNorthUpDriftExceedsThreshold(metrics), false);
});

test("chart drift rejects malformed samples and metrics", () => {
  assert.throws(
    () => measureChartNorthUpDrift([{ localX: 0, localY: 0, northX: Number.NaN, northY: 0 }]),
    /invalid northX/
  );
  assert.throws(
    () => chartNorthUpDriftExceedsThreshold({ sampleCount: -1 }),
    /non-negative sample count/
  );
  assert.throws(
    () => northUpProjectionIsStable([0, 0, 0]),
    /cannot be zero/
  );
});

function rotatedSample(northX, northY, radians) {
  return {
    northX,
    northY,
    localX: northX * Math.cos(radians) - northY * Math.sin(radians),
    localY: northX * Math.sin(radians) + northY * Math.cos(radians)
  };
}

function directionAt(latitudeDeg, longitudeDeg) {
  const latitude = latitudeDeg * Math.PI / 180;
  const longitude = longitudeDeg * Math.PI / 180;
  return [
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude)
  ];
}
