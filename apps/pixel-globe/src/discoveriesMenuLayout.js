const CLOSE_PAD = 6;
const TAB_PAD_X = 12;
const TAB_GAP = 3;
const TAB_GAP_BELOW_CLOSE = 3;
const ORIGINAL_TAB_OFFSET_Y = 27;

export function discoveriesMenuHeaderLayout({
  panelRect,
  closeButtonSize,
  tabHeight
}) {
  assertRect(panelRect, "panel");
  assertPositiveInteger(closeButtonSize, "close button size");
  assertPositiveInteger(tabHeight, "tab height");

  const closeButtonRect = Object.freeze({
    x: panelRect.x + panelRect.w - closeButtonSize - CLOSE_PAD,
    y: panelRect.y + CLOSE_PAD,
    w: closeButtonSize,
    h: closeButtonSize
  });
  const tabY = closeButtonRect.y + closeButtonRect.h + TAB_GAP_BELOW_CLOSE;
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
