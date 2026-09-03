import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCKSIDE_SHIP_WATERLINE_RGB,
  docksideShipHullBarLayout,
  docksideShipWaterlinePixelKeys
} from "./cityDocksideShipWaterline.js";

test("dockside ship waterline selects only the top edge of submerged columns", () => {
  const submerged = new Set([
    1 + 2 * 5,
    1 + 3 * 5,
    2 + 3 * 5,
    2 + 4 * 5
  ]);
  assert.deepEqual(
    docksideShipWaterlinePixelKeys(submerged, 5, 5),
    new Set([1 + 2 * 5, 2 + 3 * 5])
  );
  assert.deepEqual(DOCKSIDE_SHIP_WATERLINE_RGB, { r: 77, g: 155, b: 230 });
});

test("dockside ship waterline rejects malformed bake coordinates", () => {
  assert.throws(
    () => docksideShipWaterlinePixelKeys(new Set([12]), 3, 4),
    /Invalid submerged/
  );
});

test("dockside ship hull bars sit below and center on the opaque silhouette", () => {
  assert.deepEqual(docksideShipHullBarLayout({
    x: 20,
    y: 30,
    scale: 2,
    opaqueMinX: 10,
    opaqueMaxX: 89,
    opaqueMaxY: 49,
    hitPoints: 45,
    maxHitPoints: 60,
    viewportWidth: 480,
    viewportHeight: 270
  }), {
    x: 96,
    y: 131,
    width: 48,
    height: 3,
    fillWidth: 35
  });
});

test("a hull bar remains visible when a large dockside ship extends below the viewport", () => {
  assert.equal(docksideShipHullBarLayout({
    x: -120,
    y: 80,
    scale: 1,
    opaqueMinX: 398,
    opaqueMaxX: 561,
    opaqueMaxY: 464,
    hitPoints: 30,
    maxHitPoints: 60,
    viewportWidth: 480,
    viewportHeight: 270
  }).y, 265);
});
