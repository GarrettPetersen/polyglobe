const TITLE_TOP = 10;
const HEADER_GAP = 4;
const NOTEBOOK_MARGIN = 6;
const NOTEBOOK_TAB_GAP = 1;
const NOTEBOOK_MIN_RAIL_WIDTH = 78;
const NOTEBOOK_MAX_RAIL_SHARE = 0.46;
const NOTEBOOK_MIN_PAGE_WIDTH = 104;
const NOTEBOOK_MIN_TAB_HEIGHT = 20;

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

export function captainNotebookLayout({
  panel,
  actionCount,
  desiredRailWidth
}) {
  if (!panel || typeof panel !== "object" || Array.isArray(panel)) {
    throw new Error("Captain notebook panel must be an object");
  }
  for (const [label, value] of Object.entries(panel)) {
    if (!Number.isInteger(value)) {
      throw new Error(`Captain notebook panel ${label} must be an integer: ${value}`);
    }
  }
  if (panel.w <= 0 || panel.h <= 0) throw new Error("Captain notebook panel must have positive dimensions");
  if (!Number.isInteger(actionCount) || actionCount <= 0) {
    throw new Error(`Captain notebook action count must be a positive integer: ${actionCount}`);
  }
  if (!Number.isInteger(desiredRailWidth) || desiredRailWidth <= 0) {
    throw new Error(`Captain notebook desired rail width must be a positive integer: ${desiredRailWidth}`);
  }

  const maximumRailWidth = Math.min(
    panel.w - NOTEBOOK_MIN_PAGE_WIDTH,
    Math.floor(panel.w * NOTEBOOK_MAX_RAIL_SHARE)
  );
  if (maximumRailWidth < NOTEBOOK_MIN_RAIL_WIDTH) {
    throw new Error(`Captain notebook is too narrow for its tab rail: ${panel.w}`);
  }
  const railWidth = Math.max(
    NOTEBOOK_MIN_RAIL_WIDTH,
    Math.min(desiredRailWidth, maximumRailWidth)
  );
  const availableTabHeight = panel.h - NOTEBOOK_MARGIN * 2 -
    NOTEBOOK_TAB_GAP * (actionCount - 1);
  const tabHeight = Math.floor(availableTabHeight / actionCount);
  if (tabHeight < NOTEBOOK_MIN_TAB_HEIGHT) {
    throw new Error(`Captain notebook is too short for ${actionCount} tabs: ${panel.h}`);
  }

  const rail = Object.freeze({
    x: panel.x,
    y: panel.y,
    w: railWidth,
    h: panel.h
  });
  const page = Object.freeze({
    x: panel.x + railWidth,
    y: panel.y,
    w: panel.w - railWidth,
    h: panel.h
  });
  const tabs = Object.freeze(Array.from({ length: actionCount }, (_, index) => Object.freeze({
    x: panel.x + 4,
    y: panel.y + NOTEBOOK_MARGIN + index * (tabHeight + NOTEBOOK_TAB_GAP),
    w: railWidth - 3,
    h: tabHeight
  })));
  return Object.freeze({ rail, page, tabs, tabHeight });
}
