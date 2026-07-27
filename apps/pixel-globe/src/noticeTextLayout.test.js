import assert from "node:assert/strict";
import test from "node:test";

import { fullNoticeTextLayout } from "./noticeTextLayout.js";

test("short full notices retain the compact single-line height", () => {
  const layout = fullNoticeTextLayout("PEACE: ENGLAND / FRANCE", {
    screenWidth: 455,
    maximumWidth: 360,
    lineHeight: 9,
    measureText: monospaceMeasure
  });

  assert.equal(layout.lines.length, 1);
  assert.equal(layout.height, 13);
  assert.equal(layout.width, monospaceMeasure("PEACE: ENGLAND / FRANCE") + 10);
});

test("long political notices wrap without losing any words", () => {
  const text = "POPE ADRIAN VI PROCLAIMS A CRUSADE AGAINST THE OTTOMAN EMPIRE";
  const layout = fullNoticeTextLayout(text, {
    screenWidth: 180,
    maximumWidth: 160,
    lineHeight: 9,
    measureText: monospaceMeasure
  });

  assert.ok(layout.lines.length > 1);
  assert.equal(layout.lines.join(" "), text);
  assert.ok(layout.width <= 160);
  assert.equal(layout.height, layout.lines.length * 9 + 4);
});

function monospaceMeasure(text) {
  return text.length * 4;
}
