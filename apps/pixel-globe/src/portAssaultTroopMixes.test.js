import test from "node:test";
import assert from "node:assert/strict";
import { createPortAssaultScenario, simulatePortAssault } from "./portAssaultBattle.js";

const troopMixes = {
  mixed: [...Array(6).fill("gunner"), ...Array(6).fill("spearman")],
  guns: Array(12).fill("gunner"),
  swords: Array(12).fill("swordsman"),
  pikes: Array(12).fill("spearman"),
  cavalry: Array(12).fill("horseman")
};
function combatants(side, mix) {
  return troopMixes[mix].map((type, index) => ({
    id: `${side}${index}`, appearanceId: type === "horseman" ? "horseman-covered" : `${type}-light`, crewTypeId: type,
    combatProfileId: type, experienceStars: 1, auxiliary: false
  }));
}
function sample(attackerMix, defenderMix) {
  return Array.from({ length: 12 }, (_, index) => simulatePortAssault(createPortAssaultScenario({
    cityId: "tunis|tunisia", attackers: combatants("a", attackerMix), defenders: combatants("d", defenderMix),
    shipHitPoints: 80, shipMaxHitPoints: 100, dockKind: "stone", fortified: true
  }), index + 1));
}
const firstMeleeMean = battles => battles.reduce((sum, battle) => sum +
  battle.events.find(event => event.type === "attack" && event.attackType === "melee").timeMs, 0) / battles.length;
const victories = battles => battles.filter(battle => battle.outcome === "victory").length;

test("troop composition changes the fighting and mixed screens do not stall until the battle cutoff", () => {
  const mixed = sample("mixed", "mixed");
  const cavalry = sample("mixed", "cavalry");
  const pikes = sample("pikes", "cavalry");
  const swords = sample("swords", "swords");
  const guns = sample("guns", "guns");
  for (const battle of mixed) {
    assert.ok(!battle.events.some(event => event.type === "time-limit"), `Mixed battle stalled: seed ${battle.seed}`);
    const shot = battle.events.find(event => event.type === "attack" && event.attackType === "firearm");
    const melee = battle.events.find(event => event.type === "attack" && event.attackType === "melee");
    assert.ok(shot && melee && shot.timeMs < melee.timeMs);
  }
  assert.ok(firstMeleeMean(cavalry) < firstMeleeMean(mixed) / 2);
  assert.ok(firstMeleeMean(swords) < firstMeleeMean(mixed));
  assert.ok(victories(pikes) > victories(cavalry), "spear-heavy infantry should resist cavalry better than a gun-heavy screen");
  for (const battle of guns) {
    assert.ok(battle.events.filter(event => event.type === "attack" && event.attackType === "firearm").length > 20);
    assert.ok(!battle.events.some(event => event.type === "attack" && event.attackType === "melee"));
  }
});
