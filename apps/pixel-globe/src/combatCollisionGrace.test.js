import assert from "node:assert/strict";
import test from "node:test";
import { combatEntryCollisionGraceForPair } from "./combatCollisionGrace.js";

test("ships overlapping when combat begins remain collision-safe until they separate", () => {
  const pairs = new Set();
  const geometry = { distanceSquared: 25, touchingRange: 10 };
  assert.equal(combatEntryCollisionGraceForPair(pairs, "neutral|player", {
    ...geometry,
    entryGrace: true
  }), true);
  assert.equal(pairs.has("neutral|player"), true);
  assert.equal(combatEntryCollisionGraceForPair(pairs, "neutral|player", {
    ...geometry,
    entryGrace: false
  }), true, "the overlap remains safe after the entry timer expires");
  assert.equal(combatEntryCollisionGraceForPair(pairs, "neutral|player", {
    entryGrace: false,
    distanceSquared: 121,
    touchingRange: 10
  }), false, "normal collision damage resumes only after separation");
  assert.equal(pairs.has("neutral|player"), false);
});
