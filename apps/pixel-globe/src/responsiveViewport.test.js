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

test("ultrawide displays extend the world view instead of falling back to 16:9", () => {
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 21, viewportHeight: 9 }),
    { width: 597, height: 256 }
  );
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 32, viewportHeight: 9 }),
    { width: 910, height: 256 }
  );
});

test("extra-tall displays extend the world view vertically", () => {
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 9, viewportHeight: 21 }),
    { width: 256, height: 597 }
  );
});

test("pathological browser dimensions cannot allocate an unbounded canvas", () => {
  assert.deepEqual(
    responsiveLogicalViewport({ viewportWidth: 100, viewportHeight: 1 }),
    { width: 2048, height: 256 }
  );
  assert.throws(() => responsiveLogicalViewport({
    viewportWidth: 16,
    viewportHeight: 9,
    maximumExtendedDimension: 400
  }), /maximumExtendedDimension/);
});

test("logical viewport validation rejects malformed dimensions", () => {
  assert.throws(() => responsiveLogicalViewport({
    viewportWidth: 0,
    viewportHeight: 9
  }), /Invalid viewportWidth/);
  assert.throws(() => responsiveLogicalViewport({
    viewportWidth: 16,
    viewportHeight: 9,
    minimumDimension: 500
  }), /minimumDimension/);
});

test("a 32:9 logical canvas still uses the full monitor aspect", () => {
  const viewport = responsiveLogicalViewport({ viewportWidth: 5120, viewportHeight: 1440 });
  assert.deepEqual(viewport, { width: 910, height: 256 });
  assert.ok(Math.abs(viewport.width / viewport.height - 5120 / 1440) < 0.002);
});
