import {
  LAKE_BATTLE_HEX_COLUMN_SPACING,
  LAKE_BATTLE_HEX_ROW_SPACING
} from "./lakeBattleMap.js";
import {
  LEPANTO_LAND_POLYGONS,
  LEPANTO_MAP_BOUNDS
} from "./generated/lepantoLandData.js";
import { TERRAIN_WEATHER_MODE_STATIC } from "./terrainWeatherPolicy.js";

const COAST_SAMPLE_COUNT = 8;
const HISTORICAL_BATTLE_TILE_ID_BASE = 3_000_000;
const TERRAIN_WINDOW_PADDING_CELLS = 6;

export function createHistoricalBattleMap(mapSpec) {
  if (!mapSpec?.id || !Number.isInteger(mapSpec.width) || !Number.isInteger(mapSpec.height)) {
    throw new Error("Historical battle map requires authored dimensions");
  }
  if (mapSpec.id !== "lepanto-gulf-of-patras") {
    throw new Error(`Unknown historical battle map: ${mapSpec.id}`);
  }
  const geography = lepantoGeography(mapSpec);
  const escapePoint = historicalBattleMapPointForLonLat(
    mapSpec,
    mapSpec.escape.longitudeDeg,
    mapSpec.latitudeDeg
  );
  const base = {
    version: 4,
    id: mapSpec.id,
    width: mapSpec.width,
    height: mapSpec.height,
    latitudeDeg: mapSpec.latitudeDeg,
    wind: Object.freeze({ ...mapSpec.wind }),
    escape: Object.freeze({ ...mapSpec.escape, thresholdX: escapePoint.x }),
    ...geography
  };
  return createTerrainGridDescriptor(base);
}

function lepantoGeography(mapSpec) {
  const landPolygons = LEPANTO_LAND_POLYGONS.map((polygon) => (
    Object.freeze(polygon.map((ring) => Object.freeze(ring.map(([longitudeDeg, latitudeDeg]) => (
      historicalBattleMapPointForLonLat(mapSpec, longitudeDeg, latitudeDeg)
    )))))
  ));
  return {
    bounds: LEPANTO_MAP_BOUNDS,
    landPolygons: Object.freeze(landPolygons),
    landPolygonBounds: Object.freeze(landPolygons.map(polygonBounds))
  };
}

export function historicalBattleMapPointForLonLat(map, longitudeDeg, latitudeDeg) {
  if (!Number.isFinite(longitudeDeg) || !Number.isFinite(latitudeDeg)) {
    throw new Error(`Invalid historical battle coordinate: ${longitudeDeg}, ${latitudeDeg}`);
  }
  const longitudeSpan = LEPANTO_MAP_BOUNDS.maxLongitudeDeg - LEPANTO_MAP_BOUNDS.minLongitudeDeg;
  const latitudeSpan = LEPANTO_MAP_BOUNDS.maxLatitudeDeg - LEPANTO_MAP_BOUNDS.minLatitudeDeg;
  return point(
    (longitudeDeg - LEPANTO_MAP_BOUNDS.minLongitudeDeg) / longitudeSpan * map.width,
    (LEPANTO_MAP_BOUNDS.maxLatitudeDeg - latitudeDeg) / latitudeSpan * map.height
  );
}

function createTerrainGridDescriptor(map) {
  const originX = -LAKE_BATTLE_HEX_COLUMN_SPACING;
  const originY = -LAKE_BATTLE_HEX_ROW_SPACING;
  const columnCount = Math.ceil((map.width - originX) / LAKE_BATTLE_HEX_COLUMN_SPACING) + 2;
  const rowCount = Math.ceil((map.height - originY) / LAKE_BATTLE_HEX_ROW_SPACING) + 2;
  return Object.freeze({ ...map, originX, originY, columnCount, rowCount });
}

export function historicalBattleTerrainWindowMap(map, bounds) {
  assertMap(map);
  assertBounds(bounds);
  const minRow = clampInteger(
    Math.floor((bounds.minY - map.originY) / LAKE_BATTLE_HEX_ROW_SPACING) -
      TERRAIN_WINDOW_PADDING_CELLS,
    0,
    map.rowCount - 1
  );
  const maxRow = clampInteger(
    Math.ceil((bounds.maxY - map.originY) / LAKE_BATTLE_HEX_ROW_SPACING) +
      TERRAIN_WINDOW_PADDING_CELLS,
    0,
    map.rowCount - 1
  );
  const cells = [];
  const cellByGridKey = new Map();
  const cellById = new Map();
  for (let row = minRow; row <= maxRow; row++) {
    const rowOffset = (row % 2) * LAKE_BATTLE_HEX_COLUMN_SPACING / 2;
    const minColumn = clampInteger(
      Math.floor((bounds.minX - map.originX - rowOffset) / LAKE_BATTLE_HEX_COLUMN_SPACING) -
        TERRAIN_WINDOW_PADDING_CELLS,
      0,
      map.columnCount - 1
    );
    const maxColumn = clampInteger(
      Math.ceil((bounds.maxX - map.originX - rowOffset) / LAKE_BATTLE_HEX_COLUMN_SPACING) +
        TERRAIN_WINDOW_PADDING_CELLS,
      0,
      map.columnCount - 1
    );
    for (let column = minColumn; column <= maxColumn; column++) {
      const x = map.originX + column * LAKE_BATTLE_HEX_COLUMN_SPACING +
        (row % 2) * LAKE_BATTLE_HEX_COLUMN_SPACING / 2;
      const y = map.originY + row * LAKE_BATTLE_HEX_ROW_SPACING;
      const id = HISTORICAL_BATTLE_TILE_ID_BASE + row * map.columnCount + column;
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
    const latitudeDeg = LEPANTO_MAP_BOUNDS.maxLatitudeDeg - cell.y / map.height *
      (LEPANTO_MAP_BOUNDS.maxLatitudeDeg - LEPANTO_MAP_BOUNDS.minLatitudeDeg);
    cell.terrain = terrainForCell(cell, latitudeDeg);
  }
  return {
    ...map,
    cells,
    cellById,
    cellByGridKey
  };
}

export function historicalBattleMapWaterAt(map, x, y, margin = 0) {
  assertMap(map);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid historical battle map point: ${x}, ${y}`);
  }
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error(`Invalid historical battle map margin: ${margin}`);
  }
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  if (!pointIsWater(map, x, y)) return false;
  if (margin === 0) return true;
  if (!pointMayBeNearLand(map, x, y, margin)) return true;
  for (let index = 0; index < COAST_SAMPLE_COUNT; index++) {
    const angle = index / COAST_SAMPLE_COUNT * Math.PI * 2;
    if (!pointIsWater(map, x + Math.cos(angle) * margin, y + Math.sin(angle) * margin)) return false;
  }
  return true;
}

function pointMayBeNearLand(map, x, y, margin) {
  return map.landPolygonBounds.some((bounds) => (
    x + margin >= bounds.minX && x - margin <= bounds.maxX &&
    y + margin >= bounds.minY && y - margin <= bounds.maxY
  ));
}

export function historicalBattleMapEscapeAt(map, sideId, x, y) {
  assertMap(map);
  if (sideId !== map.escape.sideId || map.escape.edge !== "east") return false;
  return x >= map.escape.thresholdX && historicalBattleMapWaterAt(map, x, y, 6);
}

export function historicalBattleMapPolygons(map) {
  assertMap(map);
  return Object.freeze(map.landPolygons.map((polygon) => polygon[0]));
}

export function historicalBattleMinimapLandMask(map, width, height) {
  assertMap(map);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid historical battle minimap dimensions: ${width}x${height}`);
  }
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const worldY = (y + 0.5) / height * map.height;
    for (let x = 0; x < width; x++) {
      const worldX = (x + 0.5) / width * map.width;
      if (!historicalBattleMapWaterAt(map, worldX, worldY)) mask[x + y * width] = 1;
    }
  }
  return mask;
}

function pointIsWater(map, x, y) {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  for (let index = 0; index < map.landPolygons.length; index++) {
    if (!pointInBounds(x, y, map.landPolygonBounds[index])) continue;
    const polygon = map.landPolygons[index];
    if (!pointInRing(x, y, polygon[0])) continue;
    if (polygon.slice(1).some((ring) => pointInRing(x, y, ring))) continue;
    return false;
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
  return Object.freeze({
    t,
    e,
    h,
    latitudeDeg,
    weatherMode: TERRAIN_WEATHER_MODE_STATIC,
    waterDepthBand
  });
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const a = ring[index];
    const b = ring[previous];
    if ((a.y > y) === (b.y > y)) continue;
    const crossingX = (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x;
    if (x < crossingX) inside = !inside;
  }
  return inside;
}

function polygonBounds(polygon) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const ring of polygon) {
    for (const { x, y } of ring) {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return Object.freeze(bounds);
}

function pointInBounds(x, y, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

function assertBounds(bounds) {
  if (!bounds || !Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY) ||
      !Number.isFinite(bounds.maxX) || !Number.isFinite(bounds.maxY) ||
      bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new Error("Invalid historical battle terrain window bounds");
  }
}

function neighborOffsets(row) {
  return row % 2 === 0
    ? [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]]
    : [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
}

function point(x, y) {
  return Object.freeze({ x, y });
}

function clampInteger(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
    !map || map.version !== 4 || map.id !== "lepanto-gulf-of-patras" ||
    !Array.isArray(map.landPolygons) || !Number.isInteger(map.columnCount) ||
    !Number.isInteger(map.rowCount)
  ) {
    throw new Error("Invalid historical battle map");
  }
}
