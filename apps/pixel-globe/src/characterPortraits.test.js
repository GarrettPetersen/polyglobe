import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { PORT_PERSONALITY_IDS } from "./portDialoguePersonality.js";
import { nearestResurrect64Hex } from "./waterLatitudePalette.js";

import {
  assignNpcShipCaptains,
  assignMissingNpcShipCaptains,
  assignPortCityCharacterFromSource,
  assignPortCityCharacters,
  characterExpression,
  generateCastawayCharacter,
  generateCastawayFamilyMember,
  generateCampaignContactCharacter,
  generatePassengerCharacter,
  generatePirateCaptiveCharacter,
  generatePirateCaptiveFamilyMember,
  generatePlayerCharacter,
  repairLegacyNpcCaptainHomeCityIds,
  reconcileCharacterPortraitMetadata,
  validateCharacterPortraitManifest
} from "./characterPortraits.js";

const GENERATED_MANIFEST = JSON.parse(readFileSync(
  new URL("../public/assets/characters/generated/character-portraits.json", import.meta.url),
  "utf8"
));
const CHARACTER_ASSET_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "../public/assets/characters"
);
test("player portrait selection uses a directly authored regional captain sprite", () => {
  const usedNames = new Set();
  const homePort = {
    tileId: 7,
    cityId: "cadiz|spain",
    city: "Cadiz",
    displayCity: "Cadiz",
    country: "Spain",
    cityType: "mediterranean",
    lat: 36.53,
    lon: -6.29
  };
  const character = generatePlayerCharacter({
    identityKey: "test-player",
    homePort,
    manifest: GENERATED_MANIFEST,
    usedNames
  });

  assert.equal(character.role, "player-captain");
  assert.equal(character.homePortName, "Cadiz");
  assert.equal(character.nameCulture, "spanish");
  assert.equal(character.sex, character.gender);
  assert.ok(character.sourceRoles.some((role) => role === "captain" || role === "factor"));
  assert.ok(character.sourceRegions.includes("mediterranean"));
  assert.ok(!character.sourceRoles.includes("pirate"));
  assert.notEqual(character.id, character.sourceId);
  assert.equal("paletteSwapped" in character, false);
  assert.equal("palette" in character, false);
  assert.ok(character.age >= character.minAge && character.age <= character.maxAge);
  assert.ok(character.expressions.length > 1);
  assert.ok(character.expressions.every((expression) => expression.src.startsWith("assets/characters/")));
  assert.ok(character.expressions.every((expression) => expression.width === 64 && expression.height === 64));
});

test("European players draw from every expressive regional portrait", () => {
  const expectedSourceIds = GENERATED_MANIFEST.sourceCharacters
    .filter((source) => (
      source.regions.includes("mediterranean") &&
      source.expressions.length > 1 &&
      !source.roles.includes("pirate") &&
      source.roles.some((role) => role === "captain" || role === "factor")
    ))
    .map((source) => source.id)
    .sort();
  assert.ok(expectedSourceIds.length > 0);

  for (const [cityType, city] of [
    ["mediterranean", "Cadiz"],
    ["northern-european", "London"]
  ]) {
    const observedSourceIds = new Set();
    for (let index = 0; index < 2000 && observedSourceIds.size < expectedSourceIds.length; index++) {
      const character = generatePlayerCharacter({
        identityKey: `european-player-${cityType}-${index}`,
        homePort: {
          cityId: `${city.toLowerCase()}|${city === "Cadiz" ? "spain" : "united kingdom"}`,
          tileId: 100 + index,
          city,
          displayCity: city,
          country: city === "Cadiz" ? "Spain" : "United Kingdom",
          cityType,
          factionId: city === "Cadiz" ? "spain" : "england"
        },
        manifest: GENERATED_MANIFEST,
        usedNames: new Set()
      });
      assert.ok(character.expressions.length > 1);
      assert.ok(!character.sourceRoles.includes("pirate"));
      observedSourceIds.add(character.sourceId);
    }
    assert.deepEqual([...observedSourceIds].sort(), expectedSourceIds, cityType);
  }
});
test("every portrait identity has a visually authored age range", () => {
  assert.ok(GENERATED_MANIFEST.sourceCharacters.every((source) => (
    Number.isInteger(source.minAge)
      && Number.isInteger(source.maxAge)
      && source.minAge >= 5
      && source.maxAge <= 90
      && source.minAge <= source.maxAge
  )));
  const littleGirl = GENERATED_MANIFEST.sourceCharacters.find((source) => source.label === "Little Girl Portrait");
  const oldWarrior = GENERATED_MANIFEST.sourceCharacters.find((source) => source.label === "Old Warrior Grey Beard");
  const herbalist = GENERATED_MANIFEST.sourceCharacters.find((source) => source.label === "Herbalist Women Portrait");
  const nativeElder = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.label === "Native American Portrait 7"
  );
  const japaneseElder = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.sourceDirectory === "Japanese Portrait Pack by OpenAI"
      && source.label === "Japanese 9"
  );
  const joseonOfficial = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.sourceDirectory === "Joseon Korean Portrait Pack by OpenAI"
      && source.label === "Joseon Korean 3"
  );
  assert.deepEqual([littleGirl.minAge, littleGirl.maxAge], [8, 13]);
  assert.deepEqual([oldWarrior.minAge, oldWarrior.maxAge], [58, 75]);
  assert.deepEqual([herbalist.minAge, herbalist.maxAge], [22, 34]);
  assert.deepEqual([nativeElder.minAge, nativeElder.maxAge], [45, 62]);
  assert.deepEqual([japaneseElder.minAge, japaneseElder.maxAge], [62, 80]);
  assert.deepEqual([joseonOfficial.minAge, joseonOfficial.maxAge], [38, 55]);
});

test("every portrait identity has an explicit reviewed sex", () => {
  assert.ok(GENERATED_MANIFEST.sourceCharacters.every((source) => (
    source.sex === "female" || source.sex === "male"
  )));
  const withoutSex = structuredClone(GENERATED_MANIFEST);
  delete withoutSex.sourceCharacters[0].sex;
  assert.throws(
    () => validateCharacterPortraitManifest(withoutSex),
    /has invalid sex/
  );
});

test("mixed portrait sheets retain their visually reviewed sex assignments", () => {
  const expectedFemalePortraits = new Map([
    ["Indian Ocean Portrait Pack by OpenAI", [2, 7, 9, 12, 14]],
    ["Japanese Portrait Pack by OpenAI", [2, 4, 6, 8, 10, 12, 14, 16]],
    ["Joseon Korean Portrait Pack by OpenAI", [2, 4, 6, 8, 10, 12, 14, 16]],
    ["Ming Chinese Portrait Pack by OpenAI", [5, 10, 15]],
    ["Native Americain Portrait Pack by Captainskeleto", [1, 2, 3, 4, 9, 10, 13, 14]],
    ["Polynesian Portrait Pack by OpenAI", [2, 4, 6, 8, 10, 12, 14]],
    ["South Asian Portrait Pack by OpenAI", [2, 4, 9, 11, 14, 16]],
    ["Southeast Asian Portrait Pack by OpenAI", [2, 4, 9, 11, 12, 14]],
    ["Sub-Saharan African Portrait Pack by OpenAI", [2, 4, 6, 8, 10, 12, 14, 16]]
  ]);

  for (const [directory, expectedNumbers] of expectedFemalePortraits) {
    const actualNumbers = GENERATED_MANIFEST.sourceCharacters
      .filter((source) => source.sourceDirectory === directory && source.sex === "female")
      .map((source) => Number.parseInt(source.label.match(/(\d+)$/)?.[1], 10))
      .sort((a, b) => a - b);
    assert.deepEqual(actualNumbers, expectedNumbers, directory);
  }
});

test("the black-haired woman is an expressive East Asian portrait", () => {
  const source = GENERATED_MANIFEST.sourceCharacters.find((portrait) => (
    portrait.sourceDirectory === "Women Black Hair Portrait by Captainskolot"
  ));

  assert.ok(source);
  assert.equal(source.sex, "female");
  assert.deepEqual(source.regions, ["east-asia"]);
  assert.ok(source.roles.includes("factor"));
  assert.equal(source.expressions.length, 12);
  assert.equal(source.expressions.find((expression) => expression.id === "neutral")?.index, 2);
});

test("monastic portraits stay in their reviewed regions and faith families", () => {
  const clergy = GENERATED_MANIFEST.sourceCharacters.filter((source) => (
    source.roles.includes("clergy")
  ));
  const buddhistMonk = clergy.find((source) => source.label === "Bald Monk");
  const christianMonk = clergy.find((source) => source.label === "Monk Portrait");

  assert.equal(clergy.length, 2);
  assert.deepEqual(buddhistMonk.regions, ["east-asia"]);
  assert.equal(buddhistMonk.requiredReligionFamily, "buddhist");
  assert.deepEqual(
    christianMonk.regions,
    ["global", "europe", "northern-europe", "mediterranean"]
  );
  assert.equal(christianMonk.requiredReligionFamily, "christian");
  assert.equal(buddhistMonk.selectionWeight, 2);
  assert.equal(christianMonk.selectionWeight, 2);
});

test("authored portrait weights provide extra slots without a separate religion roll", () => {
  const monk = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.label === "Bald Monk"
  );
  const layperson = GENERATED_MANIFEST.sourceCharacters.find((source) => (
    source.regions.includes("east-asia") &&
    source.roles.includes("factor") &&
    !source.roles.includes("clergy")
  ));
  assert.ok(monk);
  assert.ok(layperson);

  const manifest = {
    ...GENERATED_MANIFEST,
    sourceCharacters: [monk, layperson]
  };
  const cities = [1, 2, 3].map((tileId) => ({
    cityId: `test-port-${tileId}|china`,
    tileId,
    city: `Test Port ${tileId}`,
    displayCity: `Test Port ${tileId}`,
    country: "China",
    factionId: "ming",
    cityType: "east-asian"
  }));
  const assignments = assignPortCityCharacters(cities, manifest, new Set());
  const sourceCounts = [...assignments.values()].reduce((counts, character) => {
    counts.set(character.sourceId, (counts.get(character.sourceId) || 0) + 1);
    return counts;
  }, new Map());

  assert.equal(sourceCounts.get(monk.id), 2);
  assert.equal(sourceCounts.get(layperson.id), 1);
});

test("saved characters inherit corrected metadata from their reviewed portrait", () => {
  const southAsianWoman = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.label === "South Asian 11"
  );
  const polynesianMan = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.label === "Polynesian 9"
  );
  assert.equal(southAsianWoman.sex, "female");
  assert.equal(polynesianMan.sex, "male");

  const savedVoyage = {
    playerCharacter: {
      sourceId: southAsianWoman.id,
      sex: "male"
    },
    people: [{
      sourceId: polynesianMan.id,
      sex: "female"
    }],
    unrelatedEntity: {
      sourceId: "npc-ship-1"
    }
  };

  assert.equal(
    reconcileCharacterPortraitMetadata(savedVoyage, GENERATED_MANIFEST),
    2
  );
  assert.equal(savedVoyage.playerCharacter.sex, "female");
  assert.equal(savedVoyage.people[0].sex, "male");
});

test("saved clerical portraits inherit a compatible religion", () => {
  const christianMonk = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.label === "Monk Portrait"
  );
  const savedCharacter = {
    sourceId: christianMonk.id,
    sex: christianMonk.sex,
    religionId: "sunni-islam"
  };

  assert.equal(reconcileCharacterPortraitMetadata(savedCharacter, GENERATED_MANIFEST), 2);
  assert.equal(savedCharacter.requiredReligionFamily, "christian");
  assert.equal(savedCharacter.religionId, "roman-catholic");
});

test("portrait metadata reconciliation rejects unknown character sources", () => {
  assert.throws(
    () => reconcileCharacterPortraitMetadata({ sourceId: "missing-portrait", sex: "male" }, GENERATED_MANIFEST),
    /unknown portrait source/
  );
});

test("saved characters inherit corrected neutral expression assignments", () => {
  const strawHatWoman = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.id === "women-peasant-pack-by-captainskeleto-women-peasant"
  );
  const savedCharacter = {
    sourceId: strawHatWoman.id,
    sex: strawHatWoman.sex,
    expressions: strawHatWoman.expressions.map((expression) => ({
      id: expression.index === 1 ? "sad" : expression.index === 3 ? "neutral" : expression.id,
      label: expression.index === 1 ? "Sad" : expression.index === 3 ? "Neutral" : expression.label,
      src: expression.src,
      width: expression.width,
      height: expression.height
    }))
  };

  assert.equal(reconcileCharacterPortraitMetadata(savedCharacter, GENERATED_MANIFEST), 1);
  assert.match(characterExpression(savedCharacter).src, /Women%20Peasant_9\.png$/);
  assert.match(characterExpression(savedCharacter, "sad").src, /Women%20Peasant_2\.png$/);
});

test("saved characters inherit corrected visual ages and consistent birthdays", () => {
  const herbalist = GENERATED_MANIFEST.sourceCharacters.find(
    (source) => source.label === "Herbalist Women Portrait"
  );
  const savedCharacter = {
    sourceId: herbalist.id,
    sex: herbalist.sex,
    minAge: 35,
    maxAge: 52,
    age: 51,
    birthDate: { year: 1470, month: 6, day: 10 },
    birthDateLabel: "10 June 1470"
  };

  assert.equal(reconcileCharacterPortraitMetadata(savedCharacter, GENERATED_MANIFEST), 1);
  assert.equal(savedCharacter.age, 34);
  assert.equal(savedCharacter.minAge, 22);
  assert.equal(savedCharacter.maxAge, 34);
  assert.deepEqual(savedCharacter.birthDate, { year: 1487, month: 6, day: 10 });
  assert.equal(savedCharacter.birthDateLabel, "10 June 1487");
});

test("East Asian players use the authored Ming portrait group", () => {
  const homePort = {
    tileId: 12,
    cityId: "beijing|china",
    city: "Beijing",
    displayCity: "Beijing",
    country: "China",
    factionId: "ming",
    cityType: "east-asian",
    lat: 39.9,
    lon: 116.4
  };
  const generatedSexes = new Set();
  for (let index = 0; index < 100; index++) {
    const character = generatePlayerCharacter({
      identityKey: `beijing-player-${index}`,
      homePort,
      manifest: GENERATED_MANIFEST,
      usedNames: new Set()
    });
    assert.ok(character.sourceId.startsWith("ming-chinese-portrait-pack-by-openai-"));
    assert.deepEqual(character.sourceRegions, ["east-asia"]);
    assert.equal(character.sex, character.gender);
    assert.ok(character.age >= character.minAge && character.age <= character.maxAge);
    generatedSexes.add(character.sex);
  }
  assert.deepEqual(generatedSexes, new Set(["female", "male"]));
});

test("Japanese and Joseon players use their own reviewed portrait groups", () => {
  for (const profile of [
    {
      factionId: "japan",
      country: "Japan",
      city: "Kyoto",
      expectedPrefix: "japanese-portrait-pack-by-openai-",
      expectedRegion: "japan"
    },
    {
      factionId: "joseon",
      country: "Republic of Korea",
      city: "Seoul",
      expectedPrefix: "joseon-korean-portrait-pack-by-openai-",
      expectedRegion: "joseon"
    }
  ]) {
    const generatedSexes = new Set();
    for (let index = 0; index < 100; index += 1) {
      const character = generatePlayerCharacter({
        identityKey: `${profile.factionId}-player-${index}`,
        homePort: {
          cityId: `${profile.city.toLowerCase()}|${profile.country.toLowerCase()}`,
          tileId: 200 + index,
          city: profile.city,
          displayCity: profile.city,
          country: profile.country,
          factionId: profile.factionId,
          cityType: "east-asian"
        },
        manifest: GENERATED_MANIFEST,
        usedNames: new Set()
      });
      assert.ok(profile.factionId === "japan"
        ? isJapanesePortraitSourceId(character.sourceId)
        : character.sourceId.startsWith(profile.expectedPrefix));
      assert.deepEqual(character.sourceRegions, [profile.expectedRegion]);
      assert.ok(character.age >= character.minAge && character.age <= character.maxAge);
      generatedSexes.add(character.sex);
    }
    assert.deepEqual(generatedSexes, new Set(["female", "male"]));
  }
});

test("Japanese and Joseon factors and ship captains keep their sovereign portrait groups", () => {
  const ports = [
    {
      tileId: 301,
      cityId: "kyoto|japan",
      city: "Kyoto",
      country: "Japan",
      factionId: "japan",
      cityType: "east-asian"
    },
    {
      tileId: 302,
      cityId: "seoul|republic of korea",
      city: "Seoul",
      country: "Republic of Korea",
      factionId: "joseon",
      cityType: "east-asian"
    }
  ];
  const factors = assignPortCityCharacters(ports, GENERATED_MANIFEST, new Set());
  assert.ok(isJapanesePortraitSourceId(factors.get("kyoto|japan").sourceId));
  assert.ok(factors.get("seoul|republic of korea").sourceId.startsWith("joseon-korean-portrait-pack-by-openai-"));

  const ships = ports.map((currentPort, index) => ({
    id: `east-asian-sovereign-${index}`,
    slug: index === 0 ? "atakebune" : "panokseon",
    role: "warship",
    factionId: currentPort.factionId,
    profileId: "east-asia",
    currentPort: { ...currentPort, routeRegion: "east-asia" }
  }));
  const captains = assignNpcShipCaptains(ships, GENERATED_MANIFEST, new Set());
  assert.ok(isJapanesePortraitSourceId(captains.get(ships[0].id).sourceId));
  assert.ok(captains.get(ships[1].id).sourceId.startsWith("joseon-korean-portrait-pack-by-openai-"));
});

test("generated culture packs contain sixteen native authored sprites apiece", () => {
  const packs = new Map([
    ["Ming Chinese Portrait Pack by OpenAI", "east-asia"],
    ["Japanese Portrait Pack by OpenAI", "japan"],
    ["Joseon Korean Portrait Pack by OpenAI", "joseon"],
    ["South Asian Portrait Pack by OpenAI", "south-asia"],
    ["Southeast Asian Portrait Pack by OpenAI", "southeast-asia"],
    ["Indian Ocean Portrait Pack by OpenAI", "indian-ocean"],
    ["Sub-Saharan African Portrait Pack by OpenAI", "africa"],
    ["Polynesian Portrait Pack by OpenAI", "polynesia"]
  ]);

  for (const [directory, region] of packs) {
    const portraits = GENERATED_MANIFEST.sourceCharacters.filter((source) => source.sourceDirectory === directory);
    assert.equal(portraits.length, 16, directory);
    assert.ok(portraits.every((source) => source.regions.length === 1 && source.regions[0] === region));
    assert.ok(portraits.every((source) => source.expressions.length === 1));
    assert.ok(portraits.every((source) => source.expressions[0].width === 64 && source.expressions[0].height === 64));
  }
});

test("Sengoku samurai portraits retain reviewed identity metadata and exact source cells", async () => {
  const directory = "Sengoku Samurai Portrait Pack by Retro Diffusion";
  const portraits = GENERATED_MANIFEST.sourceCharacters
    .filter((source) => source.sourceDirectory === directory)
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));
  const expectedAgeRanges = [
    [18, 30], [38, 55], [60, 80], [16, 26],
    [38, 56], [42, 60], [22, 36], [60, 80],
    [32, 50], [18, 30], [40, 58], [20, 34],
    [15, 24], [45, 65], [18, 30], [52, 72]
  ];
  assert.equal(portraits.length, 16);
  assert.deepEqual(portraits.map(({ minAge, maxAge }) => [minAge, maxAge]), expectedAgeRanges);
  assert.ok(portraits.every((source) => source.sex === "male"));
  assert.ok(portraits.every((source) => source.regions.length === 1 && source.regions[0] === "japan"));
  assert.ok(portraits.every((source) => ["captain", "factor", "warrior", "noble"]
    .every((role) => source.roles.includes(role))));
  assert.ok(portraits.every((source) => source.selectionWeight === 2));
  assert.ok(portraits.every((source) => source.expressions.length === 1));

  const source = await loadImage(fileURLToPath(new URL(
    "../assets-source/characters/retro-diffusion/sengoku-samurai-1522-source.png",
    import.meta.url
  )));
  assert.equal(source.width, 256);
  assert.equal(source.height, 256);
  const sourceCanvas = createCanvas(256, 256);
  const sourceContext = sourceCanvas.getContext("2d");
  sourceContext.drawImage(source, 0, 0);

  for (let index = 0; index < portraits.length; index += 1) {
    const expression = portraits[index].expressions[0];
    const output = await loadImage(join(CHARACTER_ASSET_ROOT, decodeURIComponent(expression.src.split("assets/characters/")[1])));
    const outputCanvas = createCanvas(64, 64);
    const outputContext = outputCanvas.getContext("2d");
    outputContext.drawImage(output, 0, 0);
    const actual = outputContext.getImageData(0, 0, 64, 64).data;
    const row = Math.floor(index / 4);
    const column = index % 4;
    const expected = sourceContext.getImageData(column * 64, row * 64, 64, 64).data;
    assertExactQuantizedPortrait(actual, expected, portraits[index].label);
  }
});

test("Indian portrait crops contain no detached pixels from neighboring sheet cells", async () => {
  for (const [directory, stem] of [
    ["South Asian Portrait Pack by OpenAI", "south-asian"],
    ["Indian Ocean Portrait Pack by OpenAI", "indian-ocean"]
  ]) {
    for (let number = 1; number <= 16; number += 1) {
      const filename = `${stem}-${String(number).padStart(2, "0")}.png`;
      const image = await loadImage(join(CHARACTER_ASSET_ROOT, directory, filename));
      assert.equal(image.width, 64, `${filename} width`);
      assert.equal(image.height, 64, `${filename} height`);
      const canvas = createCanvas(image.width, image.height);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      assert.equal(opaqueComponentCount(pixels, image.width, image.height), 1, filename);
    }
  }
});

test("character expressions change frames without changing character identity", () => {
  const character = {
    id: "captain-a",
    expressions: [
      { id: "neutral", src: "assets/characters/captain-a-neutral.png" },
      { id: "sad", src: "assets/characters/captain-a-sad.png" }
    ]
  };

  assert.equal(characterExpression(character, "sad").id, "sad");
  assert.equal(character.id, "captain-a");
});

test("unknown character expressions fall back to neutral", () => {
  const character = {
    id: "captain-b",
    expressions: [
      { id: "neutral", src: "assets/characters/captain-b-neutral.png" },
      { id: "expression-02", src: "assets/characters/captain-b-expression-02.png" }
    ]
  };

  assert.equal(characterExpression(character, "sad").id, "neutral");
});

test("requested moods can use a nearby semantic expression", () => {
  const character = {
    id: "captain-c",
    expressions: [
      { id: "neutral", src: "assets/characters/captain-c-neutral.png" },
      { id: "concerned", src: "assets/characters/captain-c-concerned.png" },
      { id: "soft-smile", src: "assets/characters/captain-c-soft-smile.png" }
    ]
  };

  assert.equal(characterExpression(character, "sad").id, "concerned");
  assert.equal(characterExpression(character, "happy").id, "soft-smile");
});

test("port dialogue moods use the closest expression on the same character", () => {
  const character = {
    id: "factor-a",
    expressions: [
      { id: "neutral", src: "assets/characters/factor-a-neutral.png" },
      { id: "serious", src: "assets/characters/factor-a-serious.png" },
      { id: "soft-smile", src: "assets/characters/factor-a-soft-smile.png" },
      { id: "worried", src: "assets/characters/factor-a-worried.png" }
    ]
  };

  assert.equal(characterExpression(character, "stern").id, "serious");
  assert.equal(characterExpression(character, "pleased").id, "soft-smile");
  assert.equal(characterExpression(character, "concerned").id, "worried");
  assert.equal(character.id, "factor-a");
});

test("generated portrait expressions are semantically labelled", () => {
  const genericExpressions = [];
  for (const source of GENERATED_MANIFEST.sourceCharacters) {
    for (const expression of source.expressions) {
      if (/^expression-\d+/.test(expression.id) || /^Expression \d+/.test(expression.label)) {
        genericExpressions.push(`${source.id}.${expression.id}`);
      }
    }
  }

  assert.deepEqual(genericExpressions, []);
});

test("death portraits prefer unmistakable distress over reflective expressions", () => {
  const deathExpressions = new Set([
    "crying",
    "pained",
    "hurt",
    "sad",
    "afraid",
    "worried",
    "concerned",
    "weary",
    "grimace",
    "stern"
  ]);

  for (const source of GENERATED_MANIFEST.sourceCharacters.filter((entry) => entry.expressions.length > 1)) {
    const expression = characterExpression(source, "dying");
    assert.ok(expression, `${source.label} has no death portrait`);
    assert.ok(
      deathExpressions.has(expression.id),
      `${source.label} death portrait resolved to ${expression.id}`
    );
  }
});

test("visually reviewed downcast frames retain their corrected labels", () => {
  const reviewed = new Map([
    ["ultimate-portrait-pack-v1-0-herbalist-women-portrait-herbalist-women-portrait", {
      thoughtful: 1,
      sad: 5
    }],
    ["little-girl-portrait-pack-by-captainskeleto-little-girl-portrait", {
      "soft-smile": 1,
      sad: 12
    }],
    ["women-black-hair-portrait-by-captainskolot-women-black-hair-portrait", {
      sad: 9,
      stern: 12
    }],
    ["ultimate-portrait-pack-v1-0-young-peasant-girl-villager-young-girl-portrait", {
      concerned: 1,
      sad: 6
    }],
    ["ultimate-portrait-pack-v1-0-young-peasant-boy-young-peasant-boy-portrait", {
      shy: 1,
      sad: 2
    }]
  ]);

  for (const [sourceId, expected] of reviewed) {
    const source = GENERATED_MANIFEST.sourceCharacters.find((entry) => entry.id === sourceId);
    assert.ok(source, `Missing reviewed portrait source: ${sourceId}`);
    const actual = Object.fromEntries(
      source.expressions
        .filter((expression) => Object.hasOwn(expected, expression.id))
        .map((expression) => [expression.id, expression.index])
    );
    assert.deepEqual(actual, expected, `${source.label} corrected labels`);
  }
});

test("the brown-haired merchant uses a clean birthday expression", () => {
  const merchant = GENERATED_MANIFEST.sourceCharacters.find((source) => (
    source.id === "merchant-portrait-pack-by-captainskolot-portrait-merchant"
  ));
  const expressionIndices = Object.fromEntries(
    merchant.expressions.map((expression) => [expression.id, expression.index])
  );

  assert.equal(characterExpression(merchant, "happy").index, 7);
  assert.deepEqual({
    happy: expressionIndices.happy,
    pained: expressionIndices.pained,
    crying: expressionIndices.crying,
    hurt: expressionIndices.hurt
  }, {
    happy: 7,
    pained: 9,
    crying: 11,
    hurt: 12
  });
});

test("Knight Portrait opens on its calm neutral frame", () => {
  const knight = GENERATED_MANIFEST.sourceCharacters.find((source) => (
    source.sourceDirectory === "Knight Portrait Pack by Captainskeleto"
  ));
  const neutral = knight.expressions.find((expression) => expression.id === "neutral");

  assert.match(neutral.src, /Knight%20Portrait_2\.png$/);
  assert.equal(knight.expressions[0].id, "happy");
});

test("the bloodied mercenary frame is never used as a neutral portrait", () => {
  const mercenary = GENERATED_MANIFEST.sourceCharacters.find((source) => (
    source.id === "curated-historical-portraits-by-captainskolot-mercenary-warrior"
  ));
  const neutral = mercenary.expressions.find((expression) => expression.id === "neutral");

  assert.doesNotMatch(neutral.src, /Mercenary%20Warrior\.png$/);
  assert.match(neutral.src, /Warrior%20with%20Beard_1\.png$/);
});

test("visually reviewed expression packs use calm neutral frames", () => {
  const neutralIndices = new Map([
    ["blacksmith-portrait-pack-by-captainskeleto-blacksmith-portrait", 1],
    ["ultimate-portrait-pack-v1-0-blacksmith-blacksmith-portrait", 2],
    ["blond-villager-portrait-pack-by-captainskeleto-blond-villager-portrait", 6],
    ["blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women", 9],
    ["ultimate-portrait-pack-v1-0-herbalist-women-portrait-herbalist-women-portrait", 3],
    ["ultimate-portrait-pack-v1-0-knight-commander-knight-commander", 3],
    ["knight-portrait-pack-by-captainskeleto-knight-portrait", 2],
    ["little-girl-portrait-pack-by-captainskeleto-little-girl-portrait", 10],
    ["lumberjack-portrait-by-captainskeleto-lumberjack-portrait", 2],
    ["ultimate-portrait-pack-v1-0-man-knight-man-knight-portrait", 4],
    ["ultimate-portrait-pack-v1-0-monk-monk-portrait", 2],
    ["ultimate-portrait-pack-v1-0-noblewomen-noblewomen-portrait", 6],
    ["old-villager-portrait-by-captainskeleto-old-villager-portrait", 7],
    ["old-warrior-grey-beard-by-captainskolot-old-warrior-grey-beard", 3],
    ["peasant-portrait-pack-by-captainskeleto-peasant-portrait", 4],
    ["merchant-portrait-pack-by-captainskolot-portrait-merchant", 1],
    ["ultimate-portrait-pack-v1-0-tavern-keeper-tavern-keeper-portrait", 4],
    ["ultimate-portrait-pack-v1-0-village-elder-villager-elder-portrait", 4],
    ["ultimate-portrait-pack-v1-0-young-peasant-girl-villager-young-girl-portrait", 4],
    ["ultimate-portrait-pack-v1-0-women-baker-women-baker-portrait", 6],
    ["women-knight-portrait-pack-by-captainskeleto-women-knight-portrait", 12],
    ["women-peasant-pack-by-captainskeleto-women-peasant", 9],
    ["ultimate-portrait-pack-v1-0-seamstress-women-portrait-women-seamstress-portrait", 1],
    ["ultimate-portrait-pack-v1-0-young-peasant-boy-young-peasant-boy-portrait", 6],
    ["warrior-with-beard-pack-by-captainskolot-warrior-with-beard", 1],
    ["women-black-hair-portrait-by-captainskolot-women-black-hair-portrait", 2]
  ]);

  for (const [characterId, expectedIndex] of neutralIndices) {
    const source = GENERATED_MANIFEST.sourceCharacters.find((character) => character.id === characterId);
    assert.ok(source, `Missing reviewed portrait source: ${characterId}`);
    assert.equal(
      source.expressions.find((expression) => expression.id === "neutral")?.index,
      expectedIndex,
      `${source.label} neutral frame`
    );
  }
});

test("the blond villager portrait uses its visually reviewed expression frames", () => {
  const source = GENERATED_MANIFEST.sourceCharacters.find(
    (character) => character.id === "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women"
  );
  const expressionIndices = Object.fromEntries(
    source.expressions.map((expression) => [expression.id, expression.index])
  );

  assert.deepEqual(expressionIndices, {
    happy: 1,
    sad: 2,
    wary: 3,
    "soft-smile": 4,
    worried: 5,
    overjoyed: 6,
    attentive: 7,
    embarrassed: 8,
    neutral: 9,
    pleased: 10,
    angry: 11,
    surprised: 12
  });
  assert.equal(characterExpression(source, "sad").index, 2);
  assert.equal(characterExpression(source, "afraid").index, 5);
  assert.equal(characterExpression(source, "happy").index, 1);
  assert.equal(characterExpression(source, "overjoyed").index, 6);
});

test("the blond straw-hat peasant uses its visually reviewed expression frames", () => {
  const source = GENERATED_MANIFEST.sourceCharacters.find(
    (character) => character.id === "women-peasant-pack-by-captainskeleto-women-peasant"
  );
  const expressionIndices = Object.fromEntries(
    source.expressions.map((expression) => [expression.id, expression.index])
  );

  assert.deepEqual(expressionIndices, {
    happy: 1,
    sad: 2,
    serious: 3,
    overjoyed: 4,
    worried: 5,
    "soft-smile": 6,
    laughing: 7,
    crying: 8,
    neutral: 9,
    pleased: 10,
    angry: 11,
    embarrassed: 12
  });
  assert.equal(characterExpression(source).index, 9);
  assert.equal(characterExpression(source, "sad").index, 2);
  assert.equal(characterExpression(source, "crying").index, 8);
  assert.equal(characterExpression(source, "afraid").index, 5);
  assert.equal(characterExpression(source, "happy").index, 1);
  assert.equal(characterExpression(source, "overjoyed").index, 4);
});

test("women portrait grid entries are individual people, not expression sets", () => {
  const womenPortraits = GENERATED_MANIFEST.sourceCharacters.filter((source) => (
    source.sourceDirectory === "Women Portrait Pack by Captainskeleto/Women Portrait"
  ));

  assert.equal(womenPortraits.length, 30);
  assert.ok(womenPortraits.every((source) => source.groupingMode === "single-portrait"));
  assert.ok(womenPortraits.every((source) => source.expressions.length === 1));
});

test("portrait expression packs produce one individual with many expressions", () => {
  const villagers = GENERATED_MANIFEST.sourceCharacters.filter((source) => (
    source.sourceDirectory === "Blond Villager Portrait Pack by Captainskeleto"
  ));

  assert.equal(villagers.length, 1);
  assert.equal(villagers[0].groupingMode, "expression-set");
  assert.equal(villagers[0].expressions.length, 12);
  assert.deepEqual(villagers[0].expressions.slice(0, 4).map((expression) => expression.id), [
    "concerned",
    "wary",
    "surprised",
    "afraid"
  ]);
  assert.equal(villagers[0].expressions.find((expression) => expression.id === "neutral").index, 6);
});

test("player generation is deterministic for an identity key", () => {
  const homePort = {
    tileId: 11,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 38.72,
    lon: -9.14
  };
  const generate = () => generatePlayerCharacter({
    identityKey: "persistent-player-seed",
    homePort,
    manifest: GENERATED_MANIFEST,
    usedNames: new Set()
  });

  assert.deepEqual(generate(), generate());
});

test("campaign contacts are distinct people from the home port factor", () => {
  const homePort = {
    tileId: 11,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 38.72,
    lon: -9.14
  };
  const usedNames = new Set(["Ines Pereira"]);
  const [factor] = assignPortCityCharacters([homePort], GENERATED_MANIFEST, usedNames).values();
  const playerCharacter = { id: "captain-lisbon", name: "Ines Pereira" };
  const patron = generateCampaignContactCharacter({
    playerCharacter,
    homePort,
    goalType: "explorer",
    excludedSourceId: factor.sourceId,
    manifest: GENERATED_MANIFEST,
    usedNames
  });
  const creditor = generateCampaignContactCharacter({
    playerCharacter,
    homePort,
    goalType: "family-debt",
    excludedSourceId: factor.sourceId,
    manifest: GENERATED_MANIFEST,
    usedNames
  });

  assert.equal(patron.role, "patron");
  assert.notEqual(patron.sourceId, factor.sourceId);
  assert.notEqual(patron.name, factor.name);
  assert.equal(patron.homePortTileId, homePort.tileId);
  assert.equal(creditor.role, "creditor");
  assert.notEqual(creditor.sourceId, factor.sourceId);
  assert.notEqual(creditor.name, factor.name);

  const repeatedPatron = generateCampaignContactCharacter({
    playerCharacter,
    homePort,
    goalType: "explorer",
    excludedSourceId: factor.sourceId,
    manifest: GENERATED_MANIFEST,
    usedNames
  });
  assert.deepEqual(repeatedPatron, patron);
});

test("the treasure campaign contact is an old warrior rather than a young factor", () => {
  const homePort = {
    tileId: 11,
    cityId: "lisbon|portugal",
    city: "Lisbon",
    displayCity: "Lisbon",
    country: "Portugal",
    cityType: "mediterranean",
    lat: 38.72,
    lon: -9.14
  };
  const usedNames = new Set(["Ines Pereira"]);
  const [factor] = assignPortCityCharacters([homePort], GENERATED_MANIFEST, usedNames).values();
  const buccaneer = generateCampaignContactCharacter({
    playerCharacter: { id: "captain-lisbon", name: "Ines Pereira" },
    homePort,
    goalType: "pirate-treasure",
    excludedSourceId: factor.sourceId,
    manifest: GENERATED_MANIFEST,
    usedNames
  });

  assert.equal(buccaneer.role, "old-buccaneer");
  assert.ok(buccaneer.age >= 45);
  assert.ok(buccaneer.sourceRoles.includes("captain"));
  assert.ok(buccaneer.sourceRoles.includes("warrior"));
  assert.equal(buccaneer.sourceLabel, "Old Warrior Grey Beard");
  assert.notEqual(buccaneer.sourceId, factor.sourceId);
});

test("Ternate and Tidore factors and patrons keep their own locatives", () => {
  for (const [index, cityName, factionId, rivalLocative] of [
    [0, "Ternate", "ternate", "Tidore"],
    [1, "Tidore", "tidore", "Ternate"]
  ]) {
    const homePort = {
      cityId: `${cityName.toLowerCase()}|indonesia`,
      tileId: 1200 + index,
      city: cityName,
      displayCity: cityName,
      country: "Indonesia",
      factionId,
      cityType: "southeast-asian",
      lat: 0.8,
      lon: 127.4 + index * 0.1
    };
    const usedNames = new Set([`Zainal Abidin ${cityName}`]);
    const [factor] = assignPortCityCharacters([homePort], GENERATED_MANIFEST, usedNames).values();
    const patron = generateCampaignContactCharacter({
      playerCharacter: { id: `captain-${factionId}`, name: `Zainal Abidin ${cityName}` },
      homePort,
      goalType: "explorer",
      excludedSourceId: factor.sourceId,
      manifest: GENERATED_MANIFEST,
      usedNames
    });

    assert.equal(factor.familyName, cityName);
    assert.equal(patron.familyName, cityName);
    assert.notEqual(factor.familyName, rivalLocative);
    assert.notEqual(patron.familyName, rivalLocative);
    assert.notEqual(patron.name, factor.name);
  }
});

test("return-home passenger generation can use destination culture", () => {
  const passenger = generatePassengerCharacter({
    identityKey: "passenger-lisbon-nagasaki",
    originPort: {
      tileId: 1,
      cityId: "lisbon|portugal",
      city: "Lisbon",
      displayCity: "Lisbon",
      country: "Portugal",
      cityType: "mediterranean",
      lat: 38.72,
      lon: -9.14
    },
    destinationPort: {
      tileId: 2,
      cityId: "nagasaki|japan",
      city: "Nagasaki",
      displayCity: "Nagasaki",
      country: "Japan",
      cityType: "east-asian",
      lat: 32.75,
      lon: 129.88
    },
    scenarioId: "return-home",
    namePortPreference: "destination",
    manifest: GENERATED_MANIFEST,
    usedNames: new Set()
  });

  assert.equal(passenger.role, "passenger");
  assert.equal(passenger.destinationPortTileId, 2);
  assert.equal(passenger.nameCulture, "japanese");
  assert.equal(passenger.region, "japan");
  assert.deepEqual(passenger.sourceRegions, ["japan"]);
  assert.ok(isJapanesePortraitSourceId(passenger.sourceId));
  assert.equal("palette" in passenger, false);
});

test("Hajj passenger generation preserves the origin community's Islamic religion", () => {
  const passenger = generatePassengerCharacter({
    identityKey: "hajj-aceh-jeddah",
    originPort: {
      tileId: 13,
      cityId: "aceh|indonesia",
      city: "Aceh",
      displayCity: "Aceh",
      country: "Indonesia",
      cityType: "southeast-asian",
      factionId: "neutral"
    },
    destinationPort: {
      tileId: 14,
      cityId: "jeddah|saudi arabia",
      city: "Jeddah",
      displayCity: "Jeddah",
      country: "Saudi Arabia",
      cityType: "islamic-desert",
      factionId: "ottoman"
    },
    scenarioId: "hajj",
    namePortPreference: "origin",
    religionId: "sunni-islam",
    manifest: GENERATED_MANIFEST,
    usedNames: new Set()
  });

  assert.equal(passenger.religionId, "sunni-islam");
  assert.equal(passenger.nameCulture, "malay");
  assert.equal(passenger.originPortTileId, 13);
  assert.equal(passenger.destinationPortTileId, 14);

  const southAsianPilgrim = generatePassengerCharacter({
    identityKey: "hajj-goa-jeddah",
    originPort: {
      tileId: 3,
      cityId: "goa|india",
      city: "Goa",
      displayCity: "Goa",
      country: "India",
      cityType: "south-asian",
      factionId: "portugal"
    },
    destinationPort: {
      tileId: 14,
      cityId: "jeddah|saudi arabia",
      city: "Jeddah",
      displayCity: "Jeddah",
      country: "Saudi Arabia",
      cityType: "islamic-desert",
      factionId: "ottoman"
    },
    scenarioId: "hajj",
    namePortPreference: "origin",
    religionId: "sunni-islam",
    manifest: GENERATED_MANIFEST,
    usedNames: new Set()
  });
  assert.equal(southAsianPilgrim.religionId, "sunni-islam");
  assert.equal(southAsianPilgrim.nameCulture, "indoMuslim");
});

test("pirate captives use expressive portraits and reunite with the same family name", () => {
  const homePort = {
    tileId: 8,
    cityId: "porto|portugal",
    city: "Porto",
    displayCity: "Porto",
    country: "Portugal",
    factionId: "portugal",
    cityType: "mediterranean",
    lat: 41.15,
    lon: -8.61
  };
  const usedNames = new Set();
  const captive = generatePirateCaptiveCharacter({
    identityKey: "pirate-19",
    homePort,
    manifest: GENERATED_MANIFEST,
    usedNames
  });
  const familyMember = generatePirateCaptiveFamilyMember({
    identityKey: "pirate-19",
    captive,
    homePort,
    manifest: GENERATED_MANIFEST,
    usedNames
  });

  assert.ok(captive.expressions.length > 1);
  assert.equal(captive.religionId, "roman-catholic");
  assert.notEqual(characterExpression(captive, "crying").id, characterExpression(captive, "overjoyed").id);
  assert.equal(familyMember.familyName, captive.familyName);
  assert.notEqual(familyMember.name, captive.name);
  assert.notEqual(familyMember.sourceId, captive.sourceId);

  const replacementCaptive = generatePirateCaptiveCharacter({
    identityKey: "pirate-19",
    homePort,
    excludedSourceIds: [captive.sourceId],
    manifest: GENERATED_MANIFEST,
    usedNames
  });
  assert.notEqual(replacementCaptive.id, captive.id);
  assert.notEqual(replacementCaptive.sourceId, captive.sourceId);
  assert.notEqual(replacementCaptive.name, captive.name);

  const castaway = generateCastawayCharacter({
    identityKey: "shore-91",
    homePort,
    manifest: GENERATED_MANIFEST,
    usedNames
  });
  const castawayFamily = generateCastawayFamilyMember({
    identityKey: "shore-91",
    castaway,
    homePort,
    manifest: GENERATED_MANIFEST,
    usedNames
  });
  assert.equal(castaway.role, "castaway");
  assert.equal(castaway.religionId, "roman-catholic");
  assert.notEqual(characterExpression(castaway, "crying").id, characterExpression(castaway, "overjoyed").id);
  assert.equal(castawayFamily.familyName, castaway.familyName);
  assert.notEqual(castawayFamily.sourceId, castaway.sourceId);
});

test("port assignments use their authored culture-group portrait pools", () => {
  const usedNames = new Set();
  const assignments = assignPortCityCharacters([
    { cityId: "tenochtitlan|mexico", tileId: 1, city: "Tenochtitlan", country: "Mexico", cityType: "meso-american", lat: 19.4, lon: -99.1 },
    { cityId: "kilwa|tanzania", tileId: 2, city: "Kilwa", country: "Tanzania", cityType: "sub-saharan", lat: -8.9, lon: 39.5 },
    { cityId: "fiji village|fiji", tileId: 3, city: "Fiji Village", country: "Fiji", cityType: "polynesian", lat: -18.1, lon: 178.4 },
    { cityId: "beijing|china", tileId: 4, city: "Beijing", country: "China", cityType: "east-asian", lat: 39.9, lon: 116.4 },
    { cityId: "vijayanagar|india", tileId: 5, city: "Vijayanagar", country: "India", cityType: "south-asian", lat: 15.3, lon: 76.5 },
    { cityId: "malacca|malaysia", tileId: 6, city: "Malacca", country: "Malaysia", cityType: "southeast-asian", lat: 2.2, lon: 102.3 },
    { cityId: "alexandria|egypt", tileId: 7, city: "Alexandria", country: "Egypt", cityType: "islamic-desert", lat: 31.2, lon: 29.9 }
  ], GENERATED_MANIFEST, usedNames);

  const american = assignments.get("tenochtitlan|mexico");
  assert.ok(american.sourceRegions.includes("americas"));
  assert.equal(american.nameCulture, "nahua");
  assert.ok(american.name.includes(" "));
  assert.ok(PORT_PERSONALITY_IDS.includes(american.personalityId));
  const african = assignments.get("kilwa|tanzania");
  assert.ok(african.sourceId.startsWith("sub-saharan-african-portrait-pack-by-openai-"));
  assert.equal(african.nameCulture, "swahili");
  assert.ok(PORT_PERSONALITY_IDS.includes(african.personalityId));
  const polynesian = assignments.get("fiji village|fiji");
  assert.equal(polynesian.region, "polynesia");
  assert.ok(polynesian.sourceId.startsWith("polynesian-portrait-pack-by-openai-"));
  assert.equal(polynesian.nameCulture, "polynesian");
  const eastAsian = assignments.get("beijing|china");
  assert.ok(eastAsian.sourceRegions.includes("east-asia"));
  assert.equal(eastAsian.nameCulture, "chinese");
  assert.ok(assignments.get("vijayanagar|india").sourceId.startsWith("south-asian-portrait-pack-by-openai-"));
  assert.ok(assignments.get("malacca|malaysia").sourceId.startsWith("southeast-asian-portrait-pack-by-openai-"));
  assert.ok(assignments.get("alexandria|egypt").sourceId.startsWith("indian-ocean-portrait-pack-by-openai-"));
  assert.equal(usedNames.size, 7);
});

test("a fixed port source keeps the Viking helmet portrait and an Icelandic name", () => {
  const city = {
    tileId: 64,
    cityId: "hafnarfjordur|iceland",
    city: "Hafnarfjordur",
    country: "Iceland",
    cityType: "northern-european",
    lat: 64.0671,
    lon: -21.9547
  };
  const sourceId = "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-9";
  const character = assignPortCityCharacterFromSource(city, sourceId, GENERATED_MANIFEST, new Set());

  assert.equal(character.sourceId, sourceId);
  assert.equal(character.region, "northern-europe");
  assert.equal(character.nameCulture, "icelandic");
  assert.equal(character.role, "factor");
});

test("ship captains use pirate portraits only for pirate crews", () => {
  const ships = Array.from({ length: 40 }, (_, index) => ({
    id: `americas-${index}`,
    slug: "caravel",
    role: index < 10 ? "pirate" : index < 20 ? "warship" : "merchant",
    profileId: "atlantic-coast",
    currentPort: {
      routeRegion: "americas",
      cityId: "mexico city|mexico",
      city: "Mexico City",
      country: "Mexico",
      cityType: "mesoamerican",
      lat: 19.4,
      lon: -99.1
    }
  }));
  const usedNames = new Set();
  const captains = assignNpcShipCaptains(ships, GENERATED_MANIFEST, usedNames);
  const values = [...captains.values()];
  const pirates = values.filter((captain) => captain.sourceRoles.includes("pirate")).length;
  const regional = values.filter((captain) => captain.sourceRegions.includes("americas")).length;
  assert.equal(pirates, 10);
  assert.equal(regional, 30);
  assert.equal(new Set(values.map((captain) => captain.name)).size, values.length);
  assert.ok(values.every((captain) => captain.nameCulture === "nahua"));
});

test("coordinate-only encounters resolve captain culture through a canonical home city", () => {
  const homeCity = {
    cityId: "mexico city|mexico",
    city: "Mexico City",
    country: "Mexico",
    cityType: "mesoamerican",
    factionId: "spain",
    lat: 19.4,
    lon: -99.1
  };
  const ship = {
    id: "coordinate-only-encounter",
    captainHomeCityId: homeCity.cityId,
    factionId: "spain",
    slug: "caravel",
    role: "warship",
    profileId: "wide-world",
    currentPort: {
      id: "capture:coordinate-only-encounter",
      cityType: "mesoamerican",
      routeRegion: "americas",
      lat: 20,
      lon: -98
    }
  };

  const captains = assignNpcShipCaptains(
    [ship],
    GENERATED_MANIFEST,
    new Set(),
    { homeCitiesById: new Map([[homeCity.cityId, homeCity]]) }
  );
  assert.equal(captains.get(ship.id).nameCulture, "nahua");
});

test("legacy coordinate-only encounters require an explicit canonical captain home repair", () => {
  const routed = {
    id: "ordinary-route",
    currentPort: { cityId: "lisbon|portugal" }
  };
  const knownLegacy = {
    id: "known-point-encounter",
    currentPort: { id: "point:known", lat: 1, lon: 2 }
  };
  let resolverCalls = 0;
  assert.equal(repairLegacyNpcCaptainHomeCityIds(
    [routed, knownLegacy],
    (ship) => {
      resolverCalls++;
      assert.equal(ship.id, knownLegacy.id);
      return "algiers|algeria";
    }
  ), 2);
  assert.equal(resolverCalls, 1);
  assert.equal(routed.captainHomeCityId, "lisbon|portugal");
  assert.equal(knownLegacy.captainHomeCityId, "algiers|algeria");

  assert.throws(
    () => repairLegacyNpcCaptainHomeCityIds(
      [{ id: "unknown-point", currentPort: { id: "point:unknown", lat: 3, lon: 4 } }],
      () => null
    ),
    /Legacy NPC ship unknown-point captain home requires a canonical id/
  );
});

test("missing NPC captain assignments are reconciled without replacing existing captains", () => {
  const ships = Array.from({ length: 3 }, (_, index) => ({
    id: `indian-ocean-${index}`,
    slug: "dhow",
    role: "merchant",
    profileId: "indian-ocean",
    currentPort: {
      routeRegion: "indian-ocean",
      cityId: "cambay|india",
      city: "Cambay",
      country: "India",
      cityType: "islamic-desert",
      lat: 22.3,
      lon: 72.6
    }
  }));
  const usedNames = new Set();
  const assignments = assignNpcShipCaptains(ships.slice(0, 2), GENERATED_MANIFEST, usedNames);
  const firstCaptain = assignments.get("indian-ocean-0");

  const additions = assignMissingNpcShipCaptains(
    ships,
    assignments,
    GENERATED_MANIFEST,
    usedNames
  );

  assert.deepEqual([...additions.keys()], ["indian-ocean-2"]);
  assert.equal(assignments.get("indian-ocean-0"), firstCaptain);
  assert.equal(assignments.get("indian-ocean-2").npcShipId, "indian-ocean-2");
  assert.equal(new Set([...assignments.values()].map((captain) => captain.name)).size, 3);
  assert.throws(
    () => assignMissingNpcShipCaptains(ships, {}, GENERATED_MANIFEST, usedNames),
    /assignment Map/
  );
});

test("a reserved player portrait source is never reused by NPC generators", () => {
  const reservedSourceId = "knight-portrait-pack-by-captainskeleto-knight-portrait";
  const exclusions = { excludedSourceIds: [reservedSourceId] };
  const ports = Array.from({ length: 70 }, (_, index) => ({
    cityId: `mediterranean-port-${index}|spain`,
    tileId: 1000 + index,
    city: `Mediterranean Port ${index}`,
    displayCity: `Mediterranean Port ${index}`,
    country: "Spain",
    cityType: "mediterranean",
    factionId: "spain",
    lat: 36,
    lon: -6
  }));
  const factors = assignPortCityCharacters(ports, GENERATED_MANIFEST, new Set(), exclusions);
  assert.ok([...factors.values()].every((character) => character.sourceId !== reservedSourceId));

  const ships = Array.from({ length: 20 }, (_, index) => ({
    id: `mediterranean-reservation-${index}`,
    slug: "caravel",
    role: "merchant",
    profileId: "mediterranean",
    currentPort: {
      routeRegion: "europe",
      cityId: "cadiz|spain",
      city: "Cadiz",
      country: "Spain",
      cityType: "mediterranean",
      factionId: "spain",
      lat: 36.53,
      lon: -6.29
    }
  }));
  const captains = assignNpcShipCaptains(ships, GENERATED_MANIFEST, new Set(), exclusions);
  assert.ok([...captains.values()].every((character) => character.sourceId !== reservedSourceId));

  for (let index = 0; index < 100; index++) {
    const passenger = generatePassengerCharacter({
      identityKey: `reserved-passenger-${index}`,
      originPort: ports[0],
      destinationPort: ports[1],
      excludedSourceIds: [reservedSourceId],
      manifest: GENERATED_MANIFEST,
      usedNames: new Set()
    });
    assert.notEqual(passenger.sourceId, reservedSourceId);
  }

  assert.throws(
    () => assignPortCityCharacterFromSource(
      ports[0],
      reservedSourceId,
      GENERATED_MANIFEST,
      new Set(),
      exclusions
    ),
    /portrait source is reserved/
  );
});

function opaqueComponentCount(pixels, width, height) {
  const seen = new Uint8Array(width * height);
  let count = 0;
  for (let start = 0; start < width * height; start += 1) {
    if (seen[start] || pixels[start * 4 + 3] === 0) continue;
    count += 1;
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const pixel = stack.pop();
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (seen[next] || pixels[next * 4 + 3] === 0) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
  }
  return count;
}

function isJapanesePortraitSourceId(sourceId) {
  return sourceId.startsWith("japanese-portrait-pack-by-openai-")
    || sourceId.startsWith("sengoku-samurai-portrait-pack-by-retro-diffusion-");
}

function assertExactQuantizedPortrait(actual, source, label) {
  assert.equal(actual.length, source.length, `${label} pixel count`);
  for (let offset = 0; offset < source.length; offset += 4) {
    const sourceIsOpaque = source[offset + 3] >= 128;
    assert.equal(actual[offset + 3], sourceIsOpaque ? 255 : 0, `${label} alpha at pixel ${offset / 4}`);
    if (!sourceIsOpaque) continue;
    const expectedHex = nearestResurrect64Hex(source[offset], source[offset + 1], source[offset + 2]);
    const actualHex = [actual[offset], actual[offset + 1], actual[offset + 2]]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("");
    assert.equal(actualHex, expectedHex, `${label} color at pixel ${offset / 4}`);
  }
}
