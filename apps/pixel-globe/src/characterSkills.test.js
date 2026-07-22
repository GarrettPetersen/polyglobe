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
