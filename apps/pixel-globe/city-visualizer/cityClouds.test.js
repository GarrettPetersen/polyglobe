import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_CLOUD_SPECS,
  advanceCityCloudDrift,
  cityCloudDrawPositions,
  cityCloudSpec
} from "./cityClouds.js";

const FRAME = Object.freeze({ frame: Object.freeze({ w: 575, h: 193 }) });
const EAST_WIND = Object.freeze({ strength: 0.8, flowX: 1, flowY: 0 });

test("clouds occupy three distinct weather depths around ocean and mountains", () => {
  assert.deepEqual(CITY_CLOUD_SPECS.map(({ layer }) => layer), ["Cloud 1", "Cloud 2", "Cloud 3"]);
  assert.ok(CITY_CLOUD_SPECS[0].z < 1, "rear cloud is behind the horizon ocean");
  assert.ok(CITY_CLOUD_SPECS[1].z > 1 && CITY_CLOUD_SPECS[1].z < 5, "middle cloud is between ocean and mountains");
  assert.ok(CITY_CLOUD_SPECS[2].z > 5, "near cloud is in front of mountains");
  assert.deepEqual(CITY_CLOUD_SPECS.map(({ depth }) => depth), [0.08, 0.13, 0.2]);
  assert.equal(cityCloudSpec("Cloud 2"), CITY_CLOUD_SPECS[1]);
  assert.equal(cityCloudSpec("Sky"), null);
});

test("clouds drift with wind direction and wrap without subpixel placement", () => {
  const spec = CITY_CLOUD_SPECS[0];
  const initial = cityCloudDrawPositions({
    spec,
    frame: FRAME,
    timeMs: 0,
    wind: EAST_WIND,
    sceneWidth: 1365
  });
  const later = cityCloudDrawPositions({
    spec,
    frame: FRAME,
    timeMs: 10000,
    wind: EAST_WIND,
    sceneWidth: 1365,
    driftX: advanceCityCloudDrift({
      current: 0,
      elapsedMs: 10000,
      wind: EAST_WIND,
      spec
    })
  });
  const west = cityCloudDrawPositions({
    spec,
    frame: FRAME,
    timeMs: 10000,
    wind: { ...EAST_WIND, flowX: -1 },
    sceneWidth: 1365,
    driftX: advanceCityCloudDrift({
      current: 0,
      elapsedMs: 10000,
      wind: { ...EAST_WIND, flowX: -1 },
      spec
    })
  });
  assert.ok(later[1].x > initial[1].x);
  assert.ok(west[1].x < initial[1].x);
  assert.ok(later.every(({ x, y }) => Number.isInteger(x) && Number.isInteger(y)));
  assert.equal(later[1].x - later[0].x, 1365 + FRAME.frame.w);
  assert.equal(later[2].x - later[1].x, 1365 + FRAME.frame.w);
});

test("wind reversals continue from the cloud's current drift instead of teleporting", () => {
  const spec = CITY_CLOUD_SPECS[2];
  const east = advanceCityCloudDrift({
    current: 12,
    elapsedMs: 1000,
    wind: EAST_WIND,
    spec
  });
  const west = advanceCityCloudDrift({
    current: east,
    elapsedMs: 1000,
    wind: { ...EAST_WIND, flowX: -1 },
    spec
  });
  assert.ok(east > 12);
  assert.ok(Math.abs(west - 12) < 1e-12);
});
