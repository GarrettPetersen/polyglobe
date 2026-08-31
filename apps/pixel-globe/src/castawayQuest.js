import {
  RESCUED_TRAVELER_STAGE_ABOARD,
  RESCUED_TRAVELER_STAGE_HOMECOMING,
  RESCUED_TRAVELER_TYPE_CASTAWAY,
  acceptRescuedTravelerQuest,
  activeRescuedTravelerQuest,
  completeRescuedTravelerQuest,
  createRescuedTravelerDialogueSession,
  createRescuedTravelerQuest,
  createRescuedTravelerQuestMemory,
  markRescuedTravelerEmergencyAidReceived,
  migrateRescuedTravelerQuestMemory,
  prepareRescuedTravelerHomecoming,
  rescuedTravelerDialogueCharacter,
  rescuedTravelerDialogueView,
  selectRescuedTravelerDialogueOption,
  validateRescuedTravelerQuestMemory
} from "./rescuedTravelerQuest.js";

export const CASTAWAY_STAGE_ABOARD = RESCUED_TRAVELER_STAGE_ABOARD;
export const CASTAWAY_STAGE_HOMECOMING = RESCUED_TRAVELER_STAGE_HOMECOMING;
export const CASTAWAY_FIRST_RESCUE_DENOMINATOR = 750;

export function createCastawayQuestMemory() {
  return createRescuedTravelerQuestMemory();
}

export function activeCastawayQuest(state) {
  return activeRescuedTravelerQuest(state, "castaway");
}

export function migrateCastawayQuestMemory(memory, {
  legacyCityIdForPortReference = null
} = {}) {
  return migrateRescuedTravelerQuestMemory(memory, {
    expectedType: RESCUED_TRAVELER_TYPE_CASTAWAY,
    legacyCityIdForPortReference
  });
}

export function castawayRescueAppears(roll) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid castaway rescue roll: ${roll}`);
  }
  return roll < 1 / CASTAWAY_FIRST_RESCUE_DENOMINATOR;
}

export function createCastawayQuest(memory, {
  shoreId,
  homePort,
  character,
  familyMember,
  distanceKm,
  familySurvivedRoll,
  emergencyAid = null
}) {
  return createRescuedTravelerQuest(memory, {
    rescueType: RESCUED_TRAVELER_TYPE_CASTAWAY,
    sourceId: shoreId,
    homePort,
    character,
    familyMember,
    distanceKm,
    familySurvivedRoll,
    emergencyAid
  });
}

export const prepareCastawayHomecoming = prepareRescuedTravelerHomecoming;
export const completeCastawayQuest = completeRescuedTravelerQuest;
export const createCastawayDialogueSession = createRescuedTravelerDialogueSession;
export const markCastawayEmergencyAidReceived = markRescuedTravelerEmergencyAidReceived;
export const acceptCastawayQuest = acceptRescuedTravelerQuest;
export const castawayDialogueView = rescuedTravelerDialogueView;
export const castawayDialogueCharacter = rescuedTravelerDialogueCharacter;
export const selectCastawayDialogueOption = selectRescuedTravelerDialogueOption;

export function validateCastawayQuestMemory(memory) {
  return validateRescuedTravelerQuestMemory(memory, RESCUED_TRAVELER_TYPE_CASTAWAY);
}
