import { characterWithBiography, validateCharacterBiography } from "./characterBiography.js";
import { charactersShareFamilyName } from "./characterNames.js";
import { characterPronouns } from "./characterPronouns.js";
import { validateCharacterSkillIds } from "./characterSkills.js";

export const RESCUED_TRAVELER_STAGE_OFFER = "offer";
export const RESCUED_TRAVELER_STAGE_ABOARD = "aboard";
export const RESCUED_TRAVELER_STAGE_HOMECOMING = "homecoming";

export const RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE = "pirate-captive";
export const RESCUED_TRAVELER_TYPE_CASTAWAY = "castaway";

const RESCUED_TRAVELER_STAGES = new Set([
  RESCUED_TRAVELER_STAGE_OFFER,
  RESCUED_TRAVELER_STAGE_ABOARD,
  RESCUED_TRAVELER_STAGE_HOMECOMING
]);

const RESCUED_TRAVELER_TYPES = new Set([
  RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
  RESCUED_TRAVELER_TYPE_CASTAWAY
]);

export function createRescuedTravelerQuestMemory() {
  return {
    version: 1,
    active: null,
    completedCount: 0,
    declinedCount: 0
  };
}

export function activeRescuedTravelerQuest(state, memoryKey) {
  const memory = state?.memory?.quests?.[memoryKey];
  validateRescuedTravelerQuestMemory(memory);
  return memory.active;
}

export function createRescuedTravelerQuest(memory, {
  rescueType,
  sourceId,
  homePort,
  character,
  familyMember,
  distanceKm,
  familySurvivedRoll,
  emergencyAid = null
}) {
  validateRescuedTravelerQuestMemory(memory);
  if (memory.active) return null;
  assertRescueType(rescueType);
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    throw new Error("Rescued traveler quest requires a source id");
  }
  assertPort(homePort, "Rescued traveler home port");
  const traveler = rescuedTravelerWithBiography(character, homePort);
  assertCharacter(traveler, "Rescued traveler");
  if (!Array.isArray(traveler.expressions) || traveler.expressions.length < 2) {
    throw new Error(`${traveler.name} requires an expressive portrait for a rescued traveler quest`);
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error(`Invalid rescued traveler voyage distance: ${distanceKm}`);
  }
  if (!Number.isFinite(familySurvivedRoll) || familySurvivedRoll < 0 || familySurvivedRoll >= 1) {
    throw new Error(`Invalid rescued traveler family survival roll: ${familySurvivedRoll}`);
  }
  const familySurvived = familySurvivedRoll < 0.5;
  const relative = familySurvived ? rescuedTravelerWithBiography(familyMember, homePort) : null;
  if (familySurvived) {
    assertCharacter(relative, "Rescued traveler family member");
    if (!charactersShareFamilyName(relative, traveler)) {
      throw new Error("Rescued traveler and family member must share a family name");
    }
  } else if (familyMember !== null) {
    throw new Error("Lost rescued traveler family cannot have a homecoming character");
  }
  const normalizedAid = validateEmergencyAid(emergencyAid);
  if (rescueType !== RESCUED_TRAVELER_TYPE_CASTAWAY && normalizedAid !== null) {
    throw new Error(`${rescueType} cannot provide castaway shore aid`);
  }
  const id = `${rescueType}:${sourceId}:${memory.completedCount + memory.declinedCount}`;
  const active = {
    id,
    rescueType,
    sourceId,
    stage: RESCUED_TRAVELER_STAGE_OFFER,
    homePortTileId: homePort.tileId,
    homePortName: homePort.displayCity || homePort.city,
    homePortCountry: homePort.country,
    distanceKm: Math.round(distanceKm),
    character: traveler,
    familySurvived,
    familyMember: relative,
    emergencyAid: normalizedAid,
    emergencyAidReceived: false,
    rewardDoubloons: roundedReward(distanceKm),
    rewardItemId: null,
    rewardItemLabel: null
  };
  validateRescuedTravelerQuest(active);
  memory.active = active;
  return active;
}

export function migrateRescuedTravelerQuestMemory(memory, expectedType = null) {
  if (!memory) return createRescuedTravelerQuestMemory();
  if (!memory.active) return validateRescuedTravelerQuestMemory(memory, expectedType);
  const active = memory.active;
  const homePort = {
    tileId: active.homePortTileId,
    city: active.homePortName,
    displayCity: active.homePortName,
    country: active.homePortCountry
  };
  const migrated = {
    ...memory,
    active: {
      ...active,
      character: rescuedTravelerWithBiography(active.character, homePort),
      familyMember: active.familyMember
        ? rescuedTravelerWithBiography(active.familyMember, homePort)
        : null
    }
  };
  return validateRescuedTravelerQuestMemory(migrated, expectedType);
}

export function acceptRescuedTravelerQuest(memory, questId) {
  const quest = requiredActiveQuest(memory, questId);
  if (quest.stage !== RESCUED_TRAVELER_STAGE_OFFER) {
    throw new Error(`Cannot accept rescued traveler quest from stage ${quest.stage}`);
  }
  quest.stage = RESCUED_TRAVELER_STAGE_ABOARD;
  return quest;
}

export function markRescuedTravelerEmergencyAidReceived(memory, questId) {
  const quest = requiredActiveQuest(memory, questId);
  if (quest.stage !== RESCUED_TRAVELER_STAGE_ABOARD) {
    throw new Error(`Cannot receive rescued traveler shore aid from stage ${quest.stage}`);
  }
  if (!quest.emergencyAid) throw new Error("Rescued traveler has no shore aid to provide");
  if (quest.emergencyAidReceived) throw new Error("Rescued traveler shore aid was already received");
  quest.emergencyAidReceived = true;
  return quest;
}

export function declineRescuedTravelerQuest(memory, questId) {
  const quest = requiredActiveQuest(memory, questId);
  if (quest.stage !== RESCUED_TRAVELER_STAGE_OFFER) {
    throw new Error(`Cannot decline rescued traveler quest from stage ${quest.stage}`);
  }
  memory.active = null;
  memory.declinedCount += 1;
  return quest;
}

export function prepareRescuedTravelerHomecoming(memory, questId, rewardItem) {
  const quest = requiredActiveQuest(memory, questId);
  const revisingPreparedReward = quest.stage === RESCUED_TRAVELER_STAGE_HOMECOMING &&
    quest.familySurvived;
  if (quest.stage !== RESCUED_TRAVELER_STAGE_ABOARD && !revisingPreparedReward) {
    throw new Error(`Cannot prepare rescued traveler homecoming from stage ${quest.stage}`);
  }
  if (quest.familySurvived) {
    if (rewardItem !== null && (
      typeof rewardItem?.id !== "string" || typeof rewardItem?.label !== "string"
    )) {
      throw new Error("Rescued traveler reunion reward item must be an item or null");
    }
    quest.rewardItemId = rewardItem?.id || null;
    quest.rewardItemLabel = rewardItem?.label || null;
  } else if (rewardItem !== null) {
    throw new Error("Rescued traveler lost-family homecoming cannot prepare a reward item");
  }
  if (!revisingPreparedReward) quest.stage = RESCUED_TRAVELER_STAGE_HOMECOMING;
  validateRescuedTravelerQuest(quest);
  return quest;
}

export function completeRescuedTravelerQuest(memory, questId) {
  const quest = requiredActiveQuest(memory, questId);
  if (quest.stage !== RESCUED_TRAVELER_STAGE_HOMECOMING) {
    throw new Error(`Cannot complete rescued traveler quest from stage ${quest.stage}`);
  }
  memory.active = null;
  memory.completedCount += 1;
  return quest;
}

export function createRescuedTravelerDialogueSession(quest, {
  phase,
  cityTileId = null,
  admittedToPort = false,
  continueToPortOnClose = false,
  nextPortNodeId = "greeting",
  surrenderPrize = null
} = {}) {
  validateRescuedTravelerQuest(quest);
  if (phase !== "offer" && phase !== "homecoming") {
    throw new Error(`Unknown rescued traveler dialogue phase: ${phase}`);
  }
  if (phase === "offer" && quest.stage !== RESCUED_TRAVELER_STAGE_OFFER) {
    throw new Error(`Rescued traveler offer dialogue requires offer stage, got ${quest.stage}`);
  }
  if (phase === "homecoming" && quest.stage !== RESCUED_TRAVELER_STAGE_HOMECOMING) {
    throw new Error(`Rescued traveler homecoming dialogue requires homecoming stage, got ${quest.stage}`);
  }
  if (phase === "homecoming" && cityTileId !== quest.homePortTileId) {
    throw new Error("Rescued traveler homecoming dialogue is at the wrong port");
  }
  if (surrenderPrize !== null && (
    typeof surrenderPrize !== "object" ||
    typeof surrenderPrize.npcShipId !== "string" ||
    !surrenderPrize.lootSummary || typeof surrenderPrize.lootSummary !== "object"
  )) {
    throw new Error("Rescued traveler surrender follow-up is malformed");
  }
  if (quest.rescueType !== RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE && surrenderPrize !== null) {
    throw new Error("Only a pirate captive rescue can postpone a surrendered ship decision");
  }
  return {
    kind: "rescued-traveler",
    rescueType: quest.rescueType,
    questId: quest.id,
    phase,
    stepIndex: 0,
    selectedIndex: 0,
    feedback: null,
    cityTileId,
    admittedToPort,
    continueToPortOnClose,
    nextPortNodeId,
    surrenderPrize
  };
}

export function rescuedTravelerDialogueView(session, quest) {
  assertDialogueSession(session, quest);
  return session.phase === "offer"
    ? rescuedTravelerOfferView(session, quest)
    : rescuedTravelerHomecomingView(session, quest);
}

export function selectRescuedTravelerDialogueOption(session, quest, memory, optionIndex) {
  const view = rescuedTravelerDialogueView(session, quest);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid rescued traveler dialogue option index: ${optionIndex}`);
  const action = selected.action;
  if (action.type === "accept-rescued-traveler") {
    acceptRescuedTravelerQuest(memory, quest.id);
    session.stepIndex = 1;
    session.selectedIndex = 0;
    return { closed: false, action };
  }
  if (action.type === "decline-rescued-traveler") {
    declineRescuedTravelerQuest(memory, quest.id);
    return { closed: true, action };
  }
  if (action.type === "finish-rescued-traveler-offer") {
    return { closed: true, action };
  }
  if (action.type === "continue-rescued-traveler-homecoming") {
    session.stepIndex += 1;
    session.selectedIndex = 0;
    return { closed: false, action };
  }
  if (action.type === "complete-rescued-traveler-reunion" ||
      action.type === "recruit-rescued-traveler") {
    return { closed: true, action };
  }
  throw new Error(`Unknown rescued traveler dialogue action: ${action.type}`);
}

export function rescuedTravelerDialogueCharacter(session, quest) {
  return rescuedTravelerDialogueView(session, quest).character;
}

export function validateRescuedTravelerQuestMemory(memory, expectedType = null) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Rescued traveler quest memory must be an object");
  }
  if (memory.version !== 1) throw new Error(`Unsupported rescued traveler quest version: ${memory.version}`);
  if (!Number.isInteger(memory.completedCount) || memory.completedCount < 0) {
    throw new Error(`Invalid completed rescued traveler quest count: ${memory.completedCount}`);
  }
  if (!Number.isInteger(memory.declinedCount) || memory.declinedCount < 0) {
    throw new Error(`Invalid declined rescued traveler quest count: ${memory.declinedCount}`);
  }
  if (memory.active !== null) {
    validateRescuedTravelerQuest(memory.active);
    if (expectedType !== null && memory.active.rescueType !== expectedType) {
      throw new Error(`Expected ${expectedType} quest memory, got ${memory.active.rescueType}`);
    }
  }
  return memory;
}

export function rescuedTravelerLabel(quest) {
  validateRescuedTravelerQuest(quest);
  return quest.rescueType === RESCUED_TRAVELER_TYPE_CASTAWAY ? "CASTAWAY" : "PIRATE CAPTIVE";
}

function rescuedTravelerOfferView(session, quest) {
  if (session.stepIndex === 0) {
    const pronouns = characterPronouns(quest.character);
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "crying",
      text: rescueOfferText(quest),
      options: [
        option(`Take ${pronouns.object} aboard`, "accept-rescued-traveler"),
        option(`Leave ${pronouns.object} at the nearest safe shore`, "decline-rescued-traveler")
      ]
    };
  }
  if (session.stepIndex === 1) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "overjoyed",
      text: rescueAcceptedText(quest),
      options: [option("Continue", "finish-rescued-traveler-offer")]
    };
  }
  throw new Error(`Invalid rescued traveler offer dialogue step: ${session.stepIndex}`);
}

function rescueOfferText(quest) {
  if (quest.rescueType === RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE) {
    return `Please, captain... the pirates kept me locked below. My family escaped toward ${quest.homePortName}. Take me aboard. I have to know whether they made it home.`;
  }
  return `A storm threw me overboard, and I woke among wreckage on this beach. My family may have reached ${quest.homePortName}. Please take me there.`;
}

function rescueAcceptedText(quest) {
  const base = `You will? Thank you! Please set a course for ${quest.homePortName}. I will earn my keep until we arrive.`;
  if (!quest.emergencyAid) return base;
  if (quest.emergencyAid.water && quest.emergencyAid.food) {
    return `${base} Before we leave, I can show your crew a freshwater spring and where I found edible roots and shellfish.`;
  }
  if (quest.emergencyAid.water) {
    return `${base} Before we leave, I can show your crew a freshwater spring hidden above the beach.`;
  }
  return `${base} Before we leave, I can show your crew where I found edible roots and shellfish.`;
}

function rescuedTravelerHomecomingView(session, quest) {
  return quest.familySurvived
    ? rescuedTravelerReunionView(session, quest)
    : rescuedTravelerLostFamilyView(session, quest);
}

function rescuedTravelerReunionView(session, quest) {
  if (session.stepIndex === 0) {
    return {
      speaker: quest.familyMember.name,
      character: quest.familyMember,
      expressionId: "overjoyed",
      text: `${quest.character.givenName}, we thought we'd never see you again!`,
      options: [option("Continue", "continue-rescued-traveler-homecoming")]
    };
  }
  if (session.stepIndex === 1) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "overjoyed",
      text: "I searched every face on the quay in my dreams. You are alive. You are truly alive!",
      options: [option("Continue", "continue-rescued-traveler-homecoming")]
    };
  }
  if (session.stepIndex === 2) {
    return {
      speaker: quest.familyMember.name,
      character: quest.familyMember,
      expressionId: "happy",
      text: quest.rewardItemLabel
        ? `Captain, you restored our family. Please accept ${quest.rewardDoubloons} doubloons and ${quest.rewardItemLabel} with our everlasting gratitude.`
        : `Captain, you restored our family. Please accept ${quest.rewardDoubloons} doubloons with our everlasting gratitude.`,
      options: [option("Continue", "continue-rescued-traveler-homecoming")]
    };
  }
  if (session.stepIndex === 3) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "overjoyed",
      text: "Goodbye, captain. Whatever seas lie ahead, I will never forget the ship that carried me home.",
      options: [option("Farewell", "complete-rescued-traveler-reunion")]
    };
  }
  throw new Error(`Invalid rescued traveler reunion dialogue step: ${session.stepIndex}`);
}

function rescuedTravelerLostFamilyView(session, quest) {
  if (session.stepIndex === 0) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "crying",
      text: `I asked at every quay and chapel in ${quest.homePortName}. Their ship never arrived. They were lost at sea.`,
      options: [option("Continue", "continue-rescued-traveler-homecoming")]
    };
  }
  if (session.stepIndex === 1) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "crying",
      text: "There is nothing for me here now. Captain... may I stay aboard? Your crew is the only family I have left.",
      options: [option("Welcome aboard", "recruit-rescued-traveler")]
    };
  }
  throw new Error(`Invalid rescued traveler lost-family dialogue step: ${session.stepIndex}`);
}

function requiredActiveQuest(memory, questId) {
  validateRescuedTravelerQuestMemory(memory);
  const quest = memory.active;
  if (!quest || quest.id !== questId) throw new Error(`Rescued traveler quest is no longer active: ${questId}`);
  return quest;
}

function validateRescuedTravelerQuest(quest) {
  if (!quest || typeof quest !== "object" || Array.isArray(quest)) {
    throw new Error("Rescued traveler quest must be an object");
  }
  assertRescueType(quest.rescueType);
  if (typeof quest.id !== "string" || quest.id.trim() === "") throw new Error("Rescued traveler quest needs an id");
  if (typeof quest.sourceId !== "string" || quest.sourceId.trim() === "") {
    throw new Error("Rescued traveler quest needs a source id");
  }
  if (!RESCUED_TRAVELER_STAGES.has(quest.stage)) {
    throw new Error(`Invalid rescued traveler stage: ${quest.stage}`);
  }
  if (!Number.isInteger(quest.homePortTileId) || quest.homePortTileId < 0) {
    throw new Error(`Invalid rescued traveler home port tile: ${quest.homePortTileId}`);
  }
  for (const [label, value] of [
    ["home port name", quest.homePortName],
    ["home port country", quest.homePortCountry]
  ]) {
    if (typeof value !== "string" || value.trim() === "") throw new Error(`Rescued traveler needs a ${label}`);
  }
  if (!Number.isFinite(quest.distanceKm) || quest.distanceKm < 0) {
    throw new Error(`Invalid rescued traveler distance: ${quest.distanceKm}`);
  }
  if (!Number.isInteger(quest.rewardDoubloons) || quest.rewardDoubloons <= 0) {
    throw new Error(`Invalid rescued traveler reward: ${quest.rewardDoubloons}`);
  }
  assertCharacter(quest.character, "Rescued traveler");
  if (typeof quest.familySurvived !== "boolean") throw new Error("Rescued traveler outcome must be fixed");
  if (quest.familySurvived) {
    assertCharacter(quest.familyMember, "Rescued traveler family member");
    if (!charactersShareFamilyName(quest.familyMember, quest.character)) {
      throw new Error("Rescued traveler family names do not match");
    }
  } else if (quest.familyMember !== null) {
    throw new Error("Lost rescued traveler family cannot have a family member");
  }
  const aid = validateEmergencyAid(quest.emergencyAid);
  if (quest.rescueType !== RESCUED_TRAVELER_TYPE_CASTAWAY && aid !== null) {
    throw new Error(`${quest.rescueType} cannot provide castaway shore aid`);
  }
  if (typeof quest.emergencyAidReceived !== "boolean") {
    throw new Error("Rescued traveler emergency aid state must be boolean");
  }
  if (quest.emergencyAidReceived && aid === null) {
    throw new Error("Rescued traveler received emergency aid that was never offered");
  }
  if (quest.stage === RESCUED_TRAVELER_STAGE_HOMECOMING && quest.familySurvived) {
    const hasRewardItem = quest.rewardItemId !== null || quest.rewardItemLabel !== null;
    if (hasRewardItem && (
      typeof quest.rewardItemId !== "string" || quest.rewardItemId === "" ||
      typeof quest.rewardItemLabel !== "string" || quest.rewardItemLabel === ""
    )) {
      throw new Error("Rescued traveler reunion reward item is incomplete");
    }
  } else if ((quest.rewardItemId !== null || quest.rewardItemLabel !== null) &&
      quest.stage !== RESCUED_TRAVELER_STAGE_HOMECOMING) {
    throw new Error("Rescued traveler reward item was prepared before homecoming");
  }
  return quest;
}

function validateEmergencyAid(aid) {
  if (aid === null) return null;
  if (!aid || typeof aid !== "object" || Array.isArray(aid)) {
    throw new Error("Castaway emergency aid must be an object or null");
  }
  if (typeof aid.water !== "boolean" || typeof aid.food !== "boolean") {
    throw new Error("Castaway emergency aid requires water and food flags");
  }
  if (!aid.water && !aid.food) throw new Error("Castaway emergency aid must provide food or water");
  return Object.freeze({ water: aid.water, food: aid.food });
}

function assertCharacter(character, label) {
  validateCharacterBiography(character);
  if (typeof character.name !== "string" || character.name.trim() === "") throw new Error(`${label} needs a name`);
  if (typeof character.givenName !== "string" || character.givenName.trim() === "") {
    throw new Error(`${label} needs a given name`);
  }
  if (typeof character.familyName !== "string" || character.familyName.trim() === "") {
    throw new Error(`${label} needs a family name`);
  }
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error(`${label} needs portrait expressions`);
  }
  validateCharacterSkillIds(character.skillIds);
}

function rescuedTravelerWithBiography(character, homePort) {
  return characterWithBiography(character, {
    identityKey: character?.id || character?.name,
    homePort
  });
}

function assertPort(port, label) {
  if (!port || typeof port !== "object") throw new Error(`${label} must be a city`);
  if (!Number.isInteger(port.tileId) || port.tileId < 0) throw new Error(`${label} needs a tile id`);
  if (typeof (port.displayCity || port.city) !== "string" || !(port.displayCity || port.city).trim()) {
    throw new Error(`${label} needs a city name`);
  }
  if (typeof port.country !== "string" || port.country.trim() === "") throw new Error(`${label} needs a country`);
}

function assertDialogueSession(session, quest) {
  if (!session || session.kind !== "rescued-traveler") throw new Error("Missing rescued traveler dialogue session");
  validateRescuedTravelerQuest(quest);
  if (session.rescueType !== quest.rescueType) throw new Error("Rescued traveler dialogue type does not match quest");
  if (session.questId !== quest.id) throw new Error("Rescued traveler dialogue quest does not match active quest");
  if (!Number.isInteger(session.stepIndex) || session.stepIndex < 0) {
    throw new Error(`Invalid rescued traveler dialogue step: ${session.stepIndex}`);
  }
  if (!Number.isInteger(session.selectedIndex) || session.selectedIndex < 0) {
    throw new Error(`Invalid rescued traveler dialogue selection: ${session.selectedIndex}`);
  }
}

function assertRescueType(rescueType) {
  if (!RESCUED_TRAVELER_TYPES.has(rescueType)) throw new Error(`Unknown rescued traveler type: ${rescueType}`);
}

function roundedReward(distanceKm) {
  const raw = 500 + Math.min(1000, distanceKm * 0.22);
  return Math.round(raw / 50) * 50;
}

function option(label, type) {
  return Object.freeze({ label, action: Object.freeze({ type }) });
}
