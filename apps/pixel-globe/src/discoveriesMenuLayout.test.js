import assert from "node:assert/strict";
import test from "node:test";

import { discoveriesMenuHeaderLayout } from "./discoveriesMenuLayout.js";

test("discoveries tabs sit below the close button without overlap", () => {
  const layout = discoveriesMenuHeaderLayout({
    panelRect: { x: 77, y: 18, w: 300, h: 220 },
    closeButtonSize: 24,
    tabHeight: 24
  });

  assert.equal(layout.bodyOffsetY, 6);
  assert.equal(layout.closeButtonRect.y + layout.closeButtonRect.h + 3, layout.tabRects[0].rect.y);
  assert.equal(rectsOverlap(layout.closeButtonRect, layout.tabRects[1].rect), false);
  assert.equal(layout.tabRects[0].rect.w, layout.tabRects[1].rect.w);
});

test("discoveries tabs remain inside a narrow responsive panel", () => {
  const panelRect = { x: 6, y: 6, w: 244, h: 220 };
  const layout = discoveriesMenuHeaderLayout({
    panelRect,
    closeButtonSize: 24,
    tabHeight: 24
  });
  const animalsRect = layout.tabRects[1].rect;

  assert.ok(animalsRect.x >= panelRect.x);
  assert.ok(animalsRect.x + animalsRect.w <= panelRect.x + panelRect.w);
  assert.equal(rectsOverlap(layout.closeButtonRect, animalsRect), false);
});

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}
