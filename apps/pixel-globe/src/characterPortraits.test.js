import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PORTRAIT_ROLE_ACCENT,
  PORTRAIT_ROLE_CLOTH,
  PORTRAIT_ROLE_HAIR,
  PORTRAIT_ROLE_SKIN,
  applyPortraitPaletteSwap,
  assignNpcShipCaptains,
  assignPortCityCharacters,
  classifyPortraitRoles,
  decodePortraitRoleMap,
  encodePortraitRoleMap
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

test("port assignments use regional portrait and tone pools", () => {
  const assignments = assignPortCityCharacters([
    { tileId: 1, city: "Tenochtitlan", country: "Mexico", cityType: "meso-american", lat: 19.4, lon: -99.1 },
    { tileId: 2, city: "Kilwa", country: "Tanzania", cityType: "sub-saharan", lat: -8.9, lon: 39.5 }
  ], GENERATED_MANIFEST);

  const american = assignments.get(1);
  assert.ok(american.sourceRegions.includes("americas"));
  assert.ok(["golden", "olive", "tan", "brown"].includes(american.skinToneId));
  const african = assignments.get(2);
  assert.ok(["tan", "brown", "deep-brown", "ebony"].includes(african.skinToneId));
  assert.ok(["black", "dark-brown"].includes(african.hairToneId));
});

test("ship captains mostly use pirate portraits with regional alternatives", () => {
  const ships = Array.from({ length: 40 }, (_, index) => ({
    id: `americas-${index}`,
    slug: "caravel",
    profileId: "atlantic-coast",
    currentPort: { routeRegion: "americas" }
  }));
  const captains = assignNpcShipCaptains(ships, GENERATED_MANIFEST);
  const values = [...captains.values()];
  const pirates = values.filter((captain) => captain.sourceRoles.includes("pirate")).length;
  const regional = values.filter((captain) => captain.sourceRegions.includes("americas")).length;
  assert.ok(pirates >= 26, `expected mostly pirates, got ${pirates}/40`);
  assert.ok(regional > 0, "expected some regionally tagged captains");
});

function fillRect(data, width, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      data.set(color, (xx + yy * width) * 4);
    }
  }
}
