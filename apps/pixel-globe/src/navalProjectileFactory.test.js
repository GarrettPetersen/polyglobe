import assert from "node:assert/strict";
import test from "node:test";

import { createPortableNavalProjectile } from "./navalProjectileFactory.js";
import { portableWeaponItemById } from "./portableWeapons.js";

test("portable projectile mechanics are identical before mode-specific ownership is attached", () => {
  const weapon = portableWeaponItemById("matchlock-arquebuses").weapon;
  const projectile = createPortableNavalProjectile({
    weapon,
    startX: 10,
    startY: 20,
    targetX: 40,
    targetY: 20,
    seed: 7,
    arcHeightUnit: 0.5,
    launchDelaySeconds: 0.2
  });

  assert.equal(projectile.weaponId, weapon.itemId);
  assert.equal(projectile.damage, weapon.hullDamage);
  assert.equal(projectile.crewDamage, weapon.crewDamage);
  assert.equal(projectile.crewHitChance, weapon.crewHitChance);
  assert.equal(projectile.crewFatalityChance, weapon.crewFatalityChance);
  assert.equal(projectile.crewProtectionPenetration, weapon.crewProtectionPenetration);
  assert.equal(projectile.launchDelaySeconds, 0.2);
});

test("fleet-scale projectile aggregation preserves per-operator damage attempts", () => {
  const weapon = portableWeaponItemById("incendiary-arrows").modifier;
  assert.ok(weapon);
  const bow = portableWeaponItemById("mariners-bows").weapon;
  const projectile = createPortableNavalProjectile({
    weapon: {
      ...bow,
      hullDamage: weapon.bowHullDamage,
      hullHitChance: weapon.bowHullHitChance
    },
    startX: 0,
    startY: 0,
    targetX: 20,
    targetY: 0,
    seed: 11,
    arcHeightUnit: 0,
    damageScale: 5,
    hullDamageAttempts: 5,
    crewDamageScale: 5,
    operatorShare: 5
  });
  assert.equal(projectile.damage, weapon.bowHullDamage * 5);
  assert.equal(projectile.hullDamageAttempts, 5);
  assert.equal(projectile.crewDamage, bow.crewDamage * 5);
  assert.equal(projectile.operatorShare, 5);
});
