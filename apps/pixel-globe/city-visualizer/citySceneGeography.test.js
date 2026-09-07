import assert from "node:assert/strict";
import test from "node:test";
import { citySceneLandwardAxis } from "./citySceneGeography.js";

test("starboard docking puts water left and inland terrain right at every shoreline bearing", () => {
  for (const city of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    const north = city[2] ? [1, 0, 0] : [0, 0, 1];
    const east = [city[1] * north[2] - city[2] * north[1],
      city[2] * north[0] - city[0] * north[2], city[0] * north[1] - city[1] * north[0]];
    for (let degrees = 0; degrees < 360; degrees += 15) {
      const angle = degrees * Math.PI / 180;
      const seaward = north.map((value, index) => value * Math.cos(angle) + east[index] * Math.sin(angle));
      const water = city.map((value, index) => value * Math.cos(0.01) + seaward[index] * Math.sin(0.01));
      const axis = citySceneLandwardAxis(city, water);
      const project = direction => direction.reduce((sum, value, index) => sum + value * axis[index], 0);
      assert.ok(project(seaward) < -0.999999, `water is left at ${degrees} degrees`);
      assert.ok(project(seaward.map(value => -value)) > 0.999999, `land is right at ${degrees} degrees`);
      assert.ok(Math.abs(project(city)) < 1e-9);
    }
  }
});

test("bank orientation rejects missing or degenerate approach geometry", () => {
  for (const water of [[1, 0, 0], [-1, 0, 0], [0, 0, 0], [NaN, 0, 0], null]) {
    assert.throws(() => citySceneLandwardAxis([1, 0, 0], water), /bank orientation/);
  }
});
