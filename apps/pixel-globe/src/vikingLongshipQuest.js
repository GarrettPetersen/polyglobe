import { deliverQuestCargo } from "./gameState.js";

export const VIKING_LONGSHIP_SLUG = "viking-longship";
export const VIKING_LONGSHIP_PORT_CITY = "Hafnarfjordur";
export const VIKING_LONGSHIP_PORT_COUNTRY = "Iceland";
export const VIKING_LONGSHIP_PRICE = 42000;
export const VIKING_LONGSHIP_CHARACTER_SOURCE_ID =
  "viking-men-portrait-pack-by-captainskeleto-viking-portrait-male-9";

export const VIKING_LONGSHIP_FETCH_STAGES = Object.freeze([
  fetchStage("wool-sail", "wool", "Wool", 8, "a bright striped square sail"),
  fetchStage("timber-oars", "timber", "Timber", 6, "a working bank of oars"),
  fetchStage("iron-rivets", "iron", "Iron", 3, "clinker rivets and roves")
]);

const QUEST_STAGE_FLAG = "vikingLongshipQuestStage";

export function isVikingLongshipQuestPort(city) {
  return city?.city === VIKING_LONGSHIP_PORT_CITY && city?.country === VIKING_LONGSHIP_PORT_COUNTRY;
}

export function vikingLongshipQuestState(state, city) {
  if (!isVikingLongshipQuestPort(city)) return null;
  const stageIndex = state?.memory?.flags?.[QUEST_STAGE_FLAG] ?? 0;
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > VIKING_LONGSHIP_FETCH_STAGES.length) {
    throw new Error(`Invalid Viking longship quest stage: ${stageIndex}`);
  }
  const stage = VIKING_LONGSHIP_FETCH_STAGES[stageIndex] || null;
  const held = stage ? state.cargo?.[stage.goodId] || 0 : 0;
  return Object.freeze({
    stageIndex,
    stage,
    held,
    canDeliver: Boolean(stage && held >= stage.quantity),
    unlocked: stage === null
  });
}

export function deliverVikingLongshipQuestCargo(state, city, stageId, context = {}) {
  const quest = vikingLongshipQuestState(state, city);
  if (!quest) throw new Error("Viking longship materials can only be delivered in Hafnarfjordur");
  if (!quest.stage) throw new Error("The Viking longship reconstruction is already complete");
  if (quest.stage.id !== stageId) {
    throw new Error(`Unexpected Viking longship material stage: ${stageId}`);
  }
  const delivery = deliverQuestCargo(
    state,
    city,
    quest.stage.goodId,
    quest.stage.quantity,
    `viking-longship.${quest.stage.id}`,
    context
  );
  state.memory.flags[QUEST_STAGE_FLAG] = quest.stageIndex + 1;
  return {
    ...delivery,
    completedStage: quest.stage,
    quest: vikingLongshipQuestState(state, city)
  };
}

export function vikingLongshipUnlocked(state) {
  const stageIndex = state?.memory?.flags?.[QUEST_STAGE_FLAG] ?? 0;
  if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex > VIKING_LONGSHIP_FETCH_STAGES.length) {
    throw new Error(`Invalid Viking longship quest stage: ${stageIndex}`);
  }
  return stageIndex === VIKING_LONGSHIP_FETCH_STAGES.length;
}

function fetchStage(id, goodId, goodLabel, quantity, purpose) {
  return Object.freeze({ id, goodId, goodLabel, quantity, purpose });
}
