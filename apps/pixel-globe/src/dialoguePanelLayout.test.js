import assert from "node:assert/strict";
import test from "node:test";

import {
  dialogueOptionLayout,
  dialogueOptionNavigationLayout,
  dialoguePanelGeometry
} from "./dialoguePanelLayout.js";

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

  assert.deepEqual(layout.panel, { x: 6, y: 6, w: 244, h: 442 });
  assert.deepEqual(layout.portrait, { x: 22, y: 6 });
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

test("dialogue actions stay inside the panel when text requests too much height", () => {
  const layout = dialogueOptionLayout({
    desiredY: 310,
    bottom: 241,
    optionHeight: 24,
    optionCount: 2
  });

  assert.deepEqual(layout, {
    y: 217,
    bottom: 241,
    visibleCount: 1,
    needsScroll: true
  });
});

test("dialogue action layout keeps every option visible when room permits", () => {
  const layout = dialogueOptionLayout({
    desiredY: 160,
    bottom: 241,
    optionHeight: 24,
    optionCount: 3
  });

  assert.deepEqual(layout, {
    y: 160,
    bottom: 241,
    visibleCount: 3,
    needsScroll: false
  });
});

test("one-row dialogue paging keeps previous and next touch targets separate", () => {
  const navigation = dialogueOptionNavigationLayout({
    x: 15,
    y: 217,
    width: 220,
    visibleCount: 1,
    optionHeight: 24,
    buttonWidth: 24,
    buttonHeight: 24
  });

  assert.equal(navigation.direction, "horizontal");
  assert.deepEqual(navigation.previousRect, { x: 182, y: 217, w: 24, h: 24 });
  assert.deepEqual(navigation.nextRect, { x: 211, y: 217, w: 24, h: 24 });
  assert.equal(navigation.optionWidth, 162);
});

test("multi-row dialogue paging keeps vertical navigation at the side", () => {
  const navigation = dialogueOptionNavigationLayout({
    x: 15,
    y: 160,
    width: 220,
    visibleCount: 3,
    optionHeight: 24,
    buttonWidth: 24,
    buttonHeight: 24
  });

  assert.equal(navigation.direction, "vertical");
  assert.deepEqual(navigation.previousRect, { x: 211, y: 160, w: 24, h: 24 });
  assert.deepEqual(navigation.nextRect, { x: 211, y: 208, w: 24, h: 24 });
  assert.equal(navigation.optionWidth, 191);
});
