const DEFAULT_ICON_SIZE = 6;
const DEFAULT_PANEL_PADDING = 5;
const DEFAULT_PANEL_MINIMUM_WIDTH = 120;
const DEFAULT_CRATE_TOP = 43;
const DEFAULT_PANEL_BOTTOM_PADDING = 3;
const DEFAULT_VALUE_GAP = 4;

export function cargoCrateStatusLayout({
  used,
  capacity,
  panelX,
  panelY,
  maximumPanelWidth,
  minimumPanelWidth = DEFAULT_PANEL_MINIMUM_WIDTH,
  iconSize = DEFAULT_ICON_SIZE,
  panelPadding = DEFAULT_PANEL_PADDING,
  crateTop = DEFAULT_CRATE_TOP,
  panelBottomPadding = DEFAULT_PANEL_BOTTOM_PADDING,
  valueWidth,
  valueGap = DEFAULT_VALUE_GAP
}) {
  for (const [label, value] of Object.entries({
    capacity,
    panelX,
    panelY,
    maximumPanelWidth,
    minimumPanelWidth,
    iconSize,
    panelPadding,
    crateTop,
    panelBottomPadding,
    valueWidth,
    valueGap
  })) {
    if (!Number.isInteger(value)) throw new Error(`Cargo crate ${label} must be an integer: ${value}`);
  }
  if (!Number.isFinite(used)) throw new Error(`Cargo crate used space must be finite: ${used}`);
  if (capacity <= 0) throw new Error(`Cargo crate capacity must be positive: ${capacity}`);
  if (used < 0 || used > capacity + 1e-8) {
    throw new Error(`Cargo crate used space is outside the hold: ${used}/${capacity}`);
  }
  if (iconSize <= 0 || panelPadding < 0 || crateTop < 0 || panelBottomPadding < 0 ||
      valueWidth <= 0 || valueGap < 0) {
    throw new Error("Cargo crate dimensions must be non-negative with a positive icon size");
  }
  const valueReserve = valueGap + valueWidth;
  const minimumContentWidth = panelPadding * 2 + iconSize + valueReserve;
  if (minimumPanelWidth < minimumContentWidth || maximumPanelWidth < minimumPanelWidth) {
    throw new Error(`Cargo crate panel width is invalid: ${minimumPanelWidth}-${maximumPanelWidth}`);
  }

  const maximumSlotsPerRow = maximumPanelWidth - panelPadding * 2 - valueReserve - iconSize + 1;
  if (maximumSlotsPerRow <= 0) {
    throw new Error(`Cargo crate value column leaves no room for crates: ${maximumPanelWidth}px`);
  }
  const rowCount = Math.ceil(capacity / maximumSlotsPerRow);
  const rowCapacity = Math.ceil(capacity / rowCount);
  const minimumPackedWidth = panelPadding * 2 + valueReserve + iconSize + rowCapacity - 1;
  const panelWidth = Math.max(minimumPanelWidth, minimumPackedWidth);
  if (panelWidth > maximumPanelWidth) {
    throw new Error(`Cargo crate rows cannot fit ${capacity} units inside ${maximumPanelWidth}px`);
  }

  const innerWidth = panelWidth - panelPadding * 2 - valueReserve;
  const pitch = rowCapacity <= 1
    ? iconSize + 1
    : Math.min(iconSize + 1, Math.floor((innerWidth - iconSize) / (rowCapacity - 1)));
  if (pitch < 1) throw new Error(`Cargo crate pitch is not pixel-visible: ${pitch}`);
  const occupiedCount = Math.min(capacity, Math.ceil(Math.max(0, used) - 1e-8));
  const entries = Array.from({ length: capacity }, (_entry, index) => {
    const row = Math.floor(index / rowCapacity);
    const column = index % rowCapacity;
    return Object.freeze({
      index,
      row,
      full: index < occupiedCount,
      x: panelX + panelPadding + column * pitch,
      y: panelY + crateTop + row * iconSize
    });
  });
  const panelHeight = crateTop + rowCount * iconSize + panelBottomPadding;

  return Object.freeze({
    panel: Object.freeze({ x: panelX, y: panelY, width: panelWidth, height: panelHeight }),
    value: Object.freeze({
      right: panelX + panelWidth - panelPadding,
      y: panelY + crateTop - 1,
      width: valueWidth,
      text: `${occupiedCount}/${capacity}`
    }),
    entries: Object.freeze(entries),
    occupiedCount,
    rowCapacity,
    rowCount,
    pitch
  });
}
