const TITLE_TOP = 9;
const LEGEND_TOP = 27;
const BAND_GAP = 4;
const HEADER_GAP = 3;
const MATRIX_GAP = 8;

export function politicsChartHeaderLayout({ panelY, fontSize }) {
  if (!Number.isInteger(panelY)) throw new Error(`Politics chart panelY must be an integer: ${panelY}`);
  if (!Number.isInteger(fontSize) || fontSize <= 0) {
    throw new Error(`Politics chart font size must be a positive integer: ${fontSize}`);
  }

  const titleY = panelY + TITLE_TOP;
  const legendY = panelY + LEGEND_TOP;
  const sectionY = legendY + fontSize + BAND_GAP;
  const headerY = sectionY + fontSize + HEADER_GAP;
  const columnCodeY = headerY + fontSize + BAND_GAP;
  const matrixY = headerY + fontSize + MATRIX_GAP;
  return Object.freeze({
    titleY,
    legendY,
    sectionY,
    headerY,
    columnCodeY,
    matrixY,
    matrixTopOffset: matrixY - panelY
  });
}
