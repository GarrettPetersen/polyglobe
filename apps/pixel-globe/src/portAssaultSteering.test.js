import test from "node:test";
import assert from "node:assert/strict";
import { PortAssaultOccupancy, portAssaultGroundDistance, portAssaultPositionIsFree } from "./portAssaultFormation.js";
import { portAssaultMoveInFormation } from "./portAssaultSteering.js";

test("holding soldiers back away from crowding after the landing run", () => {
  for (const side of ["attacker", "defender"]) {
    const direction = side === "attacker" ? 1 : -1;
    const position = side === "attacker" ? .04 : .96;
    const soldier = { id: "landing", position, lane: 1, side,
      alive: true, stats: { mounted: false, attackType: "melee" }, laneGoal: null, nextLaneChangeAtMs: 0 };
    const neighbor = { ...soldier, id: "neighbor", position: position + direction * .025 };
    const occupancy = new PortAssaultOccupancy();
    occupancy.add(soldier);
    occupancy.add(neighbor);
    soldier.stats.attackType = "melee";
    const shortAdvance = portAssaultMoveInFormation(soldier,
      { position: position + direction * .0001, lane: 1 }, .003, occupancy, 0, 800, { clearingLanding: true });
    assert.ok((shortAdvance.position - position) * direction >= 0, "spacing cannot reverse an advance order");
    const holding = portAssaultMoveInFormation(soldier, { position, lane: 1 }, .003, occupancy, 0, 1000);
    assert.ok((holding.position - position) * direction < 0);
    const retreat = portAssaultMoveInFormation(soldier, { position: position - direction * .02, lane: 1 },
      .003, occupancy, 0, 1200);
    assert.ok((retreat.position - position) * direction < 0);
    // Troops behind can still nudge the formation forward to make room.
    neighbor.position = position - direction * .025;
    occupancy.update(neighbor);
    const advancing = portAssaultMoveInFormation(soldier, { position, lane: 1 }, .003, occupancy, 0, 1400);
    assert.ok((advancing.position - position) * direction > 0);
  }
});

test("skirmishers can pass both ways through a standing four-file infantry formation", () => {
  for (const direction of [-1, 1]) {
    for (const entryLane of [0, 1, 2, 3]) {
      const soldier = (id, position, lane) => ({ id, position, lane, side: "attacker",
        alive: true, stats: { mounted: false, attackType: "melee" }, laneGoal: null, nextLaneChangeAtMs: 0 });
      const infantry = Array.from({ length: 4 }, (_, lane) => soldier(`pike-${lane}`, .5, lane));
      const gunner = soldier("gunner", .5 - direction * .07, entryLane);
      gunner.stats.attackType = "firearm";
      const destination = { position: .5 + direction * .07, lane: entryLane };
      const occupancy = new PortAssaultOccupancy();
      for (const unit of [...infantry, gunner]) occupancy.add(unit);
      let crossedGap = false;
      for (let timeMs = 0; timeMs < 15000; timeMs += 100) {
        const next = portAssaultMoveInFormation(gunner, destination, .003, occupancy, 0, timeMs);
        assert.ok(portAssaultGroundDistance(gunner, next) <= .003 + 1e-9);
        Object.assign(gunner, next);
        occupancy.update(gunner);
        assert.ok(portAssaultPositionIsFree(gunner, infantry));
        if (Math.abs(gunner.position - .5) < .003) crossedGap = true;
      }
      assert.ok(crossedGap, `lane ${entryLane}, direction ${direction} never passed through the rank`);
      assert.ok(portAssaultGroundDistance(gunner, destination) < .004,
        `lane ${entryLane}, direction ${direction} remained trapped`);
    }
  }
});

test("skirmishers retreat through three intact infantry ranks without overlapping", () => {
  for (const side of ["attacker", "defender"]) for (const attackType of ["firearm", "arrow"]) {
    const mirror = x => side === "attacker" ? x : 1 - x;
    const soldier = { id: "skirmisher", side, position: mirror(.52), lane: 1.1,
      alive: true, stats: { mounted: false, attackType }, laneGoal: null, nextLaneChangeAtMs: 0 };
    const occupancy = new PortAssaultOccupancy();
    const infantry = [];
    occupancy.add(soldier);
    for (let rank = 0; rank < 3; rank++) for (let file = 0; file < 4; file++) {
      const ally = { ...soldier, id: `infantry-${rank}-${file}`,
        stats: { mounted: false, attackType: "melee" }, position: mirror(.46 - rank * .03), lane: file };
      infantry.push(ally); occupancy.add(ally);
    }
    for (let timeMs = 0; timeMs < 30000; timeMs += 200) {
      Object.assign(soldier, portAssaultMoveInFormation(soldier,
        { position: mirror(.32), lane: 1.1 }, .004, occupancy, 0, timeMs));
      occupancy.update(soldier);
      assert.ok(portAssaultPositionIsFree(soldier, infantry));
    }
    assert.ok(Math.abs(soldier.position - mirror(.32)) < .005, `${side}/${attackType} trapped at ${soldier.position}`);
  }
});

test("retreating soldiers ignore personal-space pressure from comrades behind them", () => {
  function step(attackType) {
    const soldier = { id: "subject", side: "attacker", position: .5, lane: 1,
      alive: true, stats: { mounted: false, attackType }, laneGoal: null, nextLaneChangeAtMs: 0 };
    const occupancy = new PortAssaultOccupancy();
    occupancy.add(soldier);
    for (const lane of [.45, 1.55]) occupancy.add({ ...soldier, id: `ally-${lane}`, position: .47, lane });
    return portAssaultMoveInFormation(soldier, { position: .45, lane: 1 }, .004, occupancy, 0, 200);
  }
  assert.equal(step("firearm").position, .496, "the body fits, so retreat at full speed");
  assert.equal(step("melee").position, .496, "ordered infantry retreats also ignore pressure from behind");
});

test("rear infantry back off instead of driving an advance into a comrade", () => {
  for (const side of ["attacker","defender"]) {
    const forward=side==="attacker"?1:-1;
    const unit={id:"rear",side,position:.5,lane:1,alive:true,
      stats:{mounted:false,attackType:"melee"},laneGoal:null,nextLaneChangeAtMs:0};
    const front={...unit,id:"front",position:.5+forward*.04};
    const occupancy=new PortAssaultOccupancy();
    occupancy.add(unit);occupancy.add(front);
    const next=portAssaultMoveInFormation(unit,{position:.5+forward*.2,lane:1},.004,
      occupancy,0,2000,{leaveRetreatGaps:true});
    assert.ok((next.position-unit.position)*forward<=0,"an advance order must yield to formation clearance");
    assert.ok(portAssaultGroundDistance(next,front)>portAssaultGroundDistance(unit,front),"back up or step aside to open space");
    assert.ok(portAssaultPositionIsFree({...unit,...next},[front]));
  }
});
