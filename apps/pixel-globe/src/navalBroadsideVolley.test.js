import assert from "node:assert/strict";
import test from "node:test";

import { cannonWeaponWithEquipment, STANDARD_CANNON_EQUIPMENT_ID } from "./cannonEquipment.js";
import {
  createNavalBroadsideVolley,
  navalBroadsideDirection,
  navalBroadsideSideForTarget
} from "./navalBroadsideVolley.js";
import { navalWeaponForShip } from "./navalWeapons.js";

const WEAPON = cannonWeaponWithEquipment(
  navalWeaponForShip({ cannons: 8 }),
  STANDARD_CANNON_EQUIPMENT_ID
);
const ORIGIN = Object.freeze({ x: 100, y: 100 });
const HEADING = Object.freeze({ x: 1, y: 0 });
const FOOTPRINT = Object.freeze([
  Object.freeze({ x: 90, y: 96 }),
  Object.freeze({ x: 110, y: 96 }),
  Object.freeze({ x: 110, y: 104 }),
  Object.freeze({ x: 90, y: 104 })
]);

test("shared player broadside geometry keeps one exact centerline shot", () => {
  const volley = createNavalBroadsideVolley({
    origin: ORIGIN,
    heading: HEADING,
    hullFootprint: FOOTPRINT,
    sideName: "port",
    projectileCount: 4,
    weapon: WEAPON,
    randomUnit: () => 0.9,
    seedForShot: (index) => index + 1
  });
  const trueShots = volley.filter((shot) => shot.trueShot);
  assert.equal(trueShots.length, 1);
  assert.ok(Math.abs(trueShots[0].targetX - trueShots[0].startX) < 1e-9);
  assert.ok(trueShots[0].targetY < trueShots[0].startY);
  assert.equal(trueShots[0].targetAimed, false);
});

test("shared AI broadside geometry aims the true shot at its designated target", () => {
  const target = { x: 100, y: 45 };
  const volley = createNavalBroadsideVolley({
    origin: ORIGIN,
    heading: HEADING,
    hullFootprint: FOOTPRINT,
    sideName: "port",
    projectileCount: 3,
    weapon: WEAPON,
    targetPoint: target,
    aimAtTarget: true,
    randomUnit: () => 0.5,
    seedForShot: (index) => index + 10
  });
  const trueShot = volley.find((shot) => shot.trueShot);
  assert.deepEqual({ x: trueShot.targetX, y: trueShot.targetY }, target);
  assert.equal(trueShot.targetAimed, true);
});

test("shared broadside side conventions match player and AI targeting", () => {
  const port = navalBroadsideDirection(HEADING, "port");
  const starboard = navalBroadsideDirection(HEADING, "starboard");
  assert.ok(Math.abs(port.x) < 1e-9);
  assert.equal(port.y, -1);
  assert.ok(Math.abs(starboard.x) < 1e-9);
  assert.equal(starboard.y, 1);
  assert.equal(navalBroadsideSideForTarget(HEADING, ORIGIN, { x: 100, y: 40 }), "port");
  assert.equal(navalBroadsideSideForTarget(HEADING, ORIGIN, { x: 100, y: 160 }), "starboard");
  assert.equal(navalBroadsideSideForTarget(HEADING, ORIGIN, { x: 160, y: 100 }), null);
});
