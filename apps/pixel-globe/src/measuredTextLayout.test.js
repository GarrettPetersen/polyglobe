import assert from "node:assert/strict";
import test from "node:test";

import { wrapAllMeasuredText, wrapMeasuredText } from "./measuredTextLayout.js";

const measure = (text) => text.length;

test("unbounded measured wrapping preserves every word for paged dialogue", () => {
  const text = "FROM HELL'S HEART I STRUCK AT IT AND THE WHITE WHALE IS GONE NOW TURN US HOME";
  const lines = wrapAllMeasuredText(text, 18, measure);

  assert.ok(lines.length > 4);
  assert.equal(lines.join(" "), text);
  assert.ok(lines.every((line) => line.length <= 18));
});

test("bounded measured wrapping still marks intentionally truncated text", () => {
  const lines = wrapMeasuredText("ONE TWO THREE FOUR FIVE SIX SEVEN", 9, 2, measure);

  assert.equal(lines.length, 2);
  assert.match(lines[1], /\.\.\.$/);
});
