import { wrapAllMeasuredText } from "./measuredTextLayout.js";

export function fullNoticeTextLayout(text, {
  screenWidth,
  maximumWidth,
  lineHeight,
  measureText
}) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Full notice layout requires text");
  }
  for (const [label, value] of Object.entries({ screenWidth, maximumWidth, lineHeight })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Full notice ${label} must be a positive integer: ${value}`);
    }
  }
  if (typeof measureText !== "function") {
    throw new Error("Full notice layout requires text measurement");
  }

  const horizontalMargin = 6;
  const horizontalPadding = 10;
  const availableWidth = screenWidth - horizontalMargin * 2;
  if (availableWidth <= horizontalPadding) {
    throw new Error(`Full notice screen is too narrow: ${screenWidth}`);
  }
  const width = Math.min(
    maximumWidth,
    availableWidth,
    Math.max(48, Math.ceil(measureText(text)) + horizontalPadding)
  );
  const lines = wrapAllMeasuredText(text, width - horizontalPadding, measureText);
  const height = Math.max(13, lines.length * lineHeight + 4);
  return Object.freeze({
    width,
    height,
    lineHeight,
    lines: Object.freeze(lines)
  });
}
