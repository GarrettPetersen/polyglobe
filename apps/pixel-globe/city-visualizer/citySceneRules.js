export const PORT_SCENE_MASTER = Object.freeze({
  width: 1365,
  height: 910,
  safeX: 455,
  safeWidth: 910,
  safeBottom: 583
});

export const PORT_SCENE_DEPTH = Object.freeze({
  sky: 0,
  horizon: 0.16,
  distant: 0.32,
  midground: 0.58,
  buildings: 0.72,
  foreground: 1
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

const LAYER_DEPTHS = new Map([
  ["Sky", PORT_SCENE_DEPTH.sky],
  ["Ocean", PORT_SCENE_DEPTH.horizon],
  ["Horizon Mountains", PORT_SCENE_DEPTH.horizon],
  ["Horizon Mountains Left Bank", PORT_SCENE_DEPTH.horizon],
  ["Distant Hills", PORT_SCENE_DEPTH.distant],
  ["Distant Hills Left Bank", PORT_SCENE_DEPTH.distant],
  ["Rocky Hills", PORT_SCENE_DEPTH.distant],
  ["Rocky Hills Left Bank", PORT_SCENE_DEPTH.distant],
  ["Distant Forest", PORT_SCENE_DEPTH.distant],
  ["Distant Forest Left Bank", PORT_SCENE_DEPTH.distant],
  ["Distant Desert", PORT_SCENE_DEPTH.distant],
  ["Distant Desert Left Bank", PORT_SCENE_DEPTH.distant],
  ["Distant Plains", PORT_SCENE_DEPTH.distant],
  ["Distant Plains Left Bank", PORT_SCENE_DEPTH.distant],
  ["Midground Grass", PORT_SCENE_DEPTH.midground],
  ["Midground Desert", PORT_SCENE_DEPTH.midground],
  ["Midground Rocky", PORT_SCENE_DEPTH.midground]
]);

export function logicalSceneWindow({ width, height, parallax = 0, depth = 1 }) {
  requireLogicalDimension(width, "width");
  requireLogicalDimension(height, "height");
  if (width > PORT_SCENE_MASTER.safeWidth) {
    throw new Error(`Port scene width ${width} exceeds ${PORT_SCENE_MASTER.safeWidth}`);
  }
  if (height > PORT_SCENE_MASTER.height) {
    throw new Error(`Port scene height ${height} exceeds ${PORT_SCENE_MASTER.height}`);
  }
  if (!Number.isFinite(parallax) || parallax < -1 || parallax > 1) {
    throw new Error(`Invalid port scene parallax: ${parallax}`);
  }
  if (!Number.isFinite(depth) || depth < 0 || depth > 1) {
    throw new Error(`Invalid port scene depth: ${depth}`);
  }
  const travel = PORT_SCENE_MASTER.safeWidth - width;
  const centeredX = PORT_SCENE_MASTER.safeX + travel / 2;
  return Object.freeze({
    x: centeredX + parallax * travel / 2 * depth,
    y: PORT_SCENE_MASTER.safeBottom - height,
    width,
    height
  });
}

export function layerParallaxDepth(layerName) {
  if (typeof layerName !== "string" || layerName === "") {
    throw new Error("Port scene layer depth requires a layer name");
  }
  if (LAYER_DEPTHS.has(layerName)) return LAYER_DEPTHS.get(layerName);
  if (/Foreground|Castle|Gate|Dock|Barrel|Crate/.test(layerName)) return PORT_SCENE_DEPTH.foreground;
  return PORT_SCENE_DEPTH.buildings;
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
