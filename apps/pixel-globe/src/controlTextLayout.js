import { wrapMeasuredText } from "./measuredTextLayout.js";

export function controlTextLayout({
  label,
  maxWidth,
  measurePrimary,
  measureCompact,
  maximumLines = 2
}) {
  if (typeof label !== "string" || label.trim().length === 0) {
    throw new Error("Control text requires a label");
  }
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
    throw new Error(`Control text requires positive width: ${maxWidth}`);
  }
  if (typeof measurePrimary !== "function" || typeof measureCompact !== "function") {
    throw new Error("Control text requires primary and compact measurement functions");
  }
  if (!Number.isInteger(maximumLines) || maximumLines <= 0) {
    throw new Error(`Control text requires a positive line limit: ${maximumLines}`);
  }

  if (measurePrimary(label) <= maxWidth) {
    return layout("primary", [label]);
  }
  if (measureCompact(label) <= maxWidth) {
    return layout("compact", [label]);
  }
  return layout("compact", wrapMeasuredText(label, maxWidth, maximumLines, measureCompact));
}

export function equalWidthControlRects({
  x,
  y,
  width,
  height,
  count,
  gap
}) {
  for (const [name, value] of Object.entries({ x, y, width, height, gap })) {
    if (!Number.isFinite(value)) throw new Error(`Control row ${name} must be finite: ${value}`);
  }
  if (width <= 0 || height <= 0) {
    throw new Error(`Control row requires positive dimensions: ${width}x${height}`);
  }
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error(`Control row requires a positive control count: ${count}`);
  }
  if (gap < 0) throw new Error(`Control row gap must be non-negative: ${gap}`);
  const contentWidth = width - gap * (count - 1);
  if (contentWidth < count) {
    throw new Error(`Control row cannot fit ${count} controls within ${width}px`);
  }
  const baseWidth = Math.floor(contentWidth / count);
  const remainder = contentWidth - baseWidth * count;
  let cursorX = x;
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const rectWidth = baseWidth + (index === count - 1 ? remainder : 0);
    const rect = Object.freeze({ x: cursorX, y, w: rectWidth, h: height });
    cursorX += rectWidth + gap;
    return rect;
  }));
}

function layout(fontRole, lines) {
  return Object.freeze({
    fontRole,
    lines: Object.freeze(lines)
  });
}
