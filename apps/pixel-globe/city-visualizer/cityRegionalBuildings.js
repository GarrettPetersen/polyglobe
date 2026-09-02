export const CITY_REGIONAL_BUILDING_BASE_LAYERS = Object.freeze([
  "Inn",
  "Smith",
  "Home",
  "Home 2",
  "Far Castle",
  "Gate",
  "Gate Front Edge",
  "Near Castle"
]);

const CITY_REGIONAL_BUILDING_BASE_LAYER_SET = new Set(CITY_REGIONAL_BUILDING_BASE_LAYERS);
const CITY_REGIONAL_BUILDING_FORTIFICATION_LAYERS = new Set([
  "Far Castle",
  "Gate",
  "Gate Front Edge",
  "Near Castle"
]);
const CITY_REGIONAL_BUILDING_SERVICE_LAYERS = new Set(["Inn", "Smith"]);
const CITY_REGIONAL_BUILDING_SHARED_BASE_STYLES = new Map([
  ["northern-european", CITY_REGIONAL_BUILDING_BASE_LAYER_SET],
  ["mediterranean", CITY_REGIONAL_BUILDING_FORTIFICATION_LAYERS]
]);
const DIRECT_CITY_REGIONAL_BUILDING_STYLES = new Set([
  "earthen-village",
  "east-asian",
  "islamic-desert",
  "japanese",
  "mediterranean",
  "northern-european"
]);
const CLOSEST_CITY_REGIONAL_BUILDING_STYLES = new Map([
  ["andean", Object.freeze({
    housing: "earthen-village",
    service: "earthen-village",
    fortification: "islamic-desert"
  })],
  ["mesoamerican", Object.freeze({
    housing: "earthen-village",
    service: "earthen-village",
    fortification: "islamic-desert"
  })],
  ["polynesian", Object.freeze({
    housing: "earthen-village",
    service: "earthen-village",
    fortification: "islamic-desert"
  })],
  ["south-asian", Object.freeze({
    housing: "islamic-desert",
    service: "islamic-desert",
    fortification: "islamic-desert"
  })],
  ["southeast-asian", Object.freeze({
    housing: "japanese",
    service: "japanese",
    fortification: "japanese"
  })],
  ["sub-saharan", Object.freeze({
    housing: "earthen-village",
    service: "islamic-desert",
    fortification: "islamic-desert"
  })]
]);
const CITY_REGIONAL_BUILDING_FALLBACKS = new Map([
  ["Home 2", "Home"]
]);
const CITY_REGIONAL_BUILDING_STYLE_LAYER_FALLBACKS = new Map([
  ["earthen-village", new Map([
    ["Inn", "Home 2"],
    ["Smith", "Home"]
  ])]
]);

export function cityRegionalBuildingFrame(frames, cityType, baseLayer) {
  if (!Array.isArray(frames)) throw new Error("Regional city buildings require atlas frames");
  if (!CITY_REGIONAL_BUILDING_BASE_LAYER_SET.has(baseLayer)) return null;
  const baseFrame = frames.find((frame) => frame.layer === baseLayer);
  if (!baseFrame) throw new Error(`Missing base city building frame: ${baseLayer}`);
  const renderStyle = cityRegionalBuildingRenderStyle(cityType, baseLayer);
  const exactRegionalFrame = frames.find((frame) => (
    frame.cityType === renderStyle && frame.regionalOf === baseLayer
  ));
  if (exactRegionalFrame) return exactRegionalFrame;
  if (CITY_REGIONAL_BUILDING_SHARED_BASE_STYLES.get(renderStyle)?.has(baseLayer)) {
    return baseFrame;
  }
  const fallbackBaseLayer = CITY_REGIONAL_BUILDING_STYLE_LAYER_FALLBACKS
    .get(renderStyle)
    ?.get(baseLayer) ?? CITY_REGIONAL_BUILDING_FALLBACKS.get(baseLayer);
  if (!fallbackBaseLayer) {
    throw new Error(`Missing ${renderStyle} city building frame for role: ${baseLayer}`);
  }
  const regionalFallback = frames.find((frame) => (
    frame.cityType === renderStyle && frame.regionalOf === fallbackBaseLayer
  ));
  if (!regionalFallback) {
    throw new Error(
      `Missing ${renderStyle} city building fallback frame: ${fallbackBaseLayer} for ${baseLayer}`
    );
  }
  return Object.freeze({
    ...regionalFallback,
    id: `${regionalFallback.id}|as-${baseLayer.toLowerCase().replaceAll(" ", "-")}`,
    regionalOf: baseLayer
  });
}

export function cityRegionalBuildingRenderStyle(cityType, baseLayer) {
  if (typeof cityType !== "string" || cityType === "") {
    throw new Error("Regional city buildings require a city architecture style");
  }
  if (!CITY_REGIONAL_BUILDING_BASE_LAYER_SET.has(baseLayer)) {
    throw new Error(`Unknown regional city building layer: ${baseLayer}`);
  }
  if (DIRECT_CITY_REGIONAL_BUILDING_STYLES.has(cityType)) return cityType;
  const closest = CLOSEST_CITY_REGIONAL_BUILDING_STYLES.get(cityType);
  if (!closest) throw new Error(`No regional city building kit for architecture style: ${cityType}`);
  if (CITY_REGIONAL_BUILDING_FORTIFICATION_LAYERS.has(baseLayer)) return closest.fortification;
  if (CITY_REGIONAL_BUILDING_SERVICE_LAYERS.has(baseLayer)) return closest.service;
  return closest.housing;
}

export function cityBuildingLogicalLayer(frame) {
  if (!frame || typeof frame.layer !== "string") {
    throw new Error("City building frame requires a layer");
  }
  return frame.regionalOf || frame.layer;
}
