import assert from "node:assert/strict";
import test from "node:test";

import { fittedStackedMenuRows, scrollableStackedMenuRows } from "./stackedMenuLayout.js";

test("start menu compacts rows while retaining visible separation", () => {
  const layout = fittedStackedMenuRows({
    startY: 80,
    endY: 234,
    rowCount: 7,
    preferredRowHeight: 24,
    minimumRowHeight: 18,
    preferredGap: 3,
    minimumGap: 1
  });

  assert.equal(layout.rowHeight, 21);
  assert.equal(layout.gap, 1);
  assert.deepEqual(layout.rows.at(-1), { y: 212, h: 21 });
  assert.ok(layout.rows.at(-1).y + layout.rows.at(-1).h <= 234);
});

test("a ten-row stacked menu fits inside the native 256px canvas", () => {
  const layout = fittedStackedMenuRows({
    startY: 45,
    endY: 237,
    rowCount: 10,
    preferredRowHeight: 20,
    minimumRowHeight: 18,
    preferredGap: 2,
    minimumGap: 1
  });

  assert.equal(layout.rowHeight, 18);
  assert.equal(layout.gap, 1);
  assert.deepEqual(layout.rows.at(-1), { y: 216, h: 18 });
  assert.ok(layout.rows.at(-1).y + layout.rows.at(-1).h <= 237);
});

test("key binding rows compact above a fixed footer without overlapping it", () => {
  const layout = fittedStackedMenuRows({
    startY: 45,
    endY: 193,
    rowCount: 7,
    preferredRowHeight: 23,
    minimumRowHeight: 18,
    preferredGap: 1,
    minimumGap: 0
  });

  assert.equal(layout.rowHeight, 21);
  assert.equal(layout.gap, 0);
  assert.equal(layout.rows.at(-1).y + layout.rows.at(-1).h, 192);
});

test("stacked menus fail loudly when the requested controls cannot fit", () => {
  assert.throws(
    () => fittedStackedMenuRows({
      startY: 0,
      endY: 50,
      rowCount: 3,
      preferredRowHeight: 20,
      minimumRowHeight: 18,
      preferredGap: 2,
      minimumGap: 1
    }),
    /cannot fit/
  );
});

test("options menu scrolls its eleventh row at native landscape height", () => {
  const layout = scrollableStackedMenuRows({
    startY: 44,
    endY: 238,
    rowCount: 11,
    selectedIndex: 10,
    scrollOffset: 0,
    preferredRowHeight: 20,
    minimumRowHeight: 18,
    preferredGap: 2,
    minimumGap: 1
  });

  assert.equal(layout.visibleCount, 10);
  assert.equal(layout.scrollOffset, 1);
  assert.equal(layout.rows[0].index, 1);
  assert.equal(layout.rows.at(-1).index, 10);
  assert.equal(layout.canScrollUp, true);
  assert.equal(layout.canScrollDown, false);
});

test("tall phone options menu shows all eleven rows without scrolling", () => {
  const layout = scrollableStackedMenuRows({
    startY: 140,
    endY: 380,
    rowCount: 11,
    selectedIndex: 0,
    scrollOffset: 0,
    preferredRowHeight: 20,
    minimumRowHeight: 18,
    preferredGap: 2,
    minimumGap: 1
  });

  assert.equal(layout.visibleCount, 11);
  assert.equal(layout.rowHeight, 20);
  assert.equal(layout.gap, 2);
  assert.equal(layout.canScrollUp, false);
  assert.equal(layout.canScrollDown, false);
});
