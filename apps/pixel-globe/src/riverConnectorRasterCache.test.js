import assert from "node:assert/strict";
import test from "node:test";

import { riverConnectorRasterKey } from "./riverConnectorRasterCache.js";

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
