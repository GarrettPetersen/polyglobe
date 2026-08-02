import { wrapAllMeasuredText } from "./measuredTextLayout.js";

const CONTENT_MARGIN = 22;
const TEXT_LINE_HEIGHT = 10;
const MINIMUM_ROW_HEIGHT = 10;
const PREFERRED_ROW_HEIGHT = 12;
const ROW_GAP = 8;
const MEMORIAL_BASE_HEIGHT = 178;
const MEMORIAL_HORIZONTAL_MARGIN = 6;
const MEMORIAL_TEXT_LEFT_OFFSET = 104;
const MEMORIAL_TEXT_RIGHT_MARGIN = 18;

export function gameOverStatsLayout({
  screenWidth,
  screenHeight,
  epitaph,
  causeLabel,
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
  if (typeof causeLabel !== "string" || causeLabel.trim() === "") {
    throw new Error("Game-over layout requires a cause label");
  }
  if (typeof measureText !== "function") throw new Error("Game-over layout requires text measurement");

  const left = CONTENT_MARGIN;
  const right = screenWidth - CONTENT_MARGIN;
  const width = right - left;
  const epitaphLines = wrapAllMeasuredText(epitaph, width, measureText);
  const causeLines = wrapAllMeasuredText(`${causeLabel}: ${cause}`, width, measureText);
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

export function gameOverMemorialLayout({
  screenWidth,
  screenHeight,
  preferredPanelWidth,
  cause,
  measureText
}) {
  if (!Number.isFinite(screenWidth) || screenWidth <= MEMORIAL_HORIZONTAL_MARGIN * 2) {
    throw new Error(`Game-over memorial requires a usable screen width: ${screenWidth}`);
  }
  if (!Number.isFinite(screenHeight) || screenHeight <= MEMORIAL_HORIZONTAL_MARGIN * 2) {
    throw new Error(`Game-over memorial requires a usable screen height: ${screenHeight}`);
  }
  if (!Number.isFinite(preferredPanelWidth) || preferredPanelWidth <= 0) {
    throw new Error(`Game-over memorial requires a positive panel width: ${preferredPanelWidth}`);
  }
  if (typeof cause !== "string" || cause.trim() === "") {
    throw new Error("Game-over memorial requires a cause of death");
  }
  if (typeof measureText !== "function") {
    throw new Error("Game-over memorial requires text measurement");
  }

  const width = Math.min(preferredPanelWidth, screenWidth - MEMORIAL_HORIZONTAL_MARGIN * 2);
  const textWidth = width - MEMORIAL_TEXT_LEFT_OFFSET - MEMORIAL_TEXT_RIGHT_MARGIN;
  if (textWidth <= 0) {
    throw new Error(`Game-over memorial has no usable text width: ${textWidth}`);
  }
  const causeLines = wrapAllMeasuredText(cause, textWidth, measureText);
  const height = MEMORIAL_BASE_HEIGHT + (causeLines.length - 1) * TEXT_LINE_HEIGHT;
  if (height > screenHeight - MEMORIAL_HORIZONTAL_MARGIN * 2) {
    throw new Error(`Game-over memorial requires ${height}px but only ${screenHeight}px are available`);
  }

  return Object.freeze({
    panel: Object.freeze({
      x: Math.floor((screenWidth - width) / 2),
      y: Math.floor((screenHeight - height) / 2),
      w: width,
      h: height
    }),
    textXOffset: MEMORIAL_TEXT_LEFT_OFFSET,
    textWidth,
    causeLines: Object.freeze(causeLines)
  });
}
