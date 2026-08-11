import { deliverQuestCargoRequirement } from "./gameState.js";
import { CANONICAL_PORTS, portMatchesCanonicalReference } from "./canonicalPorts.js";
import {
  NAMED_CREW_ROLE_HISTORIAN,
  hasPermanentCrewBerth,
  namedCrewMembers
} from "./namedCrew.js";
import {
  questCargoDeliverableQuantity,
  questCargoDeliveryProgress
} from "./questCargoDeliveries.js";

export const VIKING_LONGSHIP_SLUG = "viking-longship";
export const VIKING_LONGSHIP_PORT_CITY = CANONICAL_PORTS.HAFNARFJORDUR.city;
export const VIKING_LONGSHIP_PORT_COUNTRY = CANONICAL_PORTS.HAFNARFJORDUR.country;
export const VIKING_LONGSHIP_PRICE = 42000;
export const VIKING_LONGSHIP_SPAWN_CHANCE = 0.2;
export const VIKING_LONGSHIP_ROLL_PERIOD_MINUTES = 30 * 24 * 60;
export const VIKING_LONGSHIP_CHARACTER_SOURCE_ID =
  "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-9";
export const VIKING_LONGSHIP_CHARACTER_FALLBACK_SOURCE_ID =
  "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-8";

export const VIKING_LONGSHIP_FETCH_STAGES = Object.freeze([
  fetchStage("wool-sail", "wool", "Wool", 8, "a bright striped square sail"),
  fetchStage("timber-oars", "timber", "Timber", 6, "a working bank of oars"),
  fetchStage("iron-rivets", "iron", "Iron", 3, "clinker rivets and roves")
]);

const QUEST_STAGE_FLAG = "vikingLongshipQuestStage";
const QUEST_REWARD_FLAG = "vikingLongshipRewardDisposition";
const QUEST_OFFERED_FLAG = "vikingLongshipQuestOffered";
const QUEST_OFFER_SEEN_FLAG = "vikingLongshipQuestOfferSeen";
export const VIKING_LONGSHIP_REWARD_PENDING = "pending";
export const VIKING_LONGSHIP_REWARD_ACCEPTED = "accepted";
export const VIKING_LONGSHIP_REWARD_DECLINED = "declined";
export const VIKING_LONGSHIP_REWARD_PURCHASED = "purchased";
const REWARD_DISPOSITIONS = new Set([
  VIKING_LONGSHIP_REWARD_ACCEPTED,
  VIKING_LONGSHIP_REWARD_DECLINED,
  VIKING_LONGSHIP_REWARD_PURCHASED
]);

export function isVikingLongshipQuestPort(city) {
  return portMatchesCanonicalReference(city, CANONICAL_PORTS.HAFNARFJORDUR);
}

export function maybeSpawnVikingLongshipQuest(state, city, context = {}) {
  if (!isVikingLongshipQuestPort(city)) return null;
  const memory = vikingQuestMemory(state);
  const existing = vikingLongshipQuestState(state, city);
  if (existing) return existing;
  if (!hasPermanentCrewBerth(state)) return null;

  const period = vikingRollPeriod(context.simMinute);
  const rollKey = `${city.portId || city.tileId}|${period}`;
  if (memory.rolls[rollKey]) return null;
  memory.rolls[rollKey] = true;
  pruneRolls(memory.rolls);

  const chance = vikingSpawnChance(context.spawnChance);
  const identityKey = state.playerCharacter?.id || state.playerCharacter?.name || "captain";
  if (chance < 1 && seededFraction(`${identityKey}|${rollKey}|viking-longship`) >= chance) return null;
  memory.flags[QUEST_OFFERED_FLAG] = true;
  return vikingLongshipQuestState(state, city);
}

export function vikingLongshipOfferShouldApproach(state, city) {
  if (!vikingLongshipQuestState(state, city)) return false;
  return state.memory.flags[QUEST_OFFER_SEEN_FLAG] !== true;
}

export function markVikingLongshipOfferSeen(state) {
  const memory = vikingQuestMemory(state);
  if (memory.flags[QUEST_OFFERED_FLAG] !== true && currentStageIndex(memory.flags) === 0) {
    throw new Error("Viking longship offer has not spawned");
  }
  memory.flags[QUEST_OFFER_SEEN_FLAG] = true;
}

export function vikingLongshipQuestState(state, city) {
  if (!isVikingLongshipQuestPort(city)) return null;
  const flags = state?.memory?.flags;
  if (!flags || typeof flags !== "object") throw new Error("Viking longship quest requires game flags");
  const stageIndex = currentStageIndex(flags);
  const offered = flags[QUEST_OFFERED_FLAG] === true || stageIndex > 0 || flags[QUEST_REWARD_FLAG] !== undefined;
  if (!offered) return null;
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > VIKING_LONGSHIP_FETCH_STAGES.length) {
    throw new Error(`Invalid Viking longship quest stage: ${stageIndex}`);
  }
  const stage = VIKING_LONGSHIP_FETCH_STAGES[stageIndex] || null;
  const held = stage ? state.cargo?.[stage.goodId] || 0 : 0;
  const progress = stage
    ? questCargoDeliveryProgress(state, vikingLongshipRequirementId(stage), stage.quantity)
    : null;
  const deliverable = stage
    ? questCargoDeliverableQuantity(
        state,
        vikingLongshipRequirementId(stage),
        stage.quantity,
        held
      )
    : 0;
  return Object.freeze({
    stageIndex,
    stage,
    held,
    delivered: progress?.deliveredQuantity || 0,
    remaining: progress?.remainingQuantity || 0,
    deliverable,
    canDeliver: deliverable > 0,
    unlocked: stage === null,
    rewardDisposition: stage === null ? vikingLongshipRewardDisposition(state) : null
  });
}

export function deliverVikingLongshipQuestCargo(state, city, stageId, context = {}) {
  const quest = vikingLongshipQuestState(state, city);
  if (!quest) throw new Error("Viking longship materials can only be delivered in Hafnarfjordur");
  if (!quest.stage) throw new Error("The Viking longship reconstruction is already complete");
  if (quest.stage.id !== stageId) {
    throw new Error(`Unexpected Viking longship material stage: ${stageId}`);
  }
  const delivery = deliverQuestCargoRequirement(
    state,
    city,
    quest.stage.goodId,
    quest.stage.quantity,
    vikingLongshipRequirementId(quest.stage),
    context
  );
  if (delivery.complete) state.memory.flags[QUEST_STAGE_FLAG] = quest.stageIndex + 1;
  return {
    ...delivery,
    completedStage: delivery.complete ? quest.stage : null,
    activeStage: quest.stage,
    quest: vikingLongshipQuestState(state, city)
  };
}

export function vikingLongshipUnlocked(state) {
  const stageIndex = currentStageIndex(state?.memory?.flags);
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > VIKING_LONGSHIP_FETCH_STAGES.length) {
    throw new Error(`Invalid Viking longship quest stage: ${stageIndex}`);
  }
  return stageIndex === VIKING_LONGSHIP_FETCH_STAGES.length;
}

export function vikingLongshipRewardDisposition(state) {
  if (!vikingLongshipUnlocked(state)) return null;
  const disposition = state?.memory?.flags?.[QUEST_REWARD_FLAG];
  if (disposition === undefined) return VIKING_LONGSHIP_REWARD_PENDING;
  if (!REWARD_DISPOSITIONS.has(disposition)) {
    throw new Error(`Invalid Viking longship reward disposition: ${disposition}`);
  }
  return disposition;
}

export function vikingLongshipEnthusiastAtPort(state, city) {
  const quest = vikingLongshipQuestState(state, city);
  if (!quest) return false;
  return quest.rewardDisposition !== VIKING_LONGSHIP_REWARD_ACCEPTED &&
    quest.rewardDisposition !== VIKING_LONGSHIP_REWARD_PURCHASED;
}

export function vikingLongshipTradeInPlan(state) {
  if (state?.ship?.slug !== VIKING_LONGSHIP_SLUG) return null;
  const candidates = namedCrewMembers(state).filter(isVikingLongshipEnthusiast);
  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    throw new Error("The Viking longship has multiple historical enthusiasts aboard");
  }
  const disposition = vikingLongshipRewardDisposition(state);
  if (![VIKING_LONGSHIP_REWARD_ACCEPTED, VIKING_LONGSHIP_REWARD_PURCHASED].includes(disposition)) {
    throw new Error(`Cannot return a Viking longship whose reward is ${disposition}`);
  }
  return Object.freeze({
    historian: candidates[0],
    departingNamedCrewIds: Object.freeze([candidates[0].id])
  });
}

export function markVikingLongshipReturnedToIceland(state, historian) {
  if (!isVikingLongshipEnthusiast(historian)) {
    throw new Error("Viking longship return requires its historical enthusiast");
  }
  const disposition = vikingLongshipRewardDisposition(state);
  if (![VIKING_LONGSHIP_REWARD_ACCEPTED, VIKING_LONGSHIP_REWARD_PURCHASED].includes(disposition)) {
    throw new Error(`Cannot return a Viking longship whose reward is ${disposition}`);
  }
  vikingQuestMemory(state).flags[QUEST_REWARD_FLAG] = VIKING_LONGSHIP_REWARD_DECLINED;
  return VIKING_LONGSHIP_REWARD_DECLINED;
}

export function vikingLongshipTradeInFarewell() {
  return "I'll take the longship off your hands and sail her home to Iceland. " +
    "If you ever want her back, you will find us in Hafnarfjordur.";
}

export function acceptVikingLongshipReward(state) {
  setVikingLongshipRewardDisposition(
    state,
    VIKING_LONGSHIP_REWARD_PENDING,
    VIKING_LONGSHIP_REWARD_ACCEPTED
  );
  return VIKING_LONGSHIP_REWARD_ACCEPTED;
}

function isVikingLongshipEnthusiast(character) {
  return character?.role === NAMED_CREW_ROLE_HISTORIAN &&
    character.homePortName === VIKING_LONGSHIP_PORT_CITY &&
    character.homePortCountry === VIKING_LONGSHIP_PORT_COUNTRY;
}

export function declineVikingLongshipReward(state) {
  setVikingLongshipRewardDisposition(
    state,
    VIKING_LONGSHIP_REWARD_PENDING,
    VIKING_LONGSHIP_REWARD_DECLINED
  );
  return VIKING_LONGSHIP_REWARD_DECLINED;
}

export function markVikingLongshipPurchased(state) {
  setVikingLongshipRewardDisposition(
    state,
    VIKING_LONGSHIP_REWARD_DECLINED,
    VIKING_LONGSHIP_REWARD_PURCHASED
  );
  return VIKING_LONGSHIP_REWARD_PURCHASED;
}

function setVikingLongshipRewardDisposition(state, expected, disposition) {
  const current = vikingLongshipRewardDisposition(state);
  if (current !== expected) {
    throw new Error(`Viking longship reward is ${current}; expected ${expected}`);
  }
  state.memory.flags[QUEST_REWARD_FLAG] = disposition;
}

function fetchStage(id, goodId, goodLabel, quantity, purpose) {
  return Object.freeze({ id, goodId, goodLabel, quantity, purpose });
}

export function vikingLongshipRequirementId(stage) {
  if (!stage?.id) throw new Error("Viking longship cargo requirement needs a stage");
  return `viking-longship.${stage.id}`;
}

function vikingQuestMemory(state) {
  if (!state?.memory || typeof state.memory !== "object") {
    throw new Error("Viking longship quest requires game state memory");
  }
  if (!state.memory.flags || typeof state.memory.flags !== "object") {
    throw new Error("Viking longship quest requires game flags");
  }
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    state.memory.quests = { active: null, completed: {} };
  }
  if (!state.memory.quests.vikingLongshipRolls ||
      typeof state.memory.quests.vikingLongshipRolls !== "object") {
    state.memory.quests.vikingLongshipRolls = {};
  }
  return {
    flags: state.memory.flags,
    rolls: state.memory.quests.vikingLongshipRolls
  };
}

function currentStageIndex(flags) {
  return flags?.[QUEST_STAGE_FLAG] ?? 0;
}

function vikingRollPeriod(simMinute) {
  if (!Number.isFinite(simMinute)) return 0;
  if (simMinute < 0) throw new Error(`Invalid Viking longship offer minute: ${simMinute}`);
  return Math.floor(simMinute / VIKING_LONGSHIP_ROLL_PERIOD_MINUTES);
}

function vikingSpawnChance(value) {
  const chance = value ?? VIKING_LONGSHIP_SPAWN_CHANCE;
  if (!Number.isFinite(chance) || chance < 0 || chance > 1) {
    throw new Error(`Invalid Viking longship spawn chance: ${chance}`);
  }
  return chance;
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function pruneRolls(rolls) {
  const keys = Object.keys(rolls);
  for (const key of keys.slice(0, Math.max(0, keys.length - 64))) delete rolls[key];
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
