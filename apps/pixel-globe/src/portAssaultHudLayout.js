const HUD_MARGIN_PX = 6;
const HUD_HORIZONTAL_PADDING_PX = 6;
const HUD_MIN_WIDTH_PX = 72;
const HUD_HEIGHT_PX = 36;
const HUD_FIRST_LINE_Y_PX = 5;
const HUD_LINE_SPACING_PX = 10;

export function portAssaultHudLayout({ viewportWidth, viewportHeight, rowWidths }) {
  for (const [label, value] of Object.entries({ viewportWidth, viewportHeight })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid port assault HUD ${label}: ${value}`);
    }
  }
  if (!Array.isArray(rowWidths) || rowWidths.length !== 3 ||
      rowWidths.some((width) => !Number.isInteger(width) || width <= 0)) {
    throw new Error(`Port assault HUD requires three positive integer row widths: ${rowWidths}`);
  }
  const panelWidth = Math.max(
    HUD_MIN_WIDTH_PX,
    Math.max(...rowWidths) + HUD_HORIZONTAL_PADDING_PX * 2
  );
  if (panelWidth + HUD_MARGIN_PX * 2 > viewportWidth ||
      HUD_HEIGHT_PX + HUD_MARGIN_PX * 2 > viewportHeight) {
    throw new Error(
      `Port assault HUD does not fit ${viewportWidth}x${viewportHeight}: ` +
      `${panelWidth}x${HUD_HEIGHT_PX}`
    );
  }
  const panel = Object.freeze({
    x: HUD_MARGIN_PX,
    y: HUD_MARGIN_PX,
    w: panelWidth,
    h: HUD_HEIGHT_PX
  });
  return Object.freeze({
    panel,
    rows: Object.freeze(rowWidths.map((width, index) => Object.freeze({
      x: panel.x + Math.floor(panel.w / 2),
      y: panel.y + HUD_FIRST_LINE_Y_PX + index * HUD_LINE_SPACING_PX,
      width
    })))
  });
}
