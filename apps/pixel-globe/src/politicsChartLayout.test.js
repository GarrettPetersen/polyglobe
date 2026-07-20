import assert from "node:assert/strict";
import test from "node:test";

import { politicsChartHeaderLayout } from "./politicsChartLayout.js";

test("politics chart gives every English header band its own row", () => {
  const layout = politicsChartHeaderLayout({ panelY: 8, fontSize: 8 });
  assert.deepEqual(layout, {
    titleY: 17,
    legendY: 35,
    sectionY: 47,
    headerY: 58,
    columnCodeY: 70,
    matrixY: 74,
    matrixTopOffset: 66
  });
  assert.ok(layout.sectionY >= layout.legendY + 8 + 4);
  assert.ok(layout.headerY >= layout.sectionY + 8 + 3);
});

test("tall localized politics fonts move labels and matrix together", () => {
  const layout = politicsChartHeaderLayout({ panelY: 8, fontSize: 12 });
  assert.equal(layout.legendY, 35);
  assert.equal(layout.sectionY, 51);
  assert.equal(layout.headerY, 66);
  assert.equal(layout.matrixY, 86);
  assert.equal(layout.matrixTopOffset, 78);
});

test("politics chart rejects malformed font geometry", () => {
  assert.throws(
    () => politicsChartHeaderLayout({ panelY: 0, fontSize: 0 }),
    /font size must be a positive integer/
  );
});
