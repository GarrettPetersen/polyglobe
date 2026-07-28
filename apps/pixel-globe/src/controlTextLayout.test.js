import assert from "node:assert/strict";
import test from "node:test";

import { controlTextLayout, equalWidthControlRects } from "./controlTextLayout.js";

const primaryWidth = (text) => text.length * 7;
const compactWidth = (text) => text.length * 5;

test("control text keeps the primary font when the label fits", () => {
  assert.deepEqual(controlTextLayout({
    label: "DROP",
    maxWidth: 59,
    measurePrimary: primaryWidth,
    measureCompact: compactWidth
  }), {
    fontRole: "primary",
    lines: ["DROP"]
  });
});

test("control text uses the compact font before wrapping", () => {
  assert.deepEqual(controlTextLayout({
    label: "SCAVENGE",
    maxWidth: 50,
    measurePrimary: primaryWidth,
    measureCompact: compactWidth
  }), {
    fontRole: "compact",
    lines: ["SCAVENGE"]
  });
});

test("control text wraps complete words before truncating", () => {
  assert.deepEqual(controlTextLayout({
    label: "DROP ANCHOR",
    maxWidth: 59,
    measurePrimary: primaryWidth,
    measureCompact: (text) => text.length * 6
  }), {
    fontRole: "compact",
    lines: ["DROP", "ANCHOR"]
  });
});

test("control text truncates only when two compact lines cannot fit", () => {
  assert.deepEqual(controlTextLayout({
    label: "FISH FOR EXTRAORDINARILYLONGFISH",
    maxWidth: 60,
    measurePrimary: primaryWidth,
    measureCompact: compactWidth
  }), {
    fontRole: "compact",
    lines: ["FISH FOR", "EXTRAORDI..."]
  });
});

test("control text rejects invalid layout inputs", () => {
  assert.throws(() => controlTextLayout({
    label: "",
    maxWidth: 60,
    measurePrimary: primaryWidth,
    measureCompact: compactWidth
  }), /requires a label/);
  assert.throws(() => controlTextLayout({
    label: "DROP",
    maxWidth: 0,
    measurePrimary: primaryWidth,
    measureCompact: compactWidth
  }), /positive width/);
});

test("equal-width controls consume the full row without overlapping", () => {
  assert.deepEqual(equalWidthControlRects({
    x: 8,
    y: 6,
    width: 346,
    height: 18,
    count: 3,
    gap: 3
  }), [
    { x: 8, y: 6, w: 113, h: 18 },
    { x: 124, y: 6, w: 113, h: 18 },
    { x: 240, y: 6, w: 114, h: 18 }
  ]);
});

test("equal-width controls reject impossible rows", () => {
  assert.throws(() => equalWidthControlRects({
    x: 0,
    y: 0,
    width: 4,
    height: 18,
    count: 3,
    gap: 2
  }), /cannot fit/);
});
