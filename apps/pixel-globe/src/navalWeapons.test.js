import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  NAVAL_WEAPON_ARROW,
  NAVAL_WEAPON_CANNON,
  advanceCannonReload,
  cannonReloadWorkRate,
  isPreGunpowderCulture,
  navalArrowVolleyCount,
  navalWeaponForShip,
  navalWeaponFiresAtWill,
  navalWeaponUsesBroadside,
  navalWeaponSpec
} from "./navalWeapons.js";

test("cannon reload work scales with active crew per installed gun", () => {
  assert.equal(cannonReloadWorkRate(10, 10), 1);
  assert.equal(cannonReloadWorkRate(20, 10), 1);
  assert.equal(cannonReloadWorkRate(5, 10), 0.5);
  assert.equal(cannonReloadWorkRate(1, 10), 0.1);
  assert.equal(cannonReloadWorkRate(0, 10), 0);
});

test("a lone crew member takes ten times as long to reload ten cannons", () => {
  assert.equal(advanceCannonReload(10, 10, 1, 10), 9);
  assert.equal(advanceCannonReload(9, 90, 1, 10), 0);
  assert.equal(advanceCannonReload(10, 10, 5, 10), 5);
  assert.equal(advanceCannonReload(10, 10, 10, 10), 0);
  assert.equal(advanceCannonReload(10, 1, 0, 10), 10);
  assert.equal(advanceCannonReload(10, 1, 1, 0), 0);
});

test("cannon reload staffing rejects malformed combat state", () => {
  assert.throws(() => cannonReloadWorkRate(1.5, 10), /active cannon crew/);
  assert.throws(() => cannonReloadWorkRate(1, -1), /installed cannon count/);
  assert.throws(() => advanceCannonReload(-1, 1, 1, 1), /reload work/);
  assert.throws(() => advanceCannonReload(1, -1, 1, 1), /timestep/);
});

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

test("cannons use a low direct-fire arc while arrows retain a high arc", () => {
  const cannon = navalWeaponSpec(NAVAL_WEAPON_CANNON);
  const arrow = navalWeaponSpec(NAVAL_WEAPON_ARROW);

  assert.ok(cannon.arcHeightScale <= 0.25);
  assert.ok(arrow.arcHeightScale > cannon.arcHeightScale * 2);
});

test("cannons use broadsides while deck archers fire at will", () => {
  const cannon = navalWeaponSpec(NAVAL_WEAPON_CANNON);
  const arrow = navalWeaponSpec(NAVAL_WEAPON_ARROW);

  assert.equal(navalWeaponUsesBroadside(cannon), true);
  assert.equal(navalWeaponFiresAtWill(cannon), false);
  assert.equal(navalWeaponUsesBroadside(arrow), false);
  assert.equal(navalWeaponFiresAtWill(arrow), true);
  assert.equal(navalArrowVolleyCount(3), 2);
  assert.equal(navalArrowVolleyCount(12), 3);
  assert.equal(navalArrowVolleyCount(40), 5);
  assert.throws(() => navalArrowVolleyCount(0), /crew capacity/);
});

test("unarmed gunpowder-culture ships still have no ranged attack", () => {
  assert.equal(navalWeaponForShip({ cultureType: "northern-european", cannons: 0 }), null);
});

test("a hull-specific weapon overrides culture and cannon count", () => {
  assert.equal(navalWeaponForShip({
    cultureType: "northern-european",
    cannons: 0,
    weaponKind: NAVAL_WEAPON_ARROW
  }).kind, NAVAL_WEAPON_ARROW);
  assert.throws(
    () => navalWeaponForShip({ cultureType: "northern-european", cannons: 0, weaponKind: "ballista" }),
    /Unknown naval weapon/
  );
});

test("bow fire and arrow hit sounds are packaged as repo-local Ogg assets", async () => {
  for (const name of ["bow-fire.ogg", "arrow-hit.ogg"]) {
    const bytes = await readFile(new URL(`../public/assets/sfx/${name}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "OggS");
    assert.ok(bytes.length > 1000);
  }
});
