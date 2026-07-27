const TITLE_TOP = 10;
const HEADER_GAP = 4;
const NOTEBOOK_MARGIN = 6;
const NOTEBOOK_TAB_GAP = 1;
const NOTEBOOK_MIN_RAIL_WIDTH = 78;
const NOTEBOOK_MAX_RAIL_SHARE = 0.46;
const NOTEBOOK_MIN_PAGE_WIDTH = 104;
const NOTEBOOK_MIN_TAB_HEIGHT = 20;
const NOTEBOOK_BOTTOM_TAB_SIZE = 24;
const NOTEBOOK_MIN_BOTTOM_TAB_WIDTH = 20;
const NOTEBOOK_SCREEN_MARGIN = 6;
const NOTEBOOK_CLOSE_MARGIN = 5;
const NOTEBOOK_CLOSE_GAP = 5;

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
  desiredRailWidth,
  placement = "auto"
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
  if (!["auto", "side", "bottom"].includes(placement)) {
    throw new Error(`Unknown captain notebook placement: ${placement}`);
  }

  if (placement === "bottom" || (placement === "auto" && panel.h > panel.w)) {
    return bottomTabLayout(panel, actionCount);
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
  return Object.freeze({ placement: "side", rail, page, tabs, tabHeight });
}

export function captainNotebookFrameLayout({
  screenWidth,
  screenHeight,
  actionCount,
  desiredRailWidth,
  desiredPanelWidth,
  desiredPanelHeight,
  closeButtonSize
}) {
  for (const [label, value] of Object.entries({
    screenWidth,
    screenHeight,
    actionCount,
    desiredRailWidth,
    desiredPanelWidth,
    desiredPanelHeight,
    closeButtonSize
  })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Captain notebook frame ${label} must be a positive integer: ${value}`);
    }
  }
  const portrait = screenHeight > screenWidth;
  const closeButtonRect = Object.freeze({
    x: screenWidth - NOTEBOOK_CLOSE_MARGIN - closeButtonSize,
    y: NOTEBOOK_CLOSE_MARGIN,
    w: closeButtonSize,
    h: closeButtonSize
  });
  const available = portrait
    ? {
        x: NOTEBOOK_SCREEN_MARGIN,
        y: closeButtonRect.y + closeButtonRect.h + NOTEBOOK_CLOSE_GAP,
        w: screenWidth - NOTEBOOK_SCREEN_MARGIN * 2,
        h: screenHeight - (
          closeButtonRect.y + closeButtonRect.h + NOTEBOOK_CLOSE_GAP
        ) - NOTEBOOK_SCREEN_MARGIN
      }
    : {
        x: NOTEBOOK_SCREEN_MARGIN,
        y: NOTEBOOK_SCREEN_MARGIN,
        w: closeButtonRect.x - NOTEBOOK_CLOSE_GAP - NOTEBOOK_SCREEN_MARGIN,
        h: screenHeight - NOTEBOOK_SCREEN_MARGIN * 2
      };
  if (available.w <= 0 || available.h <= 0) {
    throw new Error(`Captain notebook frame has no available page area: ${screenWidth}x${screenHeight}`);
  }
  const panelWidth = Math.min(desiredPanelWidth, available.w);
  const panelHeight = Math.min(desiredPanelHeight, available.h);
  const panel = Object.freeze({
    x: available.x + Math.floor((available.w - panelWidth) / 2),
    y: available.y + Math.floor((available.h - panelHeight) / 2),
    w: panelWidth,
    h: panelHeight
  });
  return Object.freeze({
    portrait,
    closeButtonRect,
    panel,
    notebook: captainNotebookLayout({
      panel,
      actionCount,
      desiredRailWidth,
      placement: portrait ? "bottom" : "side"
    })
  });
}

function bottomTabLayout(panel, actionCount) {
  const availableTabWidth = panel.w - NOTEBOOK_MARGIN * 2 -
    NOTEBOOK_TAB_GAP * (actionCount - 1);
  const tabSize = Math.min(
    NOTEBOOK_BOTTOM_TAB_SIZE,
    Math.floor(availableTabWidth / actionCount)
  );
  if (tabSize < NOTEBOOK_MIN_BOTTOM_TAB_WIDTH) {
    throw new Error(`Captain notebook is too narrow for ${actionCount} bottom tabs: ${panel.w}`);
  }
  const railHeight = tabSize + NOTEBOOK_MARGIN * 2;
  if (panel.h - railHeight < NOTEBOOK_MIN_PAGE_WIDTH) {
    throw new Error(`Captain notebook is too short for its bottom tab row: ${panel.h}`);
  }
  const tabRowWidth = tabSize * actionCount + NOTEBOOK_TAB_GAP * (actionCount - 1);
  const tabStartX = panel.x + Math.floor((panel.w - tabRowWidth) / 2);
  const rail = Object.freeze({
    x: panel.x,
    y: panel.y + panel.h - railHeight,
    w: panel.w,
    h: railHeight
  });
  const page = Object.freeze({
    x: panel.x,
    y: panel.y,
    w: panel.w,
    h: panel.h - railHeight
  });
  const tabs = Object.freeze(Array.from({ length: actionCount }, (_, index) => Object.freeze({
    x: tabStartX + index * (tabSize + NOTEBOOK_TAB_GAP),
    y: rail.y,
    w: tabSize,
    h: tabSize
  })));
  return Object.freeze({
    placement: "bottom",
    rail,
    page,
    tabs,
    tabHeight: tabSize
  });
}
