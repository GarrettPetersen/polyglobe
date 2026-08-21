export function createStaticPointIndex(entries, {
  cellSize = 32,
  pointForEntry = defaultPointForEntry
} = {}) {
  if (!Array.isArray(entries)) {
    throw new Error("Static point index requires entries");
  }
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    throw new Error(`Static point index requires a positive cell size: ${cellSize}`);
  }
  if (typeof pointForEntry !== "function") {
    throw new Error("Static point index requires a point accessor");
  }

  const cells = new Map();
  let minCellX = Number.POSITIVE_INFINITY;
  let minCellY = Number.POSITIVE_INFINITY;
  let maxCellX = Number.NEGATIVE_INFINITY;
  let maxCellY = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    const point = pointForEntry(entry);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error("Static point index found an entry without a finite point");
    }
    const cellX = Math.floor(point.x / cellSize);
    const cellY = Math.floor(point.y / cellSize);
    const key = cellKey(cellX, cellY);
    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    bucket.push(Object.freeze({ entry, x: point.x, y: point.y }));
    minCellX = Math.min(minCellX, cellX);
    minCellY = Math.min(minCellY, cellY);
    maxCellX = Math.max(maxCellX, cellX);
    maxCellY = Math.max(maxCellY, cellY);
  }

  return Object.freeze({
    cellSize,
    cells,
    minCellX,
    minCellY,
    maxCellX,
    maxCellY,
    size: entries.length
  });
}

export function nearestStaticPoint(index, x, y) {
  requireIndexAndPoint(index, x, y);
  if (index.size === 0) return null;

  const centerCellX = Math.floor(x / index.cellSize);
  const centerCellY = Math.floor(y / index.cellSize);
  const maximumRing = Math.max(
    Math.abs(centerCellX - index.minCellX),
    Math.abs(centerCellX - index.maxCellX),
    Math.abs(centerCellY - index.minCellY),
    Math.abs(centerCellY - index.maxCellY)
  );
  /** @type {{ entry: any, x: number, y: number } | null} */
  let nearest = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  for (let ring = 0; ring <= maximumRing; ring++) {
    forEachCellInRing(centerCellX, centerCellY, ring, (cellX, cellY) => {
      const bucket = index.cells.get(cellKey(cellX, cellY));
      if (!bucket) return;
      for (const point of bucket) {
        const dx = point.x - x;
        const dy = point.y - y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= nearestDistanceSquared) continue;
        nearest = point;
        nearestDistanceSquared = distanceSquared;
      }
    });
    if (!nearest) continue;

    const minimumUnsearchedDistance = Math.min(
      x - (centerCellX - ring) * index.cellSize,
      (centerCellX + ring + 1) * index.cellSize - x,
      y - (centerCellY - ring) * index.cellSize,
      (centerCellY + ring + 1) * index.cellSize - y
    );
    if (nearestDistanceSquared <= minimumUnsearchedDistance * minimumUnsearchedDistance) break;
  }
  return nearest
    ? Object.freeze({ ...nearest, distanceSquared: nearestDistanceSquared })
    : null;
}

export function forEachStaticPointInRadius(index, x, y, radius, visit) {
  requireIndexAndPoint(index, x, y);
  if (!Number.isFinite(radius) || radius < 0) {
    throw new Error(`Static point radius must be non-negative: ${radius}`);
  }
  if (typeof visit !== "function") {
    throw new Error("Static point radius query requires a visitor");
  }
  if (index.size === 0 || radius === 0) return;

  const radiusSquared = radius * radius;
  const minCellX = Math.floor((x - radius) / index.cellSize);
  const minCellY = Math.floor((y - radius) / index.cellSize);
  const maxCellX = Math.floor((x + radius) / index.cellSize);
  const maxCellY = Math.floor((y + radius) / index.cellSize);
  for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      const bucket = index.cells.get(cellKey(cellX, cellY));
      if (!bucket) continue;
      for (const point of bucket) {
        const dx = point.x - x;
        const dy = point.y - y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radiusSquared) continue;
        visit(point, distanceSquared);
      }
    }
  }
}

function defaultPointForEntry(entry) {
  return { x: entry?.x, y: entry?.y };
}

function requireIndexAndPoint(index, x, y) {
  if (!index || !(index.cells instanceof Map) || !Number.isFinite(index.cellSize)) {
    throw new Error("Static point query requires an index");
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Static point query requires a finite point: ${x},${y}`);
  }
}

function forEachCellInRing(centerCellX, centerCellY, ring, visit) {
  if (ring === 0) {
    visit(centerCellX, centerCellY);
    return;
  }
  const minX = centerCellX - ring;
  const maxX = centerCellX + ring;
  const minY = centerCellY - ring;
  const maxY = centerCellY + ring;
  for (let cellX = minX; cellX <= maxX; cellX++) {
    visit(cellX, minY);
    visit(cellX, maxY);
  }
  for (let cellY = minY + 1; cellY < maxY; cellY++) {
    visit(minX, cellY);
    visit(maxX, cellY);
  }
}

function cellKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}
