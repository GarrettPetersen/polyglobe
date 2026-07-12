export function shipCanRefillFreshWater({
  navigationKind,
  riverTileId,
  frozen = false,
  saltwaterPassageTileIds = []
}) {
  if (frozen || navigationKind !== "river") return false;
  if (!Number.isInteger(riverTileId) || riverTileId < 0) {
    throw new Error(`Fresh-water river requires a valid tile id: ${riverTileId}`);
  }
  return !saltwaterPassageTileIds.includes(riverTileId);
}
