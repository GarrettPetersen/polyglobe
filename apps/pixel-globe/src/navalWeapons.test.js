import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  NAVAL_WEAPON_CANNON,
  accurateBroadsideShotIndex,
  advanceCannonReload,
  cannonReloadWorkRate,
  isPreGunpowderCulture,
  navalWeaponForShip,
  navalWeaponUsesBroadside,
  navalWeaponSpec
} from "./navalWeapons.js";

test("every cannon broadside designates exactly one true shot", () => {
  for (let count = 1; count <= 20; count++) {
    const trueShotIndex = accurateBroadsideShotIndex(count);
    assert.ok(trueShotIndex >= 0 && trueShotIndex < count);
    assert.equal(
      Array.from({ length: count }, (_, index) => index === trueShotIndex)
        .filter(Boolean).length,
      1
    );
  }
  assert.equal(accurateBroadsideShotIndex(1), 0);
  assert.throws(() => accurateBroadsideShotIndex(0), /projectile count/);
});

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

test("culture does not override a hull's built-in gun ports", () => {
  for (const cultureType of ["polynesian", "mesoamerican", "andean"]) {
    assert.equal(isPreGunpowderCulture(cultureType), true);
    assert.equal(navalWeaponForShip({ cultureType, cannons: 12 }).kind, NAVAL_WEAPON_CANNON);
  }
  assert.equal(navalWeaponForShip({ cultureType: "southeast-asian", cannons: 12 }).kind, NAVAL_WEAPON_CANNON);
});

test("only cannons are intrinsic naval weapons", () => {
  const cannon = navalWeaponSpec(NAVAL_WEAPON_CANNON);
  assert.ok(cannon.arcHeightScale <= 0.25);
  assert.equal(navalWeaponUsesBroadside(cannon), true);
  assert.throws(() => navalWeaponSpec("arrow"), /Unknown naval weapon/);
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
