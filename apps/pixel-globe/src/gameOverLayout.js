import { wrapMeasuredText } from "./measuredTextLayout.js";

const CONTENT_MARGIN = 22;
const TEXT_LINE_HEIGHT = 10;
const MINIMUM_ROW_HEIGHT = 10;
const PREFERRED_ROW_HEIGHT = 12;
const ROW_GAP = 8;

export function gameOverStatsLayout({
  screenWidth,
  screenHeight,
  epitaph,
  cause,
  rows,
  measureText
}) {
  if (!Number.isFinite(screenWidth) || screenWidth <= CONTENT_MARGIN * 2) {
    throw new Error(`Game-over layout requires a usable screen width: ${screenWidth}`);
  }
  if (!Number.isFinite(screenHeight) || screenHeight <= 0) {
    throw new Error(`Game-over layout requires a usable screen height: ${screenHeight}`);
  }
  if (!Array.isArray(rows)) throw new Error("Game-over layout requires statistic rows");
  if (typeof measureText !== "function") throw new Error("Game-over layout requires text measurement");

  const left = CONTENT_MARGIN;
  const right = screenWidth - CONTENT_MARGIN;
  const width = right - left;
  const epitaphLines = wrapMeasuredText(epitaph, width, 2, measureText);
  const causeLines = wrapMeasuredText(`CAUSE OF DEATH: ${cause}`, width, 3, measureText);
  const epitaphY = 39;
  const causeY = epitaphY + epitaphLines.length * TEXT_LINE_HEIGHT + 4;
  const firstRowY = causeY + causeLines.length * TEXT_LINE_HEIGHT + ROW_GAP;
  const rowEntries = rows.map(([label, value]) => {
    const labelWidth = measureText(label);
    const valueWidth = measureText(value);
    const inline = labelWidth + valueWidth + ROW_GAP <= width;
    return { label, value, inline };
  });
  const promptY = screenHeight - 24;
  const stackedHeight = rowEntries.filter((row) => !row.inline).length * TEXT_LINE_HEIGHT;
  const availableRowHeight = Math.floor((promptY - 4 - firstRowY - stackedHeight) / Math.max(1, rows.length));
  const rowHeight = Math.min(PREFERRED_ROW_HEIGHT, availableRowHeight);
  if (rowHeight < MINIMUM_ROW_HEIGHT) {
    throw new Error(`Game-over statistics cannot fit ${rows.length} readable rows in ${screenHeight}px`);
  }

  let rowY = firstRowY;
  const rowLayouts = rowEntries.map(({ label, value, inline }) => {
    const layout = {
      label,
      value,
      labelX: left,
      labelY: rowY,
      valueX: right,
      valueY: inline ? rowY : rowY + TEXT_LINE_HEIGHT,
      inline
    };
    rowY += inline ? rowHeight : rowHeight + TEXT_LINE_HEIGHT;
    return layout;
  });

  if (rowY > promptY - 4) {
    throw new Error(`Game-over statistics require ${rowY + 4}px but only ${promptY}px are available`);
  }

  return {
    left,
    right,
    width,
    epitaphY,
    epitaphLines,
    causeY,
    causeLines,
    rows: rowLayouts,
    rowHeight,
    promptY
  };
}
