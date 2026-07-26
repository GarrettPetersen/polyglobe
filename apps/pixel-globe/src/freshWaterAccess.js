export function shipCanRefillFreshWater({
  navigationKind,
  waterTileId,
  frozen = false,
  saltwaterPassageTileIds = []
}) {
  if (frozen || (navigationKind !== "river" && navigationKind !== "lake")) return false;
  if (!Number.isInteger(waterTileId) || waterTileId < 0) {
    throw new Error(`Fresh water requires a valid tile id: ${waterTileId}`);
  }
  if (navigationKind === "lake") return true;
  return !saltwaterPassageTileIds.includes(waterTileId);
}
