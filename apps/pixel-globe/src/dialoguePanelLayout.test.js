import assert from "node:assert/strict";
import test from "node:test";

import { dialoguePanelGeometry } from "./dialoguePanelLayout.js";

test("portrait greetings use a compact content-height panel", () => {
  const layout = dialoguePanelGeometry({
    screenWidth: 256,
    screenHeight: 455,
    contentHeight: 117
  });

  assert.deepEqual(layout.panel, { x: 6, y: 96, w: 244, h: 117 });
  assert.deepEqual(layout.portrait, { x: 22, y: 40 });
  assert.ok(layout.panel.y + layout.panel.h < 455 * 0.5);
});

test("operational dialogue uses only the height its options need", () => {
  const layout = dialoguePanelGeometry({
    screenWidth: 256,
    screenHeight: 455,
    contentHeight: 159
  });

  assert.deepEqual(layout.panel, { x: 6, y: 96, w: 244, h: 159 });
});

test("long dialogue clamps to the available height for scrolling", () => {
  const layout = dialoguePanelGeometry({
    screenWidth: 256,
    screenHeight: 455,
    contentHeight: 500
  });

  assert.deepEqual(layout.panel, { x: 6, y: 96, w: 244, h: 352 });
});

test("landscape greetings remain compact without moving the portrait down", () => {
  const layout = dialoguePanelGeometry({
    screenWidth: 455,
    screenHeight: 256,
    contentHeight: 127
  });

  assert.deepEqual(layout.panel, { x: 6, y: 78, w: 443, h: 127 });
  assert.deepEqual(layout.portrait, { x: 22, y: 22 });
});
