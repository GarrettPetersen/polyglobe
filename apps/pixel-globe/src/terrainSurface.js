export function isCoastalWaterRow(row) {
  return (row?.t || "") === "beach";
}

export function isWaterSurfaceRow(row) {
  // The shared globe cache uses "beach" for underwater coastal waters.
  const terrain = row?.t || "";
  return terrain === "water" || terrain === "lake" || isCoastalWaterRow(row);
}

export function isPermanentSeaIceRow(row) {
  return (row?.t || "") === "ice";
}

function isWhaleOceanWaterRow(row) {
  // "beach" is submerged coastal water in the globe cache, not dry sand.
  // Excluding it traps whales in isolated deep-water hexes on the shelf.
  // Lakes remain excluded even though ships can navigate them.
  return row?.t === "water" || isCoastalWaterRow(row);
}

export function isWhaleSwimmableOceanRow(row) {
  return isWhaleOceanWaterRow(row) || isPermanentSeaIceRow(row);
}

export function isWhaleOpenSurfaceRow(row, hasSurfaceIce) {
  return isWhaleOceanWaterRow(row) && hasSurfaceIce !== true;
}

export function isShipUsableSurfaceWater(row, tileId, occupiedTileId, hasSurfaceIce) {
  if (!Number.isInteger(tileId) || tileId < 0) throw new Error(`Invalid surface ice tile: ${tileId}`);
  if (!Number.isInteger(occupiedTileId) || occupiedTileId < 0) {
    throw new Error(`Invalid occupied surface ice tile: ${occupiedTileId}`);
  }
  return isWaterSurfaceRow(row) && (hasSurfaceIce !== true || tileId === occupiedTileId);
}

export function isFrozenShoreRow(row) {
  const terrain = row?.t || "";
  return isPermanentSeaIceRow(row) || terrain === "ice_cap";
}

export function terrainRowsNeedBeach(rowA, rowB) {
  const aIsWater = isWaterSurfaceRow(rowA);
  const bIsWater = isWaterSurfaceRow(rowB);
  if (aIsWater === bIsWater) return false;
  const shoreRow = aIsWater ? rowB : rowA;
  return !isFrozenShoreRow(shoreRow);
}

export function terrainRowsNeedLandmassChannel(rowA, rowB) {
  if (isWaterSurfaceRow(rowA) || isWaterSurfaceRow(rowB)) return false;
  return Number.isInteger(rowA?.m) && Number.isInteger(rowB?.m) && rowA.m !== rowB.m;
}

export function terrainRowsFormFrozenWaterBoundary(rowA, rowB) {
  const aIsWater = isWaterSurfaceRow(rowA);
  const bIsWater = isWaterSurfaceRow(rowB);
  if (aIsWater === bIsWater) return false;
  return isFrozenShoreRow(aIsWater ? rowB : rowA);
}

export function compareTerrainConnectorDrawOrder(a, b) {
  const waterConnectorOrder = terrainConnectorDrawGroup(a) - terrainConnectorDrawGroup(b);
  return waterConnectorOrder || a.sortY - b.sortY || a.a - b.a || a.b - b.b;
}

export function terrainConnectorDrawGroup(call) {
  if (call?.drawGroup === 0 || call?.drawGroup === 1) return call.drawGroup;
  return Number(
    terrainRowsNeedBeach(call?.row, call?.nrow) ||
    terrainRowsNeedLandmassChannel(call?.row, call?.nrow)
  );
}
