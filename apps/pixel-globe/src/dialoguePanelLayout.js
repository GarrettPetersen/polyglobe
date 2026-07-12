export function dialoguePanelGeometry({
  screenWidth,
  screenHeight,
  contentHeight
}) {
  if (!Number.isFinite(screenWidth) || screenWidth <= 0) throw new Error("Invalid dialogue screen width");
  if (!Number.isFinite(screenHeight) || screenHeight <= 0) throw new Error("Invalid dialogue screen height");
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) {
    throw new Error("Invalid dialogue content height");
  }

  const x = 6;
  const defaultY = 78;
  const y = screenHeight > screenWidth ? 96 : defaultY;
  const w = screenWidth - x * 2;
  const maximumHeight = screenHeight - y - 7;
  const h = Math.min(maximumHeight, Math.max(108, contentHeight));
  return Object.freeze({
    panel: Object.freeze({ x, y, w, h }),
    portrait: Object.freeze({ x: x + 16, y: y - 56 })
  });
}
