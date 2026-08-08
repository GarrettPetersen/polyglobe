import assert from "node:assert/strict";
import test from "node:test";
import {
  projectileHullDamage,
  resolveNavalProjectileImpact
} from "./navalCombatResolution.js";

const TARGET_STATS = Object.freeze({
  slug: "test-ship",
  armor: 25,
  crewProtection: 20
});

test("naval impact resolves hull damage, crew wounds, and surrender together", () => {
  const rolls = [0.1, 0.2, 0.9];
  const result = resolveNavalProjectileImpact({
    projectile: {
      damage: 1,
      crewDamage: 2,
      crewHitChance: 1,
      crewProtectionPenetration: 1
    },
    target: {
      hitPoints: 4,
      crew: 4,
      woundedCrew: 1,
      surrendered: false,
      stats: TARGET_STATS
    },
    random: () => rolls.shift()
  });

  assert.deepEqual(result, {
    hitPoints: 3,
    woundedCrew: 3,
    newWounds: 2,
    damage: 1,
    resisted: false,
    surrendered: true
  });
});

test("naval impact reports armor glances without hiding crew wounds", () => {
  const rolls = [0, 0];
  const result = resolveNavalProjectileImpact({
    projectile: {
      damage: 2,
      crewDamage: 1,
      crewHitChance: 1,
      crewProtectionPenetration: 1
    },
    target: {
      hitPoints: 4,
      crew: 8,
      woundedCrew: 0,
      surrendered: false,
      stats: TARGET_STATS
    },
    random: () => rolls.shift()
  });

  assert.equal(result.hitPoints, 4);
  assert.equal(result.woundedCrew, 1);
  assert.equal(result.resisted, true);
});

test("targets without hull resistance still use the shared wound rules", () => {
  const result = resolveNavalProjectileImpact({
    projectile: {
      damage: 2,
      crewDamage: 0,
      crewHitChance: 0,
      crewProtectionPenetration: 0
    },
    target: {
      hitPoints: 4,
      crew: 8,
      woundedCrew: 0,
      surrendered: false,
      stats: TARGET_STATS
    },
    allowHullResistance: false,
    random: () => 0
  });

  assert.equal(result.hitPoints, 2);
  assert.equal(result.resisted, false);
});

test("incendiary hull damage only applies on a successful ignition roll", () => {
  assert.equal(projectileHullDamage({ damage: 0.25, hullHitChance: 0.2 }, () => 0.19), 0.25);
  assert.equal(projectileHullDamage({ damage: 0.25, hullHitChance: 0.2 }, () => 0.2), 0);
});

test("aggregated volleys roll each represented fire arrow independently", () => {
  const rolls = [0.1, 0.3, 0.05, 0.9];
  assert.equal(projectileHullDamage({
    damage: 1,
    hullHitChance: 0.2,
    hullDamageAttempts: 4
  }, () => rolls.shift()), 0.5);
});
