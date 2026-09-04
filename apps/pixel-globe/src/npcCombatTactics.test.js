import assert from "node:assert/strict";
import test from "node:test";

import {
  NPC_COMBAT_CURRENT_TACTIC_ID,
  NPC_COMBAT_TACTIC_INTERCEPT_ID,
  npcBroadsideNavigation,
  npcCombatAimPointForTactic,
  npcCombatNavigationForTactic,
  npcProjectileInterceptPoint
} from "./npcCombatTactics.js";

const RANGE = 74;
const ROUTE_DISTANCE = 110;

test("a broadside ship turns away from a bow-on firing target", () => {
  const navigation = course({
    target: { x: 50, y: 0 },
    heading: { x: 1, y: 0 }
  });

  assert.ok(Math.abs(navigation.course.y) > Math.abs(navigation.course.x));
  assert.ok(navigation.course.x < 0.1);
});

test("a broadside ship chooses the firing side requiring the smaller turn", () => {
  const navigation = course({
    target: { x: 60, y: 0 },
    heading: { x: 0, y: -1 }
  });

  assert.equal(navigation.broadsideSide, "starboard");
  assert.ok(navigation.course.y < 0);
});

test("a broadside ship begins curving before entering cannon range", () => {
  const navigation = course({
    target: { x: RANGE * 1.5, y: 0 },
    heading: { x: 1, y: 0 }
  });

  assert.ok(navigation.course.x > 0);
  assert.ok(Math.abs(navigation.course.y) > 0.25);
});

test("a distant broadside ship closes directly until turn-in range", () => {
  const navigation = course({
    target: { x: RANGE * 2.2, y: 0 },
    heading: { x: 0, y: -1 }
  });

  assert.deepEqual(navigation.course, { x: 1, y: 0 });
});

test("a ship inside collision range combines withdrawal with a turn", () => {
  const navigation = course({
    target: { x: RANGE * 0.15, y: 0 },
    heading: { x: 1, y: 0 }
  });

  assert.ok(navigation.course.x < -0.65);
  assert.ok(Math.abs(navigation.course.y) > 0.35);
});

test("combat navigation rejects malformed tactical inputs", () => {
  assert.throws(() => course({ identity: "" }), /ship identity/);
  assert.throws(() => course({ heading: { x: 0, y: 0 } }), /zero length/);
  assert.throws(() => course({ weaponRangePx: 0 }), /weapon range/);
});

test("intercept aim leads a crossing target by a measured fraction", () => {
  const fullIntercept = npcProjectileInterceptPoint({
    origin: { x: 0, y: 0 },
    target: { x: 10, y: 0 },
    targetVelocity: { x: 0, y: 1 },
    projectileSpeedPx: 10
  });
  const tacticalAim = npcCombatAimPointForTactic(NPC_COMBAT_TACTIC_INTERCEPT_ID, {
    origin: { x: 0, y: 0 },
    target: { x: 10, y: 0 },
    targetVelocity: { x: 0, y: 1 },
    projectileSpeedPx: 10
  });

  assert.ok(Math.abs(fullIntercept.x - 10) < 1e-9);
  assert.ok(fullIntercept.y > 1 && fullIntercept.y < 1.01);
  assert.ok(tacticalAim.y > 0.45 && tacticalAim.y < 0.46);
  assert.equal(NPC_COMBAT_CURRENT_TACTIC_ID, NPC_COMBAT_TACTIC_INTERCEPT_ID);
});

test("combat tactic IDs fail loudly instead of selecting an implicit policy", () => {
  assert.throws(() => npcCombatNavigationForTactic("missing", {
    identity: "english-galleon-1",
    origin: { x: 0, y: 0 },
    target: { x: 50, y: 0 },
    heading: { x: 1, y: 0 },
    weaponRangePx: RANGE,
    routeDistancePx: ROUTE_DISTANCE
  }), /Unknown NPC combat tactic/);
});

function course(overrides = {}) {
  return npcBroadsideNavigation({
    identity: "english-galleon-1",
    origin: { x: 0, y: 0 },
    target: { x: 50, y: 0 },
    heading: { x: 1, y: 0 },
    weaponRangePx: RANGE,
    routeDistancePx: ROUTE_DISTANCE,
    ...overrides
  });
}
