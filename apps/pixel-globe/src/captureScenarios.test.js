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
  assert.ok(captureScenarioIds().includes("five-weeks-arctic-ice"));
  assert.ok(captureScenarioIds().includes("turtle-ship-war"));
  assert.ok(captureScenarioIds().includes("land-trade"));
  assert.ok(captureScenarioIds().includes("great-barrier-reef"));
  assert.ok(captureScenarioIds().includes("benchmark-cloud-cover"));
  assert.ok(captureScenarioIds().includes("benchmark-combat-hotspot"));
  assert.ok(captureScenarioIds().includes("benchmark-gibraltar-hotspot"));
  assert.ok(captureScenarioIds().includes("benchmark-naples-approach"));
  assert.ok(captureScenarioIds().includes("benchmark-patagonia-chart"));
  assert.equal(captureScenarioFromSearch(""), null);
  assert.equal(captureScenarioFromSearch("?capture=turtle-ship-war").player.factionId, "joseon");
  assert.throws(() => captureScenarioFromSearch("?capture=missing"), /Unknown capture scenario/);
});

test("iceberg QA stages the largest waterline bake beside a polar vessel", () => {
  const scenario = captureScenarioFromSearch("?capture=iceberg-drift");
  assert.equal(scenario.icebergs.length, 1);
  assert.equal(scenario.icebergs[0].variantId, "iceberg-large");
  assert.ok(Math.abs(scenario.icebergs[0].lon - scenario.player.lon) < 0.25);
  assert.equal(scenario.sequence.kind, "sail");
});

test("five-week recap stages winter sea ice off Greenland", () => {
  const scenario = captureScenarioFromSearch("?capture=five-weeks-arctic-ice");
  assert.equal(scenario.world.day, 15);
  assert.equal(scenario.player.factionId, "denmark-norway");
  assert.equal(scenario.sequence.kind, "sail");
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

test("Patagonia benchmark reproduces the reported fjord-side chart scene", () => {
  const scenario = captureScenarioFromSearch("?capture=benchmark-patagonia-chart");
  assert.equal(scenario.player.lat, -52.2);
  assert.equal(scenario.player.lon, -74.33);
  assert.equal(scenario.player.shipSlug, "galleon");
  assert.equal(scenario.world.day, 232);
  assert.deepEqual(scenario.encounters, []);
});

test("the general trailer roster includes feature pairs and eight fast sailing shots", () => {
  const trailerIds = captureScenarioIds().filter((id) => (
    id.startsWith("trailer-") &&
    !id.startsWith("trailer-papal-") &&
    !["panda", "papal"].includes(captureScenarioFromSearch(`?capture=${id}`).sequence.kind)
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

test("the storm-wave Short stages a real sinking and a modal-free overboard rescue", () => {
  const sinking = captureScenarioFromSearch("?capture=short-storm-lightning-sinking");
  assert.equal(sinking.player.shipSlug, "fishing-lugger");
  assert.equal(sinking.sequence.kind, "survive");
  assert.equal(sinking.sequence.variant, "lightning-sinking");

  const lugger = captureScenarioFromSearch("?capture=short-storm-sail-fishing-lugger");
  assert.equal(lugger.player.shipSlug, "fishing-lugger");
  assert.equal(lugger.sequence.kind, "sail");

  const galley = captureScenarioFromSearch("?capture=short-storm-sail-mediterranean-galley");
  assert.equal(galley.player.shipSlug, "mediterranean-galley");
  assert.equal(galley.sequence.kind, "sail");

  const rescue = captureScenarioFromSearch("?capture=short-storm-overboard-rescue");
  assert.equal(rescue.player.shipSlug, "mediterranean-galley");
  assert.equal(rescue.sequence.kind, "survive");
  assert.equal(rescue.sequence.variant, "overboard-rescue");
  assert.ok(rescue.sequence.durationSeconds >= 15);

  const malformed = structuredClone(rescue);
  malformed.sequence.variant = "mystery-wave";
  assert.throws(() => validateCaptureScenario(malformed), /survival capture variant/);
});

test("the upwind Short stages one cohesive city voyage and three oared exceptions", () => {
  const ids = captureScenarioIds().filter((id) => id.startsWith("short-upwind-"));
  assert.deepEqual(ids, [
    "short-upwind-voyage",
    "short-upwind-turtle-ship",
    "short-upwind-galley",
    "short-upwind-galleass"
  ]);
  const captures = ids.map((id) => captureScenarioFromSearch(`?capture=${id}`));
  assert.equal(captures[0].player.shipSlug, "caravel");
  assert.equal(captures[0].sequence.variant, "upwind-voyage");
  assert.equal(captures[0].sequence.cityName, "Ribeira Grande");
  assert.equal(captures[0].sequence.durationSeconds, 37);
  assert.deepEqual(
    captures.slice(1).map((capture) => capture.player.shipSlug),
    ["joseon-turtle-ship", "mediterranean-galley", "galleass"]
  );
  assert.ok(captures.every((capture) => capture.sequence.requireOpenWaterCourse));
  assert.ok(captures.slice(1).every((capture) => capture.sequence.variant === "row-upwind"));

  const malformed = structuredClone(captures[0]);
  malformed.sequence.variant = "motor-upwind";
  malformed.sequence.durationSeconds = 30;
  assert.throws(() => validateCaptureScenario(malformed), /sailing capture variant/);
});

test("the loadout Short stages deprivation, the four presets, and the optional custom editor", () => {
  const deprivation = captureScenarioFromSearch("?capture=short-loadout-deprivation");
  assert.equal(deprivation.sequence.kind, "survive");
  assert.equal(deprivation.sequence.variant, "deprivation-death");
  assert.equal(deprivation.player.homeCityName, "Lisbon");

  const presets = captureScenarioFromSearch("?capture=short-loadout-presets");
  assert.equal(presets.sequence.kind, "loadout");
  assert.equal(presets.sequence.variant, "presets");
  assert.equal(presets.sequence.cityName, "Lisbon");

  const custom = captureScenarioFromSearch("?capture=short-loadout-custom");
  assert.equal(custom.sequence.kind, "loadout");
  assert.equal(custom.sequence.variant, "custom");
  assert.equal(custom.player.shipSlug, "portuguese-carrack");
  assert.doesNotMatch(custom.player.characterPortraitSourceId, /openai|retro-diffusion/);

  const malformed = structuredClone(custom);
  malformed.sequence.variant = "automatic";
  assert.throws(() => validateCaptureScenario(malformed), /loadout capture variant/);
});

test("the religion Short stages Old World origins, faith profiles, the Hajj, and another faith mission", () => {
  const ids = captureScenarioIds().filter((id) => id.startsWith("short-religion-"));
  assert.deepEqual(ids, [
    "short-religion-portuguese-profile",
    "short-religion-great-lakes-canoe",
    "short-religion-ottoman-profile",
    "short-religion-orthodox-profile",
    "short-religion-lutheran-profile",
    "short-religion-hajj",
    "short-religion-jewish-mission"
  ]);
  const captures = ids.map((id) => captureScenarioFromSearch(`?capture=${id}`));
  assert.deepEqual(
    captures.filter((capture) => capture.sequence.kind === "religion")
      .map((capture) => capture.sequence.variant),
    ["profile", "profile", "profile", "profile", "hajj", "mission"]
  );
  assert.equal(captures[1].player.shipSlug, "mesoamerican-dugout-canoe");
  assert.equal(captures[1].sequence.kind, "sail");
  assert.deepEqual(
    captures.filter((capture) => capture.sequence.variant === "profile")
      .map((capture) => capture.player.religionId),
    ["roman-catholic", "sunni-islam", "eastern-orthodox", "lutheran"]
  );
  assert.equal(captures[5].sequence.originCityName, "Aden");
  assert.equal(captures[5].sequence.cityName, "Jeddah");
  assert.equal(captures[5].sequence.passengerHomeCityName, "Thessaloniki");
  assert.equal(captures[6].sequence.religiousMissionId, "jewish-responsum");
  assert.ok(captures
    .filter((capture) => capture.player.characterPortraitSourceId)
    .every((capture) => !/openai|retro-diffusion/.test(capture.player.characterPortraitSourceId)));

  const malformed = structuredClone(captures[5]);
  malformed.sequence.variant = "sermon";
  assert.throws(() => validateCaptureScenario(malformed), /religion capture variant/);
});

test("the Papal Short stages varied sailing, Rome, policy, a nuncio, and the September Testament", () => {
  const ids = captureScenarioIds().filter((id) => id.startsWith("trailer-papal-"));
  assert.deepEqual(ids, [
    "trailer-papal-rome",
    "trailer-papal-actions",
    "trailer-papal-nuncio-route",
    "trailer-papal-nuncio",
    "trailer-papal-bible-route",
    "trailer-papal-bibles"
  ]);
  const storyCaptures = ids
    .map((id) => captureScenarioFromSearch(`?capture=${id}`))
    .filter((capture) => capture.sequence.kind === "papal");
  assert.deepEqual(storyCaptures.map((capture) => capture.sequence.variant), [
    "rome",
    "actions",
    "nuncio",
    "bibles"
  ]);
  assert.equal(storyCaptures.reduce((sum, capture) => sum + capture.sequence.durationSeconds, 0), 60);
  assert.ok(storyCaptures.every((capture) => capture.player.characterPortraitSourceId.includes("captainskeleto")));
  assert.doesNotMatch(storyCaptures[2].sequence.nuncioPortraitSourceId, /openai|retro-diffusion/);
  assert.doesNotMatch(storyCaptures[3].sequence.booksellerPortraitSourceId, /openai|retro-diffusion/);
  const routeCaptures = ids
    .map((id) => captureScenarioFromSearch(`?capture=${id}`))
    .filter((capture) => capture.sequence.kind === "sail");
  assert.deepEqual(routeCaptures.map((capture) => capture.player.shipSlug), ["xebec", "small-cog"]);
  assert.deepEqual(routeCaptures.map((capture) => capture.sequence.beamSide), ["starboard", "port"]);
});

test("the colony Short crosses several oceans and shows six distinct colonial sites", () => {
  const ids = captureScenarioIds().filter((id) => id.startsWith("short-colony-"));
  assert.deepEqual(ids, [
    "short-colony-offer",
    "short-colony-embark",
    "short-colony-sail-outbound",
    "short-colony-sail-atlantic",
    "short-colony-sail-acadia",
    "short-colony-found",
    "short-colony-deadline",
    "short-colony-resupply",
    "short-colony-defense",
    "short-colony-city"
  ]);
  const captures = ids.map((id) => captureScenarioFromSearch(`?capture=${id}`));
  const colonyCaptures = captures.filter((capture) => capture.sequence.kind === "colonize");
  assert.deepEqual(colonyCaptures.map((capture) => capture.sequence.variant), [
    "offer",
    "embark",
    "found",
    "deadline",
    "resupply",
    "defend",
    "city"
  ]);
  assert.deepEqual([...new Set(colonyCaptures.map((capture) => capture.sequence.cityName))], [
    "Port Royal",
    "Buenos Aires",
    "Jamestown",
    "Recife",
    "Rio de Janeiro",
    "Manila"
  ]);
  assert.ok(new Set(captures.map((capture) => capture.player.factionId)).size >= 4);
  assert.ok(new Set(captures.map((capture) => capture.player.shipSlug)).size >= 4);
  assert.ok(captures.every((capture) => capture.world.hour >= 9 && capture.world.hour <= 16));
  assert.ok(colonyCaptures.every((capture) => (
    !/openai|retro-diffusion/.test(capture.player.characterPortraitSourceId) &&
    !/openai|retro-diffusion/.test(capture.sequence.organizerPortraitSourceId)
  )));
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
  const expectedPortraits = new Map([
    [
      "trailer-trade-ternate",
      {
        factor: "women-black-hair-portrait-by-captainskolot-women-black-hair-portrait",
        player: "women-knight-portrait-pack-by-captainskeleto-women-knight-portrait"
      }
    ],
    [
      "trailer-trade-lisbon",
      {
        factor: "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women",
        player: "merchant-portrait-pack-by-captainskolot-portrait-merchant"
      }
    ]
  ]);
  for (const [id, expectedPortraitsForCapture] of expectedPortraits) {
    const capture = captureScenarioFromSearch(`?capture=${id}`);
    assert.equal(capture.sequence.transactionCount, 6);
    assert.equal(capture.sequence.factorPortraitSourceId, expectedPortraitsForCapture.factor);
    assert.equal(capture.player.characterPortraitSourceId, expectedPortraitsForCapture.player);
    assert.equal(capture.player.homeCityName, "Lisbon");
    assert.doesNotMatch(capture.sequence.factorPortraitSourceId, /openai|retro-diffusion/);
    assert.doesNotMatch(capture.player.characterPortraitSourceId, /openai|retro-diffusion/);
  }

  const malformed = structuredClone(captureScenarioFromSearch("?capture=trailer-trade-ternate"));
  malformed.sequence.transactionCount = 1;
  assert.throws(() => validateCaptureScenario(malformed), /trade transaction count/);
});

test("trailer combat stages one correctly chosen broadside at useful range", () => {
  for (const id of ["trailer-fight-turtle", "trailer-fight-atlantic", "trailer-pillage-havana"]) {
    const capture = captureScenarioFromSearch(`?capture=${id}`);
    assert.equal(capture.sequence.broadsideSide, "starboard");
  }

  const turtle = captureScenarioFromSearch("?capture=trailer-fight-turtle");
  assert.ok(turtle.encounters[0].lon - turtle.player.lon > 1);
  assert.equal(turtle.encounters[0].headingDeg, turtle.player.headingDeg);

  const atlantic = captureScenarioFromSearch("?capture=trailer-fight-atlantic");
  assert.equal(atlantic.player.lon, -29);
  assert.ok(atlantic.encounters[0].lon < -27);

  const malformed = structuredClone(turtle);
  malformed.sequence.broadsideSide = "both";
  assert.throws(() => validateCaptureScenario(malformed), /broadside side/);
});

test("visible trailer captain portrait is a reviewed human-made asset", () => {
  const capture = captureScenarioFromSearch("?capture=trailer-pillage-alexandria");
  assert.equal(
    capture.player.characterPortraitSourceId,
    "women-knight-portrait-pack-by-captainskeleto-women-knight-portrait"
  );
  assert.equal(capture.player.homeCityName, "Venice");
  assert.doesNotMatch(capture.player.characterPortraitSourceId, /openai|retro-diffusion/);
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
