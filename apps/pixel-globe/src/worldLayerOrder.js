export const WORLD_LAYER_ORDER = Object.freeze([
  "connectorBase",
  "terrainTiles",
  "tidalWater",
  "surfaceDetails",
  "waterEffects",
  "waterForeground",
  "dynamicWorld"
]);

export function renderWorldLayerStack(drawers) {
  if (!drawers || typeof drawers !== "object") {
    throw new Error("World layer stack requires draw callbacks");
  }
  for (const layer of WORLD_LAYER_ORDER) {
    const draw = drawers[layer];
    if (typeof draw !== "function") {
      throw new Error(`World layer stack is missing its ${layer} draw callback`);
    }
    draw();
  }
}
