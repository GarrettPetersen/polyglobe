const TITLE_TOP = 10;
const HEADER_GAP = 4;

export function captainChartHeaderLayout({ panelY, dialogueFontSize, smallFontSize }) {
  for (const [label, value] of Object.entries({ panelY, dialogueFontSize, smallFontSize })) {
    if (!Number.isInteger(value)) throw new Error(`Captain chart ${label} must be an integer: ${value}`);
  }
  if (dialogueFontSize <= 0 || smallFontSize <= 0) {
    throw new Error("Captain chart font sizes must be positive");
  }

  const titleY = panelY + TITLE_TOP;
  const mappedY = titleY + dialogueFontSize + HEADER_GAP;
  const mapY = mappedY + smallFontSize + HEADER_GAP;
  return Object.freeze({
    titleY,
    mappedY,
    mapY,
    mapTopOffset: mapY - panelY
  });
}
