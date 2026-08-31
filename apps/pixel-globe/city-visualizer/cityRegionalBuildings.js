export const CITY_REGIONAL_BUILDING_BASE_LAYERS = Object.freeze([
  "Inn",
  "Smith",
  "Home",
  "Home 2",
  "Far Castle",
  "Gate",
  "Near Castle"
]);

const CITY_REGIONAL_BUILDING_BASE_LAYER_SET = new Set(CITY_REGIONAL_BUILDING_BASE_LAYERS);
const CITY_REGIONAL_BUILDING_FALLBACKS = new Map([
  ["Home 2", "Home"]
]);

export function cityRegionalBuildingFrame(frames, cityType, baseLayer) {
  if (!Array.isArray(frames)) throw new Error("Regional city buildings require atlas frames");
  if (!CITY_REGIONAL_BUILDING_BASE_LAYER_SET.has(baseLayer)) return null;
  const baseFrame = frames.find((frame) => frame.layer === baseLayer);
  if (!baseFrame) throw new Error(`Missing base city building frame: ${baseLayer}`);
  const exactRegionalFrame = frames.find((frame) => (
    frame.cityType === cityType && frame.regionalOf === baseLayer
  ));
  if (exactRegionalFrame) return exactRegionalFrame;
  const fallbackBaseLayer = CITY_REGIONAL_BUILDING_FALLBACKS.get(baseLayer);
  if (!fallbackBaseLayer) return baseFrame;
  const regionalFallback = frames.find((frame) => (
    frame.cityType === cityType && frame.regionalOf === fallbackBaseLayer
  ));
  if (!regionalFallback) return baseFrame;
  return Object.freeze({
    ...regionalFallback,
    id: `${regionalFallback.id}|as-${baseLayer.toLowerCase().replaceAll(" ", "-")}`,
    regionalOf: baseLayer
  });
}

export function cityBuildingLogicalLayer(frame) {
  if (!frame || typeof frame.layer !== "string") {
    throw new Error("City building frame requires a layer");
  }
  return frame.regionalOf || frame.layer;
}
