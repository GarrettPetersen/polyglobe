export const TERRAIN_TRAIT = Object.freeze({
  COLD: "cold",
  CONTINENTAL: "continental",
  DESERT: "desert",
  FOREST: "forest",
  FROZEN: "frozen",
  GRASS: "grass",
  HIGHLAND: "highland",
  HUMID: "humid",
  JUNGLE: "jungle",
  MEDITERRANEAN: "mediterranean",
  MOUNTAIN: "mountain",
  OCEANIC: "oceanic",
  ROCK: "rock",
  SAVANNA: "savanna",
  SNOW: "snow",
  STEPPE: "steppe",
  SUBARCTIC: "subarctic",
  TROPICAL: "tropical",
  TUNDRA: "tundra",
  WET: "wet",
  WINTER_WIND: "winter-wind"
});

export const TERRAIN_RENDER_FAMILY = Object.freeze({
  ARID_COLD: "arid-cold",
  ARID_WARM: "arid-warm",
  BROADLEAF: "broadleaf",
  CONIFER: "conifer",
  FOREST: "forest",
  FROZEN: "frozen",
  GRASS: "grass",
  SNOW: "snow",
  TROPICAL: "tropical"
});

const VALID_TRAITS = new Set(Object.values(TERRAIN_TRAIT));

const TERRAIN_METADATA = new Map([
  ["water", terrain()],
  ["lake", terrain()],
  ["beach", terrain()],
  ["land", terrain({ traits: [TERRAIN_TRAIT.GRASS], grassyHill: true })],
  ["grass", terrain({ traits: [TERRAIN_TRAIT.GRASS], grassyHill: true })],
  ["forest", terrain({
    traits: [TERRAIN_TRAIT.FOREST],
    renderFamily: TERRAIN_RENDER_FAMILY.FOREST,
    roadPenalty: 0.35,
    grassyHill: true
  })],
  ["mountain", terrain({
    traits: [TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.ROCK],
    roadBlocked: true
  })],
  ["rock", terrain({ traits: [TERRAIN_TRAIT.ROCK] })],
  ["wet", terrain({ traits: [TERRAIN_TRAIT.WET] })],
  ["jungle", tropicalTerrain()],
  ["tropical_jungle", tropicalTerrain()],
  ["savanna", terrain({
    traits: [TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.SAVANNA],
    grassyHill: true
  })],
  ["desert", desertTerrain(TERRAIN_RENDER_FAMILY.ARID_WARM)],
  ["hot_desert", desertTerrain(TERRAIN_RENDER_FAMILY.ARID_WARM)],
  ["cold_desert", desertTerrain(TERRAIN_RENDER_FAMILY.ARID_COLD, [
    TERRAIN_TRAIT.COLD,
    TERRAIN_TRAIT.WINTER_WIND
  ])],
  ["hot_steppe", steppeTerrain(TERRAIN_RENDER_FAMILY.ARID_WARM)],
  ["cold_steppe", steppeTerrain(TERRAIN_RENDER_FAMILY.ARID_COLD, [
    TERRAIN_TRAIT.COLD,
    TERRAIN_TRAIT.WINTER_WIND
  ])],
  ["tropical_savanna", terrain({
    traits: [TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.SAVANNA, TERRAIN_TRAIT.TROPICAL],
    renderFamily: TERRAIN_RENDER_FAMILY.TROPICAL,
    roadPenalty: 1.15,
    grassyHill: true
  })],
  ["tropical_rainforest", tropicalTerrain()],
  ["tropical_monsoon", tropicalTerrain()],
  ["humid_subtropical", humidTerrain()],
  ["humid_subtropical_hot", humidTerrain()],
  ["warm_summer_humid", humidTerrain()],
  ["oceanic", oceanicTerrain()],
  ["subpolar_oceanic", oceanicTerrain([
    TERRAIN_TRAIT.COLD,
    TERRAIN_TRAIT.ROCK,
    TERRAIN_TRAIT.WINTER_WIND
  ])],
  ["mediterranean_hot", mediterraneanTerrain()],
  ["mediterranean_warm", mediterraneanTerrain()],
  ["humid_continental", continentalTerrain()],
  ["humid_continental_warm", continentalTerrain()],
  ["humid_continental_hot", continentalTerrain()],
  ["warm_summer_continental", continentalTerrain()],
  ["hot_summer_continental", continentalTerrain()],
  ["subarctic", subarcticTerrain()],
  ["subarctic_dry", subarcticTerrain()],
  ["subarctic_dry_winter", subarcticTerrain()],
  ["subarctic_very_cold", subarcticTerrain([TERRAIN_TRAIT.WINTER_WIND])],
  ["subarctic_very_cold_dry", subarcticTerrain([TERRAIN_TRAIT.WINTER_WIND])],
  ["subarctic_very_cold_dry_winter", subarcticTerrain([TERRAIN_TRAIT.WINTER_WIND])],
  ["subtropical_highland", terrain({
    traits: [TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.HIGHLAND, TERRAIN_TRAIT.MOUNTAIN, TERRAIN_TRAIT.ROCK],
    grassyHill: true
  })],
  ["tundra", terrain({
    traits: [TERRAIN_TRAIT.COLD, TERRAIN_TRAIT.TUNDRA, TERRAIN_TRAIT.WINTER_WIND],
    renderFamily: TERRAIN_RENDER_FAMILY.SNOW,
    roadPenalty: 0.7
  })],
  ["snow", terrain({
    traits: [TERRAIN_TRAIT.COLD, TERRAIN_TRAIT.SNOW, TERRAIN_TRAIT.WINTER_WIND],
    renderFamily: TERRAIN_RENDER_FAMILY.SNOW
  })],
  ["ice", frozenTerrain()],
  ["ice_cap", frozenTerrain()]
]);

export const KNOWN_TERRAIN_KINDS = Object.freeze([...TERRAIN_METADATA.keys()]);

export function assertKnownTerrainKind(kind) {
  terrainMetadata(kind);
  return kind;
}

export function terrainHasTrait(kind, trait) {
  if (!VALID_TRAITS.has(trait)) throw new Error(`Unknown terrain trait: ${trait}`);
  return terrainMetadata(kind).traits.has(trait);
}

export function terrainHasAnyTrait(kind, traits) {
  if (!Array.isArray(traits) || traits.length === 0) {
    throw new Error("Terrain trait query requires at least one trait");
  }
  return traits.some((trait) => terrainHasTrait(kind, trait));
}

export function terrainRoadPenalty(kind) {
  return terrainMetadata(kind).roadPenalty;
}

export function terrainBlocksRoad(kind) {
  return terrainMetadata(kind).roadBlocked;
}

export function terrainRenderFamily(kind) {
  return terrainMetadata(kind).renderFamily;
}

export function terrainUsesGrassyHill(kind) {
  return terrainMetadata(kind).grassyHill;
}

function terrainMetadata(kind) {
  if (typeof kind !== "string" || kind === "") throw new Error("Terrain kind must be a non-empty string");
  const metadata = TERRAIN_METADATA.get(kind);
  if (!metadata) throw new Error(`Unknown terrain kind: ${kind}`);
  return metadata;
}

function terrain({
  traits = [],
  renderFamily = TERRAIN_RENDER_FAMILY.GRASS,
  roadPenalty = 0,
  roadBlocked = false,
  grassyHill = false
} = {}) {
  for (const trait of traits) {
    if (!VALID_TRAITS.has(trait)) throw new Error(`Unknown terrain trait in catalog: ${trait}`);
  }
  return Object.freeze({
    traits: new Set(traits),
    renderFamily,
    roadPenalty,
    roadBlocked,
    grassyHill
  });
}

function desertTerrain(renderFamily, extraTraits = []) {
  return terrain({
    traits: [TERRAIN_TRAIT.DESERT, ...extraTraits],
    renderFamily,
    roadPenalty: 0.85
  });
}

function steppeTerrain(renderFamily, extraTraits = []) {
  return terrain({
    traits: [TERRAIN_TRAIT.GRASS, TERRAIN_TRAIT.STEPPE, ...extraTraits],
    renderFamily,
    roadPenalty: 0.45
  });
}

function tropicalTerrain() {
  return terrain({
    traits: [
      TERRAIN_TRAIT.FOREST,
      TERRAIN_TRAIT.JUNGLE,
      TERRAIN_TRAIT.TROPICAL,
      TERRAIN_TRAIT.WET
    ],
    renderFamily: TERRAIN_RENDER_FAMILY.TROPICAL,
    roadPenalty: 1.15
  });
}

function humidTerrain() {
  return terrain({
    traits: [TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.HUMID, TERRAIN_TRAIT.WET],
    renderFamily: TERRAIN_RENDER_FAMILY.BROADLEAF,
    roadPenalty: 0.15,
    grassyHill: true
  });
}

function oceanicTerrain(extraTraits = []) {
  return terrain({
    traits: [TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.OCEANIC, TERRAIN_TRAIT.WET, ...extraTraits],
    renderFamily: TERRAIN_RENDER_FAMILY.BROADLEAF,
    roadPenalty: 0.15,
    grassyHill: true
  });
}

function mediterraneanTerrain() {
  return terrain({
    traits: [TERRAIN_TRAIT.MEDITERRANEAN],
    renderFamily: TERRAIN_RENDER_FAMILY.BROADLEAF,
    grassyHill: true
  });
}

function continentalTerrain() {
  return terrain({
    traits: [TERRAIN_TRAIT.CONTINENTAL, TERRAIN_TRAIT.FOREST],
    renderFamily: TERRAIN_RENDER_FAMILY.CONIFER,
    roadPenalty: 0.25,
    grassyHill: true
  });
}

function subarcticTerrain(extraTraits = []) {
  return terrain({
    traits: [TERRAIN_TRAIT.COLD, TERRAIN_TRAIT.FOREST, TERRAIN_TRAIT.SUBARCTIC, ...extraTraits],
    renderFamily: TERRAIN_RENDER_FAMILY.CONIFER,
    roadPenalty: 0.7,
    grassyHill: true
  });
}

function frozenTerrain() {
  return terrain({
    traits: [TERRAIN_TRAIT.COLD, TERRAIN_TRAIT.FROZEN, TERRAIN_TRAIT.WINTER_WIND],
    renderFamily: TERRAIN_RENDER_FAMILY.FROZEN,
    roadBlocked: true
  });
}
