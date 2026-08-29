export const PORT_SCENE_MASTER = Object.freeze({
  width: 1365,
  height: 910,
  leftBankX: 0,
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

export const PORT_SCENE_OCEAN_SLICES = Object.freeze([
  Object.freeze({ top: 446, bottom: 478, z: 1, depth: PORT_SCENE_DEPTH.horizon }),
  Object.freeze({ top: 478, bottom: 522, z: 10, depth: PORT_SCENE_DEPTH.distant }),
  Object.freeze({ top: 522, bottom: 557, z: 20, depth: PORT_SCENE_DEPTH.midground }),
  Object.freeze({ top: 557, bottom: 910, z: 30, depth: PORT_SCENE_DEPTH.foreground })
]);

export const PORT_SCENE_BEACH_SLICES = Object.freeze([
  Object.freeze({ top: 478, bottom: 522, depth: PORT_SCENE_DEPTH.distant }),
  Object.freeze({ top: 522, bottom: 557, depth: PORT_SCENE_DEPTH.midground }),
  Object.freeze({ top: 557, bottom: 910, depth: PORT_SCENE_DEPTH.foreground })
]);

export const PORT_SCENE_ENTITY_META = Object.freeze({
  ship: Object.freeze({ z: 55, depth: PORT_SCENE_DEPTH.foreground }),
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
  ["Horizon Mountains Left Bank", layerMeta(5, PORT_SCENE_DEPTH.horizon)],
  ["Distant Hills", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Hills Left Bank", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Rocky Hills", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Rocky Hills Left Bank", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Forest", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Forest Left Bank", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Desert", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Desert Left Bank", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Plains", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Distant Plains Left Bank", layerMeta(15, PORT_SCENE_DEPTH.distant)],
  ["Shipyard", layerMeta(25, PORT_SCENE_DEPTH.midground)],
  ["Sand Beach", layerMeta(35, PORT_SCENE_DEPTH.buildings)],
  ["Sand Beach Dock Shadow", layerMeta(36, PORT_SCENE_DEPTH.buildings)],
  ["Left Bank Sand Beach", layerMeta(35, PORT_SCENE_DEPTH.buildings)],
  ["Desert Behind Buildings", layerMeta(38, PORT_SCENE_DEPTH.midground)],
  ["Rocks Behind Buildings", layerMeta(38, PORT_SCENE_DEPTH.midground)],
  ["Grass Behind Buildings", layerMeta(38, PORT_SCENE_DEPTH.midground)],
  ["Home 2", layerMeta(40, PORT_SCENE_DEPTH.midground)],
  ["Home", layerMeta(40, PORT_SCENE_DEPTH.midground)],
  ["Far Castle", layerMeta(41, 0.9)],
  ["Smith", layerMeta(45, PORT_SCENE_DEPTH.buildings)],
  ["Market Stall Copy", layerMeta(46, PORT_SCENE_DEPTH.buildings)],
  ["Market Stall Copy Copy", layerMeta(46, PORT_SCENE_DEPTH.buildings)],
  ["Market Stall", layerMeta(46, PORT_SCENE_DEPTH.buildings)],
  ["Midground Grass", layerMeta(50, PORT_SCENE_DEPTH.midground)],
  ["Midground Desert", layerMeta(50, PORT_SCENE_DEPTH.midground)],
  ["Midground Rocky", layerMeta(50, PORT_SCENE_DEPTH.midground)],
  ["Road", layerMeta(52, PORT_SCENE_DEPTH.buildings)],
  ["Castle Shadow", layerMeta(53, 0.8)],
  ["Waves", layerMeta(54, 0.8)],
  ["Surf", layerMeta(54, 0.85)],
  ["Dock Background", layerMeta(56, 0.95)],
  ["Dock", layerMeta(57, PORT_SCENE_DEPTH.foreground)],
  ["Stone Dock", layerMeta(57, PORT_SCENE_DEPTH.foreground)],
  ["Dock Foreground", layerMeta(58, PORT_SCENE_DEPTH.foreground)],
  ["Gate", layerMeta(60, 0.95)],
  ["Inn", layerMeta(65, PORT_SCENE_DEPTH.foreground)],
  ["Near Castle", layerMeta(65, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Grass", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Grass Castle Shadow", layerMeta(71, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Grass Left Bank", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Desert Left Bank", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Rocky Left Bank", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Desert", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Desert Castle Shadow", layerMeta(71, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Rocky", layerMeta(70, PORT_SCENE_DEPTH.foreground)],
  ["Foreground Rocky Castle Shadow", layerMeta(71, PORT_SCENE_DEPTH.foreground)],
  ["Barrel", layerMeta(75, PORT_SCENE_DEPTH.foreground)],
  ["Crate", layerMeta(75, PORT_SCENE_DEPTH.foreground)]
]);

export function logicalSceneWindow({ width, height, parallax = 0, depth = 1, approach = "ocean" }) {
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
  const travel = spanWidth - width;
  const centeredX = spanX + travel / 2;
  return Object.freeze({
    x: centeredX + parallax * travel / 2 * depth,
    y: PORT_SCENE_MASTER.safeBottom - height,
    width,
    height
  });
}

export function advanceSceneParallax({ current, target, elapsedMs }) {
  for (const [label, value] of [["current", current], ["target", target]]) {
    if (!Number.isFinite(value) || value < -1 || value > 1) {
      throw new Error(`Invalid scene parallax ${label}: ${value}`);
    }
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    throw new Error(`Invalid scene parallax elapsed time: ${elapsedMs}`);
  }
  if (elapsedMs === 0 || current === target) return current;
  const blend = 1 - Math.exp(-elapsedMs / 320);
  const desiredStep = (target - current) * blend;
  const maximumStep = 0.9 * elapsedMs / 1000;
  const step = Math.max(-maximumStep, Math.min(maximumStep, desiredStep));
  const next = Math.max(-1, Math.min(1, current + step));
  return Math.abs(target - next) < 0.0005 ? target : next;
}

export function layerParallaxDepth(layerName, occurrence = 0) {
  return resolvedLayerMeta(layerName, occurrence).depth;
}

export function layerSceneZ(layerName, occurrence = 0) {
  return resolvedLayerMeta(layerName, occurrence).z;
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

function layerMeta(z, depth) {
  if (!Number.isFinite(z) || !Number.isFinite(depth) || depth < 0 || depth > 1) {
    throw new Error(`Invalid port scene layer metadata: z=${z}, depth=${depth}`);
  }
  return Object.freeze({ z, depth });
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
