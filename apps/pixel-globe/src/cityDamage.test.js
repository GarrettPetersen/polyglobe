import assert from "node:assert/strict";
import test from "node:test";
import { cityCrackSegments } from "./cityDamage.js";

test("disabled city cracks are deterministic, branching, and pixel aligned", () => {
  const first = cityCrackSegments(1522, 36, 36);
  const second = cityCrackSegments(1522, 36, 36);

  assert.deepEqual(first, second);
  assert.ok(first.length >= 6);
  assert.ok(first.some((segment, index) => index > 0 && (
    segment.x0 === first[0].x1 && segment.y0 === first[0].y1
  )));
  for (const segment of first) {
    for (const value of Object.values(segment)) assert.equal(Number.isInteger(value), true);
    assert.ok(segment.x0 >= 0 && segment.x0 < 36);
    assert.ok(segment.x1 >= 0 && segment.x1 < 36);
    assert.ok(segment.y0 >= 0 && segment.y0 < 36);
    assert.ok(segment.y1 >= 0 && segment.y1 < 36);
  }
});

test("different cities receive different crack patterns", () => {
  assert.notDeepEqual(cityCrackSegments(7, 36, 36), cityCrackSegments(8, 36, 36));
});

test("city crack geometry rejects malformed raster inputs", () => {
  assert.throws(() => cityCrackSegments(1.5, 36, 36), /seed must be an integer/);
  assert.throws(() => cityCrackSegments(1, 12, 36), /at least 16x16/);
});
