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
