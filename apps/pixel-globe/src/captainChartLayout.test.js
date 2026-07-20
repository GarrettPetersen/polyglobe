import assert from "node:assert/strict";
import test from "node:test";

import { captainChartHeaderLayout } from "./captainChartLayout.js";

test("captain chart preserves its original compact English header", () => {
  assert.deepEqual(
    captainChartHeaderLayout({ panelY: 6, dialogueFontSize: 8, smallFontSize: 8 }),
    { titleY: 16, mappedY: 28, mapY: 40, mapTopOffset: 34 }
  );
});

test("tall localized fonts push the map below both header lines", () => {
  const layout = captainChartHeaderLayout({ panelY: 6, dialogueFontSize: 12, smallFontSize: 12 });
  assert.deepEqual(layout, { titleY: 16, mappedY: 32, mapY: 48, mapTopOffset: 42 });
  assert.ok(layout.mappedY + 12 < layout.mapY);
});

test("captain chart rejects malformed font geometry", () => {
  assert.throws(
    () => captainChartHeaderLayout({ panelY: 0, dialogueFontSize: 0, smallFontSize: 8 }),
    /font sizes must be positive/
  );
});
