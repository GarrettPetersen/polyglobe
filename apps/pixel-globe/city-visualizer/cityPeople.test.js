import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import {
  COLONIAL_CITY_FOUNDINGS,
  COLONIAL_FOUNDING_CONQUERED,
  COLONIAL_FOUNDING_SETTLER,
  COLONIZATION_TARGETS
} from "../src/colonialCities.js";
import {
  CITY_PERSON_APPEARANCES,
  CITY_PERSON_ARCHETYPES,
  CITY_PERSON_SKIN_RAMP
} from "./cityPeopleCatalog.js";
import {
  CITY_POPULATION_PROFILES,
  cityCivilianAppearanceIds,
  cityCombatProfileForAppearance,
  cityCrewTypeForAppearance,
  cityGarrisonAppearanceIds,
  cityPortStaffAppearanceIds,
  cityPopulationProfileId,
  cityRecruitableCrewAppearances,
  createCityBombardmentCivilianAgents,
  createCityPeopleAgents,
  validateCityPeopleAtlasImage,
  validateCityPeopleManifest
} from "./cityPeople.js";
import { CITY_NPC_PATHS } from "./cityPainterOrder.js";
import { PORT_CITY_STAFF_ROLE, PORT_CITY_STAFF_ROLES } from "../src/characterPortraits.js";

const catalog = JSON.parse(await readFile(new URL("./data/cities.json", import.meta.url), "utf8"));
const manifest = validateCityPeopleManifest(JSON.parse(await readFile(new URL(
  "./assets/minifolks/manifest.json",
  import.meta.url
), "utf8")));
const appearanceById = new Map(CITY_PERSON_APPEARANCES.map((entry) => [entry.id, entry]));

test("every port has an explicit reproducible population profile", () => {
  assert.equal(catalog.version, 7);
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

test("population profiles do not depend on visual landmark metadata", () => {
  for (const city of catalog.cities) {
    const runtimeCity = { ...city };
    delete runtimeCity.religiousLandmarks;
    delete runtimeCity.backgroundCity;
    assert.equal(cityPopulationProfileId(runtimeCity), city.populationProfileId, city.id);
  }
});

test("every population can provide deterministic male and female colonist sprites", () => {
  const archetypeById = new Map(CITY_PERSON_ARCHETYPES.map((entry) => [entry.id, entry]));
  for (const port of catalog.cities) {
    const sexes = ["female", "male", "female", "male"];
    const first = cityCivilianAppearanceIds(port, sexes, "colonist-test");
    assert.deepEqual(first, cityCivilianAppearanceIds(port, sexes, "colonist-test"), port.id);
    first.forEach((appearanceId, index) => {
      const appearance = appearanceById.get(appearanceId);
      assert.equal(archetypeById.get(appearance.archetypeId).sex, sexes[index], `${port.id}:${appearanceId}`);
    });
  }
});

test("every garrison appearance maps to a combat type and complete combat animations", () => {
  const exportedById = new Map(manifest.appearances.map((entry) => [entry.id, entry]));
  for (const profile of CITY_POPULATION_PROFILES) {
    for (const { appearanceId } of profile.garrison) {
      assert.equal(typeof cityCrewTypeForAppearance(appearanceId), "string", appearanceId);
      assert.equal(typeof cityCombatProfileForAppearance(appearanceId), "string", appearanceId);
      const animations = exportedById.get(appearanceId).animations;
      for (const animationId of ["attack", "hit", "death"]) {
        assert.ok(animations[animationId]?.length > 0, `${appearanceId}:${animationId}`);
      }
    }
  }
  assert.ok(exportedById.get("shieldman-light").animations.block.length > 0);
  assert.ok(exportedById.get("islamicate-warrior-medium").animations.block.length > 0);
});

test("every future sailing colony has a baked scene and a live recruitable population pool", () => {
  const bakedCities = new Map(catalog.cities.map((entry) => [entry.cityId, entry]));
  const sailingTargets = COLONIZATION_TARGETS.filter(({ waterAccess }) => waterAccess !== "inland");
  assert.ok(sailingTargets.length > 0);
  for (const target of sailingTargets) {
    const baked = bakedCities.get(target.cityId);
    assert.ok(baked, `missing baked colony scene: ${target.cityId}`);
    const liveCity = {
      ...target,
      population: 2400,
      settlementType: "city",
      playerFoundedColony: target.type !== COLONIAL_FOUNDING_CONQUERED &&
        target.preexistingSettlement !== true
    };
    assert.ok(cityRecruitableCrewAppearances(liveCity).length > 0, target.cityId);
    assert.equal(baked.cityType, target.cityType, `${target.cityId} baked city type`);
  }
});

test("new colonies use colonizer architecture, population, and shipbuilding", () => {
  const colonizerStyle = new Map([
    ["spain", "mediterranean"],
    ["portugal", "mediterranean"],
    ["england", "northern-european"],
    ["france", "northern-european"],
    ["burgundian-netherlands", "northern-european"]
  ]);
  for (const target of COLONIZATION_TARGETS) {
    if (target.type === COLONIAL_FOUNDING_CONQUERED || target.preexistingSettlement) continue;
    const expectedStyle = colonizerStyle.get(target.factionId);
    assert.ok(expectedStyle, `missing colonizer style expectation for ${target.factionId}`);
    assert.equal(target.cityType, expectedStyle, `${target.cityId} live architecture`);
    if (target.waterAccess === "inland") continue;
    const baked = city(target.cityId);
    assert.equal(baked.populationProfileId, "european", `${target.cityId} population`);
    for (const style of ["housingStyle", "serviceStyle", "fortificationStyle"]) {
      assert.equal(baked.architecture[style], expectedStyle, `${target.cityId} ${style}`);
    }
    assert.equal(
      baked.defaultShip,
      expectedStyle === "mediterranean" ? "xebec" : "small-cog",
      `${target.cityId} shipyard hull`
    );
  }

  assert.equal(city("lima|peru").populationProfileId, "european");
  assert.equal(city("manila|philippines").populationProfileId, "southeast-asian");
  assert.equal(city("nagasaki|japan").populationProfileId, "japanese");
});

test("every baked settler colony uses its colonizer's architectural family", () => {
  const bakedCities = new Map(catalog.cities.map((entry) => [entry.cityId, entry]));
  const expectedStyleByFaction = new Map([
    ["spain", "mediterranean"],
    ["portugal", "mediterranean"],
    ["england", "northern-european"]
  ]);
  let reviewedCount = 0;
  for (const founding of COLONIAL_CITY_FOUNDINGS) {
    if (founding.type !== COLONIAL_FOUNDING_SETTLER) continue;
    const baked = bakedCities.get(founding.cityId);
    if (!baked) continue;
    reviewedCount += 1;
    const expectedStyle = expectedStyleByFaction.get(founding.factionId);
    assert.ok(expectedStyle, `missing settler style expectation for ${founding.factionId}`);
    assert.equal(baked.cityType, expectedStyle, `${founding.cityId} city type`);
    assert.equal(baked.populationProfileId, "european", `${founding.cityId} population`);
    assert.ok(
      Object.values(baked.architecture).every((value) => (
        value === expectedStyle || value === "urban"
      )),
      `${founding.cityId} architecture`
    );
  }
  assert.ok(reviewedCount >= 10, `reviewed only ${reviewedCount} baked settler colonies`);
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

test("bombarded cities replace peacetime walkers with local fallen and panicking civilians", () => {
  for (const cityId of [
    "london|united kingdom",
    "yamaguchi|japan",
    "xicalango|mexico",
    "yap village|federated states of micronesia"
  ]) {
    const port = city(cityId);
    const civilians = createCityBombardmentCivilianAgents({
      city: port,
      count: 6,
      paths: CITY_NPC_PATHS
    });
    assert.deepEqual(civilians, createCityBombardmentCivilianAgents({
      city: port,
      count: 6,
      paths: CITY_NPC_PATHS
    }));
    assert.equal(civilians.length, 6);
    assert.equal(civilians.filter(({ motion }) => motion === "fallen").length, 3);
    assert.equal(civilians.filter(({ motion }) => motion === "panic").length, 3);
    assert.ok(civilians.every(({ role }) => role === "ambient"));
    const localAppearances = new Set(
      CITY_POPULATION_PROFILES.find(({ id }) => id === port.populationProfileId)
        .ambient.map(({ appearanceId }) => appearanceId)
    );
    assert.ok(civilians.every(({ appearanceId }) => localAppearances.has(appearanceId)));
    assert.ok(civilians.filter(({ motion }) => motion === "fallen")
      .every(({ appearanceId }) => manifest.appearances
        .find(({ id }) => id === appearanceId).animations.death.length > 0));
    assert.ok(civilians.filter(({ motion }) => motion === "panic")
      .every(({ speed }) => speed >= 0.00038));
  }
});

test("every port has deterministic local appearances for its five staff roles", () => {
  for (const port of catalog.cities) {
    const staff = cityPortStaffAppearanceIds(port);
    assert.deepEqual(staff, cityPortStaffAppearanceIds(port), port.id);
    assert.deepEqual(Object.keys(staff), PORT_CITY_STAFF_ROLES, port.id);
    const civilianRoles = [
      PORT_CITY_STAFF_ROLE.HARBOUR_MASTER,
      PORT_CITY_STAFF_ROLE.INNKEEPER,
      PORT_CITY_STAFF_ROLE.SMITH,
      PORT_CITY_STAFF_ROLE.MERCHANT
    ];
    assert.equal(
      new Set(civilianRoles.map((role) => staff[role])).size,
      civilianRoles.length,
      `${port.id} civilian staff silhouettes`
    );
    assert.equal(
      staff[PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER],
      cityGarrisonAppearanceIds(port, 1, "garrison-commander")[0],
      `${port.id} garrison commander`
    );
  }
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
    appearanceId === "japanese-ronin" && crewTypeId === "ronin"
  )));
  assert.ok(japanese.some(({ appearanceId, crewTypeId }) => (
    appearanceId === "japanese-samurai" && crewTypeId === "samurai"
  )));
  assert.notEqual(
    cityCombatProfileForAppearance("japanese-ronin"),
    cityCombatProfileForAppearance("japanese-samurai")
  );
  assert.ok(japanese.every(({ appearanceId }) => appearanceId !== "japanese-horse-samurai"));
});

test("combat profiles preserve culture-specific and mounted unit identities", () => {
  assert.equal(cityCombatProfileForAppearance("cavalier-covered"), "cavalier");
  assert.equal(cityCombatProfileForAppearance("japanese-horse-samurai"), "horse-samurai");
  assert.equal(cityCombatProfileForAppearance("japanese-ronin"), "ronin");
  assert.equal(cityCombatProfileForAppearance("japanese-samurai"), "samurai");
  assert.equal(cityCombatProfileForAppearance("japanese-yari-ashigaru"), "yari-ashigaru");
  assert.equal(cityCombatProfileForAppearance("wrapped-cloth-man-dark-indigo"), "tribal-spearman");
  assert.equal(cityCombatProfileForAppearance("ming-crossbowman"), "ming-crossbowman");
  assert.throws(() => cityCombatProfileForAppearance("villager-woman-light-earth"), /not combat capable/);
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
    "Ninja"
  ]) {
    assert.doesNotMatch(sources, new RegExp(forbidden));
  }
});

test("tribal populations do not use recolored European archer silhouettes", () => {
  const appearanceIds = new Set(CITY_PERSON_APPEARANCES.map(({ id }) => id));
  for (const removedId of ["archer-medium-green", "archer-medium-warm", "archer-dark-green"]) {
    assert.equal(appearanceIds.has(removedId), false, removedId);
  }
  for (const profileId of ["indigenous-american", "polynesian", "ainu"]) {
    const profile = CITY_POPULATION_PROFILES.find(({ id }) => id === profileId);
    assert.ok(profile, profileId);
    assert.deepEqual(
      new Set(profile.garrison.map(({ appearanceId }) => appearanceId)),
      new Set(["wrapped-cloth-man-dark-indigo"]),
      profileId
    );
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
  assert.equal(atlas.width, manifest.sheetSize.w);
  assert.equal(atlas.height, manifest.sheetSize.h);
  assert.equal(validateCityPeopleAtlasImage(manifest, atlas), atlas);
  const digest = createHash("sha256");
  digest.update(await readFile(new URL(`./assets/minifolks/${manifest.sheet}`, import.meta.url)));
  assert.equal(manifest.assetRevision, digest.digest("hex").slice(0, 16));
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

test("the people atlas cannot mix image bytes and frame metadata from different exports", () => {
  assert.throws(
    () => validateCityPeopleAtlasImage(manifest, { width: 252, height: 1382 }),
    /does not match manifest/
  );
  assert.throws(
    () => validateCityPeopleManifest({ ...manifest, version: 3 }),
    /Unsupported city people manifest/
  );

  const mainSource = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  assert.match(mainSource, /minifolks\/manifest\.json`, \{ cache: "no-store" \}/);
  assert.match(mainSource, /cityPeopleAtlasUrl\(state\.peopleManifest\)/);
  assert.match(mainSource, /manifest\.assetRevision/);
});

function city(cityId) {
  const record = catalog.cities.find(({ id }) => id === cityId);
  assert.ok(record, `missing city ${cityId}`);
  return record;
}
