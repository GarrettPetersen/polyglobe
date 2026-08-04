import assert from "node:assert/strict";
import test from "node:test";

import {
  proportionalStatusIconCounts,
  remainingSupplyDayCount,
  specialStatusIconCount,
  statusIconRowLayout
} from "./statusIconRow.js";

test("mixed food stocks share a fixed number of HUD icons", () => {
  assert.deepEqual(proportionalStatusIconCounts(12, [6, 3, 2, 1]), [6, 3, 2, 1]);
  assert.deepEqual(proportionalStatusIconCounts(4, [100, 0.1, 0.1, 0]), [2, 1, 1, 0]);
  assert.deepEqual(proportionalStatusIconCounts(1, [2, 8, 0, 0]), [0, 1, 0, 0]);
  assert.deepEqual(proportionalStatusIconCounts(0, [2, 8]), [0, 0]);
  assert.throws(() => proportionalStatusIconCounts(2, []), /non-empty array/);
  assert.throws(() => proportionalStatusIconCounts(2, [1, -1]), /must be non-negative/);
});

test("small status counts leave a pixel between icons", () => {
  const layout = statusIconRowLayout({ count: 3, x: 10, y: 20, width: 40, iconWidth: 6 });

  assert.equal(layout.pitch, 7);
  assert.equal(layout.representedCount, 3);
  assert.deepEqual(layout.entries.map((entry) => [entry.x, entry.y]), [
    [10, 20],
    [17, 20],
    [24, 20]
  ]);
});

test("larger stores overlap on integer pixels", () => {
  const layout = statusIconRowLayout({ count: 36, x: 5, y: 12, width: 80, iconWidth: 6 });

  assert.equal(layout.pitch, 2);
  assert.equal(layout.entries.at(-1).x, 75);
  assert.ok(layout.entries.every((entry) => Number.isInteger(entry.x)));
});

test("enormous stores draw at most one icon start per available pixel", () => {
  const layout = statusIconRowLayout({ count: 1000, x: 0, y: 0, width: 80, iconWidth: 6 });

  assert.equal(layout.pitch, 1);
  assert.equal(layout.representedCount, 75);
  assert.equal(layout.entries.at(-1).x, 74);
});

test("special status icons stay visible without adding another HUD count", () => {
  assert.equal(specialStatusIconCount(12, 3, 12), 3);
  assert.equal(specialStatusIconCount(12, 0.1, 12), 1);
  assert.equal(specialStatusIconCount(1, 0.1, 12), 1);
  assert.equal(specialStatusIconCount(12, 12, 12), 12);
  assert.equal(specialStatusIconCount(0, 3, 12), 0);
  assert.throws(() => specialStatusIconCount(4, 5, 4), /exceeds total/);
});

test("positive partial supply days remain visible in the HUD", () => {
  assert.equal(remainingSupplyDayCount(0), 0);
  assert.equal(remainingSupplyDayCount(0.01), 1);
  assert.equal(remainingSupplyDayCount(1), 1);
  assert.equal(remainingSupplyDayCount(1.01), 2);
  assert.throws(() => remainingSupplyDayCount(-0.1), /must be non-negative/);
});

test("empty and malformed status rows are handled explicitly", () => {
  assert.deepEqual(
    statusIconRowLayout({ count: 0, x: 0, y: 0, width: 20, iconWidth: 6 }).entries,
    []
  );
  assert.throws(
    () => statusIconRowLayout({ count: -1, x: 0, y: 0, width: 20, iconWidth: 6 }),
    /cannot be negative/
  );
  assert.throws(
    () => statusIconRowLayout({ count: 1, x: 0, y: 0, width: 5, iconWidth: 6 }),
    /too narrow/
  );
});
