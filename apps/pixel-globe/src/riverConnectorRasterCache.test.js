import assert from "node:assert/strict";
import test from "node:test";

import {
  riverConnectorRasterKey,
  riverConnectorWaterRasterCacheKey
} from "./riverConnectorRasterCache.js";

test("equivalent river connector calls share a stable raster key", () => {
  assert.equal(riverConnectorRasterKey({ a: 14, b: 92 }), "14:92");
  assert.equal(riverConnectorRasterKey({ a: 92, b: 14 }), "14:92");
  assert.equal(
    riverConnectorRasterKey({ a: 14, b: 92, drawSurfaceX: 500 }),
    riverConnectorRasterKey({ a: 14, b: 92, drawSurfaceX: -300 })
  );
});

test("a river connector cannot key an invalid endpoint pair", () => {
  assert.throws(() => riverConnectorRasterKey({ a: 4, b: 4 }), /distinct tile ids/);
  assert.throws(() => riverConnectorRasterKey({ a: 4 }), /distinct tile ids/);
});

test("river water raster cache keys change only with raster geometry and mouth state", () => {
  const call = { a: 14, b: 92, aMouth: true, bMouth: false, aWater: false, bWater: true };
  const geometry = {
    path: { x0: 10, y0: 20, cx: 15, cy: 24, x1: 21, y1: 29 },
    a: { x: 10, y: 20 },
    b: { x: 21, y: 29 }
  };
  const key = riverConnectorWaterRasterCacheKey(call, geometry);
  assert.equal(riverConnectorWaterRasterCacheKey({ ...call }, structuredClone(geometry)), key);
  assert.notEqual(
    riverConnectorWaterRasterCacheKey(call, {
      ...geometry,
      path: { ...geometry.path, x1: geometry.path.x1 + 1 }
    }),
    key
  );
  assert.notEqual(riverConnectorWaterRasterCacheKey({ ...call, aMouth: false }, geometry), key);
});
