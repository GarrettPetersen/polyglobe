export function createBattleSpatialGrid(cellSize = 96) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new Error(`Invalid battle spatial-grid cell size: ${cellSize}`);
  }
  return {
    cellSize,
    cells: new Map(),
    itemCount: 0,
    rebuildCount: 0
  };
}

export function rebuildBattleSpatialGrid(grid, items, active = (item, _index) => item.active !== false) {
  assertGrid(grid);
  if (!Array.isArray(items)) throw new Error("Battle spatial grid requires an item array");
  if (typeof active !== "function") throw new Error("Battle spatial grid requires an activity predicate");
  grid.cells.clear();
  grid.itemCount = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (!active(item, index)) continue;
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) {
      throw new Error(`Battle spatial-grid item has invalid coordinates: ${index}`);
    }
    const key = cellKey(Math.floor(item.x / grid.cellSize), Math.floor(item.y / grid.cellSize));
    let bucket = grid.cells.get(key);
    if (!bucket) {
      bucket = [];
      grid.cells.set(key, bucket);
    }
    bucket.push(index);
    grid.itemCount += 1;
  }
  grid.rebuildCount += 1;
  return grid;
}

export function queryBattleSpatialGrid(grid, x, y, radius, output = []) {
  assertGrid(grid);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius < 0) {
    throw new Error(`Invalid battle spatial-grid query: ${x}, ${y}, ${radius}`);
  }
  if (!Array.isArray(output)) throw new Error("Battle spatial-grid output must be an array");
  output.length = 0;
  const minColumn = Math.floor((x - radius) / grid.cellSize);
  const maxColumn = Math.floor((x + radius) / grid.cellSize);
  const minRow = Math.floor((y - radius) / grid.cellSize);
  const maxRow = Math.floor((y + radius) / grid.cellSize);
  for (let row = minRow; row <= maxRow; row++) {
    for (let column = minColumn; column <= maxColumn; column++) {
      const bucket = grid.cells.get(cellKey(column, row));
      if (bucket) output.push(...bucket);
    }
  }
  return output;
}

function cellKey(column, row) {
  return `${column}:${row}`;
}

function assertGrid(grid) {
  if (!grid || !Number.isFinite(grid.cellSize) || !(grid.cells instanceof Map)) {
    throw new Error("Invalid battle spatial grid");
  }
}
