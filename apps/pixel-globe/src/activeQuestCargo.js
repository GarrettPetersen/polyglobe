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
import { isTeaRaceQuest } from "./teaRaceQuest.js";
import {
  CONQUISTADOR_FETCH_STAGES,
  CONQUISTADOR_STAGE_FETCH,
  conquistadorFetchRequirementId
} from "./conquistadorQuest.js";
import {
  shipyardInvestmentAtPort,
  shipyardInvestmentMaterialProgress
} from "./shipyardInvestment.js";

export const QUEST_CARGO_PROMPT_VIKING = "viking-longship";
export const QUEST_CARGO_PROMPT_MATCHLOCKS = "japanese-matchlocks";
export const QUEST_CARGO_PROMPT_GINGER = "caribbean-ginger";
export const QUEST_CARGO_PROMPT_CHEF = "chef-quest";
export const QUEST_CARGO_PROMPT_COLONIZATION = "colonization";
export const QUEST_CARGO_PROMPT_CONQUISTADOR = "conquistador";
export const QUEST_CARGO_PROMPT_SHIPYARD = "shipyard-investment";

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
  }),
  [QUEST_CARGO_PROMPT_CONQUISTADOR]: Object.freeze({
    nodeId: "conquistador",
    arrivalFlag: "conquistadorArrival"
  }),
  [QUEST_CARGO_PROMPT_SHIPYARD]: Object.freeze({
    nodeId: "shipyard-investment",
    arrivalFlag: "shipyardInvestmentArrival"
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
  if (isTeaRaceQuest(activeQuest) && activeQuest.stage === "race") {
    for (const requirement of activeQuest.teaRaceCargoRequirements) {
      add(`tea-race.${activeQuest.id}.${requirement.goodId}`, requirement.goodId, requirement.quantity);
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

  const conquistador = state.memory.quests.conquistador;
  if (conquistador.stage === CONQUISTADOR_STAGE_FETCH) {
    const stage = CONQUISTADOR_FETCH_STAGES[conquistador.fetchStageIndex];
    const progress = questCargoDeliveryProgress(
      state,
      conquistadorFetchRequirementId(stage),
      stage.quantity
    );
    add(`conquistador.${stage.id}`, stage.goodId, progress.remainingQuantity);
  }

  const shipyardProject = state.memory.shipyardInvestment.project;
  if (shipyardProject) {
    for (const { goodId, remaining } of shipyardInvestmentMaterialProgress(shipyardProject)) {
      add(
        `shipyard.${shipyardProject.portTileId}.${goodId}`,
        goodId,
        remaining
      );
    }
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

export function activeQuestCargoSaleStatus(state, goodId, quantity, options = {}) {
  if (typeof goodId !== "string" || goodId === "") {
    throw new Error("Quest cargo sale status requires a trade good id");
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Quest cargo sale status requires a positive quantity: ${quantity}`);
  }
  const heldQuantity = state.cargo?.[goodId] || 0;
  if (!Number.isFinite(heldQuantity) || heldQuantity < quantity) {
    throw new Error(`Quest cargo sale exceeds the hold: ${goodId} ${quantity}/${heldQuantity}`);
  }
  const reservedQuantity = activeQuestCargoReservedQuantities(state, options)[goodId] || 0;
  const unreservedQuantity = Math.max(0, heldQuantity - reservedQuantity);
  const questQuantitySold = Math.max(0, quantity - unreservedQuantity);
  if (questQuantitySold === 0) return null;
  return Object.freeze({
    goodId,
    heldQuantity,
    reservedQuantity,
    saleQuantity: quantity,
    questQuantitySold
  });
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
      !colonization.deadlineExpired &&
      colonization.resupply.deliverable > 0);
  add(QUEST_CARGO_PROMPT_COLONIZATION, colonizationDelivery);

  const conquistador = state.memory.quests.conquistador;
  if (conquistador.stage === CONQUISTADOR_STAGE_FETCH && city.tileId === conquistador.originTileId) {
    const stage = CONQUISTADOR_FETCH_STAGES[conquistador.fetchStageIndex];
    const progress = questCargoDeliveryProgress(
      state,
      conquistadorFetchRequirementId(stage),
      stage.quantity
    );
    add(
      QUEST_CARGO_PROMPT_CONQUISTADOR,
      (state.cargo[stage.goodId] || 0) > 0 && progress.remainingQuantity > 0
    );
  }

  const shipyardProject = shipyardInvestmentAtPort(state, city);
  add(
    QUEST_CARGO_PROMPT_SHIPYARD,
    shipyardProject !== null && shipyardInvestmentMaterialProgress(shipyardProject).some(
      ({ goodId, remaining }) => remaining > 0 && (state.cargo[goodId] || 0) > 0
    )
  );

  return Object.freeze(promptIds.map((id) => Object.freeze({ id, ...PROMPT_PRESENTATION[id] })));
}
