import { wrapAllMeasuredText } from "./measuredTextLayout.js";

export function contentSizedTextStackLayout({
  sections,
  width,
  measureText,
  lineHeight,
  startY = 0,
  bottomPadding = 0,
  minimumHeight = 1
}) {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error("Content-sized text stack requires sections");
  }
  if (typeof measureText !== "function") {
    throw new Error("Content-sized text stack requires text measurement");
  }
  for (const [label, value] of Object.entries({
    width,
    lineHeight,
    startY,
    bottomPadding,
    minimumHeight
  })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid content-sized text ${label}: ${value}`);
    }
  }
  if (width <= 0 || lineHeight <= 0 || minimumHeight <= 0) {
    throw new Error("Content-sized text dimensions must be positive");
  }

  let cursorY = startY;
  const laidOutSections = sections.map((section, index) => {
    if (!section || typeof section.id !== "string" || section.id.length === 0 ||
        typeof section.text !== "string") {
      throw new Error(`Invalid content-sized text section at index ${index}`);
    }
    const gapBefore = section.gapBefore ?? 0;
    if (!Number.isFinite(gapBefore) || gapBefore < 0) {
      throw new Error(`Invalid content-sized text gap for ${section.id}: ${gapBefore}`);
    }
    cursorY += gapBefore;
    const lines = wrapAllMeasuredText(section.text, width, measureText);
    const laidOut = Object.freeze({
      id: section.id,
      lines: Object.freeze(lines),
      y: cursorY,
      height: lines.length * lineHeight
    });
    cursorY += laidOut.height;
    return laidOut;
  });

  return Object.freeze({
    sections: Object.freeze(laidOutSections),
    height: Math.max(minimumHeight, Math.ceil(cursorY + bottomPadding))
  });
}

export function contentSizedGridLayout({
  entries,
  width,
  columns,
  minimumHeight,
  measureHeight,
  rowGap = 0
}) {
  if (!Array.isArray(entries)) throw new Error("Content-sized grid requires entries");
  if (!Number.isInteger(width) || width <= 0) {
    throw new Error(`Content-sized grid requires positive integer width: ${width}`);
  }
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new Error(`Content-sized grid requires positive column count: ${columns}`);
  }
  if (!Number.isFinite(minimumHeight) || minimumHeight <= 0 ||
      !Number.isFinite(rowGap) || rowGap < 0) {
    throw new Error("Content-sized grid requires valid row dimensions");
  }
  if (typeof measureHeight !== "function") {
    throw new Error("Content-sized grid requires a height measurement function");
  }
  const cellWidth = Math.floor(width / columns);
  if (cellWidth <= 0) throw new Error(`Content-sized grid columns do not fit ${width}px`);

  const measured = entries.map((entry, index) => {
    const column = index % columns;
    const entryWidth = column === columns - 1 ? width - cellWidth * column : cellWidth;
    const naturalHeight = measureHeight(entry, entryWidth);
    if (!Number.isFinite(naturalHeight) || naturalHeight <= 0) {
      throw new Error(`Content-sized grid entry ${index} has invalid height: ${naturalHeight}`);
    }
    return {
      entry,
      column,
      row: Math.floor(index / columns),
      width: entryWidth,
      height: Math.max(minimumHeight, Math.ceil(naturalHeight))
    };
  });

  const rowHeights = [];
  for (const entry of measured) {
    rowHeights[entry.row] = Math.max(rowHeights[entry.row] || 0, entry.height);
  }
  const rowY = [];
  let cursorY = 0;
  for (let row = 0; row < rowHeights.length; row++) {
    rowY[row] = cursorY;
    cursorY += rowHeights[row] + (row < rowHeights.length - 1 ? rowGap : 0);
  }

  return Object.freeze({
    entries: Object.freeze(measured.map((measuredEntry) => Object.freeze({
      ...measuredEntry.entry,
      x: measuredEntry.column * cellWidth,
      y: rowY[measuredEntry.row],
      w: measuredEntry.width,
      h: rowHeights[measuredEntry.row]
    }))),
    columns,
    height: cursorY
  });
}
