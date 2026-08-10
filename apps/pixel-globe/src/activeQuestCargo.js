import {
  CHEF_QUEST_STAGE_GATHERING,
  chefQuestMemory,
  chefQuestState
} from "./chefQuest.js";
import {
  CARIBBEAN_GINGER_STAGE_ACTIVE,
  caribbeanGingerQuestMemory,
  caribbeanGingerQuestState
} from "./caribbeanGingerQuest.js";
import {
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_FETCH,
  COLONIZATION_STAGE_OUTBOUND,
  colonizationQuestView,
  isColonizationQuestApproval,
  isColonizationQuestOrigin,
  isColonizationQuestTarget
} from "./colonizationQuest.js";
import {
  JAPANESE_MATCHLOCK_STAGE_ACTIVE,
  JAPANESE_MATCHLOCK_WORKSHOP_CITY,
  JAPANESE_MATCHLOCK_WORKSHOP_COUNTRY,
  japaneseMatchlockQuestMemory,
  japaneseMatchlockQuestState
} from "./japaneseMatchlockQuest.js";
import {
  VIKING_LONGSHIP_PORT_CITY,
  VIKING_LONGSHIP_PORT_COUNTRY,
  vikingLongshipQuestState
} from "./vikingLongshipQuest.js";
import { papalCommissionCargoRequirements } from "./papalPolitics.js";
import { questCargoDeliveryProgress } from "./questCargoDeliveries.js";
import { isTributeEnvoyQuest } from "./diplomaticMissions.js";

export const QUEST_CARGO_PROMPT_VIKING = "viking-longship";
export const QUEST_CARGO_PROMPT_MATCHLOCKS = "japanese-matchlocks";
export const QUEST_CARGO_PROMPT_GINGER = "caribbean-ginger";
export const QUEST_CARGO_PROMPT_CHEF = "chef-quest";
export const QUEST_CARGO_PROMPT_COLONIZATION = "colonization";

const PROMPT_PRESENTATION = Object.freeze({
  [QUEST_CARGO_PROMPT_VIKING]: Object.freeze({
    nodeId: "viking-longship",
    arrivalFlag: "vikingLongshipArrival"
  }),
  [QUEST_CARGO_PROMPT_MATCHLOCKS]: Object.freeze({
    nodeId: "japanese-matchlocks",
    arrivalFlag: "japaneseMatchlockArrival"
  }),
  [QUEST_CARGO_PROMPT_GINGER]: Object.freeze({
    nodeId: "caribbean-ginger",
    arrivalFlag: "caribbeanGingerArrival"
  }),
  [QUEST_CARGO_PROMPT_CHEF]: Object.freeze({
    nodeId: "chef-quest",
    arrivalFlag: "chefQuestArrival"
  }),
  [QUEST_CARGO_PROMPT_COLONIZATION]: Object.freeze({
    nodeId: "colonization",
    arrivalFlag: "colonizationArrival"
  })
});

export function activeQuestCargoRequirements(state, { currentMinute = 0 } = {}) {
  const requirements = [];
  const add = (id, goodId, remainingQuantity) => {
    if (!Number.isInteger(remainingQuantity) || remainingQuantity < 0) {
      throw new Error(`Invalid active quest cargo remainder: ${id}=${remainingQuantity}`);
    }
    if (remainingQuantity > 0) requirements.push(Object.freeze({ id, goodId, remainingQuantity }));
  };

  const activeQuest = state.memory?.quests?.active;
  if (isTributeEnvoyQuest(activeQuest) && activeQuest.stage === "outbound") {
    for (const requirement of activeQuest.tributeCargoRequirements) {
      add(`tribute.${activeQuest.id}.${requirement.goodId}`, requirement.goodId, requirement.quantity);
    }
  }

  const viking = vikingLongshipQuestState(state, {
    city: VIKING_LONGSHIP_PORT_CITY,
    country: VIKING_LONGSHIP_PORT_COUNTRY
  });
  if (viking?.stage) add(`viking.${viking.stage.id}`, viking.stage.goodId, viking.remaining);

  const matchlockMemory = japaneseMatchlockQuestMemory(state);
  if (matchlockMemory.stage === JAPANESE_MATCHLOCK_STAGE_ACTIVE) {
    const matchlocks = japaneseMatchlockQuestState(state, {
      tileId: matchlockMemory.workshopTileId,
      city: JAPANESE_MATCHLOCK_WORKSHOP_CITY,
      country: JAPANESE_MATCHLOCK_WORKSHOP_COUNTRY
    });
    add(`matchlocks.${matchlocks.fetchStage.id}`, matchlocks.fetchStage.goodId, matchlocks.remaining);
  }

  const gingerMemory = caribbeanGingerQuestMemory(state);
  if (gingerMemory.stage === CARIBBEAN_GINGER_STAGE_ACTIVE) {
    const ginger = caribbeanGingerQuestState(state, {
      tileId: gingerMemory.cultivationTileId,
      city: gingerMemory.cultivationCity,
      country: gingerMemory.cultivationCountry
    });
    add(`ginger.${ginger.fetchStage.id}`, ginger.fetchStage.goodId, ginger.remaining);
  }

  const chefMemory = chefQuestMemory(state);
  if (chefMemory.stage === CHEF_QUEST_STAGE_GATHERING) {
    const chef = chefQuestState(state, {
      tileId: chefMemory.portTileId,
      city: chefMemory.portCity,
      country: chefMemory.portCountry
    });
    for (const ingredient of chef.ingredients) {
      add(`chef.${ingredient.requirementId}`, ingredient.goodId, ingredient.remaining);
    }
  }

  const colonization = colonizationQuestView(state, { currentMinute });
  if (colonization.target && colonization.stage === COLONIZATION_STAGE_FETCH && colonization.fetchStage) {
    add(
      `colonization.fetch.${colonization.fetchStage.id}`,
      colonization.fetchStage.goodId,
      colonization.fetchRemaining
    );
  }
  if (colonization.target && colonization.stage === COLONIZATION_STAGE_OUTBOUND &&
      colonization.approval && !colonization.approvalGranted) {
    for (const requirement of colonization.approvalCargo) {
      add(`colonization.approval.${requirement.requirementId}`, requirement.goodId, requirement.remaining);
    }
  }
  if (colonization.target && colonization.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY) {
    add(
      `colonization.resupply.${colonization.resupply.requirementId}`,
      colonization.resupply.goodId,
      colonization.resupply.remaining
    );
  }

  for (const requirement of papalCommissionCargoRequirements(state.relations.papacy)) {
    const progress = questCargoDeliveryProgress(state, requirement.id, requirement.quantity);
    add(requirement.id, requirement.goodId, progress.remainingQuantity);
  }

  return Object.freeze(requirements);
}

export function activeQuestCargoReservedQuantities(state, options = {}) {
  const quantities = {};
  for (const requirement of activeQuestCargoRequirements(state, options)) {
    quantities[requirement.goodId] = (quantities[requirement.goodId] || 0) + requirement.remainingQuantity;
  }
  return Object.freeze(quantities);
}

export function questCargoDeliveryPromptsAtPort(state, city, { currentMinute = 0 } = {}) {
  if (!city || !Number.isInteger(city.tileId)) {
    throw new Error("Quest cargo delivery prompts require a placed port");
  }
  const promptIds = [];
  const add = (promptId, canDeliver) => {
    if (canDeliver) promptIds.push(promptId);
  };

  add(QUEST_CARGO_PROMPT_VIKING, vikingLongshipQuestState(state, city)?.canDeliver === true);
  add(QUEST_CARGO_PROMPT_MATCHLOCKS, japaneseMatchlockQuestState(state, city)?.canDeliver === true);
  add(QUEST_CARGO_PROMPT_GINGER, caribbeanGingerQuestState(state, city)?.canDeliver === true);
  add(QUEST_CARGO_PROMPT_CHEF, chefQuestState(state, city)?.canDeliver === true);

  const colonization = colonizationQuestView(state, { currentMinute });
  const colonizationDelivery =
    (colonization.stage === COLONIZATION_STAGE_FETCH &&
      isColonizationQuestOrigin(state.memory.colonization, city) &&
      colonization.canDeliverFetch) ||
    (colonization.stage === COLONIZATION_STAGE_OUTBOUND &&
      isColonizationQuestApproval(state.memory.colonization, city) &&
      !colonization.approvalGranted &&
      colonization.approvalCargoDeliverable) ||
    (colonization.stage === COLONIZATION_STAGE_AWAITING_RESUPPLY &&
      isColonizationQuestTarget(state.memory.colonization, city) &&
      colonization.leftSinceFounding &&
      !colonization.deadlineExpired &&
      colonization.resupply.deliverable > 0);
  add(QUEST_CARGO_PROMPT_COLONIZATION, colonizationDelivery);

  return Object.freeze(promptIds.map((id) => Object.freeze({ id, ...PROMPT_PRESENTATION[id] })));
}
