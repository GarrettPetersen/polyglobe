export const CITY_REGIONAL_BUILDING_BASE_LAYERS = Object.freeze([
  "Inn",
  "Smith",
  "Home",
  "Home 2"
]);

const CITY_REGIONAL_BUILDING_BASE_LAYER_SET = new Set(CITY_REGIONAL_BUILDING_BASE_LAYERS);

export function cityRegionalBuildingFrame(frames, cityType, baseLayer) {
  if (!Array.isArray(frames)) throw new Error("Regional city buildings require atlas frames");
  if (!CITY_REGIONAL_BUILDING_BASE_LAYER_SET.has(baseLayer)) return null;
  const baseFrame = frames.find((frame) => frame.layer === baseLayer);
  if (!baseFrame) throw new Error(`Missing base city building frame: ${baseLayer}`);
  return frames.find((frame) => (
    frame.cityType === cityType && frame.regionalOf === baseLayer
  )) || baseFrame;
}

export function cityBuildingLogicalLayer(frame) {
  if (!frame || typeof frame.layer !== "string") {
    throw new Error("City building frame requires a layer");
  }
  return frame.regionalOf || frame.layer;
}
