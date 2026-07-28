import { tradeGoodById } from "./economy.js";
import { hasPermanentCrewBerth } from "./namedCrew.js";
import {
  questCargoDeliverableQuantity,
  questCargoDeliveryProgress
} from "./questCargoDeliveries.js";

export const CHEF_QUEST_VERSION = 1;
export const CHEF_QUEST_STAGE_LOCKED = "locked";
export const CHEF_QUEST_STAGE_GATHERING = "gathering";
export const CHEF_QUEST_STAGE_RECRUITMENT = "recruitment";
export const CHEF_QUEST_STAGE_RECRUITED = "recruited";
export const CHEF_QUEST_REWARD = 500;
export const CHEF_QUEST_SPAWN_CHANCE = 0.08;
export const CHEF_QUEST_ROLL_PERIOD_MINUTES = 21 * 24 * 60;

const STAGES = new Set([
  CHEF_QUEST_STAGE_LOCKED,
  CHEF_QUEST_STAGE_GATHERING,
  CHEF_QUEST_STAGE_RECRUITMENT,
  CHEF_QUEST_STAGE_RECRUITED
]);

const INGREDIENT_GROUPS = Object.freeze([
  Object.freeze(["fish", "grain", "cheese"]),
  Object.freeze(["ginger", "cloves", "pepper", "cinnamon", "nutmeg"]),
  Object.freeze(["wine", "tea"]),
  Object.freeze(["sugar", "olive-oil"])
]);

export function createChefQuestMemory() {
  return {
    version: CHEF_QUEST_VERSION,
    stage: CHEF_QUEST_STAGE_LOCKED,
    portTileId: null,
    portCity: null,
    portCountry: null,
    ingredientGoodIds: [],
    eventProfileId: null,
    offerSeen: false,
    completedMinute: null,
    spawnRolls: {}
  };
}

export function validateChefQuestMemory(memory) {
  if (!memory || typeof memory !== "object" || memory.version !== CHEF_QUEST_VERSION) {
    throw new Error(`Unsupported chef quest memory: ${memory?.version ?? "missing"}`);
  }
  if (!STAGES.has(memory.stage)) throw new Error(`Invalid chef quest stage: ${memory.stage}`);
  if (typeof memory.offerSeen !== "boolean") throw new Error("Chef quest requires an offer-seen flag");
  validateRolls(memory.spawnRolls);
  if (memory.stage === CHEF_QUEST_STAGE_LOCKED) {
    if (memory.portTileId !== null || memory.portCity !== null || memory.portCountry !== null ||
        memory.ingredientGoodIds.length !== 0 || memory.eventProfileId !== null || memory.offerSeen ||
        memory.completedMinute !== null) {
      throw new Error("Locked chef quest contains active progress");
    }
    return memory;
  }
  if (!Number.isInteger(memory.portTileId) || memory.portTileId < 0 ||
      typeof memory.portCity !== "string" || memory.portCity === "" ||
      typeof memory.portCountry !== "string" || memory.portCountry === "") {
    throw new Error("Chef quest requires a valid origin port");
  }
  if (!Array.isArray(memory.ingredientGoodIds) || memory.ingredientGoodIds.length !== INGREDIENT_GROUPS.length) {
    throw new Error("Chef quest requires one ingredient from every course group");
  }
  const unique = new Set(memory.ingredientGoodIds);
  if (unique.size !== memory.ingredientGoodIds.length) throw new Error("Chef quest ingredients must be distinct");
  memory.ingredientGoodIds.forEach(validateIngredientGoodId);
  chefEventProfile(memory.eventProfileId);
  if ([CHEF_QUEST_STAGE_RECRUITMENT, CHEF_QUEST_STAGE_RECRUITED].includes(memory.stage)) {
    if (!Number.isFinite(memory.completedMinute) || memory.completedMinute < 0) {
      throw new Error("Completed chef banquet requires a completion minute");
    }
  } else if (memory.completedMinute !== null) {
    throw new Error("Gathering chef quest already has a completion minute");
  }
  return memory;
}

export function chefQuestMemory(state) {
  return validateChefQuestMemory(state?.memory?.quests?.chef);
}

export function maybeSpawnChefQuest(state, city, context = {}) {
  const memory = chefQuestMemory(state);
  if (memory.stage !== CHEF_QUEST_STAGE_LOCKED) return chefQuestState(state, city);
  if (!chefQuestPortEligible(city)) return null;
  if (!hasPermanentCrewBerth(state)) return null;
  const simMinute = context.simMinute ?? 0;
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error(`Invalid chef quest minute: ${simMinute}`);
  const period = Math.floor(simMinute / CHEF_QUEST_ROLL_PERIOD_MINUTES);
  const rollKey = `${city.tileId}|${period}`;
  if (memory.spawnRolls[rollKey]) return null;
  memory.spawnRolls[rollKey] = true;
  pruneRolls(memory.spawnRolls);
  const chance = context.spawnChance ?? CHEF_QUEST_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid chef quest spawn chance: ${chance}`);
  }
  const identity = state.playerCharacter?.id || state.playerCharacter?.name || "captain";
  if (chance < 1 && seededFraction(`${identity}|chef|${rollKey}`) >= chance) return null;

  memory.stage = CHEF_QUEST_STAGE_GATHERING;
  memory.portTileId = city.tileId;
  memory.portCity = city.displayCity || city.city;
  memory.portCountry = city.country;
  memory.ingredientGoodIds = selectIngredients(`${identity}|${rollKey}`);
  memory.eventProfileId = chefEventProfileForPort(city).id;
  validateChefQuestMemory(memory);
  return chefQuestState(state, city);
}

export function chefQuestState(state, city) {
  const memory = chefQuestMemory(state);
  if (memory.stage === CHEF_QUEST_STAGE_LOCKED || city?.tileId !== memory.portTileId) return null;
  if ((city.displayCity || city.city) !== memory.portCity || city.country !== memory.portCountry) {
    throw new Error(`Chef quest port changed from ${memory.portCity}`);
  }
  const ingredients = memory.ingredientGoodIds.map((goodId) => {
    const good = tradeGoodById(goodId);
    const held = state.cargo?.[goodId] || 0;
    const requirementId = chefIngredientRequirementId(memory, goodId);
    const progress = questCargoDeliveryProgress(state, requirementId, 1);
    return Object.freeze({
      goodId,
      label: good.label,
      held,
      requirementId,
      delivered: progress.deliveredQuantity,
      remaining: progress.remainingQuantity,
      deliverable: questCargoDeliverableQuantity(state, requirementId, 1, held),
      ready: progress.complete
    });
  });
  return Object.freeze({
    stage: memory.stage,
    ingredients: Object.freeze(ingredients),
    canDeliver: memory.stage === CHEF_QUEST_STAGE_GATHERING &&
      ingredients.some((entry) => entry.deliverable > 0),
    complete: memory.stage === CHEF_QUEST_STAGE_GATHERING &&
      ingredients.every((entry) => entry.ready),
    offerSeen: memory.offerSeen,
    event: chefEventProfile(memory.eventProfileId),
    port: Object.freeze({ tileId: memory.portTileId, city: memory.portCity, country: memory.portCountry })
  });
}

export function chefQuestOfferShouldApproach(state, city) {
  const quest = chefQuestState(state, city);
  return Boolean(quest && quest.stage !== CHEF_QUEST_STAGE_RECRUITED && !quest.offerSeen);
}

export function markChefQuestOfferSeen(state) {
  const memory = chefQuestMemory(state);
  if (memory.stage === CHEF_QUEST_STAGE_LOCKED) throw new Error("Chef quest offer has not spawned");
  memory.offerSeen = true;
}

export function completeChefBanquet(state, city, currentMinute) {
  const quest = chefQuestState(state, city);
  if (!quest || quest.stage !== CHEF_QUEST_STAGE_GATHERING || !quest.complete) {
    throw new Error("Chef banquet ingredients are not ready");
  }
  if (!Number.isFinite(currentMinute) || currentMinute < 0) {
    throw new Error(`Invalid chef banquet completion minute: ${currentMinute}`);
  }
  const memory = chefQuestMemory(state);
  memory.stage = CHEF_QUEST_STAGE_RECRUITMENT;
  memory.completedMinute = currentMinute;
  validateChefQuestMemory(memory);
  return chefQuestState(state, city);
}

export function chefIngredientRequirementId(memory, goodId) {
  if (!Number.isInteger(memory?.portTileId) || memory.portTileId < 0) {
    throw new Error("Chef ingredient requirement needs an origin port");
  }
  validateIngredientGoodId(goodId);
  return `chef.${memory.portTileId}.${goodId}`;
}

export function recruitChef(state, city) {
  const quest = chefQuestState(state, city);
  if (!quest || quest.stage !== CHEF_QUEST_STAGE_RECRUITMENT) {
    throw new Error("Chef is not ready to join the crew");
  }
  const memory = chefQuestMemory(state);
  memory.stage = CHEF_QUEST_STAGE_RECRUITED;
  validateChefQuestMemory(memory);
  return chefQuestState(state, city);
}

export function chefQuestPortEligible(city) {
  return Boolean(city && Number.isInteger(city.tileId) && !city.isPirateHideout && !city.isVillage);
}

export function chefEventProfileForPort(city) {
  const type = city?.cityType || "";
  const country = city?.country || "";
  if (["Ottoman Empire", "Morocco", "Persia", "Mamluk Sultanate"].includes(country) ||
      type === "islamic-desert") return chefEventProfile("sultans-wedding");
  if (["Ming China", "Joseon", "Japan"].includes(country) || type === "east-asian") {
    return chefEventProfile("governors-banquet");
  }
  if (["India", "Vijayanagara", "Gujarat Sultanate"].includes(country) || type === "south-asian") {
    return chefEventProfile("princes-wedding");
  }
  if (type === "northern-european") return chefEventProfile("midsummer-feast");
  if (["Cuba", "New Spain", "Spanish Empire"].includes(country)) return chefEventProfile("governors-feast");
  return chefEventProfile("guild-banquet");
}

const EVENT_PROFILES = Object.freeze([
  eventProfile("sultans-wedding", "the Sultan's son's wedding feast", "The wedding tables were praised from the palace kitchens to the outer court."),
  eventProfile("governors-banquet", "the governor's formal banquet", "The governor called the final course worthy of an imperial table."),
  eventProfile("princes-wedding", "a prince's wedding feast", "The wedding guests sent back every platter clean and demanded the cook's name."),
  eventProfile("midsummer-feast", "the city's midsummer feast", "The guildmasters drank late, ate well, and declared the feast the finest in years."),
  eventProfile("governors-feast", "the governor's feast day table", "The governor's household praised every course and paid the kitchen hands in silver."),
  eventProfile("guild-banquet", "the merchants' guild banquet", "The guild table fell quiet at the first bite, then erupted in applause.")
]);
const EVENT_PROFILES_BY_ID = new Map(EVENT_PROFILES.map((profile) => [profile.id, profile]));

export function chefEventProfile(id) {
  const profile = EVENT_PROFILES_BY_ID.get(id);
  if (!profile) throw new Error(`Unknown chef event profile: ${id}`);
  return profile;
}

function selectIngredients(seed) {
  return INGREDIENT_GROUPS.map((group, index) => group[
    hashString32(`${seed}|ingredient|${index}`) % group.length
  ]);
}

function validateIngredientGoodId(goodId) {
  const good = tradeGoodById(goodId);
  if (!["food", "drink", "spice", "luxury"].includes(good.category)) {
    throw new Error(`Chef ingredient is not edible or drinkable: ${goodId}`);
  }
}

function eventProfile(id, eventLabel, successText) {
  return Object.freeze({ id, eventLabel, successText });
}

function validateRolls(rolls) {
  if (!rolls || typeof rolls !== "object" || Array.isArray(rolls)) {
    throw new Error("Chef quest spawn rolls must be an object");
  }
  for (const [key, value] of Object.entries(rolls)) {
    if (!key || value !== true) throw new Error(`Invalid chef quest spawn roll: ${key}`);
  }
}

function pruneRolls(rolls) {
  const keys = Object.keys(rolls);
  for (const key of keys.slice(0, Math.max(0, keys.length - 128))) delete rolls[key];
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
