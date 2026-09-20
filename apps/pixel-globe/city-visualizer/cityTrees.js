import { cityGroundPainterZ } from "./cityPainterOrder.js";

export const CITY_TREE_BACKGROUND_SHADOW_Z = 39.5;
export const CITY_TREE_FOREGROUND_SHADOW_Z = 73.9;
export const CITY_TREE_CASTLE_BACKING_SHADOW_Z = 44.7;

const TREE_SLOTS = Object.freeze([
  Object.freeze({
    // Frame the join between the last market stall and the inn without
    // obscuring the usual port-assault contact point near the road centre.
    id: "foreground-business-gap",
    centerX: 1090,
    baseY: 575,
    scale: 0.9,
    depth: 1,
    z: 74,
    shadowZ: CITY_TREE_FOREGROUND_SHADOW_Z
  }),
  Object.freeze({
    id: "behind-buildings",
    centerX: 1138,
    baseY: 486,
    scale: 0.45,
    depth: 0.88,
    z: 39.6,
    shadowZ: CITY_TREE_BACKGROUND_SHADOW_Z
  }),
  Object.freeze({
    id: "foreground-center",
    centerX: 1220,
    baseY: 650,
    scale: 1,
    depth: 1,
    z: 74.1,
    shadowZ: CITY_TREE_FOREGROUND_SHADOW_Z
  })
]);

const LEFT_BANK_FOREGROUND_TREE_SLOT = Object.freeze({
  id: "left-bank-foreground",
  centerX: 390,
  baseY: 575,
  scale: 0.9,
  depth: 1,
  z: 74,
  shadowZ: CITY_TREE_FOREGROUND_SHADOW_Z,
  parallaxAnchor: -1
});

const CASTLE_BACKING_TREE_SLOT = Object.freeze({
  id: "castle-backing",
  centerX: 1332,
  baseY: 508,
  scale: 0.55,
  depth: 0.996,
  z: 44.8,
  shadowZ: CITY_TREE_CASTLE_BACKING_SHADOW_Z,
  parallaxAnchor: 1
});

const REGION_TREE_POOLS = Object.freeze({
  "northern-european": Object.freeze([
    "yew", "scots-pine", "larch", "spruce", "fir", "black-pine"
  ]),
  mediterranean: Object.freeze(["cypress", "juniper", "cedar", "black-pine", "palm"]),
  "islamic-desert": Object.freeze(["palm", "cypress", "juniper", "cedar"]),
  "east-asian": Object.freeze(["black-pine", "cedar", "cypress", "juniper"]),
  "south-asian": Object.freeze(["palm", "cedar", "yew"]),
  "southeast-asian": Object.freeze(["palm", "cedar", "yew"]),
  mesoamerican: Object.freeze(["palm", "cedar", "yew"]),
  andean: Object.freeze(["cedar", "juniper", "yew"]),
  "sub-saharan": Object.freeze(["palm", "cedar", "yew"]),
  polynesian: Object.freeze(["palm"])
});

const CHERRY_POPULATION_PROFILE_IDS = new Set(["japanese", "joseon", "ainu"]);

const TREE_PRESENTATION = Object.freeze({
  EVERGREEN: "evergreen",
  LARCH: "larch",
  CHERRY: "cherry",
  DECIDUOUS: "deciduous"
});
const TREE_PARTICLE_KINDS = new Set(["blossom", "leaf"]);

const TROPICAL_FOREGROUND_PALM_CITY_TYPES = new Set([
  "mesoamerican",
  "polynesian",
  "south-asian",
  "southeast-asian",
  "sub-saharan"
]);

export function cityTreePlacements({ city, features, trees }) {
  requireTreeInputs(city, features, trees);
  const availableById = new Map(trees.map((tree) => [tree.id, tree]));
  const regionalPool = cityTreePool(city);
  if (!regionalPool) throw new Error(`No city tree pool for city type: ${city.cityType}`);
  const pool = regionalPool
    .filter(({ treeId }) => treeId !== "palm" || Math.abs(city.lat) <= 42)
    .filter(({ treeId }) => availableById.has(treeId));
  if (pool.length === 0) {
    throw new Error(`City tree atlas has no usable trees for city type: ${city.cityType}`);
  }
  const count = cityTreeCount(city, features.rightTerrain, pool.some(({ treeId }) => treeId === "palm"));
  const leftBankTree = features.approach === "river" &&
    Boolean(features.leftTreeCover ?? features.leftTerrain === "forest") &&
    stableHash(`${city.id}:left-bank-tree`) % 2 === 0;
  const slots = [
    ...TREE_SLOTS.slice(0, count),
    ...(leftBankTree ? [LEFT_BANK_FOREGROUND_TREE_SLOT] : []),
    CASTLE_BACKING_TREE_SLOT
  ];
  let previousPoolId = null;
  const placements = slots.map((slot, index) => {
    const featuredPoolId = index === 0 ? featuredCityTreePoolId(city) : null;
    let poolIndex = featuredPoolId === null && index === 0 &&
      TROPICAL_FOREGROUND_PALM_CITY_TYPES.has(city.cityType) &&
      pool.some(({ treeId }) => treeId === "palm")
      ? pool.findIndex(({ treeId }) => treeId === "palm")
      : stableHash(`${city.id}:tree-species:${index}`) % pool.length;
    if (featuredPoolId !== null) {
      const featuredIndex = pool.findIndex(({ poolId }) => poolId === featuredPoolId);
      if (featuredIndex >= 0) poolIndex = featuredIndex;
    }
    if (pool.length > 1 && pool[poolIndex].poolId === previousPoolId) {
      poolIndex = (poolIndex + 1) % pool.length;
    }
    const selected = pool[poolIndex];
    const tree = availableById.get(selected.treeId);
    previousPoolId = selected.poolId;
    const sourceWidth = tree.frame.sourceSize.w;
    const sourceHeight = tree.frame.sourceSize.h;
    if (sourceWidth !== tree.shadow.sourceSize.w || sourceHeight !== tree.shadow.sourceSize.h) {
      throw new Error(`City tree and shadow source size mismatch: ${tree.id}`);
    }
    return Object.freeze({
      id: `${city.id}:${slot.id}`,
      tree,
      presentationPolicy: selected.presentationPolicy,
      originX: Math.round(slot.centerX - sourceWidth * slot.scale / 2),
      originY: Math.round(slot.baseY - sourceHeight * slot.scale),
      baseY: slot.baseY,
      scale: slot.scale,
      depth: slot.depth,
      z: slot.depth === 1 ? cityGroundPainterZ(slot.baseY) : slot.z,
      shadowZ: slot.shadowZ,
      parallaxAnchor: slot.parallaxAnchor ?? 1,
      // The lighting and shadow direction are baked into each authored tree.
      // Mirroring either part would contradict the scene's left-cast light.
      flipX: false,
      shadowFlipX: false
    });
  });
  return Object.freeze(placements);
}

export function cityTreePresentation(tree, { presentationPolicy, latitudeDeg, dayOfYear }) {
  requireTree(tree);
  if (!Object.values(TREE_PRESENTATION).includes(presentationPolicy)) {
    throw new Error(`Unknown city tree presentation policy: ${presentationPolicy}`);
  }
  if (!Number.isInteger(dayOfYear) || dayOfYear < 0 || dayOfYear >= 365) {
    throw new Error(`Invalid city tree day of year: ${dayOfYear}`);
  }
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new Error(`Invalid city tree latitude: ${latitudeDeg}`);
  }
  const seasonal = treeSeasonalState(presentationPolicy, latitudeDeg, dayOfYear);
  const frame = tree.variants[seasonal.variant];
  if (!frame) {
    throw new Error(
      `City tree ${tree.id} lacks ${seasonal.variant} art for ${presentationPolicy} presentation`
    );
  }
  const particleColors = seasonal.particles === null
    ? null
    : tree.particleColors?.[seasonal.particles];
  const particleEmitters = seasonal.particles === null
    ? null
    : tree.particleEmitters?.[seasonal.particles];
  if (seasonal.particles !== null && (!Array.isArray(particleColors) || particleColors.length < 2)) {
    throw new Error(`City tree ${tree.id} lacks ${seasonal.particles} particle colors`);
  }
  if (seasonal.particles !== null && (!Array.isArray(particleEmitters) || particleEmitters.length === 0)) {
    throw new Error(`City tree ${tree.id} lacks ${seasonal.particles} particle emitters`);
  }
  return Object.freeze({
    phase: seasonal.phase,
    frame,
    particleKind: seasonal.particles,
    particleColors: particleColors ? Object.freeze([...particleColors]) : null,
    particleEmitters: particleEmitters ? Object.freeze([...particleEmitters]) : null
  });
}

export function cityTreeParticleSprites({ placementId, kind, timeMs, colorCount, emitters }) {
  if (typeof placementId !== "string" || placementId === "") {
    throw new Error("City tree particles require a placement ID");
  }
  if (!TREE_PARTICLE_KINDS.has(kind)) {
    throw new Error(`Unknown city tree particle kind: ${kind}`);
  }
  if (!Number.isFinite(timeMs)) throw new Error(`Invalid city tree particle time: ${timeMs}`);
  if (!Number.isInteger(colorCount) || colorCount < 2) {
    throw new Error(`Invalid city tree particle color count: ${colorCount}`);
  }
  if (!Array.isArray(emitters) || emitters.length === 0 || emitters.some(({ x, y }) => (
    !Number.isInteger(x) || x < 0 || x >= 100 || !Number.isInteger(y) || y < 0 || y >= 150
  ))) {
    throw new Error(`Invalid city tree ${kind} particle emitters`);
  }
  const count = kind === "blossom" ? 14 : 9;
  const cycleMs = kind === "blossom" ? 4_200 : 5_400;
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const seed = stableHash(`${placementId}:${kind}:${index}`);
    const progress = positiveModulo(timeMs + index * cycleMs / count, cycleMs) / cycleMs;
    const emitter = emitters[seed % emitters.length];
    const phase = (seed % 628) / 100;
    const waft = (
      Math.sin(progress * Math.PI * 4 + phase) - Math.sin(phase)
    ) * (kind === "blossom" ? 5 : 7);
    return Object.freeze({
      originX: emitter.x,
      originY: emitter.y,
      x: emitter.x + waft,
      y: emitter.y + progress * (kind === "blossom" ? 76 : 84),
      width: 2,
      height: kind === "blossom" || index % 2 === 0 ? 2 : 1,
      colorIndex: seed % colorCount
    });
  }));
}

export function cityTreeCount(city, terrain, palmAvailable = false) {
  requireCity(city);
  if (!["grass", "forest", "desert", "rocky"].includes(terrain)) {
    throw new Error(`Invalid city tree terrain: ${terrain}`);
  }
  const seed = stableHash(`${city.id}:tree-count`);
  if (terrain === "forest") {
    const villageBonus = city.settlementType === "village" ? 1 : 0;
    return Math.min(TREE_SLOTS.length, 2 + seed % 2 + villageBonus);
  }
  if (terrain === "grass") {
    const base = seed % 3 === 0 ? 0 : 1;
    return Math.min(2, base + (city.settlementType === "village" ? 1 : 0));
  }
  if (terrain === "rocky") return seed % 2;
  return palmAvailable && seed % 3 === 0 ? 1 : 0;
}

function requireTreeInputs(city, features, trees) {
  requireCity(city);
  if (!features || typeof features !== "object") {
    throw new Error("City tree placement requires resolved scene features");
  }
  if (!Array.isArray(trees) || trees.length === 0) {
    throw new Error("City tree placement requires an exported tree atlas");
  }
  for (const tree of trees) {
    requireTree(tree);
  }
}

function requireTree(tree) {
  if (
    typeof tree?.id !== "string" ||
    !tree.frame?.frame ||
    !tree.frame?.spriteSourceSize ||
    !tree.frame?.sourceSize ||
    !tree.variants || typeof tree.variants !== "object" ||
    !tree.shadow?.frame ||
    !tree.shadow?.spriteSourceSize ||
    !tree.shadow?.sourceSize
  ) {
    throw new Error("Invalid city tree atlas entry");
  }
  for (const frame of Object.values(tree.variants)) {
    if (!frame?.frame || !frame?.spriteSourceSize || !frame?.sourceSize) {
      throw new Error(`Invalid city tree variant: ${tree.id}`);
    }
  }
  if (tree.particleEmitters !== undefined) {
    for (const [kind, emitters] of Object.entries(tree.particleEmitters)) {
      if (!TREE_PARTICLE_KINDS.has(kind) || !Array.isArray(emitters) || emitters.length === 0 ||
          emitters.some(({ x, y }) => !Number.isInteger(x) || !Number.isInteger(y))) {
        throw new Error(`Invalid city tree particle emitter catalog: ${tree.id}:${kind}`);
      }
    }
  }
}

function requireCity(city) {
  if (
    !city ||
    typeof city.id !== "string" ||
    typeof city.cityType !== "string" ||
    typeof city.populationProfileId !== "string" ||
    !Number.isFinite(city.lat) ||
    !Number.isFinite(city.lon)
  ) {
    throw new Error(
      "City tree placement requires city identity, type, population profile, and coordinates"
    );
  }
}

function cityTreePool(city) {
  const regionalPool = REGION_TREE_POOLS[city.cityType];
  if (!regionalPool) return null;
  if (isPacificNorthwest(city)) {
    return Object.freeze([
      treePoolEntry("douglas-fir"),
      treePoolEntry("cedar"),
      treePoolEntry("spruce"),
      treePoolEntry("fir"),
      deciduousTreePoolEntry()
    ]);
  }
  const pool = regionalPool.map(treePoolEntry);
  if (city.cityType === "northern-european") pool.push(deciduousTreePoolEntry());
  if (isCherryRegion(city)) {
    pool.push(Object.freeze({
      poolId: "cherry",
      treeId: "cherry",
      presentationPolicy: TREE_PRESENTATION.CHERRY
    }));
  }
  return Object.freeze(pool);
}

function treePoolEntry(treeId) {
  return Object.freeze({
    poolId: treeId,
    treeId,
    presentationPolicy: treeId === "larch"
      ? TREE_PRESENTATION.LARCH
      : TREE_PRESENTATION.EVERGREEN
  });
}

function deciduousTreePoolEntry() {
  return Object.freeze({
    poolId: "deciduous",
    treeId: "cherry",
    presentationPolicy: TREE_PRESENTATION.DECIDUOUS
  });
}

function featuredCityTreePoolId(city) {
  if (isPacificNorthwest(city)) return "douglas-fir";
  return isCherryRegion(city) ? "cherry" : null;
}

function isCherryRegion(city) {
  return CHERRY_POPULATION_PROFILE_IDS.has(city.populationProfileId) &&
    city.lat >= 24 && city.lat <= 46 && city.lon >= 124 && city.lon <= 148;
}

function isPacificNorthwest(city) {
  // This is a geographic flora exception, not a culture classification: the
  // catalog's Indigenous Pacific Northwest ports use broader city art types.
  return city.lat >= 42 && city.lat <= 56 && city.lon >= -132 && city.lon <= -120;
}

function treeSeasonalState(presentationPolicy, latitudeDeg, dayOfYear) {
  if (presentationPolicy === TREE_PRESENTATION.EVERGREEN) {
    return Object.freeze({ phase: "foliage", variant: "foliage", particles: null });
  }
  const day = latitudeDeg < 0 ? positiveModulo(dayOfYear + 182, 365) : dayOfYear;
  const latitude = Math.abs(latitudeDeg);
  if (presentationPolicy === TREE_PRESENTATION.CHERRY) {
    const bloomStart = Math.round(54 + clamp(latitude - 26, 0, 18) * 3.2);
    const blossomFallStart = bloomStart + 14;
    const foliageStart = blossomFallStart + 10;
    const autumnStart = Math.round(285 - clamp(latitude - 26, 0, 18) * 1.9);
    const leafFallStart = autumnStart + 20;
    const bareStart = autumnStart + 35;
    if (day >= bloomStart && day < blossomFallStart) {
      return Object.freeze({ phase: "blossom", variant: "blossom", particles: null });
    }
    if (day >= blossomFallStart && day < foliageStart) {
      return Object.freeze({ phase: "falling-blossom", variant: "blossom", particles: "blossom" });
    }
    if (day >= foliageStart && day < autumnStart) {
      return Object.freeze({ phase: "foliage", variant: "foliage", particles: null });
    }
    if (day >= autumnStart && day < bareStart) {
      return Object.freeze({
        phase: day >= leafFallStart ? "falling-leaf" : "autumn",
        variant: "autumn",
        particles: day >= leafFallStart ? "leaf" : null
      });
    }
    return Object.freeze({ phase: "bare", variant: "bare", particles: null });
  }
  const springStart = Math.round(66 + clamp(latitude - 35, 0, 25) * 1.2);
  const autumnStart = Math.round(278 - clamp(latitude - 35, 0, 25) * 1.15);
  const leafFallStart = autumnStart + 22;
  const bareStart = autumnStart + 40;
  if (day < springStart || day >= bareStart) {
    return Object.freeze({ phase: "bare", variant: "bare", particles: null });
  }
  if (day >= autumnStart) {
    return Object.freeze({
      phase: day >= leafFallStart && presentationPolicy === TREE_PRESENTATION.DECIDUOUS
        ? "falling-leaf"
        : "autumn",
      variant: "autumn",
      particles: day >= leafFallStart && presentationPolicy === TREE_PRESENTATION.DECIDUOUS
        ? "leaf"
        : null
    });
  }
  return Object.freeze({ phase: "foliage", variant: "foliage", particles: null });
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
