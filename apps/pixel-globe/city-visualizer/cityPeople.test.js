import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import {
  CITY_PERSON_APPEARANCES,
  CITY_PERSON_ARCHETYPES,
  CITY_PERSON_SKIN_RAMP
} from "./cityPeopleCatalog.js";
import {
  CITY_POPULATION_PROFILES,
  cityPopulationProfileId,
  cityRecruitableCrewAppearances,
  createCityPeopleAgents,
  validateCityPeopleManifest
} from "./cityPeople.js";
import { CITY_NPC_PATHS } from "./cityPainterOrder.js";

const catalog = JSON.parse(await readFile(new URL("./data/cities.json", import.meta.url), "utf8"));
const manifest = validateCityPeopleManifest(JSON.parse(await readFile(new URL(
  "./assets/minifolks/manifest.json",
  import.meta.url
), "utf8")));
const appearanceById = new Map(CITY_PERSON_APPEARANCES.map((entry) => [entry.id, entry]));

test("every port has an explicit reproducible population profile", () => {
  assert.equal(catalog.version, 5);
  assert.equal(catalog.cityCount, catalog.cities.length);
  for (const city of catalog.cities) {
    assert.equal(city.populationProfileId, cityPopulationProfileId(city), city.id);
  }
  const representativeProfiles = new Map([
    ["london|united kingdom", "european"],
    ["aden|yemen", "islamicate"],
    ["agra|india", "south-asian"],
    ["wuhan|china", "ming"],
    ["seoul|republic of korea", "joseon"],
    ["yamaguchi|japan", "japanese"],
    ["aceh|indonesia", "southeast-asian"],
    ["zanzibar|tanzania", "african-islamicate"],
    ["xicalango|mexico", "indigenous-american"],
    ["yap village|federated states of micronesia", "polynesian"],
    ["akkeshi kotan|japan", "ainu"]
  ]);
  for (const [cityId, profileId] of representativeProfiles) {
    assert.equal(city(cityId).populationProfileId, profileId);
  }
});

test("every future sailing colony has a baked scene and a live recruitable population pool", () => {
  const bakedCityIds = new Set(catalog.cities.map(({ cityId }) => cityId));
  const sailingTargets = COLONIZATION_TARGETS.filter(({ waterAccess }) => waterAccess !== "inland");
  assert.ok(sailingTargets.length > 0);
  for (const target of sailingTargets) {
    assert.ok(bakedCityIds.has(target.cityId), `missing baked colony scene: ${target.cityId}`);
    const liveCity = {
      ...target,
      population: 2400,
      settlementType: "city",
      playerFoundedColony: true
    };
    assert.ok(cityRecruitableCrewAppearances(liveCity).length > 0, target.cityId);
  }
  assert.equal(city("lima|peru").cityType, "andean");
});

test("peacetime city populations retain a distinct deterministic garrison pool", () => {
  const london = city("london|united kingdom");
  const first = createCityPeopleAgents({ city: london, count: 6, paths: CITY_NPC_PATHS });
  assert.deepEqual(first, createCityPeopleAgents({ city: london, count: 6, paths: CITY_NPC_PATHS }));
  assert.equal(first.length, 6);
  assert.equal(new Set(first.map(({ id }) => id)).size, 6);
  assert.equal(first.filter(({ role }) => role === "garrison").length, 2);
  assert.ok(first.every(({ id }) => id.startsWith(`${london.id}:street-person:`)));

  const openVillage = createCityPeopleAgents({
    city: city("xicalango|mexico"),
    count: 3,
    paths: CITY_NPC_PATHS
  });
  assert.ok(openVillage.every(({ role }) => role === "ambient"));

  const capitalVillage = createCityPeopleAgents({
    city: city("akkeshi kotan|japan"),
    count: 3,
    paths: CITY_NPC_PATHS
  });
  assert.equal(capitalVillage.filter(({ role }) => role === "garrison").length, 1);
});

test("every port recruits only attack-capable foot silhouettes from its own population", () => {
  for (const port of catalog.cities) {
    const recruits = cityRecruitableCrewAppearances(port);
    assert.ok(recruits.length > 0, port.id);
    assert.equal(new Set(recruits.map(({ appearanceId }) => appearanceId)).size, recruits.length);
    assert.ok(recruits.every(({ crewTypeId }) => typeof crewTypeId === "string" && crewTypeId !== ""));
    assert.ok(recruits.every(({ appearanceId }) => !appearanceId.includes("horse")));
  }
  const japanese = cityRecruitableCrewAppearances(city("yamaguchi|japan"));
  assert.ok(japanese.some(({ appearanceId, crewTypeId }) => (
    appearanceId === "japanese-samurai" && crewTypeId === "ronin"
  )));
  assert.ok(japanese.every(({ appearanceId }) => appearanceId !== "japanese-horse-samurai"));
});

test("African profiles require dark and deep civilian appearances", () => {
  for (const profileId of ["african", "african-islamicate"]) {
    const profile = CITY_POPULATION_PROFILES.find(({ id }) => id === profileId);
    assert.ok(profile);
    const tones = new Set(profile.ambient.map(({ appearanceId }) => appearanceById.get(appearanceId).skinTone));
    assert.ok(tones.has("dark"), `${profileId} has no dark skin appearance`);
    assert.ok(tones.has("deep"), `${profileId} has no deep skin appearance`);
    assert.ok([...tones].every((tone) => tone === "dark" || tone === "deep"));
  }
});

test("the production archetype catalog excludes prohibited and named-character silhouettes", () => {
  const sources = CITY_PERSON_ARCHETYPES.map(({ sourcePath }) => sourcePath).join("\n");
  for (const forbidden of [
    "Mage",
    "PirateCaptain",
    "PirateHarpooner",
    "King",
    "Prince",
    "Queen",
    "Princess",
    "Ninja",
    "Ronin"
  ]) {
    assert.doesNotMatch(sources, new RegExp(forbidden));
  }
});

test("skin ramps follow visible faces rather than hands, weapons, horses, or equipment", () => {
  const archetypeById = new Map(CITY_PERSON_ARCHETYPES.map((entry) => [entry.id, entry]));
  assert.deepEqual(archetypeById.get("cavalier")?.skinRamp, []);
  assert.deepEqual(archetypeById.get("horseman")?.skinRamp, []);
  assert.deepEqual(archetypeById.get("halberdier")?.skinRamp, ["fca790"]);
});

test("every authored and target people color belongs to Resurrect 64", () => {
  const palette = new Set(RESURRECT_64_HEX);
  for (const ramp of Object.values(CITY_PERSON_SKIN_RAMP)) {
    assert.ok(ramp.every((color) => palette.has(color)));
  }
  for (const archetype of CITY_PERSON_ARCHETYPES) {
    assert.ok(archetype.skinRamp.every((color) => palette.has(color)), archetype.id);
  }
  for (const appearance of CITY_PERSON_APPEARANCES) {
    for (const [source, target] of Object.entries(appearance.palette)) {
      assert.ok(palette.has(source), `${appearance.id} source #${source}`);
      assert.ok(palette.has(target), `${appearance.id} target #${target}`);
    }
  }
});

test("the packed people atlas contains every appearance with hard pixel alpha", async () => {
  assert.equal(manifest.appearances.length, CITY_PERSON_APPEARANCES.length);
  assert.match(JSON.stringify(manifest.credits), /LYASeeK/);
  const atlas = await loadImage(new URL(
    `./assets/minifolks/${manifest.sheet}`,
    import.meta.url
  ).pathname);
  const canvas = createCanvas(atlas.width, atlas.height);
  const context = canvas.getContext("2d");
  context.drawImage(atlas, 0, 0);
  const pixels = context.getImageData(0, 0, atlas.width, atlas.height).data;
  const palette = new Set(RESURRECT_64_HEX);
  let opaquePixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    assert.ok(alpha === 0 || alpha === 255, `partial alpha at pixel ${offset / 4}`);
    if (alpha === 0) continue;
    const color = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
      .map((component) => component.toString(16).padStart(2, "0"))
      .join("");
    assert.ok(palette.has(color), `non-Resurrect atlas color #${color}`);
    opaquePixels += 1;
  }
  assert.ok(opaquePixels > 0);
  for (const appearance of manifest.appearances) {
    for (const animationId of ["idle", "walk", "jump"]) {
      assert.ok(appearance.animations[animationId]?.length > 0, `${appearance.id}/${animationId}`);
      for (const frame of appearance.animations[animationId]) {
        assert.ok(frame.frame.x >= 0 && frame.frame.y >= 0, appearance.id);
        assert.ok(frame.frame.x + frame.frame.w <= atlas.width, appearance.id);
        assert.ok(frame.frame.y + frame.frame.h <= atlas.height, appearance.id);
        assert.deepEqual(frame.sourceSize, { w: 32, h: 32 });
      }
    }
  }
});

function city(cityId) {
  const record = catalog.cities.find(({ id }) => id === cityId);
  assert.ok(record, `missing city ${cityId}`);
  return record;
}
