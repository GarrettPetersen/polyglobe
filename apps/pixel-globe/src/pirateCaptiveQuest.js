import {
  RESCUED_TRAVELER_STAGE_ABOARD,
  RESCUED_TRAVELER_STAGE_HOMECOMING,
  RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
  acceptRescuedTravelerQuest,
  activeRescuedTravelerQuest,
  completeRescuedTravelerQuest,
  createRescuedTravelerDialogueSession,
  createRescuedTravelerQuest,
  createRescuedTravelerQuestMemory,
  declineRescuedTravelerQuest,
  migrateRescuedTravelerQuestMemory,
  prepareRescuedTravelerHomecoming,
  rescuedTravelerDialogueCharacter,
  rescuedTravelerDialogueView,
  selectRescuedTravelerDialogueOption,
  validateRescuedTravelerQuestMemory
} from "./rescuedTravelerQuest.js";

export const PIRATE_CAPTIVE_STAGE_ABOARD = RESCUED_TRAVELER_STAGE_ABOARD;
export const PIRATE_CAPTIVE_STAGE_HOMECOMING = RESCUED_TRAVELER_STAGE_HOMECOMING;

export function createPirateCaptiveQuestMemory() {
  return createRescuedTravelerQuestMemory();
}

export function activePirateCaptiveQuest(state) {
  return activeRescuedTravelerQuest(state, "pirateCaptive");
}

export function migratePirateCaptiveQuestMemory(memory) {
  if (!memory) return createPirateCaptiveQuestMemory();
  if (memory.active === null || memory.active?.rescueType === RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE) {
    return migrateRescuedTravelerQuestMemory(memory, RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE);
  }
  const { pirateShipId, ...legacyActive } = memory.active;
  if (typeof pirateShipId !== "string" || pirateShipId.trim() === "") {
    throw new Error("Legacy pirate captive quest is missing its pirate ship id");
  }
  const migrated = {
    ...memory,
    active: {
      ...legacyActive,
      rescueType: RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
      sourceId: pirateShipId,
      emergencyAid: null,
      emergencyAidReceived: false
    }
  };
  return migrateRescuedTravelerQuestMemory(migrated, RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE);
}

export function pirateCaptiveRescueAppears(roll, completedCount = 0) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid pirate captive rescue roll: ${roll}`);
  }
  if (!Number.isInteger(completedCount) || completedCount < 0) {
    throw new Error(`Invalid completed pirate captive quest count: ${completedCount}`);
  }
  return roll < (completedCount === 0 ? 1 / 3 : 1 / 50);
}

export function createPirateCaptiveQuest(memory, {
  pirateShipId,
  homePort,
  character,
  familyMember,
  distanceKm,
  familySurvivedRoll
}) {
  return createRescuedTravelerQuest(memory, {
    rescueType: RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
    sourceId: pirateShipId,
    homePort,
    character,
    familyMember,
    distanceKm,
    familySurvivedRoll
  });
}

export const acceptPirateCaptiveQuest = acceptRescuedTravelerQuest;
export const declinePirateCaptiveQuest = declineRescuedTravelerQuest;
export const preparePirateCaptiveHomecoming = prepareRescuedTravelerHomecoming;
export const completePirateCaptiveQuest = completeRescuedTravelerQuest;
export const createPirateCaptiveDialogueSession = createRescuedTravelerDialogueSession;
export const pirateCaptiveDialogueView = rescuedTravelerDialogueView;
export const pirateCaptiveDialogueCharacter = rescuedTravelerDialogueCharacter;
export const selectPirateCaptiveDialogueOption = selectRescuedTravelerDialogueOption;

export function validatePirateCaptiveQuestMemory(memory) {
  return validateRescuedTravelerQuestMemory(memory, RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE);
}
