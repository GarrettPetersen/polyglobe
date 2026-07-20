export function questJournalWindow({ lineCount, visibleLineCount, scrollLine }) {
  for (const [label, value] of Object.entries({ lineCount, visibleLineCount, scrollLine })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Quest journal ${label} must be a non-negative integer: ${value}`);
    }
  }
  if (visibleLineCount === 0) throw new Error("Quest journal must show at least one line");

  const maxScrollLine = Math.max(0, lineCount - visibleLineCount);
  const clampedScrollLine = Math.min(scrollLine, maxScrollLine);
  return Object.freeze({
    scrollLine: clampedScrollLine,
    maxScrollLine,
    firstLine: clampedScrollLine,
    lastLine: Math.min(lineCount, clampedScrollLine + visibleLineCount),
    canScrollUp: clampedScrollLine > 0,
    canScrollDown: clampedScrollLine < maxScrollLine
  });
}

export function steppedQuestJournalScroll({
  lineCount,
  visibleLineCount,
  scrollLine,
  direction,
  page = false
}) {
  if (direction !== -1 && direction !== 1) {
    throw new Error(`Quest journal scroll direction must be -1 or 1: ${direction}`);
  }
  if (typeof page !== "boolean") throw new Error(`Quest journal page mode must be boolean: ${page}`);
  const current = questJournalWindow({ lineCount, visibleLineCount, scrollLine });
  const distance = page ? Math.max(1, visibleLineCount - 1) : 1;
  return questJournalWindow({
    lineCount,
    visibleLineCount,
    scrollLine: Math.max(0, current.scrollLine + direction * distance)
  }).scrollLine;
}
