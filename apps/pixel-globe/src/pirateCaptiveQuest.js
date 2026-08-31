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
  rescuedTravelerDialogueView,
  selectRescuedTravelerDialogueOption,
  validateRescuedTravelerQuestMemory
} from "./rescuedTravelerQuest.js";
import { questJourneyHalfwayReached } from "./questJourneyDialogue.js";
import { characterPronouns } from "./characterPronouns.js";
import { requireCityId, requireEntityId } from "./entityIds.js";
import { migrateLegacyPortCityId } from "./legacyPortIdentity.js";

export const PIRATE_CAPTIVE_STAGE_ABOARD = RESCUED_TRAVELER_STAGE_ABOARD;
export const PIRATE_CAPTIVE_STAGE_HOMECOMING = RESCUED_TRAVELER_STAGE_HOMECOMING;

export const PIRATE_CAPTIVE_KIND_REAL = "real";
export const PIRATE_CAPTIVE_KIND_FAKE_REFORMED = "fake-reformed";
export const PIRATE_CAPTIVE_KIND_FAKE_EVIL = "fake-evil";

export const PIRATE_CAPTIVE_STATE_CONCEALED = "concealed";
export const PIRATE_CAPTIVE_STATE_WARNED = "warned";
export const PIRATE_CAPTIVE_STATE_IGNORED = "ignored";
export const PIRATE_CAPTIVE_STATE_REVEALED = "revealed";
export const PIRATE_CAPTIVE_STATE_MERCY = "mercy";
export const PIRATE_CAPTIVE_STATE_DETAINED = "detained";
export const PIRATE_CAPTIVE_STATE_ESCAPED = "escaped";

export const PIRATE_CAPTIVE_EVENT_WARNING = "warning";
export const PIRATE_CAPTIVE_EVENT_ESCAPE = "escape";

export const PIRATE_CAPTIVE_REVENGE_ENCOUNTER_KIND = "escaped-fake-captive";
export const PIRATE_CAPTIVE_REVENGE_CHALLENGE =
  "Remember me, captain? Thank you for the passage. I have brought a galleon to return the favor.";
export const PIRATE_CAPTIVE_REVENGE_DELAY_MINUTES = 2 * 24 * 60;
export const PIRATE_CAPTIVE_ESCAPE_CHECK_INTERVAL_MINUTES = 24 * 60;
export const PIRATE_CAPTIVE_ESCAPE_CHANCE_PER_CHECK = 0.006;

export function pirateCaptiveWarningMessage(character) {
  if (!character || typeof character.givenName !== "string" || character.givenName.trim() === "") {
    throw new Error("Pirate captive warning requires a named character");
  }
  const { subject } = characterPronouns(character);
  if (subject === "he") {
    return `Captain, ${character.givenName} knows a pirate's habits too well. I do not think he was ever a captive.`;
  }
  if (subject === "she") {
    return `Captain, ${character.givenName} knows a pirate's habits too well. I do not think she was ever a captive.`;
  }
  throw new Error(`Unsupported pirate captive pronoun: ${subject}`);
}

export function pirateCaptiveGenderedText(character, textId, destinationName = null) {
  const { subject } = characterPronouns(character);
  const male = subject === "he";
  if (!male && subject !== "she") throw new Error(`Unsupported pirate captive pronoun: ${subject}`);
  if (["bind-hands", "tie-hands"].includes(textId) && (
    typeof destinationName !== "string" || destinationName.trim() === ""
  )) {
    throw new Error(`Pirate captive ${textId} text requires a destination`);
  }
  switch (textId) {
    case "confront": return male ? "Confront him" : "Confront her";
    case "take-home": return male ? "Take him home" : "Take her home";
    case "turn-in": return male ? "Turn him in" : "Turn her in";
    case "bind-hands": return male
      ? `Bind his hands. The authorities in ${destinationName} have a warrant waiting.`
      : `Bind her hands. The authorities in ${destinationName} have a warrant waiting.`;
    case "tie-hands": return male
      ? `Tie him properly this time. We sail for the authorities in ${destinationName}.`
      : `Tie her properly this time. We sail for the authorities in ${destinationName}.`;
    default: throw new Error(`Unknown pirate captive gendered text: ${textId}`);
  }
}

export function pirateCaptiveRecaptureLine(quest) {
  validatePirateCaptiveQuest(quest);
  if (quest.captiveKind !== PIRATE_CAPTIVE_KIND_FAKE_EVIL || quest.deception.escapeCount < 1) {
    throw new Error("Pirate captive recapture line requires an escaped evil captive");
  }
  return quest.deception.escapeCount === 1
    ? "You again, captain? I should have stolen a faster rowboat."
    : "Again? I am beginning to take this personally.";
}

export function pirateCaptiveAuthorityDefianceLine(quest) {
  validatePirateCaptiveQuest(quest);
  if (quest.captiveKind !== PIRATE_CAPTIVE_KIND_FAKE_EVIL) {
    throw new Error("Pirate captive defiance line requires an evil captive");
  }
  return quest.deception.escapeCount === 0
    ? "A warrant is only paper. I shall deny every word on it."
    : "You caught me; the rest is hearsay. I shall deny it under oath.";
}

const PIRATE_CAPTIVE_KINDS = new Set([
  PIRATE_CAPTIVE_KIND_REAL,
  PIRATE_CAPTIVE_KIND_FAKE_REFORMED,
  PIRATE_CAPTIVE_KIND_FAKE_EVIL
]);
const PIRATE_CAPTIVE_STATES = new Set([
  PIRATE_CAPTIVE_STATE_CONCEALED,
  PIRATE_CAPTIVE_STATE_WARNED,
  PIRATE_CAPTIVE_STATE_IGNORED,
  PIRATE_CAPTIVE_STATE_REVEALED,
  PIRATE_CAPTIVE_STATE_MERCY,
  PIRATE_CAPTIVE_STATE_DETAINED,
  PIRATE_CAPTIVE_STATE_ESCAPED
]);

export function createPirateCaptiveQuestMemory() {
  return createRescuedTravelerQuestMemory();
}

export function activePirateCaptiveQuest(state) {
  const quest = activeRescuedTravelerQuest(state, "pirateCaptive");
  if (quest) validatePirateCaptiveQuest(quest);
  return quest;
}

export function migratePirateCaptiveQuestMemory(memory, {
  legacyCityIdForPortReference = null
} = {}) {
  if (!memory) return createPirateCaptiveQuestMemory();
  let rescuedMemory;
  if (memory.active === null || memory.active?.rescueType === RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE) {
    rescuedMemory = migrateRescuedTravelerQuestMemory(memory, {
      expectedType: RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
      legacyCityIdForPortReference
    });
  } else {
    const { pirateShipId, ...legacyActive } = memory.active;
    if (typeof pirateShipId !== "string" || pirateShipId.trim() === "") {
      throw new Error("Legacy pirate captive quest is missing its pirate ship id");
    }
    rescuedMemory = migrateRescuedTravelerQuestMemory({
      ...memory,
      active: {
        ...legacyActive,
        rescueType: RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
        sourceId: pirateShipId,
        emergencyAid: null,
        emergencyAidReceived: false
      }
    }, {
      expectedType: RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
      legacyCityIdForPortReference
    });
  }
  if (!rescuedMemory.active) return rescuedMemory;
  const active = rescuedMemory.active;
  let deception = null;
  if (active.deception) {
    deception = { halfwayTileId: null, escapeCount: 0, ...active.deception };
    deception.wantedPortCityId = migrateLegacyPortCityId(deception.wantedPortCityId, {
      legacyCityIdForPortReference,
      reference: {
        tileId: deception.wantedPortTileId,
        name: deception.wantedPortName,
        country: deception.wantedPortCountry
      },
      diagnosticScope: "Pirate captive wanted port"
    });
    const hasEscapeOrigin = (
      deception.escapeOriginPortCityId !== undefined &&
      deception.escapeOriginPortCityId !== null
    ) || Number.isInteger(deception.escapeOriginPortTileId);
    deception.escapeOriginPortCityId = hasEscapeOrigin
      ? migrateLegacyPortCityId(deception.escapeOriginPortCityId, {
          legacyCityIdForPortReference,
          reference: { tileId: deception.escapeOriginPortTileId },
          diagnosticScope: "Pirate captive escape origin"
        })
      : null;
  }
  rescuedMemory.active = {
    ...active,
    captiveKind: active.captiveKind || PIRATE_CAPTIVE_KIND_REAL,
    deception
  };
  validatePirateCaptiveQuest(rescuedMemory.active);
  return rescuedMemory;
}

export function pirateCaptiveRescueAppears(roll) {
  assertUnitRoll(roll, "pirate captive rescue");
  return roll < 1 / 3;
}

export function pirateCaptiveKindForRoll(roll) {
  assertUnitRoll(roll, "pirate captive identity");
  if (roll < 0.15) return PIRATE_CAPTIVE_KIND_FAKE_EVIL;
  if (roll < 0.3) return PIRATE_CAPTIVE_KIND_FAKE_REFORMED;
  return PIRATE_CAPTIVE_KIND_REAL;
}

export function createPirateCaptiveQuest(memory, {
  pirateShipId,
  sourceTileId,
  homePort,
  wantedPort = null,
  character,
  familyMember,
  distanceKm,
  familySurvivedRoll,
  captiveKindRoll = 0.9
}) {
  const captiveKind = pirateCaptiveKindForRoll(captiveKindRoll);
  if (!Number.isInteger(sourceTileId) || sourceTileId < 0) {
    throw new Error(`Pirate captive quest requires a source tile: ${sourceTileId}`);
  }
  if (captiveKind !== PIRATE_CAPTIVE_KIND_REAL) assertWantedPort(wantedPort);
  const quest = createRescuedTravelerQuest(memory, {
    rescueType: RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
    sourceId: pirateShipId,
    homePort,
    character,
    familyMember,
    distanceKm,
    familySurvivedRoll
  });
  if (!quest) return null;
  quest.captiveKind = captiveKind;
  quest.deception = captiveKind === PIRATE_CAPTIVE_KIND_REAL ? null : {
    state: PIRATE_CAPTIVE_STATE_CONCEALED,
    sourceTileId,
    wantedPortCityId: requireCityId(wantedPort, "Pirate captive wanted port"),
    wantedPortTileId: wantedPort.tileId,
    wantedPortName: wantedPort.displayCity || wantedPort.city,
    wantedPortCountry: wantedPort.country,
    wantedFactionId: wantedPort.factionId,
    halfwayTileId: null,
    warningWitnessId: null,
    confrontationWeaponItemId: null,
    stolenPossession: null,
    escapeCount: 0,
    escapedAtMinute: null,
    escapeOriginPortCityId: null,
    escapeOriginPortTileId: null,
    revengeShipId: null,
    revengeSpawnMinute: null,
    revengeSpawned: false,
    revengeDefeated: false,
    nextEscapeCheckMinute: null
  };
  validatePirateCaptiveQuest(quest);
  return quest;
}

export const acceptPirateCaptiveQuest = acceptRescuedTravelerQuest;
export const declinePirateCaptiveQuest = declineRescuedTravelerQuest;
export const preparePirateCaptiveHomecoming = prepareRescuedTravelerHomecoming;
export const completePirateCaptiveQuest = completeRescuedTravelerQuest;

export function abandonEscapedPirateCaptiveQuest(memory, questId) {
  const quest = requiredPirateQuest(memory, questId);
  if (quest.deception?.state !== PIRATE_CAPTIVE_STATE_ESCAPED ||
      quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_EVIL) {
    throw new Error("Only a non-returning escaped captive can be abandoned");
  }
  memory.active = null;
  return quest;
}

export function createPirateCaptiveDialogueSession(quest, options = {}) {
  validatePirateCaptiveQuest(quest);
  if (options.phase !== "authority") return createRescuedTravelerDialogueSession(quest, options);
  if (!pirateCaptiveIsDetained(quest) || quest.stage !== PIRATE_CAPTIVE_STAGE_HOMECOMING) {
    throw new Error("Pirate captive authority dialogue requires a detained captive at handover");
  }
  if (options.cityId !== quest.deception.wantedPortCityId) {
    throw new Error("Pirate captive authority dialogue is at the wrong port");
  }
  if (!options.authorityCharacter?.id) {
    throw new Error("Pirate captive authority dialogue requires a port authority");
  }
  return {
    kind: "rescued-traveler",
    rescueType: quest.rescueType,
    questId: quest.id,
    phase: "authority",
    stepIndex: 0,
    selectedIndex: 0,
    feedback: null,
    cityTileId: options.cityTileId,
    admittedToPort: options.admittedToPort === true,
    continueToPortOnClose: options.continueToPortOnClose === true,
    nextPortNodeId: options.nextPortNodeId || "greeting",
    surrenderPrize: null,
    authorityCharacter: options.authorityCharacter
  };
}

export function pirateCaptiveDialogueView(session, quest) {
  validatePirateCaptiveQuest(quest);
  if (session.phase === "authority") return authorityHandoverView(session, quest);
  if (session.phase === "homecoming" && pirateCaptiveNeedsConfessionAtHome(quest)) {
    return reformedHomecomingView(session, quest);
  }
  return rescuedTravelerDialogueView(session, quest);
}

export function pirateCaptiveDialogueCharacter(session, quest) {
  return pirateCaptiveDialogueView(session, quest).character;
}

export function selectPirateCaptiveDialogueOption(session, quest, memory, optionIndex) {
  const custom = session.phase === "authority" || (
    session.phase === "homecoming" && pirateCaptiveNeedsConfessionAtHome(quest)
  );
  if (!custom) return selectRescuedTravelerDialogueOption(session, quest, memory, optionIndex);
  const view = pirateCaptiveDialogueView(session, quest);
  const selected = view.options[optionIndex];
  if (!selected) throw new Error(`Invalid pirate captive dialogue option index: ${optionIndex}`);
  const action = selected.action;
  if (action.type === "continue-rescued-traveler-homecoming") {
    session.stepIndex += 1;
    session.selectedIndex = 0;
    return { closed: false, action };
  }
  if ([
    "complete-rescued-traveler-reunion",
    "recruit-rescued-traveler",
    "complete-pirate-captive-handover"
  ].includes(action.type)) {
    return { closed: true, action };
  }
  throw new Error(`Unknown pirate captive dialogue action: ${action.type}`);
}

export function pirateCaptiveIsAboard(quest) {
  validatePirateCaptiveQuest(quest);
  return quest.stage === PIRATE_CAPTIVE_STAGE_ABOARD &&
    (!quest.deception || quest.deception.state !== PIRATE_CAPTIVE_STATE_ESCAPED);
}

export function pirateCaptiveIsDetained(quest) {
  validatePirateCaptiveQuest(quest);
  return quest.deception?.state === PIRATE_CAPTIVE_STATE_DETAINED;
}

export function pirateCaptiveDestination(quest) {
  validatePirateCaptiveQuest(quest);
  if (pirateCaptiveIsDetained(quest)) {
    return Object.freeze({
      cityId: requireEntityId(quest.deception.wantedPortCityId, "Pirate captive wanted port"),
      tileId: quest.deception.wantedPortTileId,
      name: quest.deception.wantedPortName,
      country: quest.deception.wantedPortCountry,
      kind: "authority"
    });
  }
  return Object.freeze({
    cityId: requireEntityId(quest.homePortCityId, "Pirate captive home port"),
    tileId: quest.homePortTileId,
    name: quest.homePortName,
    country: quest.homePortCountry,
    kind: "home"
  });
}

export function pirateCaptiveJourneyLegOriginTileId(quest) {
  const deception = requiredDeception(quest);
  return deception.halfwayTileId ?? deception.sourceTileId;
}

export function advancePirateCaptiveJourneyMilestone(quest, {
  currentTileId,
  originDistance,
  destinationDistance,
  witnessId = null
}) {
  validatePirateCaptiveQuest(quest);
  if (!pirateCaptiveIsAboard(quest) || !quest.deception) return null;
  if (!Number.isInteger(currentTileId) || currentTileId < 0) {
    throw new Error(`Invalid pirate captive journey tile: ${currentTileId}`);
  }
  const halfwayReached = questJourneyHalfwayReached({ originDistance, destinationDistance });
  const state = quest.deception.state;
  if (quest.deception.halfwayTileId === null) {
    if (!halfwayReached) return null;
    quest.deception.halfwayTileId = currentTileId;
    return state === PIRATE_CAPTIVE_STATE_CONCEALED && witnessId
      ? PIRATE_CAPTIVE_EVENT_WARNING
      : null;
  }
  const evilMayEscape = quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_EVIL &&
    [PIRATE_CAPTIVE_STATE_CONCEALED, PIRATE_CAPTIVE_STATE_IGNORED].includes(state);
  if (evilMayEscape && halfwayReached) {
    return PIRATE_CAPTIVE_EVENT_ESCAPE;
  }
  return null;
}

export function warnPirateCaptive(quest, witnessId) {
  const deception = requiredDeception(quest);
  if (deception.state !== PIRATE_CAPTIVE_STATE_CONCEALED) {
    throw new Error(`Cannot warn about pirate captive from state ${deception.state}`);
  }
  if (typeof witnessId !== "string" || witnessId.trim() === "") {
    throw new Error("Pirate captive warning requires a named witness");
  }
  deception.state = PIRATE_CAPTIVE_STATE_WARNED;
  deception.warningWitnessId = witnessId;
  return quest;
}

export function ignorePirateCaptiveWarning(quest) {
  const deception = requiredDeception(quest);
  if (deception.state !== PIRATE_CAPTIVE_STATE_WARNED) {
    throw new Error(`Cannot ignore pirate captive warning from state ${deception.state}`);
  }
  deception.state = PIRATE_CAPTIVE_STATE_IGNORED;
  return quest;
}

export function confrontPirateCaptive(quest, { weaponItemId = null, currentMinute }) {
  const deception = requiredDeception(quest);
  if (deception.state !== PIRATE_CAPTIVE_STATE_WARNED) {
    throw new Error(`Cannot confront pirate captive from state ${deception.state}`);
  }
  assertMinute(currentMinute, "pirate captive confrontation");
  if (weaponItemId !== null && (typeof weaponItemId !== "string" || weaponItemId.trim() === "")) {
    throw new Error("Pirate captive confrontation weapon is invalid");
  }
  deception.confrontationWeaponItemId = weaponItemId;
  if (quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_REFORMED) {
    deception.state = PIRATE_CAPTIVE_STATE_REVEALED;
    return Object.freeze({ outcome: "reformed-choice", armed: weaponItemId !== null });
  }
  if (quest.captiveKind !== PIRATE_CAPTIVE_KIND_FAKE_EVIL) {
    throw new Error(`Cannot confront truthful pirate captive ${quest.id}`);
  }
  if (weaponItemId === null) {
    return Object.freeze({ outcome: "evil-escape", armed: false });
  }
  detainPirateCaptive(quest, currentMinute);
  return Object.freeze({ outcome: "evil-detained", armed: true });
}

export function resolveReformedPirateCaptive(quest, { detain, currentMinute }) {
  const deception = requiredDeception(quest);
  if (quest.captiveKind !== PIRATE_CAPTIVE_KIND_FAKE_REFORMED ||
      deception.state !== PIRATE_CAPTIVE_STATE_REVEALED) {
    throw new Error("Reformed pirate captive has no mercy decision pending");
  }
  if (typeof detain !== "boolean") throw new Error(`Invalid reformed pirate mercy choice: ${detain}`);
  if (detain) detainPirateCaptive(quest, currentMinute);
  else deception.state = PIRATE_CAPTIVE_STATE_MERCY;
  return quest;
}

export function recordPirateCaptiveEscape(quest, {
  currentMinute,
  escapeOriginPortCityId,
  escapeOriginPortTileId,
  stolenPossession = null
}) {
  const deception = requiredDeception(quest);
  assertMinute(currentMinute, "pirate captive escape");
  if (!Number.isInteger(escapeOriginPortTileId) || escapeOriginPortTileId < 0) {
    throw new Error(`Pirate captive escape requires a nearby port: ${escapeOriginPortTileId}`);
  }
  requireEntityId(escapeOriginPortCityId, "Pirate captive escape origin");
  if (stolenPossession !== null && (
    typeof stolenPossession !== "object" ||
    typeof stolenPossession.label !== "string" || stolenPossession.label.trim() === ""
  )) {
    throw new Error("Pirate captive stolen possession is invalid");
  }
  deception.state = PIRATE_CAPTIVE_STATE_ESCAPED;
  deception.escapeCount += 1;
  deception.stolenPossession = stolenPossession;
  deception.escapedAtMinute = currentMinute;
  deception.escapeOriginPortCityId = escapeOriginPortCityId;
  deception.escapeOriginPortTileId = escapeOriginPortTileId;
  deception.nextEscapeCheckMinute = null;
  if (quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_EVIL) {
    deception.revengeShipId = `${quest.sourceId}:false-captive-revenge:${deception.escapeCount}`;
    deception.revengeSpawnMinute = currentMinute + PIRATE_CAPTIVE_REVENGE_DELAY_MINUTES;
    deception.revengeSpawned = false;
    deception.revengeDefeated = false;
  }
  return quest;
}

export function pirateCaptiveRevengeSpawnIsDue(quest, currentMinute) {
  validatePirateCaptiveQuest(quest);
  assertMinute(currentMinute, "pirate captive revenge spawn");
  return quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_EVIL &&
    quest.deception.state === PIRATE_CAPTIVE_STATE_ESCAPED &&
    quest.deception.revengeDefeated === false &&
    currentMinute >= quest.deception.revengeSpawnMinute;
}

export function markPirateCaptiveRevengeSpawned(quest) {
  const deception = requiredDeception(quest);
  if (quest.captiveKind !== PIRATE_CAPTIVE_KIND_FAKE_EVIL ||
      deception.state !== PIRATE_CAPTIVE_STATE_ESCAPED ||
      !deception.revengeShipId) {
    throw new Error("Cannot spawn a revenge ship for this pirate captive");
  }
  deception.revengeSpawned = true;
  return quest;
}

export function recapturePirateCaptive(quest, currentMinute) {
  const deception = requiredDeception(quest);
  if (quest.captiveKind !== PIRATE_CAPTIVE_KIND_FAKE_EVIL ||
      deception.state !== PIRATE_CAPTIVE_STATE_ESCAPED ||
      deception.revengeSpawned !== true) {
    throw new Error("Escaped pirate captive cannot be recaptured from the current state");
  }
  deception.revengeDefeated = true;
  detainPirateCaptive(quest, currentMinute);
  return quest;
}

export function pirateCaptiveEscapeCheckIsDue(quest, currentMinute) {
  validatePirateCaptiveQuest(quest);
  assertMinute(currentMinute, "pirate captive escape check");
  return pirateCaptiveIsDetained(quest) && currentMinute >= quest.deception.nextEscapeCheckMinute;
}

export function resolvePirateCaptiveEscapeCheck(quest, { currentMinute, roll }) {
  if (!pirateCaptiveEscapeCheckIsDue(quest, currentMinute)) {
    throw new Error("Pirate captive escape check is not due");
  }
  assertUnitRoll(roll, "pirate captive escape");
  quest.deception.nextEscapeCheckMinute = currentMinute + PIRATE_CAPTIVE_ESCAPE_CHECK_INTERVAL_MINUTES;
  return roll < PIRATE_CAPTIVE_ESCAPE_CHANCE_PER_CHECK;
}

export function preparePirateCaptiveAuthorityHandover(memory, questId) {
  const quest = requiredPirateQuest(memory, questId);
  if (!pirateCaptiveIsDetained(quest) || quest.stage !== PIRATE_CAPTIVE_STAGE_ABOARD) {
    throw new Error("Pirate captive authority handover requires a detained captive aboard");
  }
  quest.stage = PIRATE_CAPTIVE_STAGE_HOMECOMING;
  return quest;
}

export function validatePirateCaptiveQuestMemory(memory) {
  validateRescuedTravelerQuestMemory(memory, RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE);
  if (memory.active) validatePirateCaptiveQuest(memory.active);
  return memory;
}

function validatePirateCaptiveQuest(quest) {
  if (!PIRATE_CAPTIVE_KINDS.has(quest.captiveKind)) {
    throw new Error(`Invalid pirate captive identity: ${quest.captiveKind}`);
  }
  if (quest.captiveKind === PIRATE_CAPTIVE_KIND_REAL) {
    if (quest.deception !== null) throw new Error("Truthful pirate captive cannot have a deception record");
    return quest;
  }
  const deception = quest.deception;
  if (!deception || typeof deception !== "object" || Array.isArray(deception)) {
    throw new Error("Fake pirate captive requires a deception record");
  }
  if (!PIRATE_CAPTIVE_STATES.has(deception.state)) {
    throw new Error(`Invalid pirate captive deception state: ${deception.state}`);
  }
  for (const [label, tileId] of [
    ["source", deception.sourceTileId],
    ["wanted port", deception.wantedPortTileId]
  ]) {
    if (!Number.isInteger(tileId) || tileId < 0) throw new Error(`Invalid pirate captive ${label} tile: ${tileId}`);
  }
  if (deception.halfwayTileId !== null &&
      (!Number.isInteger(deception.halfwayTileId) || deception.halfwayTileId < 0)) {
    throw new Error(`Invalid pirate captive halfway tile: ${deception.halfwayTileId}`);
  }
  requireEntityId(deception.wantedPortCityId, "Pirate captive wanted port");
  for (const [label, value] of [
    ["wanted port name", deception.wantedPortName],
    ["wanted port country", deception.wantedPortCountry],
    ["wanted faction", deception.wantedFactionId]
  ]) {
    if (typeof value !== "string" || value.trim() === "") throw new Error(`Missing pirate captive ${label}`);
  }
  if (deception.state === PIRATE_CAPTIVE_STATE_DETAINED &&
      (!Number.isFinite(deception.nextEscapeCheckMinute) || deception.nextEscapeCheckMinute < 0)) {
    throw new Error("Detained pirate captive requires a future escape check");
  }
  if (deception.state === PIRATE_CAPTIVE_STATE_ESCAPED) {
    requireEntityId(deception.escapeOriginPortCityId, "Pirate captive escape origin");
    if (!Number.isFinite(deception.escapedAtMinute) ||
        !Number.isInteger(deception.escapeOriginPortTileId)) {
      throw new Error("Escaped pirate captive requires escape timing and origin");
    }
  }
  if (!Number.isInteger(deception.escapeCount) || deception.escapeCount < 0) {
    throw new Error(`Invalid pirate captive escape count: ${deception.escapeCount}`);
  }
  if (quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_EVIL &&
      deception.state === PIRATE_CAPTIVE_STATE_ESCAPED) {
    if (deception.escapeCount < 1 ||
        typeof deception.revengeShipId !== "string" || deception.revengeShipId.trim() === "" ||
        !Number.isFinite(deception.revengeSpawnMinute) ||
        deception.revengeSpawnMinute < deception.escapedAtMinute ||
        typeof deception.revengeSpawned !== "boolean" ||
        typeof deception.revengeDefeated !== "boolean") {
      throw new Error("Escaped evil pirate captive requires a valid recurring revenge encounter");
    }
  }
  return quest;
}

function requiredDeception(quest) {
  validatePirateCaptiveQuest(quest);
  if (!quest.deception) throw new Error(`Pirate captive is not an impostor: ${quest.id}`);
  return quest.deception;
}

function requiredPirateQuest(memory, questId) {
  validatePirateCaptiveQuestMemory(memory);
  const quest = memory.active;
  if (!quest || quest.id !== questId) throw new Error(`Pirate captive quest is no longer active: ${questId}`);
  return quest;
}

function detainPirateCaptive(quest, currentMinute) {
  assertMinute(currentMinute, "pirate captive detention");
  quest.deception.state = PIRATE_CAPTIVE_STATE_DETAINED;
  quest.deception.nextEscapeCheckMinute = currentMinute + PIRATE_CAPTIVE_ESCAPE_CHECK_INTERVAL_MINUTES;
}

function pirateCaptiveNeedsConfessionAtHome(quest) {
  return quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_REFORMED &&
    [PIRATE_CAPTIVE_STATE_CONCEALED, PIRATE_CAPTIVE_STATE_IGNORED, PIRATE_CAPTIVE_STATE_MERCY]
      .includes(quest.deception.state);
}

function reformedHomecomingView(session, quest) {
  const confessionOffset = 1;
  if (session.stepIndex === 0) {
    return view(
      quest.character,
      "concerned",
      `Before we go ashore: pirates did not lock me below. I was one of them. I lied because I wanted out. I mean to earn an honest retirement in ${quest.homePortName}.`,
      "Continue",
      { type: "continue-rescued-traveler-homecoming" }
    );
  }
  if (quest.familySurvived) {
    if (session.stepIndex === confessionOffset) {
      return view(quest.familyMember, "overjoyed", `${quest.character.givenName}, we thought we'd never see you again!`, "Continue", { type: "continue-rescued-traveler-homecoming" });
    }
    if (session.stepIndex === confessionOffset + 1) {
      return view(quest.character, "overjoyed", "I came home by a crooked road. I intend to walk straight from here.", "Continue", { type: "continue-rescued-traveler-homecoming" });
    }
    if (session.stepIndex === confessionOffset + 2) {
      const text = quest.rewardItemLabel
        ? `Captain, you brought our prodigal home. Please accept ${quest.rewardDoubloons} doubloons and ${quest.rewardItemLabel}.`
        : `Captain, you brought our prodigal home. Please accept ${quest.rewardDoubloons} doubloons.`;
      return view(quest.familyMember, "happy", text, "Continue", { type: "continue-rescued-traveler-homecoming" });
    }
    if (session.stepIndex === confessionOffset + 3) {
      return view(quest.character, "happy", "Farewell, captain. I am retiring from piracy before it ruins my retirement.", "Farewell", { type: "complete-rescued-traveler-reunion" });
    }
  } else {
    if (session.stepIndex === confessionOffset) {
      return view(quest.character, "crying", `No family waits in ${quest.homePortName}. It seems the sea collected my old life before I could leave it.`, "Continue", { type: "continue-rescued-traveler-homecoming" });
    }
    if (session.stepIndex === confessionOffset + 1) {
      return view(quest.character, "concerned", "Perhaps I can still retire from piracy aboard your ship. Captain, will you have me?", "Welcome aboard", { type: "recruit-rescued-traveler" });
    }
  }
  throw new Error(`Invalid reformed pirate captive homecoming step: ${session.stepIndex}`);
}

function authorityHandoverView(session, quest) {
  const authority = session.authorityCharacter;
  if (session.stepIndex === 0) {
    return view(
      authority,
      "stern",
      `That is ${quest.character.name}. We have warrants enough to paper a cabin. The reward is ${quest.rewardDoubloons} doubloons.`,
      "Continue",
      { type: "continue-rescued-traveler-homecoming" }
    );
  }
  if (session.stepIndex === 1) {
    return view(
      quest.character,
      quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_REFORMED ? "sad" : "angry",
      quest.captiveKind === PIRATE_CAPTIVE_KIND_FAKE_REFORMED
        ? "I wanted a quiet shore. I should have tried honesty before the rope."
        : pirateCaptiveAuthorityDefianceLine(quest),
      "Hand over the captive",
      { type: "complete-pirate-captive-handover" }
    );
  }
  throw new Error(`Invalid pirate captive authority handover step: ${session.stepIndex}`);
}

function view(character, expressionId, text, label, action) {
  if (!action || typeof action.type !== "string" || action.type.length === 0) {
    throw new Error("Pirate captive dialogue requires an explicit action");
  }
  return {
    speaker: character.name,
    character,
    expressionId,
    text,
    options: [Object.freeze({
      label,
      action: Object.freeze({ ...action })
    })]
  };
}

function assertWantedPort(port) {
  if (!port || typeof port !== "object" || !Number.isInteger(port.tileId) || port.tileId < 0 ||
      typeof (port.displayCity || port.city) !== "string" ||
      typeof port.country !== "string" || typeof port.factionId !== "string") {
    throw new Error("Fake pirate captive requires a lawful capital");
  }
}

function assertMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${label} minute: ${value}`);
}

function assertUnitRoll(value, label) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error(`Invalid ${label} roll: ${value}`);
}
