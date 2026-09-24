export const FISHING_TRADE_TUTORIAL_VERSION = 1;

export const FISHING_TRADE_TUTORIAL_STAGE = Object.freeze({
  DORMANT: "dormant",
  PRACTICE: "practice",
  CATCH: "catch",
  SAIL_TO_MARKET: "sail-to-market",
  OPEN_MARKET: "open-market",
  SELL_FISH: "sell-fish"
});

const STAGES = new Set(Object.values(FISHING_TRADE_TUTORIAL_STAGE));

export function createFishingTradeTutorialMemory() {
  return {
    version: FISHING_TRADE_TUTORIAL_VERSION,
    stage: FISHING_TRADE_TUTORIAL_STAGE.DORMANT,
    startedAtActivePlaySeconds: null,
    fisheryStockKey: null,
    fishTileId: null,
    speciesLabel: null,
    destinationCityId: null
  };
}

export function activateFishingTradeTutorial(memory, activePlaySeconds) {
  validateFishingTradeTutorialMemory(memory);
  if (memory.stage !== FISHING_TRADE_TUTORIAL_STAGE.DORMANT) return false;
  assertActivePlaySeconds(activePlaySeconds);
  memory.stage = FISHING_TRADE_TUTORIAL_STAGE.PRACTICE;
  memory.startedAtActivePlaySeconds = activePlaySeconds;
  return true;
}

export function fishingTradeTutorialPracticeComplete(memory, activePlaySeconds, delaySeconds = 60) {
  validateFishingTradeTutorialMemory(memory);
  assertActivePlaySeconds(activePlaySeconds);
  if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
    throw new Error(`Invalid fishing tutorial delay: ${delaySeconds}`);
  }
  return memory.stage === FISHING_TRADE_TUTORIAL_STAGE.PRACTICE &&
    activePlaySeconds - memory.startedAtActivePlaySeconds >= delaySeconds;
}

export function beginFishingTradeTutorialCatch(memory, { fisheryStockKey, fishTileId, speciesLabel }) {
  requireStage(memory, FISHING_TRADE_TUTORIAL_STAGE.PRACTICE);
  requireText(fisheryStockKey, "fishery stock key");
  requireText(speciesLabel, "species label");
  if (!Number.isInteger(fishTileId) || fishTileId < 0) {
    throw new Error(`Fishing tutorial requires a valid fish tile: ${fishTileId}`);
  }
  memory.stage = FISHING_TRADE_TUTORIAL_STAGE.CATCH;
  memory.fisheryStockKey = fisheryStockKey;
  memory.fishTileId = fishTileId;
  memory.speciesLabel = speciesLabel;
  validateFishingTradeTutorialMemory(memory);
}

export function fishingTradeTutorialTargetsFishery(memory, stockKey, tileId) {
  validateFishingTradeTutorialMemory(memory);
  return memory.stage === FISHING_TRADE_TUTORIAL_STAGE.CATCH &&
    memory.fisheryStockKey === stockKey && memory.fishTileId === tileId;
}

export function advanceFishingTradeTutorialToMarket(memory, destinationCityId) {
  requireStage(memory, FISHING_TRADE_TUTORIAL_STAGE.CATCH);
  requireText(destinationCityId, "destination city id");
  memory.stage = FISHING_TRADE_TUTORIAL_STAGE.SAIL_TO_MARKET;
  memory.destinationCityId = destinationCityId;
  validateFishingTradeTutorialMemory(memory);
}

export function arriveAtFishingTradeTutorialMarket(memory, cityId) {
  requireStage(memory, FISHING_TRADE_TUTORIAL_STAGE.SAIL_TO_MARKET);
  if (cityId !== memory.destinationCityId) return false;
  memory.stage = FISHING_TRADE_TUTORIAL_STAGE.OPEN_MARKET;
  validateFishingTradeTutorialMemory(memory);
  return true;
}

export function openFishingTradeTutorialMarket(memory, cityId) {
  requireStage(memory, FISHING_TRADE_TUTORIAL_STAGE.OPEN_MARKET);
  if (cityId !== memory.destinationCityId) return false;
  memory.stage = FISHING_TRADE_TUTORIAL_STAGE.SELL_FISH;
  validateFishingTradeTutorialMemory(memory);
  return true;
}

export function completeFishingTradeTutorial(memory, cityId) {
  requireStage(memory, FISHING_TRADE_TUTORIAL_STAGE.SELL_FISH);
  if (cityId !== memory.destinationCityId) return false;
  Object.assign(memory, createFishingTradeTutorialMemory());
  return true;
}

export function validateFishingTradeTutorialMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory) ||
      memory.version !== FISHING_TRADE_TUTORIAL_VERSION) {
    throw new Error(`Unsupported fishing trade tutorial memory: ${memory?.version ?? "missing"}`);
  }
  if (!STAGES.has(memory.stage)) throw new Error(`Unknown fishing tutorial stage: ${memory.stage}`);
  if (memory.stage === FISHING_TRADE_TUTORIAL_STAGE.DORMANT) {
    assertEmptyTarget(memory);
    if (memory.startedAtActivePlaySeconds !== null) {
      throw new Error("Dormant fishing tutorial retained its start time");
    }
    return memory;
  }
  assertActivePlaySeconds(memory.startedAtActivePlaySeconds);
  if (memory.stage === FISHING_TRADE_TUTORIAL_STAGE.PRACTICE) {
    assertEmptyTarget(memory);
    return memory;
  }
  requireText(memory.fisheryStockKey, "fishery stock key");
  requireText(memory.speciesLabel, "species label");
  if (!Number.isInteger(memory.fishTileId) || memory.fishTileId < 0) {
    throw new Error(`Fishing tutorial has an invalid fish tile: ${memory.fishTileId}`);
  }
  if (memory.stage === FISHING_TRADE_TUTORIAL_STAGE.CATCH) {
    if (memory.destinationCityId !== null) {
      throw new Error("Fishing tutorial selected a market before making a catch");
    }
    return memory;
  }
  requireText(memory.destinationCityId, "destination city id");
  return memory;
}

function requireStage(memory, expected) {
  validateFishingTradeTutorialMemory(memory);
  if (memory.stage !== expected) {
    throw new Error(`Fishing tutorial expected ${expected}, received ${memory.stage}`);
  }
}

function assertEmptyTarget(memory) {
  for (const key of ["fisheryStockKey", "fishTileId", "speciesLabel", "destinationCityId"]) {
    if (memory[key] !== null) throw new Error(`Fishing tutorial ${memory.stage} retained ${key}`);
  }
}

function assertActivePlaySeconds(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid active play time: ${value}`);
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Fishing tutorial requires a ${label}`);
  }
}
