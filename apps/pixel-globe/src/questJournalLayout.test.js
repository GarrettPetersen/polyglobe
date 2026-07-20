import assert from "node:assert/strict";
import test from "node:test";

import { questJournalWindow, steppedQuestJournalScroll } from "./questJournalLayout.js";

test("quest journal exposes a clamped scrolling window", () => {
  assert.deepEqual(
    questJournalWindow({ lineCount: 9, visibleLineCount: 4, scrollLine: 2 }),
    {
      scrollLine: 2,
      maxScrollLine: 5,
      firstLine: 2,
      lastLine: 6,
      canScrollUp: true,
      canScrollDown: true
    }
  );
  assert.equal(
    questJournalWindow({ lineCount: 9, visibleLineCount: 4, scrollLine: 99 }).scrollLine,
    5
  );
});

test("quest journal scrolls by a line or nearly a page", () => {
  const input = { lineCount: 12, visibleLineCount: 5, scrollLine: 2 };
  assert.equal(steppedQuestJournalScroll({ ...input, direction: 1 }), 3);
  assert.equal(steppedQuestJournalScroll({ ...input, direction: -1 }), 1);
  assert.equal(steppedQuestJournalScroll({ ...input, direction: 1, page: true }), 6);
  assert.equal(steppedQuestJournalScroll({ ...input, scrollLine: 0, direction: -1 }), 0);
});

test("quest journal rejects malformed scroll geometry", () => {
  assert.throws(
    () => questJournalWindow({ lineCount: 2, visibleLineCount: 0, scrollLine: 0 }),
    /at least one line/
  );
  assert.throws(
    () => steppedQuestJournalScroll({
      lineCount: 2,
      visibleLineCount: 1,
      scrollLine: 0,
      direction: 0
    }),
    /direction/
  );
});
