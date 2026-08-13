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
  assert.ok(captureScenarioIds().includes("iceberg-drift"));
  assert.ok(captureScenarioIds().includes("turtle-ship-war"));
  assert.ok(captureScenarioIds().includes("land-trade"));
  assert.ok(captureScenarioIds().includes("great-barrier-reef"));
  assert.ok(captureScenarioIds().includes("benchmark-cloud-cover"));
  assert.ok(captureScenarioIds().includes("benchmark-combat-hotspot"));
  assert.ok(captureScenarioIds().includes("benchmark-gibraltar-hotspot"));
  assert.ok(captureScenarioIds().includes("benchmark-naples-approach"));
  assert.equal(captureScenarioFromSearch(""), null);
  assert.equal(captureScenarioFromSearch("?capture=turtle-ship-war").player.factionId, "joseon");
  assert.throws(() => captureScenarioFromSearch("?capture=missing"), /Unknown capture scenario/);
});

test("iceberg QA stages the largest waterline bake beside a polar vessel", () => {
  const scenario = captureScenarioFromSearch("?capture=iceberg-drift");
  assert.equal(scenario.icebergs.length, 1);
  assert.equal(scenario.icebergs[0].variantId, "iceberg-large");
  assert.ok(Math.abs(scenario.icebergs[0].lon - scenario.player.lon) < 0.25);
});

test("cloud benchmark fixes a cloud-heavy northern Aegean date and camera", () => {
  const scenario = captureScenarioFromSearch("?capture=benchmark-cloud-cover");
  assert.equal(scenario.player.lat, 39.3);
  assert.equal(scenario.player.lon, 25.2);
  assert.equal(scenario.world.day, 83);
  assert.equal(scenario.world.hour, 11);
  assert.deepEqual(scenario.encounters, []);
});

test("Great Barrier Reef capture stages a ship over the underwater discovery", () => {
  const scenario = captureScenarioFromSearch("?capture=great-barrier-reef");
  assert.equal(scenario.player.lat, -18.4);
  assert.equal(scenario.player.lon, 147.2);
  assert.equal(scenario.sequence.kind, "explore");
  assert.equal(scenario.sequence.discoveryName, "Great Barrier Reef");
  assert.deepEqual(scenario.encounters, []);
});

test("combat benchmark stages a damaged merchant amid eastern Mediterranean fighting", () => {
  const scenario = captureScenarioFromSearch("?capture=benchmark-combat-hotspot");
  assert.equal(scenario.player.lat, 34.65);
  assert.equal(scenario.encounters.length, 4);
  const damaged = scenario.encounters.find((encounter) => encounter.id === "benchmark-med-damaged");
  assert.equal(damaged.hitPoints, 2);
  assert.equal(damaged.replaceOnSink, false);
  assert.ok(scenario.encounters.some((encounter) => encounter.role === "pirate"));
});

test("Gibraltar benchmark crowds both lanes of the navigable strait", () => {
  const scenario = captureScenarioFromSearch("?capture=benchmark-gibraltar-hotspot");
  assert.equal(scenario.player.lat, 36.02);
  assert.equal(scenario.player.lon, -5.55);
  assert.equal(scenario.encounters.length, 18);
  assert.ok(scenario.encounters.some((encounter) => encounter.headingDeg < 180));
  assert.ok(scenario.encounters.some((encounter) => encounter.headingDeg > 180));
});

test("Naples benchmark approaches the port from open Tyrrhenian water", () => {
  const scenario = captureScenarioFromSearch("?capture=benchmark-naples-approach");
  assert.equal(scenario.player.lat, 40.72);
  assert.equal(scenario.player.lon, 12.15);
  assert.equal(scenario.player.headingDeg, 90);
  assert.deepEqual(scenario.encounters, []);
});

test("the general trailer roster includes feature pairs and eight fast sailing shots", () => {
  const trailerIds = captureScenarioIds().filter((id) => (
    id.startsWith("trailer-") && captureScenarioFromSearch(`?capture=${id}`).sequence.kind !== "panda"
  ));
  assert.equal(trailerIds.length, 24);
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
    sail: 8,
    fight: 2,
    pillage: 2,
    colonize: 2,
    survive: 2
  });
});

test("the landscape panda trailer has new b-roll, encounter, fishing, reactions, and naturalist scenes", () => {
  const pandaIds = captureScenarioIds().filter((id) => id.startsWith("trailer-panda-"));
  assert.equal(pandaIds.length, 12);
  const captures = pandaIds.map((id) => captureScenarioFromSearch(`?capture=${id}`));
  assert.deepEqual(
    Object.fromEntries([...new Set(captures.map((capture) => capture.sequence.variant))].map((variant) => [
      variant,
      captures.filter((capture) => capture.sequence.variant === variant).length
    ])),
    { sail: 7, encounter: 1, fish: 1, "port-reaction": 2, naturalist: 1 }
  );
  assert.ok(captures.every((capture) => capture.player.factionId === "portugal"));
  assert.ok(captures.every((capture) => capture.player.shipSlug === "caravel"));
  assert.ok(captures.every((capture) => capture.player.homeCityName === "Lisbon"));
  assert.equal(new Set(captures.map((capture) => capture.player.characterPortraitSourceId)).size, 1);
  assert.equal(captures.find((capture) => capture.sequence.variant === "encounter").sequence.cityName, "Chengdu");
  assert.equal(captures.find((capture) => capture.sequence.variant === "naturalist").sequence.cityName, "Vienna");
  assert.equal(captures.filter((capture) => capture.sequence.variant === "sail" &&
    capture.sequence.pandaAboard === false).length, 3);
});

test("fast sailing trailer shots stage distinct ships on validated beam reaches", () => {
  const sailing = captureScenarioIds()
    .filter((id) => id.startsWith("trailer-sail-"))
    .map((id) => captureScenarioFromSearch(`?capture=${id}`))
    .filter((capture) => capture.sequence?.kind === "sail");
  assert.equal(sailing.length, 8);
  assert.equal(new Set(sailing.map((capture) => capture.player.shipSlug)).size, 8);
  assert.deepEqual(new Set(sailing.map((capture) => capture.sequence.beamSide)), new Set(["port", "starboard"]));
  assert.ok(sailing.every((capture) => capture.sequence.durationSeconds === 6));

  const malformed = structuredClone(sailing[0]);
  malformed.sequence.beamSide = "downwind";
  assert.throws(() => validateCaptureScenario(malformed), /beam side/);
});

test("trading trailer shots perform a rapid run of repeated transactions", () => {
  for (const id of ["trailer-trade-ternate", "trailer-trade-lisbon"]) {
    const capture = captureScenarioFromSearch(`?capture=${id}`);
    assert.equal(capture.sequence.transactionCount, 6);
  }

  const malformed = structuredClone(captureScenarioFromSearch("?capture=trailer-trade-ternate"));
  malformed.sequence.transactionCount = 1;
  assert.throws(() => validateCaptureScenario(malformed), /trade transaction count/);
});

test("the Nubian pyramid trailer shot follows the Nile south instead of steering onto land", () => {
  const scenario = captureScenarioFromSearch("?capture=trailer-explore-pyramid");
  assert.equal(scenario.title, "Discover the Pyramids of Meroe");
  assert.equal(scenario.player.headingDeg, 270);
  assert.equal(scenario.sequence.discoveryName, "The Pyramids of Meroe");
  assert.deepEqual(scenario.sequence.riverStart, { lat: 17.82, lon: 33.63 });
  assert.ok(scenario.sequence.sailingTarget.lat < scenario.player.lat);
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

  const malformedTarget = structuredClone(captureScenarioFromSearch("?capture=trailer-explore-pyramid"));
  malformedTarget.sequence.sailingTarget.lat = -91;
  assert.throws(() => validateCaptureScenario(malformedTarget), /sailing target latitude/);

  const malformedRiverStart = structuredClone(captureScenarioFromSearch("?capture=trailer-explore-pyramid"));
  malformedRiverStart.sequence.riverStart.lon = 181;
  assert.throws(() => validateCaptureScenario(malformedRiverStart), /river start longitude/);
});
