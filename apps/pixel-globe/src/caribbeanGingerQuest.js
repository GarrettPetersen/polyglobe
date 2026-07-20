import { GINGER_GOOD_ID, tradeGoodById } from "./economy.js";

export const CARIBBEAN_GINGER_QUEST_VERSION = 1;
export const CARIBBEAN_GINGER_PRODUCTION_PER_DAY = 1.25;
export const CARIBBEAN_GINGER_INITIAL_STOCK = 8;
export const CARIBBEAN_GINGER_COMPLETION_REWARD = 2000;
export const CARIBBEAN_GINGER_SPAWN_CHANCE = 0.35;
export const CARIBBEAN_GINGER_ROLL_PERIOD_MINUTES = 7 * 24 * 60;

export const CARIBBEAN_GINGER_STAGE_LOCKED = "locked";
export const CARIBBEAN_GINGER_STAGE_ACTIVE = "active";
export const CARIBBEAN_GINGER_STAGE_COMPLETED = "completed";

const CARIBBEAN_GINGER_PORTS = Object.freeze(new Set([
  "Havana|Cuba",
  "Santo Domingo|Dominican Republic"
]));

export const CARIBBEAN_GINGER_FETCH_STAGE = fetchStage(
  "plant-ginger",
  GINGER_GOOD_ID,
  6,
  "plant the first ginger beds"
);

export function createCaribbeanGingerQuestMemory() {
  return {
    version: CARIBBEAN_GINGER_QUEST_VERSION,
    stage: CARIBBEAN_GINGER_STAGE_LOCKED,
    cultivationTileId: null,
    cultivationCity: null,
    cultivationCountry: null,
    offerSeen: false,
    completedMinute: null,
    spawnRolls: {}
  };
}

export function validateCaribbeanGingerQuestMemory(memory) {
  if (!memory || typeof memory !== "object" ||
      memory.version !== CARIBBEAN_GINGER_QUEST_VERSION) {
    throw new Error(`Unsupported Caribbean ginger quest memory: ${memory?.version ?? "missing"}`);
  }
  if (![CARIBBEAN_GINGER_STAGE_LOCKED, CARIBBEAN_GINGER_STAGE_ACTIVE,
    CARIBBEAN_GINGER_STAGE_COMPLETED].includes(memory.stage)) {
    throw new Error(`Invalid Caribbean ginger quest stage: ${memory.stage}`);
  }
  if (typeof memory.offerSeen !== "boolean") {
    throw new Error("Caribbean ginger quest requires an offer-seen flag");
  }
  validateSpawnRolls(memory.spawnRolls);

  if (memory.stage === CARIBBEAN_GINGER_STAGE_LOCKED) {
    if (memory.cultivationTileId !== null || memory.cultivationCity !== null ||
        memory.cultivationCountry !== null || memory.offerSeen || memory.completedMinute !== null) {
      throw new Error("Locked Caribbean ginger quest contains active progress");
    }
    return memory;
  }

  if (!Number.isInteger(memory.cultivationTileId) || memory.cultivationTileId < 0 ||
      typeof memory.cultivationCity !== "string" || memory.cultivationCity === "" ||
      typeof memory.cultivationCountry !== "string" || memory.cultivationCountry === "") {
    throw new Error("Caribbean ginger quest has an invalid cultivation port");
  }
  if (memory.stage === CARIBBEAN_GINGER_STAGE_ACTIVE && memory.completedMinute !== null) {
    throw new Error("Active Caribbean ginger quest has a completion minute");
  }
  if (memory.stage === CARIBBEAN_GINGER_STAGE_COMPLETED &&
      (!Number.isFinite(memory.completedMinute) || memory.completedMinute < 0)) {
    throw new Error("Completed Caribbean ginger quest has an invalid completion minute");
  }
  return memory;
}

export function caribbeanGingerQuestMemory(state) {
  return validateCaribbeanGingerQuestMemory(state?.memory?.quests?.caribbeanGinger);
}

export function isCaribbeanGingerQuestPort(city) {
  return CARIBBEAN_GINGER_PORTS.has(`${city?.city}|${city?.country}`);
}

export function maybeSpawnCaribbeanGingerQuest(state, city, context = {}) {
  if (!isCaribbeanGingerQuestPort(city)) return null;
  const memory = caribbeanGingerQuestMemory(state);
  if (memory.stage !== CARIBBEAN_GINGER_STAGE_LOCKED) {
    return caribbeanGingerQuestState(state, city);
  }

  const period = rollPeriod(context.simMinute);
  const rollKey = `${city.tileId}|${period}`;
  if (memory.spawnRolls[rollKey]) return null;
  memory.spawnRolls[rollKey] = true;
  pruneRolls(memory.spawnRolls);
  const chance = spawnChance(context.spawnChance);
  const identityKey = state.playerCharacter?.identityKey || state.playerCharacter?.name || "captain";
  if (chance < 1 && seededFraction(`${identityKey}|${rollKey}|caribbean-ginger`) >= chance) {
    return null;
  }

  memory.stage = CARIBBEAN_GINGER_STAGE_ACTIVE;
  memory.cultivationTileId = city.tileId;
  memory.cultivationCity = city.city;
  memory.cultivationCountry = city.country;
  validateCaribbeanGingerQuestMemory(memory);
  return caribbeanGingerQuestState(state, city);
}

export function caribbeanGingerQuestState(state, city) {
  const memory = caribbeanGingerQuestMemory(state);
  if (memory.stage === CARIBBEAN_GINGER_STAGE_LOCKED) return null;
  if (city?.tileId !== memory.cultivationTileId) return null;
  assertCultivationPort(memory, city);
  const held = state.cargo?.[GINGER_GOOD_ID] || 0;
  return Object.freeze({
    stage: memory.stage,
    fetchStage: memory.stage === CARIBBEAN_GINGER_STAGE_ACTIVE
      ? CARIBBEAN_GINGER_FETCH_STAGE
      : null,
    held,
    canDeliver: memory.stage === CARIBBEAN_GINGER_STAGE_ACTIVE &&
      held >= CARIBBEAN_GINGER_FETCH_STAGE.quantity,
    completed: memory.stage === CARIBBEAN_GINGER_STAGE_COMPLETED,
    offerSeen: memory.offerSeen,
    cultivationPort: Object.freeze({
      tileId: memory.cultivationTileId,
      city: memory.cultivationCity,
      country: memory.cultivationCountry
    })
  });
}

export function caribbeanGingerQuestPort(state, ports) {
  const memory = caribbeanGingerQuestMemory(state);
  if (memory.stage === CARIBBEAN_GINGER_STAGE_LOCKED) return null;
  const port = ports.find((candidate) => candidate.tileId === memory.cultivationTileId) || null;
  if (!port) throw new Error(`Caribbean ginger cultivation port is missing: ${memory.cultivationTileId}`);
  assertCultivationPort(memory, port);
  return port;
}

export function caribbeanGingerOfferShouldApproach(state, city) {
  const quest = caribbeanGingerQuestState(state, city);
  return Boolean(quest && !quest.completed && !quest.offerSeen);
}

export function markCaribbeanGingerOfferSeen(state) {
  const memory = caribbeanGingerQuestMemory(state);
  if (memory.stage === CARIBBEAN_GINGER_STAGE_LOCKED) {
    throw new Error("Caribbean ginger offer has not spawned");
  }
  memory.offerSeen = true;
  return true;
}

export function assertCaribbeanGingerDelivery(state, city) {
  const quest = caribbeanGingerQuestState(state, city);
  if (!quest?.fetchStage) throw new Error("Caribbean ginger cultivation has no active request");
  if (!quest.canDeliver) {
    throw new Error(`Not enough ${quest.fetchStage.goodLabel} for Caribbean cultivation`);
  }
  return quest.fetchStage;
}

export function completeCaribbeanGingerQuest(state, city, currentMinute) {
  const quest = caribbeanGingerQuestState(state, city);
  if (!quest?.fetchStage) throw new Error("Caribbean ginger cultivation has no active request");
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid Caribbean ginger completion minute: ${currentMinute}`);
  }
  const memory = caribbeanGingerQuestMemory(state);
  memory.stage = CARIBBEAN_GINGER_STAGE_COMPLETED;
  memory.completedMinute = currentMinute;
  validateCaribbeanGingerQuestMemory(memory);
  return caribbeanGingerQuestState(state, city);
}

export function caribbeanGingerIndustryCompleted(state) {
  return caribbeanGingerQuestMemory(state).stage === CARIBBEAN_GINGER_STAGE_COMPLETED;
}

function fetchStage(id, goodId, quantity, purpose) {
  const good = tradeGoodById(goodId);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid Caribbean ginger fetch quantity: ${id}`);
  }
  return Object.freeze({ id, goodId, goodLabel: good.label, quantity, purpose });
}

function assertCultivationPort(memory, city) {
  if (city.tileId !== memory.cultivationTileId || city.city !== memory.cultivationCity ||
      city.country !== memory.cultivationCountry) {
    throw new Error(`Caribbean ginger cultivation port changed from ${memory.cultivationCity}`);
  }
}

function validateSpawnRolls(rolls) {
  if (!rolls || typeof rolls !== "object" || Array.isArray(rolls)) {
    throw new Error("Caribbean ginger spawn rolls must be an object");
  }
  for (const [key, value] of Object.entries(rolls)) {
    if (typeof key !== "string" || key === "" || value !== true) {
      throw new Error(`Invalid Caribbean ginger spawn roll: ${key}`);
    }
  }
}

function rollPeriod(simMinute = 0) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid Caribbean ginger offer minute: ${simMinute}`);
  }
  return Math.floor(simMinute / CARIBBEAN_GINGER_ROLL_PERIOD_MINUTES);
}

function spawnChance(value) {
  const chance = value ?? CARIBBEAN_GINGER_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid Caribbean ginger spawn chance: ${chance}`);
  }
  return chance;
}

function pruneRolls(rolls) {
  const keys = Object.keys(rolls);
  for (const key of keys.slice(0, Math.max(0, keys.length - 64))) delete rolls[key];
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
