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
    let withdrawalOrders = 0;
    for (const shot of shots) {
      const track = battle.tracks[shot.unitId];
      const start = track.findLast(frame => frame.timeMs <= shot.timeMs);
      const after = track.filter(frame => frame.timeMs > shot.timeMs && frame.timeMs <= shot.timeMs + observationMs);
      const retreated = after.some(frame => frame.position < start.position - .02);
      // Measure from the withdrawal order, since a gunner can advance after firing.
      const withdrawalStart = after.find(frame => frame.retreating);
      if (withdrawalStart) {
        withdrawalOrders++;
        if (after.some(frame => frame.timeMs >= withdrawalStart.timeMs &&
          frame.position < withdrawalStart.position - .02)) withdrew++;
      }
      assert.ok(retreated || after.some(frame => !frame.alive || frame.animationId === "reload"),
        `${shot.unitId} trapped after firing at ${shot.timeMs}`);
    }
    assert.ok(withdrawalOrders > 0, "the fixture must exercise actual withdrawal orders");
    // Supporting infantry may make reloading safe before a long retreat is
    // needed. Sustained withdrawal progress is checked in portAssaultRetreat;
    // this mixed battle must demonstrate repeated real withdrawals and reloads.
    assert.ok(withdrew >= 5, `skirmishers must physically withdraw through the full formation: ${withdrew}`);
  });
}

for (const profile of ["gunner", "teppo-ashigaru"]) {
  test(`15 ${profile} crew against two guards can reload and fire repeated volleys`, () => {
    for (const seed of [1, 19, 37]) {
      const battle = simulatePortAssault(createPortAssaultScenario({
        cityId: "tunis|tunisia", dockKind: "wood", fortified: true,
        attackers: Array.from({ length: 15 }, (_, i) => ({ ...soldier(`a${i}`, 0),
          crewTypeId: profile, combatProfileId: profile, appearanceId: `${profile}-light`, experienceStars: 0 })),
        defenders: Array.from({ length: 2 }, (_, i) => ({ ...soldier(`d${i}`, 0),
          crewTypeId: "shieldman", combatProfileId: "shieldman", appearanceId: "shieldman-light", experienceStars: 3 })),
        shipHitPoints: 100, shipMaxHitPoints: 100
      }), seed);
      const shots = battle.events.filter(event => event.type === "attack" && event.attackType === "firearm" && event.unitId.startsWith("a"));
      const shooters = new Map();
      for (const shot of shots) shooters.set(shot.unitId, (shooters.get(shot.unitId) ?? 0) + 1);
      assert.ok([...shooters.values()].some(count => count > 1), `seed ${seed}: must reload and shoot again`);
      for (const [id, track] of Object.entries(battle.tracks).filter(([id]) => id.startsWith("a"))) {
        for (let index = 1; index < track.length; index++) if (track[index].animationId === "reload") {
          assert.equal(track[index].position, track[index - 1].position, `${id}: reload must remain stationary`);
          assert.equal(track[index].lane, track[index - 1].lane, `${id}: reload must remain stationary`);
        }
      }
    }
  });
}
