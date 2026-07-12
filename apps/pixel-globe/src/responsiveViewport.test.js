import assert from "node:assert/strict";
import test from "node:test";
import { responsiveLogicalViewport } from "./responsiveViewport.js";

test("responsive viewport preserves the original landscape frame", () => {
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 16, viewportHeight: 9 }),
    { width: 455, height: 256 }
  );
});

test("responsive viewport rotates the original frame for portrait", () => {
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 9, viewportHeight: 16 }),
    { width: 256, height: 455 }
  );
});

test("responsive viewport preserves area on squarer displays", () => {
  const square = responsiveLogicalViewport({ viewportWidth: 1, viewportHeight: 1 });
  assert.deepEqual(square, { width: 341, height: 341 });
  assert.ok(Math.abs(square.width * square.height - 455 * 256) < 400);

  const tablet = responsiveLogicalViewport({ viewportWidth: 4, viewportHeight: 3 });
  assert.deepEqual(tablet, { width: 394, height: 296 });
});

test("extreme aspect ratios are letterboxed at the logical limits", () => {
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 22, viewportHeight: 9 }),
    { width: 455, height: 256 }
  );
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 9, viewportHeight: 22 }),
    { width: 256, height: 455 }
  );
});
