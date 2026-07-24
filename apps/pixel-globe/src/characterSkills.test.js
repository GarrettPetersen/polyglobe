import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARACTER_SKILLS,
  characterSkillById,
  characterSkillIdsForIdentity
} from "./characterSkills.js";

test("captain skills are deterministic and drawn from the complete catalog", () => {
  const first = characterSkillIdsForIdentity("captain|cadiz|1");
  const second = characterSkillIdsForIdentity("captain|cadiz|1");
  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.ok(CHARACTER_SKILLS.includes(characterSkillById(first[0])));
});

test("travelers cannot grant temporary cargo capacity", () => {
  for (let index = 0; index < 200; index++) {
    const ids = characterSkillIdsForIdentity(`traveler-${index}`, { traveler: true });
    assert.notEqual(ids[0], "organized");
  }
});

test("the panda's useless skill is registered but never randomly assigned", () => {
  assert.equal(characterSkillById("useless").assignable, false);
  for (let index = 0; index < 500; index++) {
    assert.notEqual(characterSkillIdsForIdentity(`ordinary-${index}`)[0], "useless");
    assert.notEqual(characterSkillIdsForIdentity(`traveler-${index}`, { traveler: true })[0], "useless");
  }
});

test("the fishing skill ramp improves both odds and haul", () => {
  const ramp = ["skilled-fisher", "expert-fisher", "master-fisher"].map(characterSkillById);
  assert.ok(ramp[0].perks.fishingChanceMultiplier < ramp[1].perks.fishingChanceMultiplier);
  assert.ok(ramp[1].perks.fishingChanceMultiplier < ramp[2].perks.fishingChanceMultiplier);
  assert.ok(ramp[0].perks.fishingHaulMultiplier < ramp[1].perks.fishingHaulMultiplier);
  assert.ok(ramp[1].perks.fishingHaulMultiplier < ramp[2].perks.fishingHaulMultiplier);
});

test("the shipwright skill ramp steadily improves passive hull repair", () => {
  const ramp = ["carpenter", "shipwright", "master-shipwright"].map(characterSkillById);
  assert.ok(ramp[0].perks.hullRepairHitPointsPerDay < ramp[1].perks.hullRepairHitPointsPerDay);
  assert.ok(ramp[1].perks.hullRepairHitPointsPerDay < ramp[2].perks.hullRepairHitPointsPerDay);
  assert.equal(ramp[0].perks.damageResistanceChance, undefined);
  assert.ok(ramp[1].perks.damageResistanceChance < ramp[2].perks.damageResistanceChance);
});

test("negotiation has a modest two-step price ramp", () => {
  const skilled = characterSkillById("skilled-negotiator");
  const master = characterSkillById("master-negotiator");
  assert.ok(skilled.perks.tradePurchaseMultiplier < 1);
  assert.ok(master.perks.tradePurchaseMultiplier < skilled.perks.tradePurchaseMultiplier);
  assert.ok(skilled.perks.tradeSaleMultiplier > 1);
  assert.ok(master.perks.tradeSaleMultiplier > skilled.perks.tradeSaleMultiplier);
  assert.ok(master.perks.tradePurchaseMultiplier >= 0.97);
  assert.ok(master.perks.tradeSaleMultiplier <= 1.03);
});

test("the remaining player-facing chance specialties are represented", () => {
  assert.equal(characterSkillById("master-of-disguise").perks.disguiseChanceBonus, 0.15);
  assert.equal(characterSkillById("natural-philosopher").perks.animalEncounterChanceMultiplier, 1.5);
  assert.equal(characterSkillById("master-gunner").perks.cannonSpreadMultiplier, 0.8);
  assert.equal(characterSkillById("shipwright").perks.damageResistanceChance, 0.06);
});
