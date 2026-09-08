import test from "node:test";
import assert from "node:assert/strict";
import { PortAssaultOccupancy, portAssaultGroundDistance, portAssaultPositionIsFree } from "./portAssaultFormation.js";
import { portAssaultMoveInFormation } from "./portAssaultSteering.js";

test("spacing cannot push a holding soldier backward, but ordered retreats still work", () => {
  for (const side of ["attacker", "defender"]) {
    const direction = side === "attacker" ? 1 : -1;
    const position = side === "attacker" ? .04 : .96;
    const soldier = { id: "landing", position, lane: 1, side,
      alive: true, stats: { mounted: false }, laneGoal: null, nextLaneChangeAtMs: 0 };
    const neighbor = { ...soldier, id: "neighbor", position: position + direction * .025 };
    const occupancy = new PortAssaultOccupancy();
    occupancy.add(soldier);
    occupancy.add(neighbor);
    const holding = portAssaultMoveInFormation(soldier, { position, lane: 1 }, .003, occupancy, 0, 1000);
    assert.equal(holding.position, position);
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
        alive: true, stats: { mounted: false }, laneGoal: null, nextLaneChangeAtMs: 0 });
      const infantry = Array.from({ length: 4 }, (_, lane) => soldier(`pike-${lane}`, .5, lane));
      const gunner = soldier("gunner", .5 - direction * .07, entryLane);
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
