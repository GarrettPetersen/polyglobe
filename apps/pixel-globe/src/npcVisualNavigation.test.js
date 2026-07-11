import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseNpcEscapeDirection,
  chooseNpcSailingDirection
} from "./npcVisualNavigation.js";

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

test("NPC escape navigation keeps routing around the committed side", () => {
  const escape = chooseNpcEscapeDirection({
    desiredDirection: { x: 1, y: 0 },
    currentDirection: { x: 1, y: 0 },
    candidateDirections: [
      { x: 1, y: -1 },
      { x: 1, y: 1 }
    ],
    clearDistanceFor: () => 24,
    preferredSide: -1
  });

  assert.ok(escape);
  assert.equal(escape.side, -1);
  assert.ok(escape.direction.y < 0);
});

test("NPC sailing uses a direct course outside the upwind no-go angle", () => {
  const sailing = chooseNpcSailingDirection({
    desiredDirection: { x: 0, y: 1 },
    windFlowDirection: { x: 1, y: 0 },
    stallAngleRad: 40 * Math.PI / 180,
    currentDirection: { x: 0, y: 1 }
  });

  assert.equal(sailing.tacking, false);
  assert.deepEqual(sailing.direction, { x: 0, y: 1 });
});

test("NPC sailing converts an upwind course into a legal tack", () => {
  const stallAngleRad = 40 * Math.PI / 180;
  const sailing = chooseNpcSailingDirection({
    desiredDirection: { x: -1, y: 0 },
    windFlowDirection: { x: 1, y: 0 },
    stallAngleRad,
    currentDirection: { x: 0, y: -1 }
  });
  const upwind = { x: -1, y: 0 };
  const angleFromUpwind = Math.acos(
    sailing.direction.x * upwind.x + sailing.direction.y * upwind.y
  );

  assert.equal(sailing.tacking, true);
  assert.ok(angleFromUpwind > stallAngleRad);
});

test("NPC sailing honors a committed tack side", () => {
  const sailing = chooseNpcSailingDirection({
    desiredDirection: { x: -1, y: 0 },
    windFlowDirection: { x: 1, y: 0 },
    stallAngleRad: 40 * Math.PI / 180,
    currentDirection: { x: -1, y: 1 },
    preferredTackSide: 1
  });

  assert.equal(sailing.tacking, true);
  assert.equal(sailing.tackSide, 1);
  assert.ok(sailing.direction.y < 0);
});
