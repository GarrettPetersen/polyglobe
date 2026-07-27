import { WEATHER_DAYS, WEATHER_MINUTES_PER_DAY } from "./weather.js";
import { RIVER_BASIN_ID } from "./riverBasins.js";

export const FISH_MIN_CATCHABLE_POPULATION = 1;

const FISH_MEMORY_VERSION = 2;
const SALMON_RIVER_RUN_START_DAY = 245;
const SALMON_RIVER_RUN_END_DAY = 335;
const SALMON_APPROACH_DAYS = 30;
const SALMON_NATIVE_NAMED_BASINS = basinRoster(
  RIVER_BASIN_ID.AMUR,
  RIVER_BASIN_ID.RHINE,
  RIVER_BASIN_ID.ELBE_ODER_NETWORK,
  RIVER_BASIN_ID.VISTULA_BALTIC_NETWORK
);

export const FISH_SPECIES = Object.freeze([
  species("salmon", "Salmon", "#db6b4f", "#f0b28c", "#743f39", {
    baseCapacity: 46,
    growthPerDay: 0.018,
    minVisibleDensity: 0.18,
    schoolScale: 1.18
  }),
  species("herring", "Herring", "#8aa9b8", "#d8edf2", "#394d62", {
    baseCapacity: 62,
    growthPerDay: 0.035,
    minVisibleDensity: 0.12,
    schoolScale: 0.94
  }),
  species("cod", "Cod", "#aeb8aa", "#edf0da", "#596156", {
    baseCapacity: 38,
    growthPerDay: 0.021,
    minVisibleDensity: 0.14,
    schoolScale: 1.08
  }),
  species("sardine", "Sardine", "#7fb5c4", "#e8f7f2", "#38536a", {
    baseCapacity: 72,
    growthPerDay: 0.052,
    minVisibleDensity: 0.1,
    schoolScale: 0.82
  }),
  species("tuna", "Tuna", "#5a82a1", "#b7d1dc", "#273b59", {
    baseCapacity: 24,
    growthPerDay: 0.014,
    minVisibleDensity: 0.16,
    schoolScale: 1.32
  }),
  species("reef", "Reef fish", "#d68f3a", "#ffe082", "#684a47", {
    baseCapacity: 44,
    growthPerDay: 0.043,
    minVisibleDensity: 0.16,
    schoolScale: 0.86
  }),
  species("victoria-cichlid", "Victoria cichlid", "#f9c22b", "#fbff86", "#9e4539", {
    baseCapacity: 66,
    growthPerDay: 0.046,
    minVisibleDensity: 0.1,
    schoolScale: 0.82
  }),
  species("native-tilapia", "Native tilapia", "#92a984", "#c7dcd0", "#374e4a", {
    baseCapacity: 54,
    growthPerDay: 0.036,
    minVisibleDensity: 0.12,
    schoolScale: 1.02
  }),
  species("lake-trout", "Lake trout", "#547e64", "#c7dcd0", "#313638", {
    baseCapacity: 34,
    growthPerDay: 0.014,
    minVisibleDensity: 0.16,
    schoolScale: 1.2
  }),
  species("lake-whitefish", "Lake whitefish", "#9babb2", "#ffffff", "#484a77", {
    baseCapacity: 58,
    growthPerDay: 0.026,
    minVisibleDensity: 0.12,
    schoolScale: 0.96
  }),
  species("walleye", "Walleye", "#a2a947", "#fbff86", "#4c3e24", {
    baseCapacity: 42,
    growthPerDay: 0.021,
    minVisibleDensity: 0.14,
    schoolScale: 1.08
  }),
  species("yellow-perch", "Yellow perch", "#f9c22b", "#fbb954", "#676633", {
    baseCapacity: 64,
    growthPerDay: 0.034,
    minVisibleDensity: 0.11,
    schoolScale: 0.88
  }),
  species("lake-sturgeon", "Lake sturgeon", "#625565", "#9babb2", "#323353", {
    baseCapacity: 18,
    growthPerDay: 0.006,
    minVisibleDensity: 0.18,
    schoolScale: 1.42
  }),
  species("northern-pike", "Northern pike", "#547e64", "#a2a947", "#313638", {
    baseCapacity: 28,
    growthPerDay: 0.016,
    minVisibleDensity: 0.16,
    schoolScale: 1.26
  }),
  species("wels-catfish", "Wels catfish", "#484a77", "#9babb2", "#323353", {
    baseCapacity: 20,
    growthPerDay: 0.011,
    minVisibleDensity: 0.18,
    schoolScale: 1.42
  }),
  species("channel-catfish", "Channel catfish", "#625565", "#a2a947", "#313638", {
    baseCapacity: 38,
    growthPerDay: 0.024,
    minVisibleDensity: 0.14,
    schoolScale: 1.12
  }),
  species("african-catfish", "African catfish", "#596156", "#a2a947", "#313638", {
    baseCapacity: 40,
    growthPerDay: 0.028,
    minVisibleDensity: 0.13,
    schoolScale: 1.16
  }),
  species("tigerfish", "Tigerfish", "#9e4539", "#fbb954", "#4c3e24", {
    baseCapacity: 31,
    growthPerDay: 0.019,
    minVisibleDensity: 0.15,
    schoolScale: 1.2
  }),
  species("mahseer", "Mahseer", "#d68f3a", "#ffe082", "#743f39", {
    baseCapacity: 30,
    growthPerDay: 0.017,
    minVisibleDensity: 0.16,
    schoolScale: 1.24
  }),
  species("mekong-giant-catfish", "Mekong giant catfish", "#8aa9b8", "#d8edf2", "#484a77", {
    baseCapacity: 14,
    growthPerDay: 0.005,
    minVisibleDensity: 0.2,
    schoolScale: 1.58
  }),
  species("grass-carp", "Grass carp", "#92a984", "#c7dcd0", "#374e4a", {
    baseCapacity: 42,
    growthPerDay: 0.026,
    minVisibleDensity: 0.13,
    schoolScale: 1.14
  }),
  species("arapaima", "Arapaima", "#625565", "#db6b4f", "#323353", {
    baseCapacity: 15,
    growthPerDay: 0.007,
    minVisibleDensity: 0.19,
    schoolScale: 1.56
  }),
  species("piranha", "Piranha", "#9e4539", "#f0b28c", "#4c3e24", {
    baseCapacity: 60,
    growthPerDay: 0.04,
    minVisibleDensity: 0.11,
    schoolScale: 0.84
  }),
  species("murray-cod", "Murray cod", "#547e64", "#c7dcd0", "#313638", {
    baseCapacity: 24,
    growthPerDay: 0.012,
    minVisibleDensity: 0.17,
    schoolScale: 1.36
  })
]);

const LAKE_VICTORIA_SPECIES_SCORES = Object.freeze({
  "victoria-cichlid": 1.0,
  "native-tilapia": 0.68
});

const GREAT_LAKES_SPECIES_SCORES = Object.freeze({
  "lake-trout": 0.9,
  "lake-whitefish": 1.0,
  walleye: 0.82,
  "yellow-perch": 0.76,
  "lake-sturgeon": 0.22
});

const RESIDENT_RIVER_SPECIES_RANGES = Object.freeze({
  "northern-pike": Object.freeze([
    riverRange(55, 68, -170, -50, 0.78),
    riverRange(42, 55, -115, -50, 0.78),
    riverRange(42, 68, -10, 150, 0.78)
  ]),
  "wels-catfish": Object.freeze([
    riverRange(36, 62, 0, 80, 0.74)
  ]),
  "channel-catfish": Object.freeze([
    riverRange(24, 55, -105, -72, 0.88)
  ]),
  "african-catfish": Object.freeze([
    riverRange(-35, 32, -18, 45, 0.92),
    riverRange(30, 38, 32, 42, 0.48)
  ]),
  tigerfish: Object.freeze([
    riverRange(-35, 15, 10, 42, 0.76)
  ]),
  mahseer: Object.freeze([
    riverRange(5, 34, 65, 100, 0.9)
  ]),
  "mekong-giant-catfish": Object.freeze([
    riverRange(8, 28, 96, 106, 0.34)
  ]),
  "grass-carp": Object.freeze([
    riverRange(20, 44, 100, 124, 0.88),
    riverRange(44, 55, 100, 135, 0.62)
  ]),
  arapaima: Object.freeze([
    riverRange(-18, 8, -80, -45, 0.62)
  ]),
  piranha: Object.freeze([
    riverRange(-35, 12, -80, -45, 0.94)
  ]),
  "murray-cod": Object.freeze([
    riverRange(-38, -24, 137, 153, 0.88)
  ])
});

// Exact taxa use connected watersheds; broad regional groups remain range-based.
const RESIDENT_RIVER_SPECIES_BASINS = Object.freeze({
  "wels-catfish": basinRoster(
    RIVER_BASIN_ID.RHINE,
    RIVER_BASIN_ID.DANUBE_BLACK_SEA_NETWORK,
    RIVER_BASIN_ID.VOLGA_CASPIAN_NETWORK,
    RIVER_BASIN_ID.ELBE_ODER_NETWORK,
    RIVER_BASIN_ID.VISTULA_BALTIC_NETWORK
  ),
  mahseer: basinRoster(
    RIVER_BASIN_ID.INDUS,
    RIVER_BASIN_ID.GANGES_BRAHMAPUTRA,
    RIVER_BASIN_ID.IRRAWADDY,
    RIVER_BASIN_ID.MEKONG
  ),
  "mekong-giant-catfish": basinRoster(RIVER_BASIN_ID.MEKONG),
  "grass-carp": basinRoster(
    RIVER_BASIN_ID.EAST_CHINA_NETWORK,
    RIVER_BASIN_ID.AMUR,
    RIVER_BASIN_ID.PEARL
  ),
  arapaima: basinRoster(RIVER_BASIN_ID.AMAZON),
  piranha: basinRoster(
    RIVER_BASIN_ID.AMAZON,
    RIVER_BASIN_ID.ORINOCO,
    RIVER_BASIN_ID.PARANA
  ),
  "murray-cod": basinRoster(RIVER_BASIN_ID.MURRAY_DARLING)
});

const FISH_SPECIES_BY_ID = new Map(FISH_SPECIES.map((item) => [item.id, item]));
const FISH_SPECIES_CANDIDATES = Object.freeze({
  "open-ocean": speciesCandidates(["salmon", "herring", "cod", "sardine", "tuna", "reef"]),
  coastal: speciesCandidates(["salmon", "herring", "cod", "sardine", "tuna", "reef"]),
  river: speciesCandidates(["salmon", ...Object.keys(RESIDENT_RIVER_SPECIES_RANGES)]),
  "river-mouth": speciesCandidates([
    "salmon",
    "herring",
    "sardine",
    ...Object.keys(RESIDENT_RIVER_SPECIES_RANGES)
  ]),
  "lake-victoria": speciesCandidates(Object.keys(LAKE_VICTORIA_SPECIES_SCORES)),
  "great-lakes": speciesCandidates(Object.keys(GREAT_LAKES_SPECIES_SCORES))
});

// These are productive grounds, not modern stock boundaries. Their broad ellipses
// make historically famous fisheries legible at the game's hex scale.
const HISTORIC_MARINE_FISHING_GROUNDS = Object.freeze([
  marineFishingGround("grand-banks", 46.5, -49.5, 7.5, 12, {
    cod: 6,
    herring: 1.5
  }, {
    presenceChance: 0.9,
    capacityMultiplier: 3.8,
    initialDensityMin: 0.84,
    initialDensityMax: 0.98,
    visualAbundanceMultiplier: 1.65
  }),
  marineFishingGround("newfoundland-labrador", 52, -56, 10, 9, {
    cod: 4,
    herring: 2
  }, {
    presenceChance: 0.68,
    capacityMultiplier: 2.45,
    initialDensityMin: 0.72,
    initialDensityMax: 0.92,
    visualAbundanceMultiplier: 1.4
  }),
  marineFishingGround("iceland-faroes", 63.5, -15, 7, 15, {
    cod: 4,
    herring: 1.4
  }, {
    presenceChance: 0.52,
    capacityMultiplier: 1.9,
    initialDensityMin: 0.52,
    initialDensityMax: 0.76,
    visualAbundanceMultiplier: 1.15
  }),
  marineFishingGround("lofoten", 68, 14, 4.5, 9, {
    cod: 5
  }, {
    presenceChance: 0.62,
    capacityMultiplier: 2.1,
    initialDensityMin: 0.6,
    initialDensityMax: 0.82,
    visualAbundanceMultiplier: 1.3
  }),
  marineFishingGround("north-sea", 56, 3, 7, 8, {
    herring: 4,
    cod: 1.4
  }, {
    presenceChance: 0.44,
    capacityMultiplier: 1.45,
    initialDensityMin: 0.42,
    initialDensityMax: 0.65,
    visualAbundanceMultiplier: 1.05
  }),
  marineFishingGround("irish-celtic-seas", 53, -10, 5.5, 8, {
    herring: 2.5,
    cod: 2
  }, {
    presenceChance: 0.38,
    capacityMultiplier: 1.28,
    initialDensityMin: 0.4,
    initialDensityMax: 0.61,
    visualAbundanceMultiplier: 1
  }),
  marineFishingGround("galician-sardine-grounds", 42, -9, 6, 6, {
    sardine: 4,
    tuna: 1.2
  }, {
    presenceChance: 0.4,
    capacityMultiplier: 1.35,
    initialDensityMin: 0.4,
    initialDensityMax: 0.62,
    visualAbundanceMultiplier: 1
  }),
  marineFishingGround("scania-baltic", 56, 14, 5, 8, {
    herring: 2.6
  }, {
    presenceChance: 0.34,
    capacityMultiplier: 1.2,
    initialDensityMin: 0.36,
    initialDensityMax: 0.56,
    visualAbundanceMultiplier: 0.95
  })
]);

export function fishSpeciesById(speciesId) {
  const speciesDef = FISH_SPECIES_BY_ID.get(speciesId);
  if (!speciesDef) throw new Error(`Unknown fish species: ${speciesId}`);
  return speciesDef;
}

export function fishDayOfYear(simMinute) {
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid fish simulation minute: ${simMinute}`);
  return positiveModulo(Math.floor(simMinute / WEATHER_MINUTES_PER_DAY), WEATHER_DAYS);
}

export function fisheryForHabitat(gameState, habitat, simMinute) {
  const memory = ensureFishMemory(gameState, simMinute);
  const normalHabitat = normalizeHabitat(habitat);
  const dayOfYear = fishDayOfYear(simMinute);
  const voyageSeed = fishVoyageSeed(gameState);
  const speciesDef = chooseSpeciesForHabitat(normalHabitat, dayOfYear, voyageSeed);
  if (!speciesDef) return null;
  const historicGround = historicMarineGroundForSpecies(speciesDef.id, normalHabitat);
  if (!fisheryExists(speciesDef, normalHabitat, dayOfYear, voyageSeed, historicGround)) return null;
  const stock = fisheryStockForHabitat(
    memory,
    normalHabitat,
    speciesDef,
    simMinute,
    voyageSeed,
    historicGround
  );
  const density = stock.population / stock.capacity;
  if (!fisheryStockIsVisible(stock, speciesDef)) return null;
  const catchablePopulation = Math.floor(stock.population);
  const visualAbundanceMultiplier = historicGround?.visualAbundanceMultiplier ??
    ordinaryMarineVisualAbundance(normalHabitat);
  return {
    kind: "fishery",
    id: stock.key,
    stockKey: stock.key,
    speciesId: speciesDef.id,
    speciesLabel: speciesDef.label,
    tileId: normalHabitat.tileId,
    centerTileId: normalHabitat.tileId,
    habitatKind: normalHabitat.kind,
    density,
    population: Math.floor(stock.population),
    capacity: stock.capacity,
    visibleIndividualCount: Math.min(
      catchablePopulation,
      visibleFishCountForDensity(density, visualAbundanceMultiplier)
    ),
    areaRadiusPx: fisheryAreaRadiusPx(normalHabitat.kind, speciesDef, visualAbundanceMultiplier),
    overfished: density < 0.28,
    colors: speciesDef.colors,
    schoolScale: speciesDef.schoolScale,
    pulseSeed: stock.seed,
    historicGroundId: historicGround?.id ?? null
  };
}

export function harvestFishery(gameState, fishery, requestedQuantity, simMinute, options = {}) {
  if (!fishery || typeof fishery !== "object") throw new Error("Fish harvest requires a fishery");
  if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error(`Invalid fish harvest quantity: ${requestedQuantity}`);
  }
  const memory = ensureFishMemory(gameState, simMinute);
  const stock = memory.fisheries[fishery.stockKey];
  if (!stock) throw new Error(`Fish stock is no longer available: ${fishery.stockKey}`);
  const speciesDef = fishSpeciesById(stock.speciesId);
  advanceFishStock(stock, speciesDef, simMinute);
  const actor = options.actor === "npc" ? "npc" : "player";
  if (!fisheryStockIsVisible(stock, speciesDef)) {
    return harvestResult(stock, speciesDef, 0, actor, "depleted");
  }
  const available = Math.floor(stock.population);
  const quantity = Math.max(0, Math.min(requestedQuantity, available));
  if (quantity > 0) {
    stock.population = Math.max(0, stock.population - quantity);
    stock.harvested = (stock.harvested || 0) + quantity;
  }
  const reason = quantity > 0 ? "caught" : "depleted";
  return harvestResult(stock, speciesDef, quantity, actor, reason);
}

export function fishHabitatKind({
  isWater,
  isCoastal,
  isRiver,
  isRiverMouth,
  isLake
}) {
  if (isRiver || isRiverMouth) return isRiverMouth ? "river-mouth" : "river";
  if (isLake) return "lake";
  if (isCoastal) return "coastal";
  return isWater ? "open-ocean" : null;
}

function ensureFishMemory(gameState, simMinute) {
  if (!gameState || typeof gameState !== "object") throw new Error("Fish simulation requires game state");
  if (!gameState.memory || typeof gameState.memory !== "object") gameState.memory = {};
  if (!gameState.memory.fish || typeof gameState.memory.fish !== "object") {
    gameState.memory.fish = {
      version: FISH_MEMORY_VERSION,
      fisheries: {},
      stocks: {},
      lastMinute: Math.floor(simMinute)
    };
  }
  const memory = gameState.memory.fish;
  const stocks = memory.stocks && typeof memory.stocks === "object" ? memory.stocks : null;
  const fisheries = memory.fisheries && typeof memory.fisheries === "object" ? memory.fisheries : null;
  if (!fisheries && stocks) {
    memory.fisheries = stocks;
  } else if (fisheries && stocks && fisheries !== stocks) {
    for (const [key, stock] of Object.entries(stocks)) {
      if (!fisheries[key]) fisheries[key] = stock;
    }
    memory.stocks = fisheries;
  } else if (!fisheries) {
    memory.fisheries = {};
  }
  memory.stocks = memory.fisheries;
  memory.version = FISH_MEMORY_VERSION;
  if (!Number.isFinite(memory.lastMinute)) {
    memory.lastMinute = Math.floor(simMinute);
  }
  return memory;
}

function fisheryStockForHabitat(
  memory,
  habitat,
  speciesDef,
  simMinute,
  voyageSeed,
  historicGround
) {
  const key = `${habitat.tileId}:${speciesDef.id}`;
  if (!memory.fisheries[key]) {
    const seed = hashString32(fishSeedKey(voyageSeed, `${key}|stock`));
    const capacity = fisheryCapacity(speciesDef, habitat, seed, historicGround);
    const densityRange = initialFisheryDensityRange(habitat, historicGround);
    const initialDensity = densityRange.min +
      seededFraction(seed ^ 0x7f4a7c15) * (densityRange.max - densityRange.min);
    memory.fisheries[key] = {
      key,
      id: key,
      speciesId: speciesDef.id,
      tileId: habitat.tileId,
      kind: habitat.kind,
      capacity,
      population: Math.max(1, Math.round(capacity * initialDensity)),
      seed,
      harvested: 0,
      lastMinute: Math.floor(simMinute)
    };
  }
  const stock = memory.fisheries[key];
  advanceFishStock(stock, speciesDef, simMinute);
  return stock;
}

export function visibleFishCountForDensity(density, abundanceMultiplier = 1) {
  if (!Number.isFinite(density) || density < 0) {
    throw new Error(`Invalid fishery density: ${density}`);
  }
  if (!Number.isFinite(abundanceMultiplier) || abundanceMultiplier <= 0) {
    throw new Error(`Invalid fishery visual abundance: ${abundanceMultiplier}`);
  }
  const ordinarySchool = 0.5 + Math.min(1, density) * 4.5;
  return Math.max(1, Math.min(8, Math.round(ordinarySchool * abundanceMultiplier)));
}

function fisheryAreaRadiusPx(habitatKind, speciesDef, abundanceMultiplier) {
  const base = habitatKind === "river"
    ? 6
    : habitatKind === "river-mouth"
      ? 9
      : habitatKind === "lake"
        ? 8
        : habitatKind === "coastal"
          ? 11
          : 13;
  return Math.round(base * speciesDef.schoolScale * Math.min(1.25, abundanceMultiplier));
}

function advanceFishStock(stock, speciesDef, simMinute) {
  const lastMinute = Number.isFinite(stock.lastMinute) ? stock.lastMinute : simMinute;
  const elapsedDays = Math.max(0, Math.min(90, (simMinute - lastMinute) / WEATHER_MINUTES_PER_DAY));
  if (elapsedDays <= 0) return;
  const density = stock.capacity > 0 ? stock.population / stock.capacity : 0;
  const recruitment = density < 0.08 ? stock.capacity * 0.006 * elapsedDays : 0;
  const growth = stock.population * speciesDef.growthPerDay * elapsedDays * Math.max(0, 1 - density);
  stock.population = Math.min(stock.capacity, stock.population + recruitment + growth);
  stock.lastMinute = Math.floor(simMinute);
}

function fisheryStockIsVisible(stock, speciesDef) {
  if (Math.floor(stock.population) < FISH_MIN_CATCHABLE_POPULATION) return false;
  return stock.population / stock.capacity >= speciesDef.minVisibleDensity;
}

function chooseSpeciesForHabitat(habitat, dayOfYear, voyageSeed) {
  const scored = fishSpeciesCandidatesForHabitat(habitat)
    .map((speciesDef) => ({
      speciesDef,
      score: speciesHabitatScore(speciesDef.id, habitat, dayOfYear) *
        (historicMarineGroundForSpecies(speciesDef.id, habitat)?.speciesMultipliers[speciesDef.id] ?? 1)
    }))
    .filter((item) => item.score > 0);
  if (scored.length === 0) return null;
  if (habitat.kind === "river" && salmonRunActive(habitat.lat, dayOfYear)) {
    const salmon = scored.find((item) => item.speciesDef.id === "salmon");
    if (salmon && seededFraction(hashString32(
      fishSeedKey(voyageSeed, `${habitat.tileId}|salmon-run`)
    )) < 0.86) {
      return salmon.speciesDef;
    }
  }
  const total = scored.reduce((sum, item) => sum + item.score, 0);
  let cursor = seededFraction(hashString32(
    fishSeedKey(voyageSeed, `${habitat.tileId}|fish-species`)
  )) * total;
  for (const item of scored) {
    cursor -= item.score;
    if (cursor <= 0) return item.speciesDef;
  }
  return scored[scored.length - 1].speciesDef;
}

function fishSpeciesCandidatesForHabitat(habitat) {
  if (habitat.kind === "lake") {
    const region = lakeFishRegion(habitat);
    return FISH_SPECIES_CANDIDATES[region] || [];
  }
  const candidates = FISH_SPECIES_CANDIDATES[habitat.kind];
  if (!candidates) throw new Error(`Fish habitat has no species candidate roster: ${habitat.kind}`);
  return candidates;
}

function fisheryExists(speciesDef, habitat, dayOfYear, voyageSeed, historicGround) {
  const base = fisheryPresenceChance(speciesDef.id, habitat, dayOfYear, historicGround);
  return seededFraction(hashString32(
    fishSeedKey(voyageSeed, `${habitat.tileId}|${speciesDef.id}|presence`)
  )) < base;
}

function fishVoyageSeed(gameState) {
  return typeof gameState?.voyageSeed === "string" && gameState.voyageSeed.trim() !== ""
    ? gameState.voyageSeed
    : null;
}

function fishSeedKey(voyageSeed, value) {
  return voyageSeed === null ? value : `${voyageSeed}|${value}`;
}

function speciesHabitatScore(speciesId, habitat, dayOfYear) {
  if (habitat.kind === "lake") return lakeSpeciesHabitatScore(speciesId, habitat);
  const residentRiverScore = residentRiverSpeciesHabitatScore(speciesId, habitat);
  if (residentRiverScore > 0) return residentRiverScore;
  const absLat = Math.abs(habitat.lat);
  const tropical = absLat < 28;
  const cold = absLat >= 42;
  if (speciesId === "salmon") {
    return salmonMigrationProfile(habitat, dayOfYear)?.score || 0;
  }
  if (speciesId === "herring") {
    if (!["coastal", "river-mouth", "open-ocean"].includes(habitat.kind) || absLat < 22 || absLat > 66) return 0;
    return habitat.kind === "coastal" ? 0.9 : 0.42;
  }
  if (speciesId === "cod") {
    if (!["open-ocean", "coastal"].includes(habitat.kind) || !cold) return 0;
    return habitat.kind === "open-ocean" ? 0.78 : 0.54;
  }
  if (speciesId === "sardine") {
    if (!["coastal", "river-mouth"].includes(habitat.kind) || absLat > 44) return 0;
    return tropical ? 0.72 : 0.95;
  }
  if (speciesId === "tuna") {
    if (!["open-ocean", "coastal"].includes(habitat.kind) || absLat > 48) return 0;
    return habitat.kind === "open-ocean" ? 0.84 : 0.2;
  }
  if (speciesId === "reef") {
    if (habitat.kind !== "coastal" || !tropical) return 0;
    return 0.88;
  }
  return 0;
}

function fisheryPresenceChance(speciesId, habitat, dayOfYear, historicGround) {
  if (speciesId === "salmon") {
    return salmonMigrationProfile(habitat, dayOfYear)?.presenceChance || 0;
  }
  if (RESIDENT_RIVER_SPECIES_RANGES[speciesId]) {
    if (habitat.kind === "river") return 0.36;
    if (habitat.kind === "river-mouth") return 0.18;
    return 0;
  }
  if (habitat.kind === "lake") {
    const region = lakeFishRegion(habitat);
    if (region === "lake-victoria") return 0.58;
    if (region === "great-lakes") return 0.54;
    return 0;
  }
  if (historicGround) return historicGround.presenceChance;
  if (habitat.kind === "river") return 0.1;
  const pressure = historicMarinePressureMultiplier(habitat);
  if (habitat.kind === "river-mouth") return 0.22 * pressure;
  if (habitat.kind === "coastal") return 0.14 * pressure;
  return (speciesId === "tuna" || speciesId === "cod" ? 0.055 : 0.035) * pressure;
}

function habitatCapacityMultiplier(speciesDef, habitat, historicGround) {
  if (speciesDef.id === "salmon" && habitat.kind === "river") return 1.35;
  if (RESIDENT_RIVER_SPECIES_RANGES[speciesDef.id] && habitat.kind === "river") return 0.82;
  if (habitat.kind === "river-mouth") return 1.15;
  if (historicGround) return historicGround.capacityMultiplier;
  if (habitat.kind === "coastal") return historicMarinePressureMultiplier(habitat);
  if (habitat.kind === "lake") return 0.72;
  if (habitat.kind === "open-ocean") return 0.82 * historicMarinePressureMultiplier(habitat);
  return 0.62;
}

function fisheryCapacity(speciesDef, habitat, seed, historicGround) {
  return Math.max(8, Math.round(
    speciesDef.baseCapacity *
    habitatCapacityMultiplier(speciesDef, habitat, historicGround) *
    (0.74 + seededFraction(seed) * 0.52)
  ));
}

function initialFisheryDensityRange(habitat, historicGround) {
  if (historicGround) {
    return {
      min: historicGround.initialDensityMin,
      max: historicGround.initialDensityMax
    };
  }
  if (isMarineHabitat(habitat)) {
    return isLongExploitedOldWorldMarineWater(habitat)
      ? { min: 0.26, max: 0.48 }
      : { min: 0.4, max: 0.68 };
  }
  return { min: 0.34, max: 0.68 };
}

function ordinaryMarineVisualAbundance(habitat) {
  if (!isMarineHabitat(habitat)) return 1;
  return isLongExploitedOldWorldMarineWater(habitat) ? 0.78 : 0.9;
}

function historicMarinePressureMultiplier(habitat) {
  return isLongExploitedOldWorldMarineWater(habitat) ? 0.66 : 1;
}

function isLongExploitedOldWorldMarineWater(habitat) {
  if (!isMarineHabitat(habitat)) return false;
  const lat = habitat.lat;
  const lon = habitat.lon;
  const easternAtlanticAndMediterranean = lat >= -40 && lat <= 72 && lon >= -30 && lon <= 45;
  const indianAndWesternPacific = lat >= -42 && lat <= 60 && lon > 45 && lon <= 160;
  return easternAtlanticAndMediterranean || indianAndWesternPacific;
}

function isMarineHabitat(habitat) {
  return habitat.kind === "open-ocean" ||
    habitat.kind === "coastal" ||
    habitat.kind === "river-mouth";
}

function historicMarineGroundForSpecies(speciesId, habitat) {
  if (habitat.kind !== "open-ocean" && habitat.kind !== "coastal") return null;
  for (const ground of HISTORIC_MARINE_FISHING_GROUNDS) {
    if (!ground.speciesMultipliers[speciesId]) continue;
    if (pointInsideMarineGround(habitat.lat, habitat.lon, ground)) return ground;
  }
  return null;
}

function pointInsideMarineGround(lat, lon, ground) {
  const latOffset = (lat - ground.centerLat) / ground.latRadius;
  const lonOffset = wrappedLongitudeDelta(lon, ground.centerLon) / ground.lonRadius;
  return latOffset * latOffset + lonOffset * lonOffset <= 1;
}

function wrappedLongitudeDelta(lon, centerLon) {
  return positiveModulo(lon - centerLon + 180, 360) - 180;
}

function salmonRunActive(lat, dayOfYear) {
  if (lat < 30 || lat > 68) return false;
  return dayOfYear >= SALMON_RIVER_RUN_START_DAY && dayOfYear <= SALMON_RIVER_RUN_END_DAY;
}

function salmonMigrationProfile(habitat, dayOfYear) {
  if (!salmonNativeRange(habitat)) return null;
  if (salmonRunActive(habitat.lat, dayOfYear)) {
    if (habitat.kind === "river") return { score: 1.3, presenceChance: 0.52 };
    if (habitat.kind === "river-mouth") return { score: 0.82, presenceChance: 0.42 };
    if (habitat.kind === "coastal") return { score: 0.12, presenceChance: 0.08 };
    return null;
  }
  if (salmonApproachActive(dayOfYear)) {
    if (habitat.kind === "river-mouth") return { score: 0.92, presenceChance: 0.44 };
    if (habitat.kind === "coastal") return { score: 0.64, presenceChance: 0.3 };
    if (habitat.kind === "open-ocean") return { score: 0.1, presenceChance: 0.04 };
    return null;
  }
  if (habitat.kind === "coastal") return { score: 0.46, presenceChance: 0.2 };
  if (habitat.kind === "open-ocean") return { score: 0.24, presenceChance: 0.08 };
  return null;
}

function salmonApproachActive(dayOfYear) {
  return dayOfYear >= SALMON_RIVER_RUN_START_DAY - SALMON_APPROACH_DAYS &&
    dayOfYear < SALMON_RIVER_RUN_START_DAY;
}

function salmonNativeRange(habitat) {
  if (habitat.lat < 30 || habitat.lat > 68) return false;
  if (
    (habitat.kind === "river" || habitat.kind === "river-mouth") &&
    Number.isInteger(habitat.riverBasinId) &&
    habitat.riverBasinId !== RIVER_BASIN_ID.NONE &&
    !SALMON_NATIVE_NAMED_BASINS.includes(habitat.riverBasinId)
  ) {
    return false;
  }
  const northPacific = habitat.lon <= -105 || habitat.lon >= 120;
  const openNorthAtlantic = habitat.lat >= 38 && habitat.lon >= -85 && habitat.lon <= -5;
  const northernEuropeanAtlantic = habitat.lat >= 48 && habitat.lon > -5 && habitat.lon <= 30;
  return northPacific || openNorthAtlantic || northernEuropeanAtlantic;
}

function residentRiverSpeciesHabitatScore(speciesId, habitat) {
  if (habitat.kind !== "river" && habitat.kind !== "river-mouth") return 0;
  const ranges = RESIDENT_RIVER_SPECIES_RANGES[speciesId];
  if (!ranges) return 0;
  const allowedBasinIds = RESIDENT_RIVER_SPECIES_BASINS[speciesId];
  if (allowedBasinIds && !allowedBasinIds.includes(habitat.riverBasinId)) return 0;
  let score = 0;
  for (const range of ranges) {
    if (
      habitat.lat >= range.minLat &&
      habitat.lat <= range.maxLat &&
      habitat.lon >= range.minLon &&
      habitat.lon <= range.maxLon
    ) {
      score = Math.max(score, range.score);
    }
  }
  return habitat.kind === "river-mouth" ? score * 0.52 : score;
}

function lakeSpeciesHabitatScore(speciesId, habitat) {
  const region = lakeFishRegion(habitat);
  if (region === "lake-victoria") return LAKE_VICTORIA_SPECIES_SCORES[speciesId] || 0;
  if (region === "great-lakes") return GREAT_LAKES_SPECIES_SCORES[speciesId] || 0;
  return 0;
}

function lakeFishRegion(habitat) {
  if (habitat.lat >= -4 && habitat.lat <= 1.5 && habitat.lon >= 30.5 && habitat.lon <= 35.5) {
    return "lake-victoria";
  }
  if (habitat.lat >= 41 && habitat.lat <= 50 && habitat.lon >= -93 && habitat.lon <= -74) {
    return "great-lakes";
  }
  return null;
}

function harvestResult(stock, speciesDef, quantity, actor, reason) {
  const density = stock.population / stock.capacity;
  return {
    fisheryId: stock.key,
    stockKey: stock.key,
    speciesId: speciesDef.id,
    speciesLabel: speciesDef.label,
    quantity,
    actor,
    reason,
    remaining: Math.floor(stock.population),
    capacity: stock.capacity,
    overfished: density < 0.22,
    depleted: !fisheryStockIsVisible(stock, speciesDef),
    colors: speciesDef.colors
  };
}

function normalizeHabitat(habitat) {
  if (!habitat || typeof habitat !== "object") throw new Error("Fish habitat is required");
  if (!Number.isInteger(habitat.tileId)) throw new Error(`Invalid fish habitat tile: ${habitat.tileId}`);
  if (!Number.isFinite(habitat.lat) || !Number.isFinite(habitat.lon)) {
    throw new Error(`Invalid fish habitat position: ${habitat.lat},${habitat.lon}`);
  }
  if (!["open-ocean", "coastal", "river", "river-mouth", "lake"].includes(habitat.kind)) {
    throw new Error(`Invalid fish habitat kind: ${habitat.kind}`);
  }
  const riverBasinId = habitat.riverBasinId ?? RIVER_BASIN_ID.NONE;
  if (!Number.isInteger(riverBasinId) || riverBasinId < RIVER_BASIN_ID.NONE) {
    throw new Error(`Invalid fish habitat river basin: ${habitat.riverBasinId}`);
  }
  return riverBasinId === habitat.riverBasinId ? habitat : { ...habitat, riverBasinId };
}

function species(id, label, body, highlight, shadow, options) {
  return Object.freeze({
    id,
    label,
    colors: Object.freeze({ body, highlight, shadow }),
    ...options
  });
}

function riverRange(minLat, maxLat, minLon, maxLon, score) {
  if (!(minLat < maxLat) || !(minLon < maxLon) || !(score > 0)) {
    throw new Error(`Invalid resident river fish range: ${minLat},${maxLat},${minLon},${maxLon},${score}`);
  }
  return Object.freeze({ minLat, maxLat, minLon, maxLon, score });
}

function basinRoster(...basinIds) {
  if (basinIds.length === 0 || basinIds.some((basinId) => (
    !Number.isInteger(basinId) || basinId === RIVER_BASIN_ID.NONE
  ))) {
    throw new Error(`Invalid resident river fish basin roster: ${basinIds.join(",")}`);
  }
  return Object.freeze(basinIds);
}

function speciesCandidates(speciesIds) {
  return Object.freeze(speciesIds.map((speciesId) => {
    const speciesDef = FISH_SPECIES_BY_ID.get(speciesId);
    if (!speciesDef) throw new Error(`Fish candidate roster references unknown species: ${speciesId}`);
    return speciesDef;
  }));
}

function marineFishingGround(id, centerLat, centerLon, latRadius, lonRadius, speciesMultipliers, options) {
  if (
    typeof id !== "string" ||
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLon) ||
    !Number.isFinite(latRadius) ||
    latRadius <= 0 ||
    !Number.isFinite(lonRadius) ||
    lonRadius <= 0
  ) {
    throw new Error(`Invalid historic marine fishing ground: ${id}`);
  }
  const speciesEntries = Object.entries(speciesMultipliers || {});
  if (
    speciesEntries.length === 0 ||
    speciesEntries.some(([speciesId, multiplier]) => (
      !FISH_SPECIES_BY_ID.has(speciesId) ||
      !Number.isFinite(multiplier) ||
      multiplier <= 0
    ))
  ) {
    throw new Error(`Invalid species roster for historic marine fishing ground: ${id}`);
  }
  const {
    presenceChance,
    capacityMultiplier,
    initialDensityMin,
    initialDensityMax,
    visualAbundanceMultiplier
  } = options || {};
  if (
    !Number.isFinite(presenceChance) ||
    presenceChance <= 0 ||
    presenceChance > 1 ||
    !Number.isFinite(capacityMultiplier) ||
    capacityMultiplier <= 0 ||
    !Number.isFinite(initialDensityMin) ||
    initialDensityMin <= 0 ||
    !Number.isFinite(initialDensityMax) ||
    initialDensityMax < initialDensityMin ||
    initialDensityMax > 1 ||
    !Number.isFinite(visualAbundanceMultiplier) ||
    visualAbundanceMultiplier <= 0
  ) {
    throw new Error(`Invalid abundance profile for historic marine fishing ground: ${id}`);
  }
  return Object.freeze({
    id,
    centerLat,
    centerLon,
    latRadius,
    lonRadius,
    speciesMultipliers: Object.freeze({ ...speciesMultipliers }),
    presenceChance,
    capacityMultiplier,
    initialDensityMin,
    initialDensityMax,
    visualAbundanceMultiplier
  });
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function seededFraction(seed) {
  return (seed >>> 0) / 0x100000000;
}

function hashString32(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}
