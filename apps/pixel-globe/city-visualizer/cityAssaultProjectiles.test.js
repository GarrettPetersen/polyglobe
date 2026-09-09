import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { cityAssaultProjectile, drawCityAssaultProjectile } from "./cityAssaultProjectiles.js";

test("arrows arc across the shot while balls travel on a straight line in either direction", () => {
  for (const direction of [-1, 1]) {
    const start = { x: direction > 0 ? 20 : 180, y: 40 };
    const end = { x: direction > 0 ? 180 : 20, y: 40 };
    const arrow = cityAssaultProjectile("arrow", start, end, 200);
    const ball = cityAssaultProjectile("firearm", start, end, 100);
    assert.equal(arrow.head.x, 100);
    assert.ok(arrow.head.y < 40);
    assert.deepEqual(ball.head, { x: 100, y: 40 });
    for (const [kind, duration] of [["arrow", 400], ["firearm", 200]]) {
      assert.equal(cityAssaultProjectile(kind, start, end, -1), null);
      assert.equal(cityAssaultProjectile(kind, start, end, duration), null);
      assert.ok(Math.abs(cityAssaultProjectile(kind, start, end, duration - 1).head.x - end.x) <= 1);
    }
  }
});

test("projectile pixels appear in flight away from the muzzle, then disappear", () => {
  for (const [kind, age] of [["arrow", 200], ["firearm", 100]]) {
    const canvas = createCanvas(200, 80);
    const context = canvas.getContext("2d");
    drawCityAssaultProjectile(context, kind, { x: 20, y: 40 }, { x: 180, y: 40 }, age);
    assert.ok(context.getImageData(90, 15, 15, 30).data.some((value, index) => index % 4 === 3 && value === 255));
    assert.ok(context.getImageData(15, 30, 10, 20).data.every(value => value === 0));
    context.clearRect(0, 0, 200, 80);
    drawCityAssaultProjectile(context, kind, { x: 20, y: 40 }, { x: 180, y: 40 }, 4000);
    assert.ok(context.getImageData(0, 0, 200, 80).data.every(value => value === 0));
  }
  assert.throws(() => cityAssaultProjectile("melee", { x: 0, y: 0 }, { x: 1, y: 1 }, 0), /Invalid/);
});
