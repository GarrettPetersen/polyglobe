import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION,
  SHIP_BAKE_LIGHT_DIRECTION,
  shipBakeLightScale
} from "./shipBakeLighting.js";

test("ship bake light comes from high over the viewer's right shoulder", () => {
  assert.ok(SHIP_BAKE_LIGHT_DIRECTION.x > 0);
  assert.ok(SHIP_BAKE_LIGHT_DIRECTION.y > SHIP_BAKE_LIGHT_DIRECTION.x);
  assert.ok(SHIP_BAKE_LIGHT_DIRECTION.z > 0);
  assert.ok(shipBakeLightScale({ x: 1, y: 0, z: 0 }) > shipBakeLightScale({ x: -1, y: 0, z: 0 }));
  assert.ok(shipBakeLightScale({ x: 0, y: 1, z: 0 }) > shipBakeLightScale({ x: 0, y: 0, z: 1 }));
});

test("dockside shadows use a very high sun while retaining the left-cast direction", () => {
  const light = CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION;
  const horizontal = Math.hypot(light.x, light.z);
  assert.ok(light.x > 0);
  assert.ok(light.z > 0);
  assert.ok(light.y / horizontal > 5);
});

test("ship bake lighting remains bounded and rejects malformed normals", () => {
  assert.equal(shipBakeLightScale({ x: -1, y: 0, z: 0 }), 0.62);
  assert.ok(shipBakeLightScale(SHIP_BAKE_LIGHT_DIRECTION) <= 1);
  assert.throws(
    () => shipBakeLightScale({ x: Number.NaN, y: 0, z: 1 }),
    /finite surface normal/
  );
});
