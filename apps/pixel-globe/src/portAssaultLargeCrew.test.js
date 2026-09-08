import test from "node:test";
import assert from "node:assert/strict";
import { createPortAssaultScenario, simulatePortAssault } from "./portAssaultBattle.js";
import { shipStatsForSlug } from "./shipStats.js";

function soldier(id, index) {
  const type = ["gunner", "spearman", "swordsman"][index % 3];
  return { id, appearanceId: `${type}-light`, crewTypeId: type,
    combatProfileId: type, experienceStars: 1, auxiliary: false };
}

for (const seed of [19, 37, 71]) {
  test(`full ship-of-the-line crew lets skirmishers withdraw and reload: seed ${seed}`, () => {
    const count = shipStatsForSlug("ship-of-the-line").crewCapacity;
    const battle = simulatePortAssault(createPortAssaultScenario({
      cityId: "tunis|tunisia",
      attackers: Array.from({ length: count }, (_, index) => soldier(`a${index}`, index)),
      defenders: Array.from({ length: 40 }, (_, index) => soldier(`d${index}`, index)),
      shipHitPoints: 100, shipMaxHitPoints: 100, dockKind: "stone", fortified: true
    }), seed);
    // Only judge shots with a complete observation window before the battle ends.
    const observationMs = 15000;
    const shots = battle.events.filter(event => event.type === "attack" &&
      event.attackType === "firearm" && event.unitId.startsWith("a") &&
      event.timeMs + observationMs <= battle.durationMs);
    // Require repeated volleys, rather than an absolute shot count that also
    // varies with how quickly infantry defeats the opposing force.
    const shotsByGunner = new Map();
    for (const shot of shots) shotsByGunner.set(shot.unitId, (shotsByGunner.get(shot.unitId) ?? 0) + 1);
    assert.ok([...shotsByGunner.values()].filter(count => count > 1).length >= 8,
      "multiple gunners must finish reloads and fire again in a crowded battle");
    let withdrew = 0;
    for (const shot of shots) {
      const track = battle.tracks[shot.unitId];
      const start = track.findLast(frame => frame.timeMs <= shot.timeMs);
      const after = track.filter(frame => frame.timeMs > shot.timeMs && frame.timeMs <= shot.timeMs + observationMs);
      const retreated = after.some(frame => frame.position < start.position - .02);
      if (retreated) withdrew++;
      assert.ok(retreated || after.some(frame => !frame.alive || frame.animationId === "reload"),
        `${shot.unitId} trapped after firing at ${shot.timeMs}`);
    }
    assert.ok(withdrew >= shots.length * .35, "skirmishers must physically withdraw through the full formation");
  });
}
