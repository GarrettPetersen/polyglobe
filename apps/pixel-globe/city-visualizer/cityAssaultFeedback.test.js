import test from "node:test";
import assert from "node:assert/strict";
import { CityAssaultHitFlashes, cityAssaultDepthBand, cityAssaultDepthOrder } from "./cityAssaultFeedback.js";

test("soldiers sort by continuous depth regardless of roster or original lane", () => {
  const people = [535, 521.9, 521.1, 508, 520.8, 514.5, 514.3, 547].map((groundY, index) => ({
    groundY, unit: { id: `unit-${index}`, lane: index % 4 }
  }));
  const painted = [0, 1, 2, 3].flatMap(band => people.filter(person =>
    cityAssaultDepthBand(person.groundY) === band).sort(cityAssaultDepthOrder));
  assert.deepEqual(painted.map(person => person.groundY), people.map(person => person.groundY).sort((a,b)=>a-b));
  assert.throws(() => cityAssaultDepthBand(NaN), /Invalid/);
});

test("hits and deaths flash on one rendered frame, including skipped frames and rewinds", () => {
  const flashes = new CityAssaultHitFlashes();
  const events = [{ unitId: "a", type: "hit", timeMs: 200 }];
  assert.equal(flashes.consume("a", events, 190), false);
  assert.equal(flashes.consume("a", events, 235), true);
  assert.equal(flashes.consume("a", events, 251), false);
  assert.equal(flashes.consume("b", events, 251), false);
  events.push({ unitId: "a", type: "death", timeMs: 400 });
  assert.equal(flashes.consume("a", events, 410), true);
  assert.equal(flashes.consume("a", events, 426), false);
  assert.equal(flashes.consume("a", events, 235), true);
  flashes.reset();
  assert.equal(flashes.consume("a", events, 235), true);
});
