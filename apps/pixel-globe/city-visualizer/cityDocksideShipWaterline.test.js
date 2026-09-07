import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "../../../examples/globe-demo/node_modules/canvas/index.js";

import {
  DOCKSIDE_SHIP_WATERLINE_RGB,
  drawDryDocksideShipOverlay,
  docksideShipHullBarLayout,
  docksideShipWaterlinePixelKeys
} from "./cityDocksideShipWaterline.js";

test("boarding foreground cannot repaint a submerged rudder", () => {
  const foreground = createCanvas(8, 12);
  const above = createCanvas(8, 12);
  const result = createCanvas(8, 12);
  foreground.getContext("2d").fillRect(2, 2, 4, 10);
  above.getContext("2d").fillRect(1, 1, 6, 4);
  const context = result.getContext("2d");
  drawDryDocksideShipOverlay(context, foreground, above);
  const rgba = context.getImageData(0, 0, 8, 12).data;
  assert.equal(rgba[(3 * 8 + 3) * 4 + 3], 255, "dry railing still occludes boarders");
  assert.equal(rgba[(9 * 8 + 3) * 4 + 3], 0, "rudder stays translucent beneath the overlay");
  assert.equal(context.globalCompositeOperation, "source-over");
  assert.throws(() => drawDryDocksideShipOverlay(context, foreground, createCanvas(7, 12)), /matching/);
});

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
