import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PORT_PERSONALITY_IDS } from "./portDialoguePersonality.js";

import {
  PORTRAIT_ROLE_ACCENT,
  PORTRAIT_ROLE_CLOTH,
  PORTRAIT_ROLE_HAIR,
  PORTRAIT_ROLE_SKIN,
  applyPortraitPaletteSwap,
  assignNpcShipCaptains,
  assignPortCityCharacters,
  characterExpression,
  classifyPortraitRoles,
  decodePortraitRoleMap,
  encodePortraitRoleMap,
  generatePassengerCharacter,
  generatePlayerCharacter,
  playerCharacterPortraitSummary
} from "./characterPortraits.js";

const GENERATED_MANIFEST = JSON.parse(readFileSync(
  new URL("../public/assets/characters/generated/character-portraits.json", import.meta.url),
  "utf8"
));

const TEST_PALETTE = Object.freeze({
  skinRamp: ["#301818", "#a85d48", "#f0b08a"],
  hairRamp: ["#101114", "#3a3028", "#8a6848"],
  clothRamp: ["#14233d", "#2f6090", "#78a8c8"],
  accentRamp: ["#24401f", "#56854a", "#a3c276"]
});

test("packed portrait role maps round-trip exactly", () => {
  const roles = Uint8Array.from([0, 1, 2, 3, 4, 0, 4, 2, 1]);
  const encoded = encodePortraitRoleMap(roles);
  assert.deepEqual(decodePortraitRoleMap(encoded, roles.length), roles);
});

test("identical source colors can be swapped independently by semantic role", () => {
  const data = new Uint8ClampedArray(4 * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data.set([190, 130, 90, 255], offset);
  }
  const roleMap = encodePortraitRoleMap(Uint8Array.from([
    PORTRAIT_ROLE_SKIN,
    PORTRAIT_ROLE_HAIR,
    PORTRAIT_ROLE_CLOTH,
    PORTRAIT_ROLE_ACCENT
  ]));

  applyPortraitPaletteSwap(data, 2, 2, TEST_PALETTE, roleMap);

  const colors = Array.from({ length: 4 }, (_, index) => (
    [...data.slice(index * 4, index * 4 + 3)].join(",")
  ));
  assert.equal(new Set(colors).size, 4);
  assert.ok(data[0] > data[2], "skin remains warm");
  assert.ok(data[10] > data[8], "clothing maps to blue");
  assert.ok(data[13] > data[12], "accent maps to green");
});

test("portrait analysis separates a face, nearby hair, and torso colors", () => {
  const width = 16;
  const height = 16;
  const data = new Uint8ClampedArray(width * height * 4);
  fillRect(data, width, 6, 5, 4, 4, [210, 150, 115, 255]);
  fillRect(data, width, 5, 2, 6, 3, [45, 38, 50, 255]);
  fillRect(data, width, 5, 5, 1, 4, [45, 38, 50, 255]);
  fillRect(data, width, 10, 5, 1, 4, [45, 38, 50, 255]);
  fillRect(data, width, 3, 9, 10, 7, [35, 75, 125, 255]);
  fillRect(data, width, 7, 10, 2, 6, [190, 145, 45, 255]);

  const roles = classifyPortraitRoles(data, width, height);

  assert.equal(roles[7 + 6 * width], PORTRAIT_ROLE_SKIN);
  assert.equal(roles[7 + 3 * width], PORTRAIT_ROLE_HAIR);
  assert.ok([
    PORTRAIT_ROLE_CLOTH,
    PORTRAIT_ROLE_ACCENT
  ].includes(roles[4 + 12 * width]));
  assert.ok([
    PORTRAIT_ROLE_CLOTH,
    PORTRAIT_ROLE_ACCENT
  ].includes(roles[7 + 12 * width]));
  assert.notEqual(roles[4 + 12 * width], roles[7 + 12 * width]);
});

test("portrait analysis treats a hat matching the outfit as clothing, not hair", () => {
  const width = 24;
  const height = 24;
  const data = new Uint8ClampedArray(width * height * 4);
  fillRect(data, width, 9, 7, 6, 7, [210, 150, 115, 255]);
  fillRect(data, width, 8, 6, 1, 7, [70, 42, 28, 255]);
  fillRect(data, width, 15, 6, 1, 7, [70, 42, 28, 255]);
  fillRect(data, width, 8, 5, 8, 2, [70, 42, 28, 255]);
  fillRect(data, width, 6, 2, 12, 3, [40, 90, 150, 255]);
  fillRect(data, width, 5, 5, 14, 1, [40, 90, 150, 255]);
  fillRect(data, width, 5, 15, 14, 9, [40, 90, 150, 255]);
  fillRect(data, width, 10, 15, 4, 9, [190, 145, 45, 255]);

  const roles = classifyPortraitRoles(data, width, height);

  assert.equal(roles[11 + 3 * width], PORTRAIT_ROLE_CLOTH);
  assert.equal(roles[8 + 9 * width], PORTRAIT_ROLE_HAIR);
  assert.equal(roles[11 + 10 * width], PORTRAIT_ROLE_SKIN);
});

test("skin-colored torso fabric is not mistaken for a second face", () => {
  const width = 24;
  const height = 24;
  const data = new Uint8ClampedArray(width * height * 4);
  fillRect(data, width, 9, 7, 6, 7, [210, 150, 115, 255]);
  fillRect(data, width, 5, 15, 14, 9, [198, 142, 108, 255]);

  const roles = classifyPortraitRoles(data, width, height);

  assert.equal(roles[11 + 10 * width], PORTRAIT_ROLE_SKIN);
  assert.equal(roles[11 + 18 * width], PORTRAIT_ROLE_CLOTH);
});

test("player portrait pool contains only multi-expression captain sources", () => {
  assert.deepEqual(playerCharacterPortraitSummary(GENERATED_MANIFEST), {
    total: 156,
    multipleExpressions: 23,
    eligibleCaptains: 5
  });

  const usedNames = new Set();
  const homePort = {
    tileId: 7,
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
  assert.ok(character.sourceRoles.includes("captain"));
  assert.equal(character.id, character.sourceId);
  assert.equal(character.paletteSwapped, false);
  assert.equal(character.palette, null);
  assert.equal(character.skinToneId, null);
  assert.equal(character.hairToneId, null);
  assert.equal(character.outfitId, null);
  assert.ok(character.expressions.length > 1);
  assert.ok(character.expressions.every((expression) => expression.src.startsWith("/assets/characters/")));
});

test("character expressions change frames without changing character identity", () => {
  const character = {
    id: "captain-a",
    expressions: [
      { id: "neutral", src: "/assets/characters/captain-a-neutral.png" },
      { id: "sad", src: "/assets/characters/captain-a-sad.png" }
    ]
  };

  assert.equal(characterExpression(character, "sad").id, "sad");
  assert.equal(character.id, "captain-a");
});

test("unknown character expressions fall back to neutral", () => {
  const character = {
    id: "captain-b",
    expressions: [
      { id: "neutral", src: "/assets/characters/captain-b-neutral.png" },
      { id: "expression-02", src: "/assets/characters/captain-b-expression-02.png" }
    ]
  };

  assert.equal(characterExpression(character, "sad").id, "neutral");
});

test("requested moods can use a nearby semantic expression", () => {
  const character = {
    id: "captain-c",
    expressions: [
      { id: "neutral", src: "/assets/characters/captain-c-neutral.png" },
      { id: "concerned", src: "/assets/characters/captain-c-concerned.png" },
      { id: "soft-smile", src: "/assets/characters/captain-c-soft-smile.png" }
    ]
  };

  assert.equal(characterExpression(character, "sad").id, "concerned");
  assert.equal(characterExpression(character, "happy").id, "soft-smile");
});

test("port dialogue moods use the closest expression on the same character", () => {
  const character = {
    id: "factor-a",
    expressions: [
      { id: "neutral", src: "/assets/characters/factor-a-neutral.png" },
      { id: "serious", src: "/assets/characters/factor-a-serious.png" },
      { id: "soft-smile", src: "/assets/characters/factor-a-soft-smile.png" },
      { id: "worried", src: "/assets/characters/factor-a-worried.png" }
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
    "neutral",
    "happy",
    "concerned",
    "afraid"
  ]);
});

test("player generation is deterministic for an identity key", () => {
  const homePort = {
    tileId: 11,
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

test("return-home passenger generation can use destination culture", () => {
  const passenger = generatePassengerCharacter({
    identityKey: "passenger-lisbon-nagasaki",
    originPort: {
      tileId: 1,
      city: "Lisbon",
      displayCity: "Lisbon",
      country: "Portugal",
      cityType: "mediterranean",
      lat: 38.72,
      lon: -9.14
    },
    destinationPort: {
      tileId: 2,
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
  assert.equal(passenger.region, "east-asia");
  assert.equal(passenger.paletteSwapped, true);
  assert.ok(passenger.palette);
  assert.ok(["fair", "golden", "olive", "tan"].includes(passenger.skinToneId));
});

test("port assignments use regional portrait and tone pools", () => {
  const usedNames = new Set();
  const assignments = assignPortCityCharacters([
    { tileId: 1, city: "Tenochtitlan", country: "Mexico", cityType: "meso-american", lat: 19.4, lon: -99.1 },
    { tileId: 2, city: "Kilwa", country: "Tanzania", cityType: "sub-saharan", lat: -8.9, lon: 39.5 }
  ], GENERATED_MANIFEST, usedNames);

  const american = assignments.get(1);
  assert.ok(american.sourceRegions.includes("americas"));
  assert.ok(["golden", "olive", "tan", "brown"].includes(american.skinToneId));
  assert.equal(american.nameCulture, "nahua");
  assert.ok(american.name.includes(" "));
  assert.ok(PORT_PERSONALITY_IDS.includes(american.personalityId));
  const african = assignments.get(2);
  assert.ok(["tan", "brown", "deep-brown", "ebony"].includes(african.skinToneId));
  assert.ok(["black", "dark-brown"].includes(african.hairToneId));
  assert.equal(african.nameCulture, "eastAfrican");
  assert.ok(PORT_PERSONALITY_IDS.includes(african.personalityId));
  assert.equal(usedNames.size, 2);
});

test("ship captains use pirate portraits only for pirate crews", () => {
  const ships = Array.from({ length: 40 }, (_, index) => ({
    id: `americas-${index}`,
    slug: "caravel",
    role: index < 10 ? "pirate" : index < 20 ? "warship" : "merchant",
    profileId: "atlantic-coast",
    currentPort: {
      routeRegion: "americas",
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

function fillRect(data, width, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      data.set(color, (xx + yy * width) * 4);
    }
  }
}
