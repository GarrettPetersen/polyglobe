import assert from "node:assert/strict";
import test from "node:test";

import { windAtLatLonDeg } from "./weather.js";

const SAMPLE_OPTIONS = Object.freeze({
  seed: 712367,
  simMinute: 80 * 1440,
  noiseDirectionRad: 0,
  noiseStrength: 0
});

test("global wind bands change continuously without an opposing-vector dead zone", () => {
  let previous = windAtLatLonDeg(-90, 0, 0, SAMPLE_OPTIONS);
  for (let latitude = -89.9; latitude <= 90; latitude += 0.1) {
    const current = windAtLatLonDeg(latitude, 0, 0, SAMPLE_OPTIONS);
    const turn = Math.abs(angleDelta(previous.directionRad, current.directionRad));
    assert.ok(turn < 0.05, `wind turned ${turn} radians near latitude ${latitude}`);
    assert.ok(current.strength >= 0.19, `permanent wind dead zone near latitude ${latitude}`);
    previous = current;
  }
});

test("coherent wind noise changes smoothly across nearby positions and times", () => {
  const start = windAtLatLonDeg(26, 42, 0, { seed: 91, simMinute: 12000 });
  const nearby = windAtLatLonDeg(26.05, 42.05, 0, { seed: 91, simMinute: 12001 });

  assert.ok(Math.abs(angleDelta(start.directionRad, nearby.directionRad)) < 0.04);
  assert.ok(Math.abs(start.strength - nearby.strength) < 0.02);
});

test("South China Sea winds reverse with the historical summer monsoon", () => {
  const summer = windAtLatLonDeg(15, 115, 23, {
    seed: 1,
    simMinute: 195 * 1440,
    noiseDirectionRad: 0,
    noiseStrength: 0
  });
  const winter = windAtLatLonDeg(15, 115, -20, {
    seed: 1,
    simMinute: 15 * 1440,
    noiseDirectionRad: 0,
    noiseStrength: 0
  });

  assert.ok(Math.abs(angleDelta(summer.directionRad, -Math.PI * 0.75)) < 0.12);
  assert.ok(Math.abs(angleDelta(winter.directionRad, Math.PI * 0.25)) < 0.12);
});

function angleDelta(from, to) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
