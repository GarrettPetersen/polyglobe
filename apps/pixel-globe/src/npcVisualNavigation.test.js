import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseNpcEscapeDirection,
  chooseNpcObstacleAvoidanceDirection,
  chooseNpcRouteFollowingDirection,
  chooseNpcSailingDirection,
  findNpcVisualPlacement,
  npcVisualStateIdsWithoutStrategicState,
  rankNpcEscapeDirections
} from "./npcVisualNavigation.js";

test("visual ships orphaned by a strategic update are identified immediately", () => {
  const visualStates = new Map([
    ["merchant-2", { id: "merchant-2" }],
    ["merchant-1", { id: "merchant-1" }],
    ["merchant-3", { id: "merchant-3" }]
  ]);
  const strategicShips = new Map([["merchant-2", { id: "merchant-2" }]]);

  assert.deepEqual(
    npcVisualStateIdsWithoutStrategicState(visualStates, strategicShips),
    ["merchant-1", "merchant-3"]
  );
});

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

test("NPC escape navigation exposes fallback candidates in score order", () => {
  const ranked = rankNpcEscapeDirections({
    desiredDirection: { x: 1, y: 0 },
    currentDirection: { x: 1, y: 0 },
    candidateDirections: [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 }
    ],
    clearDistanceFor: (direction) => direction.x > 0.9 ? 54 : 24
  });

  assert.equal(ranked.length, 3);
  assert.ok(ranked[0].direction.x > 0.9);
  assert.ok(ranked[1].score >= ranked[2].score);
});

test("NPC obstacle navigation takes the committed clear side around an island", () => {
  const avoidance = chooseNpcObstacleAvoidanceDirection({
    desiredDirection: { x: 1, y: 0 },
    currentDirection: { x: 1, y: 0 },
    preferredSide: 1,
    clearDistanceFor: (direction) => {
      if (direction.y > 0.5) return 72;
      if (direction.y < -0.5) return 72;
      return 12;
    }
  });

  assert.ok(avoidance);
  assert.equal(avoidance.side, 1);
  assert.ok(avoidance.direction.y > 0.5);
  assert.equal(avoidance.clearDistance, 72);
});

test("NPC obstacle navigation can reverse out of an enclosed shoreline", () => {
  const avoidance = chooseNpcObstacleAvoidanceDirection({
    desiredDirection: { x: 1, y: 0 },
    currentDirection: { x: 1, y: 0 },
    clearDistanceFor: (direction) => direction.x < -0.95 ? 54 : 0
  });

  assert.ok(avoidance);
  assert.ok(avoidance.direction.x < -0.95);
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

test("NPC sailing keeps an active tack through wind-boundary jitter", () => {
  const angleFromUpwind = 54 * Math.PI / 180;
  const sailing = chooseNpcSailingDirection({
    desiredDirection: {
      x: -Math.cos(angleFromUpwind),
      y: -Math.sin(angleFromUpwind)
    },
    windFlowDirection: { x: 1, y: 0 },
    stallAngleRad: 40 * Math.PI / 180,
    currentDirection: { x: -1, y: -1 },
    committedTackSide: 1
  });

  assert.equal(sailing.tacking, true);
  assert.equal(sailing.tackSide, 1);
});

test("NPC sailing releases a committed tack once a direct course is clearly legal", () => {
  const angleFromUpwind = 80 * Math.PI / 180;
  const desiredDirection = {
    x: -Math.cos(angleFromUpwind),
    y: -Math.sin(angleFromUpwind)
  };
  const sailing = chooseNpcSailingDirection({
    desiredDirection,
    windFlowDirection: { x: 1, y: 0 },
    stallAngleRad: 40 * Math.PI / 180,
    currentDirection: { x: -1, y: -1 },
    committedTackSide: 1
  });

  assert.equal(sailing.tacking, false);
  assert.ok(
    sailing.direction.x * desiredDirection.x +
    sailing.direction.y * desiredDirection.y >
    0.999999
  );
});

test("NPC route following does not turn back toward a passed route marker", () => {
  const direction = chooseNpcRouteFollowingDirection({
    routePointDirection: { x: -1, y: 0 },
    routeHeadingDirection: { x: 1, y: 0 },
    distanceToRoutePointPx: 8
  });

  assert.deepEqual(direction, { x: 1, y: 0 });
});

test("NPC route following corrects cross-track drift while preserving forward progress", () => {
  const direction = chooseNpcRouteFollowingDirection({
    routePointDirection: { x: 0, y: -1 },
    routeHeadingDirection: { x: 1, y: 0 },
    distanceToRoutePointPx: 16
  });

  assert.ok(direction.x > 0.85);
  assert.ok(direction.y < -0.4);
});

test("NPC visual activation moves a hull-clearance failure to nearby drawn water", () => {
  const visited = [];
  const placement = findNpcVisualPlacement({
    origin: { x: 10, y: 20 },
    preferredPoints: [{ x: 14, y: 20 }],
    searchRadiusPx: 12,
    radialStepPx: 2,
    angleCount: 8,
    evaluate: (x, y) => {
      visited.push([x, y]);
      return x >= 14 ? { x, y, navKind: "openWater" } : null;
    }
  });

  assert.deepEqual(placement, { x: 14, y: 20, navKind: "openWater" });
  assert.deepEqual(visited, [[10, 20], [14, 20]]);
});

test("NPC visual placement can restrict a river-first search by navigation kind", () => {
  const placement = findNpcVisualPlacement({
    origin: { x: 0, y: 0 },
    searchRadiusPx: 4,
    radialStepPx: 2,
    angleCount: 4,
    includeOrigin: false,
    evaluate: (x, y) => ({
      x,
      y,
      navKind: x > 0 ? "openWater" : "river"
    }),
    accept: (candidate) => candidate.navKind === "river"
  });

  assert.equal(placement.navKind, "river");
  assert.ok(placement.x <= 0);
});

test("NPC visual placement returns null when no full-hull candidate is clear", () => {
  assert.equal(findNpcVisualPlacement({
    origin: { x: 0, y: 0 },
    searchRadiusPx: 4,
    radialStepPx: 2,
    angleCount: 4,
    evaluate: () => null
  }), null);
});
