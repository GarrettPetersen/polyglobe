const TITLE_TOP = 9;
const LEGEND_TOP = 27;
const LEGEND_GAP = 2;
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
  const tradeLegendY = legendY + fontSize + LEGEND_GAP;
  const sectionY = tradeLegendY + fontSize + BAND_GAP;
  const headerY = sectionY + fontSize + HEADER_GAP;
  const columnCodeY = headerY + fontSize + BAND_GAP;
  const matrixY = headerY + fontSize + MATRIX_GAP;
  return Object.freeze({
    titleY,
    legendY,
    tradeLegendY,
    sectionY,
    headerY,
    columnCodeY,
    matrixY,
    matrixTopOffset: matrixY - panelY
  });
}

export function politicsChartRowsPerPage({
  panelHeight,
  matrixTopOffset,
  pagerHeight,
  newsHeight = 0,
  rowHeight,
  minRows,
  maxRows
}) {
  for (const [label, value] of Object.entries({
    panelHeight,
    matrixTopOffset,
    pagerHeight,
    newsHeight,
    rowHeight,
    minRows,
    maxRows
  })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Politics chart ${label} must be a non-negative integer: ${value}`);
    }
  }
  if (rowHeight === 0) throw new Error("Politics chart rowHeight must be positive");
  if (minRows === 0) throw new Error("Politics chart minRows must be positive");
  if (maxRows < minRows) {
    throw new Error(`Politics chart maxRows cannot be smaller than minRows: ${maxRows} < ${minRows}`);
  }

  const availableRows = Math.floor(
    (panelHeight - matrixTopOffset - pagerHeight - 8 - newsHeight) / rowHeight
  );
  return Math.max(minRows, Math.min(maxRows, availableRows));
}
