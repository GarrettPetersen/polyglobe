import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_MAX_SECONDS,
  CAPTURE_VIEWPORT,
  captureScenarioFromSearch,
  captureScenarioIds,
  validateCaptureScenario
} from "./captureScenarios.js";

test("capture scenarios use a native 9:16 frame and a ten-minute cap", () => {
  assert.deepEqual(CAPTURE_VIEWPORT, { width: 270, height: 480 });
  assert.equal(CAPTURE_VIEWPORT.width / CAPTURE_VIEWPORT.height, 9 / 16);
  assert.equal(CAPTURE_MAX_SECONDS, 600);
});

test("capture scenario lookup is explicit and fails for unknown ids", () => {
  assert.ok(captureScenarioIds().includes("icosahedron-earth"));
  assert.ok(captureScenarioIds().includes("icosahedron-earth-broll"));
  assert.ok(captureScenarioIds().includes("icosahedron-earth-cape-horn"));
  assert.ok(captureScenarioIds().includes("turtle-ship-war"));
  assert.equal(captureScenarioFromSearch(""), null);
  assert.equal(captureScenarioFromSearch("?capture=turtle-ship-war").player.factionId, "joseon");
  assert.throws(() => captureScenarioFromSearch("?capture=missing"), /Unknown capture scenario/);
});

test("Cape Horn b-roll stages quiet southern-summer sailing", () => {
  const scenario = captureScenarioFromSearch("?capture=icosahedron-earth-cape-horn");
  assert.equal(scenario.player.factionId, "portugal");
  assert.equal(scenario.player.shipSlug, "portuguese-carrack");
  assert.equal(scenario.player.lat, -55.196);
  assert.equal(scenario.player.lon, -66.838);
  assert.equal(scenario.world.day, 350);
  assert.equal(scenario.world.hour, 17);
  assert.deepEqual(scenario.diplomacy, []);
  assert.deepEqual(scenario.encounters, []);
});

test("icosahedron b-roll stages quiet tropical sailing on the far side of the globe", () => {
  const scenario = captureScenarioFromSearch("?capture=icosahedron-earth-broll");
  assert.equal(scenario.player.factionId, "portugal");
  assert.equal(scenario.player.shipSlug, "portuguese-carrack");
  assert.equal(scenario.player.lat, 0);
  assert.equal(scenario.player.lon, 125.095);
  assert.equal(scenario.world.hour, 5);
  assert.deepEqual(scenario.diplomacy, []);
  assert.deepEqual(scenario.encounters, []);
});

test("icosahedron capture stages uninterrupted sailing across an ocean pentagon", () => {
  const scenario = captureScenarioFromSearch("?capture=icosahedron-earth");
  assert.equal(scenario.player.factionId, "portugal");
  assert.equal(scenario.player.shipSlug, "portuguese-carrack");
  assert.equal(scenario.player.lat, 58.283);
  assert.equal(scenario.player.lon, 0);
  assert.deepEqual(scenario.diplomacy, []);
  assert.deepEqual(scenario.encounters, []);
});

test("capture validation rejects unknown vessels and malformed clocks", () => {
  const valid = structuredClone(captureScenarioFromSearch("?capture=turtle-ship-war"));
  valid.world.hour = 24;
  assert.throws(() => validateCaptureScenario(valid), /capture hour/);
  valid.world.hour = 12;
  valid.player.shipSlug = "not-a-ship";
  assert.throws(() => validateCaptureScenario(valid), /Missing ship stats/);
});
