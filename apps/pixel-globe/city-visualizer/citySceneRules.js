export const PORT_SCENE_MASTER = Object.freeze({
  width: 1365,
  height: 910,
  leftBankX: 0,
  safeX: 455,
  safeWidth: 910,
  safeHeight: 256,
  safeBottom: 583
});

export const PORT_SCENE_DEPTH = Object.freeze({
  sky: 0,
  horizon: 0.16,
  distant: 0.32,
  midground: 0.58,
  buildings: 0.72,
  shoreline: 0.94,
  rearBuildings: 0.94,
  businesses: 0.98,
  foreground: 1
});

export const PORT_SCENE_OCEAN_SLICES = Object.freeze([
  Object.freeze({ top: 446, bottom: 478, z: 1, depth: PORT_SCENE_DEPTH.horizon }),
  Object.freeze({ top: 478, bottom: 522, z: 10, depth: PORT_SCENE_DEPTH.shoreline }),
  Object.freeze({ top: 522, bottom: 557, z: 20, depth: PORT_SCENE_DEPTH.foreground }),
  Object.freeze({ top: 557, bottom: 910, z: 30, depth: PORT_SCENE_DEPTH.foreground })
]);

export const PORT_SCENE_RIVER = Object.freeze({
  leftBankDistantInsetX: 296,
  leftBankForegroundInsetX: 400,
  leftBankDistantOffsetY: 6
});

export const PORT_SCENE_CAMERA = Object.freeze({
  edgeFraction: 0.2,
  maximumEdgeWidth: 72,
  maximumSpeed: 0.45,
  defaultParallax: -0.35,
  riverDefaultParallax: -0.12,
  riverMinimumParallax: -0.12
});

export const PORT_SCENE_DOCK = Object.freeze({
  startX: 676,
  beachStartX: 742,
  shadowWaterExtension: 66,
  shipAccessX: 680,
  shipAccessY: 514
});

export const PORT_SCENE_ENTITY_META = Object.freeze({
  ship: Object.freeze({
    z: 55,
    depth: PORT_SCENE_DEPTH.foreground,
    scale: 1,
    nativeRasterScale: 3
  }),
  npcs: Object.freeze({ z: 62, depth: PORT_SCENE_DEPTH.foreground })
});

export const DOCK_STYLES = Object.freeze(["none", "wood", "stone"]);
export const TERRAIN_FAMILIES = Object.freeze(["grass", "forest", "desert", "rocky"]);

const ALWAYS_VISIBLE_LAYERS = Object.freeze([
  "Sky",
  "Ocean",
  "Shipyard",
  "Sand Beach",
  "Home 2",
  "Home",
  "Smith",
  "Market Stall Copy",
  "Market Stall Copy Copy",
  "Market Stall",
  "Road",
  "Waves",
  "Surf",
  "Inn",
  "Barrel",
  "Crate"
]);

const DISTANT_TERRAIN_LAYERS = Object.freeze({
  grass: "Distant Plains",
  forest: "Distant Forest",
  desert: "Distant Desert",
  rocky: "Rocky Hills"
});

const DISTANT_LEFT_TERRAIN_LAYERS = Object.freeze({
  grass: "Distant Plains Left Bank",
  forest: "Distant Forest Left Bank",
  desert: "Distant Desert Left Bank",
  rocky: "Rocky Hills Left Bank"
});

const BEHIND_BUILDING_LAYERS = Object.freeze({
  grass: "Grass Behind Buildings",
  forest: "Grass Behind Buildings",
  desert: "Desert Behind Buildings",
  rocky: "Rocks Behind Buildings"
});

const MIDGROUND_LAYERS = Object.freeze({
  grass: "Midground Grass",
  forest: "Midground Grass",
  desert: "Midground Desert",
  rocky: "Midground Rocky"
});

const FOREGROUND_LAYERS = Object.freeze({
  grass: "Foreground Grass",
  forest: "Foreground Grass",
  desert: "Foreground Desert",
  rocky: "Foreground Rocky"
});

const FOREGROUND_LEFT_LAYERS = Object.freeze({
  grass: "Foreground Grass Left Bank",
  forest: "Foreground Grass Left Bank",
  desert: "Foreground Desert Left Bank",
  rocky: "Foreground Rocky Left Bank"
});

const FOREGROUND_SHADOW_LAYERS = Object.freeze({
  grass: "Foreground Grass Castle Shadow",
  forest: "Foreground Grass Castle Shadow",
  desert: "Foreground Desert Castle Shadow",
  rocky: "Foreground Rocky Castle Shadow"
});

const LAYER_META = new Map([
  ["Sky", layerMeta(0, PORT_SCENE_DEPTH.sky)],
  ["Ocean", layerMeta(1, PORT_SCENE_DEPTH.horizon)],
  ["Horizon Mountains", layerMeta(5, PORT_SCENE_DEPTH.horizon)],
  ["Horizon Mountains Left Bank", layerMeta(5, PORT_SCENE_DEPTH.horizon, PORT_SCENE_RIVER.leftBankDistantInsetX, PORT_SCENE_RIVER.leftBankDistantOffsetY)],
  ["Distant Hills", anchoredLayerMeta(15, PORT_SCENE_DEPTH.shoreline)],
  ["Distant Hills Left Bank", leftBankLayerMeta(15, PORT_SCENE_DEPTH.shoreline, PORT_SCENE_RIVER.leftBankDistantInsetX, PORT_SCENE_RIVER.leftBankDistantOffsetY)],
  ["Rocky Hills", anchoredLayerMeta(15, PORT_SCENE_DEPTH.shoreline)],
  ["Rocky Hills Left Bank", leftBankLayerMeta(15, PORT_SCENE_DEPTH.shoreline, PORT_SCENE_RIVER.leftBankDistantInsetX, PORT_SCENE_RIVER.leftBankDistantOffsetY)],
  ["Distant Forest", anchoredLayerMeta(15, PORT_SCENE_DEPTH.shoreline)],
  ["Distant Forest Left Bank", leftBankLayerMeta(15, PORT_SCENE_DEPTH.shoreline, PORT_SCENE_RIVER.leftBankDistantInsetX, PORT_SCENE_RIVER.leftBankDistantOffsetY)],
  ["Distant Desert", anchoredLayerMeta(15, PORT_SCENE_DEPTH.shoreline)],
  ["Distant Desert Left Bank", leftBankLayerMeta(15, PORT_SCENE_DEPTH.shoreline, PORT_SCENE_RIVER.leftBankDistantInsetX, PORT_SCENE_RIVER.leftBankDistantOffsetY)],
  ["Distant Plains", anchoredLayerMeta(15, PORT_SCENE_DEPTH.shoreline)],
  ["Distant Plains Left Bank", leftBankLayerMeta(15, PORT_SCENE_DEPTH.shoreline, PORT_SCENE_RIVER.leftBankDistantInsetX, PORT_SCENE_RIVER.leftBankDistantOffsetY)],
  ["Shipyard", anchoredLayerMeta(25, PORT_SCENE_DEPTH.businesses)],
  ["Sand Beach", layerMeta(35, PORT_SCENE_DEPTH.foreground)],
  ["Sand Beach Dock Shadow", layerMeta(36, PORT_SCENE_DEPTH.foreground)],
  ["Left Bank Sand Beach", leftBankLayerMeta(70, PORT_SCENE_DEPTH.businesses, PORT_SCENE_RIVER.leftBankForegroundInsetX)],
  ["Desert Behind Buildings", anchoredLayerMeta(38, PORT_SCENE_DEPTH.rearBuildings)],
  ["Rocks Behind Buildings", anchoredLayerMeta(38, PORT_SCENE_DEPTH.rearBuildings)],
  ["Grass Behind Buildings", anchoredLayerMeta(38, PORT_SCENE_DEPTH.rearBuildings)],
  ["Home 2", anchoredLayerMeta(40, PORT_SCENE_DEPTH.rearBuildings)],
  ["Home", anchoredLayerMeta(40, PORT_SCENE_DEPTH.rearBuildings)],
  ["Far Castle", anchoredLayerMeta(59, 0.9952)],
  ["Smith", anchoredLayerMeta(45, PORT_SCENE_DEPTH.businesses)],
  ["Market Stall Copy", anchoredLayerMeta(46, PORT_SCENE_DEPTH.businesses)],
  ["Market Stall Copy Copy", anchoredLayerMeta(46, PORT_SCENE_DEPTH.businesses)],
  ["Market Stall", anchoredLayerMeta(46, PORT_SCENE_DEPTH.businesses)],
  ["Midground Grass", layerMeta(50, PORT_SCENE_DEPTH.foreground)],
  ["Midground Desert", layerMeta(50, PORT_SCENE_DEPTH.foreground)],
  ["Midground Rocky", layerMeta(50, PORT_SCENE_DEPTH.foreground)],
  ["Road", layerMeta(52, PORT_SCENE_DEPTH.foreground)],
  ["Castle Shadow", layerMeta(53, PORT_SCENE_DEPTH.foreground)],
  ["Waves", layerMeta(54, PORT_SCENE_DEPTH.foreground)],
  ["Surf", layerMeta(54, PORT_SCENE_DEPTH.foreground)],
  ["Dock Background", layerMeta(56, PORT_SCENE_DEPTH.foreground)],
  ["Dock", layerMeta(57, PORT_SCENE_DEPTH.foreground)],
  ["Stone Dock", layerMeta(57, PORT_SCENE_DEPTH.foreground)],
  ["Dock Foreground", layerMeta(58, PORT_SCENE_DEPTH.foreground)],
  ["Gate", layerMeta(60, PORT_SCENE_DEPTH.foreground)],
  ["Inn", layerMeta(65, PORT_SCENE_DEPTH.foreground)],
  ["Near Castle", layerMeta(72, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Grass", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Grass Castle Shadow", layerMeta(71, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Grass Left Bank", layerMeta(70, PORT_SCENE_DEPTH.foreground, PORT_SCENE_RIVER.leftBankForegroundInsetX)],
  ["Foreground Desert Left Bank", layerMeta(70, PORT_SCENE_DEPTH.foreground, PORT_SCENE_RIVER.leftBankForegroundInsetX)],
  ["Foreground Rocky Left Bank", layerMeta(70, PORT_SCENE_DEPTH.foreground, PORT_SCENE_RIVER.leftBankForegroundInsetX)],
  ["Foreground Desert", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Desert Castle Shadow", layerMeta(71, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Rocky", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Rocky Castle Shadow", layerMeta(71, PORT_SCENE_DEPTH.foreground)],
  ["Barrel", layerMeta(75, PORT_SCENE_DEPTH.foreground)],
  ["Crate", layerMeta(75, PORT_SCENE_DEPTH.foreground)]
]);

export function logicalSceneWindow({
  width,
  height,
  parallax = 0,
  depth = 1,
  approach = "ocean",
  parallaxAnchor = 0
}) {
  requireLogicalDimension(width, "width");
  requireLogicalDimension(height, "height");
  if (!["ocean", "river", "lake"].includes(approach)) throw new Error(`Invalid port scene approach: ${approach}`);
  const spanX = approach === "river" ? PORT_SCENE_MASTER.leftBankX : PORT_SCENE_MASTER.safeX;
  const spanWidth = approach === "river" ? PORT_SCENE_MASTER.width : PORT_SCENE_MASTER.safeWidth;
  if (width > spanWidth) throw new Error(`Port scene width ${width} exceeds ${spanWidth}`);
  if (height > PORT_SCENE_MASTER.height) {
    throw new Error(`Port scene height ${height} exceeds ${PORT_SCENE_MASTER.height}`);
  }
  if (!Number.isFinite(parallax) || parallax < -1 || parallax > 1) {
    throw new Error(`Invalid port scene parallax: ${parallax}`);
  }
  if (!Number.isFinite(depth) || depth < 0 || depth > 1) {
    throw new Error(`Invalid port scene depth: ${depth}`);
  }
  if (!Number.isFinite(parallaxAnchor) || parallaxAnchor < -1 || parallaxAnchor > 1) {
    throw new Error(`Invalid port scene parallax anchor: ${parallaxAnchor}`);
  }
  const travel = spanWidth - width;
  const centeredX = spanX + travel / 2;
  const safeCenterY = PORT_SCENE_MASTER.safeBottom - PORT_SCENE_MASTER.safeHeight / 2;
  return Object.freeze({
    x: centeredX + travel / 2 * (parallax * depth + parallaxAnchor * (1 - depth)),
    y: Math.round(safeCenterY - height / 2),
    width,
    height
  });
}

export function sceneEdgeScrollVelocity({ pointerX, width }) {
  requireLogicalDimension(width, "camera width");
  if (!Number.isFinite(pointerX)) {
    throw new Error(`Invalid scene camera pointer x: ${pointerX}`);
  }
  const boundedPointerX = Math.max(0, Math.min(width, pointerX));
  const edgeWidth = Math.min(PORT_SCENE_CAMERA.maximumEdgeWidth, width * PORT_SCENE_CAMERA.edgeFraction);
  if (boundedPointerX < edgeWidth) {
    const intensity = (edgeWidth - boundedPointerX) / edgeWidth;
    return -PORT_SCENE_CAMERA.maximumSpeed * intensity * intensity;
  }
  if (boundedPointerX > width - edgeWidth) {
    const intensity = (boundedPointerX - (width - edgeWidth)) / edgeWidth;
    return PORT_SCENE_CAMERA.maximumSpeed * intensity * intensity;
  }
  return 0;
}

export function sceneCameraParallaxBounds(approach) {
  if (!["ocean", "river", "lake"].includes(approach)) throw new Error(`Invalid port scene approach: ${approach}`);
  return approach === "river"
    ? Object.freeze({ minimum: PORT_SCENE_CAMERA.riverMinimumParallax, maximum: 1 })
    : Object.freeze({ minimum: -1, maximum: 1 });
}

export function sceneCameraDefaultParallax(approach) {
  sceneCameraParallaxBounds(approach);
  return approach === "river" ? PORT_SCENE_CAMERA.riverDefaultParallax : PORT_SCENE_CAMERA.defaultParallax;
}

export function advanceSceneParallax({ current, velocity, elapsedMs }) {
  for (const [label, value] of [["current", current], ["velocity", velocity]]) {
    if (!Number.isFinite(value) || value < -1 || value > 1) {
      throw new Error(`Invalid scene parallax ${label}: ${value}`);
    }
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid scene parallax elapsed time: ${elapsedMs}`);
  }
  if (elapsedMs === 0 || velocity === 0) return current;
  return Math.max(-1, Math.min(1, current + velocity * elapsedMs / 1000));
}

export function layerParallaxDepth(layerName, occurrence = 0) {
  return resolvedLayerMeta(layerName, occurrence).depth;
}

export function layerSceneZ(layerName, occurrence = 0) {
  return resolvedLayerMeta(layerName, occurrence).z;
}

export function layerSceneOffsetX(layerName, occurrence = 0, approach = "ocean") {
  if (!["ocean", "river", "lake"].includes(approach)) throw new Error(`Invalid port scene approach: ${approach}`);
  return approach === "river" ? resolvedLayerMeta(layerName, occurrence).riverOffsetX : 0;
}

export function layerSceneOffsetY(layerName, occurrence = 0, approach = "ocean") {
  if (!["ocean", "river", "lake"].includes(approach)) throw new Error(`Invalid port scene approach: ${approach}`);
  return approach === "river" ? resolvedLayerMeta(layerName, occurrence).riverOffsetY : 0;
}

export function layerParallaxAnchor(layerName, occurrence = 0) {
  return resolvedLayerMeta(layerName, occurrence).parallaxAnchor;
}

function resolvedLayerMeta(layerName, occurrence) {
  if (typeof layerName !== "string" || layerName === "") {
    throw new Error("Port scene layer metadata requires a layer name");
  }
  if (!Number.isInteger(occurrence) || occurrence < 0) {
    throw new Error(`Invalid ${layerName} occurrence: ${occurrence}`);
  }
  if (!LAYER_META.has(layerName)) throw new Error(`Missing port scene metadata for layer: ${layerName}`);
  const foregroundMarket =
    (layerName === "Market Stall" && occurrence >= 1) ||
    (layerName === "Market Stall Copy" && occurrence >= 1) ||
    (layerName === "Market Stall Copy Copy" && occurrence >= 2);
  return foregroundMarket ? layerMeta(65, PORT_SCENE_DEPTH.foreground) : LAYER_META.get(layerName);
}

export function resolveCitySceneFeatures(city, overrides = {}) {
  if (!city || typeof city !== "object") throw new Error("City scene requires a city record");
  const automatic = {
    approach: city.approach,
    dock: city.dock,
    fortified: Boolean(city.fortified),
    mountainsLeft: Boolean(city.mountains?.left),
    mountainsRight: Boolean(city.mountains?.right),
    leftTerrain: requireTerrain(city.terrain?.left || "grass"),
    rightTerrain: requireTerrain(city.terrain?.right || "grass"),
    leftDistantTerrain: requireTerrain(city.terrain?.leftDistant || city.terrain?.left || "grass"),
    rightDistantTerrain: requireTerrain(city.terrain?.rightDistant || city.terrain?.right || "grass"),
    npcs: city.settlementType === "village" ? 3 : 6,
    props: city.settlementType === "village" ? 1 : 3
  };
  const features = { ...automatic, ...definedOverrides(overrides) };
  if (!DOCK_STYLES.includes(features.dock)) throw new Error(`Unknown dock style: ${features.dock}`);
  if (!["ocean", "river", "lake"].includes(features.approach)) {
    throw new Error(`Unknown water approach: ${features.approach}`);
  }
  for (const key of ["leftTerrain", "rightTerrain", "leftDistantTerrain", "rightDistantTerrain"]) {
    features[key] = requireTerrain(features[key]);
  }
  features.npcs = clampInteger(features.npcs, 0, 12, "NPC count");
  features.props = clampInteger(features.props, 0, 6, "prop count");
  return Object.freeze(features);
}

export function activePortSceneLayers(features) {
  if (!features || typeof features !== "object") throw new Error("Port scene layers require features");
  const layers = new Set(ALWAYS_VISIBLE_LAYERS);
  layers.add(DISTANT_TERRAIN_LAYERS[features.rightDistantTerrain]);
  layers.add(BEHIND_BUILDING_LAYERS[features.rightTerrain]);
  layers.add(MIDGROUND_LAYERS[features.rightTerrain]);
  layers.add(FOREGROUND_LAYERS[features.rightTerrain]);

  if (features.approach === "river") {
    layers.add("Left Bank Sand Beach");
    layers.add(DISTANT_LEFT_TERRAIN_LAYERS[features.leftDistantTerrain]);
    layers.add(FOREGROUND_LEFT_LAYERS[features.leftTerrain]);
  }
  if (features.mountainsLeft) layers.add("Horizon Mountains Left Bank");
  if (features.mountainsRight) layers.add("Horizon Mountains");

  if (features.dock !== "none") layers.add("Sand Beach Dock Shadow");
  if (features.dock === "wood") {
    layers.add("Dock Background");
    layers.add("Dock");
    layers.add("Dock Foreground");
  } else if (features.dock === "stone") {
    layers.add("Stone Dock");
  }

  if (features.fortified) {
    layers.add("Castle Shadow");
    layers.add(FOREGROUND_SHADOW_LAYERS[features.rightTerrain]);
    layers.add("Far Castle");
    layers.add("Gate");
    layers.add("Near Castle");
  }
  return layers;
}

export function sceneReasonRows(city, features) {
  const mountain = [features.mountainsLeft && "left bank", features.mountainsRight && "right bank"]
    .filter(Boolean)
    .join(" + ") || "none in sightline";
  return Object.freeze([
    Object.freeze({ label: "Water", value: features.approach, reason: city.rules?.approach || "game navigation topology" }),
    Object.freeze({ label: "Dock", value: features.dock, reason: city.rules?.dock || "port scale and culture" }),
    Object.freeze({ label: "Fortification", value: features.fortified ? "gatehouse" : "open town", reason: city.rules?.fortification || "1522 settlement estimate" }),
    Object.freeze({ label: "Mountains", value: mountain, reason: city.rules?.mountains || "terrain and peak visibility scan" }),
    Object.freeze({ label: "Left bank", value: features.leftTerrain, reason: city.rules?.terrain || "nearby game terrain" }),
    Object.freeze({ label: "Right bank", value: features.rightTerrain, reason: city.rules?.terrain || "nearby game terrain" })
  ]);
}

function definedOverrides(overrides) {
  return Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined));
}

function anchoredLayerMeta(z, depth) {
  return layerMeta(z, depth, 0, 0, 1);
}

function leftBankLayerMeta(z, depth, riverOffsetX, riverOffsetY = 0) {
  return layerMeta(z, depth, riverOffsetX, riverOffsetY, PORT_SCENE_CAMERA.riverDefaultParallax);
}

function layerMeta(z, depth, riverOffsetX = 0, riverOffsetY = 0, parallaxAnchor = 0) {
  if (
    !Number.isFinite(z) ||
    !Number.isFinite(depth) ||
    depth < 0 ||
    depth > 1 ||
    !Number.isFinite(riverOffsetX) ||
    !Number.isFinite(riverOffsetY) ||
    !Number.isFinite(parallaxAnchor) ||
    parallaxAnchor < -1 ||
    parallaxAnchor > 1
  ) {
    throw new Error(
      `Invalid port scene layer metadata: z=${z}, depth=${depth}, riverOffsetX=${riverOffsetX}, riverOffsetY=${riverOffsetY}, parallaxAnchor=${parallaxAnchor}`
    );
  }
  return Object.freeze({ z, depth, riverOffsetX, riverOffsetY, parallaxAnchor });
}

function requireTerrain(terrain) {
  if (!TERRAIN_FAMILIES.includes(terrain)) throw new Error(`Unknown terrain family: ${terrain}`);
  return terrain;
}

function clampInteger(value, minimum, maximum, label) {
  if (!Number.isFinite(value)) throw new Error(`Invalid ${label}: ${value}`);
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

function requireLogicalDimension(value, label) {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid port scene ${label}: ${value}`);
}
