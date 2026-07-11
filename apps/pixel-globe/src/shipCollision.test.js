import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveShipCollision,
  separateTouchingShips,
  shipCollisionRadius
} from "./shipCollision.js";

test("colliding ships exchange momentum and separate along the impact normal", () => {
  const result = resolveShipCollision(
    body("a", -4, 0, 4, 0, 100, 1, 0),
    body("b", 4, 0, -4, 0, 100, -1, 0)
  );

  assert.ok(result);
  assert.ok(result.a.vx < 0);
  assert.ok(result.b.vx > 0);
  assert.ok(result.a.correctionX < 0);
  assert.ok(result.b.correctionX > 0);
  assert.equal(result.a.damage, 1);
  assert.equal(result.b.damage, 1);
});

test("the lighter ship takes more collision damage", () => {
  const result = resolveShipCollision(
    body("light", -4, 0, 5, 0, 50, 0, 1),
    body("heavy", 4, 0, -3, 0, 200, -1, 0)
  );

  assert.ok(result.a.damage > result.b.damage, JSON.stringify(result));
});

test("a broadside impact causes more damage than a bow-on impact", () => {
  const sideOn = resolveShipCollision(
    body("target", -4, 0, 4, 0, 100, 0, 1),
    body("rammer", 4, 0, -4, 0, 100, -1, 0)
  );
  const bowOn = resolveShipCollision(
    body("target", -4, 0, 4, 0, 100, 1, 0),
    body("rammer", 4, 0, -4, 0, 100, -1, 0)
  );

  assert.ok(sideOn.a.damage > bowOn.a.damage);
});

test("slow overlap separates ships without hull damage", () => {
  const result = resolveShipCollision(
    body("a", -2, 0, 0.2, 0, 100, 1, 0),
    body("b", 2, 0, -0.2, 0, 100, -1, 0)
  );

  assert.equal(result.a.damage, 0);
  assert.equal(result.b.damage, 0);
});

test("collision radius grows sublinearly with ship mass", () => {
  assert.ok(shipCollisionRadius(600) > shipCollisionRadius(60));
  assert.ok(shipCollisionRadius(600) < shipCollisionRadius(60) * 2);
});

test("combat entry separation adds padding without applying a collision impulse", () => {
  const a = body("a", -6, 0, 4, 0, 100, 1, 0);
  const b = body("b", 6, 0, -4, 0, 100, -1, 0);
  const separation = separateTouchingShips(a, b, 3);

  assert.ok(separation);
  assert.equal(separation.penetration, 3);
  assert.equal(separation.a.correctionX, -1.5);
  assert.equal(separation.b.correctionX, 1.5);
  assert.equal(separation.a.vx, undefined);
  assert.equal(separation.a.damage, undefined);
});

function body(id, x, y, vx, vy, mass, headingX, headingY) {
  return {
    id,
    x,
    y,
    vx,
    vy,
    mass,
    headingX,
    headingY,
    radius: 6
  };
}
