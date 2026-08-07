import {
  LAKE_BATTLE_HEX_COLUMN_SPACING,
  LAKE_BATTLE_HEX_ROW_SPACING
} from "./lakeBattleMap.js";

const COAST_SAMPLE_COUNT = 8;
const HISTORICAL_BATTLE_TILE_ID_BASE = 3_000_000;
const LEPANTO_REFERENCE_WIDTH = 3072;
const LEPANTO_REFERENCE_HEIGHT = 1728;

export function createHistoricalBattleMap(mapSpec) {
  if (!mapSpec?.id || !Number.isInteger(mapSpec.width) || !Number.isInteger(mapSpec.height)) {
    throw new Error("Historical battle map requires authored dimensions");
  }
  if (mapSpec.id !== "lepanto-gulf-of-patras") {
    throw new Error(`Unknown historical battle map: ${mapSpec.id}`);
  }
  const coast = lepantoCoast(mapSpec);
  const base = {
    version: 2,
    id: mapSpec.id,
    width: mapSpec.width,
    height: mapSpec.height,
    latitudeDeg: mapSpec.latitudeDeg,
    wind: Object.freeze({ ...mapSpec.wind }),
    escape: Object.freeze({ ...mapSpec.escape }),
    ...coast
  };
  return buildTerrainGrid(base);
}

function lepantoCoast(mapSpec) {
  const scaleX = mapSpec.width / LEPANTO_REFERENCE_WIDTH;
  const scaleY = mapSpec.height / LEPANTO_REFERENCE_HEIGHT;
  const scaledPoint = (x, y) => point(x * scaleX, y * scaleY);
  return {
    northCoast: Object.freeze([
      scaledPoint(0, 168), scaledPoint(360, 138), scaledPoint(760, 182), scaledPoint(1160, 132),
      scaledPoint(1560, 178), scaledPoint(1940, 218), scaledPoint(2260, 318), scaledPoint(2520, 420),
      scaledPoint(2780, 532), scaledPoint(LEPANTO_REFERENCE_WIDTH, 586)
    ]),
    southCoast: Object.freeze([
      scaledPoint(0, 1550), scaledPoint(380, 1584), scaledPoint(780, 1538), scaledPoint(1180, 1592),
      scaledPoint(1580, 1542), scaledPoint(1940, 1500), scaledPoint(2260, 1406), scaledPoint(2520, 1308),
      scaledPoint(2780, 1190), scaledPoint(LEPANTO_REFERENCE_WIDTH, 1138)
    ]),
    islands: Object.freeze([
      Object.freeze({
        x: 210 * scaleX,
        y: 535 * scaleY,
        radiusX: 78 * scaleX,
        radiusY: 160 * scaleY
      }),
      Object.freeze({
        x: 320 * scaleX,
        y: 380 * scaleY,
        radiusX: 44 * scaleX,
        radiusY: 76 * scaleY
      })
    ])
  };
}

function buildTerrainGrid(map) {
  const originX = -LAKE_BATTLE_HEX_COLUMN_SPACING;
  const originY = -LAKE_BATTLE_HEX_ROW_SPACING;
  const columnCount = Math.ceil((map.width - originX) / LAKE_BATTLE_HEX_COLUMN_SPACING) + 2;
  const rowCount = Math.ceil((map.height - originY) / LAKE_BATTLE_HEX_ROW_SPACING) + 2;
  const cells = [];
  const cellByGridKey = new Map();
  const cellById = new Map();
  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      const x = originX + column * LAKE_BATTLE_HEX_COLUMN_SPACING +
        (row % 2) * LAKE_BATTLE_HEX_COLUMN_SPACING / 2;
      const y = originY + row * LAKE_BATTLE_HEX_ROW_SPACING;
      const id = HISTORICAL_BATTLE_TILE_ID_BASE + row * columnCount + column;
      const cell = {
        id,
        column,
        row,
        x,
        y,
        water: pointIsWater(map, x, y),
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
    cell.terrain = terrainForCell(cell, map.latitudeDeg);
  }
  return Object.freeze({
    ...map,
    originX,
    originY,
    columnCount,
    rowCount,
    cells: Object.freeze(cells),
    cellById,
    cellByGridKey
  });
}

export function historicalBattleMapWaterAt(map, x, y, margin = 0) {
  assertMap(map);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid historical battle map point: ${x}, ${y}`);
  }
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error(`Invalid historical battle map margin: ${margin}`);
  }
  if (!pointIsWater(map, x, y)) return false;
  if (margin === 0) return true;
  for (let index = 0; index < COAST_SAMPLE_COUNT; index++) {
    const angle = index / COAST_SAMPLE_COUNT * Math.PI * 2;
    if (!pointIsWater(map, x + Math.cos(angle) * margin, y + Math.sin(angle) * margin)) return false;
  }
  return true;
}

export function historicalBattleMapEscapeAt(map, sideId, x, y) {
  assertMap(map);
  if (sideId !== map.escape.sideId || map.escape.edge !== "east") return false;
  return x >= map.width - 2 && y > interpolatedCoastY(map.northCoast, map.width) + 12 &&
    y < interpolatedCoastY(map.southCoast, map.width) - 12;
}

export function historicalBattleMapPolygons(map) {
  assertMap(map);
  return Object.freeze([
    Object.freeze([point(0, 0), point(map.width, 0), ...[...map.northCoast].reverse()]),
    Object.freeze([...map.southCoast, point(map.width, map.height), point(0, map.height)])
  ]);
}

function pointIsWater(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  if (y <= interpolatedCoastY(map.northCoast, x)) return false;
  if (y >= interpolatedCoastY(map.southCoast, x)) return false;
  for (const island of map.islands) {
    const dx = (x - island.x) / island.radiusX;
    const dy = (y - island.y) / island.radiusY;
    if (dx * dx + dy * dy <= 1) return false;
  }
  return true;
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
    const distance = cell.shoreDistance + 1;
    for (const neighborId of cell.neighbors) {
      const neighbor = cellById.get(neighborId);
      if (neighbor.shoreDistance <= distance) continue;
      neighbor.shoreDistance = distance;
      queue.push(neighbor);
    }
  }
}

function terrainForCell(cell, latitudeDeg) {
  if (cell.water) {
    if (cell.shoreDistance === 1) return terrain("beach", 0, 0, null, latitudeDeg);
    if (cell.shoreDistance === 2) return terrain("lake", 0, 0, null, latitudeDeg);
    return terrain("water", 0, 0, Math.min(4, cell.shoreDistance - 2), latitudeDeg);
  }
  const variation = hashInt(cell.id);
  const hill = !cell.coastal && variation % 17 === 0 ? 1 : 0;
  return terrain(variation % 7 === 0 ? "forest" : "oceanic", hill ? 0.04 : 0, hill, null, latitudeDeg);
}

function terrain(t, e, h, waterDepthBand, latitudeDeg) {
  return Object.freeze({ t, e, h, latitudeDeg, waterDepthBand });
}

function interpolatedCoastY(points, x) {
  for (let index = 1; index < points.length; index++) {
    const right = points[index];
    if (x > right.x) continue;
    const left = points[index - 1];
    const span = right.x - left.x;
    const t = span <= 0 ? 0 : (x - left.x) / span;
    return left.y + (right.y - left.y) * t;
  }
  return points[points.length - 1].y;
}

function neighborOffsets(row) {
  return row % 2 === 0
    ? [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]]
    : [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
}

function point(x, y) {
  return Object.freeze({ x, y });
}

function gridKey(column, row) {
  return `${column},${row}`;
}

function hashInt(value) {
  let hash = value | 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function assertMap(map) {
  if (
    !map || map.version !== 2 || map.id !== "lepanto-gulf-of-patras" ||
    !Array.isArray(map.northCoast) || !Array.isArray(map.cells)
  ) {
    throw new Error("Invalid historical battle map");
  }
}
