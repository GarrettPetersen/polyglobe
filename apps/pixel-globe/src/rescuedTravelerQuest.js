import {
  characterAgeAtMinute,
  characterWithBiography,
  validateCharacterBiography
} from "./characterBiography.js";
import { charactersShareFamilyName } from "./characterNames.js";
import { characterPronouns } from "./characterPronouns.js";
import { validateCharacterSkillIds } from "./characterSkills.js";
import { requireCityId, requireEntityId } from "./entityIds.js";

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

const MINUTES_PER_DAY = 24 * 60;
const RESCUED_TRAVELER_REUNION_FIRST_DELAY_MINUTES = 30 * MINUTES_PER_DAY;
const RESCUED_TRAVELER_REUNION_COOLDOWN_MINUTES = 60 * MINUTES_PER_DAY;
const RESCUED_TRAVELER_REUNION_REPEAT_CHANCE = 0.35;
const RESCUED_TRAVELER_REUNION_ADULT_AGE = 19;

export function createRescuedTravelerQuestMemory() {
  return {
    version: 2,
    active: null,
    completedCount: 0,
    declinedCount: 0,
    formerTravelers: []
  };
}

export function activeRescuedTravelerQuest(state, memoryKey) {
  const memory = state?.memory?.quests?.[memoryKey];
  validateRescuedTravelerQuestMemory(memory);
  return memory.active;
}

export function rescuedTravelerQuestIdentity(memory, rescueType, sourceId) {
  validateRescuedTravelerQuestMemory(memory);
  assertRescueType(rescueType);
  if (typeof sourceId !== "string" || sourceId.trim() === "") {
    throw new Error("Rescued traveler identity requires a source id");
  }
  return `${rescueType}:${sourceId}:${memory.completedCount + memory.declinedCount}`;
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
  const id = rescuedTravelerQuestIdentity(memory, rescueType, sourceId);
  const active = {
    id,
    rescueType,
    sourceId,
    stage: RESCUED_TRAVELER_STAGE_OFFER,
    homePortCityId: homePort.cityId,
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
  if (memory.version !== 1 && memory.version !== 2) {
    throw new Error(`Unsupported rescued traveler quest version: ${memory.version}`);
  }
  const migrated = {
    ...memory,
    version: 2,
    formerTravelers: (memory.formerTravelers || []).map((entry) => {
      const homePort = rescuedTravelerHomePort(entry);
      return {
        ...entry,
        character: rescuedTravelerWithBiography(entry.character, homePort)
      };
    })
  };
  if (memory.active) {
    const active = memory.active;
    const homePort = rescuedTravelerHomePort(active);
    migrated.active = {
      ...active,
      character: rescuedTravelerWithBiography(active.character, homePort),
      familyMember: active.familyMember
        ? rescuedTravelerWithBiography(active.familyMember, homePort)
        : null
    };
  }
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

export function replaceActiveRescuedTravelerIdentity(memory, questId, {
  character,
  familyMember
}) {
  const quest = requiredActiveQuest(memory, questId);
  const homePort = rescuedTravelerHomePort(quest);
  const replacement = rescuedTravelerWithBiography(character, homePort);
  const relative = quest.familySurvived
    ? rescuedTravelerWithBiography(familyMember, homePort)
    : null;
  const candidate = {
    ...quest,
    character: replacement,
    familyMember: relative
  };
  validateRescuedTravelerQuest(candidate);
  quest.character = replacement;
  quest.familyMember = relative;
  return quest;
}

export function completeRescuedTravelerQuest(memory, questId, {
  settledAtHomeMinute = null
} = {}) {
  const quest = requiredActiveQuest(memory, questId);
  if (quest.stage !== RESCUED_TRAVELER_STAGE_HOMECOMING) {
    throw new Error(`Cannot complete rescued traveler quest from stage ${quest.stage}`);
  }
  if (settledAtHomeMinute !== null) {
    if (!quest.familySurvived) {
      throw new Error("A rescued traveler cannot settle at home without surviving family");
    }
    assertMinute(settledAtHomeMinute, "rescued traveler homecoming");
    if (memory.formerTravelers.some((entry) => entry.id === quest.id)) {
      throw new Error(`Rescued traveler was already recorded at home: ${quest.id}`);
    }
    memory.formerTravelers.push({
      id: quest.id,
      rescueType: quest.rescueType,
      character: quest.character,
      homePortCityId: quest.homePortCityId,
      homePortTileId: quest.homePortTileId,
      homePortName: quest.homePortName,
      homePortCountry: quest.homePortCountry,
      settledAtMinute: settledAtHomeMinute,
      greetingCount: 0,
      lastGreetingMinute: null
    });
  }
  memory.active = null;
  memory.completedCount += 1;
  validateRescuedTravelerQuestMemory(memory);
  return quest;
}

export function formerRescuedTravelerCharactersAtPort(memories, cityId) {
  validateFormerTravelerSearch(memories, cityId);
  return memories.flatMap((memory) => memory.formerTravelers)
    .filter((entry) => entry.homePortCityId === cityId)
    .map((entry) => entry.character);
}

export function nextRescuedTravelerPortReunion(memories, {
  cityId,
  currentMinute,
  roll,
  captain,
  variantSeed = 0
}) {
  validateFormerTravelerSearch(memories, cityId);
  assertMinute(currentMinute, "rescued traveler reunion");
  assertUnitRoll(roll, "rescued traveler reunion");
  assertCharacter(captain, "Captain");
  if (!Number.isInteger(variantSeed)) {
    throw new Error(`Invalid rescued traveler reunion variant: ${variantSeed}`);
  }
  const candidates = memories.flatMap((memory) => memory.formerTravelers)
    .filter((entry) => entry.homePortCityId === cityId)
    .filter((entry) => rescuedTravelerReunionIsReady(entry, currentMinute))
    .sort((a, b) => (
      a.greetingCount - b.greetingCount ||
      (a.lastGreetingMinute ?? -1) - (b.lastGreetingMinute ?? -1) ||
      a.id.localeCompare(b.id)
    ));
  const entry = candidates[0] || null;
  if (!entry || (entry.greetingCount > 0 && roll >= RESCUED_TRAVELER_REUNION_REPEAT_CHANCE)) {
    return null;
  }
  const flirtatious = entry.character.sex !== captain.sex &&
    characterAgeAtMinute(entry.character, currentMinute) >= RESCUED_TRAVELER_REUNION_ADULT_AGE &&
    characterAgeAtMinute(captain, currentMinute) >= RESCUED_TRAVELER_REUNION_ADULT_AGE;
  const variants = rescuedTravelerReunionDialogues(entry.rescueType, flirtatious);
  const variantIndex = Math.abs(variantSeed) % variants.length;
  return Object.freeze({
    entryId: entry.id,
    rescueType: entry.rescueType,
    character: entry.character,
    expressionId: variantIndex % 2 === 0 ? "happy" : "pleased",
    message: variants[variantIndex]
  });
}

export function recordRescuedTravelerPortReunion(memory, entryId, currentMinute) {
  validateRescuedTravelerQuestMemory(memory);
  assertMinute(currentMinute, "rescued traveler reunion");
  const entry = memory.formerTravelers.find((candidate) => candidate.id === entryId);
  if (!entry) throw new Error(`Unknown former rescued traveler: ${entryId}`);
  if (!rescuedTravelerReunionIsReady(entry, currentMinute)) {
    throw new Error(`Rescued traveler reunion is still on cooldown: ${entryId}`);
  }
  entry.greetingCount += 1;
  entry.lastGreetingMinute = currentMinute;
  validateRescuedTravelerQuestMemory(memory);
  return entry;
}

export function createRescuedTravelerDialogueSession(quest, {
  phase,
  cityId = null,
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
  if (phase === "homecoming" && cityId !== quest.homePortCityId) {
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
    cityId,
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
  if (memory.version !== 2) throw new Error(`Unsupported rescued traveler quest version: ${memory.version}`);
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
  if (!Array.isArray(memory.formerTravelers)) {
    throw new Error("Rescued traveler quest memory requires former travelers");
  }
  const ids = new Set();
  for (const entry of memory.formerTravelers) {
    validateFormerRescuedTraveler(entry, expectedType);
    if (ids.has(entry.id)) throw new Error(`Duplicate former rescued traveler: ${entry.id}`);
    ids.add(entry.id);
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
        option(`Take ${pronouns.object} aboard`, { type: "accept-rescued-traveler" }),
        option(`Leave ${pronouns.object} at the nearest safe shore`, { type: "decline-rescued-traveler" })
      ]
    };
  }
  if (session.stepIndex === 1) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "overjoyed",
      text: rescueAcceptedText(quest),
      options: [option("Continue", { type: "finish-rescued-traveler-offer" })]
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
      options: [option("Continue", { type: "continue-rescued-traveler-homecoming" })]
    };
  }
  if (session.stepIndex === 1) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "overjoyed",
      text: "I searched every face on the quay in my dreams. You are alive. You are truly alive!",
      options: [option("Continue", { type: "continue-rescued-traveler-homecoming" })]
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
      options: [option("Continue", { type: "continue-rescued-traveler-homecoming" })]
    };
  }
  if (session.stepIndex === 3) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "overjoyed",
      text: "Goodbye, captain. Whatever seas lie ahead, I will never forget the ship that carried me home.",
      options: [option("Farewell", { type: "complete-rescued-traveler-reunion" })]
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
      options: [option("Continue", { type: "continue-rescued-traveler-homecoming" })]
    };
  }
  if (session.stepIndex === 1) {
    return {
      speaker: quest.character.name,
      character: quest.character,
      expressionId: "crying",
      text: "There is nothing for me here now. Captain... may I stay aboard? Your crew is the only family I have left.",
      options: [option("Welcome aboard", { type: "recruit-rescued-traveler" })]
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
  if (quest.homePortCityId !== undefined && quest.homePortCityId !== null) {
    requireEntityId(quest.homePortCityId, "Rescued traveler home port");
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
    identityKey: requireEntityId(character?.id, "Rescued traveler"),
    homePort
  });
}

function rescuedTravelerHomePort(entry) {
  return {
    cityId: entry.homePortCityId,
    tileId: entry.homePortTileId,
    city: entry.homePortName,
    displayCity: entry.homePortName,
    country: entry.homePortCountry
  };
}

function validateFormerTravelerSearch(memories, cityId) {
  if (!Array.isArray(memories) || memories.length === 0) {
    throw new Error("Former rescued traveler search requires quest memories");
  }
  for (const memory of memories) validateRescuedTravelerQuestMemory(memory);
  requireEntityId(cityId, "Former rescued traveler port");
}

function validateFormerRescuedTraveler(entry, expectedType) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("Former rescued traveler must be an object");
  }
  if (typeof entry.id !== "string" || entry.id.trim() === "") {
    throw new Error("Former rescued traveler requires an id");
  }
  assertRescueType(entry.rescueType);
  if (expectedType !== null && entry.rescueType !== expectedType) {
    throw new Error(`Expected ${expectedType} former traveler, got ${entry.rescueType}`);
  }
  assertCharacter(entry.character, "Former rescued traveler");
  if (!Number.isInteger(entry.homePortTileId) || entry.homePortTileId < 0) {
    throw new Error(`Invalid former rescued traveler home port: ${entry.homePortTileId}`);
  }
  if (entry.homePortCityId !== undefined && entry.homePortCityId !== null) {
    requireEntityId(entry.homePortCityId, "Former rescued traveler home port");
  }
  for (const [label, value] of [
    ["home port name", entry.homePortName],
    ["home port country", entry.homePortCountry]
  ]) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Former rescued traveler requires a ${label}`);
    }
  }
  assertMinute(entry.settledAtMinute, "former rescued traveler settlement");
  if (!Number.isInteger(entry.greetingCount) || entry.greetingCount < 0) {
    throw new Error(`Invalid former rescued traveler greeting count: ${entry.greetingCount}`);
  }
  if (entry.lastGreetingMinute !== null) {
    assertMinute(entry.lastGreetingMinute, "former rescued traveler greeting");
    if (entry.lastGreetingMinute < entry.settledAtMinute || entry.greetingCount === 0) {
      throw new Error(`Invalid former rescued traveler greeting history: ${entry.id}`);
    }
  } else if (entry.greetingCount !== 0) {
    throw new Error(`Former rescued traveler has greetings without a date: ${entry.id}`);
  }
}

function rescuedTravelerReunionIsReady(entry, currentMinute) {
  const previousMinute = entry.lastGreetingMinute ?? entry.settledAtMinute;
  const cooldown = entry.lastGreetingMinute === null
    ? RESCUED_TRAVELER_REUNION_FIRST_DELAY_MINUTES
    : RESCUED_TRAVELER_REUNION_COOLDOWN_MINUTES;
  return currentMinute - previousMinute >= cooldown;
}

function rescuedTravelerReunionDialogues(rescueType, flirtatious) {
  const variants = rescueType === RESCUED_TRAVELER_TYPE_CASTAWAY
    ? [
        "Captain! My family marks the day you found me on that lonely shore every year. Come to supper.",
        "Whenever a storm rattles the shutters, someone tells the story of the captain who brought me home. Tonight you may correct them over dinner.",
        "You pulled me from the world's loneliest scrap of coast. My family insists that earns you supper whenever you make port.",
        "I have become terrible at telling my rescue story, captain. Each version gives your ship another mast. Come hear the latest over supper."
      ]
    : [
        "Captain! My family still drinks to the ship that carried me out of pirate hands. Tonight, the rescued traveler is buying supper.",
        "The neighbors ask what it was like to be locked below a pirate deck. I tell them the better story begins when your sail appeared. Come to dinner.",
        "You brought me home from a pirate deck and asked for nothing but a fair wind. My family means to overpay you in food.",
        "I still wake grateful that the next footsteps above my cell were yours. Let us improve the memory with a loud supper."
      ];
  if (!flirtatious) return variants;
  return [
    ...variants,
    "My family has invited you to supper again. Perhaps they needed little encouragement; supper was not my only reason.",
    "You should dine with us tonight, captain. Afterward, perhaps I can thank you somewhere my family cannot interrupt."
  ];
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label} minute: ${value}`);
}

function assertUnitRoll(value, label) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`Invalid ${label} roll: ${value}`);
  }
}

function assertPort(port, label) {
  if (!port || typeof port !== "object") throw new Error(`${label} must be a city`);
  requireCityId(port, label);
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

function option(label, action) {
  if (!action || typeof action.type !== "string" || action.type.length === 0) {
    throw new Error("Rescued traveler dialogue requires an explicit action");
  }
  return Object.freeze({ label, action: Object.freeze({ ...action }) });
}
