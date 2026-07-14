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

function layout(fontRole, lines) {
  return Object.freeze({
    fontRole,
    lines: Object.freeze(lines)
  });
}
