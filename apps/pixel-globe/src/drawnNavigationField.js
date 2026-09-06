const DEFAULT_PADDING = 12;
const DISTANCE_ORTHOGONAL = 3;
const DISTANCE_DIAGONAL = 4;
const DISTANCE_INFINITY = 0xffff;
const WATER_EDGE_TOLERANCE_PX = 1;

export function rasterizeDrawnNavigationChunk({
  originX,
  originY,
  size,
  candidates,
  maxDistancePx,
  isWaterTile,
  isRiverTile,
  isUsableWaterTile,
  tileRaster,
  padding = DEFAULT_PADDING
}) {
  validateInputs({
    originX,
    originY,
    size,
    candidates,
    maxDistancePx,
    isWaterTile,
    isRiverTile,
    isUsableWaterTile,
    tileRaster,
    padding
  });
  const rasterSize = size + padding * 2;
  const rasterOriginX = originX - padding;
  const rasterOriginY = originY - padding;
  const cellCount = rasterSize * rasterSize;
  const tileIds = new Int32Array(cellCount);
  tileIds.fill(-1);
  const water = new Uint8Array(cellCount);
  const source = new Uint8Array(cellCount);
  const orderedTiles = candidates
    .filter((entry) => entry?.kind === "tile")
    .sort((a, b) => a.drawOrder - b.drawOrder);
  const landmassChannels = candidates.filter((entry) => entry?.kind === "landmassChannel");

  for (const entry of landmassChannels) {
    const { tileId, kind } = entry.navigationAnchor;
    if (!Number.isInteger(tileId) || tileId < 0 ||
        !(kind === "surface" ? isWaterTile(tileId) : kind === "river" && isRiverTile(tileId))) {
      throw new Error(`Invalid landmass channel navigation anchor: ${kind}/${tileId}`);
    }
    overlayTileRaster({
      raster: entry.raster,
      tileId,
      navigable: isUsableWaterTile(tileId),
      sourceValue: kind === "river" ? 4 : 3,
      rasterOriginX,
      rasterOriginY,
      rasterSize,
      tileIds,
      water,
      source
    });
  }

  for (const entry of orderedTiles) {
    const raster = tileRaster(entry.call);
    overlayTileRaster({
      raster,
      tileId: entry.call.id,
      navigable: isWaterTile(entry.call.id) && isUsableWaterTile(entry.call.id),
      sourceValue: 1,
      rasterOriginX,
      rasterOriginY,
      rasterSize,
      tileIds,
      water,
      source
    });
  }
  fillConnectorGaps({
    orderedTiles,
    rasterOriginX,
    rasterOriginY,
    rasterSize,
    maxDistancePx,
    isWaterTile,
    isUsableWaterTile,
    tileIds,
    water,
    source
  });

  const distance = navigationDistanceField(water, rasterSize);
  const clearance = new Uint8Array(size * size);
  const flowX = new Int8Array(size * size);
  const flowY = new Int8Array(size * size);
  const innerTileIds = new Int32Array(size * size);
  const innerWater = new Uint8Array(size * size);
  const innerSource = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const innerIndex = x + y * size;
      const rasterIndex = x + padding + (y + padding) * rasterSize;
      innerTileIds[innerIndex] = tileIds[rasterIndex];
      innerWater[innerIndex] = water[rasterIndex];
      innerSource[innerIndex] = source[rasterIndex];
      if (!water[rasterIndex]) continue;
      clearance[innerIndex] = Math.min(255, Math.floor(distance[rasterIndex] / DISTANCE_ORTHOGONAL));
      const flow = clearanceFlow(distance, rasterSize, x + padding, y + padding);
      flowX[innerIndex] = flow.x;
      flowY[innerIndex] = flow.y;
    }
  }

  return Object.freeze({
    originX,
    originY,
    size,
    tileIds: innerTileIds,
    water: innerWater,
    source: innerSource,
    clearance,
    flowX,
    flowY
  });
}

export function drawnNavigationFieldPoint(chunk, x, y) {
  if (!chunk || !Number.isInteger(chunk.size) || chunk.size <= 0) {
    throw new Error("Drawn navigation lookup requires a raster chunk");
  }
  const localX = Math.round(x) - chunk.originX;
  const localY = Math.round(y) - chunk.originY;
  if (localX < 0 || localY < 0 || localX >= chunk.size || localY >= chunk.size) return null;
  const index = localX + localY * chunk.size;
  const tileId = chunk.tileIds[index];
  if (tileId < 0) return null;
  return Object.freeze({
    tileId,
    water: chunk.water[index] === 1,
    riverTileId: chunk.source[index] === 4 ? tileId : null,
    source: chunk.source[index] === 1
      ? "opaque-sprite"
      : chunk.source[index] === 3 || chunk.source[index] === 4
        ? "landmass-channel"
        : "connector-gap",
    clearancePx: chunk.clearance[index],
    flow: chunk.flowX[index] === 0 && chunk.flowY[index] === 0
      ? null
      : { x: chunk.flowX[index], y: chunk.flowY[index] }
  });
}

function overlayTileRaster({
  raster,
  tileId,
  navigable,
  sourceValue,
  rasterOriginX,
  rasterOriginY,
  rasterSize,
  tileIds,
  water,
  source
}) {
  validateRaster(raster, tileId);
  const startX = Math.max(0, raster.x - rasterOriginX);
  const startY = Math.max(0, raster.y - rasterOriginY);
  const endX = Math.min(rasterSize, raster.x + raster.width - rasterOriginX);
  const endY = Math.min(rasterSize, raster.y + raster.height - rasterOriginY);
  for (let y = startY; y < endY; y++) {
    const sourceY = rasterOriginY + y - raster.y;
    for (let x = startX; x < endX; x++) {
      const sourceX = rasterOriginX + x - raster.x;
      if (raster.alpha[sourceX + sourceY * raster.width] === 0) continue;
      const index = x + y * rasterSize;
      tileIds[index] = tileId;
      water[index] = navigable ? 1 : 0;
      source[index] = sourceValue;
    }
  }
}

function fillConnectorGaps({
  orderedTiles,
  rasterOriginX,
  rasterOriginY,
  rasterSize,
  maxDistancePx,
  isWaterTile,
  isUsableWaterTile,
  tileIds,
  water,
  source
}) {
  const surfaceTiles = orderedTiles.map((entry) => Object.freeze({
    entry,
    navigable: isWaterTile(entry.call.id) && isUsableWaterTile(entry.call.id)
  }));
  const maxDistance2 = maxDistancePx * maxDistancePx;
  for (let y = 0; y < rasterSize; y++) {
    for (let x = 0; x < rasterSize; x++) {
      const index = x + y * rasterSize;
      if (tileIds[index] >= 0) continue;
      const worldX = rasterOriginX + x;
      const worldY = rasterOriginY + y;
      let nearestSurface = null;
      let nearestSurfaceNavigable = false;
      let nearestSurfaceDistance2 = maxDistance2;
      let nearestWater = null;
      let nearestWaterDistance2 = maxDistance2;
      for (const candidate of surfaceTiles) {
        const { entry } = candidate;
        const dx = entry.call.drawSurfaceX - worldX;
        const dy = entry.call.drawSurfaceY - worldY;
        const distance2 = dx * dx + dy * dy;
        if (distance2 < nearestSurfaceDistance2) {
          nearestSurface = entry;
          nearestSurfaceNavigable = candidate.navigable;
          nearestSurfaceDistance2 = distance2;
        }
        if (
          candidate.navigable &&
          distance2 < nearestWaterDistance2
        ) {
          nearestWater = entry;
          nearestWaterDistance2 = distance2;
        }
      }
      if (!nearestSurface) continue;
      const waterWithinEdgeTolerance = nearestWater &&
        Math.sqrt(nearestWaterDistance2) <=
          Math.sqrt(nearestSurfaceDistance2) + WATER_EDGE_TOLERANCE_PX;
      const surface = nearestSurfaceNavigable || waterWithinEdgeTolerance
        ? nearestWater || nearestSurface
        : nearestSurface;
      tileIds[index] = surface.call.id;
      water[index] = surface === nearestWater || nearestSurfaceNavigable ? 1 : 0;
      source[index] = 2;
    }
  }
}

function navigationDistanceField(water, size) {
  const distance = new Uint16Array(water.length);
  for (let index = 0; index < water.length; index++) {
    distance[index] = water[index] ? DISTANCE_INFINITY : 0;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      relaxDistance(distance, size, x, y, -1, 0, DISTANCE_ORTHOGONAL);
      relaxDistance(distance, size, x, y, 0, -1, DISTANCE_ORTHOGONAL);
      relaxDistance(distance, size, x, y, -1, -1, DISTANCE_DIAGONAL);
      relaxDistance(distance, size, x, y, 1, -1, DISTANCE_DIAGONAL);
    }
  }
  for (let y = size - 1; y >= 0; y--) {
    for (let x = size - 1; x >= 0; x--) {
      relaxDistance(distance, size, x, y, 1, 0, DISTANCE_ORTHOGONAL);
      relaxDistance(distance, size, x, y, 0, 1, DISTANCE_ORTHOGONAL);
      relaxDistance(distance, size, x, y, 1, 1, DISTANCE_DIAGONAL);
      relaxDistance(distance, size, x, y, -1, 1, DISTANCE_DIAGONAL);
    }
  }
  return distance;
}

function relaxDistance(distance, size, x, y, dx, dy, cost) {
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= size || ny >= size) return;
  const index = x + y * size;
  const candidate = distance[nx + ny * size] + cost;
  if (candidate < distance[index]) distance[index] = candidate;
}

function clearanceFlow(distance, size, x, y) {
  const center = distance[x + y * size];
  let best = center;
  let bestX = 0;
  let bestY = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const value = distance[x + dx + (y + dy) * size];
      if (value <= best) continue;
      best = value;
      bestX = dx;
      bestY = dy;
    }
  }
  return { x: bestX, y: bestY };
}

function validateInputs(options) {
  if (!Number.isInteger(options.originX) || !Number.isInteger(options.originY) ||
      !Number.isInteger(options.size) || options.size <= 0 ||
      !Number.isInteger(options.padding) || options.padding < 1) {
    throw new Error("Drawn navigation raster requires integer bounds and positive padding");
  }
  if (!Array.isArray(options.candidates)) {
    throw new Error("Drawn navigation raster requires candidates");
  }
  if (!Number.isFinite(options.maxDistancePx) || options.maxDistancePx <= 0) {
    throw new Error("Drawn navigation raster requires a positive gap distance");
  }
  for (const predicate of [options.isWaterTile, options.isRiverTile, options.isUsableWaterTile, options.tileRaster]) {
    if (typeof predicate !== "function") {
      throw new Error("Drawn navigation raster requires tile predicates and raster access");
    }
  }
}

function validateRaster(raster, tileId) {
  if (!raster || !Number.isInteger(raster.x) || !Number.isInteger(raster.y) ||
      !Number.isInteger(raster.width) || raster.width <= 0 ||
      !Number.isInteger(raster.height) || raster.height <= 0 ||
      !(raster.alpha instanceof Uint8Array) ||
      raster.alpha.length !== raster.width * raster.height) {
    throw new Error(`Drawn navigation tile ${tileId} has an invalid alpha raster`);
  }
}
