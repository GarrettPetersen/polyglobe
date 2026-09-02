import assert from "node:assert/strict";
import test from "node:test";

import {
  contentSizedGridLayout,
  contentSizedTextStackLayout
} from "./contentSizedTextLayout.js";

const measureFivePixelCharacters = (text) => text.length * 5;

test("wrapped content grows its container instead of overflowing", () => {
  const layout = contentSizedTextStackLayout({
    sections: [
      { id: "name", text: "ANA" },
      { id: "role", text: "CREWMATE", gapBefore: 1 },
      { id: "skills", text: "MASTER HELMSMAN", gapBefore: 2 }
    ],
    width: 50,
    measureText: measureFivePixelCharacters,
    lineHeight: 8,
    startY: 71,
    bottomPadding: 5,
    minimumHeight: 104
  });

  assert.deepEqual(layout.sections[2].lines, ["MASTER", "HELMSMAN"]);
  assert.equal(layout.sections[2].y, 90);
  assert.equal(layout.height, 111);
  assert.ok(
    layout.sections[2].y + layout.sections[2].height <= layout.height - 5,
    "the final wrapped line must remain inside the measured container"
  );
});

test("a content-sized grid advances later rows by the tallest card", () => {
  const layout = contentSizedGridLayout({
    entries: [
      { id: "short", naturalHeight: 100 },
      { id: "tall", naturalHeight: 124 },
      { id: "next", naturalHeight: 96 }
    ],
    width: 240,
    columns: 2,
    minimumHeight: 106,
    measureHeight: (entry) => entry.naturalHeight,
    rowGap: 3
  });

  assert.deepEqual(layout.entries.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })), [
    { id: "short", x: 0, y: 0, w: 120, h: 124 },
    { id: "tall", x: 120, y: 0, w: 120, h: 124 },
    { id: "next", x: 0, y: 127, w: 120, h: 106 }
  ]);
  assert.equal(layout.height, 233);
});

test("a content-sized grid reserves explicit gutters between cards", () => {
  const layout = contentSizedGridLayout({
    entries: [{ id: "one" }, { id: "two" }, { id: "three" }],
    width: 224,
    columns: 3,
    minimumHeight: 20,
    measureHeight: () => 20,
    columnGap: 5,
    rowGap: 7
  });

  assert.deepEqual(layout.entries.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })), [
    { id: "one", x: 0, y: 0, w: 71, h: 20 },
    { id: "two", x: 76, y: 0, w: 71, h: 20 },
    { id: "three", x: 152, y: 0, w: 72, h: 20 }
  ]);
  assert.equal(layout.height, 20);
});

test("content-sized layouts reject dimensions that cannot be measured", () => {
  assert.throws(() => contentSizedTextStackLayout({
    sections: [{ id: "label", text: "TEXT" }],
    width: 0,
    measureText: measureFivePixelCharacters,
    lineHeight: 8
  }), /positive/);
  assert.throws(() => contentSizedGridLayout({
    entries: [{}],
    width: 1,
    columns: 2,
    minimumHeight: 1,
    measureHeight: () => 1
  }), /do not fit/);
});
