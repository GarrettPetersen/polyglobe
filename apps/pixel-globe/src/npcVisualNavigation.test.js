import assert from "node:assert/strict";
import test from "node:test";
import { chooseNpcEscapeDirection } from "./npcVisualNavigation.js";

test("NPC escape navigation reverses out of a concave corner", () => {
  const escape = chooseNpcEscapeDirection({
    desiredDirection: { x: 1, y: 0 },
    currentDirection: { x: 1, y: 0 },
    candidateDirections: [
      { x: -0.25, y: 1 },
      { x: -1, y: 0 },
      { x: -0.25, y: -1 }
    ],
    clearDistanceFor: (direction) => direction.x < -0.9 ? 18 : 3
  });

  assert.ok(escape);
  assert.ok(escape.direction.x < -0.9);
  assert.equal(escape.clearDistance, 18);
});

test("NPC escape navigation prefers the route-facing side when clearance ties", () => {
  const escape = chooseNpcEscapeDirection({
    desiredDirection: { x: 0.4, y: 1 },
    currentDirection: { x: 1, y: 0 },
    candidateDirections: [
      { x: -1, y: 0 },
      { x: 0, y: 1 }
    ],
    clearDistanceFor: () => 12
  });

  assert.ok(escape);
  assert.ok(escape.direction.y > 0.9);
});

test("NPC escape navigation returns null when every candidate is blocked", () => {
  const escape = chooseNpcEscapeDirection({
    desiredDirection: { x: 1, y: 0 },
    currentDirection: { x: 1, y: 0 },
    candidateDirections: [{ x: -1, y: 0 }],
    clearDistanceFor: () => 0
  });

  assert.equal(escape, null);
});
