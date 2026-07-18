import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPTURE_MAX_SECONDS,
  CAPTURE_VIEWPORTS,
  captureScenarioFromSearch,
  captureScenarioIds,
  captureViewportFromSearch,
  validateCaptureScenario
} from "./captureScenarios.js";

test("capture scenarios expose explicit Shorts and Steam frames", () => {
  assert.deepEqual(CAPTURE_VIEWPORTS.shorts, { width: 270, height: 480 });
  assert.equal(CAPTURE_VIEWPORTS.shorts.width / CAPTURE_VIEWPORTS.shorts.height, 9 / 16);
  assert.deepEqual(CAPTURE_VIEWPORTS.steam, { width: 480, height: 270 });
  assert.equal(CAPTURE_VIEWPORTS.steam.width / CAPTURE_VIEWPORTS.steam.height, 16 / 9);
  assert.deepEqual(captureViewportFromSearch("?capture=turtle-ship-war"), CAPTURE_VIEWPORTS.shorts);
  assert.deepEqual(
    captureViewportFromSearch("?capture=turtle-ship-war&captureFormat=steam"),
    CAPTURE_VIEWPORTS.steam
  );
  assert.throws(() => captureViewportFromSearch("?captureFormat=square"), /Unknown capture format/);
  assert.equal(CAPTURE_MAX_SECONDS, 600);
});

test("capture scenario lookup is explicit and fails for unknown ids", () => {
  assert.ok(captureScenarioIds().includes("icosahedron-earth"));
  assert.ok(captureScenarioIds().includes("icosahedron-earth-broll"));
  assert.ok(captureScenarioIds().includes("icosahedron-earth-cape-horn"));
  assert.ok(captureScenarioIds().includes("turtle-ship-war"));
  assert.ok(captureScenarioIds().includes("land-trade"));
  assert.equal(captureScenarioFromSearch(""), null);
  assert.equal(captureScenarioFromSearch("?capture=turtle-ship-war").player.factionId, "joseon");
  assert.throws(() => captureScenarioFromSearch("?capture=missing"), /Unknown capture scenario/);
});

test("the trailer roster has exactly two scripted shots for every requested feature", () => {
  const trailerIds = captureScenarioIds().filter((id) => id.startsWith("trailer-"));
  assert.equal(trailerIds.length, 16);
  const counts = new Map();
  for (const id of trailerIds) {
    const capture = captureScenarioFromSearch(`?capture=${id}`);
    counts.set(capture.sequence.kind, (counts.get(capture.sequence.kind) || 0) + 1);
    assert.ok(capture.sequence.durationSeconds <= 10);
  }
  assert.deepEqual(Object.fromEntries(counts), {
    explore: 2,
    trade: 2,
    fish: 2,
    whale: 2,
    fight: 2,
    pillage: 2,
    colonize: 2,
    survive: 2
  });
});

test("land-trade capture stages the road-dense western Mediterranean", () => {
  const scenario = captureScenarioFromSearch("?capture=land-trade");
  assert.equal(scenario.player.factionId, "france");
  assert.equal(scenario.player.shipSlug, "brigantine");
  assert.equal(scenario.player.lat, 42.9);
  assert.equal(scenario.player.lon, 5.4);
  assert.equal(scenario.world.timeScale, 7200);
  assert.deepEqual(scenario.encounters, []);
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

  const unsupportedEncounter = structuredClone(captureScenarioFromSearch("?capture=turtle-ship-war"));
  unsupportedEncounter.encounters[0].shipSlug = "spanish-nao";
  assert.throws(
    () => validateCaptureScenario(unsupportedEncounter),
    /has no NPC sprite asset: spanish-nao/
  );
});
