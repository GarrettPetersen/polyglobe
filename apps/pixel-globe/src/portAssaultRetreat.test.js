import test from "node:test";
import assert from "node:assert/strict";
import { createPortAssaultScenario, simulatePortAssault } from "./portAssaultBattle.js";

const soldier = (id, index) => {
  const type = ["gunner", "spearman", "swordsman"][index % 3];
  return { id, appearanceId: `${type}-light`, crewTypeId: type, combatProfileId: type,
    experienceStars: 1, auxiliary: false };
};

test("the photographed 89-versus-40 press leaves actual retreat routes for gunners", () => {
  for (const seed of [7, 19, 47]) {
    const battle = simulatePortAssault(createPortAssaultScenario({ cityId: "tunis|tunisia",
      attackers: Array.from({length:89},(_,i)=>soldier(`a${i}`,i)),
      defenders: Array.from({length:40},(_,i)=>soldier(`d${i}`,i)),
      shipHitPoints:80, shipMaxHitPoints:100, dockKind:"wood", fortified:true }),seed);
    let retreatFrames=0;
    let successfulRetreats=0;
    for (const unit of battle.combatants.filter(u=>u.combatProfileId==="gunner")) {
      const rear=unit.side==="attacker"?-1:1;
      let start=null;
      let windowStart=null;
      const track = battle.tracks[unit.id];
      // Brief changes of tactical intent must not conceal an oscillating jam.
      for (let end=20; end<track.length; end+=20) {
        const window=track.slice(end-20,end+1);
        if (window.every(frame=>frame.alive&&!frame.hidden) &&
            window.filter(frame=>frame.retreating).length>=16) {
          assert.ok((window.at(-1).position-window[0].position)*rear>=.009,
            `seed ${seed}: ${unit.id} repeatedly requests retreat without progress at ${window[0].timeMs}ms`);
        }
      }
      for (const frame of track) {
        if (!frame.hidden && frame.alive && frame.retreating) {
          retreatFrames++;
          start ??= frame;
          windowStart ??= frame;
          if ((frame.position-start.position)*rear >= .018) { successfulRetreats++; start=frame; }
          if (frame.timeMs-windowStart.timeMs >= 4000) {
            assert.ok((frame.position-windowStart.position)*rear >= .009,
              `seed ${seed}: ${unit.id} trapped while retreating at ${windowStart.timeMs}ms`);
            windowStart=frame;
          }
        } else { start=null; windowStart=null; }
      }
    }
    assert.ok(retreatFrames>100,"must exercise actual retreats, not avoid combat");
    assert.ok(successfulRetreats>=5,`seed ${seed}: must visibly get back through the formation`);
    assert.ok(battle.events.filter(e=>e.type==="attack").length>100,"the formations must still engage");
  }
});
