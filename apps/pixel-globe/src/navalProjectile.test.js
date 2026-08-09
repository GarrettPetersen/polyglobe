import assert from "node:assert/strict";
import test from "node:test";

import {
  firstNavalProjectileHit,
  navalProjectileMayHitBystanders,
  navalProjectilePoint
} from "./navalProjectile.js";

test("naval projectile points follow their declared pixel arc", () => {
  const projectile = {
    startX: 10,
    startY: 20,
    targetX: 90,
    targetY: 60,
    age: 0.5,
    duration: 1,
    arcHeight: 3
  };
  assert.deepEqual(navalProjectilePoint(projectile), { x: 50, y: 40, z: 3 });
  assert.deepEqual(navalProjectilePoint(projectile, 1), { x: 90, y: 60, z: 0 });
});

test("a direct-fire projectile hits a ship crossed before its landing point", () => {
  const hit = firstNavalProjectileHit(
    { x: 0, y: 20 },
    { x: 100, y: 20 },
    [{ id: "crossed-ship", x: 45, y: 20, radius: 5 }]
  );

  assert.equal(hit.target.id, "crossed-ship");
  assert.equal(hit.fraction, 0.4);
  assert.deepEqual({ x: hit.x, y: hit.y }, { x: 40, y: 20 });
});

test("the first ship in a cannonball path takes the hit", () => {
  const hit = firstNavalProjectileHit(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    [
      { id: "far", x: 80, y: 0, radius: 5 },
      { id: "near", x: 30, y: 0, radius: 5 }
    ]
  );

  assert.equal(hit.target.id, "near");
  assert.equal(hit.x, 25);
});

test("ships outside the swept path are not hit", () => {
  assert.equal(firstNavalProjectileHit(
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    [{ id: "clear", x: 50, y: 8, radius: 5 }]
  ), null);
});

test("portable weapons stay locked to their selected enemy while full cannons can hit bystanders", () => {
  assert.equal(navalProjectileMayHitBystanders({ kind: "cannon" }), true);
  assert.equal(navalProjectileMayHitBystanders({ kind: "cannon", portable: false }), true);
  assert.equal(navalProjectileMayHitBystanders({ kind: "arrow", portable: true }), false);
  assert.equal(navalProjectileMayHitBystanders({ kind: "bullet", portable: true }), false);
  assert.equal(navalProjectileMayHitBystanders({ kind: "cannon", portable: true }), false);
});

test("projectile collision input fails loudly when malformed", () => {
  assert.throws(
    () => firstNavalProjectileHit({ x: 0, y: 0 }, { x: 1, y: 1 }, [{ id: "bad", x: 0, y: 0, radius: 0 }]),
    /Invalid naval projectile target/
  );
  assert.throws(
    () => navalProjectilePoint({ duration: 0 }),
    /Invalid naval projectile startX/
  );
  assert.throws(
    () => navalProjectileMayHitBystanders(null),
    /requires a projectile/
  );
});
