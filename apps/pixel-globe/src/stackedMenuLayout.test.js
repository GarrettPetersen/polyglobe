import assert from "node:assert/strict";
import test from "node:test";

import { fittedStackedMenuRows } from "./stackedMenuLayout.js";

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

test("options menu fits all ten controls inside the native 256px canvas", () => {
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
