import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  NAVAL_WEAPON_ARROW,
  NAVAL_WEAPON_CANNON,
  isPreGunpowderCulture,
  navalWeaponForShip,
  navalWeaponSpec
} from "./navalWeapons.js";

test("pre-gunpowder cultures use arrows even when their stand-in hull has cannon stats", () => {
  for (const cultureType of ["polynesian", "mesoamerican", "andean"]) {
    assert.equal(isPreGunpowderCulture(cultureType), true);
    assert.equal(navalWeaponForShip({ cultureType, cannons: 12 }).kind, NAVAL_WEAPON_ARROW);
  }
  assert.equal(navalWeaponForShip({ cultureType: "southeast-asian", cannons: 12 }).kind, NAVAL_WEAPON_CANNON);
});

test("arrows have exactly half cannon range and damage", () => {
  const cannon = navalWeaponSpec(NAVAL_WEAPON_CANNON);
  const arrow = navalWeaponSpec(NAVAL_WEAPON_ARROW);

  assert.equal(arrow.rangeScale, cannon.rangeScale / 2);
  assert.equal(arrow.damage, cannon.damage / 2);
});

test("unarmed gunpowder-culture ships still have no ranged attack", () => {
  assert.equal(navalWeaponForShip({ cultureType: "northern-european", cannons: 0 }), null);
});

test("bow fire and arrow hit sounds are packaged as repo-local Ogg assets", async () => {
  for (const name of ["bow-fire.ogg", "arrow-hit.ogg"]) {
    const bytes = await readFile(new URL(`../public/assets/sfx/${name}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "OggS");
    assert.ok(bytes.length > 1000);
  }
});
