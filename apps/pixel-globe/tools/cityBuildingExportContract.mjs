// Building layers are named authored roles, unlike animated scene frames.
// Duplicate names would create duplicate runtime IDs and select stale artwork.
export function validateCityBuildingLayers(frames, expectedLayerNames) {
  for (const layer of expectedLayerNames) {
    const count = frames.filter((frame) => frame.layer === layer).length;
    if (count !== 1) {
      throw new Error(`buildings.aseprite requires exactly one layer named "${layer}"; found ${count}. Remove or rename duplicate layers, or restore the missing layer.`);
    }
  }
}
