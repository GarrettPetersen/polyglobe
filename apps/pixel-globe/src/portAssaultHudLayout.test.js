import assert from "node:assert/strict";
import test from "node:test";
import { portAssaultHudLayout } from "./portAssaultHudLayout.js";

test("port assault status occupies a compact upper-left panel", () => {
  const layout = portAssaultHudLayout({
    viewportWidth: 480,
    viewportHeight: 270,
    rowWidths: [42, 61, 48]
  });
  assert.deepEqual(layout.panel, { x: 6, y: 6, w: 73, h: 36 });
  assert.deepEqual(layout.rows, [
    { x: 42, y: 10, width: 42 },
    { x: 42, y: 20, width: 61 },
    { x: 42, y: 30, width: 48 }
  ]);
  const narrowLayout = portAssaultHudLayout({
    viewportWidth: 320,
    viewportHeight: 180,
    rowWidths: [42, 61, 48]
  });
  assert.ok(narrowLayout.panel.x + narrowLayout.panel.w < (320 - 122) / 2,
    "the HUD should leave a centered long port title unobstructed at narrow widths");
});

test("port assault status rejects malformed and overflowing layouts", () => {
  assert.throws(
    () => portAssaultHudLayout({ viewportWidth: 480, viewportHeight: 270, rowWidths: [20, 30] }),
    /three positive integer row widths/
  );
  assert.throws(
    () => portAssaultHudLayout({ viewportWidth: 80, viewportHeight: 60, rowWidths: [100, 30, 40] }),
    /does not fit/
  );
});
