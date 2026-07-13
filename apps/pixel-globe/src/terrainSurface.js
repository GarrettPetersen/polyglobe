export function isCoastalWaterRow(row) {
  return (row?.t || "") === "beach";
}

export function isWaterSurfaceRow(row) {
  // The shared globe cache uses "beach" for underwater coastal waters.
  const terrain = row?.t || "";
  return terrain === "water" || terrain === "lake" || isCoastalWaterRow(row);
}

export function isFrozenShoreRow(row) {
  const terrain = row?.t || "";
  return terrain === "ice" || terrain === "ice_cap";
}

export function terrainRowsNeedBeach(rowA, rowB) {
  const aIsWater = isWaterSurfaceRow(rowA);
  const bIsWater = isWaterSurfaceRow(rowB);
  if (aIsWater === bIsWater) return false;
  const shoreRow = aIsWater ? rowB : rowA;
  return !isFrozenShoreRow(shoreRow);
}
