import test from "node:test";
import assert from "node:assert/strict";
import { npcCruisingKmPerGameDay, migrateNpcRoutePacing } from "./npcRoutePacing.js";
import { realSecondsPerGameDay } from "./gamePacing.js";
import { shipStatsForSlug } from "./shipStats.js";

test("NPC daily distance uses angular ship speed and the actual game clock", () => {
  const stats = shipStatsForSlug("galleon");
  assert.equal(npcCruisingKmPerGameDay(stats), stats.topSpeedRad * 6371 * realSecondsPerGameDay() * 0.85);
  assert.equal(npcCruisingKmPerGameDay({ topSpeedRad: stats.topSpeedRad * 2 }), npcCruisingKmPerGameDay(stats) * 2);
  assert.throws(() => npcCruisingKmPerGameDay({ topSpeedRad: 0 }), /positive ship speed/);
});

test("legacy route pacing preserves current segment progress, waits, and delayed departures", () => {
  for (const now of [0, 120, 200, 300, 1100, 1500]) {
    const ship = { id: "racer", slug: "galleon", clockOffsetMinutes: 20, plan: {
      startMinute: 100, endMinute: 2200, segments: [
        { kind: "sail", startMinute: 100, endMinute: 1100 },
        { kind: "wait", startMinute: 1100, endMinute: 1200 },
        { kind: "sail", startMinute: 1200, endMinute: 2200 }
      ] } };
    const before = structuredClone(ship);
    migrateNpcRoutePacing(ship, now);
    const index = before.plan.segments.findIndex(s => now + 20 >= s.startMinute && now + 20 < s.endMinute);
    if (index >= 0) {
      const a=before.plan.segments[index], b=ship.plan.segments[index];
      assert.ok(Math.abs((now + 20 - a.startMinute)/(a.endMinute-a.startMinute) -
        (now-b.startMinute)/(b.endMinute-b.startMinute)) < 1e-10);
    } else assert.equal(ship.plan.startMinute-now, before.plan.startMinute-now-20);
    assert.ok(Math.abs(ship.plan.segments[1].endMinute-ship.plan.segments[1].startMinute-100) < 1e-10);
    assert.ok(ship.plan.endMinute < before.plan.endMinute);
    assert.equal(ship.clockOffsetMinutes,0);
  }
  const held = { id:"held",slug:"galleon",clockOffsetMinutes:0,plan:{ startMinute:0,endMinute:100,segments:[{kind:"wait",startMinute:0,endMinute:100}]}};
  const before=structuredClone(held);migrateNpcRoutePacing(held,50);assert.deepEqual(held,before);
});
