import assert from "node:assert/strict";
import test from "node:test";

import { fitMeasuredText, wrapAllMeasuredText, wrapMeasuredText } from "./measuredTextLayout.js";

const measure = (text) => text.length;

test("unbounded measured wrapping preserves every word for paged dialogue", () => {
  const text = "FROM HELL'S HEART I STRUCK AT IT AND THE WHITE WHALE IS GONE NOW TURN US HOME";
  const lines = wrapAllMeasuredText(text, 18, measure);

  assert.ok(lines.length > 4);
  assert.equal(lines.join(" "), text);
  assert.ok(lines.every((line) => line.length <= 18));
});

test("unbounded measured wrapping splits long words without adding ellipses", () => {
  const text = "Wolcrastemwunderbar COLONY";
  const lines = wrapAllMeasuredText(text, 8, measure);

  assert.deepEqual(lines, ["Wolcrast", "emwunder", "bar", "COLONY"]);
  assert.equal(lines.join(""), text.replace(" ", ""));
  assert.ok(lines.every((line) => !line.includes("...")));
});

test("bounded measured wrapping still marks intentionally truncated text", () => {
  let diagnostic = null;
  const lines = wrapMeasuredText(
    "ONE TWO THREE FOUR FIVE SIX SEVEN",
    9,
    2,
    measure,
    (entry) => { diagnostic = entry; }
  );

  assert.equal(lines.length, 2);
  assert.match(lines[1], /\.\.\.$/);
  assert.deepEqual(diagnostic, { requiredLineCount: 4, maximumLineCount: 2 });
});

test("single-line measured fitting reports the width that required truncation", () => {
  let diagnostic = null;
  const fitted = fitMeasuredText("TOO WIDE", 5, measure, (entry) => { diagnostic = entry; });

  assert.equal(fitted, "TO...");
  assert.deepEqual(diagnostic, { measuredWidth: 8, availableWidth: 5 });
});
