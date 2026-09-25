import assert from "node:assert/strict";
import test from "node:test";

import { modalStatusBarLayout } from "./modalStatusBar.js";

const COMPACT = [
  { id: "date", width: 62 },
  { id: "doubloons", width: 58 },
  { id: "water", width: 22 },
  { id: "food", width: 22 },
  { id: "crew", width: 24 },
  { id: "cargo", width: 46 }
];

test("a wide modal status bar keeps every readout on one top row", () => {
  const layout = modalStatusBarLayout({
    screenWidth: 455,
    screenHeight: 256,
    items: COMPACT
  });

  assert.equal(layout.wide, true);
  assert.equal(layout.y, 0);
  assert.equal(layout.w, 455);
  assert.deepEqual(layout.items.map((item) => item.id), COMPACT.map((item) => item.id));
  assert.ok(layout.items.every((item) => item.y === layout.items[0].y));
  assertItemsInsideBar(layout);
});

test("a narrow modal status bar wraps instead of running off the screen", () => {
  const layout = modalStatusBarLayout({
    screenWidth: 256,
    screenHeight: 455,
    items: COMPACT.map((item) => ({ ...item, width: item.width + 24 }))
  });

  assert.equal(layout.wide, false);
  assert.ok(layout.items.some((item) => item.y > layout.items[0].y));
  assertItemsInsideBar(layout);
  assert.ok(layout.h < 80);
});

test("modal status bars reject a readout that cannot fit any row", () => {
  assert.throws(() => modalStatusBarLayout({
    screenWidth: 256,
    screenHeight: 256,
    items: COMPACT.map((item) => item.id === "date" ? { ...item, width: 300 } : item)
  }), /does not fit the bar: date/);
});

function assertItemsInsideBar(layout) {
  for (const item of layout.items) {
    assert.ok(item.x >= 0 && item.y >= 0);
    assert.ok(item.x + item.width <= layout.w);
    assert.ok(item.y + item.height <= layout.h);
  }
  for (let index = 0; index < layout.items.length; index++) {
    for (let other = index + 1; other < layout.items.length; other++) {
      assert.equal(overlaps(layout.items[index], layout.items[other]), false);
    }
  }
}

function overlaps(left, right) {
  return left.x < right.x + right.width && left.x + left.width > right.x &&
    left.y < right.y + right.height && left.y + left.height > right.y;
}
