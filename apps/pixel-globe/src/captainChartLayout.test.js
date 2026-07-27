import assert from "node:assert/strict";
import test from "node:test";

import {
  captainChartHeaderLayout,
  captainNotebookFrameLayout,
  captainNotebookLayout
} from "./captainChartLayout.js";

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

test("captain notebook gives nine labeled tabs a side rail on the landscape canvas", () => {
  const layout = captainNotebookLayout({
    panel: { x: 12, y: 6, w: 430, h: 244 },
    actionCount: 9,
    desiredRailWidth: 112
  });
  assert.equal(layout.placement, "side");
  assert.deepEqual(layout.rail, { x: 12, y: 6, w: 112, h: 244 });
  assert.deepEqual(layout.page, { x: 124, y: 6, w: 318, h: 244 });
  assert.equal(layout.tabs.length, 9);
  assert.equal(layout.tabs[0].h, 24);
  assert.deepEqual(layout.tabs[0], { x: 16, y: 12, w: 109, h: 24 });
  assert.deepEqual(layout.tabs[8], { x: 16, y: 212, w: 109, h: 24 });
});

test("captain notebook gives a narrow portrait canvas an icon-only bottom row", () => {
  const layout = captainNotebookLayout({
    panel: { x: 6, y: 18, w: 244, h: 420 },
    actionCount: 9,
    desiredRailWidth: 112
  });
  assert.equal(layout.placement, "bottom");
  assert.deepEqual(layout.rail, { x: 6, y: 402, w: 244, h: 36 });
  assert.deepEqual(layout.page, { x: 6, y: 18, w: 244, h: 384 });
  assert.deepEqual(layout.tabs[0], { x: 16, y: 402, w: 24, h: 24 });
  assert.deepEqual(layout.tabs[8], { x: 216, y: 402, w: 24, h: 24 });
});

test("captain notebook frame reserves a top-right close button beside a landscape notebook", () => {
  const frame = captainNotebookFrameLayout({
    screenWidth: 455,
    screenHeight: 256,
    actionCount: 9,
    desiredRailWidth: 112,
    desiredPanelWidth: 430,
    desiredPanelHeight: 420,
    closeButtonSize: 24
  });
  assert.equal(frame.portrait, false);
  assert.deepEqual(frame.closeButtonRect, { x: 426, y: 5, w: 24, h: 24 });
  assert.deepEqual(frame.panel, { x: 6, y: 6, w: 415, h: 244 });
  assert.equal(frame.notebook.placement, "side");
  assert.deepEqual(frame.notebook.page, { x: 118, y: 6, w: 303, h: 244 });
});

test("captain notebook frame reserves its top corner and attaches tabs below a portrait page", () => {
  const frame = captainNotebookFrameLayout({
    screenWidth: 256,
    screenHeight: 460,
    actionCount: 9,
    desiredRailWidth: 112,
    desiredPanelWidth: 430,
    desiredPanelHeight: 420,
    closeButtonSize: 24
  });
  assert.equal(frame.portrait, true);
  assert.deepEqual(frame.closeButtonRect, { x: 227, y: 5, w: 24, h: 24 });
  assert.deepEqual(frame.panel, { x: 6, y: 34, w: 244, h: 420 });
  assert.equal(frame.notebook.placement, "bottom");
  assert.deepEqual(frame.notebook.page, { x: 6, y: 34, w: 244, h: 384 });
  assert.equal(frame.notebook.tabs[0].y, frame.notebook.page.y + frame.notebook.page.h);
});

test("captain notebook rejects canvases that cannot fit readable tabs", () => {
  assert.throws(
    () => captainNotebookLayout({
      panel: { x: 0, y: 0, w: 160, h: 244 },
      actionCount: 9,
      desiredRailWidth: 100
    }),
    /too narrow/
  );
  assert.throws(
    () => captainNotebookLayout({
      panel: { x: 0, y: 0, w: 300, h: 160 },
      actionCount: 9,
      desiredRailWidth: 100
    }),
    /too short/
  );
});
