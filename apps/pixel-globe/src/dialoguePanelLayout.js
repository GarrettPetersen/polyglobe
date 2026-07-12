export function dialoguePanelGeometry({
  screenWidth,
  screenHeight,
  compact = false,
  bodyLineCount = 0,
  contentHeight = null
}) {
  if (!Number.isFinite(screenWidth) || screenWidth <= 0) throw new Error("Invalid dialogue screen width");
  if (!Number.isFinite(screenHeight) || screenHeight <= 0) throw new Error("Invalid dialogue screen height");
  if (!Number.isInteger(bodyLineCount) || bodyLineCount < 0) {
    throw new Error("Invalid dialogue body line count");
  }
  if (contentHeight !== null && (!Number.isFinite(contentHeight) || contentHeight <= 0)) {
    throw new Error("Invalid dialogue content height");
  }

  const x = 6;
  const defaultY = 78;
  const y = compact && screenHeight > screenWidth ? 96 : defaultY;
  const w = screenWidth - x * 2;
  const maximumHeight = screenHeight - y - 7;
  const compactHeight = Math.max(108, contentHeight ?? (87 + bodyLineCount * 10));
  const h = compact ? Math.min(maximumHeight, compactHeight) : maximumHeight;
  return Object.freeze({
    panel: Object.freeze({ x, y, w, h }),
    portrait: Object.freeze({ x: x + 16, y: y - 56 })
  });
}
