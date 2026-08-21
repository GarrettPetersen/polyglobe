import assert from "node:assert/strict";
import test from "node:test";

import {
  characterAlertChoiceTextLayout,
  characterAlertGeometry,
  dialogueExitFooterRects,
  dialogueFeedbackSlotCount,
  dialogueFeedbackTextLines,
  dialogueOverlayIsVisible,
  dialogueOptionGroups,
  dialogueOptionLayout,
  dialogueOptionMeasurementWidths,
  dialogueOptionNavigationLayout,
  dialogueOptionStackLayout,
  dialogueOptionTextLayout,
  dialogueOptionWindow,
  dialoguePanelGeometry
} from "./dialoguePanelLayout.js";

test("character exchanges replace rather than overlap the underlying dialogue", () => {
  assert.equal(dialogueOverlayIsVisible({
    dialogueActive: true,
    characterAlertActive: false
  }), true);
  assert.equal(dialogueOverlayIsVisible({
    dialogueActive: true,
    characterAlertActive: true
  }), false);
  assert.equal(dialogueOverlayIsVisible({
    dialogueActive: false,
    characterAlertActive: true
  }), false);
  assert.throws(
    () => dialogueOverlayIsVisible({ dialogueActive: true, characterAlertActive: null }),
    /requires boolean modal states/
  );
});

test("character alerts use the same standing portrait composition as dialogue", () => {
  const layout = characterAlertGeometry({
    screenWidth: 455,
    screenHeight: 256,
    panelWidth: 286,
    panelHeight: 110,
    portraitSize: 64
  });

  assert.deepEqual(layout.panel, { x: 84, y: 73, w: 286, h: 110 });
  assert.deepEqual(layout.portraits, {
    left: { x: 98, y: 17 },
    right: { x: 292, y: 17 }
  });
  assert.equal(layout.portraits.left.y + 64, layout.panel.y + 8);
});

test("standing alert portraits remain above responsive portrait panels", () => {
  const layout = characterAlertGeometry({
    screenWidth: 256,
    screenHeight: 455,
    panelWidth: 286,
    panelHeight: 110,
    portraitSize: 64
  });

  assert.deepEqual(layout.panel, { x: 6, y: 172, w: 244, h: 110 });
  assert.deepEqual(layout.portraits, {
    left: { x: 20, y: 116 },
    right: { x: 172, y: 116 }
  });
  assert.ok(layout.portraits.left.y < layout.panel.y);
});

test("character alerts reject viewports that cannot hold their composition", () => {
  assert.throws(() => characterAlertGeometry({
    screenWidth: 100,
    screenHeight: 100,
    panelWidth: 88,
    panelHeight: 88,
    portraitSize: 64
  }), /cannot fit/);
});

test("character alert choices give longer weapon actions more room", () => {
  const layout = characterAlertChoiceTextLayout({
    choices: [
      { label: "Confront him", iconId: null },
      { label: "Confront with matchlock arquebuses", iconId: "item:matchlock-arquebuses" },
      { label: "Let it lie", iconId: null }
    ],
    panelWidth: 286,
    iconSize: 16,
    measureText: (value) => value.length * 4
  });

  assert.ok(layout.buttonWidths[1] > layout.buttonWidths[0]);
  assert.ok(layout.buttonWidths[1] > layout.buttonWidths[2]);
  assert.equal(layout.buttonWidths.reduce((sum, width) => sum + width, 0), 252);
  assert.ok(layout.textLayouts[1].labelLines.length <= 3);
  assert.equal(layout.textLayouts[1].iconReserve, 20);
  assert.equal(layout.textLayouts[1].labelLines.join(" "), "CONFRONT WITH MATCHLOCK ARQUEBUSES");
});

test("reserved feedback slots keep action positions stable as messages appear", () => {
  assert.equal(dialogueFeedbackSlotCount({ visibleLineCount: 0, reservedLineCount: 2 }), 2);
  assert.equal(dialogueFeedbackSlotCount({ visibleLineCount: 1, reservedLineCount: 2 }), 2);
  assert.equal(dialogueFeedbackSlotCount({ visibleLineCount: 2, reservedLineCount: 2 }), 2);
  assert.throws(
    () => dialogueFeedbackSlotCount({ visibleLineCount: 0.5, reservedLineCount: 2 }),
    /visibleLineCount/
  );
});

test("game-impact feedback wraps fully instead of truncating after two lines", () => {
  const lines = dialogueFeedbackTextLines({
    text: "Colony secure. Payment received. Standing improved.",
    maxWidth: 18,
    measureText: (value) => value.length
  });

  assert.deepEqual(lines, ["Colony secure.", "Payment received.", "Standing improved."]);
  assert.ok(lines.length > 2);
  assert.doesNotMatch(lines.join(" "), /\.\.\./);
});

test("portrait greetings use a compact content-height panel", () => {
  const layout = dialoguePanelGeometry({
    screenWidth: 256,
    screenHeight: 455,
    contentHeight: 117
  });

  assert.deepEqual(layout.panel, { x: 6, y: 96, w: 244, h: 117 });
  assert.deepEqual(layout.portraits, {
    left: { x: 22, y: 40 },
    right: { x: 170, y: 40 }
  });
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
  assert.deepEqual(layout.portraits, {
    left: { x: 22, y: 6 },
    right: { x: 170, y: 6 }
  });
});

test("landscape greetings remain compact without moving the portrait down", () => {
  const layout = dialoguePanelGeometry({
    screenWidth: 455,
    screenHeight: 256,
    contentHeight: 127
  });

  assert.deepEqual(layout.panel, { x: 6, y: 78, w: 443, h: 127 });
  assert.deepEqual(layout.portraits, {
    left: { x: 22, y: 22 },
    right: { x: 369, y: 22 }
  });
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

test("town exit actions reserve a pinned footer below scrolling choices", () => {
  const options = [
    { label: "Buy goods" },
    { label: "Equipment" },
    { label: "Back", placement: "port-exit" }
  ];
  const groups = dialogueOptionGroups(options);
  assert.deepEqual(groups.regular.map((entry) => entry.index), [0, 1]);
  assert.deepEqual(groups.exits.map((entry) => entry.index), [2]);

  const layout = dialogueOptionStackLayout({
    desiredY: 190,
    bottom: 241,
    optionHeight: 24,
    regularCount: groups.regular.length,
    exitCount: groups.exits.length
  });
  assert.deepEqual(layout, {
    y: 189,
    footerY: 217,
    regularBottom: 213,
    visibleRegularCount: 1,
    needsScroll: true
  });
  assert.deepEqual(dialogueExitFooterRects({
    x: 15,
    y: layout.footerY,
    width: 220,
    optionHeight: 24,
    exitCount: 1
  }), [{ x: 15, y: 217, w: 220, h: 22 }]);
});

test("Back and Leave Port share the fixed town footer", () => {
  assert.deepEqual(dialogueExitFooterRects({
    x: 15,
    y: 217,
    width: 220,
    optionHeight: 24,
    exitCount: 2
  }), [
    { x: 15, y: 217, w: 108, h: 22 },
    { x: 127, y: 217, w: 108, h: 22 }
  ]);
});

test("paired footer actions measure text against their actual button widths", () => {
  const options = [
    { label: "Apply custom loadout", placement: "port-exit" },
    { label: "Back", placement: "port-exit" }
  ];
  const widths = dialogueOptionMeasurementWidths({
    options,
    width: 220,
    regularWidthReserve: 29
  });
  assert.deepEqual(widths, [108, 108]);

  const iconAndPromptReserve = 45;
  const layout = dialogueOptionTextLayout({
    label: options[0].label,
    labelWidth: widths[0] - iconAndPromptReserve,
    measureLabel: (text) => text.length * 6
  });
  assert.deepEqual(layout.labelLines, ["Apply", "custom", "loadout"]);
  assert.equal(layout.height, 44);
  assert.ok(layout.labelLines.every((line) => line.length * 6 <= widths[0] - iconAndPromptReserve));
  assert.doesNotMatch(layout.labelLines.join(" "), /\.\.\./);
});

test("three-tab rows measure each tab without narrowing later full-width actions", () => {
  const widths = dialogueOptionMeasurementWidths({
    options: [
      { label: "Ships", rowId: "tabs" },
      { label: "Stores", rowId: "tabs" },
      { label: "Accounts", rowId: "tabs" },
      { label: "Sell Timber x5" }
    ],
    width: 220,
    optionColumns: 3,
    regularWidthReserve: 29
  });

  assert.deepEqual(widths, [61, 61, 61, 191]);
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

test("long dialogue options wrap above their detail instead of truncating", () => {
  const measure = (text) => text.length * 6;
  const layout = dialogueOptionTextLayout({
    label: "Take passenger to Paris 375 db",
    detail: "9,499 km",
    labelWidth: 120,
    detailWidth: 120,
    measureLabel: measure
  });

  assert.deepEqual(layout.labelLines, ["Take passenger to", "Paris 375 db"]);
  assert.deepEqual(layout.detailLines, ["9,499 km"]);
  assert.equal(layout.height, 42);
});

test("short dialogue options keep their compact minimum height", () => {
  const layout = dialogueOptionTextLayout({
    label: "Decline",
    labelWidth: 120,
    measureLabel: (text) => text.length * 6
  });

  assert.deepEqual(layout.labelLines, ["Decline"]);
  assert.deepEqual(layout.detailLines, []);
  assert.equal(layout.height, 24);
});

test("CJK dialogue options reserve the taller zpix line cadence", () => {
  const layout = dialogueOptionTextLayout({
    label: "购买一批香料",
    detail: "货舱需要十二格空间",
    labelWidth: 60,
    detailWidth: 60,
    measureLabel: (text) => Array.from(text).length * 12,
    labelLineHeight: 14,
    detailLineHeight: 14
  });

  assert.deepEqual(layout.labelLines, ["购买一批香", "料"]);
  assert.deepEqual(layout.detailLines, ["货舱需要十", "二格空间"]);
  assert.equal(layout.height, 64);
});

test("a submenu cannot inherit an out-of-range selection and render no options", () => {
  const window = dialogueOptionWindow({
    optionCount: 2,
    visibleCount: 2,
    selectedIndex: 4,
    scrollOffset: 4
  });

  assert.deepEqual(window, {
    selectedIndex: 1,
    scrollOffset: 0,
    start: 0,
    end: 2,
    canScrollUp: false,
    canScrollDown: false
  });
});

test("a stale scroll offset is clamped before slicing submenu options", () => {
  const window = dialogueOptionWindow({
    optionCount: 2,
    visibleCount: 1,
    selectedIndex: 0,
    scrollOffset: 8
  });

  assert.deepEqual(window, {
    selectedIndex: 0,
    scrollOffset: 0,
    start: 0,
    end: 1,
    canScrollUp: false,
    canScrollDown: true
  });
});

test("scroll affordances follow the visible dialogue window bounds", () => {
  const middle = dialogueOptionWindow({
    optionCount: 5,
    visibleCount: 2,
    selectedIndex: 2,
    scrollOffset: 1
  });
  assert.equal(middle.canScrollUp, true);
  assert.equal(middle.canScrollDown, true);

  const bottom = dialogueOptionWindow({
    optionCount: 5,
    visibleCount: 2,
    selectedIndex: 4,
    scrollOffset: 3
  });
  assert.equal(bottom.start, 3);
  assert.equal(bottom.end, 5);
  assert.equal(bottom.canScrollUp, true);
  assert.equal(bottom.canScrollDown, false);
});
