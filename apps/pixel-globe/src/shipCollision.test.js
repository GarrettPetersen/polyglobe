import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveShipCollision,
  separateTouchingShips
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
  assert.ok(sideOn.a.impact.sideExposure > bowOn.a.impact.sideExposure);
});

test("a smaller ship can deal decisive damage by ramming a larger ship broadside", () => {
  const result = resolveShipCollision(
    body("small-rammer", -4, 0, 9, 0, 50, 1, 0),
    body("large-target", 4, 0, 0, 0, 200, 0, 1)
  );

  assert.equal(result.a.impact.outgoingBow, 1);
  assert.equal(result.b.impact.incomingBow, 1);
  assert.equal(result.b.impact.sideExposure, 1);
  assert.ok(result.b.damage >= 4, JSON.stringify(result));
  assert.ok(result.b.damage > result.a.damage, JSON.stringify(result));
});

test("moving sideways into a ship does not receive a bow ramming bonus", () => {
  const result = resolveShipCollision(
    body("sideways", -4, 0, 9, 0, 50, 0, 1),
    body("target", 4, 0, 0, 0, 200, 0, 1)
  );

  assert.equal(result.a.impact.outgoingBow, 0);
  assert.equal(result.b.impact.incomingBow, 0);
});

test("the bow is strongest, the stern is vulnerable, and the broadside is weakest", () => {
  const bow = resolveShipCollision(
    body("target", -4, 0, 0, 0, 100, 1, 0),
    body("rammer", 4, 0, -8, 0, 100, -1, 0)
  );
  const stern = resolveShipCollision(
    body("target", -4, 0, 0, 0, 100, -1, 0),
    body("rammer", 4, 0, -8, 0, 100, -1, 0)
  );
  const side = resolveShipCollision(
    body("target", -4, 0, 0, 0, 100, 0, 1),
    body("rammer", 4, 0, -8, 0, 100, -1, 0)
  );

  assert.ok(bow.a.damage < stern.a.damage, JSON.stringify({ bow, stern }));
  assert.ok(stern.a.damage < side.a.damage, JSON.stringify({ stern, side }));
});

test("slow overlap separates ships without hull damage", () => {
  const result = resolveShipCollision(
    body("a", -2, 0, 0.2, 0, 100, 1, 0),
    body("b", 2, 0, -0.2, 0, 100, -1, 0)
  );

  assert.equal(result.a.damage, 0);
  assert.equal(result.b.damage, 0);
});

test("parallel narrow hull footprints can pass without a circular false collision", () => {
  const a = body("a", 0, -4, 1, 0, 100, 1, 0);
  const b = body("b", 0, 4, -1, 0, 100, -1, 0);
  assert.equal(resolveShipCollision(a, b), null);
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
    footprint: [
      { x: x - 6, y: y - 3 },
      { x: x + 6, y: y - 3 },
      { x: x + 6, y: y + 3 },
      { x: x - 6, y: y + 3 }
    ]
  };
}
