export function stepAboardGridIndex(index, direction, itemCount, columnCount) {
  assertGrid(index, itemCount, columnCount);
  if (!["left", "right", "up", "down"].includes(direction)) {
    throw new Error("Unknown aboard grid direction: " + direction);
  }

  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const rowStart = row * columnCount;
  const rowEnd = Math.min(itemCount - 1, rowStart + columnCount - 1);
  if (direction === "left") return Math.max(rowStart, index - 1);
  if (direction === "right") return Math.min(rowEnd, index + 1);
  if (direction === "up") return index >= columnCount ? index - columnCount : index;

  const nextRowStart = rowStart + columnCount;
  if (nextRowStart >= itemCount) return index;
  return Math.min(nextRowStart + column, itemCount - 1);
}

function assertGrid(index, itemCount, columnCount) {
  if (!Number.isInteger(itemCount) || itemCount <= 0) {
    throw new Error("Invalid aboard grid item count: " + itemCount);
  }
  if (!Number.isInteger(columnCount) || columnCount <= 0 || columnCount > itemCount) {
    throw new Error("Invalid aboard grid column count: " + columnCount);
  }
  if (!Number.isInteger(index) || index < 0 || index >= itemCount) {
    throw new Error("Invalid aboard grid index: " + index);
  }
}
