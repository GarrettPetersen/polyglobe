const MODAL_STATUS_ITEM_IDS = Object.freeze([
  "date",
  "doubloons",
  "water",
  "food",
  "crew",
  "cargo"
]);

export function modalStatusBarLayout({
  screenWidth,
  screenHeight,
  items,
  minimumGap = 8,
  margin = 4,
  rowHeight = 14,
  rowGap = 3,
  maximumGap = 28
}) {
  if (!Number.isInteger(screenWidth) || screenWidth < 64 ||
      !Number.isInteger(screenHeight) || screenHeight < 64) {
    throw new Error(`Modal status bar requires a usable viewport: ${screenWidth}x${screenHeight}`);
  }
  for (const [label, value] of Object.entries({
    minimumGap, margin, rowHeight, rowGap, maximumGap
  })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid modal status bar ${label}: ${value}`);
    }
  }
  if (rowHeight <= 0 || margin * 2 >= screenWidth) {
    throw new Error("Modal status bar has no room for its readout");
  }
  const ordered = validateModalStatusItems(items);
  const innerWidth = screenWidth - margin * 2;
  const rows = wrapModalStatusRows(ordered, innerWidth, minimumGap);
  const height = margin * 2 + rows.length * rowHeight + (rows.length - 1) * rowGap;
  if (height >= screenHeight) {
    throw new Error(`Modal status bar does not fit the viewport height: ${height}`);
  }

  const placed = [];
  rows.forEach((row, rowIndex) => {
    const gap = rowItemGap(row, innerWidth, minimumGap, maximumGap);
    const y = margin + rowIndex * (rowHeight + rowGap);
    let x = margin;
    for (const item of row) {
      placed.push(Object.freeze({
        id: item.id,
        x,
        y,
        width: item.width,
        height: rowHeight
      }));
      x += item.width + gap;
    }
  });

  return Object.freeze({
    x: 0,
    y: 0,
    w: screenWidth,
    h: height,
    wide: rows.length === 1,
    items: Object.freeze(placed)
  });
}

function validateModalStatusItems(items) {
  if (!Array.isArray(items) || items.length !== MODAL_STATUS_ITEM_IDS.length) {
    throw new Error("Modal status bar requires date, doubloons, water, food, crew, and cargo");
  }
  const byId = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || !Number.isInteger(item.width) || item.width <= 0) {
      throw new Error("Modal status bar item requires an id and positive width");
    }
    if (byId.has(item.id)) throw new Error(`Duplicate modal status bar item: ${item.id}`);
    byId.set(item.id, item);
  }
  return MODAL_STATUS_ITEM_IDS.map((id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`Modal status bar is missing ${id}`);
    return item;
  });
}

function wrapModalStatusRows(items, innerWidth, minimumGap) {
  const rows = [];
  let row = [];
  let width = 0;
  for (const item of items) {
    if (item.width > innerWidth) {
      throw new Error(`Modal status item does not fit the bar: ${item.id}`);
    }
    const nextWidth = row.length === 0 ? item.width : width + minimumGap + item.width;
    if (row.length > 0 && nextWidth > innerWidth) {
      rows.push(row);
      row = [item];
      width = item.width;
      continue;
    }
    row.push(item);
    width = nextWidth;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function rowItemGap(row, innerWidth, minimumGap, maximumGap) {
  if (row.length < 2) return minimumGap;
  const contentWidth = row.reduce((total, item) => total + item.width, 0);
  const stretched = Math.floor((innerWidth - contentWidth) / (row.length - 1));
  return Math.max(minimumGap, Math.min(maximumGap, stretched));
}
