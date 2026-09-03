import assert from "node:assert/strict";
import test from "node:test";
import { PORT_ASSAULT_ATTACKER_ENTRY_POSITION } from "../src/portAssaultBattle.js";

import {
  CITY_ASSAULT_MIN_FORWARD_JUMP_PX,
  CITY_ASSAULT_JUMP_ARC_HEIGHT_PX,
  CITY_ASSAULT_KNOCKBACK_DURATION_MS,
  CITY_ASSAULT_MELEE_LUNGE_DURATION_MS,
  cityAssaultForwardEntryShift,
  cityAssaultLaneX,
  cityAssaultJumpPoint,
  cityAssaultKnockbackOffset,
  cityAssaultMeleeLungeOffset
} from "./cityAssaultMotion.js";

test("shipboard attackers follow a pixel-snapped parabolic jump onto shore", () => {
  const input = { start: { x: 686, y: 514 }, end: { x: 692, y: 540 }, durationMs: 520 };
  assert.deepEqual(cityAssaultJumpPoint({ ...input, elapsedMs: 0 }), input.start);
  assert.deepEqual(cityAssaultJumpPoint({ ...input, elapsedMs: 520 }), input.end);
  const apex = cityAssaultJumpPoint({ ...input, elapsedMs: 260 });
  assert.equal(apex.x, 689);
  assert.equal(apex.y, 514 + 13 - CITY_ASSAULT_JUMP_ARC_HEIGHT_PX);
  assert.ok(apex.y < input.start.y, "the low road lane must still rise above the deck");
});

test("a shipboard landing always advances right without shifting the gate", () => {
  const deckStartX = 748;
  const baselineEntryX = 692;
  const entryShiftX = cityAssaultForwardEntryShift({ baselineEntryX, deckStartX });
  const landingX = cityAssaultLaneX({
    baselineX: baselineEntryX,
    position: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryPosition: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryShiftX
  });
  assert.equal(landingX, deckStartX + CITY_ASSAULT_MIN_FORWARD_JUMP_PX);
  assert.ok(landingX > deckStartX);
  assert.equal(cityAssaultLaneX({
    baselineX: 1306,
    position: 1,
    entryPosition: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryShiftX
  }), 1306);
  assert.equal(cityAssaultLaneX({
    baselineX: baselineEntryX,
    position: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryPosition: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryShiftX: cityAssaultForwardEntryShift({ baselineEntryX, deckStartX: 650 })
  }), baselineEntryX);
});

test("melee lunge and knockback motion return to authoritative battle positions", () => {
  assert.deepEqual(cityAssaultMeleeLungeOffset("attacker", 0), { x: 0, y: 0 });
  assert.deepEqual(
    cityAssaultMeleeLungeOffset("attacker", CITY_ASSAULT_MELEE_LUNGE_DURATION_MS / 2),
    { x: 5, y: -2 }
  );
  assert.deepEqual(
    cityAssaultMeleeLungeOffset("defender", CITY_ASSAULT_MELEE_LUNGE_DURATION_MS / 2),
    { x: -5, y: -2 }
  );
  assert.deepEqual(cityAssaultMeleeLungeOffset("attacker", CITY_ASSAULT_MELEE_LUNGE_DURATION_MS), { x: 0, y: 0 });

  assert.deepEqual(cityAssaultKnockbackOffset({ knockbackPx: 6, elapsedMs: 0 }), { x: -6, y: 0 });
  const airborne = cityAssaultKnockbackOffset({ knockbackPx: 6, elapsedMs: 180 });
  assert.ok(airborne.x > -6 && airborne.x < 0);
  assert.equal(airborne.y, -5);
  assert.deepEqual(
    cityAssaultKnockbackOffset({ knockbackPx: 6, elapsedMs: CITY_ASSAULT_KNOCKBACK_DURATION_MS }),
    { x: 0, y: 0 }
  );
});

test("city assault motion rejects malformed spatial and timing contracts", () => {
  assert.throws(() => cityAssaultJumpPoint({
    start: null,
    end: { x: 0, y: 0 },
    elapsedMs: 0,
    durationMs: 1
  }), /jump start/);
  assert.throws(() => cityAssaultMeleeLungeOffset("neutral", 0), /side/);
  assert.throws(() => cityAssaultKnockbackOffset({ knockbackPx: 0, elapsedMs: 0 }), /distance/);
  assert.throws(() => cityAssaultLaneX({
    baselineX: 0,
    position: -0.1,
    entryPosition: PORT_ASSAULT_ATTACKER_ENTRY_POSITION,
    entryShiftX: 0
  }), /position/);
});
