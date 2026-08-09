export function fittedStackedMenuRows({
  startY,
  endY,
  rowCount,
  preferredRowHeight,
  minimumRowHeight,
  preferredGap,
  minimumGap
}) {
  for (const [label, value] of Object.entries({
    startY,
    endY,
    rowCount,
    preferredRowHeight,
    minimumRowHeight,
    preferredGap,
    minimumGap
  })) {
    if (!Number.isInteger(value)) throw new Error(`Stacked menu ${label} must be an integer: ${value}`);
  }
  if (endY <= startY) throw new Error(`Stacked menu has no vertical space: ${startY}-${endY}`);
  if (rowCount <= 0) throw new Error(`Stacked menu row count must be positive: ${rowCount}`);
  if (minimumRowHeight <= 0 || preferredRowHeight < minimumRowHeight) {
    throw new Error(`Invalid stacked menu row heights: ${minimumRowHeight}-${preferredRowHeight}`);
  }
  if (minimumGap < 0 || preferredGap < minimumGap) {
    throw new Error(`Invalid stacked menu gaps: ${minimumGap}-${preferredGap}`);
  }

  const availableHeight = endY - startY;
  for (let rowHeight = preferredRowHeight; rowHeight >= minimumRowHeight; rowHeight -= 1) {
    const remainingHeight = availableHeight - rowHeight * rowCount;
    const maximumGap = rowCount === 1
      ? preferredGap
      : Math.floor(remainingHeight / (rowCount - 1));
    if (maximumGap < minimumGap) continue;
    const gap = Math.min(preferredGap, maximumGap);
    return {
      rowHeight,
      gap,
      rows: Array.from({ length: rowCount }, (_, index) => ({
        y: startY + index * (rowHeight + gap),
        h: rowHeight
      }))
    };
  }

  throw new Error(
    `Stacked menu cannot fit ${rowCount} rows in ${availableHeight}px ` +
    `(minimum ${minimumRowHeight}px rows and ${minimumGap}px gaps)`
  );
}

export function scrollableStackedMenuRows({
  startY,
  endY,
  rowCount,
  selectedIndex,
  scrollOffset,
  preferredRowHeight,
  minimumRowHeight,
  preferredGap,
  minimumGap
}) {
  for (const [label, value] of Object.entries({ rowCount, selectedIndex, scrollOffset })) {
    if (!Number.isInteger(value)) throw new Error(`Scrollable stacked menu ${label} must be an integer: ${value}`);
  }
  if (rowCount <= 0) throw new Error(`Scrollable stacked menu row count must be positive: ${rowCount}`);
  if (selectedIndex < 0 || selectedIndex >= rowCount) {
    throw new Error(`Scrollable stacked menu selection is outside its rows: ${selectedIndex}/${rowCount}`);
  }
  const availableHeight = endY - startY;
  const maximumVisibleCount = Math.floor(
    (availableHeight + minimumGap) / (minimumRowHeight + minimumGap)
  );
  if (maximumVisibleCount <= 0) {
    throw new Error(`Scrollable stacked menu has no room for a row in ${availableHeight}px`);
  }
  const visibleCount = Math.min(rowCount, maximumVisibleCount);
  const maximumOffset = rowCount - visibleCount;
  let fittedOffset = Math.max(0, Math.min(maximumOffset, scrollOffset));
  if (selectedIndex < fittedOffset) fittedOffset = selectedIndex;
  if (selectedIndex >= fittedOffset + visibleCount) {
    fittedOffset = selectedIndex - visibleCount + 1;
  }
  const layout = fittedStackedMenuRows({
    startY,
    endY,
    rowCount: visibleCount,
    preferredRowHeight,
    minimumRowHeight,
    preferredGap,
    minimumGap
  });
  return {
    ...layout,
    visibleCount,
    scrollOffset: fittedOffset,
    canScrollUp: fittedOffset > 0,
    canScrollDown: fittedOffset + visibleCount < rowCount,
    rows: layout.rows.map((row, index) => ({ ...row, index: fittedOffset + index }))
  };
}
