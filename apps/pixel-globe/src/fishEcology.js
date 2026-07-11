import { WEATHER_DAYS, WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const FISH_PLAYER_CATCH_COOLDOWN_MINUTES = 6 * 60;
export const FISH_NPC_HARVEST_COOLDOWN_MINUTES = 8 * 60;

const FISH_MEMORY_VERSION = 2;
const RIVER_SPAWN_START_DAY = 245;
const RIVER_SPAWN_END_DAY = 335;

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
  })
]);

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
  if (density < speciesDef.minVisibleDensity) return null;
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
    visibleIndividualCount: visibleFishIndividualCount(speciesDef, density),
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
  const cooldownKey = actor === "npc" ? "npcCooldownUntil" : "playerCooldownUntil";
  if (!options.ignoreCooldown && (stock[cooldownKey] || 0) > simMinute) {
    return harvestResult(stock, speciesDef, 0, actor, "cooldown");
  }
  const available = Math.floor(stock.population);
  const quantity = Math.max(0, Math.min(requestedQuantity, available));
  if (quantity > 0) {
    stock.population = Math.max(0, stock.population - quantity);
    stock.harvested = (stock.harvested || 0) + quantity;
  }
  if (!options.ignoreCooldown) {
    stock[cooldownKey] = simMinute + (actor === "npc"
      ? FISH_NPC_HARVEST_COOLDOWN_MINUTES
      : FISH_PLAYER_CATCH_COOLDOWN_MINUTES);
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
      playerCooldownUntil: 0,
      npcCooldownUntil: 0,
      lastMinute: Math.floor(simMinute)
    };
  }
  const stock = memory.fisheries[key];
  advanceFishStock(stock, speciesDef, simMinute);
  return stock;
}

function visibleFishIndividualCount(speciesDef, density) {
  const densityCount = Math.round(1 + density * 4);
  const schoolingBonus = speciesDef.id === "herring" || speciesDef.id === "sardine" ? 1 : 0;
  return Math.max(1, Math.min(6, densityCount + schoolingBonus));
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
  const absLat = Math.abs(habitat.lat);
  const tropical = absLat < 28;
  const cold = absLat >= 42;
  if (speciesId === "salmon") {
    if (!["river", "river-mouth"].includes(habitat.kind) || absLat < 30 || absLat > 68) return 0;
    return salmonRunActive(habitat.lat, dayOfYear)
      ? (habitat.kind === "river" ? 1.3 : 0.72)
      : (habitat.kind === "river-mouth" ? 0.12 : 0.04);
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
    return salmonRunActive(habitat.lat, dayOfYear)
      ? (habitat.kind === "river" ? 0.52 : 0.34)
      : 0.08;
  }
  if (habitat.kind === "river" || habitat.kind === "lake") return 0.12;
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
  if (Math.abs(lat) < 30 || Math.abs(lat) > 68) return false;
  if (lat >= 0) return dayOfYear >= RIVER_SPAWN_START_DAY && dayOfYear <= RIVER_SPAWN_END_DAY;
  const southernDay = positiveModulo(dayOfYear + Math.floor(WEATHER_DAYS / 2), WEATHER_DAYS);
  return southernDay >= RIVER_SPAWN_START_DAY && southernDay <= RIVER_SPAWN_END_DAY;
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
    depleted: density < speciesDef.minVisibleDensity,
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
