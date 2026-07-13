export const LAKE_BATTLE_HEX_COLUMN_SPACING = 24;
export const LAKE_BATTLE_HEX_ROW_SPACING = 20;

const LAKE_BATTLE_TILE_ID_BASE = 2_000_000;
const LAKE_BATTLE_LATITUDE_DEG = 18;
const LAKE_BATTLE_MIN_WIDTH = 160;
const LAKE_BATTLE_MIN_HEIGHT = 120;

export function createLakeBattleMap(width, height, seed = 0x4c414b45) {
  validateMapDimensions(width, height);
  if (!Number.isInteger(seed)) throw new Error(`Lake battle map seed must be an integer: ${seed}`);
  const originX = -LAKE_BATTLE_HEX_COLUMN_SPACING;
  const originY = -LAKE_BATTLE_HEX_ROW_SPACING;
  const columnCount = Math.ceil((width - originX) / LAKE_BATTLE_HEX_COLUMN_SPACING) + 2;
  const rowCount = Math.ceil((height - originY) / LAKE_BATTLE_HEX_ROW_SPACING) + 2;
  const cells = [];
  const cellByGridKey = new Map();
  const cellById = new Map();

  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const x = originX + column * LAKE_BATTLE_HEX_COLUMN_SPACING +
        (row % 2) * (LAKE_BATTLE_HEX_COLUMN_SPACING / 2);
      const y = originY + row * LAKE_BATTLE_HEX_ROW_SPACING;
      const id = LAKE_BATTLE_TILE_ID_BASE + row * columnCount + column;
      const cell = {
        id,
        column,
        row,
        x,
        y,
        water: initialWaterAt(width, height, x, y, seed, id),
        coastal: false,
        shoreDistance: Number.POSITIVE_INFINITY,
        neighbors: [],
        terrain: null
      };
      cells.push(cell);
      cellByGridKey.set(gridKey(column, row), cell);
      cellById.set(id, cell);
    }
  }

  for (const cell of cells) {
    for (const [columnOffset, rowOffset] of neighborOffsets(cell.row)) {
      const neighbor = cellByGridKey.get(gridKey(cell.column + columnOffset, cell.row + rowOffset));
      if (neighbor) cell.neighbors.push(neighbor.id);
    }
    cell.neighbors.sort((a, b) => a - b);
  }

  assignShoreDistances(cells, cellById);
  for (const cell of cells) {
    cell.coastal = !cell.water && cell.neighbors.some((id) => cellById.get(id).water);
  }
  for (const cell of cells) cell.terrain = terrainForCell(cell, seed);

  const map = {
    version: 1,
    width,
    height,
    seed: seed >>> 0,
    originX,
    originY,
    columnCount,
    rowCount,
    cells,
    cellById,
    cellByGridKey
  };
  assertMapHasBattleRoom(map);
  return map;
}

export function lakeBattleMapWaterAt(map, x, y, margin = 0) {
  assertLakeBattleMap(map);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Invalid lake battle point: ${x}, ${y}`);
  if (!Number.isFinite(margin) || margin < 0) throw new Error(`Invalid lake battle margin: ${margin}`);
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  if (!nearestLakeBattleCell(map, x, y).water) return false;
  if (margin === 0) return true;
  for (let index = 0; index < 8; index++) {
    const angle = index / 8 * Math.PI * 2;
    const sampleX = x + Math.cos(angle) * margin;
    const sampleY = y + Math.sin(angle) * margin;
    if (
      sampleX < 0 || sampleX >= map.width ||
      sampleY < 0 || sampleY >= map.height ||
      !nearestLakeBattleCell(map, sampleX, sampleY).water
    ) {
      return false;
    }
  }
  return true;
}

export function buildLakeBattleMapWaterMask(map) {
  assertLakeBattleMap(map);
  const mask = new Uint8Array(map.width * map.height);
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      mask[y * map.width + x] = lakeBattleMapWaterAt(map, x + 0.5, y + 0.5) ? 1 : 0;
    }
  }
  return mask;
}

export function lakeBattleMapSpawnPoint(map, side, clearanceRadius = 0) {
  assertLakeBattleMap(map);
  if (side !== "player" && side !== "enemy") throw new Error(`Unknown lake battle spawn side: ${side}`);
  if (!Number.isFinite(clearanceRadius) || clearanceRadius < 0) {
    throw new Error(`Invalid lake battle spawn clearance: ${clearanceRadius}`);
  }
  const target = side === "player"
    ? { x: map.width * 0.29, y: map.height * 0.64 }
    : { x: map.width * 0.71, y: map.height * 0.39 };
  const candidates = map.cells
    .filter((cell) => cell.water && cell.shoreDistance >= 2)
    .sort((a, b) => squaredDistance(a, target) - squaredDistance(b, target) || a.id - b.id);
  const cell = candidates.find((candidate) => lakeBattleMapWaterAt(
    map,
    candidate.x,
    candidate.y,
    clearanceRadius
  ));
  if (!cell) throw new Error(`Lake battle map has no clear ${side} spawn`);
  return { x: cell.x, y: cell.y, tileId: cell.id };
}

export function nearestLakeBattleCell(map, x, y) {
  assertLakeBattleMap(map);
  const estimatedRow = Math.round((y - map.originY) / LAKE_BATTLE_HEX_ROW_SPACING);
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let row = estimatedRow - 2; row <= estimatedRow + 2; row++) {
    const rowOffset = (row % 2) * (LAKE_BATTLE_HEX_COLUMN_SPACING / 2);
    const estimatedColumn = Math.round((x - map.originX - rowOffset) / LAKE_BATTLE_HEX_COLUMN_SPACING);
    for (let column = estimatedColumn - 2; column <= estimatedColumn + 2; column++) {
      const cell = map.cellByGridKey.get(gridKey(column, row));
      if (!cell) continue;
      const distance = squaredDistance(cell, { x, y });
      if (distance >= nearestDistance) continue;
      nearest = cell;
      nearestDistance = distance;
    }
  }
  if (!nearest) throw new Error(`Lake battle point is outside generated cells: ${x}, ${y}`);
  return nearest;
}

function initialWaterAt(width, height, x, y, seed, id) {
  const nx = (x - width * 0.5) / (width * 0.47);
  const ny = (y - height * 0.515) / (height * 0.47);
  const phase = (seed >>> 0) / 0x100000000 * Math.PI * 2;
  const edgeNoise = Math.sin(nx * 7.1 + phase) * 0.045 +
    Math.sin(ny * 8.3 - phase * 0.7) * 0.035 +
    (hashUnit(id ^ seed) - 0.5) * 0.05;
  if (nx * nx + ny * ny + edgeNoise >= 1) return false;

  const islandA = ellipseDistance(nx, ny, -0.08, -0.32, 0.08, 0.1) +
    Math.sin((nx + ny) * 31 + phase) * 0.08;
  const islandB = ellipseDistance(nx, ny, 0.38, 0.28, 0.075, 0.105) +
    Math.sin((nx - ny) * 27 - phase) * 0.1;
  return islandA > 1 && islandB > 1;
}

function assignShoreDistances(cells, cellById) {
  const queue = [];
  for (const cell of cells) {
    if (cell.water) continue;
    cell.shoreDistance = 0;
    queue.push(cell);
  }
  for (let index = 0; index < queue.length; index++) {
    const cell = queue[index];
    const nextDistance = cell.shoreDistance + 1;
    for (const neighborId of cell.neighbors) {
      const neighbor = cellById.get(neighborId);
      if (neighbor.shoreDistance <= nextDistance) continue;
      neighbor.shoreDistance = nextDistance;
      queue.push(neighbor);
    }
  }
}

function terrainForCell(cell, seed) {
  if (cell.water) {
    if (cell.shoreDistance === 1) return terrain("beach", 0, 0, null);
    if (cell.shoreDistance === 2) return terrain("lake", 0, 0, null);
    return terrain("water", 0, 0, Math.min(4, cell.shoreDistance - 2));
  }
  const variation = hashInt(cell.id ^ seed);
  const hill = !cell.coastal && variation % 13 === 0 ? 1 : 0;
  const type = variation % 5 === 0 ? "forest" : "oceanic";
  return terrain(type, hill ? 0.04 : 0, hill, null);
}

function terrain(type, elevation, hill, waterDepthBand) {
  return Object.freeze({
    t: type,
    e: elevation,
    h: hill,
    latitudeDeg: LAKE_BATTLE_LATITUDE_DEG,
    waterDepthBand
  });
}

function neighborOffsets(row) {
  return row % 2 === 0
    ? [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]]
    : [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
}

function assertMapHasBattleRoom(map) {
  const deepWaterCount = map.cells.filter((cell) => cell.water && cell.shoreDistance >= 3).length;
  const coastCount = map.cells.filter((cell) => cell.terrain.t === "beach").length;
  if (deepWaterCount < 24) throw new Error(`Lake battle map has too little deep water: ${deepWaterCount}`);
  if (coastCount < 12) throw new Error(`Lake battle map has too little coastline: ${coastCount}`);
}

function assertLakeBattleMap(map) {
  if (
    !map || map.version !== 1 ||
    !Number.isInteger(map.width) || !Number.isInteger(map.height) ||
    !Array.isArray(map.cells) || !(map.cellById instanceof Map) || !(map.cellByGridKey instanceof Map)
  ) {
    throw new Error("Invalid lake battle map");
  }
}

function validateMapDimensions(width, height) {
  if (!Number.isInteger(width) || width < LAKE_BATTLE_MIN_WIDTH) {
    throw new Error(`Invalid lake battle map width: ${width}`);
  }
  if (!Number.isInteger(height) || height < LAKE_BATTLE_MIN_HEIGHT) {
    throw new Error(`Invalid lake battle map height: ${height}`);
  }
}

function ellipseDistance(x, y, centerX, centerY, radiusX, radiusY) {
  const nx = (x - centerX) / radiusX;
  const ny = (y - centerY) / radiusY;
  return nx * nx + ny * ny;
}

function gridKey(column, row) {
  return `${column},${row}`;
}

function squaredDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function hashUnit(value) {
  return (hashInt(value) >>> 0) / 0x100000000;
}

function hashInt(value) {
  let hash = value | 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}
