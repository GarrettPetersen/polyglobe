import { WEATHER_DAYS, WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const FISH_MIN_CATCHABLE_POPULATION = 1;

const FISH_MEMORY_VERSION = 2;
const SALMON_RIVER_RUN_START_DAY = 245;
const SALMON_RIVER_RUN_END_DAY = 335;
const SALMON_APPROACH_DAYS = 30;

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

const FISH_SPECIES_BY_ID = new Map(FISH_SPECIES.map((item) => [item.id, item]));

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
  const speciesDef = chooseSpeciesForHabitat(normalHabitat, dayOfYear);
  if (!speciesDef) return null;
  if (!fisheryExists(speciesDef, normalHabitat, dayOfYear)) return null;
  const stock = fisheryStockForHabitat(memory, normalHabitat, speciesDef, simMinute);
  const density = stock.population / stock.capacity;
  if (!fisheryStockIsVisible(stock, speciesDef)) return null;
  const catchablePopulation = Math.floor(stock.population);
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
    visibleIndividualCount: Math.min(catchablePopulation, visibleFishCountForDensity(density)),
    areaRadiusPx: fisheryAreaRadiusPx(normalHabitat.kind, speciesDef),
    overfished: density < 0.28,
    colors: speciesDef.colors,
    schoolScale: speciesDef.schoolScale,
    pulseSeed: stock.seed
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

function fisheryStockForHabitat(memory, habitat, speciesDef, simMinute) {
  const key = `${habitat.tileId}:${speciesDef.id}`;
  if (!memory.fisheries[key]) {
    const seed = hashString32(`${key}|stock`);
    const capacity = Math.max(8, Math.round(
      speciesDef.baseCapacity * habitatCapacityMultiplier(speciesDef, habitat) * (0.74 + seededFraction(seed) * 0.52)
    ));
    memory.fisheries[key] = {
      key,
      id: key,
      speciesId: speciesDef.id,
      tileId: habitat.tileId,
      kind: habitat.kind,
      capacity,
      population: Math.max(1, Math.round(capacity * (0.34 + seededFraction(seed ^ 0x7f4a7c15) * 0.44))),
      seed,
      harvested: 0,
      lastMinute: Math.floor(simMinute)
    };
  }
  const stock = memory.fisheries[key];
  advanceFishStock(stock, speciesDef, simMinute);
  return stock;
}

export function visibleFishCountForDensity(density) {
  if (!Number.isFinite(density) || density < 0) {
    throw new Error(`Invalid fishery density: ${density}`);
  }
  return Math.max(1, Math.min(8, Math.round(1 + Math.min(1, density) * 7)));
}

function fisheryAreaRadiusPx(habitatKind, speciesDef) {
  const base = habitatKind === "river"
    ? 6
    : habitatKind === "river-mouth"
      ? 9
      : habitatKind === "lake"
        ? 8
        : habitatKind === "coastal"
          ? 11
          : 13;
  return Math.round(base * speciesDef.schoolScale);
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

function chooseSpeciesForHabitat(habitat, dayOfYear) {
  const scored = FISH_SPECIES
    .map((speciesDef) => ({
      speciesDef,
      score: speciesHabitatScore(speciesDef.id, habitat, dayOfYear)
    }))
    .filter((item) => item.score > 0);
  if (scored.length === 0) return null;
  if (habitat.kind === "river" && salmonRunActive(habitat.lat, dayOfYear)) {
    const salmon = scored.find((item) => item.speciesDef.id === "salmon");
    if (salmon && seededFraction(hashString32(`${habitat.tileId}|salmon-run`)) < 0.86) {
      return salmon.speciesDef;
    }
  }
  const total = scored.reduce((sum, item) => sum + item.score, 0);
  let cursor = seededFraction(hashString32(`${habitat.tileId}|fish-species`)) * total;
  for (const item of scored) {
    cursor -= item.score;
    if (cursor <= 0) return item.speciesDef;
  }
  return scored[scored.length - 1].speciesDef;
}

function fisheryExists(speciesDef, habitat, dayOfYear) {
  const base = fisheryPresenceChance(speciesDef.id, habitat, dayOfYear);
  return seededFraction(hashString32(`${habitat.tileId}|${speciesDef.id}|presence`)) < base;
}

function speciesHabitatScore(speciesId, habitat, dayOfYear) {
  if (habitat.kind === "lake") return lakeSpeciesHabitatScore(speciesId, habitat);
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

function fisheryPresenceChance(speciesId, habitat, dayOfYear) {
  if (speciesId === "salmon") {
    return salmonMigrationProfile(habitat, dayOfYear)?.presenceChance || 0;
  }
  if (habitat.kind === "lake") {
    const region = lakeFishRegion(habitat);
    if (region === "lake-victoria") return 0.74;
    if (region === "great-lakes") return 0.68;
    return 0;
  }
  if (habitat.kind === "river") return 0.12;
  if (habitat.kind === "river-mouth") return 0.36;
  if (habitat.kind === "coastal") return 0.28;
  return speciesId === "tuna" || speciesId === "cod" ? 0.12 : 0.08;
}

function habitatCapacityMultiplier(speciesDef, habitat) {
  if (speciesDef.id === "salmon" && habitat.kind === "river") return 1.35;
  if (habitat.kind === "river-mouth") return 1.15;
  if (habitat.kind === "coastal") return 1.0;
  if (habitat.kind === "lake") return 0.72;
  if (habitat.kind === "open-ocean") return 0.82;
  return 0.62;
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
  const northPacific = habitat.lon <= -105 || habitat.lon >= 120;
  const openNorthAtlantic = habitat.lat >= 38 && habitat.lon >= -85 && habitat.lon <= -5;
  const northernEuropeanAtlantic = habitat.lat >= 48 && habitat.lon > -5 && habitat.lon <= 30;
  return northPacific || openNorthAtlantic || northernEuropeanAtlantic;
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
  return habitat;
}

function species(id, label, body, highlight, shadow, options) {
  return Object.freeze({
    id,
    label,
    colors: Object.freeze({ body, highlight, shadow }),
    ...options
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
