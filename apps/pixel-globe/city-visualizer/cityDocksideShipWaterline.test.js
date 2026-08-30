import assert from "node:assert/strict";
import test from "node:test";

import {
  DOCKSIDE_SHIP_WATERLINE_RGB,
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
