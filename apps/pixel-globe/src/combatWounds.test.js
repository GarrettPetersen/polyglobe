import assert from "node:assert/strict";
import test from "node:test";
import {
  activeCombatCrew,
  applyCrewWounds,
  clearCombatWounds,
  crewWoundsForceSurrender
} from "./combatWounds.js";

test("crew protection and accuracy jointly determine temporary wounds", () => {
  const exposed = applyCrewWounds({
    totalCrew: 8,
    crewDamage: 3,
    hitChance: 0.5,
    crewProtection: 0,
    random: () => 0.4
  });
  assert.equal(exposed.newWounds, 3);
  assert.equal(exposed.activeCrew, 5);

  const sheltered = applyCrewWounds({
    totalCrew: 8,
    crewDamage: 3,
    hitChance: 0.5,
    crewProtection: 60,
    random: () => 0.3
  });
  assert.equal(sheltered.newWounds, 0);
  assert.equal(sheltered.effectiveChance, 0.2);
});

test("a lone exposed NPC can be incapacitated into surrender", () => {
  const result = applyCrewWounds({
    totalCrew: 1,
    crewDamage: 1,
    hitChance: 1,
    crewProtection: 0,
    random: () => 0
  });
  assert.equal(result.woundedCrew, 1);
  assert.equal(result.activeCrew, 0);
  assert.equal(crewWoundsForceSurrender(1, 1), true);
});

test("player wound handling can preserve the final captain", () => {
  const result = applyCrewWounds({
    totalCrew: 1,
    crewDamage: 3,
    hitChance: 1,
    crewProtection: 0,
    preserveFinalCrew: true,
    random: () => 0
  });
  assert.equal(result.woundedCrew, 0);
  assert.equal(result.activeCrew, 1);
});

test("a turtle ship's complete crew protection prevents small-arms wounds", () => {
  const result = applyCrewWounds({
    totalCrew: 30,
    crewDamage: 8,
    hitChance: 1,
    crewProtection: 100,
    random: () => 0
  });
  assert.equal(result.newWounds, 0);
  assert.equal(result.protected, true);
});

test("final-crew protection never removes the last active person", () => {
  const result = applyCrewWounds({
    totalCrew: 3,
    crewDamage: 20,
    hitChance: 1,
    crewProtection: 0,
    preserveFinalCrew: true,
    random: () => 0
  });
  assert.equal(result.woundedCrew, 2);
  assert.equal(activeCombatCrew(3, result.woundedCrew), 1);
  assert.equal(crewWoundsForceSurrender(3, result.woundedCrew), true);
});

test("combat wounds clear without changing permanent crew", () => {
  const combatant = { woundedCrew: 4 };
  assert.equal(clearCombatWounds(combatant), true);
  assert.equal(combatant.woundedCrew, 0);
  assert.equal(clearCombatWounds(combatant), false);
});
