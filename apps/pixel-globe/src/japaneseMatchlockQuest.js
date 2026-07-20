import { COLONIZATION_STAGE_ESTABLISHED } from "./colonizationQuest.js";
import {
  GUNPOWDER_GOOD_ID,
  MATCHLOCKS_GOOD_ID,
  tradeGoodById
} from "./economy.js";

export const JAPANESE_MATCHLOCK_QUEST_VERSION = 1;
export const JAPANESE_MATCHLOCK_WORKSHOP_CITY = "Kyoto";
export const JAPANESE_MATCHLOCK_WORKSHOP_COUNTRY = "Japan";
export const JAPANESE_MATCHLOCK_PRODUCTION_PER_DAY = 1.5;
export const JAPANESE_MATCHLOCK_INITIAL_STOCK = 6;
export const JAPANESE_MATCHLOCK_COMPLETION_REWARD = 1200;
export const JAPANESE_MATCHLOCK_SPAWN_CHANCE = 0.35;
export const JAPANESE_MATCHLOCK_ROLL_PERIOD_MINUTES = 7 * 24 * 60;

export const JAPANESE_MATCHLOCK_STAGE_LOCKED = "locked";
export const JAPANESE_MATCHLOCK_STAGE_ACTIVE = "active";
export const JAPANESE_MATCHLOCK_STAGE_COMPLETED = "completed";

export const JAPANESE_MATCHLOCK_FETCH_STAGES = Object.freeze([
  fetchStage(
    "study-portuguese-locks",
    MATCHLOCKS_GOOD_ID,
    2,
    "study the lock, breech screw, and proportions of the Portuguese pieces"
  ),
  fetchStage(
    "forge-barrels",
    "iron",
    5,
    "forge barrels that will survive a full proof charge"
  ),
  fetchStage(
    "shape-stocks",
    "timber",
    3,
    "shape stocks and ramrods for the first workshop batch"
  ),
  fetchStage(
    "proof-first-batch",
    GUNPOWDER_GOOD_ID,
    4,
    "proof the first locally made matchlocks beyond the city walls"
  )
]);

export function createJapaneseMatchlockQuestMemory() {
  return {
    version: JAPANESE_MATCHLOCK_QUEST_VERSION,
    stage: JAPANESE_MATCHLOCK_STAGE_LOCKED,
    fetchStageIndex: 0,
    workshopTileId: null,
    offerSeen: false,
    completedMinute: null,
    spawnRolls: {}
  };
}

export function validateJapaneseMatchlockQuestMemory(memory) {
  if (!memory || typeof memory !== "object" ||
      memory.version !== JAPANESE_MATCHLOCK_QUEST_VERSION) {
    throw new Error(`Unsupported Japanese matchlock quest memory: ${memory?.version ?? "missing"}`);
  }
  if (![JAPANESE_MATCHLOCK_STAGE_LOCKED, JAPANESE_MATCHLOCK_STAGE_ACTIVE,
    JAPANESE_MATCHLOCK_STAGE_COMPLETED].includes(memory.stage)) {
    throw new Error(`Invalid Japanese matchlock quest stage: ${memory.stage}`);
  }
  if (!Number.isInteger(memory.fetchStageIndex) || memory.fetchStageIndex < 0 ||
      memory.fetchStageIndex > JAPANESE_MATCHLOCK_FETCH_STAGES.length) {
    throw new Error(`Invalid Japanese matchlock fetch stage: ${memory.fetchStageIndex}`);
  }
  if (typeof memory.offerSeen !== "boolean") {
    throw new Error("Japanese matchlock quest requires an offer-seen flag");
  }
  validateSpawnRolls(memory.spawnRolls);

  if (memory.stage === JAPANESE_MATCHLOCK_STAGE_LOCKED) {
    if (memory.fetchStageIndex !== 0 || memory.workshopTileId !== null || memory.offerSeen ||
        memory.completedMinute !== null) {
      throw new Error("Locked Japanese matchlock quest contains active progress");
    }
    return memory;
  }

  if (!Number.isInteger(memory.workshopTileId) || memory.workshopTileId < 0) {
    throw new Error(`Invalid Japanese matchlock workshop tile: ${memory.workshopTileId}`);
  }
  if (memory.stage === JAPANESE_MATCHLOCK_STAGE_ACTIVE &&
      memory.fetchStageIndex >= JAPANESE_MATCHLOCK_FETCH_STAGES.length) {
    throw new Error("Active Japanese matchlock quest has completed every fetch stage");
  }
  if (memory.stage === JAPANESE_MATCHLOCK_STAGE_ACTIVE && memory.completedMinute !== null) {
    throw new Error("Active Japanese matchlock quest has a completion minute");
  }
  if (memory.stage === JAPANESE_MATCHLOCK_STAGE_COMPLETED && (
    memory.fetchStageIndex !== JAPANESE_MATCHLOCK_FETCH_STAGES.length ||
    !Number.isFinite(memory.completedMinute) || memory.completedMinute < 0
  )) {
    throw new Error("Completed Japanese matchlock quest has invalid completion state");
  }
  return memory;
}

export function japaneseMatchlockQuestMemory(state) {
  return validateJapaneseMatchlockQuestMemory(state?.memory?.quests?.japaneseMatchlocks);
}

export function isJapaneseMatchlockWorkshopCity(city) {
  return city?.city === JAPANESE_MATCHLOCK_WORKSHOP_CITY &&
    city?.country === JAPANESE_MATCHLOCK_WORKSHOP_COUNTRY;
}

export function japaneseMatchlockPrerequisiteMet(state) {
  const colony = state?.memory?.colonization;
  return colony?.stage === COLONIZATION_STAGE_ESTABLISHED &&
    colony.targetCity === "Nagasaki" && colony.targetCountry === "Japan";
}

export function maybeSpawnJapaneseMatchlockQuest(state, city, context = {}) {
  if (!isJapaneseMatchlockWorkshopCity(city)) return null;
  const memory = japaneseMatchlockQuestMemory(state);
  if (memory.stage !== JAPANESE_MATCHLOCK_STAGE_LOCKED) {
    assertWorkshop(memory, city);
    return japaneseMatchlockQuestState(state, city);
  }
  if (!japaneseMatchlockPrerequisiteMet(state)) return null;

  const period = rollPeriod(context.simMinute);
  const rollKey = `${city.tileId}|${period}`;
  if (memory.spawnRolls[rollKey]) return null;
  memory.spawnRolls[rollKey] = true;
  pruneRolls(memory.spawnRolls);
  const chance = spawnChance(context.spawnChance);
  const identityKey = state.playerCharacter?.identityKey || state.playerCharacter?.name || "captain";
  if (chance < 1 && seededFraction(`${identityKey}|${rollKey}|japanese-matchlocks`) >= chance) {
    return null;
  }

  memory.stage = JAPANESE_MATCHLOCK_STAGE_ACTIVE;
  memory.workshopTileId = city.tileId;
  validateJapaneseMatchlockQuestMemory(memory);
  return japaneseMatchlockQuestState(state, city);
}

export function japaneseMatchlockQuestState(state, city) {
  const memory = japaneseMatchlockQuestMemory(state);
  if (memory.stage === JAPANESE_MATCHLOCK_STAGE_LOCKED) return null;
  if (!isJapaneseMatchlockWorkshopCity(city)) return null;
  assertWorkshop(memory, city);
  const fetchStage = memory.stage === JAPANESE_MATCHLOCK_STAGE_ACTIVE
    ? JAPANESE_MATCHLOCK_FETCH_STAGES[memory.fetchStageIndex]
    : null;
  const held = fetchStage ? state.cargo?.[fetchStage.goodId] || 0 : 0;
  return Object.freeze({
    stage: memory.stage,
    fetchStageIndex: memory.fetchStageIndex,
    fetchStage,
    held,
    canDeliver: Boolean(fetchStage && held >= fetchStage.quantity),
    completed: memory.stage === JAPANESE_MATCHLOCK_STAGE_COMPLETED,
    offerSeen: memory.offerSeen,
    workshop: Object.freeze({
      tileId: memory.workshopTileId,
      city: JAPANESE_MATCHLOCK_WORKSHOP_CITY,
      country: JAPANESE_MATCHLOCK_WORKSHOP_COUNTRY
    })
  });
}

export function japaneseMatchlockOfferShouldApproach(state, city) {
  const quest = japaneseMatchlockQuestState(state, city);
  return Boolean(quest && !quest.completed && !quest.offerSeen);
}

export function markJapaneseMatchlockOfferSeen(state) {
  const memory = japaneseMatchlockQuestMemory(state);
  if (memory.stage === JAPANESE_MATCHLOCK_STAGE_LOCKED) {
    throw new Error("Japanese matchlock offer has not spawned");
  }
  memory.offerSeen = true;
  return true;
}

export function assertJapaneseMatchlockDelivery(state, city, stageId) {
  const quest = activeQuestStage(state, city, stageId);
  if (!quest.canDeliver) {
    throw new Error(`Not enough ${quest.fetchStage.goodLabel} for the Japanese matchlock workshop`);
  }
  return quest.fetchStage;
}

export function completeJapaneseMatchlockFetchStage(state, city, stageId, currentMinute) {
  const stage = activeQuestStage(state, city, stageId).fetchStage;
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid Japanese matchlock completion minute: ${currentMinute}`);
  }
  const memory = japaneseMatchlockQuestMemory(state);
  memory.fetchStageIndex += 1;
  if (memory.fetchStageIndex === JAPANESE_MATCHLOCK_FETCH_STAGES.length) {
    memory.stage = JAPANESE_MATCHLOCK_STAGE_COMPLETED;
    memory.completedMinute = currentMinute;
  }
  validateJapaneseMatchlockQuestMemory(memory);
  return Object.freeze({
    completedStage: stage,
    quest: japaneseMatchlockQuestState(state, city)
  });
}

export function japaneseMatchlockIndustryCompleted(state) {
  return japaneseMatchlockQuestMemory(state).stage === JAPANESE_MATCHLOCK_STAGE_COMPLETED;
}

function fetchStage(id, goodId, quantity, purpose) {
  const good = tradeGoodById(goodId);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid Japanese matchlock fetch quantity: ${id}`);
  }
  return Object.freeze({ id, goodId, goodLabel: good.label, quantity, purpose });
}

function activeQuestStage(state, city, stageId) {
  const quest = japaneseMatchlockQuestState(state, city);
  if (!quest?.fetchStage) throw new Error("Japanese matchlock workshop has no active material request");
  if (quest.fetchStage.id !== stageId) {
    throw new Error(`Unexpected Japanese matchlock material stage: ${stageId}`);
  }
  return quest;
}

function assertWorkshop(memory, city) {
  if (city.tileId !== memory.workshopTileId) {
    throw new Error(`Japanese matchlock workshop moved from tile ${memory.workshopTileId} to ${city.tileId}`);
  }
}

function validateSpawnRolls(rolls) {
  if (!rolls || typeof rolls !== "object" || Array.isArray(rolls)) {
    throw new Error("Japanese matchlock spawn rolls must be an object");
  }
  for (const [key, value] of Object.entries(rolls)) {
    if (typeof key !== "string" || key === "" || value !== true) {
      throw new Error(`Invalid Japanese matchlock spawn roll: ${key}`);
    }
  }
}

function rollPeriod(simMinute = 0) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid Japanese matchlock offer minute: ${simMinute}`);
  }
  return Math.floor(simMinute / JAPANESE_MATCHLOCK_ROLL_PERIOD_MINUTES);
}

function spawnChance(value) {
  const chance = value ?? JAPANESE_MATCHLOCK_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid Japanese matchlock spawn chance: ${chance}`);
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
