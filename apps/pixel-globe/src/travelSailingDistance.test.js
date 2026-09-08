import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { travelSailingDistanceKm } from "./travelSailingDistance.js";

const origin = { cityId: "origin", tileId: 1 };
const destination = { cityId: "destination", tileId: 2 };

test("travel distances preserve unreachable results and reject missing or malformed route data", () => {
  for (const expected of [null, 0, 1234]) {
    assert.equal(travelSailingDistanceKm(origin, destination, { sailingDistanceKm: (a, b) => {
      assert.equal(a, origin); assert.equal(b, destination); return expected;
    } }), expected);
  }
  assert.throws(() => travelSailingDistanceKm(origin, destination), /requires a sailing-distance resolver|require a sailing-distance resolver/);
  for (const value of [undefined, NaN, Infinity, -1, "1234"]) {
    assert.throws(() => travelSailingDistanceKm(origin, destination, { sailingDistanceKm: () => value }), /Invalid port sailing distance/);
  }
});

test("passenger travel policies do not reintroduce geographic distance shortcuts", () => {
  for (const module of ["passengerMissions", "religiousMissions", "eastAsianQuestlines", "treatyOfMadridMission"]) {
    const source = readFileSync(new URL(`./${module}.js`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /greatCircleDistanceKm|haversine|Math\.acos/, module);
    assert.match(source, /from "\.\/travelSailingDistance\.js"/, module);
  }
});
