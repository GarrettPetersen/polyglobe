const CLOSE_PAD = 6;
const TAB_PAD_X = 12;
const TAB_GAP = 3;
const TAB_GAP_BELOW_CLOSE = 3;
const ORIGINAL_TAB_OFFSET_Y = 27;
const LIST_OFFSET_Y = 91;
const ROW_TOP_OFFSET = -2;
const ROW_HEIGHT = 34;
const ROW_STRIDE = 36;
const PAGER_BOTTOM_PAD = 5;
const LIST_PAGER_GAP = 4;

export function discoveriesMenuHeaderLayout({
  panelRect,
  closeButtonSize,
  tabHeight,
  reserveCloseButton = true
}) {
  assertRect(panelRect, "panel");
  assertPositiveInteger(closeButtonSize, "close button size");
  assertPositiveInteger(tabHeight, "tab height");
  if (typeof reserveCloseButton !== "boolean") {
    throw new Error(`Discoveries reserve-close mode must be boolean: ${reserveCloseButton}`);
  }

  const closeButtonRect = reserveCloseButton
    ? Object.freeze({
        x: panelRect.x + panelRect.w - closeButtonSize - CLOSE_PAD,
        y: panelRect.y + CLOSE_PAD,
        w: closeButtonSize,
        h: closeButtonSize
      })
    : null;
  const tabY = closeButtonRect
    ? closeButtonRect.y + closeButtonRect.h + TAB_GAP_BELOW_CLOSE
    : panelRect.y + ORIGINAL_TAB_OFFSET_Y;
  const tabWidth = Math.floor((panelRect.w - TAB_PAD_X * 2 - TAB_GAP) / 2);
  if (tabWidth <= 0) {
    throw new Error(`Discoveries tabs do not fit panel width: ${panelRect.w}`);
  }
  const tabRects = Object.freeze([
    Object.freeze({
      id: "wonders",
      rect: Object.freeze({
        x: panelRect.x + TAB_PAD_X,
        y: tabY,
        w: tabWidth,
        h: tabHeight
      })
    }),
    Object.freeze({
      id: "animals",
      rect: Object.freeze({
        x: panelRect.x + TAB_PAD_X + tabWidth + TAB_GAP,
        y: tabY,
        w: tabWidth,
        h: tabHeight
      })
    })
  ]);

  return Object.freeze({
    closeButtonRect,
    tabRects,
    bodyOffsetY: tabY - panelRect.y - ORIGINAL_TAB_OFFSET_Y
  });
}

export function discoveriesMenuListLayout({
  panelRect,
  bodyOffsetY,
  pagerHeight
}) {
  assertRect(panelRect, "panel");
  if (!Number.isInteger(bodyOffsetY) || bodyOffsetY < 0) {
    throw new Error(`Discoveries body offset must be a non-negative integer: ${bodyOffsetY}`);
  }
  assertPositiveInteger(pagerHeight, "pager height");

  const listY = panelRect.y + LIST_OFFSET_Y + bodyOffsetY;
  const firstRowTop = listY + ROW_TOP_OFFSET;
  const pagerY = panelRect.y + panelRect.h - pagerHeight - PAGER_BOTTOM_PAD;
  const listBottom = pagerY - LIST_PAGER_GAP;
  const availableHeight = listBottom - firstRowTop;
  const pageSize = Math.floor((availableHeight + (ROW_STRIDE - ROW_HEIGHT)) / ROW_STRIDE);
  if (pageSize <= 0) {
    throw new Error(
      `Discoveries list cannot fit between header and pager: ${availableHeight}px`
    );
  }

  return Object.freeze({
    listY,
    pagerY,
    pageSize,
    rowTopOffset: ROW_TOP_OFFSET,
    rowHeight: ROW_HEIGHT,
    rowStride: ROW_STRIDE
  });
}

function assertRect(rect, label) {
  if (!rect || !Number.isInteger(rect.x) || !Number.isInteger(rect.y) ||
      !Number.isInteger(rect.w) || !Number.isInteger(rect.h) ||
      rect.w <= 0 || rect.h <= 0) {
    throw new Error(`Invalid discoveries ${label} rectangle`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Discoveries ${label} must be a positive integer: ${value}`);
  }
}
